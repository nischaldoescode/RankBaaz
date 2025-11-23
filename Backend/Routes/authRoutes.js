import express from "express";
import {
  register,
  verifyOTP,
  initiateLogin,
  verifyLoginOTP,
  login,
  logout,
  refreshToken,
  updateProfile,
  getProfile,
  resendOTP,
  registerValidation,
  verifyForgotPasswordOTP,
  loginValidation,
  forgotPassword,
  resetPassword,
  changePassword,
  changePasswordValidation,
  resetPasswordValidation,
  forgotPasswordValidation,
  updateProfileValidation,
  initiateEmailChange,
  verifyEmailChangeOTP,
  quickCheckUsername,
} from "../Controllers/authController.js";
import { authenticateUser } from "../Middleware/auth.js";
import { validateCSRFToken } from "../Middleware/csrf.js";

const router = express.Router();

router.get("/username-available/:username", quickCheckUsername);

// Public routes
// Public routes (with CSRF protection for state-changing operations)
router.post("/register", validateCSRFToken, registerValidation, register);
router.post("/refresh-token", validateCSRFToken, refreshToken);
router.post("/resend-otp", validateCSRFToken, resendOTP);
router.post("/verify-otp", validateCSRFToken, verifyOTP);
router.post("/initiate-login", validateCSRFToken, initiateLogin);
router.post("/verify-login-otp", validateCSRFToken, verifyLoginOTP);
router.post("/login", validateCSRFToken, loginValidation, login);
router.post("/forgot-password", forgotPasswordValidation, forgotPassword);
router.post("/verify-forgot-password-otp", verifyForgotPasswordOTP);
router.post("/reset-password", resetPasswordValidation, resetPassword);

// User protected routes (with CSRF protection)
router.get("/profile", authenticateUser, getProfile);
router.put(
  "/profile",
  authenticateUser,
  validateCSRFToken,
  updateProfileValidation,
  updateProfile
);
router.post(
  "/change-password",
  authenticateUser,
  validateCSRFToken,
  changePasswordValidation,
  changePassword
);

router.post(
  "/initiate-email-change",
  authenticateUser,
  validateCSRFToken,
  initiateEmailChange
);
router.post(
  "/verify-email-change",
  authenticateUser,
  validateCSRFToken,
  verifyEmailChangeOTP
);
router.post("/logout", authenticateUser, validateCSRFToken, logout);
export default router;
