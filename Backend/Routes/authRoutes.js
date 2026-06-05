/**
 * mounts auth routes api endpoints and keeps middleware order explicit for each request path
 *
 * @file backend/routes/authroutes.js
 * @module backend/routes/authroutes
 * @exports express router mounted by the api server
 */

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
import {
  getSigningSecretEndpoint,
  verifyRequestSignature,
} from "../Middleware/requestSignature.js";

const router = express.Router();

router.get("/username-available/:username", quickCheckUsername);

// public routes - no csrf (users are not authenticated yet)
router.post("/register", registerValidation, register);
router.post("/initiate-login", initiateLogin);
router.post("/verify-login-otp", verifyLoginOTP);
router.post("/login", loginValidation, login);
router.post("/resend-otp", resendOTP);
router.post("/verify-otp", verifyOTP);
router.post("/forgot-password", forgotPasswordValidation, forgotPassword);
router.post("/verify-forgot-password-otp", verifyForgotPasswordOTP);
router.post("/reset-password", resetPasswordValidation, resetPassword);

// semi-authenticated routes - keep csrf
router.post("/refresh-token", refreshToken);

/**
 * get /profile - retrieve user profile
 * auth: cookie-based authentication only (no signature required)
 * note: signature not required on get to prevent chicken-egg problem during auth init
 */
router.get("/profile", authenticateUser, getProfile);

/**
 * put /profile - update user profile
 * auth: cookie + request signature required
 */
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
