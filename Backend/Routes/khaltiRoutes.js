import express from "express";
import {
  initiateKhaltiPayment,
  verifyKhaltiPayment,
  khaltiCallback,
} from "../Controllers/khaltiController.js";
import { authenticateUser } from "../Middleware/auth.js";
import { verifyRequestSignature } from "../Middleware/requestSignature.js";

const router = express.Router();

// public callback from khalti portal
router.get("/callback", khaltiCallback);

// authenticated
router.use(authenticateUser);
router.post("/initiate", verifyRequestSignature, initiateKhaltiPayment);
router.post("/verify", verifyRequestSignature, verifyKhaltiPayment);

export default router;