import express from "express";
import {
  createCoupon,
  getAllCoupons,
  getCourseCoupons,
  verifyCoupon,
  updateCouponStatus,
  deleteCoupon,
  updateCoupon,
  couponValidation,
  couponUpdateValidation,
  teacherCreateCoupon,
  teacherGetCourseCoupons,
  teacherDeleteCoupon,
  teacherToggleCouponStatus,
  adminSetTeacherCouponAccess,
} from "../Controllers/CouponController.js";
import { authenticateAdmin, authenticateUser } from "../Middleware/auth.js";
import {
  authenticateTeacher,
  requireDocumentVerification,
} from "../Middleware/teacherAuth.js";
import { verifyRequestSignature } from "../Middleware/requestSignature.js";

const router = express.Router();

// ── admin routes ──
router.post(
  "/",
  authenticateAdmin,
  verifyRequestSignature,
  couponValidation,
  createCoupon,
);
router.get("/admin/all", authenticateAdmin, getAllCoupons);
router.get("/admin/course/:courseId", authenticateAdmin, getCourseCoupons);
router.patch(
  "/:couponId/status",
  authenticateAdmin,
  verifyRequestSignature,
  updateCouponStatus,
);
router.put(
  "/:couponId",
  authenticateAdmin,
  verifyRequestSignature,
  couponUpdateValidation,
  updateCoupon,
);
router.delete(
  "/:couponId",
  authenticateAdmin,
  verifyRequestSignature,
  deleteCoupon,
);
router.post(
  "/admin/teacher-coupon-access",
  authenticateAdmin,
  verifyRequestSignature,
  adminSetTeacherCouponAccess,
);

// ── teacher routes ──
router.post(
  "/teacher",
  authenticateTeacher,
  requireDocumentVerification,
  teacherCreateCoupon,
);
router.get(
  "/teacher/course/:courseId",
  authenticateTeacher,
  requireDocumentVerification,
  teacherGetCourseCoupons,
);
router.delete(
  "/teacher/:couponId",
  authenticateTeacher,
  requireDocumentVerification,
  teacherDeleteCoupon,
);
router.patch(
  "/teacher/:couponId/status",
  authenticateTeacher,
  requireDocumentVerification,
  teacherToggleCouponStatus,
);

// ── user routes ──
router.post("/verify", authenticateUser, verifyRequestSignature, verifyCoupon);

export default router;
