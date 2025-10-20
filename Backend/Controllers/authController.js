import bcrypt from "bcryptjs";
import CryptoJS from "crypto-js";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import User from "../Models/User.js";
import redisClient from "../Config/redis.js";
import PendingRegistration from "../Models/PendingRegistration.js";
import ContentSettings from "../Models/ContentSettings.js";

import {
  generateOtp,
  sendOtpEmail,
  validateOtpFormat,
  isOtpExpired,
} from "../utils/OtpUtils.js";

// Validation rules
export const registerValidation = [
  body("firstName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2-50 characters"),

  body("lastName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2-50 characters"),

  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email")
    .custom((value) => {
      const allowedDomains = [
        "gmail.com",
        "yahoo.com",
        "outlook.com",
        "hotmail.com",
        "icloud.com",
        "protonmail.com",
        "zoho.com",
        "aol.com",
      ];
      const domain = value.split("@")[1];
      if (!allowedDomains.includes(domain)) {
        throw new Error(
          "Please use a valid email provider (Gmail, Yahoo, Outlook, etc.)"
        );
      }
      return true;
    }),

  body("dateOfBirth")
    .notEmpty()
    .withMessage("Date of birth is required")
    .custom((value) => {
      const dob = new Date(value);

      if (isNaN(dob.getTime())) {
        throw new Error("Please provide a valid date of birth");
      }

      const today = new Date();

      if (dob > today) {
        throw new Error("Date of birth cannot be in the future");
      }

      const age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      const actualAge =
        monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())
          ? age - 1
          : age;

      if (actualAge < 15) {
        throw new Error("You must be at least 15 years old to register");
      }
      if (actualAge > 100) {
        throw new Error("Please enter a valid date of birth");
      }
      return true;
    }),

  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters")
    .matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage("Password must contain uppercase, lowercase, and number"),

  body("age")
    .isInt({ min: 15, max: 100 })
    .withMessage("Age must be between 15-100"),

  body("gender")
    .isIn(["Male", "Female", "Other"])
    .withMessage("Gender must be Male, Female, or Other"),

  body("subscribeNewsletter")
    .optional()
    .isBoolean()
    .withMessage("Subscribe newsletter must be a boolean"),
];

export const loginValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),

  body("password").notEmpty().withMessage("Password is required"),
];

export const forgotPasswordValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
];

export const resetPasswordValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),

  body("otp")
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage("OTP must be 6 digits"),

  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

export const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),

  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters"),
];

export const updateProfileValidation = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2-50 characters"),

  body("email")
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),

  body("age")
    .optional()
    .isInt({ min: 10, max: 100 })
    .withMessage("Age must be between 10-100"),

  body("gender")
    .optional()
    .isIn(["Male", "Female", "Other"])
    .withMessage("Gender must be Male, Female, or Other"),
];

const encryptCookieData = (data) => {
  const encryptionKey = process.env.COOKIE_ENCRYPTION_KEY; // Add to .env
  return CryptoJS.AES.encrypt(JSON.stringify(data), encryptionKey).toString();
};

// Decryption helper (commented for future use)

const decryptCookieData = (encryptedData) => {
  const encryptionKey = process.env.COOKIE_ENCRYPTION_KEY;
  const bytes = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
};

// Generate device fingerprint
const generateDeviceFingerprint = (req) => {
  const userAgent = req.get("User-Agent") || "";
  const acceptLanguage = req.get("Accept-Language") || "";
  const acceptEncoding = req.get("Accept-Encoding") || "";

  return CryptoJS.SHA256(
    userAgent + acceptLanguage + acceptEncoding
  ).toString();
};

// Generate location key (can be enhanced with actual geolocation later)
const generateLocationKey = (req) => {
  const ip = req.ip || req.connection.remoteAddress;
  // For now, hash the IP. Later can add actual location data
  return CryptoJS.SHA256(ip).toString().substring(0, 16);
};

