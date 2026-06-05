/**
 * configures redis for backend startup, shared connections, cache helpers, and production fallbacks
 *
 * @file backend/config/redis.js
 * @module backend/config/redis
 * @exports redis client, cache helpers, health checks, and invalidation helpers
 */
import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redisConnectionUrl =
  process.env.REDIS_URL ||
  process.env.REDIS_PRIVATE_URL ||
  "redis://127.0.0.1:6379";

const REDIS_CONNECT_TIMEOUT_MS = Number(
  process.env.REDIS_CONNECT_TIMEOUT_MS || 5000,
);
const REDIS_COMMAND_TIMEOUT_MS = Number(
  process.env.REDIS_COMMAND_TIMEOUT_MS || 1500,
);
const REDIS_CIRCUIT_OPEN_MS = Number(
  process.env.REDIS_CIRCUIT_OPEN_MS || 15000,
);
const REDIS_ERROR_LOG_INTERVAL_MS = Number(
  process.env.REDIS_ERROR_LOG_INTERVAL_MS || 30000,
);

let redisReady = false;
let redisCircuitOpenUntil = 0;
let lastRedisErrorLog = 0;

export const isRedisConnectionError = (error) => {
  const message = String(error?.message || "");
  const code = String(error?.code || "");

  return (
    code === "REDIS_CIRCUIT_OPEN" ||
    /Command timed out/i.test(message) ||
    /Connection is closed/i.test(message) ||
    /Connection timeout/i.test(message) ||
    /max retries per request/i.test(message) ||
    /Stream isn't writeable/i.test(message) ||
    /enableOfflineQueue/i.test(message) ||
    ["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "EAI_AGAIN", "ENOTFOUND"].includes(code)
  );
};

export const summarizeRedisError = (error) => ({
  message: error?.message || "Redis unavailable",
  code: error?.code,
  address: error?.address,
  port: error?.port,
});

const logRedisWarning = (label, error) => {
  const now = Date.now();
  if (now - lastRedisErrorLog < REDIS_ERROR_LOG_INTERVAL_MS) return;

  lastRedisErrorLog = now;
  console.warn(label, summarizeRedisError(error));
};

if (process.env.NODE_ENV === "production" && !process.env.REDIS_URL && !process.env.REDIS_PRIVATE_URL) {
  console.warn(
    "REDIS_URL is not set in production. Falling back to localhost will fail on Render unless Redis runs in the same service.",
  );
}

/**
 * Redis client configuration for production-grade caching
 * Features:
 * - Connection pooling for high concurrency
 * - Automatic reconnection with exponential backoff
 * - Command timeout protection
 * - Pipeline support for bulk operations
 */
const redisClient = new Redis(redisConnectionUrl, {
  // Connection pool settings
  maxRetriesPerRequest: 1,
  enableReadyCheck: true,
  enableOfflineQueue: false,

  // Retry strategy with exponential backoff
  retryStrategy: (times) => {
    const delay = Math.min(500 + times * 250, 10000);
    if (times <= 3 || times % 10 === 0) {
      console.warn(`Redis reconnection attempt ${times}, waiting ${delay}ms`);
    }
    return delay;
  },

  // Connection timeout protection
  connectTimeout: REDIS_CONNECT_TIMEOUT_MS,

  // Command timeout (prevent hung requests)
  commandTimeout: REDIS_COMMAND_TIMEOUT_MS,

  // Keep-alive to prevent connection drops
  keepAlive: 30000,

  // Keep command failure paths predictable when Redis is unavailable
  enableAutoPipelining: false,

  // Lazy connection (connect on first command)
  lazyConnect: false,

  ...(redisConnectionUrl.startsWith("rediss://") ||
  process.env.REDIS_TLS === "true"
    ? {
        tls: {
          rejectUnauthorized:
            process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== "false",
        },
      }
    : {}),
});

const sendCommand = redisClient.sendCommand.bind(redisClient);
redisClient.sendCommand = (command, stream) => {
  if (Date.now() < redisCircuitOpenUntil) {
    const error = new Error("Redis circuit open after recent connection failure");
    error.code = "REDIS_CIRCUIT_OPEN";
    return Promise.reject(error);
  }

  return sendCommand(command, stream).catch((error) => {
    if (isRedisConnectionError(error)) {
      redisReady = false;
      redisCircuitOpenUntil = Date.now() + REDIS_CIRCUIT_OPEN_MS;
      logRedisWarning("Command failed; opening short circuit breaker:", error);
    }

    throw error;
  });
};

export const isRedisReady = () =>
  redisReady && redisClient.status === "ready" && Date.now() >= redisCircuitOpenUntil;

export const getRedisHealth = () => ({
  ready: isRedisReady(),
  status: redisClient.status,
  circuitOpenUntil: redisCircuitOpenUntil || null,
  commandTimeoutMs: REDIS_COMMAND_TIMEOUT_MS,
  connectTimeoutMs: REDIS_CONNECT_TIMEOUT_MS,
});

/**
 * Connection event handlers
 */
redisClient.on("connect", () => {
  console.log("Redis connected successfully");
});

redisClient.on("ready", () => {
  redisReady = true;
  redisCircuitOpenUntil = 0;
  console.log("Redis is ready to accept commands");
});

redisClient.on("error", (err) => {
  redisReady = false;
  logRedisWarning("Connection error:", err);
});

redisClient.on("close", () => {
  redisReady = false;
  console.warn("Redis connection closed");
});

redisClient.on("end", () => {
  redisReady = false;
  console.warn("Redis connection ended");
});

redisClient.on("reconnecting", (delay) => {
  console.log(`Redis reconnecting in ${delay}ms`);
});

/**
 * Cache key generation utilities
 * Ensures consistent, collision-free cache keys across the application
 */
export const CacheKeys = {
  // User-related cache keys
  user: (userId) => `user:${userId}`,
  userProfile: (username) => `profile:${username}`,
  userSettings: (userId) => `settings:${userId}`,
  userStats: (userId) => `stats:${userId}`,

  // Course-related cache keys
  course: (courseId) => `course:${courseId}`,
  allCourses: () => `courses:all`,
  courseQuestions: (courseId) => `course:${courseId}:questions`,
  courseStats: () => `admin:stats`,

  // Category cache keys
  category: (categoryId) => `category:${categoryId}`,
  allCategories: () => `categories:all`,

  // Content management cache keys
  contentSettings: () => `content:settings`,
  faqs: () => `content:faqs`,
  contactInfo: () => `content:contact`,
  legalPage: (type) => `legal:${type}`,

  // Leaderboard cache keys
  leaderboard: (courseId) => `leaderboard:${courseId}`,
  globalLeaderboard: () => `leaderboard:global`,
  userRank: (userId) => `rank:${userId}`,

  // Test-related cache keys
  testHistory: (userId) => `test:history:${userId}`,
  testResult: (testId) => `test:result:${testId}`,

  // Preview cache keys
  homePreview: () => `preview:home`,
  aboutPreview: () => `preview:about`,
  footerPreview: () => `preview:footer`,

  // Sitemap cache
  sitemap: () => `sitemap:profiles`,
};

/**
 * Cache invalidation utilities
 * Provides granular cache clearing for data updates
 */
export const invalidateCache = {
  /**
   * Invalidate all user-related caches
   * Call this when user data changes (profile update, coins, etc.)
   */
  user: async (userId, username = null) => {
    const keys = [
      CacheKeys.user(userId),
      CacheKeys.userStats(userId),
      CacheKeys.userSettings(userId),
    ];

    if (username) {
      keys.push(CacheKeys.userProfile(username));
    }

    await redisClient.del(...keys);
    console.log(`Invalidated cache for user ${userId}`);
  },

  /**
   * Invalidate course-related caches
   * Call this when course data changes (edit, questions added, etc.)
   */
  course: async (courseId) => {
    await redisClient.del(
      CacheKeys.course(courseId),
      CacheKeys.courseQuestions(courseId),
      CacheKeys.allCourses(),
      CacheKeys.courseStats()
    );
    console.log(`Invalidated cache for course ${courseId}`);
  },

  /**
   * Invalidate all courses cache
   * Call this when any course is added/removed or categories change
   */
  allCourses: async () => {
    await redisClient.del(
      CacheKeys.allCourses(),
      CacheKeys.allCategories(),
      CacheKeys.courseStats()
    );
    console.log(`Invalidated all courses cache`);
  },

  /**
   * Invalidate content management caches
   * Call this when CMS content is updated
   */
  content: async () => {
    await redisClient.del(
      CacheKeys.contentSettings(),
      CacheKeys.faqs(),
      CacheKeys.contactInfo(),
      CacheKeys.homePreview(),
      CacheKeys.aboutPreview(),
      CacheKeys.footerPreview()
    );
    console.log(`Invalidated content cache`);
  },

  /**
   * Invalidate legal page cache
   * Call this when legal pages are updated
   */
  legalPage: async (type) => {
    await redisClient.del(CacheKeys.legalPage(type));
    console.log(`Invalidated legal page cache: ${type}`);
  },

  /**
   * Invalidate leaderboard caches
   * Call this when test scores are submitted or user ranking changes
   */
  leaderboard: async (courseId = null) => {
    if (courseId) {
      await redisClient.del(CacheKeys.leaderboard(courseId));
      console.log(`Invalidated leaderboard cache for course ${courseId}`);
    } else {
      const keys = await redisClient.keys("leaderboard:*");
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
      console.log(`Invalidated all leaderboard caches`);
    }
  },

  /**
   * Invalidate test-related caches
   * Call this when user completes a test
   */
  test: async (userId, testId = null) => {
    const keys = [CacheKeys.testHistory(userId)];
    if (testId) {
      keys.push(CacheKeys.testResult(testId));
    }
    await redisClient.del(...keys);
    console.log(`Invalidated test cache for user ${userId}`);
  },

  /**
   * Clear all caches (use sparingly, only for critical updates)
   */
  all: async () => {
    await redisClient.flushdb();
    console.log(`WARNING: All Redis cache cleared`);
  },
};

/**
 * Generic cache get/set utilities with automatic expiration
 */
export const cacheUtils = {
  /**
   * Get cached data
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} - Parsed JSON data or null if not found
   */
  get: async (key) => {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Cache GET error for key ${key}:`, error.message);
      return null;
    }
  },

  /**
   * Set cached data with TTL
   * @param {string} key - Cache key
   * @param {any} value - Data to cache (will be JSON stringified)
   * @param {number} ttl - Time to live in seconds (default: 300 = 5 minutes)
   */
  set: async (key, value, ttl = 300) => {
    try {
      await redisClient.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error(`Cache SET error for key ${key}:`, error.message);
    }
  },

  /**
   * Delete specific cache key
   * @param {string} key - Cache key to delete
   */
  del: async (key) => {
    try {
      await redisClient.del(key);
    } catch (error) {
      console.error(`Cache DEL error for key ${key}:`, error.message);
    }
  },

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  exists: async (key) => {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Cache EXISTS error for key ${key}:`, error.message);
      return false;
    }
  },
};

/**
 * Graceful shutdown handler
 * Ensures Redis connection is properly closed on application exit
 */
const gracefulShutdown = async (signal) => {
  console.log(`${signal} received, closing Redis connection...`);
  try {
    await redisClient.quit();
    console.log("Redis connection closed gracefully");
  } catch (error) {
    console.error("Error closing Redis connection:", error.message);
  }
};

export default redisClient;
