import express from "express";
import {
  verifyRequestSignature,
  getSigningSecretEndpoint,
} from "../Middleware/requestSignature.js";
import { authenticateUser } from "../Middleware/auth.js";

const router = express.Router();

/**
 * GET /signing-secret - Retrieve request signing secret
 * Auth: Cookie-based authentication only (signature not required)
 *
 * Security considerations:
 * - Requires valid authentication cookie
 * - Returns user-specific secret with 7-day expiry
 * - Nonce system prevents replay attacks
 * - Bot protection applies via global middleware
 */
router.get("/signing-secret", authenticateUser, getSigningSecretEndpoint);

export default router;