// Generate JWT Token
const generateToken = (userId, req) => {
  const deviceId = generateDeviceFingerprint(req);
  const locationKey = generateLocationKey(req);

  const payload = {
    userId,
    deviceId,
    locationKey,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get("User-Agent"),
    timestamp: Date.now(),
  };

  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// Generate Refresh Token
const generateRefreshToken = (userId, req) => {
  const deviceId = generateDeviceFingerprint(req);
  const locationKey = generateLocationKey(req);

  const payload = {
    userId,
    deviceId,
    locationKey,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get("User-Agent"),
    timestamp: Date.now(),
    type: "refresh",
  };

  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// Register User
export const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed, please check the errors",
        errors: errors.array(),
      });
    }

    const {
      firstName,
      lastName,
      email,
      password,
      age,
      gender,
      dateOfBirth,
      subscribeNewsletter,
    } = req.body;

    // Check if email already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already registered with this email",
      });
    }

    // Combine first and last name
    const name = `${firstName.trim()} ${lastName.trim()}`;

    // Convert dateOfBirth to Date object
    const dob = new Date(dateOfBirth);

    // Hash password
    const hashedPassword = await bcrypt.hash(
      password,
      parseInt(process.env.BCRYPT_ROUNDS) || 12
    );

    // Generate OTP
    const otp = generateOtp();
    const otpExpiresAt = new Date(
      Date.now() + (parseInt(process.env.OTP_EXPIRY_MINUTES) || 5) * 60 * 1000
    );

    // Store registration data in BOTH Redis and Database
    const registrationData = {
      name,
      email,
      password: hashedPassword,
      age,
      gender,
      dateOfBirth: dob.toISOString(),
      subscribeNewsletter: subscribeNewsletter === true,
      otp: {
        code: otp,
        expiresAt: otpExpiresAt.toISOString(),
      },
    };

    // Store in Redis first (primary - fast)
    const redisKey = `registration:${email}`;
    try {
      await redisClient.setex(redisKey, 900, JSON.stringify(registrationData));
      console.log("[REGISTRATION] Stored in Redis:", email);
    } catch (redisError) {
      console.warn(
        "[REGISTRATION] Redis storage failed, using DB only:",
        redisError
      );
    }

    // Store in Mongo as backup (secondary - reliable)
    try {
      await PendingRegistration.deleteOne({ email });

      const pendingReg = new PendingRegistration({
        name,
        email,
        password: hashedPassword,
        age,
        gender,
        dateOfBirth: dob,
        subscribeNewsletter: subscribeNewsletter === true,
        otp: {
          code: otp,
          expiresAt: otpExpiresAt,
        },
      });

      await pendingReg.save();
      console.log("[REGISTRATION] Stored in MongoDB backup:", email);
    } catch (dbError) {
      console.error("[REGISTRATION] Database storage failed:", dbError);
      // If BOTH Redis and DB fail, then return error
      return res.status(500).json({
        success: false,
        message: "Failed to initiate registration. Please try again.",
      });
    }

    console.log("[REGISTRATION] Registration data stored in Redis for:", email);

    // Fetch content settings for email branding
    let contentSettings;
    try {
      contentSettings = await ContentSettings.getSettings();
    } catch (settingsError) {
      console.warn("[REGISTRATION] Failed to fetch settings, using defaults");
      contentSettings = { siteName: "Test App", logo: null };
    }

    const siteName = contentSettings?.siteName || "Test App";
    const logoUrl = contentSettings?.logo?.url || null;

    // Send OTP email
    try {
      await sendOtpEmail(email, otp, siteName, logoUrl);
      console.log("[REGISTRATION] OTP sent successfully to:", email);
    } catch (emailError) {
      console.error("[REGISTRATION] Failed to send OTP email:", emailError);
      await redisClient.del(redisKey);
      return res.status(500).json({
        success: false,
        message: "Failed to send verification email. Please try again.",
      });
    }

    res.status(201).json({
      success: true,
      message: "Please verify your email with the OTP sent.",
      data: {
        email,
        otpSent: true,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed. Please try again later.",
    });
  }
};

