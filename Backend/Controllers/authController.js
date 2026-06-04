/**
 * keeps the auth controller controller focused and readable.
 */
import bcrypt from "bcryptjs";
import CryptoJS from "crypto-js";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import User from "../Models/User.js";
import redisClient from "../Config/redis.js";
import PendingRegistration from "../Models/PendingRegistration.js";
import ContentSettings from "../Models/ContentSettings.js";
import { invalidateCache } from "../Config/redis.js";
import { generateSigningSecret } from "../Middleware/requestSignature.js";

import {
  generateOtp,
  sendOtpEmail,
  validateOtpFormat,
  isOtpExpired,
} from "../utils/OtpUtils.js";

// validation rules
export const registerValidation = [
  body("firstName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2-50 characters"),

  body("lastName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2-50 characters"),

  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email")
    .custom((value) => {
      const allowedDomains = [
        "gmail.com",
        "yahoo.com",
        "outlook.com",
        "hotmail.com",
        "icloud.com",
        "protonmail.com",
        "zoho.com",
        "aol.com",
      ];
      const domain = value.split("@")[1];
      if (!allowedDomains.includes(domain)) {
        throw new Error(
          "Please use a valid email provider (Gmail, Yahoo, Outlook, etc.)",
        );
      }
      return true;
    }),

  body("dateOfBirth")
    .notEmpty()
    .withMessage("Date of birth is required")
    .custom((value) => {
      const dob = new Date(value);

      if (isNaN(dob.getTime())) {
        throw new Error("Please provide a valid date of birth");
      }

      const today = new Date();

      if (dob > today) {
        throw new Error("Date of birth cannot be in the future");
      }

      const age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      const actualAge =
        monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())
          ? age - 1
          : age;

      if (actualAge < 15) {
        throw new Error("You must be at least 15 years old to register");
      }
      if (actualAge > 100) {
        throw new Error("Please enter a valid date of birth");
      }
      return true;
    }),

  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain uppercase, lowercase, and number"),

  body("age")
    .isInt({ min: 15, max: 100 })
    .withMessage("Age must be between 15-100"),

  body("gender")
    .isIn(["Male", "Female", "Other"])
    .withMessage("Gender must be Male, Female, or Other"),

  body("subscribeNewsletter")
    .optional()
    .isBoolean()
    .withMessage("Subscribe newsletter must be a boolean"),
];

export const loginValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),

  body("password").notEmpty().withMessage("Password is required"),
];

export const forgotPasswordValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
];

export const resetPasswordValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),

  body("otp")
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage("OTP must be 6 digits"),

  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

export const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),

  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters"),
];

export const updateProfileValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2-50 characters"),

  body("email")
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),

  body("age")
    .optional()
    .isInt({ min: 10, max: 100 })
    .withMessage("Age must be between 10-100"),

  body("gender")
    .optional()
    .isIn(["Male", "Female", "Other"])
    .withMessage("Gender must be Male, Female, or Other"),
];

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

const encryptCookieData = (data) => {
  const encryptionKey = process.env.COOKIE_ENCRYPTION_KEY; // to .env
  return CryptoJS.AES.encrypt(JSON.stringify(data), encryptionKey).toString();
};

// decryption helper (commented for future use)

const decryptCookieData = (encryptedData) => {
  const encryptionKey = process.env.COOKIE_ENCRYPTION_KEY;
  const bytes = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
};

// generate device fingerprint
const generateDeviceFingerprint = (req) => {
  const userAgent = req.get("User-Agent") || "";
  const acceptLanguage = req.get("Accept-Language") || "";
  const acceptEncoding = req.get("Accept-Encoding") || "";

  return CryptoJS.SHA256(
    userAgent + acceptLanguage + acceptEncoding,
  ).toString();
};

// generate location key (can be enhanced with actual geolocation later)
const generateLocationKey = (req) => {
  const ip = req.ip || req.connection.remoteAddress;
  // for now, hash the ip. later can actual location data
  return CryptoJS.SHA256(ip).toString().substring(0, 16);
};

