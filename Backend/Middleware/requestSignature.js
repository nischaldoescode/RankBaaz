/**
 * handles request signature middleware checks before controllers receive the request
 *
 * @file backend/middleware/requestsignature.js
 * @module backend/middleware/requestsignature
 * @exports middleware functions used by protected backend routes
 */

import crypto from "crypto";
import redisClient, {
  isRedisConnectionError,
  summarizeRedisError,
} from "../Config/redis.js";

const MEMORY_SECRET_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MEMORY_NONCE_TTL_MS = 5 * 60 * 1000;
const memorySecrets = new Map();
const memoryNonces = new Map();

const getSecretKey = (userId, isAdmin = false) => {
  const prefix = isAdmin ? "signing:secret:admin" : "signing:secret";
  return `${prefix}:${userId}`;
};

const pruneExpiredMemoryEntries = (store) => {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (!value?.expiresAt || value.expiresAt <= now) {
      store.delete(key);
    }
  }
};

const setMemorySecret = (key, secret, ttlMs = MEMORY_SECRET_TTL_MS) => {
  pruneExpiredMemoryEntries(memorySecrets);
  memorySecrets.set(key, {
    value: secret,
    expiresAt: Date.now() + ttlMs,
  });
};

const getMemorySecret = (key) => {
  const entry = memorySecrets.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memorySecrets.delete(key);
    return null;
  }
  return entry.value;
};

const markMemoryNonce = (key) => {
  pruneExpiredMemoryEntries(memoryNonces);
  const existing = memoryNonces.get(key);
  if (existing && existing.expiresAt > Date.now()) {
    return false;
  }
  memoryNonces.set(key, {
    value: "used",
    expiresAt: Date.now() + MEMORY_NONCE_TTL_MS,
  });
  return true;
};

/**
 * generate signing secret for authenticated session
 *
 * supports both user and admin authentication
 * stores secret in redis with 7-day expiry
 *
 * @param {string} userid - user or admin id
 * @param {boolean} isadmin - whether this is an admin session (default: false)
 * @returns {promise<string>} - hex-encoded 256-bit secret
 */
export const generateSigningSecret = async (userId, isAdmin = false) => {
  const secret = crypto.randomBytes(32).toString("hex");
  const key = getSecretKey(userId, isAdmin);

  // store in redis with 7-day expiry (matches auth token)
  try {
    await redisClient.setex(key, 7 * 24 * 60 * 60, secret);
  } catch (error) {
    if (!isRedisConnectionError(error)) throw error;
    setMemorySecret(key, secret);
    console.warn(
      "Redis unavailable while storing signing secret; using process memory:",
      summarizeRedisError(error),
    );
  }

  console.log(
    `Generated new secret for ${isAdmin ? "admin" : "user"} ${userId}`
  );

  return secret;
};

/**
 * retrieve signing secret from redis
 *
 * @param {string} userid - user or admin id
 * @param {boolean} isadmin - whether this is an admin session (default: false)
 * @returns {promise<string|null>} - secret or null if not found
 */
const getSigningSecret = async (userId, isAdmin = false) => {
  const key = getSecretKey(userId, isAdmin);

  let secret = null;

  try {
    secret = await redisClient.get(key);
    if (secret) {
      setMemorySecret(key, secret);
    }
  } catch (error) {
    if (!isRedisConnectionError(error)) throw error;
    secret = getMemorySecret(key);
    console.warn(
      "Redis unavailable while reading signing secret; checking process memory:",
      summarizeRedisError(error),
    );
  }

  if (!secret && process.env.NODE_ENV === "development") {
    console.warn(
      `No secret found for ${isAdmin ? "admin" : "user"} ${userId}`
    );
  }

  return secret;
};

/**
 * verify hmac-sha256 request signature
 *
 * security checks:
 * 1. signature, timestamp, nonce headers present
 * 2. nonce format validation (32 hex chars)
 * 3. timestamp within 5-minute window
 * 4. nonce not reused (replay attack prevention)
 * 5. hmac signature matches expected value
 *
 * @middleware
 */
