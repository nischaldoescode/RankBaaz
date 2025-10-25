import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  UserPlus,
  ArrowLeft,
  AlertCircle,
  Check,
  CheckCircle2,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/checkbox";
import Loading from "../components/common/Loading";
import { debounce } from "lodash";
import { apiMethods } from "../services/api";
import toast from "react-hot-toast";
import { useHead } from "@unhead/react";
import { useContent } from "../context/ContentContext";
import { useSEO } from "../hooks/useSEO";

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    dateOfBirth: "",
    gender: "",
    agreeToTerms: false,
    subscribeNewsletter: true,
  });

  const [username, setUsername] = useState("");
  const [registerStep, setRegisterStep] = useState(1); // 1: form, 2: OTP, 3: username
  const [otpTimer, setOtpTimer] = useState(0);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [mounted, setMounted] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  const {
    register,
    isAuthenticated,
    loading: authLoading,
    verifyRegistrationOtp,
  } = useAuth();
  const { animations = true, reducedMotion = false } = useTheme() || {};
  const navigate = useNavigate();

  const { contentSettings } = useContent();

  useSEO({
    title: "Register",
    description: `Create your free ${
      contentSettings?.siteName || "RankBaaz Pro"
    } account and start your learning journey today. Access courses, take tests, and track your progress.`,
    keywords:
      "register, sign up, create account, student registration, free account, join now, new user",
    type: "website",
    noindex: true, // Registration pages should not be indexed
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Register",
      description: `Create a free account on ${
        contentSettings?.siteName || "RankBaaz Pro"
      }`,
      url: window.location.href,
      isPartOf: {
        "@type": "WebSite",
        name: contentSettings?.siteName || "RankBaaz Pro",
        url: contentSettings?.siteUrl || window.location.origin,
      },
      potentialAction: {
        "@type": "RegisterAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: window.location.href,
        },
      },
    },
  });

  useEffect(() => {
    setMounted(true);
    if (isAuthenticated && !authLoading) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Auto-focus first OTP input when OTP step loads
  useEffect(() => {
    if (registerStep === 2) {
      setTimeout(() => {
        document.getElementById("reg-otp-0")?.focus();
      }, 100);
    }
  }, [registerStep]);

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

const handleChange = useCallback((e) => {
  const { name, value, type, checked } = e.target;
  const inputValue = type === "checkbox" ? checked : value;

  setFormData((prev) => ({
    ...prev,
    [name]: inputValue,
  }));

  // Clear error using functional update - no dependency needed
  setErrors((prev) => {
    if (prev[name]) {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    }
    return prev;
  });
}, []); // Empty dependency array - function never recreates

  const checkUsernameAvailability = useCallback(
    debounce(async (username) => {
      // First check: only lowercase letters, numbers, and underscores
      if (!/^[a-z0-9_]+$/.test(username)) {
        setUsernameAvailable(false);
        setErrors((prev) => ({
          ...prev,
          username: "Only lowercase letters, numbers, and underscores allowed",
        }));
        return;
      }

      // Second check: must contain at least one letter
      if (!/[a-z]/.test(username)) {
        setUsernameAvailable(false);
        setErrors((prev) => ({
          ...prev,
          username: "Username must contain at least one letter",
        }));
        return;
      }

      setCheckingUsername(true);
      try {
        const response = await apiMethods.auth.quickCheckUsername(username);
        setUsernameAvailable(response.data.available);

        if (!response.data.available) {
          setErrors((prev) => ({
            ...prev,
            username:
              response.data.reason === "too_short"
                ? "Username too short"
                : "Username already taken",
          }));
        } else {
          setErrors((prev) => {
            const { username, ...rest } = prev;
            return rest;
          });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setCheckingUsername(false);
      }
    }, 500),
    []
  );

const handleDateChange = useCallback((e) => {
  let value = e.target.value.replace(/\D/g, ""); // Remove non-digits

  if (value.length >= 2) {
    value = value.slice(0, 2) + "/" + value.slice(2);
  }
  if (value.length >= 5) {
    value = value.slice(0, 5) + "/" + value.slice(5, 9);
  }

  setFormData((prev) => ({
    ...prev,
    dateOfBirth: value,
  }));

  // Use functional update - no dependency needed
  setErrors((prev) => {
    if (prev.dateOfBirth) {
      const newErrors = { ...prev };
      delete newErrors.dateOfBirth;
      return newErrors;
    }
    return prev;
  });
}, []); // Empty dependency array

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLoading) return;

    // Check terms agreement locally
    if (!formData.agreeToTerms) {
      setErrors({ agreeToTerms: "You must agree to the terms and conditions" });
      return;
    }

    // Check password match locally
    if (formData.password !== formData.confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match" });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const result = await register({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        subscribeNewsletter: formData.subscribeNewsletter,
      });

      if (result.success) {
        if (result.requiresOtp) {
          setRegisterStep(2);
          setOtpTimer(30);
          setCanResendOtp(false);
        } else {
          navigate("/", { replace: true });
        }
      } else if (result.errors) {
        setErrors(result.errors);
      }
    } catch (error) {
      console.error("Registration error:", error);
      setErrors({ submit: "An unexpected error occurred. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerification = async (e) => {
    e.preventDefault();

    if (!otpValue || otpValue.length !== 6) {
      setErrors({ otp: "Please enter a valid 6-digit OTP" });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Call a new API endpoint to verify OTP without username
      const response = await apiMethods.auth.verifyRegistrationOtp(
        formData.email,
        otpValue
      );

      if (response.data.success) {
        setRegisterStep(3);
        toast.success("Email verified! Now choose your username");
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        "Failed to verify OTP. Please try again.";

      // Check if session expired - send user back to step 1
      if (
        errorMessage === "Registration session expired. Please register again."
      ) {
        toast.error("Your session expired. Please start registration again.", {
          duration: 5000,
        });

        // Reset to initial state
        setRegisterStep(1);
        setOtpValue("");
        setUsername("");
        setUsernameAvailable(null);
        setErrors({});

        // Optionally we will keep their email so they don't have to retype everything
        // formData.email is preserved, but user will need to re-enter other details
      } else {
        // Normal OTP error
        setErrors({ otp: errorMessage });
        // toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsernameSubmit = async (e) => {
    e.preventDefault();

    if (!username || username.length < 3) {
      setErrors({ username: "Username must be at least 3 characters" });
      return;
    }

    if (username.length > 15) {
      setErrors({ username: "Username too long, max 15 characters" });
      return;
    }

    if (!usernameAvailable) {
      setErrors({ username: "Please choose an available username" });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const result = await verifyRegistrationOtp(
        formData.email,
        otpValue,
        username
      );

      if (result.success && result.user) {
        navigate("/", { replace: true });
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Registration failed";

      // Check if session expired
      if (
        errorMessage ===
          "Registration session expired. Please register again." ||
        errorMessage === "Please verify OTP first"
      ) {
        toast.error("Your session expired. Please start registration again.", {
          duration: 5000,
        });

        setRegisterStep(1);
        setOtpValue("");
        setUsername("");
        setUsernameAvailable(null);
        setErrors({});
      } else {
        setErrors({ username: errorMessage });
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResendOtp) return;

    setIsLoading(true);
    try {
      await apiMethods.auth.resendOtp(formData.email);
      setOtpTimer(30);
      setCanResendOtp(false);
      toast.success("OTP resent successfully");
    } catch (error) {
      toast.error("Failed to resend OTP");
    } finally {
      setIsLoading(false);
    }
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

// Extract password to a separate variable BEFORE useMemo
const currentPassword = formData.password;

const passwordStrength = useMemo(() => {
  if (!currentPassword) return { strength: 0, text: "", checks: {} };

  const checks = {
    length: currentPassword.length >= 8,
    lowercase: /[a-z]/.test(currentPassword),
    uppercase: /[A-Z]/.test(currentPassword),
    number: /\d/.test(currentPassword),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(currentPassword),
  };

  const strength = Object.values(checks).filter(Boolean).length;

  const strengthTexts = {
    1: "Very Weak",
    2: "Weak",
    3: "Fair",
    4: "Good",
    5: "Strong",
  };

  return {
    strength,
    text: strengthTexts[strength] || "",
    checks,
  };
}, [currentPassword]); // Now depends on primitive string value, not object
    
  return (
    <div className="min-h-screen relative pt-1">
      <div className="flex items-center justify-center min-h-screen relative z-10 px-4 sm:px-6 lg:px-6 py-4">
        <motion.div
          className="w-full max-w-md sm:max-w-lg space-y-3 sm:space-y-4"
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
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Create your account
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Start your learning journey today
            </p>
          </motion.div>

          {/* Register Form */}
          <motion.div variants={itemVariants}>
            <Card className="border-0 bg-card/60 backdrop-blur-sm shadow-sm sm:shadow-lg">
              <CardContent className="p-6 sm:p-7 md:p-8 overflow-hidden">
                <motion.div
                  key={registerStep}
                  initial={animations && !reducedMotion ? { opacity: 0 } : {}}
                  animate={animations && !reducedMotion ? { opacity: 1 } : {}}
                  transition={{ duration: 0.2 }}
                >
                  {registerStep === 1 ? (
                    <form
                      className="space-y-4 sm:space-y-6"
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

                      {/* Name Fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label
                            htmlFor="firstName"
                            className="text-sm font-medium text-foreground"
                          >
                            First Name
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <Input
                              id="firstName"
                              name="firstName"
                              type="text"
                              autoComplete="given-name"
                              required
                              className={`pl-10 h-10 sm:h-11 ${
                                errors.firstName ? "border-destructive" : ""
                              }`}
                              placeholder="John"
                              value={formData.firstName}
                              onChange={handleChange}
                              disabled={isLoading}
                            />
                          </div>
                          {errors.firstName && (
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
                              {errors.firstName}
                            </motion.p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label
                            htmlFor="lastName"
                            className="text-sm font-medium text-foreground"
                          >
                            Last Name
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <Input
                              id="lastName"
                              name="lastName"
                              type="text"
                              autoComplete="family-name"
                              required
                              className={`pl-10 h-10 sm:h-11 ${
                                errors.lastName ? "border-destructive" : ""
                              }`}
                              placeholder="Doe"
                              value={formData.lastName}
                              onChange={handleChange}
                              disabled={isLoading}
                            />
                          </div>
                          {errors.lastName && (
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
                              {errors.lastName}
                            </motion.p>
                          )}
                        </div>
                      </div>

                      {/* Email Field */}
                      <div className="space-y-2">
                        <label
                          htmlFor="email"
                          className="text-sm font-medium text-foreground"
                        >
                          Email Address
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            className={`pl-10 h-10 sm:h-11 ${
                              errors.email ? "border-destructive" : ""
                            }`}
                            placeholder="john@example.com"
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
                            className="text-sm text-destructive"
                          >
                            {errors.email}
                          </motion.p>
                        )}
                      </div>
                      {/* Date of Birth Field */}
                      <div className="space-y-2">
                        <label
                          htmlFor="dateOfBirth"
                          className="text-sm font-medium text-foreground"
                        >
                          Date of Birth
                        </label>
                        <Input
                          id="dateOfBirth"
                          name="dateOfBirth"
                          type="text"
                          required
                          placeholder="DD/MM/YYYY"
                          className={`h-10 sm:h-11 ${
                            errors.dateOfBirth ? "border-destructive" : ""
                          }`}
                          value={formData.dateOfBirth}
                          onChange={handleDateChange}
                          disabled={isLoading}
                          maxLength={10}
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter your date of birth in DD/MM/YYYY format.
                        </p>
                        {errors.dateOfBirth && (
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
                            {errors.dateOfBirth}
                          </motion.p>
                        )}
                      </div>

                      {/* Gender Field */}
                      <div className="space-y-2">
                        <label
                          htmlFor="gender"
                          className="text-sm font-medium text-foreground"
                        >
                          Gender
                        </label>
                        <div className="relative group">
                          <select
                            id="gender"
                            name="gender"
                            required
                            className={`w-full h-11 sm:h-12 px-3 pr-10 rounded-md border-2 bg-muted/60 appearance-none cursor-pointer transition-all text-foreground ${
                              errors.gender
                                ? "border-destructive focus:ring-destructive"
                                : "border-border hover:bg-muted/80 hover:border-foreground/40 focus:border-primary focus:ring-primary"
                            } focus:outline-none focus:ring-2 focus:ring-offset-0 focus:bg-muted/70`}
                            value={formData.gender}
                            onChange={handleChange}
                            disabled={isLoading}
                            style={{
                              colorScheme: "dark",
                            }}
                          >
                            <option
                              value=""
                              disabled
                              className="bg-popover text-muted-foreground"
                            >
                              Select your gender
                            </option>
                            <option
                              value="Male"
                              className="bg-popover text-foreground py-2"
                            >
                              Male
                            </option>
                            <option
                              value="Female"
                              className="bg-popover text-foreground py-2"
                            >
                              Female
                            </option>
                            <option
                              value="Other"
                              className="bg-popover text-foreground py-2"
                            >
                              Other
                            </option>
                          </select>
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none transition-colors group-hover:text-foreground">
                            <svg
                              className="h-4 w-4 text-muted-foreground transition-colors"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </div>
                        </div>
                        {errors.gender && (
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
                            {errors.gender}
                          </motion.p>
                        )}
                      </div>

                      {/* Password Field */}
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
                            autoComplete="new-password"
                            required
                            className={`pl-10 pr-10 h-10 sm:h-11 ${
                              errors.password ? "border-destructive" : ""
                            }`}
                            placeholder="Create a strong password"
                            value={formData.password}
                            onChange={handleChange}
                            disabled={isLoading}
                            data-lpignore="false"
                            data-form-type="other"
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

                        {/* Password Strength Indicator */}
                        {formData.password && (
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-300 ${
                                    passwordStrength.strength <= 2
                                      ? "bg-red-500"
                                      : passwordStrength.strength <= 3
                                      ? "bg-yellow-500"
                                      : passwordStrength.strength <= 4
                                      ? "bg-blue-500"
                                      : "bg-green-500"
                                  }`}
                                  style={{
                                    width: `${
                                      (passwordStrength.strength / 5) * 100
                                    }%`,
                                  }}
                                />
                              </div>
                              <span
                                className={`text-xs ${
                                  passwordStrength.strength <= 2
                                    ? "text-red-500"
                                    : passwordStrength.strength <= 3
                                    ? "text-yellow-500"
                                    : passwordStrength.strength <= 4
                                    ? "text-blue-500"
                                    : "text-green-500"
                                }`}
                              >
                                {passwordStrength.text}
                              </span>
                            </div>

                            <div className="text-xs text-muted-foreground space-y-1">
                              <div className="flex items-center space-x-2">
                                {passwordStrength.checks.length ? (
                                  <Check className="w-3 h-3 text-green-500" />
                                ) : (
                                  <div className="w-3 h-3 border border-muted-foreground rounded-full" />
                                )}
                                <span>At least 8 characters</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                {passwordStrength.checks.uppercase &&
                                passwordStrength.checks.lowercase ? (
                                  <Check className="w-3 h-3 text-green-500" />
                                ) : (
                                  <div className="w-3 h-3 border border-muted-foreground rounded-full" />
                                )}
                                <span>Uppercase and lowercase letters</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                {passwordStrength.checks.number ? (
                                  <Check className="w-3 h-3 text-green-500" />
                                ) : (
                                  <div className="w-3 h-3 border border-muted-foreground rounded-full" />
                                )}
                                <span>At least one number</span>
                              </div>
                            </div>
                          </div>
                        )}

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

                      {/* Confirm Password Field */}
                      <div className="space-y-2">
                        <label
                          htmlFor="confirmPassword"
                          className="text-sm font-medium text-foreground"
                        >
                          Confirm Password
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            autoComplete="new-password"
                            required
                            className={`pl-10 pr-10 h-10 sm:h-11 ${
                              errors.confirmPassword ? "border-destructive" : ""
                            }`}
                            placeholder="Confirm your password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            disabled={isLoading}
                            data-lpignore="false"
                            data-form-type="other"
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
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        {errors.confirmPassword && (
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
                            {errors.confirmPassword}
                          </motion.p>
                        )}
                      </div>

                      {/* Terms Agreement */}
                      <div className="space-y-3">
                        <div className="flex items-start space-x-2">
                          <Checkbox
                            id="agreeToTerms"
                            checked={formData.agreeToTerms}
                            onCheckedChange={(checked) =>
                              setFormData((prev) => ({
                                ...prev,
                                agreeToTerms: checked,
                              }))
                            }
                            disabled={isLoading}
                            className="mt-0.5"
                          />
                          <label
                            htmlFor="agreeToTerms"
                            className="text-sm text-foreground cursor-pointer leading-relaxed"
                          >
                            I agree to the{" "}
                            <Link
                              to="/terms"
                              className="text-primary hover:text-primary/80 underline"
                            >
                              Terms of Service
                            </Link>{" "}
                            and{" "}
                            <Link
                              to="/privacy"
                              className="text-primary hover:text-primary/80 underline"
                            >
                              Privacy Policy
                            </Link>
                          </label>
                        </div>
                        {errors.agreeToTerms && (
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
                            {errors.agreeToTerms}
                          </motion.p>
                        )}

                        {/* Newsletter Subscription */}
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="subscribeNewsletter"
                            checked={formData.subscribeNewsletter}
                            onCheckedChange={(checked) =>
                              setFormData((prev) => ({
                                ...prev,
                                subscribeNewsletter: checked,
                              }))
                            }
                            disabled={isLoading}
                          />
                          <label
                            htmlFor="subscribeNewsletter"
                            className="text-sm text-muted-foreground cursor-pointer"
                          >
                            Subscribe to our newsletter for updates and tips
                          </label>
                        </div>
                      </div>

                      {/* Submit Button */}
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 h-10 sm:h-11"
                        size="lg"
                      >
                        {isLoading ? (
                          <Loading variant="button" />
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Create Account
                          </>
                        )}
                      </Button>

                      {/* Sign In Link */}
                      <div className="text-center pt-4 border-t border-border/50">
                        <p className="text-sm text-muted-foreground">
                          Already have an account?{" "}
                          <Link
                            to="/login"
                            className="font-medium text-primary hover:text-primary/80 transition-colors"
                          >
                            Sign in here
                          </Link>
                        </p>
                      </div>
                    </form>
                  ) : registerStep === 2 ? (
                    // Registration Step 2: OTP Verification
                    <form
                      className="space-y-6 mt-[-60px]"
                      onSubmit={handleOtpVerification}
                    >
                      <div className="text-center space-y-4">
                        <div>
                          <h3 className="text-xl font-semibold text-foreground mb-2">
                            Verify Your Email
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            We've sent a verification code to
                          </p>
                          <p className="text-sm font-medium text-foreground mt-1">
                            {formData.email}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setRegisterStep(1);
                            setOtpValue("");
                            setErrors({});
                          }}
                          className="text-xs text-primary hover:text-primary/80 transition-colors"
                        >
                          Not you? Change details
                        </button>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground block text-center">
                            Enter OTP
                          </label>
                          <div className="flex justify-center gap-1.5 sm:gap-2">
                            {[0, 1, 2, 3, 4, 5].map((index) => (
                              <Input
                                key={index}
                                id={`reg-otp-${index}`}
                                type="text"
                                inputMode="numeric"
                                pattern="\d*"
                                maxLength={1}
                                required
                                autoComplete="off"
                                className={`w-11 h-11 sm:w-14 sm:h-14 text-center text-lg sm:text-xl font-semibold transition-all ${
                                  errors.otp
                                    ? "border-destructive focus:ring-destructive"
                                    : "focus:border-primary focus:ring-primary"
                                } focus:ring-2 focus:ring-offset-0`}
                                value={otpValue[index] || ""}
                                onChange={(e) => {
                                  const value = e.target.value.replace(
                                    /\D/g,
                                    ""
                                  );
                                  const newOtp = otpValue.split("");

                                  if (value) {
                                    newOtp[index] = value;
                                    const updatedOtp = newOtp.join("");
                                    setOtpValue(updatedOtp);

                                    // Auto-focus next input
                                    if (index < 5) {
                                      document
                                        .getElementById(`reg-otp-${index + 1}`)
                                        ?.focus();
                                    }

                                    if (errors.otp)
                                      setErrors({ ...errors, otp: "" });
                                  } else {
                                    // Handle backspace for mobile (when clearing input)
                                    newOtp[index] = "";
                                    setOtpValue(newOtp.join(""));
                                    if (index > 0) {
                                      document
                                        .getElementById(`reg-otp-${index - 1}`)
                                        ?.focus();
                                    }
                                  }
                                }}
                                onKeyDown={(e) => {
                                  // Desktop backspace handling
                                  if (e.key === "Backspace") {
                                    const newOtp = otpValue.split("");
                                    if (!otpValue[index] && index > 0) {
                                      newOtp[index - 1] = "";
                                      setOtpValue(newOtp.join(""));
                                      document
                                        .getElementById(`reg-otp-${index - 1}`)
                                        ?.focus();
                                    } else {
                                      newOtp[index] = "";
                                      setOtpValue(newOtp.join(""));
                                    }
                                  }
                                }}
                                onKeyUp={(e) => {
                                  // Extra safety for Android/iOS keyboards
                                  if (
                                    e.key === "Backspace" &&
                                    index > 0 &&
                                    !otpValue[index]
                                  ) {
                                    document
                                      .getElementById(`reg-otp-${index - 1}`)
                                      ?.focus();
                                  }
                                }}
                                onPaste={(e) => {
                                  e.preventDefault();
                                  const pastedData = e.clipboardData
                                    .getData("text")
                                    .replace(/\D/g, "")
                                    .slice(0, 6);
                                  setOtpValue(pastedData);

                                  // Focus the next empty box or last box
                                  const nextIndex = Math.min(
                                    pastedData.length,
                                    5
                                  );
                                  document
                                    .getElementById(`reg-otp-${nextIndex}`)
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

                        <Button
                          type="submit"
                          disabled={isLoading}
                          className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 h-11"
                          size="lg"
                        >
                          {isLoading ? (
                            <Loading variant="button" />
                          ) : (
                            "Verify Email"
                          )}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <form className="space-y-6" onSubmit={handleUsernameSubmit}>
                      <div className="text-center space-y-4">
                        <div>
                          <h3 className="text-xl font-semibold text-foreground mb-2">
                            Choose Your Username
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            This will be your unique identifier on the platform
                          </p>
                        </div>

                        <div className="space-y-2">
                          <label
                            htmlFor="username"
                            className="text-sm font-medium text-foreground block text-left"
                          >
                            Username
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <Input
                              id="username"
                              name="username"
                              type="text"
                              required
                              className={`pl-10 pr-10 h-11 sm:h-12 ${
                                errors.username
                                  ? "border-destructive"
                                  : usernameAvailable === true
                                  ? "border-green-500"
                                  : usernameAvailable === false
                                  ? "border-destructive"
                                  : ""
                              }`}
                              placeholder="Choose a unique username"
                              value={username}
                              onChange={(e) => {
                                const value = e.target.value.toLowerCase();

                                if (value.includes(" ")) {
                                  setErrors((prev) => ({
                                    ...prev,
                                    username: "Username cannot contain spaces",
                                  }));
                                  setUsernameAvailable(false);
                                  setUsername(value);
                                  return;
                                }

                                const cleanedValue = value.replace(
                                  /[^a-z0-9_]/g,
                                  ""
                                );
                                setUsername(cleanedValue);

                                // Only check if length is at least 3
                                if (cleanedValue.length >= 3) {
                                  checkUsernameAvailability(cleanedValue);
                                } else {
                                  setUsernameAvailable(null);
                                }
                              }}
                              disabled={isLoading}
                              minLength={3}
                              maxLength={20}
                              autoFocus
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                              {checkingUsername ? (
                                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                              ) : usernameAvailable === true ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : usernameAvailable === false ? (
                                <X className="h-4 w-4 text-destructive" />
                              ) : null}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground text-left">
                            3-20 characters. Lowercase letters, numbers, and
                            underscores only.
                          </p>
                          {errors.username && (
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
                              className="text-sm text-destructive text-left"
                            >
                              {errors.username}
                            </motion.p>
                          )}
                          {usernameAvailable === true && !errors.username && (
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
                              className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Username available
                            </motion.p>
                          )}
                        </div>

                        <Button
                          type="submit"
                          disabled={isLoading || !usernameAvailable}
                          className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 h-12 sm:h-12"
                          size="lg"
                        >
                          {isLoading ? (
                            <Loading variant="button" />
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4 mr-2" />
                              Complete Registration
                            </>
                          )}
                        </Button>

                        <button
                          type="button"
                          onClick={() => {
                            setRegisterStep(2);
                            setUsername("");
                            setUsernameAvailable(null);
                            setErrors({});
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Go back to OTP verification
                        </button>
                      </div>
                    </form>
                  )}
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