// generate jwt token
const generateToken = (userId, req) => {
  const deviceId = generateDeviceFingerprint(req);
  const locationKey = generateLocationKey(req);

  const payload = {
    userId,
    deviceId,
    locationKey,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get("User-Agent"),
    timestamp: Date.now(),
  };

  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// generate refresh token
const generateRefreshToken = (userId, req) => {
  const deviceId = generateDeviceFingerprint(req);
  const locationKey = generateLocationKey(req);

  const payload = {
    userId,
    deviceId,
    locationKey,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get("User-Agent"),
    timestamp: Date.now(),
    type: "refresh",
  };

  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// register user
export const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed, please check the errors",
        errors: errors.array(),
      });
    }

    const {
      firstName,
      lastName,
      email,
      password,
      age,
      gender,
      dateOfBirth,
      subscribeNewsletter,
    } = req.body;

    // strict input validation
    const fields = {
      firstName,
      lastName,
      email,
      password,
      dateOfBirth,
      gender,
    };

    // check for array attacks
    for (const [key, value] of Object.entries(fields)) {
      if (Array.isArray(value)) {
        return res.status(400).json({
          success: false,
          message: `Invalid ${key} format`,
        });
      }
    }

    // validate string fields
    if (
      typeof firstName !== "string" ||
      typeof lastName !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof dateOfBirth !== "string" ||
      typeof gender !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid data types provided",
      });
    }

    // sanitize email
    const sanitizedEmail = email.trim().toLowerCase();

    // optimized: parallel database and content settings fetch
    const [existingUser, contentSettings] = await Promise.all([
      User.findOne({ email: sanitizedEmail }).lean().select("_id"), // only fetch _id, use lean()
      ContentSettings.getSettings().catch(() => ({
        siteName: "Test App",
        logo: null,
      })),
    ]);

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already registered with this email",
      });
    }

    const name = `${firstName.trim()} ${lastName.trim()}`;
    const dob = new Date(dateOfBirth);

    // generate otp early (non-blocking)
    const otp = generateOtp();
    const otpExpiresAt = new Date(
      Date.now() + (parseInt(process.env.OTP_EXPIRY_MINUTES) || 5) * 60 * 1000,
    );

    // optimization: move bcrypt to worker thread (doesn't block event loop)
    // this will be handled by node.js internally, but we use lower rounds
    const hashedPassword = await bcrypt.hash(password, 11);

    const registrationData = {
      name,
      email: sanitizedEmail,
      password: hashedPassword,
      age,
      gender,
      dateOfBirth: dob.toISOString(),
      subscribeNewsletter: subscribeNewsletter === true,
      otp: {
        code: otp,
        expiresAt: otpExpiresAt.toISOString(),
      },
    };

    const redisKey = `registration:${sanitizedEmail}`;

    // optimization: start all operations in parallel
    const [redisResult, dbResult] = await Promise.allSettled([
      // redis storage (fast)
      redisClient.setex(redisKey, 900, JSON.stringify(registrationData)),

      // mongodb storage (slower, but parallel)
      (async () => {
        await PendingRegistration.deleteOne({ email: sanitizedEmail });
        const pendingReg = new PendingRegistration({
          name,
          email: sanitizedEmail,
          password: hashedPassword,
          age,
          gender,
          dateOfBirth: dob,
          subscribeNewsletter: subscribeNewsletter === true,
          otp: {
            code: otp,
            expiresAt: otpExpiresAt,
          },
        });
        return pendingReg.save();
      })(),
    ]);

    // check if at least one storage method succeeded
    const redisSuccess = redisResult.status === "fulfilled";
    const dbSuccess = dbResult.status === "fulfilled";

    if (!redisSuccess && !dbSuccess) {
      return res.status(500).json({
        success: false,
        message: "Failed to initiate registration. Please try again.",
      });
    }

    // log storage results in development
    if (process.env.NODE_ENV === "development") {
      console.log("Storage results:", {
        redis: redisSuccess ? "success" : "failed",
        mongodb: dbSuccess ? "success" : "failed",
        email: sanitizedEmail,
      });
    }

    const siteName = contentSettings?.siteName || "Test App";
    const logoUrl = contentSettings?.logo?.url || null;

    // optimization: send response immediately, then send email asynchronously
    res.status(201).json({
      success: true,
      message: "Please verify your email with the OTP sent.",
      data: {
        email: sanitizedEmail,
        otpSent: true,
      },
    });

    // send email response (non-blocking)
    // this doesn't delay the user's experience
    setImmediate(async () => {
      try {
        await sendOtpEmail(sanitizedEmail, otp, siteName, logoUrl);

        if (process.env.NODE_ENV === "development") {
          console.log(
            "OTP email sent successfully to:",
            sanitizedEmail,
          );
        }
      } catch (emailError) {
        // log error but don't fail the registration
        // user can request resend otp if needed
        console.error("Failed to send OTP email:", {
          email: sanitizedEmail,
          error: emailError.message,
        });

        // optional: to a retry queue or send notification to admin
        // for now, we just log it
      }
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed. Please try again later.",
    });
  }
};

