import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Teacher from "../Models/Teacher.js";
import TeacherApplication from "../Models/TeacherApplication.js";
import Course from "../Models/Course.js";
import TestResult from "../Models/TestResult.js";
import CourseReview from "../Models/CourseReview.js";
import Coupon from "../Models/Coupon.js";
import TeacherPayout from "../Models/TeacherPayout.js";
import { v2 as cloudinary } from "cloudinary";
import { generateSigningSecret } from "../Middleware/requestSignature.js";
import { generateOtp, sendOtpEmail } from "../utils/OtpUtils.js";
import redisClient, { invalidateCache } from "../Config/redis.js";

const PLATFORM_FEE_PERCENT = 20;
const TEACHER_CACHE_TTL = 300; // 5 min

const teacherCacheKey = (id) => `teacher:${id}`;
const publicProfileCacheKey = (username) => `teacher:profile:${username}`;

const normalizeNameParts = (name = "") =>
  String(name)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter((part) => part.length >= 2);

const usernameUsesName = (username, name) => {
  const parts = normalizeNameParts(name);
  if (parts.length === 0) return true;

  const compactUsername = String(username).replace(/_/g, "");
  const compactName = parts.join("");

  return (
    (compactName.length >= 3 && compactUsername.includes(compactName)) ||
    parts.some((part) => compactUsername.includes(part))
  );
};

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const generateTeacherToken = (teacherId) =>
  jwt.sign(
    { teacherId, role: "teacher" },
    process.env.TEACHER_JWT_SECRET || process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

const setTeacherCookie = (res, token) => {
  res.cookie("teacherToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
    ...(process.env.NODE_ENV === "production" && {
      domain: process.env.COOKIE_DOMAIN || undefined,
    }),
  });
};

const invalidateTeacherCache = async (teacherId) => {
  try {
    await redisClient.del(teacherCacheKey(teacherId));
  } catch {}
};

const invalidateTeacherPublicCaches = async (teacher) => {
  if (!teacher) return;

  const teacherId = teacher._id || teacher.id || teacher.teacherId || teacher;
  const username = teacher.username;

  await Promise.allSettled([
    invalidateTeacherCache(teacherId),
    username ? redisClient.del(publicProfileCacheKey(username)) : null,
    invalidateCache.allCourses(),
  ]);
};

const destroyCloudinaryAsset = async (publicId, resourceTypes = ["image"]) => {
  if (!publicId) return;
  await Promise.allSettled(
    resourceTypes.map((resource_type) =>
      cloudinary.uploader.destroy(publicId, { resource_type }),
    ),
  );
};

const destroyTeacherOwnedAssets = async (teacher, courses = []) => {
  const deletions = [];

  if (teacher?.profileImage?.public_id) {
    deletions.push(destroyCloudinaryAsset(teacher.profileImage.public_id));
  }

  for (const doc of teacher?.documents || []) {
    deletions.push(destroyCloudinaryAsset(doc.public_id, ["image", "raw"]));
  }

  for (const course of courses) {
    if (course.image?.public_id) {
      deletions.push(destroyCloudinaryAsset(course.image.public_id));
    }

    for (const question of course.questions || []) {
      if (question.image?.public_id) {
        deletions.push(destroyCloudinaryAsset(question.image.public_id));
      }
    }
  }

  await Promise.allSettled(deletions);
};

// ── public ──

export const submitTeacherApplication = async (req, res) => {
  try {
    const { name, email, qualification, reason, country } = req.body;

    if (!name || !email || !qualification || !reason || !country) {
      return res
        .status(400)
        .json({ success: false, message: "All fields required" });
    }

    if (!["india", "nepal"].includes(country)) {
      return res.status(400).json({
        success: false,
        message: "Country must be india or nepal",
      });
    }

    const [existingApp, existingTeacher] = await Promise.all([
      TeacherApplication.findOne({ email: email.toLowerCase() }),
      Teacher.findOne({ email: email.toLowerCase() }),
    ]);

    if (existingApp) {
      return res.status(400).json({
        success: false,
        message: "An application already exists for this email",
      });
    }

    if (existingTeacher) {
      return res.status(400).json({
        success: false,
        message: "This email is already registered",
      });
    }

    await TeacherApplication.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      qualification: qualification.trim(),
      reason: reason.trim(),
      country,
    });

    const waitlistCount = await TeacherApplication.countDocuments({
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Application submitted",
      data: { waitlistPosition: waitlistCount },
    });
  } catch (error) {
    console.error("Submit application error:", error);
    res.status(500).json({ success: false, message: "Failed to submit" });
  }
};

export const getWaitlistCount = async (req, res) => {
  try {
    const cacheKey = "teacher:waitlist:count";
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res
        .status(200)
        .json({ success: true, data: { count: parseInt(cached) } });
    }

    const count = await TeacherApplication.countDocuments({
      status: "pending",
    });
    await redisClient.setex(cacheKey, 60, count.toString());
    return res.status(200).json({ success: true, data: { count } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch" });
  }
};

export const verifyInviteToken = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res
        .status(400)
        .json({ success: false, message: "Token required" });
    }

    let payload;
    try {
      payload = jwt.verify(
        token,
        process.env.TEACHER_INVITE_SECRET || process.env.JWT_SECRET,
      );
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(410).json({
          success: false,
          code: "LINK_EXPIRED",
          message: "Invite link expired",
        });
      }
      return res.status(400).json({ success: false, message: "Invalid token" });
    }

    const existing = await Teacher.findOne({ email: payload.email });
    if (existing) {
      return res
        .status(400)
        .json({ success: false, message: "Email already registered" });
    }

    return res.status(200).json({
      success: true,
      data: {
        name: payload.name,
        email: payload.email,
        country: payload.country,
        token,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Verification failed" });
  }
};

// ── signup flow ──

export const sendSignupOtp = async (req, res) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return res
        .status(400)
        .json({ success: false, message: "Email and token required" });
    }

    // verify invite token
    let payload;
    try {
      payload = jwt.verify(
        token,
        process.env.TEACHER_INVITE_SECRET,
      );
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(410).json({ success: false, code: "LINK_EXPIRED" });
      }
      return res.status(400).json({ success: false, message: "Invalid token" });
    }

    if (payload.email.toLowerCase() !== email.toLowerCase()) {
      return res
        .status(400)
        .json({ success: false, message: "Email does not match invite" });
    }

    // rate limit — max 3 OTPs per 10 min
    const rateKey = `teacher:otp:rate:${email.toLowerCase()}`;
    const attempts = await redisClient.incr(rateKey);
    if (attempts === 1) await redisClient.expire(rateKey, 600);
    if (attempts > 3) {
      return res.status(429).json({
        success: false,
        message: "Too many OTP requests. Wait 10 minutes.",
      });
    }

    const otp = generateOtp();
    const otpKey = `teacher:otp:${email.toLowerCase()}`;
    await redisClient.setex(otpKey, 300, otp); // 5 min expiry

    await sendOtpEmail(email, otp, "Vidhgrow Teacher Portal");

    return res.status(200).json({ success: true, message: "OTP sent" });
  } catch (error) {
    console.error("Send signup OTP error:", error);
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
};

export const verifySignupOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Email and OTP required" });
    }

    const otpKey = `teacher:otp:${email.toLowerCase()}`;
    const stored = await redisClient.get(otpKey);

    if (!stored) {
      return res
        .status(400)
        .json({ success: false, message: "OTP expired or not found" });
    }

    if (stored !== otp.toString()) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    // mark email as verified in redis for 15 min
    await redisClient.del(otpKey);
    await redisClient.setex(
      `teacher:email:verified:${email.toLowerCase()}`,
      900,
      "1",
    );

    return res.status(200).json({ success: true, message: "Email verified" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Verification failed" });
  }
};

