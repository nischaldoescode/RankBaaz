/**
 * keeps the admin routes route focused and readable.
 */
import express from "express";
import {
  adminLogin,
  adminRegister,
  adminLogout,
  adminGetProfile,
  adminUpdateProfile,
  adminChangePassword,
  loginValidation,
  registerValidation,
  updateProfileValidation,
  changePasswordValidation,
  admincheckExists,
  getAllUsers,
  searchUsers,
  getUserDetails,
  exportUsersToCSV,
  blockUserIp,
  unblockUserIp,
  getBlockedIps,
  deleteUser,
} from "../Controllers/adminController.js";

import { authenticateAdmin } from "../Middleware/auth.js";
import { requireAdminCaptcha } from "../Middleware/adminCaptcha.js";

const router = express.Router();

// this route at the top
router.get("/check-exists", admincheckExists);

// admin public routes
router.post("/register", registerValidation, adminRegister);
router.post("/login", loginValidation, requireAdminCaptcha, adminLogin);

// admin protected routes
router.get("/profile", authenticateAdmin, adminGetProfile);
router.put(
  "/profile",
  authenticateAdmin,
  updateProfileValidation,
  adminUpdateProfile,
);
router.post(
  "/change-password",
  authenticateAdmin,
  changePasswordValidation,
  adminChangePassword,
);
router.post("/logout", authenticateAdmin, adminLogout);

router.get("/users/export", authenticateAdmin, exportUsersToCSV);
router.get("/users", authenticateAdmin, getAllUsers);
router.get("/users/search", authenticateAdmin, searchUsers);
router.get("/users/:userId", authenticateAdmin, getUserDetails);
router.delete("/users/:userId", authenticateAdmin, deleteUser);
router.post("/users/:userId/block-ip", authenticateAdmin, blockUserIp);
router.post("/ip/unblock", authenticateAdmin, unblockUserIp);
router.get("/ip/blocked", authenticateAdmin, getBlockedIps);

export default router;
