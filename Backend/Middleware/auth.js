import jwt from "jsonwebtoken";
import User from "../Models/User.js";
import Admin from "../Models/Admin.js";
import CryptoJS from "crypto-js";

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

export const authenticateUser = async (req, res, next) => {
  try {
    const encryptedCookie = req.signedCookies.auth_session;

    if (!encryptedCookie) {
      return res.status(401).json({
        success: false,
        message: "Credentials Error.",
      });
    }

    // Decrypt cookie
    const cookieData = decryptCookieData(encryptedCookie);
    if (!cookieData || !cookieData.token) {
      return res.status(401).json({
        success: false,
        message: "Invalid session data.",
      });
    }

    const decoded = jwt.verify(cookieData.token, process.env.JWT_SECRET);

    // Enhanced security: Validate device fingerprint
    const currentDeviceId = generateDeviceFingerprint(req);
    if (decoded.deviceId !== currentDeviceId) {
      return res.status(401).json({
        success: false,
        message: "Device mismatch. Please login again.",
      });
    }

    // Validate IP and User-Agent
    const currentIp = req.ip || req.connection.remoteAddress;
    const currentUserAgent = req.get("User-Agent");

    if (decoded.ip !== currentIp || decoded.userAgent !== currentUserAgent) {
      return res.status(401).json({
        success: false,
        message: "Session context changed. Please login again.",
      });
    }

    const user = await User.findById(decoded.userId).select("-password -otp");

    if (!user || !user.isVerified) {
      return res.status(401).json({
        success: false,
        message: "Login Error",
      });
    }

    req.user = { userId: user._id, ...user.toObject() };
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
    
    console.log("[ADMIN_AUTH] Cookie check:", {
      hasAdminToken: !!token,
      allCookies: Object.keys(req.cookies),
      adminTokenPreview: token ? token.substring(0, 20) + "..." : null,
    });
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Admin access denied. No token provided.",
      });
    }

    // IMPORTANT: Use ADMIN_JWT_SECRET, not regular JWT_SECRET
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    
    console.log("[ADMIN_AUTH] Token decoded:", {
      adminId: decoded.adminId,
      role: decoded.role,
    });
    
    // Use adminId from token (not userId)
    const admin = await Admin.findById(decoded.adminId).select("-password");

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin token - admin not found",
      });
    }

    console.log("[ADMIN_AUTH] Admin authenticated:", admin.email);

    // Set req.admin with correct structure
    req.admin = { 
      userId: admin._id, // Keep as userId for compatibility with existing code
      adminId: admin._id,
      isAdmin: true, 
      ...admin.toObject() 
    };
    
    next();
  } catch (error) {
    console.error("[ADMIN_AUTH] Error:", error.message);
    
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid admin token - verification failed",
      });
    }
    
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Admin token expired",
      });
    }
    
    res.status(401).json({
      success: false,
      message: "Admin authentication failed",
    });
  }
};

export const authenticateAny = async (req, res, next) => {
  try {
    const adminToken = req.cookies.adminToken; // Keep admin as-is
    const encryptedUserCookie = req.signedCookies.auth_session;

    // Handle admin token (unchanged)
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

    // Handle user token (with decryption)
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

    // Validate device and context
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
