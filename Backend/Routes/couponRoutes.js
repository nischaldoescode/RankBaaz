import express from "express";
import {
  createCoupon,
  getAllCoupons,
  getCourseCoupons,
  verifyCoupon,
  updateCouponStatus,
  deleteCoupon,
  couponValidation,
    updateCoupon,
  couponUpdateValidation,
} from "../Controllers/CouponController.js";
import { authenticateAdmin, authenticateUser } from "../Middleware/auth.js";
import { getSigningSecretEndpoint, verifyRequestSignature } from "../Middleware/requestSignature.js";
const router = express.Router();

// Admin routes
// Admin routes (with CSRF protection)
router.post("/", authenticateAdmin, verifyRequestSignature, couponValidation, createCoupon);
router.get("/admin/all", authenticateAdmin, getAllCoupons);
router.get("/admin/course/:courseId", authenticateAdmin, getCourseCoupons);
router.patch("/:couponId/status", authenticateAdmin, verifyRequestSignature, updateCouponStatus);
router.put("/:couponId", authenticateAdmin, verifyRequestSignature, couponUpdateValidation, updateCoupon);
router.delete("/:couponId", authenticateAdmin, verifyRequestSignature, deleteCoupon);

// User routes (with CSRF protection)
router.post("/verify", authenticateUser, verifyRequestSignature, verifyCoupon);

export default router;