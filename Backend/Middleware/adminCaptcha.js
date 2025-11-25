import crypto from "crypto";
import redisClient from "../Config/redis.js";

/**
 * Admin Login Captcha Protection
 * Mathematical challenge for admin authentication
 */

const ADMIN_CAPTCHA_DIFFICULTY = 5; // Harder than regular users
const ADMIN_CAPTCHA_TTL = 120; // 2 minutes
const MAX_LOGIN_ATTEMPTS = 3; // Require captcha after 3 failed logins

/**
 * Generate admin captcha challenge
 */
export const generateAdminCaptcha = async (identifier) => {
  const seed = crypto.randomBytes(20).toString("hex");
  const timestamp = Date.now();

  const captchaKey = `admin:captcha:${identifier}`;
  const captchaData = {
    seed,
    timestamp,
    difficulty: ADMIN_CAPTCHA_DIFFICULTY,
  };

  await redisClient.setex(
    captchaKey,
    ADMIN_CAPTCHA_TTL,
    JSON.stringify(captchaData)
  );

  return {
    seed,
    difficulty: ADMIN_CAPTCHA_DIFFICULTY,
    timestamp,
  };
};

/**
 * Verify admin captcha solution
 */
export const verifyAdminCaptcha = async (identifier, seed, nonce) => {
  const captchaKey = `admin:captcha:${identifier}`;
  const stored = await redisClient.get(captchaKey);

  if (!stored) {
    return { valid: false, reason: "Captcha expired or not found" };
  }

  const captchaData = JSON.parse(stored);

  // Verify seed matches
  if (captchaData.seed !== seed) {
    return { valid: false, reason: "Invalid captcha seed" };
  }

  // Verify timestamp
  if (Date.now() - captchaData.timestamp > ADMIN_CAPTCHA_TTL * 1000) {
    return { valid: false, reason: "Captcha expired" };
  }

  // Verify proof-of-work
  const hash = crypto
    .createHash("sha256")
    .update(seed + nonce)
    .digest("hex");

  const requiredPrefix = "0".repeat(ADMIN_CAPTCHA_DIFFICULTY);

  if (!hash.startsWith(requiredPrefix)) {
    return { valid: false, reason: "Invalid captcha solution" };
  }

  // Clean up
  await redisClient.del(captchaKey);

  return { valid: true };
};

/**
 * Track admin login attempts
 */
export const trackAdminLoginAttempt = async (identifier, success = false) => {
  const attemptKey = `admin:attempts:${identifier}`;

  if (success) {
    // Clear attempts on successful login
    await redisClient.del(attemptKey);
    return { requiresCaptcha: false, attempts: 0 };
  }

  // Increment failed attempts
  const attempts = await redisClient.incr(attemptKey);

  // Set expiry on first attempt (10 minutes)
  if (attempts === 1) {
    await redisClient.expire(attemptKey, 600);
  }

  const requiresCaptcha = attempts >= MAX_LOGIN_ATTEMPTS;

  return { requiresCaptcha, attempts };
};

/**
 * Check if captcha is required for admin login
 */
export const isCaptchaRequired = async (identifier) => {
  const attemptKey = `admin:attempts:${identifier}`;
  const attempts = await redisClient.get(attemptKey);
  return attempts >= MAX_LOGIN_ATTEMPTS;
};

/**
 * Middleware: Require captcha for admin operations
 */
export const requireAdminCaptcha = async (req, res, next) => {
  try {
    const identifier = req.body.email || req.ip;

    // Check if captcha is required
    const required = await isCaptchaRequired(identifier);

    if (!required) {
      return next();
    }

    // Captcha is required - check if provided
    const { captchaSeed, captchaNonce } = req.body;

    if (!captchaSeed || !captchaNonce) {
      // Generate new captcha
      const captcha = await generateAdminCaptcha(identifier);

      return res.status(403).json({
        success: false,
        message: "Captcha verification required",
        code: "CAPTCHA_REQUIRED",
        data: {
          seed: captcha.seed,
          difficulty: captcha.difficulty,
          instruction:
            `Solve: Find nonce where SHA-256(seed + nonce) starts with ${ADMIN_CAPTCHA_DIFFICULTY} zeros`,
        },
      });
    }

    // Verify captcha
    const result = await verifyAdminCaptcha(identifier, captchaSeed, captchaNonce);

    if (!result.valid) {
      return res.status(403).json({
        success: false,
        message: result.reason || "Captcha verification failed",
        code: "CAPTCHA_INVALID",
      });
    }

    // Captcha valid - proceed
    next();
  } catch (error) {
    console.error("[ADMIN_CAPTCHA] Error:", error);
    // Fail open to avoid lockout
    next();
  }
};