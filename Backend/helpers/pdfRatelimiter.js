/**
 * keeps the pdf ratelimiter utility focused and readable.
 */
// ratelimiters.js
import ioredisRatelimit from "ioredis-ratelimit";
import redisClient, {
  isRedisConnectionError,
  summarizeRedisError,
} from "../Config/redis.js"; // your redis client

const createRateLimiter = (options) => {
  const limiter = ioredisRatelimit({
    client: redisClient,
    key: options.keyFn || ((req) => `ratelimit:${options.prefix}:${req.ip}`),
    limit: options.max,
    duration: options.windowMs,
    mode: "binary",
  });

  return async (req, res, next) => {
    if (options.skip && options.skip(req)) return next();
    try {
      await limiter(req);
      next();
    } catch (err) {
      if (isRedisConnectionError(err)) {
        console.warn(
          `[RATE_LIMIT:${options.prefix}] Redis unavailable; allowing request:`,
          summarizeRedisError(err),
        );
        return next();
      }

      return res.status(429).json(options.message);
    }
  };
};

// pdf download limiter
export const pdfDownloadLimiter = createRateLimiter({
  prefix: "pdf-download",
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 80,
  message: {
    success: false,
    message: "Too many PDF download requests. Please try again later.",
  },
  skip: (req) => req.admin?.isAdmin === true,
});
