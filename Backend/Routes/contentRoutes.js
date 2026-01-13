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

// ============ PUBLIC ROUTES ============
// Content Settings (Public Read)
router.get(
  "/settings",
  advancedCache({ ttl: 600, key: "content:settings" }),
  getContentSettings
);

// FAQs (Public Read)
router.get(
  "/faqs",
  advancedCache({ ttl: 600, key: "content:faqs" }),
  getAllFAQs
);

// Contact Info (Public Read)
router.get(
  "/contact",
  advancedCache({ ttl: 600, key: "content:contact" }),
  getContactInfo
);

// Legal Pages (Public Read)
router.get("/legal/:type", advancedCache({ ttl: 3600 }), getLegalPage);
router.get(
  "/legal",
  advancedCache({ ttl: 3600, key: "legal:all" }),
  getAllLegalPages
);

// Preview endpoints (Public - can be accessed without auth for testing)
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
// ============ ADMIN ROUTES ============
/**
 * CRITICAL: Use adminOnly middleware ALONE for admin-only routes
 *
 * Why:
 * - protect = authenticateUser (looks for auth_session cookie)
 * - adminOnly = authenticateAdmin (looks for adminToken cookie)
 *
 * Using both causes protect to fail for admin requests
 * Admin routes should ONLY use adminOnly middleware
 *
 * @see authMiddleware.js - authenticateUser and authenticateAdmin
 */

// Content Settings (Admin Only)
router.put(
  "/settings",
  adminOnly,
  invalidateOnMutation(["content"]),
  updateContentSettings
);
router.delete("/settings/logo", adminOnly, deleteLogo);

// FAQs (Admin Only)
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

// Contact Info (Admin Only)
router.put(
  "/contact",
  adminOnly,
  invalidateOnMutation(["content"]),
  updateContactInfo
);

// Legal Pages (Admin Only)
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
