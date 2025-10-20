import express from "express";
import {
  createOrder,
  verifyPayment,
  checkPurchaseStatus,
  getPurchaseHistory,
} from "../Controllers/PaymentController.js";
import { authenticateUser } from "../Middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(authenticateUser);

router.post("/create-order", createOrder);
router.post("/verify", verifyPayment);
router.get("/check-purchase/:courseId", checkPurchaseStatus);
router.get("/history", getPurchaseHistory);


export default router;