// Verify OTP
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp, username } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    if (!validateOtpFormat(otp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP format",
      });
    }

    // Try Redis first (fast path)
    const redisKey = `registration:${email}`;
    let registrationData = null;

    try {
      const cachedData = await redisClient.get(redisKey);
      if (cachedData) {
        registrationData = JSON.parse(cachedData);
        console.log("[VERIFY_OTP] Retrieved from Redis:", email);
      }
    } catch (redisError) {
      console.warn("[VERIFY_OTP] Redis retrieval failed:", redisError);
    }

    // Fallback to MongoDB if Redis failed or data not found
    if (!registrationData) {
      console.log("[VERIFY_OTP] Falling back to MongoDB:", email);

      try {
        const pendingReg = await PendingRegistration.findOne({ email });

        if (!pendingReg) {
          return res.status(400).json({
            success: false,
            message: "Registration session expired. Please register again.",
          });
        }

        registrationData = {
          name: pendingReg.name,
          email: pendingReg.email,
          password: pendingReg.password,
          age: pendingReg.age,
          gender: pendingReg.gender,
          dateOfBirth: pendingReg.dateOfBirth.toISOString(),
          subscribeNewsletter: pendingReg.subscribeNewsletter,
          otp: {
            code: pendingReg.otp.code,
            expiresAt: pendingReg.otp.expiresAt.toISOString(),
          },
          otpVerified: pendingReg.otpVerified || false,
        };

        console.log("[VERIFY_OTP] Retrieved from MongoDB fallback:", email);
      } catch (dbError) {
        console.error("[VERIFY_OTP] Database retrieval failed:", dbError);
        return res.status(500).json({
          success: false,
          message: "Failed to retrieve registration data.",
        });
      }
    }

    // Verify OTP
    if (registrationData.otp.code !== otp) {
      console.log("[VERIFY_OTP] Wrong OTP attempt for:", email);
      return res.status(400).json({
        success: false,
        message: "Incorrect OTP. Please check and try again.",
      });
    }

    if (isOtpExpired(new Date(registrationData.otp.expiresAt))) {
      await redisClient.del(redisKey);
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please register again.",
      });
    }

    console.log("[VERIFY_OTP] OTP verified successfully for:", email);

    if (!username) {
      // Update Redis
      registrationData.otpVerified = true;
      try {
        await redisClient.setex(
          redisKey,
          900,
          JSON.stringify(registrationData)
        );
        console.log("[VERIFY_OTP] Updated Redis with otpVerified flag");
      } catch (redisError) {
        console.warn("[VERIFY_OTP] Redis update failed:", redisError);
      }

      // Update MongoDB backup
      try {
        await PendingRegistration.updateOne(
          { email },
          { $set: { otpVerified: true } }
        );
        console.log("[VERIFY_OTP] Updated MongoDB with otpVerified flag");
      } catch (dbError) {
        console.warn("[VERIFY_OTP] MongoDB update failed:", dbError);
      }

      return res.status(200).json({
        success: true,
        message: "OTP verified successfully. Please choose a username.",
        data: {
          email,
          otpVerified: true,
        },
      });
    }

    // Validate username format
    if (username.length < 3 || username.length > 15) {
      return res.status(400).json({
        success: false,
        message: "Username must be between 3-15 characters",
      });
    }

    if (!/^[a-z0-9_]+$/.test(username)) {
      return res.status(400).json({
        success: false,
        message:
          "Username can only contain lowercase letters, numbers, and underscores",
      });
    }

    // Check if username is already taken
    const existingUsername = await User.findOne({
      username: username.toLowerCase(),
    });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: "Username already taken",
      });
    }

    // Check if OTP was previously verified
    if (!registrationData.otpVerified) {
      return res.status(400).json({
        success: false,
        message: "Please verify OTP first",
      });
    }

    // Create user in database NOW
    const userDoc = {
      name: registrationData.name,
      email: registrationData.email,
      username: username.toLowerCase(),
      password: registrationData.password,
      age: registrationData.age,
      gender: registrationData.gender,
      dateOfBirth: new Date(registrationData.dateOfBirth),
      isVerified: true,
      subscribeNewsletter: registrationData.subscribeNewsletter,
      points: 0,
      badges: [],
      stats: {
        testsCompleted: 0,
        questionsAnswered: 0,
        averagePercentile: 0,
        fastestTime: null,
        leaderboardDaysOnTop: 0,
      },
    };

    const user = new User(userDoc);
    await user.save();

    // Delete from Redis
    try {
      await redisClient.del(redisKey);
      console.log("[REGISTRATION] Deleted Redis data");
    } catch (redisError) {
      console.warn("[REGISTRATION] Redis deletion failed:", redisError);
    }

    // Delete from MongoDB
    try {
      await PendingRegistration.deleteOne({ email });
      console.log("[REGISTRATION] Deleted MongoDB data");
    } catch (dbError) {
      console.warn("[REGISTRATION] MongoDB deletion failed:", dbError);
    }

    // Cache username as taken
    const cacheKey = `username:check:${username.toLowerCase()}`;
    try {
      await redisClient.setex(cacheKey, 300, "taken");
    } catch (e) {
      console.error("Failed to cache username:", e);
    }

    console.log("[REGISTRATION] User created successfully:", {
      email: user.email,
      name: user.name,
      userId: user._id,
      timestamp: new Date().toISOString(),
    });

    // Generate tokens
    const token = generateToken(user._id, req);
    const refreshToken = generateRefreshToken(user._id, req);

    // Set auth cookies
    const authCookieData = encryptCookieData({
      token: token,
      deviceId: generateDeviceFingerprint(req),
      locationKey: generateLocationKey(req),
      issuedAt: Date.now(),
    });

    res.cookie("auth_session", authCookieData, {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production" ||
        process.env.NODE_ENV === "development",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      signed: true,
    });

    const refreshCookieData = encryptCookieData({
      token: refreshToken,
      deviceId: generateDeviceFingerprint(req),
      locationKey: generateLocationKey(req),
      issuedAt: Date.now(),
    });

    res.cookie("refresh_session", refreshCookieData, {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production" ||
        process.env.NODE_ENV === "development",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      signed: true,
    });

    res.status(200).json({
      success: true,
      message: "Registration completed successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          username: user.username,
          age: user.age,
          gender: user.gender,
          isVerified: user.isVerified,
        },
      },
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({
      success: false,
      message: "OTP verification failed",
    });
  }
};

