/**
 * mounts test routes api endpoints and keeps middleware order explicit for each request path
 *
 * @file backend/routes/testroutes.js
 * @module backend/routes/testroutes
 * @exports express router mounted by the api server
 */

import express from "express";
import {
  startTest,
  submitTest,
  getTestResult,
  submitCourseFeedback,
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
import { authenticateAny, authenticateUser } from "../Middleware/auth.js";
import { advancedCache } from "../Middleware/advancedCache.js";
import {
  getSigningSecretEndpoint,
  verifyRequestSignature,
} from "../Middleware/requestSignature.js";
import { pdfDownloadLimiter } from "../helpers/pdfRatelimiter.js";

const router = express.Router();

/**
 * get /download-pdf/:testid - download test result as pdf
 * auth: signed user or admin session with request signature
 * security:
 * - users: course export flag, one-time token, and one-download limit
 * - admins: unlimited downloads for support and moderation review
 */
router.get(
  "/download-pdf/:testId",
  authenticateAny,
  verifyRequestSignature,
  pdfDownloadLimiter,
  downloadTestPDF,
);

/**
 * all remaining test routes require a verified student session
 */
router.use(authenticateUser);

/**
 * get /start/:courseid/:difficulty - start a test
 * auth: cookie + request signature
 */
router.get(
  "/start/:courseId/:difficulty",
  verifyRequestSignature,
  checkCourseAccess,
  startTest
);

/**
 * post /submit - submit test results
 * auth: cookie + request signature
 */
router.post(
  "/submit",
  verifyRequestSignature,
  testSubmissionValidation,
  submitTest
);

/**
 * get /result/:testid - retrieve test result
 * auth: cookie only
 */
router.get("/result/:testId", getTestResult);

/**
 * post /result/:testid/feedback - save course feedback completion
 * auth: cookie + request signature
 */
router.post(
  "/result/:testId/feedback",
  verifyRequestSignature,
  submitCourseFeedback
);

/**
 * get /history - get user's test history
 * auth: cookie only
 */
router.get("/history", getTestHistory);

/**
 * get /performance - get performance statistics
 * auth: cookie only
 */
router.get("/performance", getPerformanceStats);

/**
 * get /leaderboard/info - get leaderboard information
 * auth: cookie only
 */
router.get("/leaderboard/info", getLeaderboardInfo);

/**
 * get /leaderboard/:courseid - get course leaderboard
 * auth: cookie only
 * cache: 60 seconds
 */
router.get(
  "/leaderboard/:courseId",
  advancedCache({ ttl: 60 }),
  getLeaderboard
);

/**
 * post /check-answer - validate answer during test
 * auth: cookie + request signature
 */
router.post("/check-answer", verifyRequestSignature, checkAnswer);

/**
 * post /abandon - record abandoned test
 * auth: cookie + request signature
 */
router.post("/abandon", verifyRequestSignature, abandonTest);

/**
 * get /generate-pdf-token/:testid - generate one-time download token
 * auth: cookie required (user only)
 * returns: one-time use token valid for 5 minutes
 */
router.get("/generate-pdf-token/:testId", generatePDFDownloadToken);

export default router;
