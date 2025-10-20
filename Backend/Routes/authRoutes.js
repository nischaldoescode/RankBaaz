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

const router = express.Router();

router.get("/username-available/:username", quickCheckUsername);

// Public routes
router.post("/register", registerValidation, register);
router.post("/refresh-token", refreshToken);
router.post("/resend-otp", resendOTP);
router.post("/verify-otp", verifyOTP);
router.post("/initiate-login", initiateLogin);
router.post("/verify-login-otp", verifyLoginOTP);
router.post("/login", loginValidation, login);
router.post("/forgot-password", forgotPasswordValidation, forgotPassword);
router.post("/verify-forgot-password-otp", verifyForgotPasswordOTP);
router.post("/reset-password", resetPasswordValidation, resetPassword);

// User protected routes (with enhanced security)
router.get("/profile", authenticateUser, getProfile);
router.put(
  "/profile",
  authenticateUser,
  updateProfileValidation,
  updateProfile
);
router.post(
  "/change-password",
  authenticateUser,
  changePasswordValidation,
  changePassword
);

router.post("/initiate-email-change", authenticateUser, initiateEmailChange);
router.post("/verify-email-change", authenticateUser, verifyEmailChangeOTP);
router.post("/logout", authenticateUser, logout);

export default router;