export const initiateLogin = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Dev bypass check
    if (email === "nischala389@gmail.com") {
      return res.status(200).json({
        success: true,
        message: "Dev account - proceed to password",
        data: {
          email,
          requiresOtp: false,
          isDevAccount: true,
          isRegistered: true,
          isVerified: true,
        },
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email. Please register first.",
        data: {
          isRegistered: false,
        },
      });
    }

    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message:
          "Your email is not verified. Please check your inbox for the verification OTP or request a new one.",
        data: {
          isRegistered: true,
          isVerified: false,
          email: user.email,
        },
      });
    }

    // Generate and send OTP
    const otp = generateOtp();
    const otpExpiresAt = new Date(
      Date.now() + (parseInt(process.env.OTP_EXPIRY_MINUTES) || 5) * 60 * 1000
    );

    user.otp = {
      code: otp,
      expiresAt: otpExpiresAt,
      used: false,
    };
    await user.save();

    console.log("[INITIATE_LOGIN] Login has been initiated for:", email);

    // Fetch content settings
    let contentSettings;
    try {
      contentSettings = await ContentSettings.getSettings();
    } catch (settingsError) {
      contentSettings = { siteName: "Test App", logo: null };
    }

    const siteName = contentSettings?.siteName || "Test App";
    const logoUrl = contentSettings?.logo?.url || null;

    await sendOtpEmail(email, otp, siteName, logoUrl);

    res.status(200).json({
      success: true,
      message: "OTP sent to your email",
      data: {
        email,
        otpSent: true,
        requiresOtp: true,
        isRegistered: true,
        isVerified: true,
      },
    });
  } catch (error) {
    console.error("Initiate login error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to initiate login",
    });
  }
};

