/**
 * keeps the dev tools routes route focused and readable.
 */
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

// user routes
router.post("/violation", authenticateUser, recordViolation);
router.get("/check-ban/:courseId", authenticateUser, checkCourseBan);

// admin routes
router.get("/admin/stats", authenticateAdmin, getViolationStats);
router.post("/admin/ban", authenticateAdmin, adminBanUser);
router.post("/admin/unban", authenticateAdmin, adminUnbanUser);

export default router;