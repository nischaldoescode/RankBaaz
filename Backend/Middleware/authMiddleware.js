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

// Change TTL from 300 seconds (5 min) to 600 seconds (10 min)
const setCachedUser = async (userId, userData) => {
  const cacheKey = `user:${userId}`;
  try {
    // Increased to 10 minutes for better performance
    await redisClient.setex(cacheKey, 600, JSON.stringify(userData));
  } catch (error) {
    console.warn("Redis cache write failed:", error);
  }
};

// Add pending auth requests tracking
const pendingAuthRequests = new Map();

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

    // Request deduplication: Check if auth is already pending for this user
    if (pendingAuthRequests.has(userId)) {
      const pendingRequest = await pendingAuthRequests.get(userId);
      req.user = pendingRequest;
      return next();
    }

    // Create pending promise
    const authPromise = (async () => {
      // Try cache first
      let user = await getCachedUser(userId);

      if (!user) {
        // Cache miss - query database
        user = await User.findById(userId).select("-password -otp").lean();

        if (!user || !user.isVerified) {
          pendingAuthRequests.delete(userId);
          return null;
        }

        // Cache for next request (increase TTL to 10 minutes)
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
    next();
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
          admin = await Admin.findById(decoded.userId)
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

// Alias exports for compatibility with different route files
export const protect = authenticateUser;
export const adminOnly = authenticateAdmin;
