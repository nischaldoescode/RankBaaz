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
} from "../Controllers/teacherController.js";
import { authenticateTeacher } from "../Middleware/teacherAuth.js";
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

// document storage (pdf, jpg, png — max 1mb each)
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
    if (err)
      return res.status(400).json({ success: false, message: err.message });
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

// ── public ──
router.post("/apply", submitTeacherApplication);
router.get("/waitlist-count", getWaitlistCount);
router.get("/verify-invite", verifyInviteToken);
router.post("/otp/send", sendSignupOtp);
router.post("/otp/verify", verifySignupOtp);
router.post("/signup", teacherSignup);
router.post("/login", teacherLogin);
router.post("/logout", teacherLogout);
router.post("/forgot-password", teacherForgotPassword);
router.post("/forgot-password/verify-otp", teacherVerifyForgotOtp);
router.post("/forgot-password/reset", teacherResetPassword);
router.get("/public/:username", getPublicTeacherProfile);

// ── teacher authenticated ──
router.get("/me", authenticateTeacher, getTeacherProfile);
router.get("/me/analytics", authenticateTeacher, getTeacherAnalytics);
router.put(
  "/me/profile",
  authenticateTeacher,
  handleProfileUpload,
  updateTeacherProfile,
);
router.put("/me/payment-details", authenticateTeacher, updatePaymentDetails);
router.post(
  "/me/documents",
  authenticateTeacher,
  handleDocumentUpload,
  uploadDocuments,
);

// teacher course management
router.post(
  "/me/courses",
  authenticateTeacher,
  uploadCourseImage,
  handleUploadError,
  teacherCreateCourse,
);
router.put(
  "/me/courses/:courseId",
  authenticateTeacher,
  uploadCourseImage,
  handleUploadError,
  teacherUpdateCourse,
);
router.get(
  "/me/courses/:courseId/questions",
  authenticateTeacher,
  teacherGetCourseQuestions,
);
router.post(
  "/me/courses/:courseId/questions",
  authenticateTeacher,
  uploadCourseImage,
  handleUploadError,
  teacherAddQuestion,
);

// ── admin ──
router.get("/applications", authenticateAdmin, getTeacherApplications);
router.post("/applications/invite", authenticateAdmin, sendTeacherInvite);
router.post(
  "/applications/reject",
  authenticateAdmin,
  rejectTeacherApplication,
);
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
