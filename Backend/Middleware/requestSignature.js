import crypto from "crypto";
import redisClient from "../Config/redis.js";

// Generate signing secret for user session
export const generateSigningSecret = async (userId) => {
  const secret = crypto.randomBytes(32).toString("hex");
  const key = `signing:secret:${userId}`;

  // Store in Redis with 7-day expiry (matches auth token)
  await redisClient.setex(key, 7 * 24 * 60 * 60, secret);

  return secret;
};

// Get signing secret from Redis
const getSigningSecret = async (userId) => {
  const key = `signing:secret:${userId}`;
  return await redisClient.get(key);
};

// Verify request signature
export const verifyRequestSignature = async (req, res, next) => {
  try {
    const signature = req.headers["x-request-signature"];
    const timestamp = req.headers["x-request-timestamp"];
    const nonce = req.headers["x-request-nonce"];

    // CRITICAL: Check for signature headers
    if (!signature || !timestamp || !nonce) {
      console.warn("[SIGNATURE] Missing signature headers:", {
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

    // Check timestamp (must be within 5 minutes)
    const now = Date.now();
    const requestTime = parseInt(timestamp);
    const timeDiff = Math.abs(now - requestTime);

    if (timeDiff > 5 * 60 * 1000) {
      console.warn("[SIGNATURE] Timestamp expired:", {
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

    // Get user ID from authenticated request
    const userId = req.user?.userId;
    if (!userId) {
      console.error("[SIGNATURE] No userId in request:", {
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

    // Check nonce for replay attack prevention
    const nonceKey = `nonce:${userId}:${nonce}`;
    let nonceExists;

    try {
      nonceExists = await redisClient.get(nonceKey);
    } catch (redisError) {
      console.error("[SIGNATURE] Redis error checking nonce:", redisError);
      // Continue without nonce check if Redis is down (graceful degradation)
      // In production, you might want to reject the request instead
    }

    if (nonceExists) {
      console.warn("[SIGNATURE] Replay attack detected:", {
        userId,
        nonce,
        path: req.originalUrl,
      });

      return res.status(403).json({
        success: false,
        message: "Request already processed",
        code: "REPLAY_ATTACK",
      });
    }

    // Store nonce for 5 minutes
    try {
      await redisClient.setex(nonceKey, 5 * 60, "used");
    } catch (redisError) {
      console.error("[SIGNATURE] Redis error storing nonce:", redisError);
      // Continue without storing nonce if Redis is down
    }

    // Get signing secret
    const secret = await getSigningSecret(userId);
    if (!secret) {
      console.error("[SIGNATURE] No signing secret found:", {
        userId,
        path: req.originalUrl,
      });

      return res.status(403).json({
        success: false,
        message: "Invalid session. Please log in again.",
        code: "SIGNATURE_INVALID",
      });
    }

    // Create signature payload
    const method = req.method;
    const path = req.originalUrl;
    const body =
      Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : "";
    const payload = `${timestamp}:${nonce}:${method}:${path}:${body}`;

    // Calculate expected signature
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    // Verify signature
    if (signature !== expectedSignature) {
      if (process.env.NODE_ENV === "development") {
        console.error("[SIGNATURE] Verification failed:", {
          userId,
          method,
          path,
          body: body.substring(0, 100),
          receivedSignature: signature.substring(0, 16) + "...",
          expectedSignature: expectedSignature.substring(0, 16) + "...",
          payload: payload.substring(0, 100),
        });
      } else {
        console.error("[SIGNATURE] Verification failed:", {
          userId,
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

    // Signature valid - log in development
    if (process.env.NODE_ENV === "development") {
      console.log("[SIGNATURE] Verified successfully:", {
        userId,
        method,
        path,
      });
    }

    next();
  } catch (error) {
    console.error("[SIGNATURE] Verification error:", error);
    res.status(500).json({
      success: false,
      message: "Signature verification failed",
      code: "SIGNATURE_ERROR",
    });
  }
};

// Endpoint to get signing secret (called after login)
export const getSigningSecretEndpoint = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    let secret = await getSigningSecret(userId);

    // Generate new secret if doesn't exist
    if (!secret) {
      secret = await generateSigningSecret(userId);
    }

    res.status(200).json({
      success: true,
      data: {
        signingSecret: secret,
        expiresIn: 7 * 24 * 60 * 60, // 7 days in seconds
      },
    });
  } catch (error) {
    console.error("[SIGNATURE] Get secret error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get signing secret",
    });
  }
};