// verify otp
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp, username } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    if (!validateOtpFormat(otp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP format",
      });
    }
    const sanitizedEmail = email.trim().toLowerCase();

    // try redis first (fast path)
    const redisKey = `registration:${sanitizedEmail}`;
    let registrationData = null;

    try {
      const cachedData = await redisClient.get(redisKey);
      if (cachedData) {
        registrationData = JSON.parse(cachedData);
        console.log("Retrieved from Redis:", sanitizedEmail);
      }
    } catch (redisError) {
      console.warn("Redis retrieval failed:", redisError);
    }

    // fallback to mongodb if redis failed or data not found
    if (!registrationData) {
      console.log("Falling back to MongoDB:", sanitizedEmail);

      try {
        const pendingReg = await PendingRegistration.findOne({
          email: sanitizedEmail,
        });

        if (!pendingReg) {
          return res.status(400).json({
            success: false,
            message: "Registration session expired. Please register again.",
          });
        }

        registrationData = {
          name: pendingReg.name,
          email: pendingReg.email,
          password: pendingReg.password,
          age: pendingReg.age,
          gender: pendingReg.gender,
          dateOfBirth: pendingReg.dateOfBirth.toISOString(),
          subscribeNewsletter: pendingReg.subscribeNewsletter,
          otp: {
            code: pendingReg.otp.code,
            expiresAt: pendingReg.otp.expiresAt.toISOString(),
          },
          otpVerified: pendingReg.otpVerified || false,
        };

        console.log("Retrieved from MongoDB fallback:", email);
      } catch (dbError) {
        console.error("Database retrieval failed:", dbError);
        return res.status(500).json({
          success: false,
          message: "Failed to retrieve registration data.",
        });
      }
    }

    // verify otp
    if (registrationData.otp.code !== otp) {
      console.log("Wrong OTP attempt for:", email);
      return res.status(400).json({
        success: false,
        message: "Incorrect OTP. Please check and try again.",
      });
    }

    if (isOtpExpired(new Date(registrationData.otp.expiresAt))) {
      await redisClient.del(redisKey);
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please register again.",
      });
    }

    console.log("OTP verified successfully for:", email);

    if (!username) {
      // update redis
      registrationData.otpVerified = true;
      try {
        await redisClient.setex(
          redisKey,
          900,
          JSON.stringify(registrationData),
        );
        console.log("Updated Redis with otpVerified flag");
      } catch (redisError) {
        console.warn("Redis update failed:", redisError);
      }

      // update mongodb backup
      try {
        await PendingRegistration.updateOne(
          { email: sanitizedEmail },
          { $set: { otpVerified: true } },
        );
        console.log("Updated MongoDB with otpVerified flag");
      } catch (dbError) {
        console.warn("MongoDB update failed:", dbError);
      }

      return res.status(200).json({
        success: true,
        message: "OTP verified successfully. Please choose a username.",
        data: {
          email,
          otpVerified: true,
        },
      });
    }

    const normalizedUsername = String(username || "").trim().toLowerCase();

    // validate username format
    if (normalizedUsername.length < 3 || normalizedUsername.length > 20) {
      return res.status(400).json({
        success: false,
        message: "Username must be between 3-20 characters",
      });
    }

    if (!/^[a-z0-9_]+$/.test(normalizedUsername)) {
      return res.status(400).json({
        success: false,
        message:
          "Username can only contain lowercase letters, numbers, and underscores",
      });
    }

    if (RESERVED_USERNAMES.has(normalizedUsername)) {
      return res.status(400).json({
        success: false,
        message: "This username is not available",
      });
    }

    if (!usernameUsesName(normalizedUsername, registrationData.name)) {
      return res.status(400).json({
        success: false,
        message: "Username must include your name",
      });
    }

    // check if username is already taken anywhere public handles are used.
    const Teacher = (await import("../Models/Teacher.js")).default;
    const [existingUsername, existingTeacherUsername] = await Promise.all([
      User.findOne({ username: normalizedUsername }),
      Teacher.findOne({ username: normalizedUsername }),
    ]);
    if (existingUsername || existingTeacherUsername) {
      return res.status(400).json({
        success: false,
        message: "Username already taken",
      });
    }

    // check if otp was previously verified
    if (!registrationData.otpVerified) {
      return res.status(400).json({
        success: false,
        message: "Please verify OTP first",
      });
    }

    // create user in database now
    const userDoc = {
      name: registrationData.name,
      email: registrationData.email,
      username: normalizedUsername,
      password: registrationData.password,
      age: registrationData.age,
      gender: registrationData.gender,
      dateOfBirth: new Date(registrationData.dateOfBirth),
      isVerified: true,
      subscribeNewsletter: registrationData.subscribeNewsletter,
      points: 0,
      badges: [],
      stats: {
        testsCompleted: 0,
        questionsAnswered: 0,
        averagePercentile: 0,
        fastestTime: null,
        leaderboardDaysOnTop: 0,
      },
    };

    const user = new User(userDoc);
    await user.save();

    // delete from redis
    try {
      await redisClient.del(redisKey);
      console.log("Deleted Redis data");
    } catch (redisError) {
      console.warn("Redis deletion failed:", redisError);
    }

    // delete from mongodb
    try {
      await PendingRegistration.deleteOne({ email: sanitizedEmail });
      console.log("Deleted MongoDB data");
    } catch (dbError) {
      console.warn("MongoDB deletion failed:", dbError);
    }

    // cache username as taken
    const cacheKey = `username:check:${normalizedUsername}`;
    try {
      await redisClient.setex(cacheKey, 300, "taken");
    } catch (e) {
      console.error("Failed to cache username:", e);
    }

    console.log("User created successfully:", {
      email: user.email,
      name: user.name,
      userId: user._id,
      timestamp: new Date().toISOString(),
    });

    // generate tokens
    const token = generateToken(user._id, req);
    const refreshToken = generateRefreshToken(user._id, req);

    // set auth cookies
    const authCookieData = encryptCookieData({
      token: token,
      deviceId: generateDeviceFingerprint(req),
      locationKey: generateLocationKey(req),
      issuedAt: Date.now(),
    });

    // same cookieoptions configuration as above
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      signed: true,
      path: "/",
    };

    if (process.env.NODE_ENV === "production") {
      cookieOptions.domain = ".vidhgrow.online";
    }

    if (process.env.NODE_ENV === "development") {
      console.log("Setting auth_session cookie:", {
        path: cookieOptions.path,
        httpOnly: cookieOptions.httpOnly,
        secure: cookieOptions.secure,
        sameSite: cookieOptions.sameSite,
        maxAge: cookieOptions.maxAge,
        userId: user._id.toString(),
      });
    }
    res.cookie("auth_session", authCookieData, cookieOptions);

    const refreshCookieData = encryptCookieData({
      token: refreshToken,
      deviceId: generateDeviceFingerprint(req),
      locationKey: generateLocationKey(req),
      issuedAt: Date.now(),
    });

    const refreshCookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      signed: true,
      path: "/",
    };

    if (process.env.NODE_ENV === "production") {
      refreshCookieOptions.domain = ".vidhgrow.online";
    }

    if (process.env.NODE_ENV === "development") {
      console.log("Setting auth_session cookie:", {
        path: cookieOptions.path,
        httpOnly: cookieOptions.httpOnly,
        secure: cookieOptions.secure,
        sameSite: cookieOptions.sameSite,
        maxAge: cookieOptions.maxAge,
        userId: user._id.toString(),
      });
    }

    res.cookie("refresh_session", refreshCookieData, refreshCookieOptions);

    const signingSecret = await generateSigningSecret(user._id.toString());

    // response of verify otp with username
    res.status(200).json({
      success: true,
      message: "Registration completed successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          username: user.username,
          age: user.age,
          gender: user.gender,
          isVerified: user.isVerified,
        },
        signingSecret,
        signingSecretExpiresIn: 7 * 24 * 60 * 60,
      },
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({
      success: false,
      message: "OTP verification failed",
    });
  }
};

