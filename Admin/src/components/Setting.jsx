import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  User,
  Lock,
  Calendar,
  Mail,
  Shield,
  Clock,
  MapPin,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  ArrowLeft,
} from "lucide-react";

const AdminSettings = () => {
  const { user, updateProfile, changePassword, loading } = useAuth();

  // Profile form state
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    age: "",
    gender: "",
  });

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // UI states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });
  // Validation states
  const [formErrors, setFormErrors] = useState({});
  const [apiErrors, setApiErrors] = useState({});
  const [isValidating, setIsValidating] = useState(false);
  // Initialize profile data
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || "",
        email: user.email || "",
        age: user.age || "",
        gender: user.gender || "",
      });
    }
  }, [user]);
  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      window.location.href = "/login";
    }
  }, [user]);

  // Password validation
  useEffect(() => {
    const password = passwordData.newPassword;
    setPasswordValidation({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    });
  }, [passwordData.newPassword]);

  const validateProfileForm = () => {
    const errors = {};

    // Name validation
    if (!profileData.name.trim()) {
      errors.name = "Name is required";
    } else if (profileData.name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    } else if (profileData.name.trim().length > 50) {
      errors.name = "Name must not exceed 50 characters";
    }

    // Email validation
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!profileData.email.trim()) {
      errors.email = "Email is required";
    } else if (!emailRegex.test(profileData.email)) {
      errors.email = "Please enter a valid email address";
    }

    // Age validation
    if (!profileData.age) {
      errors.age = "Age is required";
    } else {
      const age = parseInt(profileData.age);
      if (age < 10 || age > 100) {
        errors.age = "Age must be between 10 and 100";
      }
    }

    // Gender validation
    if (!profileData.gender) {
      errors.gender = "Gender is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();

    // Clear previous API errors
    setApiErrors({});

    if (!validateProfileForm()) {
      return;
    }

    const result = await updateProfile(profileData);
    if (result.success) {
      // Profile updated successfully
      setApiErrors({});
    } else {
      // Handle API errors
      if (result.message && result.message.includes("Email is already taken")) {
        setApiErrors({ email: result.message });
      } else {
        setApiErrors({ general: result.message || "Profile update failed" });
      }
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("New passwords don't match");
      return;
    }

    const isValidPassword = Object.values(passwordValidation).every(Boolean);
    if (!isValidPassword) {
      alert("Please meet all password requirements");
      return;
    }

    const result = await changePassword({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });

    if (result.success) {
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not available";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid date";
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      return "Invalid date";
    }
  };

  const goBack = () => {
    window.location.href = "/dashboard";
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={goBack}
                className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Admin Settings
                </h1>
                <p className="text-gray-600 mt-1">
                  Manage your admin account preferences
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-blue-100 rounded-full">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Admin</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                    activeTab === "profile"
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <User className="h-4 w-4" />
                  <span className="text-sm font-medium">Profile</span>
                </button>
                <button
                  onClick={() => setActiveTab("password")}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                    activeTab === "password"
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Lock className="h-4 w-4" />
                  <span className="text-sm font-medium">Password</span>
                </button>
                <button
                  onClick={() => setActiveTab("info")}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                    activeTab === "info"
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">Account Info</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === "profile" && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Profile Settings
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Update your basic profile information
                  </p>
                </div>
                <form onSubmit={handleProfileSubmit} className="p-6">
                  {apiErrors.general && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600">
                        {apiErrors.general}
                      </p>
                    </div>
                  )}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={profileData.name}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              name: e.target.value,
                            })
                          }
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your full name"
                          required
                        />
                      </div>
                      {formErrors.name && (
                        <p className="mt-1 text-sm text-red-600">
                          {formErrors.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="email"
                          value={profileData.email}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              email: e.target.value.toLowerCase(),
                            })
                          }
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your email address"
                          required
                        />
                      </div>
                      {(formErrors.email || apiErrors.email) && (
                        <p className="mt-1 text-sm text-red-600">
                          {formErrors.email || apiErrors.email}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Age
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="number"
                          value={profileData.age}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              age: e.target.value,
                            })
                          }
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your age"
                          min="12"
                          max="100"
                        />
                      </div>
                      {formErrors.age && (
                        <p className="mt-1 text-sm text-red-600">
                          {formErrors.age}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gender
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <select
                          value={profileData.gender}
                          onChange={(e) =>
                            setProfileData({
                              ...profileData,
                              gender: e.target.value,
                            })
                          }
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                          required
                        >
                          <option value="">Select gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      {formErrors.gender && (
                        <p className="mt-1 text-sm text-red-600">
                          {formErrors.gender}
                        </p>
                      )}
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        {loading ? "Updating..." : "Update Profile"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {activeTab === "password" && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Change Password
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Update your account password
                  </p>
                </div>
                <form onSubmit={handlePasswordSubmit} className="p-6">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          value={passwordData.currentPassword}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              currentPassword: e.target.value,
                            })
                          }
                          className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter current password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowCurrentPassword(!showCurrentPassword)
                          }
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          {showCurrentPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={passwordData.newPassword}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              newPassword: e.target.value,
                            })
                          }
                          className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter new password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      {/* Password Requirements */}
                      {passwordData.newPassword && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            Password Requirements:
                          </p>
                          <div className="space-y-1">
                            {Object.entries({
                              length: "At least 8 characters",
                              uppercase: "One uppercase letter",
                              lowercase: "One lowercase letter",
                              number: "One number",
                              special: "One special character",
                            }).map(([key, requirement]) => (
                              <div
                                key={key}
                                className="flex items-center space-x-2"
                              >
                                {passwordValidation[key] ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )}
                                <span
                                  className={`text-sm ${
                                    passwordValidation[key]
                                      ? "text-green-700"
                                      : "text-red-700"
                                  }`}
                                >
                                  {requirement}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={passwordData.confirmPassword}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              confirmPassword: e.target.value,
                            })
                          }
                          className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Confirm new password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {passwordData.confirmPassword &&
                        passwordData.newPassword !==
                          passwordData.confirmPassword && (
                          <p className="mt-1 text-sm text-red-600">
                            Passwords don't match
                          </p>
                        )}
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={
                          loading ||
                          !Object.values(passwordValidation).every(Boolean) ||
                          passwordData.newPassword !==
                            passwordData.confirmPassword
                        }
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        {loading ? "Changing..." : "Change Password"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {activeTab === "info" && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Account Information
                  </h2>
                  <p className="text-gray-600 mt-1">
                    View your account details
                  </p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Mail className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Email
                          </p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Shield className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Role
                          </p>
                          <p className="text-sm text-gray-600 capitalize">
                            {user.role}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <User className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            User ID
                          </p>
                          <p className="text-sm text-gray-600 font-mono">
                            {user._id}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Calendar className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Account Created
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatDate(user.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Clock className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Last Updated
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatDate(user.updatedAt)}
                          </p>
                        </div>
                      </div>

                      {user.lastLogin && (
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                          <MapPin className="h-5 w-5 text-gray-500" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Last Login
                            </p>
                            <p className="text-sm text-gray-600">
                              {formatDate(user.lastLogin)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
