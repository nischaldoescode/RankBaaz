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

// Public routes - NO CSRF (users are not authenticated yet)
router.post("/register", registerValidation, register);
router.post("/initiate-login", initiateLogin);
router.post("/verify-login-otp", verifyLoginOTP);
router.post("/login", loginValidation, login);
router.post("/resend-otp", resendOTP);
router.post("/verify-otp", verifyOTP);
router.post("/forgot-password", forgotPasswordValidation, forgotPassword);
router.post("/verify-forgot-password-otp", verifyForgotPasswordOTP);
router.post("/reset-password", resetPasswordValidation, resetPassword);

// Semi-authenticated routes - Keep CSRF
router.post("/refresh-token", validateCSRFToken, refreshToken);

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