export const initiateLogin = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // dev bypass check
    if (email === "nischala389@gmail.com") {
      return res.status(200).json({
        success: true,
        message: "Dev account - proceed to password",
        data: {
          email,
          requiresOtp: false,
          isDevAccount: true,
          isRegistered: true,
          isVerified: true,
        },
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email. Please register first.",
        data: {
          isRegistered: false,
        },
      });
    }

    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message:
          "Your email is not verified. Please check your inbox for the verification OTP or request a new one.",
        data: {
          isRegistered: true,
          isVerified: false,
          email: user.email,
        },
      });
    }

    // generate and send otp
    const otp = generateOtp();
    const otpExpiresAt = new Date(
      Date.now() + (parseInt(process.env.OTP_EXPIRY_MINUTES) || 5) * 60 * 1000,
    );

    user.otp = {
      code: otp,
      expiresAt: otpExpiresAt,
      used: false,
    };
    await user.save();

    // console.log("login has been initiated for:", email);

    // fetch content settings
    let contentSettings;
    try {
      contentSettings = await ContentSettings.getSettings();
    } catch (settingsError) {
      contentSettings = { siteName: "Test App", logo: null };
    }

    const siteName = contentSettings?.siteName || "Test App";
    const logoUrl = contentSettings?.logo?.url || null;

    await sendOtpEmail(email, otp, siteName, logoUrl);
    const signingSecret = await generateSigningSecret(user._id.toString());

    res.status(200).json({
      success: true,
      message: "OTP sent to your email",
      data: {
        email,
        otpSent: true,
        requiresOtp: true,
        isRegistered: true,
        isVerified: true,
        signingSecret,
        signingSecretExpiresIn: 7 * 24 * 60 * 60,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to initiate login",
    });
  }
};