export const verifyLoginOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    if (!validateOtpFormat(otp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP format. Please Enter a 6-digit code.",
      });
    }

    const user = await User.findOne({ email });
    console.log("[INITIATE_LOGIN] Login initiated for:", email);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.otp || !user.otp.code) {
      return res.status(400).json({
        success: false,
        message: "No OTP found. Please request a new one.",
      });
    }

    if (isOtpExpired(user.otp.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    if (user.otp.used === true) {
      return res.status(400).json({
        success: false,
        message: "OTP has already been used. Please request a new one.",
      });
    }

    if (user.otp.code !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    user.otp.used = true;

    // Clear OTP immediately after verification
    user.otp = {
      code: null,
      expiresAt: null,
    };
    await user.save();

    res.status(200).json({
      success: true,
      message: "OTP verified. Please enter your password.",
      data: {
        email,
        otpVerified: true,
      },
    });
  } catch (error) {
    console.error("Verify login OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify OTP",
    });
  }
};

// Login User - UPDATED TO HANDLE ADMIN
export const login = async (req, res) => {
  try {
    const { email, password, isDevAccount } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Dev bypass - auto-create if needed
    if (email === "nischala389@gmail.com" && password === "DevPass@123") {
      if (!user.isVerified) {
        user.isVerified = true;
      }

      // Ensure dev account has a username
      if (!user.username) {
        user.username = "itzzdev"; // or any username you want
      }

      await user.save();
    } else {
      // Normal flow - check verification
      if (!user.isVerified) {
        return res.status(401).json({
          success: false,
          message: "Please verify your email first",
        });
      }
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }
    console.log("[LOGIN] User logged in successfully:", {
      email: user.email,
      userId: user._id,
      timestamp: new Date().toISOString(),
    });

    if (user.otp && user.otp.code) {
      user.otp = {
        code: null,
        expiresAt: null,
      };
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();
    // Generate tokens
    const token = generateToken(user._id, req);
    const refreshToken = generateRefreshToken(user._id, req);

    const authCookieData = encryptCookieData({
      token: token,
      deviceId: generateDeviceFingerprint(req),
      locationKey: generateLocationKey(req),
      issuedAt: Date.now(),
    });

    res.cookie("auth_session", authCookieData, {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production" ||
        process.env.NODE_ENV === "development",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      signed: true,
    });

    const refreshCookieData = encryptCookieData({
      token: refreshToken,
      deviceId: generateDeviceFingerprint(req),
      locationKey: generateLocationKey(req),
      issuedAt: Date.now(),
    });

    res.cookie("refresh_session", refreshCookieData, {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production" ||
        process.env.NODE_ENV === "development",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      signed: true,
    });

    // Build user response
    const userResponse = {
      id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      age: user.age,
      gender: user.gender,
      isVerified: user.isVerified,
      totalTestsTaken: user.totalTestsTaken,
      totalScore: user.totalScore,
    };

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: { user: userResponse },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};

// Logout User - UPDATED TO HANDLE ADMIN
export const logout = async (req, res) => {
  try {
    res.clearCookie("auth_session");
    res.clearCookie("refresh_session");

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const encryptedRefreshCookie = req.signedCookies.refresh_session;

    if (!encryptedRefreshCookie) {
      return res.status(401).json({
        success: false,
        message: "Refresh token not found",
      });
    }

    // Decrypt cookie
    const cookieData = decryptCookieData(encryptedRefreshCookie);
    if (!cookieData || !cookieData.token) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh session",
      });
    }

    const decoded = jwt.verify(cookieData.token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isVerified) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    // Generate new tokens
    const newToken = generateToken(user._id, req);
    const newRefreshToken = generateRefreshToken(user._id, req);

    // Encrypt and set new cookies
    const newCookieData = encryptCookieData({
      token: newToken,
      deviceId: generateDeviceFingerprint(req),
      locationKey: generateLocationKey(req),
      issuedAt: Date.now(),
    });

    res.cookie("auth_session", newCookieData, {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production" ||
        process.env.NODE_ENV === "development",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      signed: true,
    });

    const newRefreshCookieData = encryptCookieData({
      token: newRefreshToken,
      deviceId: generateDeviceFingerprint(req),
      locationKey: generateLocationKey(req),
      issuedAt: Date.now(),
    });

    res.cookie("refresh_session", newRefreshCookieData, {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production" ||
        process.env.NODE_ENV === "development",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      signed: true,
    });

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid refresh token",
    });
  }
};

