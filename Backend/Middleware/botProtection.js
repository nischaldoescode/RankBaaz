import redisClient from "../Config/redis.js";
import crypto from "crypto";
import { botBlockedPage } from "./ErrorsPages/errorPages.js";

/**
 * Enhanced Bot Protection with Mathematical Challenge
 * - User-Agent specific banning (doesn't ban entire IP)
 * - SHA-256 proof-of-work challenge
 * - Origin validation
 * - Localhost browser whitelisting in development
 */

const BOT_SCORE_THRESHOLD = 60;
const CHALLENGE_TTL = 300;
const BOT_BAN_TTL = 3600;
const CHALLENGE_DIFFICULTY = 4;

// Allowed origins (production domains)
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://localhost:7000",
  "http://localhost:6000",
  "https://api.rankbaaz.com",
  "https://rankbaaz.onrender.com",
  "https://rankbaaz-frontend.onrender.com",
  "https://rankbaaz.com",
  "https://www.rankbaaz.com",
  "https://admin.rankbaaz.com",
  "https://rankbaaz-admin.onrender.com",
  "http://localhost:4173",
];

/**
 * Enhanced bot score calculation
 */
const calculateBotScore = (req) => {
  let score = 0;
  const ua = req.get("User-Agent") || "";
  const origin = req.get("Origin") || req.get("Referer") || "";
  const acceptHeader = req.get("Accept") || "";

  // 1. User-Agent scoring (STRICT)
  if (!ua) {
    score += 40;
  } else if (/curl|wget|python-requests|go-http-client/i.test(ua)) {
    score += 60;
  } else if (/postman|insomnia|httpie|paw|restclient/i.test(ua)) {
    score += 65;
  } else if (/bot|crawler|scraper|spider/i.test(ua)) {
    if (/googlebot|bingbot|slurp|duckduckbot/i.test(ua)) {
      score += 0;
    } else {
      score += 50;
    }
  }

  // 2. Browser-specific checks
  const browserHeaders = ["Accept", "Accept-Language", "Accept-Encoding"];
  const missing = browserHeaders.filter((h) => !req.get(h));
  score += missing.length * 15;

  // 3. Accept header validation
  if (acceptHeader) {
    if (acceptHeader === "*/*" || acceptHeader === "application/json") {
      score += 30;
    }
    if (!acceptHeader.includes("text/html")) {
      score += 20;
    }
  }

  // 4. Sec-Fetch-* headers
  const secFetchSite = req.get("Sec-Fetch-Site");
  const secFetchMode = req.get("Sec-Fetch-Mode");
  const secFetchDest = req.get("Sec-Fetch-Dest");

  if (!secFetchSite && !secFetchMode && !secFetchDest) {
    score += 25;
  }

  // 5. Origin validation
  if (origin) {
    const isValidOrigin = ALLOWED_ORIGINS.some((allowed) =>
      origin.toLowerCase().includes(allowed.toLowerCase())
    );

    if (!isValidOrigin) {
      try {
        const originDomain = new URL(origin).hostname;
        const isMimicking = ALLOWED_ORIGINS.some(
          (allowed) =>
            originDomain.includes(new URL(allowed).hostname) &&
            originDomain !== new URL(allowed).hostname
        );

        if (isMimicking) {
          score += 40;
        } else {
          score += 15;
        }
      } catch (e) {
        score += 10;
      }
    }
  } else {
    if (req.method !== "GET") {
      score += 20;
    }
  }

  // 6. Connection type
  const connection = req.get("Connection");
  if (connection && connection.toLowerCase() === "close") {
    score += 10;
  }

  return Math.min(score, 100);
};

/**
 * Check if IP+UserAgent is banned
 */
const isBannedWithUA = async (ip, userAgent) => {
  // Check for IP-only ban (legacy/catch-all)
  const ipOnlyKey = `bot:ban:${ip}`;
  const ipOnlyBan = await redisClient.get(ipOnlyKey);
  if (ipOnlyBan) return true;

  // Check for IP+UA specific ban
  const uaHash = crypto.createHash("md5").update(userAgent || "unknown").digest("hex").substring(0, 8);
  const key = `bot:ban:${ip}:${uaHash}`;
  return !!(await redisClient.get(key));
};

/**
 * Ban specific IP+UserAgent combination
 */
const banIPWithUA = async (ip, userAgent, reason) => {
  // Create unique key combining IP and User-Agent hash
  const uaHash = crypto.createHash("md5").update(userAgent || "unknown").digest("hex").substring(0, 8);
  const key = `bot:ban:${ip}:${uaHash}`;
  
  await redisClient.setex(
    key,
    BOT_BAN_TTL,
    JSON.stringify({ 
      reason, 
      bannedAt: Date.now(),
      userAgent: userAgent || "unknown",
      ip 
    })
  );

  console.log(`[BOT_PROTECTION] Banned ${ip} with UA ${userAgent?.substring(0, 30)} - ${reason}`);
};