export const verifyLoginOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    if (!validateOtpFormat(otp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP format. Please Enter a 6-digit code.",
      });
    }

    const user = await User.findOne({ email });
    console.log(email);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.otp || !user.otp.code) {
      return res.status(400).json({
        success: false,
        message: "No OTP found. Please request a new one.",
      });
    }

    if (isOtpExpired(user.otp.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    if (user.otp.used === true) {
      return res.status(400).json({
        success: false,
        message: "OTP has already been used. Please request a new one.",
      });
    }

    if (user.otp.code !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    user.otp.used = true;

    // clear otp immediately verification
    user.otp = {
      code: null,
      expiresAt: null,
    };

    // store last known ip for admin ip blocking feature
    const clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      req.ip;
    if (clientIp) {
      user.lastIp = clientIp;
    }

    await user.save();
    const signingSecret = await generateSigningSecret(user._id.toString());

    res.status(200).json({
      success: true,
      message: "OTP verified. Please enter your password.",
      data: {
        email,
        otpVerified: true,
        signingSecret,
        signingSecretExpiresIn: 7 * 24 * 60 * 60,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to verify OTP",
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, isDevAccount } = req.body;

    // strict input validation to prevent manipulation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // reject array payloads
    if (Array.isArray(email) || Array.isArray(password)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request format",
      });
    }

    // validate email format
    if (
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // validate password is string
    if (
      typeof password !== "string" ||
      password.length < 6 ||
      password.length > 128
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid password format",
      });
    }

    // sanitize email (trim, lowercase)
    const sanitizedEmail = String(email).trim().toLowerCase();

    // optimized: only fetch necessary fields
    const user = await User.findOne({ email: sanitizedEmail }).select(
      "password isVerified username name email age gender otp _id",
    );

    if (!user) {
      // security: use same error message as invalid password (prevent email enumeration)
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // dev bypass check (remains same)
    const isDevUser =
      email === "nischala389@gmail.com" && password === "DevPass@123";

    if (!isDevUser && !user.isVerified) {
      return res.status(401).json({
        success: false,
        message: "Please verify your email first",
      });
    }

    // optimization: bcrypt comparison
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // optimized: build update object conditionally
    const updates = {
      lastLoginAt: new Date(),
    };

    // store last known ip for admin ip blocking feature
    const clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      req.ip;
    if (clientIp) {
      updates.lastIp = clientIp;
    }

    if (isDevUser) {
      if (!user.isVerified) updates.isVerified = true;
      if (!user.username) updates.username = "itzzdev";
    }

    if (user.otp && user.otp.code) {
      updates.otp = { code: null, expiresAt: null };
    }

    // optimized: single atomic update (if needed)
    if (Object.keys(updates).length > 1 || updates.lastLoginAt) {
      // use updateone instead of findbyidandupdate (faster)
      await User.updateOne({ _id: user._id }, { $set: updates });

      // update local user object for response
      Object.assign(user, updates);
    }

    // generate tokens (these are fast, cpu-bound)
    const token = generateToken(user._id, req);
    const refreshToken = generateRefreshToken(user._id, req);

    const authCookieData = encryptCookieData({
      token: token,
      deviceId: generateDeviceFingerprint(req),
      locationKey: generateLocationKey(req),
      issuedAt: Date.now(),
    });

    // cookie options (ed as per solution 2)
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      signed: true,
      path: "/",
    };

    if (process.env.NODE_ENV === "production") {
      const hostname = req.hostname || req.get("host");
      if (hostname && hostname.includes("vidhgrow.online")) {
        cookieOptions.domain = ".vidhgrow.online";
      }
    }

    res.cookie("auth_session", authCookieData, cookieOptions);

    const refreshCookieData = encryptCookieData({
      token: refreshToken,
      deviceId: generateDeviceFingerprint(req),
      locationKey: generateLocationKey(req),
      issuedAt: Date.now(),
    });

    const refreshCookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      signed: true,
      path: "/",
    };

    if (process.env.NODE_ENV === "production") {
      const hostname = req.hostname || req.get("host");
      if (hostname && hostname.includes("vidhgrow.online")) {
        refreshCookieOptions.domain = ".vidhgrow.online";
      }
    }

    res.cookie("refresh_session", refreshCookieData, refreshCookieOptions);

    // build user response (remove password)
    const { password: _, otp, ...userResponse } = user;

    // optimized: generate signing secret asynchronously
    const signingSecret = await generateSigningSecret(user._id.toString());

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: userResponse,
        signingSecret,
        signingSecretExpiresIn: 7 * 24 * 60 * 60,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};

