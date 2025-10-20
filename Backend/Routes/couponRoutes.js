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

const router = express.Router();

// Admin routes
router.post("/", authenticateAdmin, couponValidation, createCoupon);
router.get("/admin/all", authenticateAdmin, getAllCoupons);
router.get("/admin/course/:courseId", authenticateAdmin, getCourseCoupons);
router.patch("/:couponId/status", authenticateAdmin, updateCouponStatus);
router.put("/:couponId", authenticateAdmin, couponUpdateValidation, updateCoupon);
router.delete("/:couponId", authenticateAdmin, deleteCoupon);

// User routes
router.post("/verify", authenticateUser, verifyCoupon);

export default router;