import express from 'express';
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
} from '../Controllers/contentController.js';
import { protect, adminOnly } from '../Middleware/authMiddleware.js';

const router = express.Router();

// ============ PUBLIC ROUTES ============
// Content Settings (Public Read)
router.get('/settings', getContentSettings);

// FAQs (Public Read)
router.get('/faqs', getAllFAQs);

// Contact Info (Public Read)
router.get('/contact', getContactInfo);

// Legal Pages (Public Read)
router.get('/legal/:type', getLegalPage);
router.get('/legal', getAllLegalPages);

// Preview endpoints (Public - can be accessed without auth for testing)
router.get('/preview/home', getHomePreview);
router.get('/preview/about', getAboutPreview);
router.get('/preview/footer', getFooterPreview);

// ============ ADMIN ROUTES ============
// Content Settings (Admin Only)
router.put('/settings', protect, adminOnly, updateContentSettings);
router.delete('/settings/logo', protect, adminOnly, deleteLogo);

// FAQs (Admin Only)
router.post('/faqs', protect, adminOnly, createFAQ);
router.put('/faqs/:id', protect, adminOnly, updateFAQ);
router.delete('/faqs/:id', protect, adminOnly, deleteFAQ);
router.post('/faqs/bulk-order', protect, adminOnly, bulkUpdateFAQOrder);

// Contact Info (Admin Only)
router.put('/contact', protect, adminOnly, updateContactInfo);

// Legal Pages (Admin Only)
router.put('/legal/:type', protect, adminOnly, updateLegalPage);
router.post('/legal/:type/bulk-order', protect, adminOnly, bulkUpdateSectionOrder);
router.get('/legal/:type/hints', protect, adminOnly, getLegalTemplateHints);

export default router;