// logout user - updated to handle admin
export const logout = async (req, res) => {
  try {
    res.clearCookie("auth_session");
    res.clearCookie("refresh_session");

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const encryptedRefreshCookie = req.signedCookies.refresh_session;

    if (!encryptedRefreshCookie) {
      return res.status(401).json({
        success: false,
        message: "Refresh token not found",
      });
    }

    // decrypt cookie
    const cookieData = decryptCookieData(encryptedRefreshCookie);
    if (!cookieData || !cookieData.token) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh session",
      });
    }

    const decoded = jwt.verify(cookieData.token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isVerified) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    // generate tokens
    const newToken = generateToken(user._id, req);
    const newRefreshToken = generateRefreshToken(user._id, req);

    // encrypt and set cookies
    const newCookieData = encryptCookieData({
      token: newToken,
      deviceId: generateDeviceFingerprint(req),
      locationKey: generateLocationKey(req),
      issuedAt: Date.now(),
    });

    res.cookie("auth_session", newCookieData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      signed: true,
    });

    const newRefreshCookieData = encryptCookieData({
      token: newRefreshToken,
      deviceId: generateDeviceFingerprint(req),
      locationKey: generateLocationKey(req),
      issuedAt: Date.now(),
    });

    res.cookie("refresh_session", newRefreshCookieData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      signed: true,
    });

    if (process.env.NODE_ENV === "development") {
      console.log("Setting auth_session cookie:", {
        path: cookieOptions.path,
        httpOnly: cookieOptions.httpOnly,
        secure: cookieOptions.secure,
        sameSite: cookieOptions.sameSite,
        maxAge: cookieOptions.maxAge,
        userId: user._id.toString(),
      });
    }
    const signingSecret = await generateSigningSecret(user._id.toString());
    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        signingSecret,
        signingSecretExpiresIn: 7 * 24 * 60 * 60,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(401).json({
      success: false,
      message: "Invalid refresh token",
    });
  }
};

// get user profile - updated to handle admin
export const getProfile = async (req, res) => {
  try {
    let userId;

    // check if it's admin or regular user
    if (req.admin) {
      userId = req.admin.userId;
    } else if (req.user) {
      userId = req.user.userId;
    } else {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const user = await User.findById(userId).select("-password -otp");

    res.status(200).json({
      success: true,
      message: "Profile retrieved successfully",
      data: { user },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve profile",
    });
  }
};

// update existing updateprofile function
export const updateProfile = async (req, res) => {
  try {
    const { name, dateOfBirth, gender, password, nameVisibility } = req.body;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // password is required for sensitive updates (name, dob, gender)
    // but not required for namevisibility toggle
    const isSensitiveUpdate = name || dateOfBirth || gender;

    if (isSensitiveUpdate && !password) {
      return res.status(400).json({
        success: false,
        message: "Password is required to update profile information",
      });
    }

    // verify password only if provided
    if (password) {
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: "Invalid password",
        });
      }
    }

    // update fields
    if (name) user.name = name.trim();
    if (dateOfBirth) {
      user.dateOfBirth = new Date(dateOfBirth);

      // recalculate age
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }
      user.age = age;
    }
    if (gender) user.gender = gender;

    // update namevisibility without requiring password
    if (nameVisibility && ["private", "public"].includes(nameVisibility)) {
      user.nameVisibility = nameVisibility;
    }

    await user.save();

    await invalidateCache.user(userId, user.username);

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          dateOfBirth: user.dateOfBirth,
          gender: user.gender,
          age: user.age,
          username: user.username,
          nameVisibility: user.nameVisibility,
        },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error updating profile",
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { identifier } = req.body; // d from 'email' to 'identifier'

    if (!identifier || !identifier.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email or username is required",
      });
    }

    // check if identifier is email or username
    const isEmail = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(
      identifier,
    );

    // find user by email or username
    const user = isEmail
      ? await User.findOne({ email: identifier.toLowerCase().trim() })
      : await User.findOne({ username: identifier.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email or username",
      });
    }

    if (!user.isVerified) {
      return res.status(400).json({
        success: false,
        message:
          "Your account is not verified. Please verify your email first.",
      });
    }

    // generate otp (use plain text, not hashed - for consistency with other otps)
    const otp = generateOtp();
    const otpExpiresAt = new Date(
      Date.now() + (parseInt(process.env.OTP_EXPIRY_MINUTES) || 10) * 60 * 1000,
    );

    // store otp in user document (plain text for easier verification)
    user.otp = {
      code: otp,
      expiresAt: otpExpiresAt,
      used: false,
    };
    await user.save();

    console.log(user.email);

    // fetch content settings
    let contentSettings;
    try {
      contentSettings = await ContentSettings.getSettings();
    } catch (settingsError) {
      contentSettings = { siteName: "Test App", logo: null };
    }

    const siteName = contentSettings?.siteName || "Test App";
    const logoUrl = contentSettings?.logo?.url || null;

    // send otp email
    await sendOtpEmail(user.email, otp, siteName, logoUrl);

    res.status(200).json({
      success: true,
      message: "OTP sent to your email for password reset",
      data: {
        email: user.email,
        // mask email for privacy: exa***@gm***.com
        maskedEmail:
          user.email.substring(0, 3) +
          "***@" +
          user.email.split("@")[1].substring(0, 2) +
          "***." +
          user.email.split(".").pop(),
        otpSent: true,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error initiating password reset. Please try again.",
    });
  }
};

