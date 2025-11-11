import jwt from "jsonwebtoken";
import User from "../Models/User.js";
import Admin from "../Models/Admin.js";
import CryptoJS from "crypto-js";
import redisClient from "../Config/redis.js";

// Cache decoded cookie data to avoid repeated decryption
const cookieCache = new Map();
const COOKIE_CACHE_SIZE = 1000;

const decryptCookieData = (encryptedData) => {
  // Check cache first
  if (cookieCache.has(encryptedData)) {
    return cookieCache.get(encryptedData);
  }

  try {
    const encryptionKey = process.env.COOKIE_ENCRYPTION_KEY;
    const bytes = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
    const decrypted = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    
    // Cache the result (with size limit)
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

// Cache user data in Redis to avoid DB queries
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

const setCachedUser = async (userId, userData) => {
  const cacheKey = `user:${userId}`;
  try {
    await redisClient.setex(cacheKey, 300, JSON.stringify(userData)); // 5 min cache
  } catch (error) {
    console.warn("Redis cache write failed:", error);
  }
};

export const authenticateUser = async (req, res, next) => {
  try {
    const encryptedCookie = req.signedCookies.auth_session;

    if (!encryptedCookie) {
      return res.status(401).json({
        success: false,
        message: "Credentials Error.",
      });
    }

    // Decrypt cookie (now cached)
    const cookieData = decryptCookieData(encryptedCookie);
    if (!cookieData || !cookieData.token) {
      return res.status(401).json({
        success: false,
        message: "Invalid session data.",
      });
    }

    const decoded = jwt.verify(cookieData.token, process.env.JWT_SECRET);

    // REMOVED: Strict device/IP validation for better UX (users on mobile switch networks frequently)
    // Only validate on sensitive operations (password change, etc.)
    
    // Try cache first
    let user = await getCachedUser(decoded.userId);
    
    if (!user) {
      // Cache miss - query database
      user = await User.findById(decoded.userId)
        .select("-password -otp")
        .lean(); // .lean() returns plain JS object (faster)

      if (!user || !user.isVerified) {
        return res.status(401).json({
          success: false,
          message: "Login Error",
        });
      }

      // Cache for next request
      await setCachedUser(decoded.userId, user);
    }

    req.user = { userId: user._id, ...user };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
      });
    }
    
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Try cache first
    let admin = await getCachedUser(`admin:${decoded.userId}`);
    
    if (!admin) {
      admin = await Admin.findById(decoded.userId).select("-password").lean();

      if (!admin) {
        return res.status(401).json({
          success: false,
          message: "Invalid admin token",
        });
      }

      await setCachedUser(`admin:${decoded.userId}`, admin);
    }

    req.admin = { userId: admin._id, isAdmin: true, ...admin };
    next();
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

    // Handle admin token
    if (adminToken) {
      try {
        const decoded = jwt.verify(adminToken, process.env.JWT_SECRET);
        
        let admin = await getCachedUser(`admin:${decoded.userId}`);
        if (!admin) {
          admin = await Admin.findById(decoded.userId).select("-password").lean();
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

    // Handle user token
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
      user = await User.findById(decoded.userId).select("-password -otp").lean();
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