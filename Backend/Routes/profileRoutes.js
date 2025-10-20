import express from "express";
import {
  getPublicProfile,
  getUserSettings,
  getGlobalLeaderboard,
  getUserLeaderboardPosition,
  searchUsernames,
} from "../Controllers/profileController.js";
import {authenticateUser as authMiddleware } from "../Middleware/auth.js"

const router = express.Router();

// Public routes
router.get("/:username", getPublicProfile);
router.get("/leaderboard/global", getGlobalLeaderboard);
router.get("/search", searchUsernames);

// Protected routes
router.get("/settings", authMiddleware, getUserSettings);
router.get("/leaderboard/position", authMiddleware, getUserLeaderboardPosition);

export default router;