// Get User Profile - UPDATED TO HANDLE ADMIN
export const getProfile = async (req, res) => {
  try {
    let userId;

    // Check if it's admin or regular user
    if (req.admin) {
      userId = req.admin.userId;
    } else if (req.user) {
      userId = req.user.userId;
    } else {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const user = await User.findById(userId).select("-password -otp");

    res.status(200).json({
      success: true,
      message: "Profile retrieved successfully",
      data: { user },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve profile",
    });
  }
};

// Update existing updateProfile function
export const updateProfile = async (req, res) => {
  try {
    const { name, dateOfBirth, gender, password, nameVisibility } = req.body;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Password is required for sensitive updates (name, dob, gender)
    // But NOT required for nameVisibility toggle
    const isSensitiveUpdate = name || dateOfBirth || gender;

    if (isSensitiveUpdate && !password) {
      return res.status(400).json({
        success: false,
        message: "Password is required to update profile information",
      });
    }

    // Verify password only if provided
    if (password) {
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: "Invalid password",
        });
      }
    }

    // Update fields
    if (name) user.name = name.trim();
    if (dateOfBirth) {
      user.dateOfBirth = new Date(dateOfBirth);

      // Recalculate age
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }
      user.age = age;
    }
    if (gender) user.gender = gender;

    // Update nameVisibility without requiring password
    if (nameVisibility && ["private", "public"].includes(nameVisibility)) {
      user.nameVisibility = nameVisibility;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          dateOfBirth: user.dateOfBirth,
          gender: user.gender,
          age: user.age,
          username: user.username,
          nameVisibility: user.nameVisibility,
        },
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating profile",
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { identifier } = req.body; // Changed from 'email' to 'identifier'

    if (!identifier || !identifier.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email or username is required",
      });
    }

    // Check if identifier is email or username
    const isEmail = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(
      identifier
    );

    // Find user by email or username
    const user = isEmail
      ? await User.findOne({ email: identifier.toLowerCase().trim() })
      : await User.findOne({ username: identifier.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email or username",
      });
    }

    if (!user.isVerified) {
      return res.status(400).json({
        success: false,
        message:
          "Your account is not verified. Please verify your email first.",
      });
    }

    // Generate OTP (use plain text, not hashed - for consistency with other OTPs)
    const otp = generateOtp();
    const otpExpiresAt = new Date(
      Date.now() + (parseInt(process.env.OTP_EXPIRY_MINUTES) || 10) * 60 * 1000
    );

    // Store OTP in user document (plain text for easier verification)
    user.otp = {
      code: otp,
      expiresAt: otpExpiresAt,
      used: false,
    };
    await user.save();

    console.log("[FORGOT_PASSWORD] Password reset initiated for:", user.email);

    // Fetch content settings
    let contentSettings;
    try {
      contentSettings = await ContentSettings.getSettings();
    } catch (settingsError) {
      contentSettings = { siteName: "Test App", logo: null };
    }

    const siteName = contentSettings?.siteName || "Test App";
    const logoUrl = contentSettings?.logo?.url || null;

    // Send OTP email
    await sendOtpEmail(user.email, otp, siteName, logoUrl);

    res.status(200).json({
      success: true,
      message: "OTP sent to your email for password reset",
      data: {
        email: user.email,
        // Mask email for privacy: exa***@gm***.com
        maskedEmail:
          user.email.substring(0, 3) +
          "***@" +
          user.email.split("@")[1].substring(0, 2) +
          "***." +
          user.email.split(".").pop(),
        otpSent: true,
      },
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Error initiating password reset. Please try again.",
    });
  }
};

