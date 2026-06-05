/**
 * provides stats limiter helpers shared by controllers, middleware, and services
 *
 * @file backend/helpers/statslimiter.js
 * @module backend/helpers/statslimiter
 * @exports module members used by the related app runtime
 */

import rateLimit from "express-rate-limit";

export const statsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20,                  // max 20 requests per minute
  message: {
    success: false,
    message: "Too many stats requests. Please wait.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
