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
 * Generate CSRF token for session
 * Stores token in Redis with user/session identifier
 */
export const generateCSRFToken = async (req, res, next) => {
  try {
    // Generate cryptographically secure token
    const token = crypto.randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
    
    // Use user ID if authenticated, otherwise use session ID
    const identifier = req.user?.userId || req.sessionID || req.ip;
    const tokenKey = `csrf:${identifier}`;
    
    // Store token in Redis with expiration
    await redisClient.setex(tokenKey, CSRF_TOKEN_TTL, token);
    
    // Attach token to response header
    res.setHeader("X-CSRF-Token", token);
    
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
      return res.status(403).json({
        success: false,
        message: "CSRF token missing",
        code: "CSRF_TOKEN_MISSING",
      });
    }
    
    // Retrieve stored token
    const identifier = req.user?.userId || req.sessionID || req.ip;
    const tokenKey = `csrf:${identifier}`;
    const storedToken = await redisClient.get(tokenKey);
    
    if (!storedToken) {
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
      return res.status(403).json({
        success: false,
        message: "Invalid CSRF token",
        code: "CSRF_TOKEN_INVALID",
      });
    }
    
    const isValid = crypto.timingSafeEqual(tokenBuffer, storedBuffer);
    
    if (!isValid) {
      return res.status(403).json({
        success: false,
        message: "Invalid CSRF token",
        code: "CSRF_TOKEN_INVALID",
      });
    }
    
    // Token valid - proceed
    next();
  } catch (error) {
    console.error("[CSRF] Validation error:", error);
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
    const identifier = req.user?.userId || req.sessionID || req.ip;
    const tokenKey = `csrf:${identifier}`;
    
    await redisClient.setex(tokenKey, CSRF_TOKEN_TTL, token);
    
    res.status(200).json({
      success: true,
      data: { csrfToken: token },
    });
  } catch (error) {
    console.error("[CSRF] Token retrieval failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate CSRF token",
    });
  }
};