import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useauth must be used within an AuthProvider");
  }
  return context;
};

// Configure axios defaults
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
axios.defaults.baseURL = API_URL;
axios.defaults.withCredentials = true; // This ensures cookies are sent

// Add response interceptor for handling auth errors
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Only redirect on 401 if we're not already on login page
    if (
      error.response?.status === 401 &&
      !window.location.pathname.includes("/login")
    ) {
      // Skip refresh logic for admin users - just redirect
      if (localStorage.getItem("currentUser")) {
        const userData = JSON.parse(localStorage.getItem("currentUser"));
        if (userData.role === "admin") {
          // For admin, just clear and redirect - don't try to refresh
          localStorage.removeItem("currentUser");
          window.location.href = "/login";
          return Promise.reject(error);
        }
      }

      // Only try refresh for regular users
      try {
        await axios.post("/auth/refresh-token");
        return axios.request(error.config);
      } catch (refreshError) {
        localStorage.removeItem("currentUser");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);

      // Just check localStorage - no need for immediate API verification
      const savedUser = localStorage.getItem("currentUser");
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem("currentUser");
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      setLoading(true);
      const response = await axios.post("/admin/login", credentials);
      if (response.data.success) {
        const userData = response.data.data.admin; // Changed from 'user' to 'admin' as we have changed the admin model
        setUser(userData);
        setIsAuthenticated(true);
        localStorage.setItem("currentUser", JSON.stringify(userData));
        toast.success("Login successful!");
        // Add redirect here instead of relying on useEffect
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1000);
        return { success: true };
      }
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || "Login failed";
      toast.error(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await axios.post("/admin/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear local state regardless of API call result
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem("currentUser");
      toast.success("Logged out successfully");
      setLoading(false);
    }
  };

  // Add this BEFORE the existing value object
  const updateProfile = async (profileData) => {
    try {
      setLoading(true);
      const response = await axios.put("/admin/profile", profileData);

      if (response.data.success) {
        const updatedUser = response.data.data.admin;
        // Preserve the original timestamps and ID
        const userWithTimestamps = {
          ...updatedUser,
          _id: updatedUser._id || updatedUser.id,
          createdAt: updatedUser.createdAt || user.createdAt,
          updatedAt: updatedUser.updatedAt || new Date().toISOString(),
          lastLogin: updatedUser.lastLogin || user.lastLogin,
        };

        window.dispatchEvent(
          new CustomEvent("adminOperation", {
            detail: { operation: "ProfileUpdate", success: true },
          })
        );
        setUser(userWithTimestamps);
        localStorage.setItem("currentUser", JSON.stringify(userWithTimestamps));
        toast.success("Profile updated successfully!");
        return { success: true };
      }
    } catch (error) {
      const message = error.response?.data?.message || "Profile update failed";
      toast.error(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (passwordData) => {
    try {
      setLoading(true);
      const response = await axios.post("/admin/change-password", passwordData);

      if (response.data.success) {
        window.dispatchEvent(
          new CustomEvent("adminOperation", {
            detail: { operation: "PasswordChange", success: true },
          })
        );
        toast.success("Password changed successfully!");
        return { success: true };
      }
    } catch (error) {
      const message = error.response?.data?.message || "Password change failed";
      toast.error(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (adminData) => {
    try {
      setLoading(true);
      const response = await axios.post("/admin/register", adminData);

      if (response.data.success) {
        toast.success("Admin registered successfully! Please login.");
        return { success: true };
      }
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || "Registration failed";
      toast.error(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const checkAdminExists = async () => {
    try {
      const response = await axios.get("/admin/check-exists");
      return { exists: response.data.exists };
    } catch (error) {
      console.error("Error checking admin:", error);
      return { exists: false };
    }
  };
  const value = {
    user,
    register,
    login,
    logout,
    loading,
    updateProfile,
    changePassword,
    isAuthenticated,
    checkAuthStatus,
    checkAdminExists,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
