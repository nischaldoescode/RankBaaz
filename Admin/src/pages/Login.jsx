import React, { useState, useEffect } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  BarChart3,
  CheckCircle,
  X,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import AdminRegister from "../pages/AdminRegister";

const Login = () => {
  const [showRegister, setShowRegister] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const { login, loading, isAuthenticated, checkAdminExists } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  // Redirect if already authenticated

  // Check if admin exists on component mount
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const response = await checkAdminExists();
        if (!response.exists) {
          setShowRegister(true);
        }
      } catch (error) {
        console.error("Error checking admin:", error);
      } finally {
        setCheckingAdmin(false);
      }
    };

    checkAdmin();
  }, [checkAdminExists]);
  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    // Auto-hide after 4 seconds
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 4000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // Handle copy/paste restrictions for password when visible
  const handlePasswordKeyDown = (e) => {
    if (showPassword && (e.ctrlKey || e.metaKey)) {
      if (e.key === "c" || e.key === "v" || e.key === "x") {
        e.preventDefault();
        showToast("Copy/paste disabled when password is visible", "error");
      }
    }
  };

  const handlePasswordContextMenu = (e) => {
    if (showPassword) {
      e.preventDefault();
      showToast("Right-click disabled when password is visible", "error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    try {
      const result = await login(formData);

      if (result.success) {
        showToast("Welcome back! Login successful", "success");
        // Remove the redirect from here - AuthContext handles it
      } else {
        setErrors({ submit: result.message });
        showToast(result.message || "Login failed. Please try again.", "error");
      }
    } catch (error) {
      const errorMessage = error.message || "An unexpected error occurred";
      setErrors({ submit: errorMessage });
      showToast(errorMessage, "error");
    }
  };

  if (checkingAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (showRegister) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center py-8 px-4">
        <div className="max-w-md w-full">
          <AdminRegister onSwitchToLogin={() => setShowRegister(false)} />
        </div>
      </div>
    );
  }
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            {/* Logo Container */}
              <img
                src="/logo.png"
                alt="RankBaaz Logo"
                className="w-full h-full object-contain p-4 sm:p-3 rounded-2xl"
                onError={(e) => {
                  // Fallback to icon if image fails to load
                  e.target.style.display = "none";
                  e.target.nextElementSibling.style.display = "flex";
                }}
              />
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
              Welcome Back
            </h2>
            <p className="text-gray-600 text-sm sm:text-base">
              Sign in to your admin dashboard
            </p>
          </div>

          {/* Form Container */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <form onSubmit={handleSubmit} className="space-y-6">
              {errors.submit && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                  {errors.submit}
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 border ${
                      errors.email
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-colors duration-200`}
                    placeholder="your@email.com"
                  />
                </div>
                {errors.email && (
                  <p className="text-red-600 text-sm flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    onKeyDown={handlePasswordKeyDown}
                    onContextMenu={handlePasswordContextMenu}
                    className={`w-full pl-10 pr-12 py-3 border ${
                      errors.password
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    } rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-colors duration-200`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200 focus:outline-none cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-600 text-sm flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 cursor-pointer"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 cursor-pointer"></div>
                    Signing you in...
                  </div>
                ) : (
                  "Sign In"
                )}
              </button>

              {/* Admin Notice */}
              <div className="text-center pt-4">
                <p className="text-sm text-gray-500 bg-gray-50 rounded-lg py-3 px-4">
                  Admin access only.
                </p>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="text-center">
            <p className="text-sm text-gray-500">
              © 2025 RankBaaz Admin Panel. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style>
        {`
          @keyframes slide-up {
            from {
              opacity: 0;
              transform: translateY(100%);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @media (min-width: 640px) {
            @keyframes slide-up {
              from {
                opacity: 0;
                transform: translate(-50%, 100%);
              }
              to {
                opacity: 1;
                transform: translate(-50%, 0);
              }
            }
          }
          
          .animate-slide-up {
            animation: slide-up 0.3s ease-out;
          }

          /* Fix autofill styling issues */
          input:-webkit-autofill,
          input:-webkit-autofill:hover,
          input:-webkit-autofill:focus,
          input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 30px white inset !important;
            -webkit-text-fill-color: #374151 !important;
            color: #374151 !important;
          }

          /* Additional autofill fixes for different browsers */
          input:-moz-autofill {
            background-color: white !important;
            color: #374151 !important;
          }

          /* Ensure normal text color is maintained */
          input {
            color: #374151 !important;
          }
        `}
      </style>
    </>
  );
};

export default Login;
