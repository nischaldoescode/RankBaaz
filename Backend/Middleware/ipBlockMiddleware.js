/**
 * handles ip block middleware checks before controllers receive the request
 *
 * @file backend/middleware/ipblockmiddleware.js
 * @module backend/middleware/ipblockmiddleware
 * @exports middleware functions used by protected backend routes
 */

import IpBlock from "../Models/IpBlock.js";

/**
 * checks incoming request ip against blocked ip list
 * skips admin routes and health check
 */
export const checkIpBlock = async (req, res, next) => {
  try {
    // skip for admin routes and health
    if (
      req.path.startsWith("/api/admin") ||
      req.path === "/health" ||
      req.path === "/api/security/verify-challenge"
    ) {
      return next();
    }

    // collect all ips from forwarded chain to catch vpn hops
    const forwardedIps = req.headers["x-forwarded-for"]
      ? req.headers["x-forwarded-for"].split(",").map((i) => i.trim())
      : [];

    const directIp = req.socket?.remoteAddress || req.ip;
    const allIps = [...new Set([...forwardedIps, directIp].filter(Boolean))];

    if (allIps.length === 0) return next();

    // check if any ip in the chain is blocked
    const block = await IpBlock.findOne({ ip: { $in: allIps } }).lean();
    if (!block) return next();

    // use the matched ip for the response
    const ip = block.ip;

    // if block has expiresat and it has passed, treat as unblocked
    // (ttl index handles deletion but there may be a small window)
    if (block.expiresAt && new Date(block.expiresAt) < new Date()) {
      return next();
    }

    return res.status(403).json({
      success: false,
      code: "IP_BLOCKED",
      message: "Your IP address has been blocked.",
      expiresAt: block.expiresAt,
    });
  } catch (error) {
    // do not block traffic if middleware errors
    console.error("IP block check error:", error);
    next();
  }
};