export const verifyForgotPasswordOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    if (!validateOtpFormat(otp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP format. Please enter a 6-digit code.",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.otp || !user.otp.code) {
      return res.status(400).json({
        success: false,
        message: "No OTP found. Please request a new one.",
      });
    }

    if (isOtpExpired(user.otp.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    if (user.otp.used === true) {
      return res.status(400).json({
        success: false,
        message: "OTP has already been used. Please request a new one.",
      });
    }

    // compare otp directly (plain text comparison like in login otp)
    if (user.otp.code !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please check and try again.",
      });
    }

    console.log(user.email);

    // mark otp as used but don't clear it yet (will clear password reset)
    user.otp.used = true;
    await user.save();

    // generate a temporary token for password reset (short-lived)
    const resetToken = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        purpose: "password-reset",
        timestamp: Date.now(),
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }, // 15 minutes to reset password
    );

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      data: {
        resetToken,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal Error. Please try again.",
    });
  }
};

export const quickCheckUsername = async (req, res) => {
  try {
    // const { username } = req.query; --> will be as query param
    const { username } = req.params;

    if (!username || username.length < 3) {
      return res.json({ available: false, reason: "too_short" });
    }

    if (username.length > 20) {
      return res.json({ available: false, reason: "too_long" });
    }

    if (!/^[a-z0-9_]+$/.test(username)) {
      return res.json({ available: false, reason: "invalid_format" });
    }

    // reserved check
    if (RESERVED_USERNAMES.has(username.toLowerCase())) {
      return res.json({ available: false, reason: "reserved" });
    }

    // check redis first
    const cacheKey = `username:check:${username.toLowerCase()}`;
    const cached = await redisClient.get(cacheKey);

    if (cached !== null) {
      return res.json({
        available: cached === "available",
        cached: true,
      });
    }

    // check database
    const Teacher = (await import("../Models/Teacher.js")).default;
    const [userExists, teacherExists] = await Promise.all([
      User.exists({ username: username.toLowerCase() }),
      Teacher.exists({ username: username.toLowerCase() }),
    ]);
    const exists = userExists || teacherExists;
    const available = !exists;

    // cache result
    await redisClient.setex(cacheKey, 300, available ? "available" : "taken");

    return res.json({ available, cached: false });
  } catch (error) {
    console.error("Quick username check error:", error);
    return res.status(500).json({ error: "Check failed" });
  }
};

// update the existing resetpassword function
export const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Reset token and new password are required",
      });
    }

    // validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      });
    }

    // verify reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token. Please request a new one.",
      });
    }

    if (decoded.purpose !== "password-reset") {
      return res.status(400).json({
        success: false,
        message: "Invalid reset token",
      });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // check if user is trying to use the same password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message:
          "New password cannot be the same as your current password. Please choose a different password.",
      });
    }

    console.log("Password reset for:", user.email);

    // hash password with proper salt rounds
    const hashedPassword = await bcrypt.hash(
      newPassword,
      parseInt(process.env.BCRYPT_ROUNDS) || 12,
    );
    user.password = hashedPassword;

    // clear otp data
    user.otp = {
      code: null,
      expiresAt: null,
      used: false,
    };

    await user.save();

    res.status(200).json({
      success: true,
      message:
        "Password reset successfully. You can now login with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired reset token. Please start the password reset process again.",
      });
    }
    res.status(500).json({
      success: false,
      message: "Error resetting password. Please try again.",
    });
  }
};

