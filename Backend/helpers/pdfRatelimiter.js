/**
 * provides pdf download rate limiting with redis fallback handling
 *
 * @file backend/helpers/pdfratelimiter.js
 * @module backend/helpers/pdfratelimiter
 * @exports middleware used by pdf download routes
 */
import ioredisRatelimit from "ioredis-ratelimit";
import redisClient, {
  isRedisConnectionError,
  summarizeRedisError,
} from "../Config/redis.js";

/**
 * creates a redis backed limiter that fails open only when redis is unavailable
 *
 * @param {object} options limiter configuration
 * @param {string} options.prefix readable namespace for logs and fallback keys
 * @param {number} options.max maximum requests allowed inside the window
 * @param {number} options.windowMs rolling window duration in milliseconds
 * @param {function} [options.keyFn] optional key builder using authenticated identity
 * @param {function} [options.skip] optional bypass hook for trusted internal paths
 * @param {object} options.message response body returned when the limit is exceeded
 * @returns {function} express middleware that guards a route before the controller runs
 */
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

/**
 * limits pdf downloads by authenticated identity when available
 *
 * @type {function}
 */
export const pdfDownloadLimiter = createRateLimiter({
  prefix: "pdf-download",
  keyFn: (req) =>
    `ratelimit:pdf-download:${
      req.admin?.adminId || req.admin?.userId || req.user?.userId || req.ip
    }`,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 80,
  message: {
    success: false,
    message: "Too many PDF download requests. Please try again later.",
  },
});