export const teacherSignup = async (req, res) => {
  try {
    const { token, password, username, bio, qualification, age, gender } =
      req.body;
    const normalizedUsername = String(username || "").trim().toLowerCase();

    if (!token || !password || !username || !age || !gender) {
      return res.status(400).json({
        success: false,
        message: "Token, password, username, age, and gender are required",
      });
    }

    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 19) {
      return res
        .status(400)
        .json({ success: false, message: "Must be at least 19 years old" });
    }

    if (!["Male", "Female", "Other"].includes(gender)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid gender" });
    }

    const RESERVED_USERNAMES = new Set([
      // system routes
      "admin",
      "administrator",
      "admin1",
      "admin123",
      "admin_team",
      "adminpanel",
      "superadmin",
      "root",
      "login",
      "logout",
      "register",
      "signup",
      "signin",
      "profile",
      "settings",
      "account",
      "accounts",
      "dashboard",
      "home",
      "index",
      "about",
      "contact",
      "help",
      "support",
      "faq",
      "terms",
      "privacy",
      "legal",
      "api",
      "v1",
      "v2",
      "static",
      "assets",
      "public",
      "private",
      "auth",
      "oauth",
      "callback",
      "webhooks",
      "notification",
      "notifications",
      "secure",
      "security",
      "password",
      "reset",
      "recover",
      "forgot",

      // education / platform routes
      "teacher",
      "teachers",
      "teacheradmin",
      "student",
      "students",
      "studentadmin",
      "course",
      "courses",
      "class",
      "classes",
      "exam",
      "exams",
      "test",
      "tests",

      // generic routing words
      "blog",
      "news",
      "feed",
      "rss",
      "site",
      "sitemap",
      "status",
      "report",
      "reports",
      "search",
      "explore",

      // brand / platform blocked
      "vidhgrow",
      "vidhgrow_official",
      "official",
      "system",
      "service",
      "services",
      "mod",
      "moderator",
      "staff",
      "team",
      "bot",
      "null",
      "undefined",

      // impersonation / authority
      "owner",
      "creator",
      "manager",
      "ceo",
      "cto",
      "founder",
      "developer",
      "dev",
      "support",
      "support_team",
      "helpdesk",
      "adminsupport",
      "sysadmin",

      // generic user-group words
      "anonymous",
      "anon",
      "guest",
      "member",
      "members",
      "everyone",
      "anyone",
      "user",
      "users",
      "publicuser",

      // common social slugs
      "follow",
      "followers",
      "following",
      "messages",
      "inbox",
      "chat",
      "message",
      "notification",
      "notifications",
      "comments",
      "likes",

      // external service terms
      "www",
      "mail",
      "email",
      "smtp",
      "imap",

      // mild offensive / prohibited (safe list, non-graphic)
      "hate",
      "hater",
      "abuse",
      "scam",
      "spammer",
      "spam",
      "fake",
      "fraud",
      "fraudster",
      "banned",
      "blocked",
      "toxic",
      "bully",
      "harass",
      "harasser",

      // profanity (non-graphic-safe)
      "fuck",
      "fck",
      "sh1t",
      "shit",
      "ass",
      "bitch",
      "bastard",

      // violence-related (no descriptions)
      "kill",
      "killer",
      "die",
      "death",

      // inappropriate content (safe-filter)
      "porn",
      "prn",
      "sex",
      "nude",
      "naked",
      "nsfw",
      "xxx",

      // impersonation/variants that users attempt
      "officialadmin",
      "realadmin",
      "officialteacher",
      "teacherteam",
      "admindev",
      "adminmod",
      "teamadmin",
    ]);
    if (RESERVED_USERNAMES.has(normalizedUsername)) {
      return res.status(400).json({
        success: false,
        message: "This username is not available",
      });
    }

    if (
      password.length < 8 ||
      !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)
    ) {
      return res.status(400).json({
        success: false,
        message: "Password needs 8+ chars with upper, lower, and number",
      });
    }

    if (
      normalizedUsername.length < 3 ||
      normalizedUsername.length > 30 ||
      !/^[a-z0-9_]+$/.test(normalizedUsername)
    ) {
      return res.status(400).json({
        success: false,
        message: "Username: 3-30 chars, lowercase, numbers, underscores only",
      });
    }

    let payload;
    try {
      payload = jwt.verify(
        token,
        process.env.TEACHER_INVITE_SECRET || process.env.JWT_SECRET,
      );
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(410).json({
          success: false,
          code: "LINK_EXPIRED",
          message: "Invite link expired",
        });
      }
      return res
        .status(400)
        .json({ success: false, message: "Invalid invite token" });
    }

    if (!usernameUsesName(normalizedUsername, payload.name)) {
      return res.status(400).json({
        success: false,
        message: "Username must include your invited name",
      });
    }

    // check email was verified via OTP
    const emailVerified = await redisClient.get(
      `teacher:email:verified:${payload.email.toLowerCase()}`,
    );
    if (!emailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email not verified. Please complete OTP verification first.",
      });
    }

    const User = (await import("../Models/User.js")).default;

    const [
      existingEmail,
      existingUsername,
      existingStudent,
      existingStudentUsername,
    ] = await Promise.all([
      Teacher.findOne({ email: payload.email }),
      Teacher.findOne({ username: normalizedUsername }),
      User.findOne({ email: payload.email.toLowerCase() }),
      User.findOne({ username: normalizedUsername }),
    ]);

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: "Email already registered as a teacher",
      });
    }

    if (existingStudent) {
      // do NOT reveal it's a student account — just say "not available"
      return res.status(400).json({
        success: false,
        message:
          "This email is already in use and cannot be used for a teacher account",
      });
    }
    if (existingUsername || existingStudentUsername) {
      return res
        .status(400)
        .json({ success: false, message: "Username taken" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const teacher = await Teacher.create({
      name: payload.name,
      email: payload.email,
      password: hashedPassword,
      username: normalizedUsername,
      bio: bio?.trim() || "",
      qualification: qualification?.trim() || "",
      age: ageNum,
      gender,
      country: payload.country,
      isVerified: true,
      isActive: true,
      invitedBy: payload.adminId || null,
    });

    await TeacherApplication.findOneAndUpdate(
      { email: payload.email.toLowerCase() },
      {
        status: "registered",
        registeredAt: new Date(),
        processedBy: payload.adminId || null,
      },
      { new: true },
    ).catch(() => {});

    // clean up redis
    await redisClient.del(
      `teacher:email:verified:${payload.email.toLowerCase()}`,
    );
    await redisClient.del(`teacher:waitlist:count`);

    const authToken = generateTeacherToken(teacher._id);
    setTeacherCookie(res, authToken);

    const signingSecret = await generateSigningSecret(teacher._id.toString());

    return res.status(201).json({
      success: true,
      message: "Account created",
      data: {
        teacher: {
          id: teacher._id,
          name: teacher.name,
          email: teacher.email,
          username: teacher.username,
          country: teacher.country,
          age: teacher.age,
          gender: teacher.gender,
          role: "teacher",
          documentStatus: teacher.documentStatus,
          accessBlocked: teacher.accessBlocked,
        },
        signingSecret,
        signingSecretExpiresIn: 7 * 24 * 60 * 60,
      },
    });
  } catch (error) {
    console.error("Teacher signup error:", error);
    res.status(500).json({ success: false, message: "Signup failed" });
  }
};

export const teacherUpdateQuestion = async (req, res) => {
  try {
    const teacherId = req.teacher.teacherId;
    const { courseId, questionId } = req.params;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher || teacher.accessBlocked || teacher.documentStatus !== "verified") {
      return res.status(403).json({
        success: false,
        code: "ACCESS_BLOCKED",
        message: "Document verification is required before editing courses.",
      });
    }

    // verify teacher owns course
    const course = await Course.findOne({ _id: courseId, teacher: teacherId });
    if (!course) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    const questionIndex = course.questions.findIndex(
      (q) => q._id.toString() === questionId,
    );

    if (questionIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });
    }

    const {
      question,
      explanation,
      questionType,
      options,
      correctAnswer,
      difficulty,
    } = req.body;

    if (question) course.questions[questionIndex].question = question.trim();
    if (explanation)
      course.questions[questionIndex].explanation = explanation.trim();
    if (questionType)
      course.questions[questionIndex].questionType = questionType;
    if (options) course.questions[questionIndex].options = options;
    if (correctAnswer !== undefined)
      course.questions[questionIndex].correctAnswer = correctAnswer;
    if (difficulty) course.questions[questionIndex].difficulty = difficulty;

    await course.save();
    await invalidateTeacherPublicCaches(teacher);

    return res.status(200).json({ success: true, message: "Question updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Update failed" });
  }
};