// these functions for email
export const initiateEmailChange = async (req, res) => {
  try {
    const { newEmail, password } = req.body;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // check if email already exists
    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    // generate otp
    const otp = generateOtp();
    const hashedOTP = await bcrypt.hash(otp, 10);

    // store otp and pending email in user document
    user.pendingEmail = newEmail;
    user.emailChangeOTP = {
      code: hashedOTP,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      used: false,
    };
    await user.save();

    // send otp to email
    await sendOtpEmail(newEmail, otp, "Email Change Verification");

    res.status(200).json({
      message: "OTP sent to new email address",
      newEmail,
    });
  } catch (error) {
    console.error("Initiate email change error:", error);
    res.status(500).json({ message: "Error initiating email change" });
  }
};

export const verifyEmailChangeOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.emailChangeOTP || !user.emailChangeOTP.code) {
      return res.status(400).json({ message: "No email change OTP found" });
    }

    if (user.emailChangeOTP.expiresAt < Date.now()) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    if (user.emailChangeOTP.used) {
      return res.status(400).json({ message: "OTP already used" });
    }

    const isValidOTP = await bcrypt.compare(otp, user.emailChangeOTP.code);
    if (!isValidOTP) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // update email
    user.email = user.pendingEmail;
    user.pendingEmail = undefined;
    user.emailChangeOTP = undefined;
    await user.save();

    res.status(200).json({
      message: "Email updated successfully",
      email: user.email,
    });
  } catch (error) {
    console.error("Verify email change OTP error:", error);
    res.status(500).json({ message: "Error verifying email change OTP" });
  }
};

// password
export const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { currentPassword, newPassword } = req.body;

    let userId;
    if (req.admin) {
      userId = req.admin.userId;
    } else if (req.user) {
      userId = req.user.userId; // ed: use userid instead of id
    } else {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // hash password
    const hashedNewPassword = await bcrypt.hash(
      newPassword,
      parseInt(process.env.BCRYPT_ROUNDS) || 12,
    );

    // update password
    user.password = hashedNewPassword;
    await user.save();

    // invalidate user cache password
    await invalidateCache.user(userId);

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to change password",
    });
  }
};

// resend otp
export const resendOTP = async (req, res) => {
  try {
    const sanitizedEmail = email.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // try redis first
    const redisKey = `registration:${email}`;
    let registrationData = null;

    try {
      const cachedData = await redisClient.get(redisKey);
      if (cachedData) {
        registrationData = JSON.parse(cachedData);
      }
    } catch (redisError) {
      console.warn("Redis retrieval failed:", redisError);
    }

    // fallback to mongodb
    if (!registrationData) {
      try {
        const pendingReg = await PendingRegistration.findOne({
          email: sanitizedEmail,
        });
        if (!pendingReg) {
          return res.status(400).json({
            success: false,
            message: "No pending registration found. Please register again.",
          });
        }

        registrationData = {
          name: pendingReg.name,
          email: pendingReg.email,
          password: pendingReg.password,
          age: pendingReg.age,
          gender: pendingReg.gender,
          dateOfBirth: pendingReg.dateOfBirth.toISOString(),
          subscribeNewsletter: pendingReg.subscribeNewsletter,
        };
      } catch (dbError) {
        console.error("Database retrieval failed:", dbError);
        return res.status(500).json({
          success: false,
          message: "Failed to resend OTP.",
        });
      }
    }

    // generate otp
    const otp = generateOtp();
    const otpExpiresAt = new Date(
      Date.now() + (parseInt(process.env.OTP_EXPIRY_MINUTES) || 5) * 60 * 1000,
    );

    // update otp in data
    registrationData.otp = {
      code: otp,
      expiresAt: otpExpiresAt.toISOString(),
    };
    registrationData.otpVerified = false;

    // update redis
    try {
      await redisClient.setex(redisKey, 900, JSON.stringify(registrationData));
    } catch (redisError) {
      console.warn("Redis update failed:", redisError);
    }

    // update mongodb
    try {
      await PendingRegistration.updateOne(
        { email: sanitizedEmail },
        {
          $set: {
            "otp.code": otp,
            "otp.expiresAt": otpExpiresAt,
            otpVerified: false,
          },
        },
      );
    } catch (dbError) {
      console.warn("MongoDB update failed:", dbError);
    }

    // fetch content settings
    let contentSettings;
    try {
      contentSettings = await ContentSettings.getSettings();
    } catch (settingsError) {
      contentSettings = { siteName: "Test App", logo: null };
    }

    const siteName = contentSettings?.siteName || "Test App";
    const logoUrl = contentSettings?.logo?.url || null;

    // send otp email
    await sendOtpEmail(email, otp, siteName, logoUrl);

    res.status(200).json({
      success: true,
      message: "OTP resent successfully",
      data: {
        email,
        otpSent: true,
      },
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resend OTP",
    });
  }
};
