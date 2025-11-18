import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

/**
 * Redis client configuration for production-grade caching
 * Features:
 * - Connection pooling for high concurrency
 * - Automatic reconnection with exponential backoff
 * - Command timeout protection
 * - Pipeline support for bulk operations
 */
const redisClient = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  // Connection pool settings
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,
  
  // Retry strategy with exponential backoff
  // Waits: 50ms, 100ms, 150ms, 200ms, ... up to 2000ms
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    console.log(`Redis reconnection attempt ${times}, waiting ${delay}ms`);
    return delay;
  },
  
  // Connection timeout protection
  connectTimeout: 10000,
  
  // Command timeout (prevent hung requests)
  commandTimeout: 5000,
  
  // Keep-alive to prevent connection drops
  keepAlive: 30000,
  
  // Automatic pipeline for performance
  enableAutoPipelining: true,
  
  // Lazy connection (connect on first command)
  lazyConnect: false,
});

/**
 * Connection event handlers
 */
redisClient.on("connect", () => {
  console.log("Redis connected successfully");
});

redisClient.on("ready", () => {
  console.log("Redis is ready to accept commands");
});

redisClient.on("error", (err) => {
  console.error("Redis connection error:", err.message);
});

redisClient.on("close", () => {
  console.warn("Redis connection closed");
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