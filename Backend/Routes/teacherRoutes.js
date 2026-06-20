/**
 * mounts teacher routes api endpoints and keeps middleware order explicit for each request path
 *
 * @file backend/routes/teacherroutes.js
 * @module backend/routes/teacherroutes
 * @exports express router mounted by the api server
 */

import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { createRequire } from "module";
import {
  submitTeacherApplication,
  getWaitlistCount,
  verifyInviteToken,
  sendSignupOtp,
  verifySignupOtp,
  teacherSignup,
  teacherLogin,
  teacherLogout,
  teacherForgotPassword,
  teacherVerifyForgotOtp,
  teacherResetPassword,
  uploadDocuments,
  getTeacherProfile,
  getTeacherAnalytics,
  updateTeacherProfile,
  updatePaymentDetails,
  getPublicTeacherProfile,
  getAllTeachers,
  getTeacherById,
  adminVerifyDocuments,
  adminRequestDocuments,
  adminDeleteTeacher,
  getTeacherCourseApprovals,
  approveTeacherCourse,
  verifyTeacherPaymentDetails,
  teacherCreateCourse,
  teacherUpdateCourse,
  teacherAddQuestion,
  teacherGetCourseQuestions,
  getTeacherApplications,
  sendTeacherInvite,
  rejectTeacherApplication,
  deleteRejectedTeacherApplication,
  getTeacherCourses,
  teacherUpdateQuestion,
  teacherDeleteQuestion,
  getTeacherNotifications,
  markTeacherNotificationRead,
  markAllTeacherNotificationsRead,
} from "../Controllers/teacherController.js";
import {
  authenticateTeacher,
  requireDocumentVerification,
} from "../Middleware/teacherAuth.js";
import { authenticateAdmin } from "../Middleware/auth.js";
import { uploadCourseImage, handleUploadError } from "../Middleware/Upload.js";

const require = createRequire(import.meta.url);
const CloudinaryStorage = require("multer-storage-cloudinary");

// profile image storage (max 1mb, auto-compress to webp)
const profileImageStorage = new CloudinaryStorage({
  cloudinary,
  params: () => ({
    folder: "vidhgrow/teacher-profiles",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [
      {
        width: 400,
        height: 400,
        crop: "fill",
        quality: "auto",
        format: "webp",
      },
    ],
    resource_type: "image",
  }),
});

const uploadProfileImage = multer({
  storage: profileImageStorage,
  limits: { fileSize: 1 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPEG, PNG, WebP images allowed"));
  },
}).single("profileImage");

// document storage accepts pdf, jpg, and png up to 1mb each
const documentStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: "vidhgrow/teacher-documents",
    resource_type: file.mimetype === "application/pdf" ? "raw" : "image",
    allowed_formats: ["pdf", "jpg", "jpeg", "png"],
    transformation:
      file.mimetype !== "application/pdf"
        ? [{ quality: "auto", format: "webp" }]
        : undefined,
  }),
});

const uploadDocumentFiles = multer({
  storage: documentStorage,
  limits: { fileSize: 1 * 1024 * 1024, files: 2 },
  fileFilter: (req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only PDF, JPEG, PNG allowed"));
  },
}).array("documents", 2);

const handleProfileUpload = (req, res, next) => {
  uploadProfileImage(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "Profile image must be under 1MB",
          });
        }

        if (err.code === "LIMIT_UNEXPECTED_FILE") {
          return res.status(400).json({
            success: false,
            message: "Use profileImage as the upload field",
          });
        }
      }

      const isBrokenMultipart = String(err.message || "").includes(
        "Unexpected end of form",
      );

      return res.status(400).json({
        success: false,
        message: isBrokenMultipart
          ? "The profile upload was incomplete. Please choose the image again and retry."
          : err.message,
      });
    }
    next();
  });
};

const handleDocumentUpload = (req, res, next) => {
  uploadDocumentFiles(req, res, (err) => {
    if (err)
      return res.status(400).json({ success: false, message: err.message });
    next();
  });
};

const router = express.Router();

