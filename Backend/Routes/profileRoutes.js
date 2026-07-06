/**
 * mounts profile routes api endpoints and keeps middleware order explicit for each request path
 *
 * @file backend/routes/profileroutes.js
 * @module backend/routes/profileroutes
 * @exports express router mounted by the api server
 */

import express from "express";
import {
  getPublicProfile,
  getUserSettings,
  getGlobalLeaderboard,
  getUserLeaderboardPosition,
  searchUsernames,
} from "../Controllers/profileController.js";
import { authenticateUser as authMiddleware } from "../Middleware/auth.js";
import { advancedCache } from "../Middleware/advancedCache.js";
import {
  getSigningSecretEndpoint,
  verifyRequestSignature,
} from "../Middleware/requestSignature.js";
const router = express.Router();

// public routes
router.get(
  "/leaderboard/global",
  advancedCache({ ttl: 60, key: "leaderboard:global" }),
  getGlobalLeaderboard
);
router.get("/search", advancedCache({ ttl: 120 }), searchUsernames);
router.get("/:username", advancedCache({ ttl: 180 }), getPublicProfile);

// protected routes
router.get(
  "/settings",
  authMiddleware,
  verifyRequestSignature,
  getUserSettings
);
router.get(
  "/leaderboard/position",
  authMiddleware,
  verifyRequestSignature,
  getUserLeaderboardPosition
);

export default router;