export const verifyForgotPasswordOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    if (!validateOtpFormat(otp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP format. Please enter a 6-digit code.",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.otp || !user.otp.code) {
      return res.status(400).json({
        success: false,
        message: "No OTP found. Please request a new one.",
      });
    }

    if (isOtpExpired(user.otp.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    if (user.otp.used === true) {
      return res.status(400).json({
        success: false,
        message: "OTP has already been used. Please request a new one.",
      });
    }

    // Compare OTP directly (plain text comparison like in login OTP)
    if (user.otp.code !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please check and try again.",
      });
    }

    console.log("[FORGOT_PASSWORD] OTP verified for:", user.email);

    // Mark OTP as used but don't clear it yet (will clear after password reset)
    user.otp.used = true;
    await user.save();

    // Generate a temporary token for password reset (short-lived)
    const resetToken = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        purpose: "password-reset",
        timestamp: Date.now(),
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" } // 15 minutes to reset password
    );

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      data: {
        resetToken,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Verify forgot password OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Error. Please try again.",
    });
  }
};

export const quickCheckUsername = async (req, res) => {
  try {
    // const { username } = req.query; --> will be as query param
    const { username } = req.params;

    if (!username || username.length < 3) {
      return res.json({ available: false, reason: "too_short" });
    }

    if (!/^[a-z0-9_]+$/.test(username)) {
      return res.json({ available: false, reason: "invalid_format" });
    }

    // Check Redis first
    const cacheKey = `username:check:${username.toLowerCase()}`;
    const cached = await redisClient.get(cacheKey);

    if (cached !== null) {
      return res.json({
        available: cached === "available",
        cached: true,
      });
    }

    // Check database
    const exists = await User.exists({ username: username.toLowerCase() });
    const available = !exists;

    // Cache result
    await redisClient.setex(cacheKey, 300, available ? "available" : "taken");

    return res.json({ available, cached: false });
  } catch (error) {
    console.error("Quick username check error:", error);
    return res.status(500).json({ error: "Check failed" });
  }
};

// Update the existing resetPassword function
export const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Reset token and new password are required",
      });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      });
    }

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token. Please request a new one.",
      });
    }

    if (decoded.purpose !== "password-reset") {
      return res.status(400).json({
        success: false,
        message: "Invalid reset token",
      });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user is trying to use the same password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message:
          "New password cannot be the same as your current password. Please choose a different password.",
      });
    }

    console.log("[FORGOT_PASSWORD] Password reset for:", user.email);

    // Hash new password with proper salt rounds
    const hashedPassword = await bcrypt.hash(
      newPassword,
      parseInt(process.env.BCRYPT_ROUNDS) || 12
    );
    user.password = hashedPassword;

    // Clear OTP data
    user.otp = {
      code: null,
      expiresAt: null,
      used: false,
    };

    await user.save();

    res.status(200).json({
      success: true,
      message:
        "Password reset successfully. You can now login with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired reset token. Please start the password reset process again.",
      });
    }
    res.status(500).json({
      success: false,
      message: "Error resetting password. Please try again.",
    });
  }
};

// Add these new functions for email change
export const initiateEmailChange = async (req, res) => {
  try {
    const { newEmail, password } = req.body;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // Check if new email already exists
    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    // Generate OTP
    const otp = generateOtp();
    const hashedOTP = await bcrypt.hash(otp, 10);

    // Store OTP and pending email in user document
    user.pendingEmail = newEmail;
    user.emailChangeOTP = {
      code: hashedOTP,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      used: false,
    };
    await user.save();

    // Send OTP to new email
    await sendOtpEmail(newEmail, otp, "Email Change Verification");

    res.status(200).json({
      message: "OTP sent to new email address",
      newEmail,
    });
  } catch (error) {
    console.error("Initiate email change error:", error);
    res.status(500).json({ message: "Error initiating email change" });
  }
};

