import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  LogIn,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/checkbox";
import Loading from "../components/common/Loading";
import toast from "react-hot-toast";
import ForgotPassword from "./ForgotPassword";
import { apiMethods, handleApiError } from "../services/api";
import { useSEO } from "../hooks/useSEO";
import { useContent } from "../context/ContentContext";

const Login = () => {
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const [loginStep, setLoginStep] = useState(1);
  const [formData, setFormData] = useState({
    email: "",
    otp: "",
    password: "",
    rememberMe: false,
  });

  const [otpTimer, setOtpTimer] = useState(0);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [mounted, setMounted] = useState(false);

  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const { animations = true, reducedMotion = false } = useTheme() || {};
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  const { contentSettings } = useContent();

  useSEO({
    title: "Login",
    description: `Sign in to your ${
      contentSettings?.siteName || "RankBaaz Pro"
    } account to continue your learning journey. Access your courses, track progress, and take tests.`,
    keywords:
      "login, sign in, user login, account access, student login, online learning login",
    type: "website",
    noindex: true, // Login pages should not be indexed
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Login",
      description: `Sign in to your ${
        contentSettings?.siteName || "RankBaaz Pro"
      } account`,
      url: window.location.href,
      isPartOf: {
        "@type": "WebSite",
        name: contentSettings?.siteName || "RankBaaz Pro",
        url: contentSettings?.siteUrl || window.location.origin,
      },
    },
  });

  useEffect(() => {
    setMounted(true);
    if (isAuthenticated && !authLoading) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, from]);

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
    const { name, value, type, checked } = e.target;
    const inputValue = type === "checkbox" ? checked : value;

    setFormData((prev) => ({
      ...prev,
      [name]: inputValue,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleEmailSubmit = async () => {
    if (!formData.email.trim()) {
      setErrors({ email: "Email is required" });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await apiMethods.auth.initiateLogin(
        formData.email.trim().toLowerCase()
      );

      if (response.data.success) {
        const { isDevAccount, isRegistered, isVerified } = response.data.data;

        if (isDevAccount) {
          setLoginStep(3); // Skip OTP for dev account
          toast.success("Dev account detected");
        } else if (isRegistered && isVerified) {
          setLoginStep(2);
          setOtpTimer(30);
          setCanResendOtp(false);
          toast.success("OTP sent to your email");
        }
      }
    } catch (error) {
      const errorResponse = error.response?.data;

      if (errorResponse?.data?.isRegistered === false) {
        setErrors({
          email: "No account found with this email. Please register first.",
        });
      } else if (errorResponse?.data?.isVerified === false) {
        setErrors({
          email: "Your email is not verified. Please verify your email first.",
        });
      } else {
        setErrors({ email: handleApiError(error, "Failed to send OTP") });
      }
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
      const response = await apiMethods.auth.verifyLoginOTP(
        formData.email,
        formData.otp
      );

      if (response.data.success) {
        // Clear OTP from state before moving to password step
        setFormData((prev) => ({ ...prev, otp: "" }));
        setLoginStep(3);
        toast.success("OTP verified");
      } else {
        // Handle unexpected response
        setErrors({ otp: "OTP verification failed. Please try again." });
      }
    } catch (error) {
      setErrors({ otp: handleApiError(error, "Invalid OTP") });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResendOtp) return;

    setIsLoading(true);
    try {
      await apiMethods.auth.initiateLogin(formData.email);
      setOtpTimer(30);
      setCanResendOtp(false);
      toast.success("OTP resent successfully");
    } catch (error) {
      toast.error("Failed to resend OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeEmail = () => {
    setLoginStep(1);
    setFormData({ ...formData, otp: "", password: "" });
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLoading) return;

    try {
      if (loginStep === 1) {
        await handleEmailSubmit();
      } else if (loginStep === 2) {
        await handleOtpSubmit();
      } else if (loginStep === 3) {
        await handlePasswordSubmit();
      }
    } catch (error) {
      console.error("Form submission error:", error);
      setErrors({ submit: "An error occurred. Please try again." });
    }
  };

  const handlePasswordSubmit = async () => {
    if (!formData.password) {
      setErrors({ password: "Password is required" });
      return;
    }

    setIsLoading(true);

    try {
      const result = await login({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      if (result.success) {
        if (formData.rememberMe) {
          localStorage.setItem("rememberMe", "true");
        } else {
          localStorage.removeItem("rememberMe");
        }
        navigate(from, { replace: true });
      }
    } catch (error) {
      console.error("Login error:", error);
      setErrors({ submit: "An unexpected error occurred. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseForgotPassword = () => {
    setShowForgotPassword(false);
  };
  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <Loading variant="auth" />
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <div className="h-[95vh] relative overflow-hidden mt-[-40px]">
      <div className="flex items-center justify-center min-h-screen relative z-10 px-4 sm:px-6 lg:px-8 py-3 sm:py-8">
        <AnimatePresence mode="wait">
          {showForgotPassword ? (
            <ForgotPassword onBackToLogin={handleCloseForgotPassword} />
          ) : (
            <motion.div
              className="w-full max-w-md space-y-3 sm:space-y-5"
              variants={containerVariants}
              initial={animations && !reducedMotion ? "hidden" : "visible"}
              animate="visible"
            >
              {/* Back Button */}
              <motion.div variants={itemVariants}>
                <Link
                  to="/"
                  className="inline-flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm sm:text-base">Back to home</span>
                </Link>
              </motion.div>

              {/* Header */}
              <motion.div variants={itemVariants} className="text-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">
                  Welcome back!
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Sign in to continue your learning journey
                </p>
              </motion.div>

              {/* Login Form */}
              <motion.div variants={itemVariants}>
                <Card className="border-0 bg-card/60 backdrop-blur-sm shadow-sm sm:shadow-md md:shadow-lg">
                  <CardContent className="p-7 sm:p-8 md:p-9">
                    <form
                      className="space-y-5 sm:space-y-5 md:space-y-6"
                      onSubmit={handleSubmit}
                    >
                      {/* Submit Error */}
                      {errors.submit && (
                        <motion.div
                          initial={
                            animations && !reducedMotion
                              ? { opacity: 0, y: -10 }
                              : {}
                          }
                          animate={
                            animations && !reducedMotion
                              ? { opacity: 1, y: 0 }
                              : {}
                          }
                          className="flex items-center space-x-2 text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3"
                        >
                          <AlertCircle className="w-5 h-5 flex-shrink-0" />
                          <span className="text-sm">{errors.submit}</span>
                        </motion.div>
                      )}

                      {/* Step 1: Email */}
                      {loginStep === 1 && (
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="space-y-2 w-full"
                        >
                          <div className="flex items-center justify-between min-w-0">
                            <label
                              htmlFor="email"
                              className="text-sm font-medium text-foreground"
                            >
                              Email Address
                            </label>
                            <button
                              type="button"
                              onClick={() => setShowForgotPassword(true)}
                              className="text-xs sm:text-sm font-medium text-primary hover:text-primary/80 transition-colors whitespace-nowrap flex-shrink-0"
                            >
                              Forgot password?
                            </button>
                          </div>
                          <div className="relative w-full">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Mail className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            </div>
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              autoComplete="email"
                              required
                              className={`pl-11 h-12 sm:h-12 w-full ${
                                errors.email ? "border-destructive" : ""
                              }`}
                              placeholder="Enter your email"
                              value={formData.email}
                              onChange={handleChange}
                              disabled={isLoading}
                            />
                          </div>
                          {errors.email && (
                            <motion.p
                              initial={
                                animations && !reducedMotion
                                  ? { opacity: 0, y: -10 }
                                  : {}
                              }
                              animate={
                                animations && !reducedMotion
                                  ? { opacity: 1, y: 0 }
                                  : {}
                              }
                              className="text-sm text-destructive break-words"
                            >
                              {errors.email}
                            </motion.p>
                          )}
                        </motion.div>
                      )}

                      {/* Step 2: OTP */}
                      {loginStep === 2 && (
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="space-y-4"
                        >
                          <div className="text-center space-y-2">
                            <p className="text-sm text-muted-foreground">
                              We've sent a verification code to
                            </p>
                            <p className="text-sm font-medium text-foreground">
                              {formData.email}
                            </p>
                            <button
                              type="button"
                              onClick={handleChangeEmail}
                              className="text-xs text-primary hover:text-primary/80 transition-colors"
                            >
                              Not your email?
                            </button>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground block text-center">
                              Enter OTP
                            </label>
                            <div className="flex justify-center gap-2">
                              {[0, 1, 2, 3, 4, 5].map((index) => (
                                <Input
                                  key={index}
                                  id={`otp-${index}`}
                                  type="text"
                                  inputMode="numeric"
                                  maxLength={1}
                                  required
                                  className={`w-11 h-11 sm:w-12 sm:h-12 text-center text-lg sm:text-xl font-semibold ${
                                    errors.otp ? "border-destructive" : ""
                                  }`}
                                  value={formData.otp[index] || ""}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(
                                      /\D/g,
                                      ""
                                    );
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
                                          .getElementById(`otp-${index + 1}`)
                                          ?.focus();
                                      }

                                      if (errors.otp)
                                        setErrors({ ...errors, otp: "" });
                                    } else {
                                      // Handle backspace for mobile (when deleting input)
                                      newOtp[index] = "";
                                      setFormData({
                                        ...formData,
                                        otp: newOtp.join(""),
                                      });
                                      if (index > 0) {
                                        document
                                          .getElementById(`otp-${index - 1}`)
                                          ?.focus();
                                      }
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    // Desktop backspace handling
                                    if (e.key === "Backspace") {
                                      const newOtp = formData.otp.split("");
                                      if (!formData.otp[index] && index > 0) {
                                        newOtp[index - 1] = "";
                                        setFormData({
                                          ...formData,
                                          otp: newOtp.join(""),
                                        });
                                        document
                                          .getElementById(`otp-${index - 1}`)
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
                                  onKeyUp={(e) => {
                                    // Extra handling for mobile keyboard backspace (Android/iOS)
                                    if (
                                      e.key === "Backspace" &&
                                      index > 0 &&
                                      !formData.otp[index]
                                    ) {
                                      document
                                        .getElementById(`otp-${index - 1}`)
                                        ?.focus();
                                    }
                                  }}
                                  onPaste={(e) => {
                                    e.preventDefault();
                                    const pastedData = e.clipboardData
                                      .getData("text")
                                      .replace(/\D/g, "")
                                      .slice(0, 6);
                                    setFormData({
                                      ...formData,
                                      otp: pastedData,
                                    });

                                    // Focus the next empty box or last box
                                    const nextIndex = Math.min(
                                      pastedData.length,
                                      5
                                    );
                                    document
                                      .getElementById(`otp-${nextIndex}`)
                                      ?.focus();
                                  }}
                                  disabled={isLoading}
                                />
                              ))}
                            </div>
                            {errors.otp && (
                              <motion.p
                                initial={
                                  animations && !reducedMotion
                                    ? { opacity: 0, y: -10 }
                                    : {}
                                }
                                animate={
                                  animations && !reducedMotion
                                    ? { opacity: 1, y: 0 }
                                    : {}
                                }
                                className="text-sm text-destructive text-center"
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
                              className={`text-sm ${
                                canResendOtp
                                  ? "text-primary hover:text-primary/80"
                                  : "text-muted-foreground cursor-not-allowed"
                              } transition-colors`}
                            >
                              {canResendOtp
                                ? "Resend OTP"
                                : `Resend in ${otpTimer}s`}
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {/* Step 3: Password */}
                      {loginStep === 3 && (
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="space-y-4"
                        >
                          <div className="space-y-2">
                            <label
                              htmlFor="password"
                              className="text-sm font-medium text-foreground"
                            >
                              Password
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <Input
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                required
                                className={`pl-10 pr-10 h-12 sm:h-12 ${
                                  errors.password ? "border-destructive" : ""
                                }`}
                                placeholder="Enter your password"
                                value={formData.password}
                                onChange={handleChange}
                                disabled={isLoading}
                              />
                              <button
                                type="button"
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={isLoading}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                            {errors.password && (
                              <motion.p
                                initial={
                                  animations && !reducedMotion
                                    ? { opacity: 0, y: -10 }
                                    : {}
                                }
                                animate={
                                  animations && !reducedMotion
                                    ? { opacity: 1, y: 0 }
                                    : {}
                                }
                                className="text-sm text-destructive"
                              >
                                {errors.password}
                              </motion.p>
                            )}
                          </div>

                          <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 xs:gap-0">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="rememberMe"
                                checked={formData.rememberMe}
                                onCheckedChange={(checked) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    rememberMe: checked,
                                  }))
                                }
                                disabled={isLoading}
                              />
                              <label
                                htmlFor="rememberMe"
                                className="text-sm text-foreground cursor-pointer"
                              >
                                Remember me
                              </label>
                            </div>
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
                            <LogIn className="w-4 h-4 mr-2" />
                            {loginStep === 1
                              ? "Continue"
                              : loginStep === 2
                              ? "Verify OTP"
                              : "Sign In"}
                          </>
                        )}
                      </Button>

                      {/* Sign Up Link - Only show on first step */}
                      {loginStep === 1 && (
                        <div className="text-center pt-4 border-t border-border/50">
                          <p className="text-sm text-muted-foreground">
                            Don't have an account?{" "}
                            <Link
                              to="/register"
                              className="font-medium text-primary hover:text-primary/80 transition-colors"
                            >
                              Sign up for free
                            </Link>
                          </p>
                        </div>
                      )}
                      <div className="text-center text-xs text-muted-foreground">
                        <Link
                          to="/terms"
                          className="text-primary hover:text-primary/80"
                        >
                          Terms and Conditions
                        </Link>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Login;
