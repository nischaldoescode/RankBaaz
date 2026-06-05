/**
 * handles auth middleware checks before controllers receive the request
 *
 * @file backend/middleware/auth.js
 * @module backend/middleware/auth
 * @exports middleware functions used by protected backend routes
 */

import jwt from "jsonwebtoken";
import User from "../Models/User.js";
import Admin from "../Models/Admin.js";
import CryptoJS from "crypto-js";
import { verifyRequestSignature } from "./requestSignature.js";

const decryptCookieData = (encryptedData) => {
  try {
    const encryptionKey = process.env.COOKIE_ENCRYPTION_KEY;
    const bytes = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  } catch (error) {
    return null;
  }
};

const generateDeviceFingerprint = (req) => {
  const userAgent = req.get("User-Agent") || "";
  const acceptLanguage = req.get("Accept-Language") || "";
  const acceptEncoding = req.get("Accept-Encoding") || "";

  return CryptoJS.SHA256(
    userAgent + acceptLanguage + acceptEncoding
  ).toString();
};

const isBootstrapProfileRequest = (req, type) => {
  if (req.method !== "GET") return false;
  const path = (req.originalUrl || req.path || "").split("?")[0];
  return (
    (type === "user" && path === "/api/auth/profile") ||
    (type === "admin" && path === "/api/admin/profile")
  );
};

/**
 * authenticate user with jwt token validation and request signature verification
 *
 * security layers:
 * 1. check for encrypted auth session cookie
 * 2. decrypt and verify jwt token
 * 3. validate device fingerprint
 * 4. validate ip ress and user-agent
 * 5. verify request signature (prevents postman/insomnia access)
 * 6. check user exists and is verified
 *
 * @param {object} req - express request object
 * @param {object} res - express response object
 * @param {function} next - next middleware function
 *
 * @throws {401} authentication failed
 * @throws {403} signature verification failed
 */
export const authenticateUser = async (req, res, next) => {
  try {
    const encryptedCookie = req.signedCookies.auth_session;

    // layer 1: check auth cookie exists
    if (!encryptedCookie) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
        code: "AUTH_REQUIRED",
      });
    }

    // layer 2: decrypt and verify jwt
    const cookieData = decryptCookieData(encryptedCookie);
    if (!cookieData || !cookieData.token) {
      return res.status(401).json({
        success: false,
        message: "Invalid session data.",
        code: "AUTH_INVALID",
      });
    }

    const decoded = jwt.verify(cookieData.token, process.env.JWT_SECRET);

    // layer 3: validate device fingerprint
    const currentDeviceId = generateDeviceFingerprint(req);
    if (decoded.deviceId !== currentDeviceId) {
      return res.status(401).json({
        success: false,
        message: "Device mismatch. Please login again.",
        code: "DEVICE_MISMATCH",
      });
    }

    // layer 4: validate ip and user-agent
    const currentIp = req.ip || req.connection.remoteAddress;
    const currentUserAgent = req.get("User-Agent");

    if (decoded.ip !== currentIp || decoded.userAgent !== currentUserAgent) {
      return res.status(401).json({
        success: false,
        message: "Session context changed. Please login again.",
        code: "CONTEXT_CHANGED",
      });
    }

    // layer 5: verify request signature (security check)
    // this prevents postman/insomnia/curl access even with valid cookies
    const signature = req.headers["x-request-signature"];
    const timestamp = req.headers["x-request-timestamp"];
    const nonce = req.headers["x-request-nonce"];

    if (!signature || !timestamp || !nonce) {
      console.warn("Missing signature headers:", {
        userId: decoded.userId,
        path: req.originalUrl,
        ip: currentIp,
        userAgent: currentUserAgent?.substring(0, 50),
      });

      return res.status(403).json({
        success: false,
        message: "Invalid request signature. Please refresh and try again.",
        code: "SIGNATURE_MISSING",
      });
    }

    // note: detailed signature verification happens in requestsigning middleware
    // this check ensures headers are present

    // layer 6: verify user exists and is verified
    const user = await User.findById(decoded.userId).select("-password -otp");

    if (!user || !user.isVerified) {
      return res.status(401).json({
        success: false,
        message: "User not found or not verified.",
        code: "USER_INVALID",
      });
    }

    req.user = { userId: user._id, ...user.toObject() };
    if (isBootstrapProfileRequest(req, "user")) {
      return next();
    }
    return verifyRequestSignature(req, res, next);
  } catch (error) {
    console.error("Error:", error.message);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
        code: "TOKEN_INVALID",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
        code: "TOKEN_EXPIRED",
      });
    }

    res.status(401).json({
      success: false,
      message: "Authentication failed.",
      code: "AUTH_ERROR",
    });
  }
};

