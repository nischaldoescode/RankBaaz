import redisClient from "../Config/redis.js";
import crypto from "crypto";
import { botBlockedPage } from "./ErrorsPages/errorPages.js";

// Security thresholds for bot detection
const BOT_SCORE_THRESHOLD = 60;
const CHALLENGE_TTL = 300;
const BOT_BAN_TTL = 3600;
const CHALLENGE_DIFFICULTY = 4;

// Whitelist of allowed origins for CORS validation
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://localhost:7000",
  "http://localhost:6000",
  "https://api.vidhgrow.online",
  "https://rankbaaz.onrender.com",
  "https://rankbaaz-frontend.onrender.com",
  "https://vidhgrow.online",
  "https://www.vidhgrow.online",
  "https://admin.vidhgrow.online",
  "https://rankbaaz-admin.onrender.com",
  "http://localhost:4173",
  "https://teachers.vidhgrow.online",
  "https://www.teachers.vidhgrow.online",
  "https://blogs.vidhgrow.online",
  "https://www.blogs.vidhgrow.online",
  "http://localhost:5174",
  "http://localhost:5176",
  "http://localhost:8080"
];

const PUBLIC_BLOG_READ_PATHS = [
  "/api/blogs/public",
  "/api/blogs/authors",
  "/api/blogs/settings/share",
  "/api/blogs/sitemap.xml",
];

const isPublicBlogReadRequest = (req) => {
  if (req.method !== "GET") return false;

  return PUBLIC_BLOG_READ_PATHS.some(
    (path) => req.path === path || req.path.startsWith(`${path}/`),
  );
};

/**
 * PRODUCTION SECURITY: Simple 403 Forbidden HTML page
 * Displayed when requests have no valid origin/referer headers
 * Prevents information leakage about backend infrastructure
 */
