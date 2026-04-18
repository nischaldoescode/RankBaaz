import express from "express";
import {
  submitTeacherApplication,
  getWaitlistCount,
  getTeacherApplications,
  sendTeacherInvite,
  rejectTeacherApplication,
  verifyInviteToken,
  teacherSignup,
  teacherLogin,
  teacherLogout,
  getTeacherProfile,
  updateTeacherProfile,
  updatePaymentDetails,
  getPublicTeacherProfile,
  getAllTeachers,
  getTeacherCourseApprovals,
  approveTeacherCourse,
  verifyTeacherPaymentDetails,
  teacherCreateCourse,
} from "../Controllers/teacherController.js";
import { authenticateTeacher } from "../Middleware/teacherAuth.js";
import { authenticateAdmin } from "../Middleware/auth.js";
import { uploadCourseImage, handleUploadError } from "../helpers/Upload.js";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const CloudinaryStorage = require("multer-storage-cloudinary");

const profileImageStorage = new CloudinaryStorage({
  cloudinary,
  params: () => ({
    folder: "test-app/teacher-profiles",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [
      { width: 400, height: 400, crop: "fill", quality: "auto", format: "webp" },
    ],
    resource_type: "image",
  }),
});

const uploadProfileImage = multer({
  storage: profileImageStorage,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1mb max
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPEG, PNG, and WebP images are allowed"));
  },
}).single("profileImage");

const router = express.Router();

// ── public ──
router.post("/apply", submitTeacherApplication);
router.get("/waitlist-count", getWaitlistCount);
router.get("/verify-invite", verifyInviteToken);
router.post("/signup", teacherSignup);
router.post("/login", teacherLogin);
router.post("/logout", teacherLogout);
router.get("/profile/:username", getPublicTeacherProfile);

// ── teacher authenticated ──
router.get("/me", authenticateTeacher, getTeacherProfile);
router.put(
  "/me/profile",
  authenticateTeacher,
  (req, res, next) => {
    uploadProfileImage(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  updateTeacherProfile
);
router.put("/me/payment-details", authenticateTeacher, updatePaymentDetails);
router.post(
  "/me/courses",
  authenticateTeacher,
  uploadCourseImage,
  handleUploadError,
  teacherCreateCourse
);

// ── admin ──
router.get("/applications", authenticateAdmin, getTeacherApplications);
router.post("/applications/invite", authenticateAdmin, sendTeacherInvite);
router.post("/applications/reject", authenticateAdmin, rejectTeacherApplication);
router.get("/admin/all", authenticateAdmin, getAllTeachers);
router.get("/admin/course-approvals", authenticateAdmin, getTeacherCourseApprovals);
router.post("/admin/approve-course", authenticateAdmin, approveTeacherCourse);
router.post("/admin/verify-payment", authenticateAdmin, verifyTeacherPaymentDetails);

export default router;