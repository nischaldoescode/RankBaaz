import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components";
import { Card, CardContent } from "@/components/ui/card";
import Loading from "../components/common/Loading";
import toast from "react-hot-toast";
import { apiMethods, handleApiError } from "../services/api";
import { useTheme } from "../context/ThemeContext";

const ForgotPassword = ({ onBackToLogin }) => {
  const [step, setStep] = useState(1); // 1: identifier, 2: OTP, 3: new password
  const [formData, setFormData] = useState({
    identifier: "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
    maskedEmail: "",
    resetToken: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { animations = true, reducedMotion = false } = useTheme() || {};
  const navigate = useNavigate();

  // OTP Timer Effect
  useEffect(() => {
    let interval;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => {
          if (prev <= 1) {
            setCanResendOtp(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    try {
      if (step === 1) {
        await handleIdentifierSubmit();
      } else if (step === 2) {
        await handleOtpSubmit();
      } else if (step === 3) {
        await handlePasswordReset();
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      setErrors({ submit: "An error occurred. Please try again." });
    }
  };

  const handleIdentifierSubmit = async () => {
    if (!formData.identifier.trim()) {
      setErrors({ identifier: "Email or username is required" });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await apiMethods.auth.forgotPassword(
        formData.identifier.trim()
      );

      if (response.data.success) {
        setFormData((prev) => ({
          ...prev,
          maskedEmail: response.data.data.maskedEmail,
        }));
        setStep(2);
        setOtpTimer(30);
        setCanResendOtp(false);
        toast.success("OTP sent to your email");
      }
    } catch (error) {
      setErrors({
        identifier:
          handleApiError(error) ||
          "Unable to find account with this email or username",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async () => {
    if (!formData.otp || formData.otp.length !== 6) {
      setErrors({ otp: "Please enter a valid 6-digit OTP" });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await apiMethods.auth.verifyForgotPasswordOTP(
        formData.identifier,
        formData.otp
      );

      if (response.data.success) {
        setFormData((prev) => ({
          ...prev,
          resetToken: response.data.data.resetToken,
          otp: "", // Clear OTP
        }));
        setStep(3);
        toast.success("OTP verified");
      }
    } catch (error) {
      setErrors({ otp: handleApiError(error, "Invalid OTP") });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    // Validation
    if (!formData.newPassword) {
      setErrors({ newPassword: "New password is required" });
      return;
    }

    if (formData.newPassword.length < 8) {
      setErrors({ newPassword: "Password must be at least 8 characters" });
      return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.newPassword)) {
      setErrors({
        newPassword: "Password must contain uppercase, lowercase, and number",
      });
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match" });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await apiMethods.auth.resetPassword(
        formData.resetToken,
        formData.newPassword
      );

      if (response.data.success) {
        toast.success("Password reset successfully! You can now login.");
        // Reset state and go back to login
        handleReset();
        if (onBackToLogin) {
          onBackToLogin();
        }
      }
    } catch (error) {
      setErrors({
        submit: handleApiError(error) || "Unable to reset password",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResendOtp) return;

    setIsLoading(true);
    try {
      await apiMethods.auth.forgotPassword(formData.identifier);
      setOtpTimer(30);
      setCanResendOtp(false);
      toast.success("OTP resent successfully");
    } catch (error) {
      toast.error("Failed to resend OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setFormData({
      identifier: "",
      otp: "",
      newPassword: "",
      confirmPassword: "",
      maskedEmail: "",
      resetToken: "",
    });
    setErrors({});
    setOtpTimer(0);
    setCanResendOtp(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setErrors({});
    } else {
      handleReset();
      if (onBackToLogin) {
        onBackToLogin();
      }
    }
  };

  return (
    <motion.div
      key="forgot-password-form"
      initial={animations && !reducedMotion ? { opacity: 0, x: 100 } : {}}
      animate={animations && !reducedMotion ? { opacity: 1, x: 0 } : {}}
      exit={animations && !reducedMotion ? { opacity: 0, x: 100 } : {}}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="w-full max-w-md space-y-3 sm:space-y-5"
    >
      {/* Back Button */}
      <motion.div
        initial={animations && !reducedMotion ? { opacity: 0, y: -10 } : {}}
        animate={animations && !reducedMotion ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.1 }}
      >
        <button
          onClick={handleBack}
          className="inline-flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors duration-200"
          disabled={isLoading}
        >
          <ArrowLeft className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm sm:text-base break-words">
            {step > 1 ? "Back" : "Back to login"}
          </span>
        </button>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={animations && !reducedMotion ? { opacity: 0, y: -10 } : {}}
        animate={animations && !reducedMotion ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.2 }}
        className="text-center"
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2 break-words px-4">
          Reset Password
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground break-words px-4">
          {step === 1 && "Enter your email or username to continue"}
          {step === 2 && `We sent a code to ${formData.maskedEmail}`}
          {step === 3 && "Create your new password"}
        </p>
      </motion.div>

      {/* Form Card */}
      <motion.div
        initial={animations && !reducedMotion ? { opacity: 0, y: 10 } : {}}
        animate={animations && !reducedMotion ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-0 bg-card/60 backdrop-blur-sm shadow-sm sm:shadow-md md:shadow-lg overflow-hidden">
          <CardContent className="p-6 sm:p-8 md:p-9">
            <form
              onSubmit={handleSubmit}
              className="space-y-5 sm:space-y-6 w-full"
            >
              {/* Submit Error */}
              {errors.submit && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start space-x-2 text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3 min-w-0"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span className="text-sm break-words flex-1">
                    {errors.submit}
                  </span>
                </motion.div>
              )}

              {/* Step 1: Identifier (Email or Username) */}
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-2 w-full"
                >
                  <label
                    htmlFor="identifier"
                    className="text-sm font-medium text-foreground break-words"
                  >
                    Email or Username
                  </label>
                  <div className="relative w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>
                    <Input
                      id="identifier"
                      name="identifier"
                      type="text"
                      autoComplete="username"
                      required
                      className={`pl-11 h-12 sm:h-12 w-full ${
                        errors.identifier ? "border-destructive" : ""
                      }`}
                      placeholder="Enter your email or username"
                      value={formData.identifier}
                      onChange={handleChange}
                      disabled={isLoading}
                    />
                  </div>
                  {errors.identifier && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-destructive break-words"
                    >
                      {errors.identifier}
                    </motion.p>
                  )}
                </motion.div>
              )}

              {/* Step 2: OTP Verification */}
              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4 w-full"
                >
                  <div className="space-y-2 w-full">
                    <label className="text-sm font-medium text-foreground block text-center">
                      Enter 6-Digit Code
                    </label>
                    <div className="flex justify-center gap-2 flex-wrap w-full">
                      {[0, 1, 2, 3, 4, 5].map((index) => (
                        <Input
                          key={index}
                          id={`forgot-otp-${index}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          required
                          className={`w-11 h-11 sm:w-12 sm:h-12 text-center text-lg sm:text-xl font-semibold flex-shrink-0 ${
                            errors.otp ? "border-destructive" : ""
                          }`}
                          value={formData.otp[index] || ""}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "");
                            const newOtp = formData.otp.split("");

                            if (value) {
                              newOtp[index] = value;
                              setFormData({
                                ...formData,
                                otp: newOtp.join(""),
                              });

                              // Auto-focus next input
                              if (index < 5) {
                                document
                                  .getElementById(`forgot-otp-${index + 1}`)
                                  ?.focus();
                              }

                              if (errors.otp) setErrors({ ...errors, otp: "" });
                            } else {
                              newOtp[index] = "";
                              setFormData({
                                ...formData,
                                otp: newOtp.join(""),
                              });
                              if (index > 0) {
                                document
                                  .getElementById(`forgot-otp-${index - 1}`)
                                  ?.focus();
                              }
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Backspace") {
                              const newOtp = formData.otp.split("");
                              if (!formData.otp[index] && index > 0) {
                                newOtp[index - 1] = "";
                                setFormData({
                                  ...formData,
                                  otp: newOtp.join(""),
                                });
                                document
                                  .getElementById(`forgot-otp-${index - 1}`)
                                  ?.focus();
                              } else {
                                newOtp[index] = "";
                                setFormData({
                                  ...formData,
                                  otp: newOtp.join(""),
                                });
                              }
                            }
                          }}
                          onPaste={(e) => {
                            e.preventDefault();
                            const pastedData = e.clipboardData
                              .getData("text")
                              .replace(/\D/g, "")
                              .slice(0, 6);
                            setFormData({ ...formData, otp: pastedData });

                            const nextIndex = Math.min(pastedData.length, 5);
                            document
                              .getElementById(`forgot-otp-${nextIndex}`)
                              ?.focus();
                          }}
                          disabled={isLoading}
                        />
                      ))}
                    </div>
                    {errors.otp && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-destructive text-center break-words"
                      >
                        {errors.otp}
                      </motion.p>
                    )}
                  </div>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={!canResendOtp || isLoading}
                      className={`text-sm break-words ${
                        canResendOtp
                          ? "text-primary hover:text-primary/80"
                          : "text-muted-foreground cursor-not-allowed"
                      } transition-colors`}
                    >
                      {canResendOtp ? "Resend OTP" : `Resend in ${otpTimer}s`}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: New Password */}
              {step === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-4 w-full"
                >
                  {/* New Password Field */}
                  <div className="space-y-2 w-full">
                    <label
                      htmlFor="newPassword"
                      className="text-sm font-medium text-foreground break-words"
                    >
                      New Password
                    </label>
                    <div className="relative w-full">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      </div>
                      <Input
                        id="newPassword"
                        name="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        className={`pl-11 pr-11 h-12 sm:h-12 w-full ${
                          errors.newPassword ? "border-destructive" : ""
                        }`}
                        placeholder="Enter new password"
                        value={formData.newPassword}
                        onChange={handleChange}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        disabled={isLoading}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-5 w-5 flex-shrink-0" />
                        ) : (
                          <Eye className="h-5 w-5 flex-shrink-0" />
                        )}
                      </button>
                    </div>
                    {errors.newPassword && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-destructive break-words"
                      >
                        {errors.newPassword}
                      </motion.p>
                    )}
                    <p className="text-xs text-muted-foreground break-words">
                      Must be 8+ characters with uppercase, lowercase, and
                      number
                    </p>
                  </div>

                  {/* Confirm Password Field */}
                  <div className="space-y-2 w-full">
                    <label
                      htmlFor="confirmPassword"
                      className="text-sm font-medium text-foreground break-words"
                    >
                      Confirm Password
                    </label>
                    <div className="relative w-full">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      </div>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        className={`pl-11 pr-11 h-12 sm:h-12 w-full ${
                          errors.confirmPassword ? "border-destructive" : ""
                        }`}
                        placeholder="Confirm new password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        disabled={isLoading}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5 flex-shrink-0" />
                        ) : (
                          <Eye className="h-5 w-5 flex-shrink-0" />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-destructive break-words"
                      >
                        {errors.confirmPassword}
                      </motion.p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 h-12 sm:h-12"
                size="lg"
              >
                {isLoading ? (
                  <Loading variant="button" />
                ) : (
                  <>
                    {step === 1 && "Send Code"}
                    {step === 2 && "Verify Code"}
                    {step === 3 && "Reset Password"}
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default ForgotPassword;