export const verifyRequestSignature = async (req, res, next) => {
  try {
    if (req.signatureVerified) {
      return next();
    }

    const signature = req.headers["x-request-signature"];
    const timestamp = req.headers["x-request-timestamp"];
    const nonce = req.headers["x-request-nonce"];

    // check for signature headers
    if (!signature || !timestamp || !nonce) {
      console.warn("Missing signature headers:", {
        hasSignature: !!signature,
        hasTimestamp: !!timestamp,
        hasNonce: !!nonce,
        path: req.originalUrl,
      });

      return res.status(403).json({
        success: false,
        message: "Missing request signature. Please refresh and try again.",
        code: "SIGNATURE_MISSING",
      });
    }

    // validate nonce format (exactly 32 hex characters)
    if (!/^[0-9a-f]{32}$/i.test(nonce)) {
      console.warn("Invalid nonce format:", {
        nonce: nonce.substring(0, 10) + "...",
        path: req.originalUrl,
      });

      return res.status(403).json({
        success: false,
        message: "Invalid request format.",
        code: "INVALID_NONCE",
      });
    }

    if (!/^[0-9a-f]{64}$/i.test(signature)) {
      console.warn("Invalid signature format:", {
        path: req.originalUrl,
      });

      return res.status(403).json({
        success: false,
        message: "Invalid request format.",
        code: "SIGNATURE_INVALID",
      });
    }

    // check timestamp (within 5 minutes)
    const now = Date.now();
    const requestTime = parseInt(timestamp);

    if (isNaN(requestTime)) {
      console.warn("Invalid timestamp format:", {
        timestamp,
        path: req.originalUrl,
      });

      return res.status(403).json({
        success: false,
        message: "Invalid request timestamp.",
        code: "INVALID_TIMESTAMP",
      });
    }

    const timeDiff = Math.abs(now - requestTime);

    if (timeDiff > 5 * 60 * 1000) {
      console.warn("Timestamp expired:", {
        now,
        requestTime,
        diffSeconds: Math.floor(timeDiff / 1000),
        path: req.originalUrl,
      });

      return res.status(403).json({
        success: false,
        message: "Request expired. Please refresh and try again.",
        code: "SIGNATURE_EXPIRED",
      });
    }

    // get user/admin id from authenticated request
    const userId = req.user?.userId || req.admin?.userId || req.admin?.adminId;
    const isAdmin = !!req.admin;

    if (!userId) {
      console.error("No userId in request:", {
        hasUser: !!req.user,
        hasAdmin: !!req.admin,
        path: req.originalUrl,
      });

      return res.status(401).json({
        success: false,
        message: "Authentication required",
        code: "AUTH_REQUIRED",
      });
    }

    // check nonce for replay attack prevention
    // use different prefix for admin vs user nonces
    const noncePrefix = isAdmin ? "nonce:admin" : "nonce";
    const nonceKey = `${noncePrefix}:${userId}:${nonce}`;

    let nonceExists = false;
    let nonceCheckedWithRedis = true;

    try {
      nonceExists = await redisClient.get(nonceKey);
    } catch (redisError) {
      if (!isRedisConnectionError(redisError)) throw redisError;
      nonceCheckedWithRedis = false;
      nonceExists = !markMemoryNonce(nonceKey);
      console.warn(
        "Redis unavailable while checking nonce; using process memory:",
        summarizeRedisError(redisError),
      );
    }

    if (nonceExists) {
      console.warn("Replay attack detected:", {
        userId,
        isAdmin,
        nonce: nonce.substring(0, 10) + "...",
        path: req.originalUrl,
      });

      return res.status(403).json({
        success: false,
        message: "Request already processed",
        code: "REPLAY_ATTACK",
      });
    }

    // get signing secret (with admin flag)
    const secret = await getSigningSecret(userId, isAdmin);

    if (!secret) {
      console.error("No signing secret found:", {
        userId,
        isAdmin,
        path: req.originalUrl,
      });

      return res.status(403).json({
        success: false,
        message: "Invalid session. Please log in again.",
        code: "SIGNATURE_INVALID",
      });
    }

    // create signature payload
    const method = req.method;
    const path = req.originalUrl;
    const requestBody =
      req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)
        ? req.body
        : {};
    const body =
      Object.keys(requestBody).length > 0 ? JSON.stringify(requestBody) : "";
    const payload = `${timestamp}:${nonce}:${method}:${path}:${body}`;

    // calculate expected signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    // only log signing details in development
    if (process.env.NODE_ENV === "development") {
      console.log("Verification details:", {
        method,
        path, // this is what backend uses
        bodyLength: body.length,
        timestamp,
        noncePreview: nonce.substring(0, 10) + "...",
        secretPreview: secret.substring(0, 16) + "...",
      });
    }

    // use constant-time comparison to prevent timing attacks
    const signaturesMatch = crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );

    // verify signature
    if (!signaturesMatch) {
      if (process.env.NODE_ENV === "development") {
        console.error("Verification failed:", {
          userId,
          isAdmin,
          method,
          path,
          body: body.substring(0, 100),
          receivedSignature: signature.substring(0, 16) + "...",
          expectedSignature: expectedSignature.substring(0, 16) + "...",
          payload: payload.substring(0, 100),
        });
      } else {
        console.error("Verification failed:", {
          userId,
          isAdmin,
          method,
          path,
        });
      }

      return res.status(403).json({
        success: false,
        message: "Invalid request signature. Please refresh and try again.",
        code: "SIGNATURE_INVALID",
      });
    }

    if (nonceCheckedWithRedis) {
      try {
        const storedNonce = await redisClient.set(
          nonceKey,
          "used",
          "EX",
          5 * 60,
          "NX",
        );

        if (storedNonce !== "OK") {
          console.warn("Replay attack detected:", {
            userId,
            isAdmin,
            nonce: nonce.substring(0, 10) + "...",
            path: req.originalUrl,
          });

          return res.status(403).json({
            success: false,
            message: "Request already processed",
            code: "REPLAY_ATTACK",
          });
        }
      } catch (redisError) {
        if (!isRedisConnectionError(redisError)) throw redisError;
        if (!markMemoryNonce(nonceKey)) {
          console.warn("Replay attack detected:", {
            userId,
            isAdmin,
            nonce: nonce.substring(0, 10) + "...",
            path: req.originalUrl,
          });

          return res.status(403).json({
            success: false,
            message: "Request already processed",
            code: "REPLAY_ATTACK",
          });
        }
        console.warn(
          "Redis unavailable while storing nonce; using process memory:",
          summarizeRedisError(redisError),
        );
      }
    }

    // signature valid - log in development
    if (process.env.NODE_ENV === "development") {
      console.log("Verified successfully:", {
        userId,
        isAdmin,
        method,
        path,
      });
    }

    req.signatureVerified = true;
    next();
  } catch (error) {
    if (isRedisConnectionError(error)) {
      console.error(
        "Redis unavailable during verification:",
        summarizeRedisError(error),
      );
      return res.status(503).json({
        success: false,
        message: "Service temporarily unavailable",
        code: "SERVICE_ERROR",
      });
    }

    console.error("Verification error:", error);
    res.status(500).json({
      success: false,
      message: "Signature verification failed",
      code: "SIGNATURE_ERROR",
    });
  }
};

