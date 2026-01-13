import express from "express";
import {
  verifyRequestSignature,
  getSigningSecretEndpoint,
} from "../Middleware/requestSignature.js";
import { authenticateUser, authenticateAdmin } from "../Middleware/auth.js";
import jwt from "jsonwebtoken";
import User from "../Models/User.js";
import Admin from "../Models/Admin.js";
import CryptoJS from "crypto-js";

const router = express.Router();

/**
 * HELPER: Decrypt cookie data (for user auth)
 */
const decryptCookieData = (encryptedData) => {
  try {
    const encryptionKey = process.env.COOKIE_ENCRYPTION_KEY;
    const bytes = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  } catch (error) {
    return null;
  }
};

/**
 * Cookie-only authentication middleware for /signing-secret endpoint
 *
 * Validates ONLY auth cookies, NOT request signatures
 * This breaks the chicken-and-egg problem where signing-secret
 * endpoint would require a signature to get a signature
 *
 * @middleware
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
const authCookieOnly = async (req, res, next) => {
  try {
    // Check for admin token first
    const adminToken = req.cookies.adminToken;

    if (adminToken) {
      try {
        // Verify admin JWT
        const decoded = jwt.verify(adminToken, process.env.ADMIN_JWT_SECRET);
        const admin = await Admin.findById(decoded.adminId).select("-password");

        if (!admin) {
          return res.status(401).json({
            success: false,
            message: "Invalid admin token",
            code: "AUTH_INVALID",
          });
        }

        // CRITICAL: Set BOTH admin and user fields consistently
        req.admin = {
          userId: admin._id,
          adminId: admin._id,
          isAdmin: true,
          ...admin.toObject(),
        };

        // IMPORTANT: Also set req.user for backward compatibility
        req.user = {
          userId: admin._id,
          isAdmin: true, // Add this flag
        };

        console.log("[SIGNING_SECRET] Admin authenticated via cookie:", {
          adminId: admin._id,
          email: admin.email,
        });

        return next();
      } catch (jwtError) {
        console.error(
          "[SIGNING_SECRET] Admin JWT verification failed:",
          jwtError.message
        );
        return res.status(401).json({
          success: false,
          message: "Invalid admin token",
          code: "TOKEN_INVALID",
        });
      }
    }

    // Check for user token
    const encryptedUserCookie = req.signedCookies.auth_session;

    if (!encryptedUserCookie) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        code: "AUTH_REQUIRED",
      });
    }

    // Decrypt and verify user JWT
    const cookieData = decryptCookieData(encryptedUserCookie);

    if (!cookieData || !cookieData.token) {
      return res.status(401).json({
        success: false,
        message: "Invalid session data",
        code: "AUTH_INVALID",
      });
    }

    const decoded = jwt.verify(cookieData.token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password -otp");

    if (!user || !user.isVerified) {
      return res.status(401).json({
        success: false,
        message: "User not found or not verified",
        code: "AUTH_INVALID",
      });
    }

    // Set user in request
    req.user = { userId: user._id, ...user.toObject() };

    console.log("[SIGNING_SECRET] User authenticated via cookie only");
    next();
  } catch (error) {
    console.error("[SIGNING_SECRET] Auth error:", error.message);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
        code: "TOKEN_INVALID",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired",
        code: "TOKEN_EXPIRED",
      });
    }

    res.status(401).json({
      success: false,
      message: "Authentication failed",
      code: "AUTH_ERROR",
    });
  }
};

/**
 * GET /signing-secret - Retrieve request signing secret
 * Auth: Cookie-based authentication ONLY (signature NOT required)
 *
 * Security considerations:
 * - Requires valid authentication cookie (admin or user)
 * - Does NOT require request signature (breaks chicken-and-egg)
 * - Returns user-specific secret with 7-day expiry
 * - Nonce system prevents replay attacks
 * - Bot protection applies via global middleware
 */
router.get("/signing-secret", authCookieOnly, getSigningSecretEndpoint);



export default router;