export const verifyEmailChangeOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.emailChangeOTP || !user.emailChangeOTP.code) {
      return res.status(400).json({ message: "No email change OTP found" });
    }

    if (user.emailChangeOTP.expiresAt < Date.now()) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    if (user.emailChangeOTP.used) {
      return res.status(400).json({ message: "OTP already used" });
    }

    const isValidOTP = await bcrypt.compare(otp, user.emailChangeOTP.code);
    if (!isValidOTP) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Update email
    user.email = user.pendingEmail;
    user.pendingEmail = undefined;
    user.emailChangeOTP = undefined;
    await user.save();

    res.status(200).json({
      message: "Email updated successfully",
      email: user.email,
    });
  } catch (error) {
    console.error("Verify email change OTP error:", error);
    res.status(500).json({ message: "Error verifying email change OTP" });
  }
};

// Change Password
export const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { currentPassword, newPassword } = req.body;

    let userId;
    if (req.admin) {
      userId = req.admin.userId;
    } else if (req.user) {
      userId = req.user.userId; // Fixed: use userId instead of id
    } else {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(
      newPassword,
      parseInt(process.env.BCRYPT_ROUNDS) || 12
    );

    // Update password
    user.password = hashedNewPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to change password",
    });
  }
};

// Resend OTP
export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Try Redis first
    const redisKey = `registration:${email}`;
    let registrationData = null;

    try {
      const cachedData = await redisClient.get(redisKey);
      if (cachedData) {
        registrationData = JSON.parse(cachedData);
      }
    } catch (redisError) {
      console.warn("[RESEND_OTP] Redis retrieval failed:", redisError);
    }

    // Fallback to MongoDB
    if (!registrationData) {
      try {
        const pendingReg = await PendingRegistration.findOne({ email });
        if (!pendingReg) {
          return res.status(400).json({
            success: false,
            message: "No pending registration found. Please register again.",
          });
        }

        registrationData = {
          name: pendingReg.name,
          email: pendingReg.email,
          password: pendingReg.password,
          age: pendingReg.age,
          gender: pendingReg.gender,
          dateOfBirth: pendingReg.dateOfBirth.toISOString(),
          subscribeNewsletter: pendingReg.subscribeNewsletter,
        };
      } catch (dbError) {
        console.error("[RESEND_OTP] Database retrieval failed:", dbError);
        return res.status(500).json({
          success: false,
          message: "Failed to resend OTP.",
        });
      }
    }

    // Generate new OTP
    const otp = generateOtp();
    const otpExpiresAt = new Date(
      Date.now() + (parseInt(process.env.OTP_EXPIRY_MINUTES) || 5) * 60 * 1000
    );

    // Update OTP in data
    registrationData.otp = {
      code: otp,
      expiresAt: otpExpiresAt.toISOString(),
    };
    registrationData.otpVerified = false;

    // Update Redis
    try {
      await redisClient.setex(redisKey, 900, JSON.stringify(registrationData));
    } catch (redisError) {
      console.warn("[RESEND_OTP] Redis update failed:", redisError);
    }

    // Update MongoDB
    try {
      await PendingRegistration.updateOne(
        { email },
        {
          $set: {
            "otp.code": otp,
            "otp.expiresAt": otpExpiresAt,
            otpVerified: false,
          },
        }
      );
    } catch (dbError) {
      console.warn("[RESEND_OTP] MongoDB update failed:", dbError);
    }

    // Fetch content settings
    let contentSettings;
    try {
      contentSettings = await ContentSettings.getSettings();
    } catch (settingsError) {
      contentSettings = { siteName: "Test App", logo: null };
    }

    const siteName = contentSettings?.siteName || "Test App";
    const logoUrl = contentSettings?.logo?.url || null;

    // Send OTP email
    await sendOtpEmail(email, otp, siteName, logoUrl);

    res.status(200).json({
      success: true,
      message: "OTP resent successfully",
      data: {
        email,
        otpSent: true,
      },
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resend OTP",
    });
  }
};