/**
 * get /api/security/signing-secret - retrieve request signing secret
 *
 * called by frontend login or when signature expires
 * does not require request signature (breaks chicken-and-egg problem)
 * requires valid authentication cookie (validated by authcookieonly middleware)
 *
 * flow:
 * 1. check if user/admin is authenticated
 * 2. detect if request is from admin
 * 3. try to get existing secret from redis
 * 4. if no secret exists or admin flag mismatch, regenerate
 * 5. return secret with 7-day expiry
 *
 * @route get /api/security/signing-secret
 * @auth cookie-based authentication (admin or user)
 * @returns {200} - signing secret with 7-day expiry
 * @returns {401} - authentication required
 * @returns {500} - server error
 */
export const getSigningSecretEndpoint = async (req, res) => {
  try {
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      Pragma: "no-cache",
      Expires: "0",
      "Surrogate-Control": "no-store",
    });

    // detect admin from multiple possible fields
    const userId = req.admin?.adminId || req.admin?.userId || req.user?.userId;
    const isAdmin = !!(req.admin || req.user?.isAdmin);

    if (!userId) {
      console.error("No userId found in request:", {
        hasUser: !!req.user,
        hasAdmin: !!req.admin,
        userObj: req.user,
        adminObj: req.admin,
      });

      return res.status(401).json({
        success: false,
        message: "Authentication required",
        code: "AUTH_REQUIRED",
      });
    }

    console.log(`Request for secret:`, {
      userId,
      isAdmin,
      source: req.admin ? "req.admin" : "req.user",
    });

    // try to get existing secret with correct admin flag
    let secret = await getSigningSecret(userId, isAdmin);

    // always regenerate if no secret found
    // this ensures frontend and backend use the same secret
    if (!secret) {
      console.log(
        `Generating new secret for ${isAdmin ? "admin" : "user"} ${userId}`
      );
      secret = await generateSigningSecret(userId, isAdmin);
    } else {
      console.log(
        `Returning existing secret for ${isAdmin ? "admin" : "user"} ${userId}`
      );
    }

    // log secret preview for debugging (only in development)
    if (process.env.NODE_ENV === "development") {
      console.log(
        `Secret preview: ${secret.substring(0, 16)}...`
      );
    }

    res.status(200).json({
      success: true,
      data: {
        signingSecret: secret,
        expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
      },
    });
  } catch (error) {
    if (isRedisConnectionError(error)) {
      console.error(
        "Redis unavailable:",
        summarizeRedisError(error),
      );
      return res.status(503).json({
        success: false,
        message: "Service temporarily unavailable",
        code: "SERVICE_ERROR",
      });
    }

    console.error("Get secret error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get signing secret",
      code: "SECRET_ERROR",
    });
  }
};
