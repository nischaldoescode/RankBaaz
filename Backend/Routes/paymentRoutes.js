import express from "express";
import {
  createOrder,
  verifyPayment,
  checkPurchaseStatus,
  getPurchaseHistory,
} from "../Controllers/PaymentController.js";
import { authenticateUser } from "../Middleware/auth.js";
import { validateCSRFToken } from "../Middleware/csrf.js";

const router = express.Router();

// All routes require authentication
router.use(authenticateUser);

router.post("/create-order", validateCSRFToken, createOrder);
router.post("/verify", validateCSRFToken, verifyPayment);
router.get("/check-purchase/:courseId", checkPurchaseStatus);
router.get("/history", getPurchaseHistory);


export default router;