/**
 * Generate mathematical challenge
 */
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
    JSON.stringify(challengeData)
  );

  return {
    seed,
    difficulty: CHALLENGE_DIFFICULTY,
    timestamp,
  };
};

/**
 * Verify mathematical challenge solution
 */
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
 * BOT PROTECTION MIDDLEWARE
 */
export const botProtection = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const ua = req.get("User-Agent") || "";
    
    // DEVELOPMENT: Skip bot protection for localhost browsers
    if (process.env.NODE_ENV === "development") {
      const isLocalhost = ip === "::1" || ip === "127.0.0.1" || ip === "::ffff:127.0.0.1";
      const isRealBrowser = /Mozilla|Chrome|Safari|Firefox|Edge|Opera/i.test(ua) && 
                            !/postman|insomnia|curl|wget/i.test(ua);
      
      if (isLocalhost && isRealBrowser) {
        console.log(`[BOT_PROTECTION] Development mode: Allowing localhost browser`);
        return next();
      }
    }
    
    const isRealBrowser = /Mozilla|Chrome|Safari|Firefox|Edge|Opera/i.test(ua) && 
                          !/postman|insomnia|curl|wget/i.test(ua);
    const isApiRoute = req.path.startsWith("/api/");

    // 1. Check if this specific IP+UA combination is banned
    if (await isBannedWithUA(ip, ua)) {
      console.log(`[BOT_PROTECTION] Banned IP+UA attempted access: ${ip}`);

      if (isApiRoute || !isRealBrowser) {
        return res.status(403).send(
          botBlockedPage("Your access has been temporarily restricted due to automated activity.")
        );
      } else {
        return res.status(403).send(
          botBlockedPage("Your access has been temporarily restricted due to suspicious activity.")
        );
      }
    }

    // 2. Check if challenge already passed for this IP
    const passedKey = `bot:challenge:passed:${ip}`;
    const hasPassed = await redisClient.get(passedKey);

    if (hasPassed) {
      return next();
    }

    // 3. Calculate bot score
    const score = calculateBotScore(req);

    console.log(
      `[BOT_PROTECTION] IP: ${ip}, Score: ${score}, UA: ${ua.substring(0, 50)}`
    );

    // Low score = human-like
    if (score < 30) {
      return next();
    }

    // Medium score = challenge required
    if (score < BOT_SCORE_THRESHOLD) {
      const challenge = await generateChallenge(ip);

      if (isApiRoute || !isRealBrowser) {
        return res.status(403).json({
          success: false,
          message: "Security verification required. Please complete the challenge.",
          code: "CHALLENGE_REQUIRED",
          data: {
            seed: challenge.seed,
            difficulty: challenge.difficulty,
            instruction: `Find a nonce such that SHA-256(seed + nonce) starts with ${CHALLENGE_DIFFICULTY} zeros`,
          },
        });
      } else {
        return res.status(403).send(
          botBlockedPage("Security verification required. Please use a standard web browser to access this site.")
        );
      }
    }

    // High score = immediate ban (BAN THE SPECIFIC USER-AGENT, NOT THE IP)
    await banIPWithUA(ip, ua, `High bot score: ${score}`);

    console.log(`[BOT_PROTECTION] Auto-banned: ${ip} (Score: ${score})`);

    if (isApiRoute || !isRealBrowser) {
      return res.status(403).send(
          botBlockedPage("Automated access detected. Access Denied.")
        );
    } else {
      return res.status(403).send(
        botBlockedPage("Automated access detected. Please use a standard web browser.")
      );
    }
  } catch (err) {
    console.error("[BOT_PROTECTION] Error:", err);
    next();
  }
};

/**
 * VERIFY CHALLENGE ENDPOINT
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
 * ADVANCED RATE LIMITER
 */
export const advancedRateLimit = (maxReq = 100, windowMs = 60000) => {
  return async (req, res, next) => {
    try {
      const ip = req.ip || req.connection.remoteAddress;
      const key = `rate:${ip}`;

      const current = await redisClient.get(key);
      const count = current ? Number(current) : 0;

      if (count >= maxReq) {
        const ua = req.get("User-Agent") || "";
        await banIPWithUA(ip, ua, `Rate limit exceeded: ${count} req`);
        return res.status(429).send(
          botBlockedPage("Too many requests. Access restricted.")
        );
      }

      const multi = redisClient.multi();
      multi.incr(key);

      if (count === 0) {
        multi.expire(key, Math.floor(windowMs / 1000));
      }

      await multi.exec();

      next();
    } catch (err) {
      console.error("[RATE_LIMIT] Error:", err);
      next();
    }
  };
};