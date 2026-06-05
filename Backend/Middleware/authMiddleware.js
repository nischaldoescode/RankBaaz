/**
 * handles auth middleware checks before controllers receive the request
 *
 * @file backend/middleware/authmiddleware.js
 * @module backend/middleware/authmiddleware
 * @exports middleware functions used by protected backend routes
 */

import jwt from "jsonwebtoken";
import User from "../Models/User.js";
import Admin from "../Models/Admin.js";
import CryptoJS from "crypto-js";
import redisClient from "../Config/redis.js";
import { verifyRequestSignature } from "./requestSignature.js";

// cache decoded cookie data to avoid repeated decryption
const cookieCache = new Map();
const COOKIE_CACHE_SIZE = 1000;

const decryptCookieData = (encryptedData) => {
  // check cache first
  if (cookieCache.has(encryptedData)) {
    return cookieCache.get(encryptedData);
  }

  try {
    const encryptionKey = process.env.COOKIE_ENCRYPTION_KEY;
    const bytes = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
    const decrypted = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

    // cache the result (with size limit)
    if (cookieCache.size >= COOKIE_CACHE_SIZE) {
      const firstKey = cookieCache.keys().next().value;
      cookieCache.delete(firstKey);
    }
    cookieCache.set(encryptedData, decrypted);

    return decrypted;
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

// cache user data in redis to avoid db queries
const getCachedUser = async (userId) => {
  const cacheKey = `user:${userId}`;
  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    return null;
  } catch (error) {
    console.warn("Redis cache read failed:", error);
    return null;
  }
};

// ttl from 300 seconds (5 min) to 600 seconds (10 min)
const setCachedUser = async (userId, userData) => {
  const cacheKey = `user:${userId}`;
  try {
    // increased to 10 minutes for better performance
    await redisClient.setex(cacheKey, 600, JSON.stringify(userData));
  } catch (error) {
    console.warn("Redis cache write failed:", error);
  }
};

// pending auth requests tracking
const pendingAuthRequests = new Map();

/**
 * authenticate user with jwt token validation
 *
 * security layers:
 * 1. check encrypted auth session cookie
 * 2. decrypt and verify jwt token
 * 3. check user exists and is verified
 *
 * @middleware
 * @param {object} req - express request
 * @param {object} res - express response
 * @param {function} next - next middleware
 */
export const authenticateUser = async (req, res, next) => {
  try {
    const encryptedCookie = req.signedCookies.auth_session;

    // debug logging that exposes cookie information
    // only log in development console, never send to client

    if (!encryptedCookie) {
      // development-only console logging
      if (process.env.NODE_ENV === "development") {
        console.error("No auth_session cookie found");
        console.error("Path:", req.path);
        console.error("Cookies:", Object.keys(req.cookies));
      }

      // never send cookie information to client
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in.",
        code: "AUTH_REQUIRED",
      });
    }

    // decrypt cookie (now cached)
    const cookieData = decryptCookieData(encryptedCookie);
    if (!cookieData || !cookieData.token) {
      return res.status(401).json({
        success: false,
        message: "Invalid session data.",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(cookieData.token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Session expired. Please login again.",
        });
      }
      throw jwtError;
    }

    const userId = decoded.userId;

    // request deduplication: check if auth is already pending for this user
    if (pendingAuthRequests.has(userId)) {
      const pendingRequest = await pendingAuthRequests.get(userId);
      req.user = pendingRequest;
      return next();
    }

    // create pending promise
    const authPromise = (async () => {
      // try cache first
      let user = await getCachedUser(userId);

      if (!user) {
        // cache miss - query database
        user = await User.findById(userId).select("-password -otp").lean();

        if (!user || !user.isVerified) {
          pendingAuthRequests.delete(userId);
          return null;
        }

        // cache for next request (increase ttl to 10 minutes)
        await setCachedUser(userId, user);
      }

      pendingAuthRequests.delete(userId);
      return { userId: user._id, ...user };
    })();

    pendingAuthRequests.set(userId, authPromise);

    const user = await authPromise;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Login Error",
      });
    }

    req.user = user;
    return verifyRequestSignature(req, res, next);
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

export const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.cookies.adminToken;
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Admin access denied. No token provided.",
      });
    }

    // ed: use admin_jwt_secret instead of jwt_secret
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);

    // try cache first
    let admin = await getCachedUser(`admin:${decoded.adminId}`); // use adminid

    if (!admin) {
      // use adminid from decoded token
      admin = await Admin.findById(decoded.adminId).select("-password").lean();

      if (!admin) {
        return res.status(401).json({
          success: false,
          message: "Invalid admin token",
        });
      }

      // cache with adminid
      await setCachedUser(`admin:${decoded.adminId}`, admin);
    }

    req.admin = { userId: admin._id, isAdmin: true, ...admin };
    return verifyRequestSignature(req, res, next);
  } catch (error) {
    console.error("Admin auth middleware error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid admin token",
    });
  }
};

export const authenticateAny = async (req, res, next) => {
  try {
    const adminToken = req.cookies.adminToken;
    const encryptedUserCookie = req.signedCookies.auth_session;

    // handle admin token
    if (adminToken) {
      try {
        // use admin_jwt_secret
        const decoded = jwt.verify(adminToken, process.env.ADMIN_JWT_SECRET);

        // use adminid
        let admin = await getCachedUser(`admin:${decoded.adminId}`);
        if (!admin) {
          // use adminid
          admin = await Admin.findById(decoded.adminId)
            .select("-password")
            .lean();
          if (!admin) {
            return res.status(401).json({
              success: false,
              message: "Invalid admin token",
            });
          }
          await setCachedUser(`admin:${decoded.userId}`, admin);
        }

        req.admin = { userId: admin._id, isAdmin: true, ...admin };
        return next();
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: "Invalid admin token",
        });
      }
    }

    // handle user token
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

    let user = await getCachedUser(decoded.userId);

    if (!user) {
      user = await User.findById(decoded.userId)
        .select("-password -otp")
        .lean();
      if (!user || !user.isVerified) {
        return res.status(401).json({
          success: false,
          message: "Authentication failed.",
        });
      }
      await setCachedUser(decoded.userId, user);
    }

    req.user = { userId: user._id, ...user };
    next();
  } catch (error) {
    console.error("Internal Login error:", error);
    res.status(401).json({
      success: false,
      message: "Internal Error.",
    });
  }
};

// alias exports for compatibility with different route files
export const protect = authenticateUser;
export const adminOnly = authenticateAdmin;
