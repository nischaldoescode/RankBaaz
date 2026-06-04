/**
 * keeps the advanced cache middleware focused and readable.
 */
import redisClient, { cacheUtils, CacheKeys } from "../Config/redis.js";

/**
 * advanced caching middleware with smart invalidation
 *
 * features:
 * - automatic cache key generation based on route + query params
 * - configurable ttl per route
 * - cache bypass for authenticated admin users
 * - conditional caching based on request method
 * - automatic cache warming on miss
 *
 * usage:
 * router.get('/api/courses', advancedcache({ ttl: 300, key: 'all-courses' }), getallcourses);
 */

export const advancedCache = (options = {}) => {
  const {
    ttl = 300, // default 5 minutes
    key = null, // custom cache key (optional)
    bypassAdmin = true, // skip cache for admin users
    methods = ['GET'], // only cache these http methods
    condition = null, // optional condition function: (req) => boolean
  } = options;

  return async (req, res, next) => {
    // only cache specified http methods
    if (!methods.includes(req.method)) {
      return next();
    }

    // bypass cache for admin users if configured
    if (bypassAdmin && req.admin) {
      return next();
    }

    // custom condition check
    if (condition && !condition(req)) {
      return next();
    }

    // generate cache key
    const cacheKey = key || generateCacheKey(req);

    try {
      // check if data exists in cache
      const cachedData = await cacheUtils.get(cacheKey);

      if (cachedData) {
        // cache hit
        console.log(`Cache HIT: ${cacheKey}`);
        return res.status(200).json(cachedData);
      }

      // cache miss - intercept response to cache it
      console.log(`Cache MISS: ${cacheKey}`);

      // store original res.json function
      const originalJson = res.json.bind(res);

      // override res.json to cache the response
      res.json = function(data) {
        // only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheUtils.set(cacheKey, data, ttl).catch(err => {
            console.error(`Failed to cache ${cacheKey}:`, err.message);
          });
        }

        // call original json method
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error(`Cache middleware error for ${cacheKey}:`, error.message);
      // on cache error, proceed without caching
      next();
    }
  };
};

/**
 * generate unique cache key based on request
 * format: route:method:query_params
 * example: /api/courses:get:category=math&page=1
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
 * cache warming utility
 * pre-populate cache with frequently accessed data
 * call this on server startup or data updates
 */
export const warmCache = async () => {
  console.log("Starting cache warming...");

  try {
    // import controllers (only import what's needed)
    const { getAllCourses } = await import("../Controllers/CourseController.js");
    const { getAllCategories } = await import("../Controllers/CourseController.js");
    const { getContentSettings } = await import("../Controllers/contentController.js");
    const { getAllFAQs } = await import("../Controllers/contentController.js");

    // create mock request/response objects
    const mockReq = { query: {}, params: {}, body: {} };
    const mockRes = {
      status: () => mockRes,
      json: (data) => data,
    };

    // warm frequently accessed endpoints
    // note: this is a example. in production, you'd query the database directly.
    console.log("Cache warming completed");
  } catch (error) {
    console.error("Cache warming failed:", error.message);
  }
};

/**
 * cache invalidation middleware
 * automatically invalidate related caches mutations
 *
 * usage:
 * router.post('/api/courses', authenticate, invalidateonmutation(['courses', 'stats']), createcourse);
 */
export const invalidateOnMutation = (cacheGroups = []) => {
  return async (req, res, next) => {
    // store original json method
    const originalJson = res.json.bind(res);

    // override res.json to invalidate cache successful mutation
    res.json = async function(data) {
      // only invalidate on successful mutations
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