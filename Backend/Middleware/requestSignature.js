import crypto from "crypto";
import redisClient, {
  isRedisConnectionError,
  summarizeRedisError,
} from "../Config/redis.js";

/**
 * Generate signing secret for authenticated session
 *
 * Supports both user and admin authentication
 * Stores secret in Redis with 7-day expiry
 *
 * @param {string} userId - User or Admin ID
 * @param {boolean} isAdmin - Whether this is an admin session (default: false)
 * @returns {Promise<string>} - Hex-encoded 256-bit secret
 */
export const generateSigningSecret = async (userId, isAdmin = false) => {
  const secret = crypto.randomBytes(32).toString("hex");

  // Use different Redis key prefix for admin vs user
  const prefix = isAdmin ? "signing:secret:admin" : "signing:secret";
  const key = `${prefix}:${userId}`;

  // Store in Redis with 7-day expiry (matches auth token)
  await redisClient.setex(key, 7 * 24 * 60 * 60, secret);

  console.log(
    `[SIGNING_SECRET] Generated new secret for ${isAdmin ? "admin" : "user"} ${userId}`
  );

  return secret;
};

/**
 * Retrieve signing secret from Redis
 *
 * @param {string} userId - User or Admin ID
 * @param {boolean} isAdmin - Whether this is an admin session (default: false)
 * @returns {Promise<string|null>} - Secret or null if not found
 */
const getSigningSecret = async (userId, isAdmin = false) => {
  const prefix = isAdmin ? "signing:secret:admin" : "signing:secret";
  const key = `${prefix}:${userId}`;

  const secret = await redisClient.get(key);

  if (!secret && process.env.NODE_ENV === "development") {
    console.warn(
      `[SIGNING_SECRET] No secret found for ${isAdmin ? "admin" : "user"} ${userId}`
    );
  }

  return secret;
};

/**
 * Verify HMAC-SHA256 request signature
 *
 * Security checks:
 * 1. Signature, timestamp, nonce headers present
 * 2. Nonce format validation (32 hex chars)
 * 3. Timestamp within 5-minute window
 * 4. Nonce not reused (replay attack prevention)
 * 5. HMAC signature matches expected value
 *
 * @middleware
 */
