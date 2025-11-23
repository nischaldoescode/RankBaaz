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
import { validateCSRFToken } from "../Middleware/csrf.js";

const router = express.Router();

// Admin routes
// Admin routes (with CSRF protection)
router.post("/", authenticateAdmin, validateCSRFToken, couponValidation, createCoupon);
router.get("/admin/all", authenticateAdmin, getAllCoupons);
router.get("/admin/course/:courseId", authenticateAdmin, getCourseCoupons);
router.patch("/:couponId/status", authenticateAdmin, validateCSRFToken, updateCouponStatus);
router.put("/:couponId", authenticateAdmin, validateCSRFToken, couponUpdateValidation, updateCoupon);
router.delete("/:couponId", authenticateAdmin, validateCSRFToken, deleteCoupon);

// User routes (with CSRF protection)
router.post("/verify", authenticateUser, validateCSRFToken, verifyCoupon);

export default router;