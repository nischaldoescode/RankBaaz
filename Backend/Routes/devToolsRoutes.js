import express from "express";
import {
  recordViolation,
  checkCourseBan,
  getViolationStats,
  adminBanUser,
  adminUnbanUser,
} from "../Controllers/devToolsController.js";
import { authenticateUser, authenticateAdmin } from "../Middleware/auth.js";

const router = express.Router();

// User routes
router.post("/violation", authenticateUser, recordViolation);
router.get("/check-ban/:courseId", authenticateUser, checkCourseBan);

// Admin routes
router.get("/admin/stats", authenticateAdmin, getViolationStats);
router.post("/admin/ban", authenticateAdmin, adminBanUser);
router.post("/admin/unban", authenticateAdmin, adminUnbanUser);

export default router;