// public routes
router.post("/apply", submitTeacherApplication);
router.post("/application/status", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false });

    const TeacherApplication = (await import("../Models/TeacherApplication.js"))
      .default;
    const Teacher = (await import("../Models/Teacher.js")).default;

    const [app, teacher] = await Promise.all([
      TeacherApplication.findOne({ email: email.toLowerCase() })
        .select("status createdAt")
        .lean(),
      Teacher.findOne({ email: email.toLowerCase() }).select("_id").lean(),
    ]);

    if (teacher) {
      return res.json({ success: true, data: { status: "registered" } });
    }
    if (app) {
      return res.json({
        success: true,
        data: { status: app.status, appliedAt: app.createdAt },
      });
    }
    return res.json({ success: true, data: { status: "none" } });
  } catch {
    res.status(500).json({ success: false });
  }
});
router.get("/waitlist-count", getWaitlistCount);
router.get("/verify-invite", verifyInviteToken);
router.post("/otp/send", sendSignupOtp);
router.post("/otp/verify", verifySignupOtp);
router.post("/signup", teacherSignup);
router.post("/login", teacherLogin);
router.post("/check-email", async (req, res) => {
  try {
    const Teacher = (await import("../Models/Teacher.js")).default;
    const exists = await Teacher.exists({
      email: req.body.email?.toLowerCase(),
    });
    // return only existence, not account state
    return res.status(200).json({ success: true, exists: !!exists });
  } catch {
    res.status(500).json({ success: false, exists: false });
  }
});
router.post("/applications/reset", authenticateAdmin, async (req, res) => {
  try {
    const TeacherApplication = (await import("../Models/TeacherApplication.js"))
      .default;
    const app = await TeacherApplication.findByIdAndUpdate(
      req.body.applicationId,
      { status: "pending", inviteSentAt: null, processedBy: null },
      { new: true },
    );
    if (!app)
      return res.status(404).json({ success: false, message: "Not found" });
    return res.json({ success: true, message: "Application reset to pending" });
  } catch {
    res.status(500).json({ success: false, message: "Failed" });
  }
});

router.post("/logout", teacherLogout);
router.post("/forgot-password", teacherForgotPassword);
router.post("/forgot-password/verify-otp", teacherVerifyForgotOtp);
router.post("/forgot-password/reset", teacherResetPassword);
router.get("/public/:username", getPublicTeacherProfile);

// teacher authenticated routes
router.get("/me", authenticateTeacher, getTeacherProfile);
router.get("/me/notifications", authenticateTeacher, getTeacherNotifications);
router.patch(
  "/me/notifications/read-all",
  authenticateTeacher,
  markAllTeacherNotificationsRead,
);
router.patch(
  "/me/notifications/:notificationId/read",
  authenticateTeacher,
  markTeacherNotificationRead,
);
router.get(
  "/me/courses/all",
  authenticateTeacher,
  requireDocumentVerification,
  getTeacherCourses,
);
router.get(
  "/me/analytics",
  authenticateTeacher,
  requireDocumentVerification,
  getTeacherAnalytics,
);
router.post(
  "/me/courses",
  authenticateTeacher,
  requireDocumentVerification, // blocks network requests too
  uploadCourseImage,
  handleUploadError,
  teacherCreateCourse,
);
router.put(
  "/me/courses/:courseId",
  authenticateTeacher,
  requireDocumentVerification,
  uploadCourseImage,
  handleUploadError,
  teacherUpdateCourse,
);
router.post(
  "/me/courses/:courseId/questions",
  authenticateTeacher,
  requireDocumentVerification,
  uploadCourseImage,
  handleUploadError,
  teacherAddQuestion,
);
router.get(
  "/me/courses/:courseId/questions",
  authenticateTeacher,
  requireDocumentVerification,
  teacherGetCourseQuestions,
);
router.put(
  "/me/profile",
  authenticateTeacher,
  handleProfileUpload,
  updateTeacherProfile,
);
router.put(
  "/me/payment-details",
  authenticateTeacher,
  requireDocumentVerification,
  updatePaymentDetails,
);
router.post(
  "/me/documents",
  authenticateTeacher,
  handleDocumentUpload,
  uploadDocuments,
  // documents tab remains available during verification
);
router.put(
  "/me/courses/:courseId/questions/:questionId",
  authenticateTeacher,
  requireDocumentVerification,
  teacherUpdateQuestion,
);
router.delete(
  "/me/courses/:courseId/questions/:questionId",
  authenticateTeacher,
  requireDocumentVerification,
  teacherDeleteQuestion,
);

// admin routes
router.get("/applications", authenticateAdmin, getTeacherApplications);
router.post("/applications/invite", authenticateAdmin, sendTeacherInvite);
router.post(
  "/applications/reject",
  authenticateAdmin,
  rejectTeacherApplication,
);
router.delete(
  "/applications/:applicationId",
  authenticateAdmin,
  deleteRejectedTeacherApplication,
);
router.post("/admin/unblock", authenticateAdmin, (req, res) => {
  import("../Controllers/adminController.js").then(({ adminUnblockTeacher }) =>
    adminUnblockTeacher(req, res),
  );
});

router.get("/admin/all", authenticateAdmin, getAllTeachers);
router.get("/admin/:teacherId", authenticateAdmin, getTeacherById);
router.delete("/admin/:teacherId", authenticateAdmin, adminDeleteTeacher);
router.post("/admin/verify-documents", authenticateAdmin, adminVerifyDocuments);
router.post(
  "/admin/request-documents",
  authenticateAdmin,
  adminRequestDocuments,
);
router.get(
  "/admin/course-approvals",
  authenticateAdmin,
  getTeacherCourseApprovals,
);
router.post("/admin/approve-course", authenticateAdmin, approveTeacherCourse);
router.post(
  "/admin/verify-payment",
  authenticateAdmin,
  verifyTeacherPaymentDetails,
);

export default router;
