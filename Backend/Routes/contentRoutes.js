/**
 * mounts content routes api endpoints and keeps middleware order explicit for each request path
 *
 * @file backend/routes/contentroutes.js
 * @module backend/routes/contentroutes
 * @exports express router mounted by the api server
 */

import express from "express";
import {
  getContentSettings,
  updateContentSettings,
  getAllFAQs,
  createFAQ,
  updateFAQ,
  deleteFAQ,
  bulkUpdateFAQOrder,
  getContactInfo,
  updateContactInfo,
  getLegalPage,
  getAllLegalPages,
  updateLegalPage,
  getLegalTemplateHints,
  getHomePreview,
  getAboutPreview,
  getFooterPreview,
  bulkUpdateSectionOrder,
  deleteLogo,
} from "../Controllers/contentController.js";
import { protect, adminOnly } from "../Middleware/authMiddleware.js";
import {
  advancedCache,
  invalidateOnMutation,
} from "../Middleware/advancedCache.js";

const router = express.Router();

// public routes
// content settings (public read)
router.get(
  "/settings",
  advancedCache({ ttl: 600, key: "content:settings" }),
  getContentSettings
);

// faqs (public read)
router.get(
  "/faqs",
  advancedCache({ ttl: 600, key: "content:faqs" }),
  getAllFAQs
);

// contact info (public read)
router.get(
  "/contact",
  advancedCache({ ttl: 600, key: "content:contact" }),
  getContactInfo
);

// legal pages (public read)
router.get("/legal/:type", advancedCache({ ttl: 3600 }), getLegalPage);
router.get(
  "/legal",
  advancedCache({ ttl: 3600, key: "legal:all" }),
  getAllLegalPages
);

// preview endpoints (public - can be accessed without auth for testing)
router.get(
  "/preview/home",
  advancedCache({ ttl: 300, key: "preview:home" }),
  getHomePreview
);
router.get(
  "/preview/about",
  advancedCache({ ttl: 300, key: "preview:about" }),
  getAboutPreview
);
router.get(
  "/preview/footer",
  advancedCache({ ttl: 300, key: "preview:footer" }),
  getFooterPreview
);
// admin routes
/**
 * use adminonly middleware alone for admin-only routes
 *
 * why:
 * - protect = authenticateuser (looks for auth_session cookie)
 * - adminonly = authenticateadmin (looks for admintoken cookie)
 *
 * using both causes protect to fail for admin requests
 * admin routes should only use adminonly middleware
 *
 * @see authmiddleware.js - authenticateuser and authenticateadmin
 */

// content settings (admin only)
router.put(
  "/settings",
  adminOnly,
  invalidateOnMutation(["content"]),
  updateContentSettings
);
router.delete("/settings/logo", adminOnly, deleteLogo);

// faqs (admin only)
router.post("/faqs", adminOnly, invalidateOnMutation(["content"]), createFAQ);
router.put(
  "/faqs/:id",
  adminOnly,
  invalidateOnMutation(["content"]),
  updateFAQ
);
router.delete(
  "/faqs/:id",
  adminOnly,
  invalidateOnMutation(["content"]),
  deleteFAQ
);
router.post(
  "/faqs/bulk-order",
  adminOnly,
  invalidateOnMutation(["content"]),
  bulkUpdateFAQOrder
);

// contact info (admin only)
router.put(
  "/contact",
  adminOnly,
  invalidateOnMutation(["content"]),
  updateContactInfo
);

// legal pages (admin only)
router.put(
  "/legal/:type",
  adminOnly,
  invalidateOnMutation(["content"]),
  updateLegalPage
);
router.post(
  "/legal/:type/bulk-order",
  adminOnly,
  invalidateOnMutation(["content"]),
  bulkUpdateSectionOrder
);
router.get("/legal/:type/hints", adminOnly, getLegalTemplateHints);
export default router;
