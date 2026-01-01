import express from "express";
import {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  toggleCourseStatus,
  getCourseStats,
  courseValidation,
  parseFormDataArrays,
  addQuestionToCourse,
  getCourseQuestions,
  updateCourseQuestion,
  deleteCourseQuestion,
  questionValidation,
  bulkImportQuestions,
  updateCourseValidation,
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getUserStats,
  bulkDeleteQuestions,
  getDifficultyBreakdown,
  validateVideoLinks,
} from "../Controllers/CourseController.js";
import { authenticateAdmin, authenticateUser } from "../Middleware/auth.js";
import { uploadCourseImage, handleUploadError } from "../Middleware/Upload.js";
import { cacheStats } from "../Middleware/statsCache.js";
import { statsLimiter } from "../helpers/statsLimiter.js";
import {
  advancedCache,
  invalidateOnMutation,
} from "../Middleware/advancedCache.js";

const router = express.Router();

/**
 * Public course routes
 */

/**
 * GET / - List all courses
 * Auth: None required
 * Cache: 150 seconds
 */
router.get("/", cacheStats("all-courses", 150), getAllCourses);

/**
 * GET /categories - List all categories
 * Auth: None required
 * Cache: 500 seconds
 */
router.get("/categories", cacheStats("all-categories", 500), getAllCategories);

/**
 * GET /categories/:categoryId - Get category details
 * Auth: None required
 */
router.get("/categories/:categoryId", getCategoryById);

/**
 * GET /:courseId - Get course details
 * Auth: None required
 */
router.get("/:courseId", getCourseById);

/**
 * GET /:courseId/questions - Get course questions
 * Auth: None required
 * Cache: 300 seconds
 */
router.get(
  "/:courseId/questions",
  advancedCache({ ttl: 300 }),
  getCourseQuestions
);

router.get("/admin/all", authenticateAdmin, getAllCourses);
router.get(
  "/admin/stats",
  authenticateAdmin,
  statsLimiter,
  cacheStats("admin:stats", 300),
  getCourseStats
);
router.get(
  "/admin/user-stats",
  authenticateAdmin,
  statsLimiter,
  cacheStats("admin:user-stats", 120),
  getUserStats
);
router.get(
  "/admin/difficulty-breakdown",
  authenticateAdmin,
  statsLimiter,
  cacheStats("admin:difficulty-breakdown", 120),
  getDifficultyBreakdown
);

router.post(
  "/",
  authenticateAdmin,
  uploadCourseImage,
  handleUploadError,
  parseFormDataArrays,
  courseValidation,
  createCourse
);
router.post(
  "/categories",
  authenticateAdmin,
  invalidateOnMutation(["categories", "courses"]),
  createCategory
);
router.post(
  "/:courseId/questions",
  authenticateAdmin,
  uploadCourseImage,
  handleUploadError,
  questionValidation,
  addQuestionToCourse
);
router.post(
  "/:courseId/questions/bulk-import",
  authenticateAdmin,
  bulkImportQuestions
);

router.post("/validate-video-links", authenticateAdmin, validateVideoLinks);

router.put(
  "/:courseId",
  authenticateAdmin,
  uploadCourseImage,
  handleUploadError,
  parseFormDataArrays,
  courseValidation,
  updateCourse
);
router.put(
  "/update/:courseId",
  authenticateAdmin,
  uploadCourseImage,
  handleUploadError,
  parseFormDataArrays,
  updateCourseValidation,
  updateCourse
);
router.put("/categories/:categoryId", authenticateAdmin, updateCategory);
router.put(
  "/:courseId/questions/:questionId",
  authenticateAdmin,
  uploadCourseImage,
  handleUploadError,
  questionValidation,
  updateCourseQuestion
);

router.patch("/:courseId/toggle-status", authenticateAdmin, toggleCourseStatus);

router.delete(
  "/:courseId",
  authenticateAdmin,
  invalidateOnMutation(["courses"]),
  deleteCourse
);
router.delete(
  "/categories/:categoryId",
  authenticateAdmin,
  invalidateOnMutation(["categories", "courses"]),
  deleteCategory
);
router.delete(
  "/:courseId/questions/bulk",
  authenticateAdmin,
  invalidateOnMutation(["courses"]),
  bulkDeleteQuestions
);
router.delete(
  "/:courseId/questions/:questionId",
  authenticateAdmin,
  invalidateOnMutation(["courses"]),
  deleteCourseQuestion
);

router.post("/validate-video-links", authenticateAdmin, validateVideoLinks);
export default router;
