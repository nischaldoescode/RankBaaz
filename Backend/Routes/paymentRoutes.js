/**
 * keeps the payment routes route focused and readable.
 */
import express from "express";
import {
  createOrder,
  verifyPayment,
  checkPurchaseStatus,
  getPurchaseHistory,
} from "../Controllers/PaymentController.js";
import { authenticateUser } from "../Middleware/auth.js";
import {
  getSigningSecretEndpoint,
  verifyRequestSignature,
} from "../Middleware/requestSignature.js";
const router = express.Router();

// all routes require authentication
router.use(authenticateUser);

router.post("/create-order", verifyRequestSignature, createOrder);
router.post("/verify", verifyRequestSignature, verifyPayment);
router.get("/check-purchase/:courseId", checkPurchaseStatus);
router.get("/history", getPurchaseHistory);

export default router;
