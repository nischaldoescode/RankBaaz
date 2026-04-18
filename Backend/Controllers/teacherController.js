import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Teacher from "../Models/Teacher.js";
import TeacherApplication from "../Models/TeacherApplication.js";
import Course from "../Models/Course.js";
import { v2 as cloudinary } from "cloudinary";
import { generateSigningSecret } from "../Middleware/requestSignature.js";
import ContentSettings from "../Models/ContentSettings.js";

const PLATFORM_FEE_PERCENT = 20;

/**
 * generate a secure invite token with 4-minute expiry
 */
const generateInviteToken = () => {
  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 4 * 60 * 1000); // 4 minutes
  return { token, expiry };
};

const generateTeacherToken = (teacherId) => {
  return jwt.sign(
    { teacherId, role: "teacher" },
    process.env.TEACHER_JWT_SECRET || process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// ── public: submit application ──

export const submitTeacherApplication = async (req, res) => {
  try {
    const { name, email, qualification, reason, country } = req.body;

    if (!name || !email || !qualification || !reason || !country) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    if (!["india", "nepal"].includes(country)) {
      return res.status(400).json({ success: false, message: "Country must be india or nepal" });
    }

    // check for duplicate
    const existing = await TeacherApplication.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "An application with this email already exists",
      });
    }

    const existingTeacher = await Teacher.findOne({ email: email.toLowerCase() });
    if (existingTeacher) {
      return res.status(400).json({ success: false, message: "Email already registered as teacher" });
    }

    const application = await TeacherApplication.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      qualification: qualification.trim(),
      reason: reason.trim(),
      country,
    });

    // total pending count for social proof
    const waitlistCount = await TeacherApplication.countDocuments({ status: "pending" });

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      data: { waitlistPosition: waitlistCount },
    });
  } catch (error) {
    console.error("Submit teacher application error:", error);
    res.status(500).json({ success: false, message: "Failed to submit application" });
  }
};

export const getWaitlistCount = async (req, res) => {
  try {
    const count = await TeacherApplication.countDocuments({ status: "pending" });
    return res.status(200).json({ success: true, data: { count } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch count" });
  }
};

// ── admin: view applications ──

export const getTeacherApplications = async (req, res) => {
  try {
    const { status = "pending", page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [applications, total] = await Promise.all([
      TeacherApplication.find({ status })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      TeacherApplication.countDocuments({ status }),
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
    console.error("Get teacher applications error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch applications" });
  }
};

export const sendTeacherInvite = async (req, res) => {
  try {
    const { applicationId, emailContent } = req.body;

    if (!applicationId || !emailContent) {
      return res.status(400).json({ success: false, message: "Application ID and email content are required" });
    }

    const application = await TeacherApplication.findById(applicationId);
    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    if (application.status === "invited") {
      return res.status(400).json({ success: false, message: "Invite already sent" });
    }

    const { token, expiry } = generateInviteToken();

    // store token in a temp collection or directly send
    // we embed invite info in the token itself for stateless verification
    const invitePayload = {
      email: application.email,
      name: application.name,
      country: application.country,
      applicationId: application._id.toString(),
      token,
    };

    const signedToken = jwt.sign(
      invitePayload,
      process.env.TEACHER_INVITE_SECRET || process.env.JWT_SECRET,
      { expiresIn: "4m" }
    );

    // get content settings for email branding
    const contentSettings = await ContentSettings.getSettings().catch(() => ({ siteName: "Vidhgrow", logo: null }));

    const signupLink = `${process.env.FRONTEND_URL}/teacher/signup?token=${signedToken}`;

    // send email
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const siteName = contentSettings?.siteName || "Vidhgrow";
    const logoUrl = contentSettings?.logo?.url || null;

    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" alt="${siteName}" style="max-width:140px;height:auto;margin-bottom:24px;" />`
      : `<h2 style="margin:0 0 24px;color:#1a1a1a;font-size:24px;font-weight:700;">${siteName}</h2>`;

    const finalHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);max-width:100%;">
        <tr><td style="padding:40px 40px 32px;text-align:center;border-bottom:1px solid #e9ecef;">
          ${logoHtml}
        </td></tr>
        <tr><td style="padding:40px;">
          ${emailContent.replace(/\n/g, "<br/>")}
          <div style="margin-top:32px;text-align:center;">
            <a href="${signupLink}" style="display:inline-block;padding:14px 32px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
              Complete Your Registration
            </a>
          </div>
          <p style="margin-top:24px;color:#666;font-size:13px;text-align:center;">
            This link expires in <strong>4 minutes</strong>. If expired, please contact us.
          </p>
        </td></tr>
        <tr><td style="padding:20px;text-align:center;background:#f8f9fa;border-top:1px solid #e9ecef;">
          <p style="margin:0;color:#999;font-size:12px;">© ${new Date().getFullYear()} ${siteName}. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await resend.emails.send({
      from: `${siteName} <${process.env.EMAIL_USER}>`,
      to: application.email,
      subject: `You're invited to teach on ${siteName}`,
      html: finalHtml,
    });

    // update application status
    application.status = "invited";
    application.inviteSentAt = new Date();
    application.processedBy = req.admin.userId;
    await application.save();

    return res.status(200).json({
      success: true,
      message: "Invite sent successfully",
      data: { signupLink },
    });
  } catch (error) {
    console.error("Send teacher invite error:", error);
    res.status(500).json({ success: false, message: "Failed to send invite" });
  }
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
      { new: true }
    );

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    return res.status(200).json({ success: true, message: "Application rejected" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to reject application" });
  }
};

// ── teacher: signup via invite link ──

export const verifyInviteToken = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, message: "Token required" });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.TEACHER_INVITE_SECRET || process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(410).json({
          success: false,
          code: "LINK_EXPIRED",
          message: "This invite link has expired. Please contact us for a new invitation.",
        });
      }
      return res.status(400).json({ success: false, message: "Invalid invite link" });
    }

    // check if email already registered
    const existing = await Teacher.findOne({ email: payload.email });
    if (existing) {
      return res.status(400).json({ success: false, message: "This email is already registered" });
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
    res.status(500).json({ success: false, message: "Failed to verify token" });
  }
};

