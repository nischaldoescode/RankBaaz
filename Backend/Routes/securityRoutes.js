import express from "express";
import { 
  verifyRequestSignature, 
  getSigningSecretEndpoint 
} from "../Middleware/requestSignature.js";
import { authenticateUser } from "../Middleware/auth.js";

const router = express.Router();

// CRITICAL: Signing secret endpoint MUST NOT require signature verification
// This is a chicken-and-egg problem: You need the secret to sign requests,
// but you need to sign requests to get the secret
// 
// Security is maintained because:
// 1. Endpoint requires authentication cookie (authenticateUser middleware)
// 2. Endpoint only returns secret for authenticated users
// 3. Secret is user-specific and expires after 7 days
// 4. Nonce prevents replay attacks
// 5. Bot protection still applies (from global middleware in server.js)
router.get("/signing-secret", authenticateUser, getSigningSecretEndpoint);

export default router;