export const teacherDeleteQuestion = async (req, res) => {
  try {
    const teacherId = req.teacher.teacherId;
    const { courseId, questionId } = req.params;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher || teacher.accessBlocked || teacher.documentStatus !== "verified") {
      return res.status(403).json({
        success: false,
        code: "ACCESS_BLOCKED",
        message: "Document verification is required before editing questions.",
      });
    }

    const course = await Course.findOne({ _id: courseId, teacher: teacherId });
    if (!course) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    const before = course.questions.length;
    course.questions = course.questions.filter(
      (q) => q._id.toString() !== questionId,
    );

    if (course.questions.length === before) {
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });
    }

    course.totalQuestions = course.questions.filter(
      (q) => q.isActive !== false,
    ).length;
    await course.save();
    await invalidateTeacherPublicCaches(teacher);

    return res.status(200).json({ success: true, message: "Question deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Delete failed" });
  }
};

export const teacherLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password required" });
    }

    // rate limit login attempts
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress;
    const rateLimitKey = `teacher:login:attempts:${ip}`;
    const attempts = await redisClient.incr(rateLimitKey);
    if (attempts === 1) await redisClient.expire(rateLimitKey, 900); // 15 min
    if (attempts > 10) {
      return res.status(429).json({
        success: false,
        message: "Too many login attempts. Wait 15 minutes.",
      });
    }

    const teacher = await Teacher.findOne({
      email: email.toLowerCase(),
    }).select("+password");

    if (!teacher || !teacher.isActive) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const isValid = await bcrypt.compare(password, teacher.password);
    if (!isValid) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    // reset rate limit on success
    await redisClient.del(rateLimitKey);

    teacher.lastLoginAt = new Date();
    teacher.lastIp = ip;
    await teacher.save();

    await invalidateTeacherCache(teacher._id);

    const authToken = generateTeacherToken(teacher._id);
    setTeacherCookie(res, authToken);

    const signingSecret = await generateSigningSecret(teacher._id.toString());

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        teacher: {
          id: teacher._id,
          name: teacher.name,
          email: teacher.email,
          username: teacher.username,
          country: teacher.country,
          bio: teacher.bio,
          age: teacher.age,
          gender: teacher.gender,
          profileImage: teacher.profileImage,
          role: "teacher",
          documentStatus: teacher.documentStatus,
          documentRequested: teacher.documentRequested,
          documentRequestNote: teacher.documentRequestNote,
          accessBlocked: teacher.accessBlocked,
          accessBlockReason: teacher.accessBlockReason,
          paymentDetails: {
            verified: teacher.paymentDetails?.verified,
          },
        },
        signingSecret,
        signingSecretExpiresIn: 7 * 24 * 60 * 60,
      },
    });
  } catch (error) {
    console.error("Teacher login error:", error);
    res.status(500).json({ success: false, message: "Login failed" });
  }
};

export const teacherLogout = async (req, res) => {
  try {
    if (req.teacher?.teacherId) {
      await invalidateTeacherCache(req.teacher.teacherId);
      // invalidate signing secret
      try {
        await redisClient.del(
          `signing:secret:teacher:${req.teacher.teacherId}`,
        );
      } catch {}
    }
    res.clearCookie("teacherToken", { path: "/" });
    return res.status(200).json({ success: true, message: "Logged out" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Logout failed" });
  }
};

// ── forgot password ──

export const teacherForgotPassword = async (req, res) => {
  try {
    const { identifier } = req.body; // email or username

    if (!identifier) {
      return res
        .status(400)
        .json({ success: false, message: "Email or username required" });
    }

    const teacher = await Teacher.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier.toLowerCase() },
      ],
    });

    // always return success to prevent enumeration
    if (!teacher) {
      return res.status(200).json({
        success: true,
        message: "If an account exists, an OTP has been sent.",
      });
    }

    // rate limit
    const rateLimitKey = `teacher:forgot:rate:${teacher.email}`;
    const attempts = await redisClient.incr(rateLimitKey);
    if (attempts === 1) await redisClient.expire(rateLimitKey, 600);
    if (attempts > 3) {
      return res.status(429).json({
        success: false,
        message: "Too many requests. Wait 10 minutes.",
      });
    }

    const otp = generateOtp();
    const otpKey = `teacher:forgot:otp:${teacher.email}`;
    await redisClient.setex(otpKey, 300, otp);

    await sendOtpEmail(teacher.email, otp, "Vidhgrow Teacher Portal");

    // return masked email for UI
    const maskedEmail = teacher.email.replace(
      /^(.{2})(.*)(@.*)$/,
      (_, a, b, c) => `${a}${"*".repeat(b.length)}${c}`,
    );

    return res.status(200).json({
      success: true,
      message: "OTP sent",
      data: { maskedEmail },
    });
  } catch (error) {
    console.error("Teacher forgot password error:", error);
    res.status(500).json({ success: false, message: "Failed to process" });
  }
};

export const teacherVerifyForgotOtp = async (req, res) => {
  try {
    const { identifier, otp } = req.body;

    const teacher = await Teacher.findOne({
      $or: [
        { email: identifier?.toLowerCase() },
        { username: identifier?.toLowerCase() },
      ],
    });

    if (!teacher) {
      return res
        .status(400)
        .json({ success: false, message: "Account not found" });
    }

    const otpKey = `teacher:forgot:otp:${teacher.email}`;
    const stored = await redisClient.get(otpKey);

    if (!stored || stored !== otp.toString()) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP" });
    }

    await redisClient.del(otpKey);

    // issue a short-lived reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetKey = `teacher:reset:${resetToken}`;
    await redisClient.setex(resetKey, 600, teacher._id.toString()); // 10 min

    return res.status(200).json({
      success: true,
      data: { resetToken },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Verification failed" });
  }
};

export const teacherResetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res
        .status(400)
        .json({ success: false, message: "Token and new password required" });
    }

    if (
      newPassword.length < 8 ||
      !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)
    ) {
      return res.status(400).json({
        success: false,
        message: "Password needs 8+ chars with upper, lower, number",
      });
    }

    const resetKey = `teacher:reset:${resetToken}`;
    const teacherId = await redisClient.get(resetKey);

    if (!teacherId) {
      return res.status(400).json({
        success: false,
        message: "Reset link expired or invalid",
      });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await Teacher.findByIdAndUpdate(teacherId, { password: hashed });

    await redisClient.del(resetKey);
    await invalidateTeacherCache(teacherId);

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Reset failed" });
  }
};

