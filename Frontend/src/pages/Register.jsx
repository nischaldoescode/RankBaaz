/**
 * renders the public register page with content settings, auth aware actions, seo data, and responsive layout
 *
 * @file frontend/src/pages/register.jsx
 * @module frontend/src/pages/register
 * @exports route component rendered by the client router
 */

import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
import { useContent } from "../context/ContentContext";
import { useSEO } from "../hooks/useSEO";
import { checkReservedUsername } from "../utils/reservedUsernames";
import { validateStudentEmail } from "../utils/emailValidation";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.6, staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const MemoizedInput = memo(({ className, ...props }) => {
  return <Input className={className} {...props} />;
});

MemoizedInput.displayName = "MemoizedInput";

const normalizeNameParts = (name = "") =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter((part) => part.length >= 2);

const normalizeUsernameInput = (value, maxLength = 20) =>
  value
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .slice(0, maxLength);

const usernameUsesName = (username, name) => {
  const parts = normalizeNameParts(name);
  if (parts.length === 0) return true;

  const compactUsername = username.replace(/_/g, "");
  const compactName = parts.join("");

  return (
    (compactName.length >= 3 && compactUsername.includes(compactName)) ||
    parts.some((part) => compactUsername.includes(part))
  );
};

const buildUsernameSuggestions = (name, maxLength = 20) => {
  const parts = normalizeNameParts(name);
  if (parts.length === 0) return [];

  const [first, second] = parts;
  const compact = parts.join("");
  const underscored = [first, second].filter(Boolean).join("_");
  const initial = second ? `${first}_${second[0]}` : "";

  return Array.from(new Set([compact, underscored, initial]))
    .map((item) => normalizeUsernameInput(item, maxLength))
    .filter((item) => item.length >= 3 && item.length <= maxLength);
};

