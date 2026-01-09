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
  downloadTestPDF,
  generatePDFDownloadToken,
} from "../Controllers/testController.js";

import { checkCourseAccess } from "../helpers/CheckCourseAccess.js";
import { authenticateUser } from "../Middleware/auth.js";
import { advancedCache } from "../Middleware/advancedCache.js";
import {
  getSigningSecretEndpoint,
  verifyRequestSignature,
} from "../Middleware/requestSignature.js";
import { pdfDownloadLimiter } from "../helpers/pdfRatelimiter.js";

const router = express.Router();

/**
 * All test routes require authentication
 */
router.use(authenticateUser);

/**
 * GET /start/:courseId/:difficulty - Start a new test
 * Auth: Cookie + Request signature
 */
router.get(
  "/start/:courseId/:difficulty",
  verifyRequestSignature,
  checkCourseAccess,
  startTest
);

/**
 * POST /submit - Submit test results
 * Auth: Cookie + Request signature
 */
router.post(
  "/submit",
  verifyRequestSignature,
  testSubmissionValidation,
  submitTest
);

/**
 * GET /result/:testId - Retrieve test result
 * Auth: Cookie only
 */
router.get("/result/:testId", getTestResult);

/**
 * GET /history - Get user's test history
 * Auth: Cookie only
 */
router.get("/history", getTestHistory);

/**
 * GET /performance - Get performance statistics
 * Auth: Cookie only
 */
router.get("/performance", getPerformanceStats);

/**
 * GET /leaderboard/info - Get leaderboard information
 * Auth: Cookie only
 */
router.get("/leaderboard/info", getLeaderboardInfo);

/**
 * GET /leaderboard/:courseId - Get course leaderboard
 * Auth: Cookie only
 * Cache: 60 seconds
 */
router.get(
  "/leaderboard/:courseId",
  advancedCache({ ttl: 60 }),
  getLeaderboard
);

/**
 * POST /check-answer - Validate answer during test
 * Auth: Cookie + Request signature
 */
router.post("/check-answer", verifyRequestSignature, checkAnswer);

/**
 * POST /abandon - Record abandoned test
 * Auth: Cookie + Request signature
 */
router.post("/abandon", verifyRequestSignature, abandonTest);

/**
 * GET /generate-pdf-token/:testId - Generate one-time download token
 * Auth: Cookie required (user only)
 * Returns: One-time use token valid for 5 minutes
 */
router.get("/generate-pdf-token/:testId", generatePDFDownloadToken);

/**
 * GET /download-pdf/:testId - Download test result as PDF
 * Auth: Cookie required
 * Security:
 * - Users: One-time download only
 * - Admins: Unlimited downloads
 */
router.get("/download-pdf/:testId", pdfDownloadLimiter, downloadTestPDF);

export default router;