/**
 * authenticate admin with jwt token validation and request signature verification
 *
 * security layers:
 * 1. check for admin token cookie
 * 2. verify jwt token with admin secret
 * 3. verify request signature (prevents postman/insomnia access)
 * 4. check admin exists in database
 *
 * @param {object} req - express request object
 * @param {object} res - express response object
 * @param {function} next - next middleware function
 *
 * @throws {401} authentication failed
 * @throws {403} signature verification failed
 */
export const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.cookies.adminToken;

    // layer 1: check admin token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Admin access denied. No token provided.",
        code: "AUTH_REQUIRED",
      });
    }

    // layer 2: verify jwt with admin secret
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);

    // layer 3: verify request signature
    const signature = req.headers["x-request-signature"];
    const timestamp = req.headers["x-request-timestamp"];
    const nonce = req.headers["x-request-nonce"];

    if (!signature || !timestamp || !nonce) {
      console.warn("Missing signature headers:", {
        adminId: decoded.adminId,
        path: req.originalUrl,
        ip: req.ip,
      });

      return res.status(403).json({
        success: false,
        message: "Invalid request signature.",
        code: "SIGNATURE_MISSING",
      });
    }

    // layer 4: verify admin exists
    const admin = await Admin.findById(decoded.adminId).select("-password");

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin token - admin not found",
        code: "ADMIN_NOT_FOUND",
      });
    }

    console.log("Admin authenticated:", admin.email);

    if (process.env.NODE_ENV === "development") {
      console.log("Request path details:", {
        originalUrl: req.originalUrl,
        path: req.path,
        baseUrl: req.baseUrl,
        url: req.url,
      });
    }

    req.admin = {
      userId: admin._id,
      adminId: admin._id,
      isAdmin: true,
      ...admin.toObject(),
    };

    if (isBootstrapProfileRequest(req, "admin")) {
      return next();
    }

    return verifyRequestSignature(req, res, next);
  } catch (error) {
    console.error("Error:", error.message);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid admin token.",
        code: "TOKEN_INVALID",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Admin token expired.",
        code: "TOKEN_EXPIRED",
      });
    }

    res.status(401).json({
      success: false,
      message: "Admin authentication failed.",
      code: "AUTH_ERROR",
    });
  }
};

export const authenticateAny = async (req, res, next) => {
  try {
    const adminToken = req.cookies.adminToken; // keep admin as-is
    const encryptedUserCookie = req.signedCookies.auth_session;

    // handle admin token (unchanged)
    if (adminToken) {
      try {
        const decoded = jwt.verify(adminToken, process.env.JWT_SECRET);
        const admin = await Admin.findById(decoded.userId).select("-password");
        if (!admin) {
          return res.status(401).json({
            success: false,
            message: "Invalid admin token",
          });
        }
        req.admin = { userId: admin._id, isAdmin: true, ...admin.toObject() };
        return next();
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: "Invalid admin token",
        });
      }
    }

    // handle user token (with decryption)
    if (!encryptedUserCookie) {
      return res.status(401).json({
        success: false,
        message: "Internal Error.",
      });
    }

    const cookieData = decryptCookieData(encryptedUserCookie);
    if (!cookieData || !cookieData.token) {
      return res.status(401).json({
        success: false,
        message: "Invalid session data.",
      });
    }

    const decoded = jwt.verify(cookieData.token, process.env.JWT_SECRET);

    // validate device and context
    const currentDeviceId = generateDeviceFingerprint(req);
    if (decoded.deviceId !== currentDeviceId) {
      return res.status(401).json({
        success: false,
        message: "Device mismatch. Please login again.",
      });
    }

    const currentIp = req.ip || req.connection.remoteAddress;
    const currentUserAgent = req.get("User-Agent");
    if (decoded.ip !== currentIp || decoded.userAgent !== currentUserAgent) {
      return res.status(401).json({
        success: false,
        message: "Please login again.",
      });
    }

    const user = await User.findById(decoded.userId).select("-password -otp");
    if (!user || !user.isVerified) {
      return res.status(401).json({
        success: false,
        message: "Authentication failed.",
      });
    }

    req.user = { userId: user._id, ...user.toObject() };
    next();
  } catch (error) {
    console.error("Internal Login error:", error);
    res.status(401).json({
      success: false,
      message: "Internal Error.",
    });
  }
};