export const verifyRequestSignature = async (req, res, next) => {
  try {
    if (req.signatureVerified) {
      return next();
    }

    const signature = req.headers["x-request-signature"];
    const timestamp = req.headers["x-request-timestamp"];
    const nonce = req.headers["x-request-nonce"];

    // CRITICAL: Check for signature headers
    if (!signature || !timestamp || !nonce) {
      console.warn("[SIGNATURE] Missing signature headers:", {
        hasSignature: !!signature,
        hasTimestamp: !!timestamp,
        hasNonce: !!nonce,
        path: req.originalUrl,
      });

      return res.status(403).json({
        success: false,
        message: "Missing request signature. Please refresh and try again.",
        code: "SIGNATURE_MISSING",
      });
    }

    // Validate nonce format (must be exactly 32 hex characters)
    if (!/^[0-9a-f]{32}$/i.test(nonce)) {
      console.warn("[SIGNATURE] Invalid nonce format:", {
        nonce: nonce.substring(0, 10) + "...",
        path: req.originalUrl,
      });

      return res.status(403).json({
        success: false,
        message: "Invalid request format.",
        code: "INVALID_NONCE",
      });
    }

    if (!/^[0-9a-f]{64}$/i.test(signature)) {
      console.warn("[SIGNATURE] Invalid signature format:", {
        path: req.originalUrl,
      });

      return res.status(403).json({
        success: false,
        message: "Invalid request format.",
        code: "SIGNATURE_INVALID",
      });
    }

    // Check timestamp (must be within 5 minutes)
    const now = Date.now();
    const requestTime = parseInt(timestamp);

    if (isNaN(requestTime)) {
      console.warn("[SIGNATURE] Invalid timestamp format:", {
        timestamp,
        path: req.originalUrl,
      });

      return res.status(403).json({
        success: false,
        message: "Invalid request timestamp.",
        code: "INVALID_TIMESTAMP",
      });
    }

    const timeDiff = Math.abs(now - requestTime);

    if (timeDiff > 5 * 60 * 1000) {
      console.warn("[SIGNATURE] Timestamp expired:", {
        now,
        requestTime,
        diffSeconds: Math.floor(timeDiff / 1000),
        path: req.originalUrl,
      });

      return res.status(403).json({
        success: false,
        message: "Request expired. Please refresh and try again.",
        code: "SIGNATURE_EXPIRED",
      });
    }

    // Get user/admin ID from authenticated request
    const userId = req.user?.userId || req.admin?.userId || req.admin?.adminId;
    const isAdmin = !!req.admin;

    if (!userId) {
      console.error("[SIGNATURE] No userId in request:", {
        hasUser: !!req.user,
        hasAdmin: !!req.admin,
        path: req.originalUrl,
      });

      return res.status(401).json({
        success: false,
        message: "Authentication required",
        code: "AUTH_REQUIRED",
      });
    }

    // Check nonce for replay attack prevention
    // Use different prefix for admin vs user nonces
    const noncePrefix = isAdmin ? "nonce:admin" : "nonce";
    const nonceKey = `${noncePrefix}:${userId}:${nonce}`;

    let nonceExists;

    try {
      nonceExists = await redisClient.get(nonceKey);
    } catch (redisError) {
      console.error(
        "[SIGNATURE] Redis error checking nonce:",
        summarizeRedisError(redisError),
      );
      // SECURITY: Reject request if Redis is down (fail secure)
      return res.status(503).json({
        success: false,
        message: "Service temporarily unavailable",
        code: "SERVICE_ERROR",
      });
    }

    if (nonceExists) {
      console.warn("[SIGNATURE] Replay attack detected:", {
        userId,
        isAdmin,
        nonce: nonce.substring(0, 10) + "...",
        path: req.originalUrl,
      });

      return res.status(403).json({
        success: false,
        message: "Request already processed",
        code: "REPLAY_ATTACK",
      });
    }

    // Store nonce for 5 minutes
    try {
      await redisClient.setex(nonceKey, 5 * 60, "used");
    } catch (redisError) {
      console.error(
        "[SIGNATURE] Redis error storing nonce:",
        summarizeRedisError(redisError),
      );
      // SECURITY: Reject if we can't store nonce (fail secure)
      return res.status(503).json({
        success: false,
        message: "Service temporarily unavailable",
        code: "SERVICE_ERROR",
      });
    }

    // Get signing secret (with admin flag)
    const secret = await getSigningSecret(userId, isAdmin);

    if (!secret) {
      console.error("[SIGNATURE] No signing secret found:", {
        userId,
        isAdmin,
        path: req.originalUrl,
      });

      return res.status(403).json({
        success: false,
        message: "Invalid session. Please log in again.",
        code: "SIGNATURE_INVALID",
      });
    }

    // Create signature payload
    const method = req.method;
    const path = req.originalUrl;
    const body =
      Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : "";
    const payload = `${timestamp}:${nonce}:${method}:${path}:${body}`;

    // Calculate expected signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    // ADD THIS DEBUG LOGGING
    if (process.env.NODE_ENV === "development") {
      console.log("[SIGNATURE_DEBUG] Verification details:", {
        method,
        path, // This is what backend uses
        bodyLength: body.length,
        timestamp,
        noncePreview: nonce.substring(0, 10) + "...",
        secretPreview: secret.substring(0, 16) + "...",
      });
    }

    // CRITICAL: Use constant-time comparison to prevent timing attacks
    const signaturesMatch = crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );

    // Verify signature
    if (!signaturesMatch) {
      if (process.env.NODE_ENV === "development") {
        console.error("[SIGNATURE] Verification failed:", {
          userId,
          isAdmin,
          method,
          path,
          body: body.substring(0, 100),
          receivedSignature: signature.substring(0, 16) + "...",
          expectedSignature: expectedSignature.substring(0, 16) + "...",
          payload: payload.substring(0, 100),
        });
      } else {
        console.error("[SIGNATURE] Verification failed:", {
          userId,
          isAdmin,
          method,
          path,
        });
      }

      return res.status(403).json({
        success: false,
        message: "Invalid request signature. Please refresh and try again.",
        code: "SIGNATURE_INVALID",
      });
    }

    // Signature valid - log in development
    if (process.env.NODE_ENV === "development") {
      console.log("[SIGNATURE] Verified successfully:", {
        userId,
        isAdmin,
        method,
        path,
      });
    }

    req.signatureVerified = true;
    next();
  } catch (error) {
    if (isRedisConnectionError(error)) {
      console.error(
        "[SIGNATURE] Redis unavailable during verification:",
        summarizeRedisError(error),
      );
      return res.status(503).json({
        success: false,
        message: "Service temporarily unavailable",
        code: "SERVICE_ERROR",
      });
    }

    console.error("[SIGNATURE] Verification error:", error);
    res.status(500).json({
      success: false,
      message: "Signature verification failed",
      code: "SIGNATURE_ERROR",
    });
  }
};