// ── document upload ──

export const uploadDocuments = async (req, res) => {
  try {
    const teacherId = req.teacher.teacherId;
    const teacher = await Teacher.findById(teacherId);

    if (!teacher) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    if (!req.files || req.files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "At least one document required" });
    }

    if (req.files.length > 2) {
      return res
        .status(400)
        .json({ success: false, message: "Maximum 2 documents" });
    }

    // delete old docs from cloudinary
    if (teacher.documents?.length > 0) {
      await Promise.allSettled(
        teacher.documents.map((doc) =>
          cloudinary.uploader.destroy(doc.public_id, { resource_type: "raw" }),
        ),
      );
    }

    const newDocs = req.files.map((f) => ({
      public_id: f.filename || f.public_id,
      url: f.path,
      originalName: f.originalname,
      uploadedAt: new Date(),
    }));

    teacher.documents = newDocs;
    teacher.documentStatus = "pending";
    await teacher.save();

    await invalidateTeacherCache(teacherId);

    return res.status(200).json({
      success: true,
      message: "Documents uploaded. Admin will review shortly.",
      data: { documentStatus: teacher.documentStatus },
    });
  } catch (error) {
    console.error("Document upload error:", error);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
};

// ── teacher profile ──

export const getTeacherProfile = async (req, res) => {
  try {
    const teacherId = req.teacher.teacherId;

    const cacheKey = teacherCacheKey(teacherId);
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.status(200).json({ success: true, data: JSON.parse(cached) });
    }

    const teacher = await Teacher.findById(teacherId)
      .select("-password -otp")
      .lean();

    if (!teacher) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    const isRestricted =
      teacher.accessBlocked || teacher.documentStatus !== "verified";

    if (isRestricted) {
      const responseData = {
        teacher,
        courses: [],
        analytics: {
          totalStudents: 0,
          totalCourses: 0,
          activeCourses: 0,
          pendingApproval: 0,
        },
        recentStudentActivity: [],
        restricted: true,
      };

      await redisClient.setex(
        cacheKey,
        TEACHER_CACHE_TTL,
        JSON.stringify(responseData),
      );

      return res.status(200).json({ success: true, data: responseData });
    }

    const courses = await Course.find({ teacher: teacherId })
      .select(
        "name isPaid price approvalStatus isActive totalQuestions geoRestriction createdAt image",
      )
      .sort({ createdAt: -1 })
      .lean();

    // analytics: students who took their courses
    const courseIds = courses.map((c) => c._id);
    const [studentCount, recentTestResults] = await Promise.all([
      TestResult.distinct("user", { course: { $in: courseIds } }),
      TestResult.find({ course: { $in: courseIds } })
        .populate("user", "username name")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    const responseData = {
      teacher,
      courses,
      analytics: {
        totalStudents: studentCount.length,
        totalCourses: courses.length,
        activeCourses: courses.filter(
          (c) => c.isActive && c.approvalStatus === "approved",
        ).length,
        pendingApproval: courses.filter((c) => c.approvalStatus === "pending")
          .length,
      },
      recentStudentActivity: recentTestResults.slice(0, 5).map((t) => ({
        username: t.user?.username,
        percentage: t.percentage,
        completedAt: t.completedAt,
      })),
    };

    await redisClient.setex(
      cacheKey,
      TEACHER_CACHE_TTL,
      JSON.stringify(responseData),
    );

    return res.status(200).json({ success: true, data: responseData });
  } catch (error) {
    console.error("Get teacher profile error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch" });
  }
};

export const getTeacherAnalytics = async (req, res) => {
  try {
    const teacherId = req.teacher.teacherId;
    const cacheKey = `teacher:analytics:${teacherId}`;

    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.status(200).json({ success: true, data: JSON.parse(cached) });
    }

    const courses = await Course.find({ teacher: teacherId })
      .select("_id name")
      .lean();
    const courseIds = courses.map((c) => c._id);

    if (courseIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          totalStudents: 0,
          totalTests: 0,
          averageScore: 0,
          topStudents: [],
          courseStats: [],
          walletSummary: {
            totalEarnings: 0,
            pendingPayout: 0,
            totalPaidOut: 0,
          },
        },
      });
    }

    const [testResults, teacher] = await Promise.all([
      TestResult.find({ course: { $in: courseIds } })
        .populate("user", "username name")
        .populate("course", "name")
        .lean(),
      Teacher.findById(teacherId)
        .select("totalEarnings pendingPayout totalPaidOut revenueSharePercent")
        .lean(),
    ]);

    // unique students
    const uniqueStudents = new Set(
      testResults.map((t) => t.user?._id?.toString()),
    );

    // top students by average score
    const studentMap = new Map();
    testResults.forEach((t) => {
      const uid = t.user?._id?.toString();
      if (!uid) return;
      if (!studentMap.has(uid)) {
        studentMap.set(uid, {
          username: t.user?.username,
          name: t.user?.name,
          scores: [],
          testCount: 0,
        });
      }
      const s = studentMap.get(uid);
      s.scores.push(t.percentage);
      s.testCount++;
    });

    const topStudents = Array.from(studentMap.values())
      .map((s) => ({
        username: s.username,
        name: s.name,
        averageScore:
          Math.round(
            (s.scores.reduce((a, b) => a + b, 0) / s.scores.length) * 10,
          ) / 10,
        testCount: s.testCount,
      }))
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 10);

    // per-course stats
    const courseStatMap = new Map(
      courses.map((c) => [
        c._id.toString(),
        {
          name: c.name,
          tests: 0,
          uniqueStudents: new Set(),
          avgScore: 0,
          scores: [],
        },
      ]),
    );
    testResults.forEach((t) => {
      const cs = courseStatMap.get(t.course?._id?.toString());
      if (!cs) return;
      cs.tests++;
      cs.uniqueStudents.add(t.user?._id?.toString());
      cs.scores.push(t.percentage);
    });

    const courseStats = Array.from(courseStatMap.entries()).map(([id, cs]) => ({
      courseId: id,
      name: cs.name,
      tests: cs.tests,
      students: cs.uniqueStudents.size,
      averageScore:
        cs.scores.length > 0
          ? Math.round(
              (cs.scores.reduce((a, b) => a + b, 0) / cs.scores.length) * 10,
            ) / 10
          : 0,
    }));

    const avgScore =
      testResults.length > 0
        ? Math.round(
            (testResults.reduce((sum, t) => sum + (t.percentage || 0), 0) /
              testResults.length) *
              10,
          ) / 10
        : 0;

    const responseData = {
      totalStudents: uniqueStudents.size,
      totalTests: testResults.length,
      averageScore: avgScore,
      topStudents,
      courseStats,
      walletSummary: {
        totalEarnings: teacher?.totalEarnings || 0,
        pendingPayout: teacher?.pendingPayout || 0,
        totalPaidOut: teacher?.totalPaidOut || 0,
        revenueSharePercent: teacher?.revenueSharePercent || 80,
      },
    };

    await redisClient.setex(cacheKey, 120, JSON.stringify(responseData));

    return res.status(200).json({ success: true, data: responseData });
  } catch (error) {
    console.error("Teacher analytics error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch" });
  }
};

