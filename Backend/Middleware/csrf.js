import crypto from "crypto";
import redisClient from "../Config/redis.js";

/**
 * CSRF Token Configuration
 * Generates and validates CSRF tokens for state-changing operations
 * Prevents Cross-Site Request Forgery attacks
 */

const CSRF_TOKEN_LENGTH = 32;
const CSRF_TOKEN_TTL = 3600; // 1 hour

/**
 * Helper function to get consistent identifier across requests
 * Normalizes IP addresses and provides consistent format
 */
const getIdentifier = (req) => {
  // Priority: userId > session ID > normalized IP
  if (req.user?.userId) {
    return `user:${req.user.userId}`;
  }

  // For anonymous users, use session ID if available
  if (req.session?.id) {
    return `session:${req.session.id}`;
  }

  // Fallback: Normalize IP address (remove IPv6 prefix)
  let ip = req.ip || req.connection.remoteAddress || "unknown";

  // Enhanced normalization
  if (ip.startsWith("::ffff:")) {
    ip = ip.substring(7);
  }
  if (ip === "::1" || ip === "::ffff:127.0.0.1") {
    ip = "127.0.0.1";
  }

  // Additional cleanup for localhost variations
  if (ip.includes("127.0.0.1") || ip.includes("localhost")) {
    ip = "127.0.0.1";
  }

  return `ip:${ip}`;
};

/**
 * Generate CSRF token for session
 * Stores token in Redis with user/session identifier
 */
export const generateCSRFToken = async (req, res, next) => {
  try {
    // Skip token generation for GET requests (optimization)
    if (req.method === "GET") {
      return next();
    }

    // Generate cryptographically secure token
    const token = crypto.randomBytes(CSRF_TOKEN_LENGTH).toString("hex");

    // Use consistent identifier
    const identifier = getIdentifier(req);
    const tokenKey = `csrf:${identifier}`;
    console.log("[CSRF GENERATE]", {
      identifier,
      tokenKey,
      ip: req.ip,
      sessionId: req.session?.id,
      userId: req.user?.userId,
    });
    // Store token in Redis with expiration
    await redisClient.setex(tokenKey, CSRF_TOKEN_TTL, token);

    // Attach token to response header (for reference)
    res.setHeader("X-CSRF-Token", token);

    console.log(`[CSRF] Token generated for identifier: ${identifier}`);

    // Continue to next middleware
    next();
  } catch (error) {
    console.error("[CSRF] Token generation failed:", error);
    // Don't block request if CSRF generation fails
    next();
  }
};

/**
 * Validate CSRF token for state-changing requests
 * Verifies token matches stored value in Redis
 */
export const validateCSRFToken = async (req, res, next) => {
  try {
    // Skip validation for safe methods
    const safeMethods = ["GET", "HEAD", "OPTIONS"];
    if (safeMethods.includes(req.method)) {
      return next();
    }

    // Extract token from header or body
    const token = req.headers["x-csrf-token"] || req.body._csrf;

    if (!token) {
      console.error("[CSRF] Token missing in request");
      return res.status(403).json({
        success: false,
        message: "CSRF token missing",
        code: "CSRF_TOKEN_MISSING",
      });
    }

    // Use consistent identifier
    const identifier = getIdentifier(req);
    const tokenKey = `csrf:${identifier}`;

    console.log("[CSRF VALIDATE]", {
      identifier,
      tokenKey,
      ip: req.ip,
      sessionId: req.session?.id,
      userId: req.user?.userId,
      receivedToken: token.substring(0, 16) + "...",
    });

    const storedToken = await redisClient.get(tokenKey);

    console.log("[CSRF CHECK]", {
      hasStoredToken: !!storedToken,
      storedTokenPreview: storedToken
        ? storedToken.substring(0, 16) + "..."
        : null,
      receivedTokenPreview: token.substring(0, 16) + "...",
      tokensMatch: token === storedToken,
    });

    if (!storedToken) {
      // console.error(`[CSRF] No stored token found for key: ${tokenKey}`);
      // console.error(
      //   "[CSRF DEBUG] Available Redis keys:",
      //   await redisClient.keys("csrf:*")
      // );
      return res.status(403).json({
        success: false,
        message: "CSRF token expired",
        code: "CSRF_TOKEN_EXPIRED",
      });
    }

    // Constant-time comparison to prevent timing attacks
    const tokenBuffer = Buffer.from(token);
    const storedBuffer = Buffer.from(storedToken);

    if (tokenBuffer.length !== storedBuffer.length) {
      // console.error("[CSRF] Token length mismatch");
      return res.status(403).json({
        success: false,
        message: "Invalid CSRF token",
        code: "CSRF_TOKEN_INVALID",
      });
    }

    const isValid = crypto.timingSafeEqual(tokenBuffer, storedBuffer);

    if (!isValid) {
      // console.error("[CSRF] Token comparison failed");
      return res.status(403).json({
        success: false,
        message: "Invalid CSRF token",
        code: "CSRF_TOKEN_INVALID",
      });
    }

    // console.log(`[CSRF] Token validated successfully for ${identifier}`);

    // Token valid - proceed
    next();
  } catch (error) {
    // console.error("[CSRF] Validation error:", error);
    res.status(500).json({
      success: false,
      message: "CSRF validation failed",
    });
  }
};

/**
 * Endpoint to get new CSRF token
 * Called by frontend before making state-changing requests
 */
export const getCSRFToken = async (req, res) => {
  try {
    const token = crypto.randomBytes(CSRF_TOKEN_LENGTH).toString("hex");

    // Use consistent identifier
    const identifier = getIdentifier(req);
    const tokenKey = `csrf:${identifier}`;

    await redisClient.setex(tokenKey, CSRF_TOKEN_TTL, token);

    // console.log(`[CSRF] Token issued for identifier: ${identifier}`);

    res.status(200).json({
      success: true,
      data: { csrfToken: token, expiresIn: CSRF_TOKEN_TTL },
    });
  } catch (error) {
    // console.error("[CSRF] Token retrieval failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate CSRF token",
    });
  }
};