export const teacherSignup = async (req, res) => {
  try {
    const { token, password, username, bio, qualification } = req.body;

    if (!token || !password || !username) {
      return res.status(400).json({ success: false, message: "Token, password, and username are required" });
    }

    if (password.length < 8 || !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters with uppercase, lowercase, and number",
      });
    }

    if (username.length < 3 || username.length > 30 || !/^[a-z0-9_]+$/.test(username)) {
      return res.status(400).json({
        success: false,
        message: "Username must be 3-30 characters, lowercase letters, numbers, underscores only",
      });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.TEACHER_INVITE_SECRET || process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(410).json({
          success: false,
          code: "LINK_EXPIRED",
          message: "Invite link expired. Please request a new invitation.",
        });
      }
      return res.status(400).json({ success: false, message: "Invalid invite token" });
    }

    // duplicate checks
    const [existingEmail, existingUsername] = await Promise.all([
      Teacher.findOne({ email: payload.email }),
      Teacher.findOne({ username: username.toLowerCase() }),
    ]);

    if (existingEmail) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }
    if (existingUsername) {
      return res.status(400).json({ success: false, message: "Username already taken" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const teacher = await Teacher.create({
      name: payload.name,
      email: payload.email,
      password: hashedPassword,
      username: username.toLowerCase(),
      bio: bio?.trim() || "",
      qualification: qualification?.trim() || "",
      country: payload.country,
      isVerified: true,
      isActive: true,
    });

    const authToken = generateTeacherToken(teacher._id);

    res.cookie("teacherToken", authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
      ...(process.env.NODE_ENV === "production" && { domain: ".vidhgrow.online" }),
    });

    const signingSecret = await generateSigningSecret(teacher._id.toString());

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: {
        teacher: {
          id: teacher._id,
          name: teacher.name,
          email: teacher.email,
          username: teacher.username,
          country: teacher.country,
          role: "teacher",
        },
        signingSecret,
        signingSecretExpiresIn: 7 * 24 * 60 * 60,
      },
    });
  } catch (error) {
    console.error("Teacher signup error:", error);
    res.status(500).json({ success: false, message: "Failed to create account" });
  }
};

export const teacherLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password required" });
    }

    const teacher = await Teacher.findOne({ email: email.toLowerCase() }).select("+password");

    if (!teacher || !teacher.isActive) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const isValid = await bcrypt.compare(password, teacher.password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    teacher.lastLoginAt = new Date();
    await teacher.save();

    const authToken = generateTeacherToken(teacher._id);

    res.cookie("teacherToken", authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
      ...(process.env.NODE_ENV === "production" && { domain: ".vidhgrow.online" }),
    });

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
          profileImage: teacher.profileImage,
          role: "teacher",
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
    res.clearCookie("teacherToken", { path: "/" });
    return res.status(200).json({ success: true, message: "Logged out" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Logout failed" });
  }
};

export const getTeacherProfile = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.teacher.teacherId)
      .select("-password -otp")
      .lean();

    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }

    // get their courses
    const courses = await Course.find({ teacher: req.teacher.teacherId })
      .select("name isPaid price approvalStatus isActive totalQuestions createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: { teacher, courses },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch profile" });
  }
};

