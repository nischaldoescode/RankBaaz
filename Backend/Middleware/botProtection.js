import redisClient from "../Config/redis.js";

/**
 * Bot Protection Middleware
 * Challenge-response + behavioral analysis
 */

const BOT_SCORE_THRESHOLD = 50;
const CHALLENGE_TTL = 300; // 5 minutes
const BOT_BAN_TTL = 3600; // 1 hour


/* ----------------------------------------------- *
 *  Calculate bot suspicion score
 *  Returns integer range 0–100
 * ----------------------------------------------- */
const calculateBotScore = (req) => {
  let score = 0;
  const ua = req.get("User-Agent") || "";

  // 1. Missing or suspicious user-agent
  if (!ua) {
    score += 30;
  } else if (/bot|crawler|scraper|curl|wget|python|java|postman/i.test(ua)) {
    score += 25;
  }

  // 2. Missing common browser headers
  const expected = ["Accept", "Accept-Language", "Accept-Encoding"];
  const missing = expected.filter((h) => !req.get(h));
  score += missing.length * 10;

  // 3. Suspicious header order (bots rarely send host first)
  const headerKeys = Object.keys(req.headers);
  if (headerKeys[0] !== "host") {
    score += 5;
  }

  // 4. Missing referer for POST
  if (req.method === "POST" && !req.get("Referer")) {
    score += 15;
  }

  // 5. AJAX without origin
  if (req.get("X-Requested-With") === "XMLHttpRequest" && !req.get("Origin")) {
    score += 10;
  }

  return Math.min(score, 100);
};


/* ----------------------------------------------- *
 *  Check if IP is banned
 * ----------------------------------------------- */
const isBanned = async (ip) => {
  const key = `bot:ban:${ip}`;
  return !!(await redisClient.get(key));
};


/* ----------------------------------------------- *
 *  Ban IP temporarily
 * ----------------------------------------------- */
const banIP = async (ip, reason) => {
  const key = `bot:ban:${ip}`;
  await redisClient.setex(
    key,
    BOT_BAN_TTL,
    JSON.stringify({ reason, bannedAt: Date.now() })
  );

  console.log(`[BOT_PROTECTION] Banned IP ${ip} - ${reason}`);
};


/* ----------------------------------------------- *
 *  BOT PROTECTION MIDDLEWARE
 * ----------------------------------------------- */
export const botProtection = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;

    // 1. Already banned
    if (await isBanned(ip)) {
      return res.status(403).json({
        success: false,
        message: "Access temporarily restricted",
        code: "BOT_DETECTED",
      });
    }

    // 2. Calculate score
    const score = calculateBotScore(req);

    // Low = human
    if (score < 30) return next();

    // Medium = challenge
    if (score < BOT_SCORE_THRESHOLD) {
      const challengeKey = `bot:challenge:${ip}`;
      const passed = await redisClient.get(challengeKey);

      if (passed) return next();

      return res.status(403).json({
        success: false,
        message: "Please complete verification",
        code: "CHALLENGE_REQUIRED",
        data: {
          challengeId: Buffer.from(ip).toString("base64"),
        },
      });
    }

    // High = immediate ban
    await banIP(ip, `High bot score: ${score}`);

    return res.status(403).json({
      success: false,
      message: "Automated access detected",
      code: "BOT_DETECTED",
    });
  } catch (err) {
    console.error("[BOT_PROTECTION] Error:", err);
    next();
  }
};


/* ----------------------------------------------- *
 *  VERIFY CHALLENGE
 * ----------------------------------------------- */
export const verifyChallenge = async (req, res) => {
  try {
    const { challengeId } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    if (!challengeId) {
      return res.status(400).json({
        success: false,
        message: "Challenge ID missing",
      });
    }

    // Validate challengeId belongs to same IP
    const decoded = Buffer.from(challengeId, "base64").toString();

    if (decoded !== ip) {
      return res.status(400).json({
        success: false,
        message: "Invalid challenge",
      });
    }

    const key = `bot:challenge:${ip}`;
    await redisClient.setex(key, CHALLENGE_TTL, "passed");

    res.status(200).json({
      success: true,
      message: "Challenge completed",
    });
  } catch (err) {
    console.error("[BOT_PROTECTION] Challenge verify error:", err);
    res.status(500).json({
      success: false,
      message: "Challenge verification failed",
    });
  }
};


/* ----------------------------------------------- *
 *  ADVANCED RATE LIMITER
 * ----------------------------------------------- */
export const advancedRateLimit = (maxReq = 100, windowMs = 60000) => {
  return async (req, res, next) => {
    try {
      const ip = req.ip || req.connection.remoteAddress;
      const key = `rate:${ip}`;

      const current = await redisClient.get(key);
      const count = current ? Number(current) : 0;

      // Exceeded
      if (count >= maxReq) {
        await banIP(ip, `Rate limit exceeded: ${count} req`);
        return res.status(429).json({
          success: false,
          message: "Too many requests",
          code: "RATE_LIMIT_EXCEEDED",
        });
      }

      // Update counter
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
