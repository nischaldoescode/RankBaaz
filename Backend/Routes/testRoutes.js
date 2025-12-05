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
import { advancedCache } from '../Middleware/advancedCache.js';
import { getSigningSecretEndpoint, verifyRequestSignature } from "../Middleware/requestSignature.js";

const router = express.Router();

// authenticates every request (tomporary disabled for testing)
router.use(authenticateUser);

// Test operations
router.get("/start/:courseId/:difficulty", verifyRequestSignature, checkCourseAccess, startTest);
router.post("/submit", testSubmissionValidation, submitTest);
router.get("/result/:testId", getTestResult);
router.get("/history", getTestHistory);
router.get("/performance", getPerformanceStats);
router.get("/leaderboard/info", getLeaderboardInfo);
router.get("/leaderboard/:courseId", advancedCache({ ttl: 60 }), getLeaderboard);
router.post("/check-answer", checkAnswer);

router.post("/abandon", authenticateUser, verifyRequestSignature, abandonTest);

export default router;