/**
 * GET /api/security/signing-secret - Retrieve request signing secret
 *
 * Called by frontend after login or when signature expires
 * Does NOT require request signature (breaks chicken-and-egg problem)
 * Requires valid authentication cookie (validated by authCookieOnly middleware)
 *
 * Flow:
 * 1. Check if user/admin is authenticated
 * 2. Detect if request is from admin
 * 3. Try to get existing secret from Redis
 * 4. If no secret exists OR admin flag mismatch, regenerate
 * 5. Return secret with 7-day expiry
 *
 * @route GET /api/security/signing-secret
 * @auth Cookie-based authentication (admin or user)
 * @returns {200} - Signing secret with 7-day expiry
 * @returns {401} - Authentication required
 * @returns {500} - Server error
 */
export const getSigningSecretEndpoint = async (req, res) => {
  try {
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      Pragma: "no-cache",
      Expires: "0",
      "Surrogate-Control": "no-store",
    });

    // CRITICAL: Detect admin from multiple possible fields
    const userId = req.admin?.adminId || req.admin?.userId || req.user?.userId;
    const isAdmin = !!(req.admin || req.user?.isAdmin);

    if (!userId) {
      console.error("[SIGNING_SECRET] No userId found in request:", {
        hasUser: !!req.user,
        hasAdmin: !!req.admin,
        userObj: req.user,
        adminObj: req.admin,
      });

      return res.status(401).json({
        success: false,
        message: "Authentication required",
        code: "AUTH_REQUIRED",
      });
    }

    console.log(`[SIGNING_SECRET] Request for secret:`, {
      userId,
      isAdmin,
      source: req.admin ? "req.admin" : "req.user",
    });

    // Try to get existing secret with correct admin flag
    let secret = await getSigningSecret(userId, isAdmin);

    // CRITICAL: Always regenerate if no secret found
    // This ensures frontend and backend use the same secret
    if (!secret) {
      console.log(
        `[SIGNING_SECRET] Generating new secret for ${isAdmin ? "admin" : "user"} ${userId}`
      );
      secret = await generateSigningSecret(userId, isAdmin);
    } else {
      console.log(
        `[SIGNING_SECRET] Returning existing secret for ${isAdmin ? "admin" : "user"} ${userId}`
      );
    }

    // Log secret preview for debugging (only in development)
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[SIGNING_SECRET] Secret preview: ${secret.substring(0, 16)}...`
      );
    }

    res.status(200).json({
      success: true,
      data: {
        signingSecret: secret,
        expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
      },
    });
  } catch (error) {
    if (isRedisConnectionError(error)) {
      console.error(
        "[SIGNING_SECRET] Redis unavailable:",
        summarizeRedisError(error),
      );
      return res.status(503).json({
        success: false,
        message: "Service temporarily unavailable",
        code: "SERVICE_ERROR",
      });
    }

    console.error("[SIGNING_SECRET] Get secret error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get signing secret",
      code: "SECRET_ERROR",
    });
  }
};
