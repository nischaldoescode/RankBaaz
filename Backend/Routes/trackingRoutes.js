import express from "express";
import redisClient from "../Config/redis.js";

const router = express.Router();

/**
 * tracking link endpoint
 * logs visit data and redirects to home
 * 
 * stores in redis with 1 hour expiry
 * captures ip, user agent, timestamp
 */
router.get("/:trackingId", async (req, res) => {
  try {
    const { trackingId } = req.params;
    
    // validate tracking id format (4 alphanumeric characters)
    if (!/^[a-z0-9]{4}$/i.test(trackingId)) {
      return res.redirect(process.env.FRONTEND_URL || "https://vidhgrow.online");
    }

    // extract visitor metadata
    const visitData = {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get("User-Agent") || "unknown",
      timestamp: new Date().toISOString(),
      referer: req.get("Referer") || "direct",
      acceptLanguage: req.get("Accept-Language") || "unknown",
    };

    // store in redis with 1 hour expiry
    const redisKey = `track:${trackingId}`;
    
    // get existing visits or create new array
    const existing = await redisClient.get(redisKey);
    const visits = existing ? JSON.parse(existing) : [];
    
    // add new visit
    visits.push(visitData);
    
    // save with 1 hour ttl (3600 seconds)
    await redisClient.setex(redisKey, 3600, JSON.stringify(visits));

    console.log(`[TRACKING] Visit logged for ${trackingId}:`, visitData.ip);

    // redirect to frontend
    return res.redirect(process.env.FRONTEND_URL || "https://vidhgrow.online");
    
  } catch (error) {
    console.error("[TRACKING] Error logging visit:", error);
    return res.redirect(process.env.FRONTEND_URL || "https://vidhgrow.online");
  }
});

/**
 * admin endpoint to view tracking data
 * requires admin authentication
 */
router.get("/admin/view/:trackingId", async (req, res) => {
  try {
    // check admin session
    if (!req.session?.adminId) {
      return res.status(401).json({
        success: false,
        message: "admin authentication required",
      });
    }

    const { trackingId } = req.params;
    
    // validate format
    if (!/^[a-z0-9]{4}$/i.test(trackingId)) {
      return res.status(400).json({
        success: false,
        message: "invalid tracking id format",
      });
    }

    // fetch from redis
    const redisKey = `track:${trackingId}`;
    const data = await redisClient.get(redisKey);

    if (!data) {
      return res.json({
        success: true,
        trackingId,
        visits: [],
        message: "no visits recorded or data expired",
      });
    }

    const visits = JSON.parse(data);

    // get ttl remaining
    const ttl = await redisClient.ttl(redisKey);

    return res.json({
      success: true,
      trackingId,
      totalVisits: visits.length,
      expiresIn: ttl > 0 ? `${Math.floor(ttl / 60)} minutes` : "expired",
      visits,
    });

  } catch (error) {
    console.error("[TRACKING] Error fetching data:", error);
    return res.status(500).json({
      success: false,
      message: "failed to fetch tracking data",
    });
  }
});

/**
 * admin endpoint to list all active tracking ids
 */
router.get("/admin/list/all", async (req, res) => {
  try {
    // check admin session
    if (!req.session?.adminId) {
      return res.status(401).json({
        success: false,
        message: "admin authentication required",
      });
    }

    // find all tracking keys in redis
    const keys = await redisClient.keys("track:*");
    
    const trackingIds = keys.map(key => key.replace("track:", ""));

    return res.json({
      success: true,
      totalActive: trackingIds.length,
      trackingIds,
    });

  } catch (error) {
    console.error("[TRACKING] Error listing tracking ids:", error);
    return res.status(500).json({
      success: false,
      message: "failed to list tracking ids",
    });
  }
});

export default router;