export const updateTeacherProfile = async (req, res) => {
  try {
    const { bio, qualification, showQualification } = req.body;
    const teacherId = req.teacher.teacherId;

    const updates = {};
    if (bio !== undefined) updates.bio = bio.trim().slice(0, 500);
    if (qualification !== undefined)
      updates.qualification = qualification.trim().slice(0, 300);
    if (showQualification !== undefined) {
      updates.showQualification =
        showQualification === true || showQualification === "true";
    }

    if (req.file) {
      const teacher = await Teacher.findById(teacherId).select("profileImage");
      if (teacher?.profileImage?.public_id) {
        await cloudinary.uploader
          .destroy(teacher.profileImage.public_id)
          .catch(() => {});
      }
      updates.profileImage = {
        public_id: req.file.filename,
        url: req.file.path,
      };
    }

    const teacher = await Teacher.findByIdAndUpdate(teacherId, updates, {
      new: true,
      runValidators: true,
    }).select("-password -otp");

    await invalidateTeacherPublicCaches(teacher);

    return res.status(200).json({ success: true, data: { teacher } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Update failed" });
  }
};

export const updatePaymentDetails = async (req, res) => {
  try {
    const teacherId = req.teacher.teacherId;
    const { nepal } = req.body;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    // security: validate input
    if (teacher.country === "nepal" && nepal) {
      if (nepal.khaltiId) {
        // khalti ID = 10-digit mobile number
        if (!/^9[6-8]\d{8}$/.test(nepal.khaltiId)) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid Khalti ID. Must be a valid Nepal mobile number (98XXXXXXXX)",
          });
        }
        teacher.paymentDetails.nepal.khaltiId = nepal.khaltiId;
      }
    } else if (teacher.country === "india" && req.body.india) {
      const india = req.body.india;
      if (india.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(india.ifsc)) {
        return res.status(400).json({
          success: false,
          message: "Invalid IFSC code format",
        });
      }
      teacher.paymentDetails.india = {
        ...teacher.paymentDetails.india,
        ...india,
      };
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid payment details for your country",
      });
    }

    teacher.paymentDetails.verified = false;
    await teacher.save();
    await invalidateTeacherCache(teacherId);

    return res.status(200).json({
      success: true,
      message: "Payment details saved. Admin will verify shortly.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Update failed" });
  }
};

// ── public teacher profile ──

