/**
 * mounts security routes api endpoints and keeps middleware order explicit for each request path
 *
 * @file backend/routes/securityroutes.js
 * @module backend/routes/securityroutes
 * @exports express router mounted by the api server
 */

import express from "express";
import {
  verifyRequestSignature,
  getSigningSecretEndpoint,
} from "../Middleware/requestSignature.js";
import { authenticateUser, authenticateAdmin } from "../Middleware/auth.js";
import jwt from "jsonwebtoken";
import User from "../Models/User.js";
import Admin from "../Models/Admin.js";
import Teacher from "../Models/Teacher.js";
import CryptoJS from "crypto-js";

const router = express.Router();

/**
 * helper: decrypt cookie data (for user auth)
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

const isTeacherSurface = (req) => {
  const source = `${req.get("Origin") || ""} ${req.get("Referer") || ""}`.toLowerCase();
  return req.query.surface === "teacher" || source.includes("teachers.vidhgrow.online");
};

/**
 * reports whether a public surface has a valid user cookie without exposing tokens or signing secrets
 *
 * @param {object} req express request object with signed cookies
 * @param {object} res express response object used to send the session state
 * @returns {promise<void>} json response with a safe auth summary
 */
const sessionStatus = async (req, res) => {
  try {
    const encryptedUserCookie = req.signedCookies.auth_session;

    if (!encryptedUserCookie) {
      return res.status(200).json({
        success: true,
        data: { authenticated: false },
      });
    }

    const cookieData = decryptCookieData(encryptedUserCookie);

    if (!cookieData?.token) {
      return res.status(200).json({
        success: true,
        data: { authenticated: false },
      });
    }

    const decoded = jwt.verify(cookieData.token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("name username isVerified").lean();

    if (!user?.isVerified) {
      return res.status(200).json({
        success: true,
        data: { authenticated: false },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        authenticated: true,
        user: {
          name: user.name || "",
          username: user.username || "",
        },
      },
    });
  } catch {
    return res.status(200).json({
      success: true,
      data: { authenticated: false },
    });
  }
};

/**
 * cookie-only authentication middleware for /signing-secret endpoint
 *
 * validates only auth cookies, not request signatures
 * this breaks the chicken-and-egg problem where signing-secret
 * endpoint would require a signature to get a signature
 *
 * @middleware
 * @param {object} req - express request
 * @param {object} res - express response
 * @param {function} next - next middleware
 */
const authCookieOnly = async (req, res, next) => {
  try {
    if (isTeacherSurface(req) && req.cookies.teacherToken) {
      try {
        const decoded = jwt.verify(
          req.cookies.teacherToken,
          process.env.TEACHER_JWT_SECRET || process.env.JWT_SECRET,
        );
        const teacher = await Teacher.findById(decoded.teacherId).select(
          "-password -otp",
        );

        if (!teacher || !teacher.isActive) {
          return res.status(401).json({
            success: false,
            message: "Invalid teacher token",
            code: "AUTH_INVALID",
          });
        }

        req.teacher = {
          teacherId: teacher._id,
          ...teacher.toObject(),
        };
        req.user = {
          userId: teacher._id,
          role: "teacher",
        };

        return next();
      } catch (jwtError) {
        console.error("Teacher JWT verification failed:", jwtError.message);
        return res.status(401).json({
          success: false,
          message: "Invalid teacher token",
          code: "TOKEN_INVALID",
        });
      }
    }

    // check for admin token first
    const adminToken = req.cookies.adminToken;

    if (adminToken) {
      try {
        // verify admin jwt
        const decoded = jwt.verify(adminToken, process.env.ADMIN_JWT_SECRET);
        const admin = await Admin.findById(decoded.adminId).select("-password");

        if (!admin) {
          return res.status(401).json({
            success: false,
            message: "Invalid admin token",
            code: "AUTH_INVALID",
          });
        }

        // set both admin and user fields consistently
        req.admin = {
          userId: admin._id,
          adminId: admin._id,
          isAdmin: true,
          ...admin.toObject(),
        };

        // important: also set req.user for backward compatibility
        req.user = {
          userId: admin._id,
          isAdmin: true, // this flag
        };

        console.log("Admin authenticated via cookie:", {
          adminId: admin._id,
          email: admin.email,
        });

        return next();
      } catch (jwtError) {
        console.error(
          "Admin JWT verification failed:",
          jwtError.message
        );
        return res.status(401).json({
          success: false,
          message: "Invalid admin token",
          code: "TOKEN_INVALID",
        });
      }
    }

    // check for user token
    const encryptedUserCookie = req.signedCookies.auth_session;

    if (!encryptedUserCookie && req.cookies.teacherToken) {
      try {
        const decoded = jwt.verify(
          req.cookies.teacherToken,
          process.env.TEACHER_JWT_SECRET || process.env.JWT_SECRET,
        );
        const teacher = await Teacher.findById(decoded.teacherId).select(
          "-password -otp",
        );

        if (!teacher || !teacher.isActive) {
          return res.status(401).json({
            success: false,
            message: "Invalid teacher token",
            code: "AUTH_INVALID",
          });
        }

        req.teacher = {
          teacherId: teacher._id,
          ...teacher.toObject(),
        };
        req.user = {
          userId: teacher._id,
          role: "teacher",
        };

        return next();
      } catch (jwtError) {
        console.error("Teacher JWT verification failed:", jwtError.message);
        return res.status(401).json({
          success: false,
          message: "Invalid teacher token",
          code: "TOKEN_INVALID",
        });
      }
    }

    if (!encryptedUserCookie) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        code: "AUTH_REQUIRED",
      });
    }

    // decrypt and verify user jwt
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

    // set user in request
    req.user = { userId: user._id, ...user.toObject() };

    console.log("User authenticated via cookie only");
    next();
  } catch (error) {
    console.error("Auth error:", error.message);

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
 * get /signing-secret - retrieve request signing secret
 * auth: cookie-based authentication only (signature not required)
 *
 * security considerations:
 * - requires valid authentication cookie (admin or user)
 * - does not require request signature (breaks chicken-and-egg)
 * - returns user-specific secret with 7-day expiry
 * - nonce system prevents replay attacks
 * - bot protection applies via global middleware
 */
router.get("/signing-secret", authCookieOnly, getSigningSecretEndpoint);
router.get("/session-status", sessionStatus);



export default router;
