import express from "express";
import {
  startTest,
  submitTest,
  getTestResult,
  getTestHistory,
  getPerformanceStats,
  getLeaderboard,
  testSubmissionValidation,
  checkAnswer,
  abandonTest,
  getLeaderboardInfo,
} from "../Controllers/testController.js";

import { checkCourseAccess} from "../helpers/CheckCourseAccess.js";

import { authenticateUser } from "../Middleware/auth.js";

const router = express.Router();

// all test routes does require user authentication
// for testting purpose disabled it (temporary)

// authenticates every request (tomporary disabled for testing)
router.use(authenticateUser);

// Test operations
router.get("/start/:courseId/:difficulty", checkCourseAccess, startTest);
router.post("/submit", testSubmissionValidation, submitTest);
router.get("/result/:testId", getTestResult);
router.get("/history", getTestHistory);
router.get("/performance", getPerformanceStats);
router.get("/leaderboard/info", getLeaderboardInfo);
router.get("/leaderboard/:courseId", getLeaderboard);
router.post("/check-answer", checkAnswer);

router.post("/abandon", authenticateUser, abandonTest);

export default router;