export const updateTeacherProfile = async (req, res) => {
  try {
    const { bio, qualification } = req.body;
    const teacherId = req.teacher.teacherId;

    const updates = {};
    if (bio !== undefined) updates.bio = bio.trim().slice(0, 500);
    if (qualification !== undefined) updates.qualification = qualification.trim().slice(0, 300);

    // handle profile image upload
    if (req.file) {
      const teacher = await Teacher.findById(teacherId).select("profileImage");

      // delete old image
      if (teacher?.profileImage?.public_id) {
        await cloudinary.uploader.destroy(teacher.profileImage.public_id).catch(() => {});
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

    return res.status(200).json({ success: true, data: { teacher } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update profile" });
  }
};

export const updatePaymentDetails = async (req, res) => {
  try {
    const teacherId = req.teacher.teacherId;
    const { india, nepal } = req.body;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }

    if (teacher.country === "india" && india) {
      teacher.paymentDetails.india = { ...teacher.paymentDetails.india, ...india };
    } else if (teacher.country === "nepal" && nepal) {
      teacher.paymentDetails.nepal = { ...teacher.paymentDetails.nepal, ...nepal };
    } else {
      return res.status(400).json({ success: false, message: "Invalid payment details for your country" });
    }

    // mark as unverified until admin approves
    teacher.paymentDetails.verified = false;
    await teacher.save();

    return res.status(200).json({
      success: true,
      message: "Payment details updated. Admin will verify shortly.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update payment details" });
  }
};

export const getPublicTeacherProfile = async (req, res) => {
  try {
    const { username } = req.params;

    const teacher = await Teacher.findOne({ username: username.toLowerCase() })
      .select("name username bio qualification profileImage country createdAt")
      .lean();

    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }

    const courses = await Course.find({
      teacher: teacher._id,
      isActive: true,
      approvalStatus: "approved",
    })
      .select("name description image isPaid price totalQuestions geoRestriction")
      .lean();

    return res.status(200).json({
      success: true,
      data: { teacher, courses },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch profile" });
  }
};

// ── admin: manage teachers ──

export const getAllTeachers = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [teachers, total] = await Promise.all([
      Teacher.find()
        .select("-password -otp -paymentDetails.india.accountNumber -paymentDetails.nepal")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Teacher.countDocuments(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        teachers,
        pagination: { total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch teachers" });
  }
};

export const getTeacherCourseApprovals = async (req, res) => {
  try {
    const courses = await Course.find({ approvalStatus: "pending", teacher: { $ne: null } })
      .populate("teacher", "name email username country")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, data: { courses } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch pending courses" });
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
        isActive: approved ? true : false,
      },
      { new: true }
    ).populate("teacher", "name email");

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    return res.status(200).json({
      success: true,
      message: `Course ${approved ? "approved" : "rejected"}`,
      data: { course },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update approval" });
  }
};

export const verifyTeacherPaymentDetails = async (req, res) => {
  try {
    const { teacherId, verified } = req.body;

    const teacher = await Teacher.findByIdAndUpdate(
      teacherId,
      { "paymentDetails.verified": verified },
      { new: true }
    ).select("name email paymentDetails.verified");

    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }

    return res.status(200).json({ success: true, data: { teacher } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to verify payment details" });
  }
};

// ── teacher: create course ──

export const teacherCreateCourse = async (req, res) => {
  try {
    const teacherId = req.teacher.teacherId;
    const teacher = await Teacher.findById(teacherId);

    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }

    const {
      name,
      description,
      difficulties,
      isPaid,
      price,
      geoRestriction,
    } = req.body;

    const isPaidBool = isPaid === "true" || isPaid === true;

    // geo restriction must match teacher's country for paid courses
    if (isPaidBool && geoRestriction && geoRestriction !== teacher.country) {
      return res.status(400).json({
        success: false,
        message: `You can only create courses restricted to your country (${teacher.country})`,
      });
    }

    const actualGeoRestriction = isPaidBool ? teacher.country : (geoRestriction || null);

    let parsedDifficulties = difficulties;
    if (typeof difficulties === "string") {
      parsedDifficulties = JSON.parse(difficulties);
    }

    const processedDifficulties = parsedDifficulties.map((diff) => ({
      ...diff,
      totalMarks: diff.marksPerQuestion * diff.maxQuestions,
    }));

    const calculatedMaxQuestions = processedDifficulties.reduce(
      (t, d) => t + d.maxQuestions,
      0
    );

    let image = null;
    if (req.files?.image?.[0]) {
      image = { public_id: req.files.image[0].filename, url: req.files.image[0].path };
    }

    const courseData = {
      name: name.trim(),
      description: description?.trim(),
      difficulties: processedDifficulties,
      maxQuestionsPerTest: calculatedMaxQuestions,
      isPaid: isPaidBool,
      currency: teacher.country === "nepal" ? "NPR" : "INR",
      teacher: teacherId,
      approvalStatus: "pending",
      isActive: false,
      geoRestriction: actualGeoRestriction,
      questions: [],
      totalQuestions: 0,
      ...(image && { image }),
    };

    if (isPaidBool) {
      courseData.price = parseFloat(price) || 0;
    }

    const course = await Course.create(courseData);

    return res.status(201).json({
      success: true,
      message: "Course submitted for admin approval",
      data: { course },
    });
  } catch (error) {
    console.error("Teacher create course error:", error);
    res.status(500).json({ success: false, message: "Failed to create course" });
  }
};