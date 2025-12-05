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
import { getSigningSecretEndpoint, verifyRequestSignature } from "../Middleware/requestSignature.js";

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
router.post("/refresh-token", refreshToken);

// User protected routes (with CSRF protection)
router.get("/profile", authenticateUser, getProfile);
router.put(
  "/profile",
  authenticateUser,
  verifyRequestSignature,
  updateProfileValidation,
  updateProfile
);
router.post(
  "/change-password",
  authenticateUser,
  verifyRequestSignature,
  changePasswordValidation,
  changePassword
);

router.post(
  "/initiate-email-change",
  authenticateUser,
  verifyRequestSignature,
  initiateEmailChange
);
router.post(
  "/verify-email-change",
  authenticateUser,
  verifyRequestSignature,
  verifyEmailChangeOTP
);
router.post("/logout", authenticateUser, verifyRequestSignature, logout);
export default router;
