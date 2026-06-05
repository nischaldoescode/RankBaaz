/**
 * provides admin auth context state, api access, loading flags, and shared actions to child views
 *
 * @file admin/src/contexts/authcontext.jsx
 * @module admin/src/contexts/authcontext
 * @exports provider and hooks used by child components
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { adminRequestSigner } from "../utils/adminRequestSigner.js";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useauth must be used within an AuthProvider");
  }
  return context;
};

// configure axios defaults
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:7000";
axios.defaults.baseURL = API_URL;
axios.defaults.withCredentials = true;

let signingSecretRefreshPromise = null;

const refreshAdminSigningSecret = async () => {
  if (!signingSecretRefreshPromise) {
    signingSecretRefreshPromise = axios
      .get("/security/signing-secret", {
        _skipInterceptor: true,
        params: { _ts: Date.now() },
      })
      .finally(() => {
        signingSecretRefreshPromise = null;
      });
  }

  return signingSecretRefreshPromise;
};

/**
 * request interceptor - signatures to admin requests
 * runs every axios request
 */
axios.interceptors.request.use(
  async (config) => {
    if (config._skipInterceptor) {
      return config;
    }

    // public endpoints that don't need signatures
    const publicEndpoints = [
      "/admin/login",
      "/admin/check-exists",
      "/security/signing-secret",
    ];

    const isPublicEndpoint = publicEndpoints.some((endpoint) =>
      config.url?.includes(endpoint)
    );

    if (isPublicEndpoint) {
      return config;
    }

    // load secret if not in memory
    if (!adminRequestSigner.isSecretValid()) {
      adminRequestSigner.loadSigningSecret();
    }

    // sign request if authenticated
    const isAuthenticated = !!localStorage.getItem("currentUser");

    if (isAuthenticated && adminRequestSigner.isSecretValid()) {
      config = adminRequestSigner.signRequest(config);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * response interceptor - handle signature errors and auth errors
 */
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // a constant to define signature related error codes based on backend
    const signatureErrorCodes = [
      "SIGNATURE_EXPIRED",
      "SIGNATURE_MISSING",
      "SIGNATURE_INVALID",
      "REPLAY_ATTACK",
    ];

    if (
      error.response?.data?.code &&
      signatureErrorCodes.includes(error.response.data.code)
    ) {
      // try to block the inifite refreshing loop
      if (originalRequest._signatureRetry) {
        console.error("Signature retry failed - clearing auth");
        adminRequestSigner.clearSigningSecret();
        localStorage.removeItem("currentUser");
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        console.log("Refreshing signing secret...");

        originalRequest._signatureRetry = true;

        // clear old secret
        adminRequestSigner.clearSigningSecret();

        // fetch secret without cache/etag reuse
        const secretresponse = await refreshadminsigningsecret();
        if (!secretResponse.data.success) {
          throw new Error("Failed to get signing secret");
        }

        const { signingSecret, expiresIn } = secretResponse.data.data;
        adminRequestSigner.setSigningSecret(signingSecret, expiresIn);

        console.log("Signing secret refreshed successfully");

        // keep _signatureretry on the retried request. if this still fails,
        // the next response stops instead of refreshing forever
        const signedRequest = adminRequestSigner.signRequest(originalRequest);
        return axios(signedRequest);
      } catch (signatureError) {
        console.error("Signature refresh failed:", signatureError);
        adminRequestSigner.clearSigningSecret();

        if (signatureError.response?.status === 401) {
          localStorage.removeItem("currentUser");
          window.location.href = "/login";
        }

        return Promise.reject(error);
      }
    }

    // handle 401 unauthorized errors (existing auth error handling)
    if (error.response?.status === 401) {
      const originalRequest = error.config;

      // prevent infinite loops
      if (originalRequest._retry) {
        return Promise.reject(error);
      }

      // only redirect on 401 if not already on login page
      if (
        !window.location.pathname.includes("/login") &&
        !originalRequest.url.includes("/admin/profile")
      ) {
        originalRequest._retry = true;

        // for admin, clear state and redirect
        if (localStorage.getItem("currentUser")) {
          const userData = JSON.parse(localStorage.getItem("currentUser"));
          if (userData.role === "admin") {
            localStorage.removeItem("currentUser");
            adminRequestSigner.clearSigningSecret(); // also clear signing secret

            // delay redirect to allow current request to complete
            setTimeout(() => {
              window.location.href = "/login";
            }, 100);
            return Promise.reject(error);
          }
        }
      }
    }

    return Promise.reject(error);
  }
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);

      // check localstorage first
      const savedUser = localStorage.getItem("currentUser");
      if (savedUser) {
        const userData = JSON.parse(savedUser);

        // verify with backend that session is still valid (only for admin)
        if (userData.role === "admin") {
          try {
            const response = await axios.get("/admin/profile");
            if (response.data.success) {
              setUser(userData);
              setIsAuthenticated(true);
            } else {
              throw new Error("Invalid session");
            }
          } catch (error) {
            // session invalid, clear everything
            console.error("Session validation failed:", error);
            localStorage.removeItem("currentUser");
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          setUser(userData);
          setIsAuthenticated(true);
        }
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

  /**
   * sha-256 solver for admin captcha (same as user-facing)
   */
  const solveAdminCaptcha = async (seed, difficulty) => {
    let nonce = 0;
    const requiredPrefix = "0".repeat(difficulty);
    const encoder = new TextEncoder();

    while (true) {
      const data = encoder.encode(seed + nonce);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      if (hashHex.startsWith(requiredPrefix)) {
        return nonce;
      }

      nonce++;

      // yield every 1000 attempts
      if (nonce % 1000 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      if (nonce > 2000000) {
        throw new Error("Captcha solving timeout");
      }
    }
  };

  const login = async (credentials) => {
    try {
      setLoading(true);

      let response;
      try {
        response = await axios.post("/admin/login", credentials);
      } catch (error) {
        // captcha handling (same as )
        if (error.response?.data?.code === "CAPTCHA_REQUIRED") {
          const captchaData = error.response.data.data;
          const solvingToast = toast.loading("Solving security challenge...");

          try {
            const nonce = await solveAdminCaptcha(
              captchaData.seed,
              captchaData.difficulty
            );

            toast.dismiss(solvingToast);

            response = await axios.post("/admin/login", {
              ...credentials,
              captchaSeed: captchaData.seed,
              captchaNonce: nonce,
            });
          } catch (solveError) {
            toast.dismiss(solvingToast);
            toast.error("Security verification failed. Please try again.");
            return { success: false, message: "Captcha solving failed" };
          }
        } else {
          throw error;
        }
      }

      if (response.data.success) {
        const userData = response.data.data.admin;

        // store user data first
        setUser(userData);
        setIsAuthenticated(true);
        localStorage.setItem("currentUser", JSON.stringify(userData));

        // wait for next tick to ensure cookie is set
        await new Promise((resolve) => setTimeout(resolve, 100));

        // fetch admin signing secret cookie is set
        try {
          console.log("Fetching signing secret...");

          const secretResponse = await axios.get(
            "/security/signing-secret",
            {
              withCredentials: true,
              params: { _ts: Date.now() },
            }
          );

          if (secretResponse.data.success) {
            const { signingSecret, expiresIn } = secretResponse.data.data;
            adminRequestSigner.setSigningSecret(signingSecret, expiresIn);

            console.log("Signing secret acquired successfully");
          } else {
            throw new Error("Failed to get signing secret");
          }
        } catch (secretError) {
          console.error(
            "Failed to get signing secret:",
            secretError
          );

          // if we can't get signing secret, clear everything and don't proceed
          setUser(null);
          setIsAuthenticated(false);
          localStorage.removeItem("currentUser");

          toast.error("Authentication setup failed. Please try again.");
          return { success: false, message: "Failed to initialize session" };
        }

        toast.success("Login successful!");

        return new Promise((resolve) => {
          setTimeout(() => {
            window.location.href = "/dashboard";
            resolve({ success: true });
          }, 1500);
        });
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
      // clear admin signing secret
      adminRequestSigner.clearSigningSecret();

      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem("currentUser");
      toast.success("Logged out successfully");
      setLoading(false);
    }
  };

  // this the existing value object
  const updateProfile = async (profileData) => {
    try {
      setLoading(true);
      const response = await axios.put("/admin/profile", profileData);

      if (response.data.success) {
        const updatedUser = response.data.data.admin;
        // preserve the original timestamps and id
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
