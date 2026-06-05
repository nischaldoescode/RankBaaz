/**
 * handles admin captcha middleware checks before controllers receive the request
 *
 * @file backend/middleware/admincaptcha.js
 * @module backend/middleware/admincaptcha
 * @exports middleware functions used by protected backend routes
 */

import crypto from "crypto";
import redisClient, {
  isRedisConnectionError,
  summarizeRedisError,
} from "../Config/redis.js";

/**
 * admin login captcha protection
 * mathematical challenge for admin authentication
 */

const ADMIN_CAPTCHA_DIFFICULTY = 5; // harder than regular users
const ADMIN_CAPTCHA_TTL = 120; // 2 minutes
const MAX_LOGIN_ATTEMPTS = 3; // require captcha 3 failed logins
const LOGIN_ATTEMPT_TTL_MS = 10 * 60 * 1000;

const fallbackAttempts = new Map();
const fallbackCaptchas = new Map();

const warnRedisFallback = (label, error) => {
  if (!isRedisConnectionError(error)) throw error;
  console.warn(label, summarizeRedisError(error));
};

const pruneFallbackState = () => {
  const now = Date.now();

  for (const [key, value] of fallbackAttempts.entries()) {
    if (value.expiresAt <= now) fallbackAttempts.delete(key);
  }

  for (const [key, value] of fallbackCaptchas.entries()) {
    if (value.expiresAt <= now) fallbackCaptchas.delete(key);
  }
};

const getFallbackAttemptCount = (identifier) => {
  pruneFallbackState();
  const item = fallbackAttempts.get(identifier);
  return item?.count || 0;
};

const incrementFallbackAttempt = (identifier) => {
  pruneFallbackState();
  const now = Date.now();
  const current = fallbackAttempts.get(identifier);

  if (!current || current.expiresAt <= now) {
    fallbackAttempts.set(identifier, {
      count: 1,
      expiresAt: now + LOGIN_ATTEMPT_TTL_MS,
    });
    return 1;
  }

  current.count += 1;
  fallbackAttempts.set(identifier, current);
  return current.count;
};

/**
 * generate admin captcha challenge
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

  fallbackCaptchas.set(identifier, {
    ...captchaData,
    expiresAt: timestamp + ADMIN_CAPTCHA_TTL * 1000,
  });

  try {
    await redisClient.setex(
      captchaKey,
      ADMIN_CAPTCHA_TTL,
      JSON.stringify(captchaData)
    );
  } catch (error) {
    warnRedisFallback(
      "Redis unavailable while storing admin captcha; using process memory:",
      error,
    );
  }

  return {
    seed,
    difficulty: ADMIN_CAPTCHA_DIFFICULTY,
    timestamp,
  };
};

/**
 * verify admin captcha solution
 */
export const verifyAdminCaptcha = async (identifier, seed, nonce) => {
  const captchaKey = `admin:captcha:${identifier}`;
  let stored;

  try {
    stored = await redisClient.get(captchaKey);
  } catch (error) {
    warnRedisFallback(
      "Redis unavailable while reading admin captcha; using process memory:",
      error,
    );
  }

  if (!stored) {
    const fallback = fallbackCaptchas.get(identifier);
    if (fallback) {
      stored = JSON.stringify(fallback);
    }
  }

  if (!stored) {
    return { valid: false, reason: "Captcha expired or not found" };
  }

  const captchaData = JSON.parse(stored);

  // verify seed matches
  if (captchaData.seed !== seed) {
    return { valid: false, reason: "Invalid captcha seed" };
  }

  // verify timestamp
  if (Date.now() - captchaData.timestamp > ADMIN_CAPTCHA_TTL * 1000) {
    return { valid: false, reason: "Captcha expired" };
  }

  // verify proof-of-work
  const hash = crypto
    .createHash("sha256")
    .update(seed + nonce)
    .digest("hex");

  const requiredPrefix = "0".repeat(ADMIN_CAPTCHA_DIFFICULTY);

  if (!hash.startsWith(requiredPrefix)) {
    return { valid: false, reason: "Invalid captcha solution" };
  }

  // clean up
  fallbackCaptchas.delete(identifier);
  try {
    await redisClient.del(captchaKey);
  } catch (error) {
    warnRedisFallback(
      "Redis unavailable while clearing admin captcha; using process memory:",
      error,
    );
  }

  return { valid: true };
};

/**
 * track admin login attempts
 */
export const trackAdminLoginAttempt = async (identifier, success = false) => {
  const attemptKey = `admin:attempts:${identifier}`;

  if (success) {
    // clear attempts on successful login
    fallbackAttempts.delete(identifier);
    try {
      await redisClient.del(attemptKey);
    } catch (error) {
      warnRedisFallback(
        "Redis unavailable while clearing admin login attempts; using process memory:",
        error,
      );
    }
    return { requiresCaptcha: false, attempts: 0 };
  }

  let attempts;

  try {
    // increment failed attempts
    attempts = await redisClient.incr(attemptKey);

    // set expiry on first attempt (10 minutes)
    if (attempts === 1) {
      await redisClient.expire(attemptKey, 600);
    }
  } catch (error) {
    warnRedisFallback(
      "Redis unavailable while tracking admin login attempts; using process memory:",
      error,
    );
    attempts = incrementFallbackAttempt(identifier);
  }

  const requiresCaptcha = attempts >= MAX_LOGIN_ATTEMPTS;

  return { requiresCaptcha, attempts };
};

/**
 * check if captcha is required for admin login
 */
export const isCaptchaRequired = async (identifier) => {
  const attemptKey = `admin:attempts:${identifier}`;
  try {
    const attempts = await redisClient.get(attemptKey);
    return Number(attempts || 0) >= MAX_LOGIN_ATTEMPTS;
  } catch (error) {
    warnRedisFallback(
      "Redis unavailable while checking admin login attempts; using process memory:",
      error,
    );
    return getFallbackAttemptCount(identifier) >= MAX_LOGIN_ATTEMPTS;
  }
};

/**
 * middleware: require captcha for admin operations
 */
export const requireAdminCaptcha = async (req, res, next) => {
  try {
    const identifier = req.body.email || req.ip;

    // check if captcha is required
    const required = await isCaptchaRequired(identifier);

    if (!required) {
      return next();
    }

    // captcha is required - check if provided
    const { captchaSeed, captchaNonce } = req.body;

    if (!captchaSeed || !captchaNonce) {
      // generate captcha
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

    // verify captcha
    const result = await verifyAdminCaptcha(identifier, captchaSeed, captchaNonce);

    if (!result.valid) {
      return res.status(403).json({
        success: false,
        message: result.reason || "Captcha verification failed",
        code: "CAPTCHA_INVALID",
      });
    }

    // captcha valid - proceed
    next();
  } catch (error) {
    if (isRedisConnectionError(error)) {
      console.warn(
        "Redis unavailable; allowing request:",
        summarizeRedisError(error),
      );
    } else {
      console.error("Error:", error);
    }
    // fail open to avoid lockout
    next();
  }
};