export const getPublicTeacherProfile = async (req, res) => {
  try {
    const { username } = req.params;
    const cacheKey = publicProfileCacheKey(username.toLowerCase());

    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.status(200).json({ success: true, data: JSON.parse(cached) });
    }

    const teacher = await Teacher.findOne({
      username: username.toLowerCase(),
      isActive: true,
      accessBlocked: false, // blocked teachers have no public profile
      documentStatus: "verified",
    })
      .select(
        "name username bio qualification showQualification profileImage country createdAt documentStatus",
      )
      .lean();

    if (!teacher) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    const publicTeacher = {
      ...teacher,
      qualification:
        teacher.showQualification === false ? "" : teacher.qualification,
    };

    const courses = await Course.find({
      teacher: teacher._id,
      isActive: true,
      approvalStatus: "approved",
    })
      .select(
        "name description image isPaid price totalQuestions geoRestriction createdAt",
      )
      .lean();

    const courseIds = courses.map((c) => c._id);
    const [
      completedTests,
      abandonedTests,
      studentCount,
      reviews,
      ratingSummary,
    ] = await Promise.all([
      TestResult.countDocuments({
        course: { $in: courseIds },
        wasAbandoned: { $ne: true },
      }),
      TestResult.countDocuments({
        course: { $in: courseIds },
        wasAbandoned: true,
      }),
      TestResult.distinct("user", {
        course: { $in: courseIds },
      }),
      CourseReview.find({
        teacher: teacher._id,
        status: "approved",
        isPublic: true,
      })
        .populate("user", "name username")
        .populate("course", "name")
        .sort({ createdAt: -1 })
        .limit(12)
        .lean(),
      CourseReview.aggregate([
        {
          $match: {
            teacher: teacher._id,
            status: "approved",
            isPublic: true,
          },
        },
        {
          $group: {
            _id: "$teacher",
            averageRating: { $avg: "$rating" },
            reviewCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    const totalAttempts = completedTests + abandonedTests;
    const completionRate =
      totalAttempts > 0 ? Math.round((completedTests / totalAttempts) * 100) : 0;
    const averageRating = ratingSummary[0]?.averageRating
      ? Math.round(ratingSummary[0].averageRating * 10) / 10
      : 0;
    const reviewCount = ratingSummary[0]?.reviewCount || 0;

    const badges = [
      {
        key: "verified_teacher",
        label: "Verified Teacher",
        description: "Documents reviewed by the Vidhgrow team.",
        tone: "green",
        show: teacher.documentStatus === "verified",
      },
      {
        key: "course_builder",
        label: "Course Builder",
        description: "Published multiple active courses.",
        tone: "blue",
        show: courses.length >= 3,
      },
      {
        key: "student_favorite",
        label: "Student Favorite",
        description: "Reached at least 25 unique students.",
        tone: "amber",
        show: studentCount.length >= 25,
      },
      {
        key: "highly_rated",
        label: "Highly Rated",
        description: "Maintains a strong student rating.",
        tone: "violet",
        show: averageRating >= 4.5 && reviewCount >= 3,
      },
      {
        key: "strong_completion",
        label: "Strong Completion",
        description: "Students regularly finish this teacher's tests.",
        tone: "slate",
        show: completionRate >= 80 && completedTests >= 10,
      },
    ].filter((badge) => badge.show);

    const responseData = {
      teacher: publicTeacher,
      courses,
      reviews: reviews.map((review) => ({
        _id: review._id,
        rating: review.rating,
        feedback: review.feedback,
        badges: review.evaluation?.badges || [],
        quality: review.evaluation?.quality || "brief",
        createdAt: review.createdAt,
        user: review.user
          ? {
              name: review.user.name,
              username: review.user.username,
            }
          : null,
        course: review.course
          ? {
              _id: review.course._id,
              name: review.course.name,
            }
          : null,
      })),
      badges,
      stats: {
        totalCourses: courses.length,
        totalStudents: studentCount.length,
        totalTests: completedTests,
        totalAttempts,
        completionRate,
        averageRating,
        reviewCount,
      },
    };

    await redisClient.setex(cacheKey, 300, JSON.stringify(responseData));

    return res.status(200).json({ success: true, data: responseData });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch" });
  }
};

// ── admin: teacher management ──

export const getTeacherApplications = async (req, res) => {
  try {
    const { status = "pending", page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const registeredEmails = await Teacher.distinct("email");
    const query = { status };

    if (status !== "registered" && registeredEmails.length > 0) {
      query.email = { $nin: registeredEmails };
    }

    const [applications, total] = await Promise.all([
      TeacherApplication.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      TeacherApplication.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        applications,
        pagination: {
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch" });
  }
};

export const sendTeacherInvite = async (req, res) => {
  try {
    const { applicationId, emailContent, emailSubject } = req.body;

    if (!applicationId || !emailContent) {
      return res.status(400).json({
        success: false,
        message: "Application ID and email content required",
      });
    }

    const application = await TeacherApplication.findById(applicationId);
    if (!application) {
      return res
        .status(404)
        .json({ success: false, message: "Application not found" });
    }

    if (application.status === "invited") {
      return res
        .status(400)
        .json({ success: false, message: "Invite already sent" });
    }

    const invitePayload = {
      email: application.email,
      name: application.name,
      country: application.country,
      applicationId: application._id.toString(),
      adminId: req.admin.userId,
    };

    const signedToken = jwt.sign(
      invitePayload,
      process.env.TEACHER_INVITE_SECRET || process.env.JWT_SECRET,
      { expiresIn: "4m" },
    );

    const signupLink = `${process.env.TEACHER_PORTAL_URL || process.env.FRONTEND_URL + "/teacher"}/signup?token=${signedToken}`;

    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const finalHtml = buildInviteEmail(
      application.name,
      emailContent,
      signupLink,
      emailSubject,
      {
        logoUrl: req.body.logoUrl || "https://vidhgrow.online/logo.png",
        primaryColor: req.body.primaryColor || "#2563eb",
      },
    );

    await resend.emails.send({
      from: `Vidhgrow <${process.env.EMAIL_USER}>`,
      to: application.email,
      subject: emailSubject || `You're invited to teach on Vidhgrow`,
      html: finalHtml,
    });

    application.status = "invited";
    application.inviteSentAt = new Date();
    application.processedBy = req.admin.userId;
    await application.save();

    await redisClient.del("teacher:waitlist:count");

    return res.status(200).json({
      success: true,
      message: "Invite sent",
      data: { signupLink },
    });
  } catch (error) {
    console.error("Send invite error:", error);
    res.status(500).json({ success: false, message: "Failed to send invite" });
  }
};

const buildInviteEmail = (name, content, signupLink, subject, options = {}) => {
  const {
    logoUrl = "https://vidhgrow.online/logo.png",
    primaryColor = "#2563eb",
  } = options;

  // convert plain text content to HTML paragraphs
  const htmlContent = content
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => {
      // detect bullet points
      if (line.trim().startsWith("-") || line.trim().startsWith("•")) {
        return `<li style="margin-bottom:6px;color:#374151;font-size:14px;line-height:1.7;">${line.replace(/^[-•]\s*/, "")}</li>`;
      }
      return `<p style="margin:0 0 14px;color:#374151;font-size:14px;line-height:1.8;">${line}</p>`;
    });

  // wrap li items in ul
  let inList = false;
  const processedContent = [];
  for (const item of htmlContent) {
    if (item.startsWith("<li") && !inList) {
      inList = true;
      processedContent.push(`<ul style="margin:0 0 14px;padding-left:20px;">`);
      processedContent.push(item);
    } else if (!item.startsWith("<li") && inList) {
      inList = false;
      processedContent.push(`</ul>`);
      processedContent.push(item);
    } else {
      processedContent.push(item);
    }
  }
  if (inList) processedContent.push("</ul>");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${subject || "Teacher Invitation"}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background-color:#f0f4f8;-webkit-text-size-adjust:100%;">
  <!-- Preheader text (hidden) -->
  <div style="display:none;font-size:1px;color:#fefefe;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    You're invited to teach on Vidhgrow — ${name}
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f0f4f8;padding:40px 0;">
    <tr>
      <td align="center" style="padding:0 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,${primaryColor},${primaryColor}dd);padding:32px 40px;text-align:center;">
              ${
                logoUrl
                  ? `
              <img src="${logoUrl}" alt="Vidhgrow" width="120" style="display:block;margin:0 auto 16px;max-height:44px;object-fit:contain;" />
              `
                  : `
              <div style="font-size:24px;font-weight:800;color:#ffffff;margin-bottom:8px;letter-spacing:-0.5px;">Vidhgrow</div>
              `
              }
              <div style="display:inline-block;padding:4px 14px;background:rgba(255,255,255,0.2);border-radius:20px;color:#ffffff;font-size:12px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">
                Teacher Invitation
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 20px;font-size:16px;font-weight:600;color:#0f172a;">
                Hi ${name},
              </p>
              
              ${processedContent.join("\n")}
              
              <!-- CTA Button — single, authoritative -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:32px 0 24px;">
                <tr>
                  <td align="center">
                    <a href="${signupLink}" 
                       target="_blank"
                       style="display:inline-block;padding:14px 40px;background-color:${primaryColor};color:#ffffff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:700;letter-spacing:0.3px;mso-padding-alt:14px 40px;">
                      <!--[if mso]><i style="letter-spacing:40px;mso-font-width:-100%;mso-text-raise:30pt">&nbsp;</i><![endif]-->
                      Complete Registration
                      <!--[if mso]><i style="letter-spacing:40px;mso-font-width:-100%">&nbsp;</i><![endif]-->
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry warning -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="background-color:#fef3c7;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:12px 16px;">
                    <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5;">
                      ⏱ <strong>This link expires in 4 minutes.</strong> Please register promptly after clicking.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;">
                If the button doesn't work, copy and paste this link:
              </p>
              <p style="margin:0 0 16px;font-size:11px;word-break:break-all;">
                <a href="${signupLink}" style="color:${primaryColor};text-decoration:none;">${signupLink}</a>
              </p>
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                © ${new Date().getFullYear()} Vidhgrow. All rights reserved.
              </p>
            </td>
          </tr>

        </table>

        <!-- Bottom spacing -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;margin-top:24px;">
          <tr>
            <td align="center">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                You received this email because someone applied to teach on Vidhgrow.
                <br>Contact <a href="mailto:support@vidhgrow.online" style="color:${primaryColor};">support@vidhgrow.online</a> if you have questions.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
};
export const rejectTeacherApplication = async (req, res) => {
  try {
    const { applicationId, reason } = req.body;

    const application = await TeacherApplication.findByIdAndUpdate(
      applicationId,
      {
        status: "rejected",
        rejectedAt: new Date(),
        rejectionReason: reason || null,
        processedBy: req.admin.userId,
      },
      { new: true },
    );

    if (!application) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    await redisClient.del("teacher:waitlist:count");

    return res
      .status(200)
      .json({ success: true, message: "Application rejected" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Rejection failed" });
  }
};

export const getAllTeachers = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (status) query.documentStatus = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
      ];
    }

    const [teachers, total] = await Promise.all([
      Teacher.find(query)
        .select("-password -otp -documents -paymentDetails.india.accountNumber")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Teacher.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        teachers,
        pagination: {
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch" });
  }
};

export const getTeacherById = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const [teacher, courses] = await Promise.all([
      Teacher.findById(teacherId).select("-password -otp").lean(),
      Course.find({ teacher: teacherId })
        .select(
          "name isPaid price approvalStatus isActive totalQuestions createdAt geoRestriction",
        )
        .lean(),
    ]);

    if (!teacher) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    const courseIds = courses.map((c) => c._id);
    const [studentCount, completedTests, abandonedTests, ratingSummary] =
      await Promise.all([
        TestResult.distinct("user", {
          course: { $in: courseIds },
        }),
        TestResult.countDocuments({
          course: { $in: courseIds },
          wasAbandoned: { $ne: true },
        }),
        TestResult.countDocuments({
          course: { $in: courseIds },
          wasAbandoned: true,
        }),
        CourseReview.aggregate([
          {
            $match: {
              teacher: teacher._id,
              status: "approved",
              isPublic: true,
            },
          },
          {
            $group: {
              _id: "$teacher",
              averageRating: { $avg: "$rating" },
              reviewCount: { $sum: 1 },
            },
          },
        ]),
      ]);

    const totalAttempts = completedTests + abandonedTests;

    return res.status(200).json({
      success: true,
      data: {
        teacher,
        courses,
        stats: {
          totalCourses: courses.length,
          totalStudents: studentCount.length,
          totalTests: completedTests,
          totalAttempts,
          completionRate:
            totalAttempts > 0
              ? Math.round((completedTests / totalAttempts) * 100)
              : 0,
          averageRating: ratingSummary[0]?.averageRating
            ? Math.round(ratingSummary[0].averageRating * 10) / 10
            : 0,
          reviewCount: ratingSummary[0]?.reviewCount || 0,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch" });
  }
};

export const adminVerifyDocuments = async (req, res) => {
  try {
    const { teacherId, approved, rejectionReason } = req.body;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    teacher.documentStatus = approved ? "verified" : "rejected";
    teacher.documentVerifiedAt = approved ? new Date() : null;
    teacher.documentVerifiedBy = req.admin.userId;
    teacher.documentRejectionReason = approved ? null : rejectionReason;

    // unblock access if verified
    if (approved && teacher.documentRequested) {
      teacher.accessBlocked = false;
      teacher.accessBlockReason = null;
    }

    await teacher.save();
    await invalidateTeacherPublicCaches(teacher);

    return res.status(200).json({
      success: true,
      message: `Documents ${approved ? "verified" : "rejected"}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Verification failed" });
  }
};

export const adminRequestDocuments = async (req, res) => {
  try {
    const { teacherId, note } = req.body;

    const teacher = await Teacher.findByIdAndUpdate(
      teacherId,
      {
        documentRequested: true,
        documentRequestedAt: new Date(),
        documentRequestNote: note || null,
        accessBlocked: true,
        accessBlockReason: note || "Document verification required by admin",
        documentStatus: "not_uploaded",
      },
      { new: true },
    );

    if (!teacher) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    await invalidateTeacherPublicCaches(teacher);

    return res.status(200).json({
      success: true,
      message: "Document request sent. Teacher account blocked until verified.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to request" });
  }
};

export const adminDeleteTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const reason = String(req.body?.reason || "")
      .trim()
      .replace(/\s+/g, " ");

    if (reason.length < 10 || reason.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Deletion reason must be 10 to 1000 characters",
      });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    const openPayoutCount = await TeacherPayout.countDocuments({
      teacher: teacherId,
      status: { $in: ["pending", "processing"] },
    });

    if ((teacher.pendingPayout || 0) > 0 || openPayoutCount > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Settle pending teacher payouts before deleting this teacher account.",
      });
    }

    if (!process.env.RESEND_API_KEY || !process.env.EMAIL_USER) {
      return res.status(500).json({
        success: false,
        message: "Email service is not configured. Teacher was not deleted.",
      });
    }

    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const safeName = escapeHtml(teacher.name);
      const safeReason = escapeHtml(reason).replace(/\n/g, "<br />");

      await resend.emails.send({
        from: `Vidhgrow <${process.env.EMAIL_USER}>`,
        to: teacher.email,
        subject: "Your Vidhgrow teacher account has been removed",
        text: `Hi ${teacher.name},\n\nYour Vidhgrow teacher account has been removed.\n\nReason:\n${reason}\n\nIf you believe this was a mistake, please contact support.\n\nRegards,\nThe Vidhgrow Team`,
        html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px;background:#f8fafc;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:100%;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px;border-bottom:1px solid #e5e7eb;">
              <h1 style="margin:0;font-size:20px;color:#111827;">Teacher account removed</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 16px;font-size:14px;line-height:1.7;">Hi <strong>${safeName}</strong>,</p>
              <p style="margin:0 0 16px;font-size:14px;line-height:1.7;">Your Vidhgrow teacher account has been removed.</p>
              <div style="margin:18px 0;padding:14px 16px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;">
                <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#991b1b;">Reason</p>
                <p style="margin:0;font-size:14px;line-height:1.7;color:#374151;">${safeReason}</p>
              </div>
              <p style="margin:0;font-size:13px;line-height:1.7;color:#6b7280;">If you believe this was a mistake, please contact support.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
      });
    } catch (emailError) {
      console.error("Teacher deletion email failed:", emailError);
      return res.status(502).json({
        success: false,
        message: "Failed to email teacher. Teacher was not deleted.",
      });
    }

    const courses = await Course.find({ teacher: teacherId })
      .select("_id image questions.image")
      .lean();
    const courseIds = courses.map((course) => course._id);

    await destroyTeacherOwnedAssets(teacher, courses);

    await Promise.allSettled([
      Course.deleteMany({ teacher: teacherId }),
      Coupon.deleteMany({
        $or: [{ createdByTeacher: teacherId }, { course: { $in: courseIds } }],
      }),
      CourseReview.deleteMany({
        $or: [{ teacher: teacherId }, { course: { $in: courseIds } }],
      }),
    ]);

    await Teacher.findByIdAndDelete(teacherId);
    await Promise.allSettled([
      invalidateTeacherCache(teacherId),
      redisClient.del(publicProfileCacheKey(teacher.username)),
      invalidateCache.allCourses(),
      invalidateCache.leaderboard(),
      ...courseIds.map((courseId) => invalidateCache.course(courseId)),
    ]);

    return res.status(200).json({
      success: true,
      message: "Teacher, courses, documents, coupons, and reviews deleted. Email sent.",
      data: {
        deletedCourses: courseIds.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Delete failed" });
  }
};

export const getTeacherCourseApprovals = async (req, res) => {
  try {
    const courses = await Course.find({
      approvalStatus: "pending",
      teacher: { $ne: null },
    })
      .populate("teacher", "name email username country")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, data: { courses } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch" });
  }
};

export const getTeacherCourses = async (req, res) => {
  try {
    const teacherId = req.teacher.teacherId;

    const courses = await Course.find({ teacher: teacherId })
      .select(
        "name description image isPaid price geoRestriction isActive totalQuestions difficulties approvalStatus createdAt updatedAt teacher",
      )
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: { courses },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch" });
  }
};

export const approveTeacherCourse = async (req, res) => {
  try {
    const { courseId, approved, note } = req.body;

    const course = await Course.findOneAndUpdate(
      { _id: courseId, teacher: { $ne: null } },
      {
        approvalStatus: approved ? "approved" : "rejected",
        approvalNote: note || null,
        approvedBy: approved ? req.admin.userId : null,
        approvedAt: approved ? new Date() : null,
        isActive: approved,
      },
      { new: true },
    ).populate("teacher", "name email");

    if (!course) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    // invalidate caches
    await Promise.allSettled([
      redisClient.del(`teacher:${course.teacher._id}`),
      redisClient.del(
        publicProfileCacheKey(course.teacher?.username || "unknown"),
      ),
    ]);

    return res.status(200).json({
      success: true,
      message: `Course ${approved ? "approved" : "rejected"}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Approval failed" });
  }
};

export const verifyTeacherPaymentDetails = async (req, res) => {
  try {
    const { teacherId, verified } = req.body;

    const teacher = await Teacher.findByIdAndUpdate(
      teacherId,
      { "paymentDetails.verified": verified },
      { new: true },
    ).select("name email paymentDetails.verified");

    if (!teacher) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    await invalidateTeacherCache(teacherId);

    return res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to verify" });
  }
};

// ── teacher course management ──

export const teacherCreateCourse = async (req, res) => {
  try {
    const teacherId = req.teacher.teacherId;
    const teacher = await Teacher.findById(teacherId);

    if (!teacher) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    // route middleware already blocks this, but keep the controller defensive.
    if (teacher.accessBlocked || teacher.documentStatus !== "verified") {
      return res.status(403).json({
        success: false,
        code: "ACCESS_BLOCKED",
        message: "Document verification is required before creating courses.",
      });
    }

    const { name, description, difficulties, isPaid, price, videoContent } =
      req.body;

    const isPaidBool = isPaid === "true" || isPaid === true;
    const hasPdfExport =
      req.body.hasPdfExport === "true" || req.body.hasPdfExport === true;

    let parsedDifficulties = difficulties;
    if (typeof difficulties === "string") {
      parsedDifficulties = JSON.parse(difficulties);
    }

    if (!Array.isArray(parsedDifficulties) || parsedDifficulties.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one difficulty level is required",
      });
    }

    const seenDifficulties = new Set();
    const processedDifficulties = parsedDifficulties.map((d) => {
      if (!["Easy", "Medium", "Hard"].includes(d.name)) {
        throw new Error("Invalid difficulty level");
      }
      if (seenDifficulties.has(d.name)) {
        throw new Error("Duplicate difficulty level");
      }
      seenDifficulties.add(d.name);

      const marksPerQuestion = Number(d.marksPerQuestion);
      const maxQuestions = Number(d.maxQuestions);
      const minTime = Number(d.timerSettings?.minTime);
      const maxTime = Number(d.timerSettings?.maxTime);

      if (
        marksPerQuestion < 1 ||
        maxQuestions < 1 ||
        minTime < 1 ||
        maxTime < minTime
      ) {
        throw new Error("Invalid difficulty settings");
      }

      return {
        name: d.name,
        marksPerQuestion,
        maxQuestions,
        totalMarks: marksPerQuestion * maxQuestions,
        timerSettings: {
          minTime,
          maxTime,
        },
      };
    });

    const maxQuestions = processedDifficulties.reduce(
      (t, d) => t + (d.maxQuestions || 0),
      0,
    );

    let image = null;
    if (req.files?.image?.[0]) {
      image = {
        public_id: req.files.image[0].filename,
        url: req.files.image[0].path,
      };
    }

    const courseData = {
      name: name.trim(),
      description: description?.trim(),
      difficulties: processedDifficulties,
      maxQuestionsPerTest: maxQuestions,
      isPaid: isPaidBool,
      currency: teacher.country === "nepal" ? "NPR" : "INR",
      teacher: teacherId,
      approvalStatus: "approved",
      isActive: true,
      approvedAt: new Date(),
      geoRestriction: isPaidBool ? teacher.country : null,
      hasPdfExport,
      questions: [],
      totalQuestions: 0,
      ...(image && { image }),
    };

    if (isPaidBool && price) {
      courseData.price = parseFloat(price);
    }

    if (isPaidBool && videoContent) {
      try {
        const parsedVideoContent =
          typeof videoContent === "string"
            ? JSON.parse(videoContent)
            : videoContent;
        if (
          parsedVideoContent &&
          ["none", "course", "difficulty"].includes(parsedVideoContent.type)
        ) {
          courseData.videoContent = parsedVideoContent;
        }
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid video content configuration",
        });
      }
    }

    const course = await Course.create(courseData);

    await invalidateTeacherPublicCaches(teacher);

    return res.status(201).json({
      success: true,
      message: "Course created",
      data: { course },
    });
  } catch (error) {
    console.error("Teacher create course error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to create",
    });
  }
};

export const teacherUpdateCourse = async (req, res) => {
  try {
    const teacherId = req.teacher.teacherId;
    const { courseId } = req.params;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher || teacher.accessBlocked || teacher.documentStatus !== "verified") {
      return res.status(403).json({
        success: false,
        code: "ACCESS_BLOCKED",
        message: "Document verification is required before deleting questions.",
      });
    }

    // ensure teacher owns this course
    const course = await Course.findOne({
      _id: courseId,
      teacher: teacherId,
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found or not authorized",
      });
    }

    const { name, description, isActive } = req.body;
    const updates = {};

    if (name) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();
    if (isActive !== undefined) {
      // teacher can only activate approved courses
      if (course.approvalStatus !== "approved") {
        return res.status(400).json({
          success: false,
          message: "Cannot activate unapproved course",
        });
      }
      updates.isActive = isActive === "true" || isActive === true;
    }

    let image = null;
    if (req.file) {
      if (course.image?.public_id) {
        await cloudinary.uploader
          .destroy(course.image.public_id)
          .catch(() => {});
      }
      image = { public_id: req.file.filename, url: req.file.path };
      updates.image = image;
    }

    const updated = await Course.findByIdAndUpdate(courseId, updates, {
      new: true,
    });

    await invalidateTeacherPublicCaches(teacher);

    return res.status(200).json({
      success: true,
      message: "Course updated",
      data: { course: updated },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Update failed" });
  }
};

export const teacherAddQuestion = async (req, res) => {
  try {
    const teacherId = req.teacher.teacherId;
    const { courseId } = req.params;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher || teacher.accessBlocked || teacher.documentStatus !== "verified") {
      return res
        .status(403)
        .json({
          success: false,
          code: "ACCESS_BLOCKED",
          message: "Document verification is required before adding questions.",
        });
    }

    const course = await Course.findOne({ _id: courseId, teacher: teacherId });
    if (!course) {
      return res
        .status(404)
        .json({ success: false, message: "Not found or not authorized" });
    }

    const {
      difficulty,
      question,
      explanation,
      questionType,
      options,
      correctAnswer,
      correctAnswerIndex,
    } = req.body;

    const difficultyConfig = course.difficulties.find(
      (d) => d.name === difficulty,
    );
    if (!difficultyConfig) {
      return res.status(400).json({
        success: false,
        message: `Difficulty '${difficulty}' not configured`,
      });
    }

    let questionImage = null;
    if (req.file) {
      questionImage = { public_id: req.file.filename, url: req.file.path };
    }

    const newQuestion = {
      difficulty,
      question: question.trim(),
      questionType: questionType || "multiple",
      options:
        questionType === "multiple"
          ? options || []
          : questionType === "truefalse"
            ? ["True", "False"]
            : [],
      correctAnswer:
        questionType === "single" ? correctAnswer : correctAnswerIndex,
      explanation: explanation.trim(),
      marksPerQuestion: difficultyConfig.marksPerQuestion,
      createdBy: teacher.username,
      ...(questionImage && { image: questionImage }),
    };

    course.questions.push(newQuestion);
    course.totalQuestions = course.questions.filter((q) => q.isActive).length;

    // re-submit for approval if was approved (editing means re-review)
    if (course.approvalStatus === "approved") {
      course.approvalStatus = "pending";
      course.isActive = false;
    }

    await course.save();
    await invalidateTeacherPublicCaches(teacher);

    return res.status(201).json({
      success: true,
      message:
        course.approvalStatus === "pending"
          ? "Question added. Course re-submitted for approval."
          : "Question added",
      data: { question: newQuestion },
    });
  } catch (error) {
    console.error("Teacher add question:", error);
    res.status(500).json({ success: false, message: "Failed to add" });
  }
};

export const teacherGetCourseQuestions = async (req, res) => {
  try {
    const teacherId = req.teacher.teacherId;
    const { courseId } = req.params;

    const course = await Course.findOne({
      _id: courseId,
      teacher: teacherId,
    })
      .select("name questions difficulties approvalStatus isActive")
      .lean();

    if (!course) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    return res.status(200).json({
      success: true,
      data: {
        course: {
          _id: course._id,
          name: course.name,
          approvalStatus: course.approvalStatus,
          isActive: course.isActive,
        },
        questions: course.questions,
        difficulties: course.difficulties,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch" });
  }
};
