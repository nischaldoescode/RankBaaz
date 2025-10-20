import redisClient from "../Config/redis.js";

const CACHE_TTL = {
  STATS: 300,       // 5 minutes
  LEADERBOARD: 180, // 3 minutes
  USER_STATS: 120,  // 2 minutes
};

export const cacheStats = (keyPrefix, ttl = CACHE_TTL.STATS) => {
  return async (req, res, next) => {
    try {
      const cacheKey = `${keyPrefix}:${JSON.stringify(req.query)}`;
      const cached = await redisClient.get(cacheKey);

      if (cached) return res.json(JSON.parse(cached));

      const originalJson = res.json.bind(res);
      res.json = (data) => {
        if (data.success) {
          redisClient.setex(cacheKey, ttl, JSON.stringify(data))
            .catch(err => console.error("Cache set error:", err));
        }
        return originalJson(data);
      };

      next();
    } catch (err) {
      console.error("Cache middleware error:", err);
      next();
    }
  };
};
