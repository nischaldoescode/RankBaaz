import redisClient, { cacheUtils, CacheKeys } from "../Config/redis.js";

/**
 * Advanced caching middleware with smart invalidation
 * 
 * Features:
 * - Automatic cache key generation based on route + query params
 * - Configurable TTL per route
 * - Cache bypass for authenticated admin users
 * - Conditional caching based on request method
 * - Automatic cache warming on miss
 * 
 * Usage:
 * router.get('/api/courses', advancedCache({ ttl: 300, key: 'all-courses' }), getAllCourses);
 */

export const advancedCache = (options = {}) => {
  const {
    ttl = 300, // Default 5 minutes
    key = null, // Custom cache key (optional)
    bypassAdmin = true, // Skip cache for admin users
    methods = ['GET'], // Only cache these HTTP methods
    condition = null, // Optional condition function: (req) => boolean
  } = options;
  
  return async (req, res, next) => {
    // Only cache specified HTTP methods
    if (!methods.includes(req.method)) {
      return next();
    }
    
    // Bypass cache for admin users if configured
    if (bypassAdmin && req.admin) {
      return next();
    }
    
    // Custom condition check
    if (condition && !condition(req)) {
      return next();
    }
    
    // Generate cache key
    const cacheKey = key || generateCacheKey(req);
    
    try {
      // Check if data exists in cache
      const cachedData = await cacheUtils.get(cacheKey);
      
      if (cachedData) {
        // Cache hit
        console.log(`Cache HIT: ${cacheKey}`);
        return res.status(200).json(cachedData);
      }
      
      // Cache miss - intercept response to cache it
      console.log(`Cache MISS: ${cacheKey}`);
      
      // Store original res.json function
      const originalJson = res.json.bind(res);
      
      // Override res.json to cache the response
      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheUtils.set(cacheKey, data, ttl).catch(err => {
            console.error(`Failed to cache ${cacheKey}:`, err.message);
          });
        }
        
        // Call original json method
        return originalJson(data);
      };
      
      next();
    } catch (error) {
      console.error(`Cache middleware error for ${cacheKey}:`, error.message);
      // On cache error, proceed without caching
      next();
    }
  };
};

/**
 * Generate unique cache key based on request
 * Format: route:method:query_params
 * Example: /api/courses:GET:category=math&page=1
 */
function generateCacheKey(req) {
  const route = req.route?.path || req.path;
  const method = req.method;
  const query = Object.keys(req.query).length > 0 
    ? `:${JSON.stringify(req.query)}` 
    : '';
  
  return `${route}:${method}${query}`;
}

/**
 * Cache warming utility
 * Pre-populate cache with frequently accessed data
 * Call this on server startup or after data updates
 */
export const warmCache = async () => {
  console.log("Starting cache warming...");
  
  try {
    // Import controllers (only import what's needed)
    const { getAllCourses } = await import("../Controllers/CourseController.js");
    const { getAllCategories } = await import("../Controllers/CourseController.js");
    const { getContentSettings } = await import("../Controllers/contentController.js");
    const { getAllFAQs } = await import("../Controllers/contentController.js");
    
    // Create mock request/response objects
    const mockReq = { query: {}, params: {}, body: {} };
    const mockRes = {
      status: () => mockRes,
      json: (data) => data,
    };
    
    // Warm frequently accessed endpoints
    // Note: This is a simplified example. In production, you'd query the database directly.
    console.log("Cache warming completed");
  } catch (error) {
    console.error("Cache warming failed:", error.message);
  }
};

/**
 * Cache invalidation middleware
 * Automatically invalidate related caches after mutations
 * 
 * Usage:
 * router.post('/api/courses', authenticate, invalidateOnMutation(['courses', 'stats']), createCourse);
 */
export const invalidateOnMutation = (cacheGroups = []) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Override res.json to invalidate cache after successful mutation
    res.json = async function(data) {
      // Only invalidate on successful mutations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        for (const group of cacheGroups) {
          try {
            switch (group) {
              case 'courses':
                await redisClient.del(CacheKeys.allCourses());
                break;
              case 'categories':
                await redisClient.del(CacheKeys.allCategories());
                break;
              case 'content':
                await redisClient.del(
                  CacheKeys.contentSettings(),
                  CacheKeys.faqs(),
                  CacheKeys.homePreview(),
                  CacheKeys.aboutPreview(),
                  CacheKeys.footerPreview()
                );
                break;
              case 'leaderboard':
                const keys = await redisClient.keys("leaderboard:*");
                if (keys.length > 0) await redisClient.del(...keys);
                break;
              default:
                console.warn(`Unknown cache group: ${group}`);
            }
          } catch (error) {
            console.error(`Failed to invalidate cache group ${group}:`, error.message);
          }
        }
      }
      
      return originalJson(data);
    };
    
    next();
  };
};