const Register = () => {
  const location = useLocation();
  const prefilledEmail = useMemo(() => {
    const queryEmail = new URLSearchParams(location.search).get("email");
    return String(location.state?.email || queryEmail || "")
      .trim()
      .toLowerCase();
  }, [location.search, location.state]);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: prefilledEmail,
    password: "",
    confirmPassword: "",
    dateOfBirth: "",
    gender: "",
    agreeToTerms: false,
    subscribeNewsletter: true,
  });

  const [username, setUsername] = useState("");
  const [registerStep, setRegisterStep] = useState(1); // 1: form, 2: otp, 3: username
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
  const [debouncedPassword, setDebouncedPassword] = useState(formData.password);
  const fullName = `${formData.firstName} ${formData.lastName}`.trim();
  const usernameSuggestions = useMemo(
    () => buildUsernameSuggestions(fullName),
    [fullName],
  );

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
    title: "Create a Free Student Account for Courses and Tests",
    description: `Create your free ${
      contentSettings?.siteName || "Vidhgrow"
    } account and start your learning journey today. Access courses, take tests, and track your progress.`,
    keywords:
      "register, sign up, create account, student registration, free account, join now, new user",
    type: "website",
    noindex: false,
    canonicalUrl: `${contentSettings?.siteUrl || window.location.origin}/register`,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Create a Free Student Account for Courses and Tests",
      description: `Create a free account on ${
        contentSettings?.siteName || "Vidhgrow"
      }`,
      url: window.location.href,
      isPartOf: {
        "@type": "WebSite",
        name: contentSettings?.siteName || "Vidhgrow",
        url: contentSettings?.siteUrl || window.location.origin,
      },
      potentialAction: {
        "@type": "RegisterAction",
        target: window.location.href,
      },
    },
  });

  useEffect(() => {
    setMounted(true);
    if (isAuthenticated && !authLoading) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (!prefilledEmail) return;

    setFormData((prev) => ({
      ...prev,
      email: prev.email || prefilledEmail,
    }));
  }, [prefilledEmail]);

  // auto-focus first otp input when otp step loads
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

    // clear error using functional update - no dependency needed
    setErrors((prev) => {
      if (prev[name]) {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      }
      return prev;
    });
  }, []); // empty dependency array - function never recreates

  const checkUsernameAvailability = useCallback(
    debounce(async (username, nameForUsername) => {
      if (!/^[a-z0-9_]+$/.test(username)) {
        setUsernameAvailable(false);
        setErrors((prev) => ({
          ...prev,
          username: "Only lowercase letters, numbers, and underscores allowed",
        }));
        return;
      }

      if (!/[a-z]/.test(username)) {
        setUsernameAvailable(false);
        setErrors((prev) => ({
          ...prev,
          username: "Username must contain at least one letter",
        }));
        return;
      }

      // check reserved usernames on the client first
      const reservedCheck = checkReservedUsername(username);
      if (reservedCheck.reserved) {
        setUsernameAvailable(false);
        setErrors((prev) => ({
          ...prev,
          username: reservedCheck.reason || "This username is not available",
        }));
        return;
      }

      if (!usernameUsesName(username, nameForUsername)) {
        setUsernameAvailable(false);
        setErrors((prev) => ({
          ...prev,
          username: "Use your name in the username",
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
                : response.data.reason === "too_long"
                  ? "Username too long"
                  : response.data.reason === "invalid_format"
                    ? "Only lowercase letters, numbers, and underscores allowed"
                    : response.data.reason === "reserved"
                      ? "This username is not available"
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
    [],
  );

  const handleDateChange = useCallback((e) => {
    let value = e.target.value.replace(/\D/g, ""); // remove non-digits

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

    // use functional update - no dependency needed
    setErrors((prev) => {
      if (prev.dateOfBirth) {
        const newErrors = { ...prev };
        delete newErrors.dateOfBirth;
        return newErrors;
      }
      return prev;
    });
  }, []); // empty dependency array

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLoading) return;

    const emailCheck = validateStudentEmail(formData.email);
    if (!emailCheck.valid) {
      setErrors({ email: emailCheck.message });
      return;
    }

    // check terms agreement locally
    if (!formData.agreeToTerms) {
      setErrors({ agreeToTerms: "You must agree to the terms and conditions" });
      return;
    }

    // check password match locally
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
        email: emailCheck.email,
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
      // call a api endpoint to verify otp without username
      const response = await apiMethods.auth.verifyRegistrationOtp(
        formData.email,
        otpValue,
      );

      if (response.data.success) {
        setOtpTimer(0);
        setCanResendOtp(false);
        setRegisterStep(3);
        const suggestedUsername = usernameSuggestions[0];
        if (suggestedUsername && !username) {
          setUsername(suggestedUsername);
          checkUsernameAvailability(suggestedUsername, fullName);
        }
        toast.success("Email verified! Now choose your username");
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        "Failed to verify OTP. Please try again.";

      // check if session expired - send user back to step 1
      if (
        errorMessage === "Registration session expired. Please register again."
      ) {
        toast.error("Your session expired. Please start registration again.", {
          duration: 5000,
        });

        // reset to initial state
        setRegisterStep(1);
        setOtpValue("");
        setUsername("");
        setUsernameAvailable(null);
        setErrors({});

        // optionally we will keep their email so they don't have to retype everything
        // formdata.email is preserved, but user will need to re-enter other details
      } else {
        // normal otp error
        setErrors({ otp: errorMessage });
        // toast.error(errormessage);
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

    const normalizedUsername = normalizeUsernameInput(username);

    if (normalizedUsername.length > 20) {
      setErrors({ username: "Username too long, max 20 characters" });
      return;
    }

    if (!usernameUsesName(normalizedUsername, fullName)) {
      setErrors({ username: "Use your name in the username" });
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
        normalizedUsername,
      );

      if (result.success && result.user) {
        navigate("/", { replace: true });
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Registration failed";

      // check if session expired
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

  const handleChangeRegistrationDetails = () => {
    if (registerStep === 2 && otpTimer > 0) {
      toast.error(`Please wait ${otpTimer}s before changing details`);
      return;
    }

    setRegisterStep(1);
    setOtpValue("");
    setUsername("");
    setUsernameAvailable(null);
    setErrors({});
    setOtpTimer(0);
    setCanResendOtp(false);
  };

  const shouldAnimate = animations && !reducedMotion;
  const errorAnimation = shouldAnimate
    ? { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 } }
    : {};

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPassword(formData.password);
    }, 150);

    return () => clearTimeout(timer);
  }, [formData.password]);

  const passwordStrength = useMemo(() => {
    if (!debouncedPassword) return { strength: 0, text: "", checks: {} };

    const checks = {
      length: debouncedPassword.length >= 8,
      lowercase: /[a-z]/.test(debouncedPassword),
      uppercase: /[A-Z]/.test(debouncedPassword),
      number: /\d/.test(debouncedPassword),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(debouncedPassword),
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
  }, [debouncedPassword]);

  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <Loading variant="auth" />
      </div>
    );
  }

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
            {registerStep === 1 ? (
              <Link
                to="/"
                className="inline-flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm sm:text-base">Back to home</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleChangeRegistrationDetails}
                disabled={registerStep === 2 && otpTimer > 0}
                className={`inline-flex items-center space-x-2 transition-colors duration-200 ${
                  registerStep === 2 && otpTimer > 0
                    ? "cursor-not-allowed text-muted-foreground/50"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm sm:text-base">
                  {registerStep === 2 && otpTimer > 0
                    ? `Back in ${otpTimer}s`
                    : "Back to registration form"}
                </span>
              </button>
            )}
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
                            <MemoizedInput
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
                              {...errorAnimation}
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
                            <MemoizedInput
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
                              {...errorAnimation}
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
                          <MemoizedInput
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
                            {...errorAnimation}
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
                        <MemoizedInput
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
                            {...errorAnimation}
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
                            {...errorAnimation}
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
                          <MemoizedInput
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
                            {...errorAnimation}
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
                          <MemoizedInput
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
                            {...errorAnimation}
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
                            {...errorAnimation}
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
                    // registration otp verification
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

                        {/* FIXED: Only show "Change details" when timer expires */}
                        {otpTimer === 0 && (
                          <button
                            type="button"
                            onClick={handleChangeRegistrationDetails}
                            className="text-xs text-primary hover:text-primary/80 transition-colors"
                          >
                            Change your details?
                          </button>
                        )}

                        {/* ADDED: Show countdown when timer is active */}
                        {otpTimer > 0 && (
                          <p className="text-xs text-muted-foreground">
                            You can change details in {otpTimer}s
                          </p>
                        )}

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground block text-center">
                            Enter OTP
                          </label>
                          <div className="flex justify-center gap-1.5 sm:gap-2">
                            {[0, 1, 2, 3, 4, 5].map((index) => (
                              <MemoizedInput
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
                                    "",
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
                                    5,
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
                              {...errorAnimation}
                              className="text-sm text-destructive"
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
                            <MemoizedInput
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
                                const cleanedValue = normalizeUsernameInput(
                                  e.target.value,
                                );
                                setUsername(cleanedValue);

                                // Only check if length is at least 3
                                if (cleanedValue.length >= 3) {
                                  checkUsernameAvailability(
                                    cleanedValue,
                                    fullName,
                                  );
                                } else {
                                  setUsernameAvailable(null);
                                  setErrors((prev) => {
                                    const { username, ...rest } = prev;
                                    return rest;
                                  });
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
                            Use your name. 3-20 characters, lowercase letters,
                            numbers, and underscores only.
                          </p>
                          {usernameSuggestions.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {usernameSuggestions.map((suggestion) => (
                                <button
                                  key={suggestion}
                                  type="button"
                                  onClick={() => {
                                    setUsername(suggestion);
                                    setUsernameAvailable(null);
                                    checkUsernameAvailability(
                                      suggestion,
                                      fullName,
                                    );
                                  }}
                                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                    username === suggestion
                                      ? "border-primary bg-primary/10 text-primary"
                                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  @{suggestion}
                                </button>
                              ))}
                            </div>
                          )}
                          {errors.username && (
                            <motion.p
                              {...errorAnimation}
                              className="text-sm text-destructive"
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
