/**
 * keeps the course routes route focused and readable.
 */
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
  downloadCoursePDF,
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
 * public course routes
 */

/**
 * get / - list all courses
 * auth: none required
 * cache: 150 seconds
 */
router.get("/", cacheStats("all-courses", 150), getAllCourses);

/**
 * get /categories - list all categories
 * auth: none required
 * cache: 500 seconds
 */
router.get("/categories", cacheStats("all-categories", 500), getAllCategories);

/**
 * get /categories/:categoryid - get category details
 * auth: none required
 */
router.get("/categories/:categoryId", getCategoryById);

/**
 * get /:courseid - get course details
 * auth: none required
 */
router.get("/:courseId", getCourseById);

/**
 * get /:courseid/questions - get course questions
 * auth: none required
 * cache: 300 seconds
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
/**
 * get /:courseid/download-pdf - download course data as pdf
 * auth: admin only
 * access: private
 */
router.get("/:courseId/download-pdf", authenticateAdmin, downloadCoursePDF);

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