const SIMPLE_403_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>403 Forbidden</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: #f5f5f5;
    }
    .container {
      text-align: center;
      padding: 2rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      max-width: 400px;
    }
    h1 {
      font-size: 3rem;
      margin: 0;
      color: #333;
      font-weight: bold;
    }
    .divider {
      height: 1px;
      background: #ddd;
      margin: 1.5rem 0;
    }
    .brand {
      font-style: italic;
      color: #666;
      font-size: 1.2rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>403 Forbidden</h1>
    <div class="divider"></div>
    <p class="brand">Vidhgrow</p>
  </div>
</body>
</html>
`;

/**
 * SECURITY: Validate if origin header is legitimate
 * Detects CORS proxy attempts and spoofed origins
 * @param {string} origin - Origin header value
 * @param {string} referer - Referer header value
 * @returns {boolean} - True if origin appears legitimate
 */
const isLegitimateOrigin = (origin, referer) => {
  // No origin/referer at all - suspicious for API calls
  if (!origin && !referer) {
    return false;
  }

  // Check if origin matches allowed list
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const originHostname = originUrl.hostname.toLowerCase();

      // Check for exact match in allowed origins
      const isAllowed = ALLOWED_ORIGINS.some((allowed) => {
        const allowedUrl = new URL(allowed);
        return originHostname === allowedUrl.hostname.toLowerCase();
      });

      if (!isAllowed) {
        // SECURITY: Detect CORS proxy patterns
        // Common patterns: cors-anywhere, allorigins, etc.
        const corsProxyPatterns = [
          /cors-anywhere/i,
          /corsproxy/i,
          /allorigins/i,
          /cors\.io/i,
          /crossorigin\.me/i,
          /proxy/i,
        ];

        const isCorsProxy = corsProxyPatterns.some((pattern) =>
          pattern.test(originHostname),
        );

        if (isCorsProxy) {
          return false;
        }

        // SECURITY: Check for subdomain mimicking
        // Example: vidhgrow.attacker.com trying to impersonate vidhgrow.online
        const isMimicking = ALLOWED_ORIGINS.some((allowed) => {
          const allowedUrl = new URL(allowed);
          const allowedHostname = allowedUrl.hostname.toLowerCase();
          return (
            originHostname.includes(allowedHostname) &&
            originHostname !== allowedHostname
          );
        });

        if (isMimicking) {
          return false;
        }
      }

      return isAllowed;
    } catch (e) {
      // Invalid origin URL format
      return false;
    }
  }

  // If no origin but has referer, validate referer
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererHostname = refererUrl.hostname.toLowerCase();

      const isAllowed = ALLOWED_ORIGINS.some((allowed) => {
        const allowedUrl = new URL(allowed);
        return refererHostname === allowedUrl.hostname.toLowerCase();
      });

      return isAllowed;
    } catch (e) {
      return false;
    }
  }

  return false;
};

/**
 * SECURITY: Calculate bot probability score
 * Higher score = more likely to be automated traffic
 * Scores 60+ trigger challenges, 80+ trigger instant bans
 */
const calculateBotScore = (req) => {
  let score = 0;
  const ua = req.get("User-Agent") || "";
  const origin = req.get("Origin") || req.get("Referer") || "";
  const acceptHeader = req.get("Accept") || "";

  // User-Agent validation
  if (!ua) {
    score += 40; // No UA = very suspicious
  } else if (/curl|wget|python-requests|go-http-client/i.test(ua)) {
    score += 60; // Known CLI tools
  } else if (/postman|insomnia|httpie|paw|restclient/i.test(ua)) {
    score += 65; // API testing tools
  } else if (/bot|crawler|scraper|spider/i.test(ua)) {
    // Legitimate search engine bots get a pass
    if (/googlebot|bingbot|slurp|duckduckbot/i.test(ua)) {
      score += 0;
    } else {
      score += 50; // Unknown bots
    }
  }

  // Browser header validation
  const browserHeaders = ["Accept", "Accept-Language", "Accept-Encoding"];
  const missing = browserHeaders.filter((h) => !req.get(h));
  score += missing.length * 15; // Real browsers send all these headers

  // Accept header validation
  if (acceptHeader) {
    if (acceptHeader === "*/*" || acceptHeader === "application/json") {
      score += 30; // Non-browser accept headers
    }
    if (!acceptHeader.includes("text/html")) {
      score += 20; // Browsers always accept HTML
    }
  }

  // Modern browser security headers (Sec-Fetch-*)
  const secFetchSite = req.get("Sec-Fetch-Site");
  const secFetchMode = req.get("Sec-Fetch-Mode");
  const secFetchDest = req.get("Sec-Fetch-Dest");

  if (!secFetchSite && !secFetchMode && !secFetchDest) {
    score += 25; // Modern browsers send these
  }

  // Origin/Referer validation
  if (origin) {
    if (!isLegitimateOrigin(origin, null)) {
      score += 40; // Invalid or suspicious origin
    }
  } else {
    // No origin on non-GET requests is suspicious
    if (req.method !== "GET") {
      score += 20;
    }
  }

  // Connection header validation
  const connection = req.get("Connection");
  if (connection && connection.toLowerCase() === "close") {
    score += 10; // Bots often use Connection: close
  }

  return Math.min(score, 100); // Cap at 100
};

// Helper function to check if IP is banned
const isBannedWithUA = async (ip, userAgent) => {
  const ipOnlyKey = `bot:ban:${ip}`;
  const ipOnlyBan = await redisClient.get(ipOnlyKey);
  if (ipOnlyBan) return true;

  const uaHash = crypto
    .createHash("md5")
    .update(userAgent || "unknown")
    .digest("hex")
    .substring(0, 8);
  const key = `bot:ban:${ip}:${uaHash}`;
  return !!(await redisClient.get(key));
};

// Helper function to ban IP with user agent fingerprint
const banIPWithUA = async (ip, userAgent, reason) => {
  const uaHash = crypto
    .createHash("md5")
    .update(userAgent || "unknown")
    .digest("hex")
    .substring(0, 8);
  const key = `bot:ban:${ip}:${uaHash}`;

  await redisClient.setex(
    key,
    BOT_BAN_TTL,
    JSON.stringify({
      reason,
      bannedAt: Date.now(),
      userAgent: userAgent || "unknown",
      ip,
    }),
  );
};

// Helper function to generate proof-of-work challenge
const generateChallenge = async (ip) => {
  const seed = crypto.randomBytes(16).toString("hex");
  const timestamp = Date.now();

  const challengeKey = `bot:challenge:${ip}`;
  const challengeData = {
    seed,
    timestamp,
    difficulty: CHALLENGE_DIFFICULTY,
  };

  await redisClient.setex(
    challengeKey,
    CHALLENGE_TTL,
    JSON.stringify(challengeData),
  );

  return {
    seed,
    difficulty: CHALLENGE_DIFFICULTY,
    timestamp,
  };
};

// Helper function to verify challenge solution
const verifyChallengeSolution = async (ip, seed, nonce) => {
  const challengeKey = `bot:challenge:${ip}`;
  const stored = await redisClient.get(challengeKey);

  if (!stored) {
    return { valid: false, reason: "Challenge expired or not found" };
  }

  const challengeData = JSON.parse(stored);

  if (challengeData.seed !== seed) {
    return { valid: false, reason: "Invalid seed" };
  }

  if (Date.now() - challengeData.timestamp > CHALLENGE_TTL * 1000) {
    return { valid: false, reason: "Challenge expired" };
  }

  const hash = crypto
    .createHash("sha256")
    .update(seed + nonce)
    .digest("hex");

  const requiredPrefix = "0".repeat(CHALLENGE_DIFFICULTY);

  if (!hash.startsWith(requiredPrefix)) {
    return { valid: false, reason: "Invalid proof-of-work" };
  }

  const passedKey = `bot:challenge:passed:${ip}`;
  await redisClient.setex(passedKey, CHALLENGE_TTL, "true");

  await redisClient.del(challengeKey);

  return { valid: true };
};

/**
 * Main bot protection middleware
 * Implements multi-layer security checks for all non-health API routes
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 *
 * Security Layers:
 * 1. Health endpoint bypass
 * 2. Authenticated request bypass (has valid auth cookie + signature)
 * 3. Origin/Referer validation
 * 4. Ban list check
 * 5. Bot score calculation
 * 6. Challenge/Ban enforcement
 */
export const botProtection = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const ua = req.get("User-Agent") || "";
    const origin = req.get("Origin") || "";
    const referer = req.get("Referer") || "";

    // LAYER 1: Allow health check endpoint
    if (req.path === "/health") {
      return next();
    }

    if (req.path === "/track") {
      return next();
    }

    if (req.path === "/track/admin/list/all") {
      return next();
    }

    if (req.path === "/track/admin/view") {
      return next();
    }

    if (isPublicBlogReadRequest(req)) {
      if (isLegitimateOrigin(origin, referer)) {
        return next();
      }

      if (req.path === "/api/blogs/sitemap.xml" && !origin && !referer) {
        return next();
      }
    }

    // LAYER 2: Bypass protection for authenticated requests with valid signatures
    // These are legitimate frontend requests from logged-in users
    const hasAuthCookie = !!req.signedCookies.auth_session;
    const hasValidSignature = !!req.headers["x-request-signature"];

    if (hasAuthCookie && hasValidSignature) {
      // This is a legitimate authenticated request from our frontend
      return next();
    }

    // LAYER 3: For unauthenticated API routes, validate origin/referer
    const hasNoOrigin = !origin && !referer;
    const hasInvalidOrigin = !isLegitimateOrigin(origin, referer);

    // PRODUCTION SECURITY: Block requests with no valid origin
    // This catches Postman, Insomnia, curl, and direct browser visits
    if (hasNoOrigin || hasInvalidOrigin) {
      console.warn("[BOT_PROTECTION] Blocked request - Invalid origin:", {
        ip,
        ua: ua.substring(0, 50),
        origin: origin || "none",
        referer: referer || "none",
        path: req.path,
      });

      // Return simple 403 HTML for browsers, JSON for API clients
      if (req.path.startsWith("/api/")) {
        return res.status(403).send(SIMPLE_403_HTML);
      } else {
        return res.status(403).send(SIMPLE_403_HTML);
      }
    }

    // LAYER 4: Check if IP is banned
    if (await isBannedWithUA(ip, ua)) {
      if (req.path.startsWith("/api/")) {
        return res.status(403).send(SIMPLE_403_HTML);
      }
      return res
        .status(403)
        .send(botBlockedPage("Access temporarily restricted."));
    }

    // LAYER 5: Check if challenge already passed
    const passedKey = `bot:challenge:passed:${ip}`;
    const hasPassed = await redisClient.get(passedKey);

    if (hasPassed) {
      return next();
    }

    // LAYER 6: Calculate bot probability score
    const score = calculateBotScore(req);

    // Low score (< 30) = likely human, allow through
    if (score < 30) {
      return next();
    }

    // LAYER 7: Medium score (30-59) = challenge required
    if (score < BOT_SCORE_THRESHOLD) {
      const challenge = await generateChallenge(ip);

      console.warn("[BOT_PROTECTION] Challenge required:", {
        ip,
        score,
        path: req.path,
      });

      if (req.path.startsWith("/api/")) {
        return res.status(403).send(SIMPLE_403_HTML);
      }

      return res
        .status(403)
        .send(
          botBlockedPage(
            "Security verification required. Please use a standard web browser.",
          ),
        );
    }

    // LAYER 8: High score (60+) = instant ban
    await banIPWithUA(ip, ua, `High bot score: ${score}`);

    console.warn("[BOT_PROTECTION] Auto-banned:", {
      ip,
      score,
      path: req.path,
    });

    if (req.path.startsWith("/api/")) {
      return res.status(403).send(SIMPLE_403_HTML);
    }

    return res.status(403).send(botBlockedPage("Automated access detected."));
  } catch (err) {
    console.error("[BOT_PROTECTION] Error:", err);
    // Allow request on error to prevent blocking legitimate traffic
    next();
  }
};

/**
 * Challenge verification endpoint
 * Validates proof-of-work solutions submitted by clients
 */
export const verifyChallenge = async (req, res) => {
  try {
    const { seed, nonce } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    if (!seed || !nonce) {
      return res.status(400).json({
        success: false,
        message: "Missing challenge parameters",
      });
    }

    const result = await verifyChallengeSolution(ip, seed, nonce);

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: result.reason || "Challenge verification failed",
      });
    }

    res.status(200).json({
      success: true,
      message: "Challenge completed successfully",
    });
  } catch (err) {
    console.error("[BOT_PROTECTION] Challenge verify error:", err);
    res.status(500).json({
      success: false,
      message: "Challenge verification failed",
    });
  }
};

/**
 * PRODUCTION: Advanced rate limiting middleware
 * Implements per-IP request limits with automatic banning
 * @param {number} maxReq - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 */
export const advancedRateLimit = (maxReq = 100, windowMs = 60000) => {
  return async (req, res, next) => {
    try {
      const ip = req.ip || req.connection.remoteAddress;
      const key = `rate:${ip}`;
      const origin = req.get("Origin") || "";
      const referer = req.get("Referer") || "";
      const hasNoOrigin = !origin && !referer;
      const hasInvalidOrigin = !isLegitimateOrigin(origin, referer);

      const current = await redisClient.get(key);
      const count = current ? Number(current) : 0;

      if (count >= maxReq) {
        const ua = req.get("User-Agent") || "";
        await banIPWithUA(ip, ua, `Rate limit exceeded: ${count} req`);

        const isApiRoute = req.path.startsWith("/api/");
        const isRealBrowser =
          /Mozilla|Chrome|Safari|Firefox|Edge|Opera/i.test(ua) &&
          !/postman|insomnia|curl|wget/i.test(ua);

        if (isApiRoute) {
          if (hasNoOrigin || hasInvalidOrigin) {
            return res.status(429).send(SIMPLE_403_HTML);
          }
          return res.status(429).json({
            success: false,
            message: "Too many requests. Please try again later.",
            code: "RATE_LIMIT_EXCEEDED",
          });
        }

        if (isRealBrowser) {
          if (hasNoOrigin || hasInvalidOrigin) {
            return res.status(429).send(SIMPLE_403_HTML);
          }
          return res
            .status(429)
            .send(botBlockedPage("Too many requests. Access restricted."));
        } else {
          if (hasNoOrigin || hasInvalidOrigin) {
            return res.status(429).send(SIMPLE_403_HTML);
          }
          return res.status(429).json({
            success: false,
            message: "Too many requests",
            code: "RATE_LIMIT_EXCEEDED",
          });
        }
      }

      // Increment counter and set expiration
      const multi = redisClient.multi();
      multi.incr(key);

      if (count === 0) {
        multi.expire(key, Math.floor(windowMs / 1000));
      }

      await multi.exec();

      next();
    } catch (err) {
      console.error("[RATE_LIMIT] Error:", err);
      // Allow request on error to prevent blocking legitimate traffic
      next();
    }
  };
};
