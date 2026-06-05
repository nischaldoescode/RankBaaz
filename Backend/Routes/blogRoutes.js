/**
 * mounts blog routes api endpoints and keeps middleware order explicit for each request path
 *
 * @file backend/routes/blogroutes.js
 * @module backend/routes/blogroutes
 * @exports express router mounted by the api server
 */

import express from "express";
import {
  adminCreateAuthor,
  adminCreateBlogPost,
  adminCheckBlogSlug,
  adminDeleteAuthor,
  adminDeleteBlogPost,
  adminDiscardBlogMedia,
  adminGetBlogPost,
  adminGetBlogIndexingStatus,
  adminListAuthors,
  adminListBlogPosts,
  adminListComments,
  adminSubmitBlogIndexNow,
  adminUploadBlogMedia,
  adminUpdateAuthor,
  adminUpdateBlogPost,
  adminUpdateCommentStatus,
  createBlogComment,
  generateBlogSitemap,
  getBlogShareSettings,
  getPublishedAuthor,
  getPublishedBlogBySlug,
  listPublishedBlogs,
} from "../Controllers/blogController.js";
import { authenticateAdmin, authenticateUser } from "../Middleware/auth.js";
import { verifyRequestSignature } from "../Middleware/requestSignature.js";

const router = express.Router();

// public ssr/search routes. the separate blogs frontend consumes these server-side
router.get("/public", listPublishedBlogs);
router.get("/public/:slug", getPublishedBlogBySlug);
router.get("/authors/:slug", getPublishedAuthor);
router.get("/settings/share", getBlogShareSettings);
router.get("/sitemap.xml", generateBlogSitemap);

// logged-in vidhgrow users can comment. signature check prevents replay/fake-header requests
router.post(
  "/comments/:postId",
  authenticateUser,
  verifyRequestSignature,
  createBlogComment,
);

// admin blog workspace
router.get("/admin/posts", authenticateAdmin, verifyRequestSignature, adminListBlogPosts);
router.get("/admin/indexing", authenticateAdmin, verifyRequestSignature, adminGetBlogIndexingStatus);
router.post("/admin/indexing/indexnow", authenticateAdmin, verifyRequestSignature, adminSubmitBlogIndexNow);
router.get("/admin/slugs/check", authenticateAdmin, verifyRequestSignature, adminCheckBlogSlug);
router.post("/admin/media", authenticateAdmin, verifyRequestSignature, adminUploadBlogMedia);
router.delete("/admin/media", authenticateAdmin, verifyRequestSignature, adminDiscardBlogMedia);
router.post("/admin/posts", authenticateAdmin, verifyRequestSignature, adminCreateBlogPost);
router.get(
  "/admin/posts/:postId",
  authenticateAdmin,
  verifyRequestSignature,
  adminGetBlogPost,
);
router.put(
  "/admin/posts/:postId",
  authenticateAdmin,
  verifyRequestSignature,
  adminUpdateBlogPost,
);
router.delete(
  "/admin/posts/:postId",
  authenticateAdmin,
  verifyRequestSignature,
  adminDeleteBlogPost,
);

router.get("/admin/authors", authenticateAdmin, verifyRequestSignature, adminListAuthors);
router.post("/admin/authors", authenticateAdmin, verifyRequestSignature, adminCreateAuthor);
router.put(
  "/admin/authors/:authorId",
  authenticateAdmin,
  verifyRequestSignature,
  adminUpdateAuthor,
);
router.delete(
  "/admin/authors/:authorId",
  authenticateAdmin,
  verifyRequestSignature,
  adminDeleteAuthor,
);

router.get("/admin/comments", authenticateAdmin, verifyRequestSignature, adminListComments);
router.patch(
  "/admin/comments/:commentId",
  authenticateAdmin,
  verifyRequestSignature,
  adminUpdateCommentStatus,
);

export default router;
