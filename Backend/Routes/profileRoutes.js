import express from "express";
import {
  getPublicProfile,
  getUserSettings,
  getGlobalLeaderboard,
  getUserLeaderboardPosition,
  searchUsernames,
} from "../Controllers/profileController.js";
import {authenticateUser as authMiddleware } from "../Middleware/auth.js"
import { advancedCache } from '../Middleware/advancedCache.js';

const router = express.Router();

// Public routes
router.get("/:username", advancedCache({ ttl: 180 }), getPublicProfile);
router.get("/leaderboard/global", advancedCache({ ttl: 60, key: 'leaderboard:global' }), getGlobalLeaderboard);
router.get("/search", advancedCache({ ttl: 120 }), searchUsernames);

// Protected routes
router.get("/settings", authMiddleware, getUserSettings);
router.get("/leaderboard/position", authMiddleware, getUserLeaderboardPosition);

export default router;