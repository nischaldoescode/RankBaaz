import axios from "axios";
import toast from "react-hot-toast";

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  timeout: 60000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * SHA-256 Challenge Solver (Browser-compatible)
 * Finds nonce where SHA-256(seed + nonce) starts with N zeros
 */
const solveChallenge = async (seed, difficulty) => {
  let nonce = 0;
  const requiredPrefix = "0".repeat(difficulty);

  // Use Web Crypto API (available in all modern browsers)
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

    // Prevent UI freeze - yield to event loop every 1000 attempts
    if (nonce % 1000 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    // Safety limit (should solve in ~5000 attempts for difficulty 4)
    if (nonce > 1000000) {
      throw new Error("Challenge solving timeout");
    }
  }
};

// frontend/src/services/api.js

// Add interceptor to include CSRF token
api.interceptors.request.use(
  async (config) => {
    // Skip for GET requests
    if (config.method === "get") return config;

    // Get CSRF token from localStorage or fetch new one
    let csrfToken = localStorage.getItem("csrf_token");

    if (!csrfToken) {
      const response = await axios.get("/api/security/csrf-token");
      csrfToken = response.data.data.csrfToken;
      localStorage.setItem("csrf_token", csrfToken);
    }

    // Add token to header
    config.headers["X-CSRF-Token"] = csrfToken;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle CSRF token expiration
    if (error.response?.data?.code === "CSRF_TOKEN_EXPIRED") {
      const response = await axios.get("/api/security/csrf-token");
      const newToken = response.data.data.csrfToken;
      localStorage.setItem("csrf_token", newToken);

      originalRequest.headers["X-CSRF-Token"] = newToken;
      return axios(originalRequest);
    }

    // Handle bot challenge requirement
    if (error.response?.data?.code === "CHALLENGE_REQUIRED") {
      const challengeData = error.response.data.data;

      try {
        // Show solving toast
        const solvingToast = toast.loading("Verifying security...");

        // Solve challenge
        const nonce = await solveChallenge(
          challengeData.seed,
          challengeData.difficulty
        );

        // Submit solution
        await axios.post("/api/security/verify-challenge", {
          seed: challengeData.seed,
          nonce,
        });

        // Dismiss toast
        toast.dismiss(solvingToast);

        // Retry original request
        return axios(originalRequest);
      } catch (challengeError) {
        toast.error("Security verification failed. Please refresh the page.");
        return Promise.reject(challengeError);
      }
    }

    return Promise.reject(error);
  }
);

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors
// Track refresh token request to prevent multiple simultaneous calls
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    if (response.config.url?.includes("/auth/")) {
      if (!response.data) {
        console.error("Invalid response structure - no data:", response);
        throw new Error("Invalid server response");
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle network errors
    if (!error.response) {
      console.error("Network error:", error.message);
      return Promise.reject({
        message: "Network error. Please check your connection.",
        isNetworkError: true,
        originalError: error,
      });
    }

    const { status, data } = error.response;

    // CRITICAL FIX: Prevent refresh loop
    if (status === 401) {
      // Don't retry if:
      // 1. Already retried this request
      // 2. The failed request IS the refresh token endpoint
      // 3. The error message indicates no refresh token exists
      if (
        originalRequest._retry ||
        originalRequest.url?.includes("/refresh-token") ||
        data?.message === "Refresh token not found"
      ) {
        // Clear auth and redirect to login
        localStorage.removeItem("user");
        isRefreshing = false;
        processQueue(error, null);

        // Only redirect if not already on auth pages
        if (
          !window.location.pathname.includes("/login") &&
          !window.location.pathname.includes("/register")
        ) {
          window.location.href = "/login";
        }

        return Promise.reject({
          message: "Session expired. Please login again.",
          isAuthError: true,
        });
      }

      // Mark request as retried
      originalRequest._retry = true;

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      // Start refresh process
      isRefreshing = true;

      try {
        await api.post("/api/auth/refresh-token");
        isRefreshing = false;
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        processQueue(refreshError, null);
        localStorage.removeItem("user");

        if (
          !window.location.pathname.includes("/login") &&
          !window.location.pathname.includes("/register")
        ) {
          window.location.href = "/login";
        }

        return Promise.reject({
          message: "Session expired. Please login again.",
          isAuthError: true,
        });
      }
    }

    // Log other errors
    switch (status) {
      case 400:
        console.error("Bad request:", data?.message);
        break;
      case 403:
        console.error("Access denied");
        break;
      case 404:
        console.error("Resource not found:", data?.message);
        break;
      case 429:
        console.error("Too many requests");
        break;
      case 500:
        console.error("Server error");
        break;
      case 503:
        console.error("Service unavailable");
        break;
      default:
        console.error("Error:", data?.message);
    }

    return Promise.reject(error);
  }
);

// API methods
export const apiMethods = {
  // Generic methods
  get: (url, config = {}) => api.get(url, config),
  post: (url, data = {}, config = {}) => api.post(url, data, config),
  put: (url, data = {}, config = {}) => api.put(url, data, config),
  patch: (url, data = {}, config = {}) => api.patch(url, data, config),
  delete: (url, config = {}) => api.delete(url, config),

  // Auth methods
  auth: {
    quickCheckUsername: (username) =>
      api.get(`/api/auth/username-available/${username}`),
    initiateLogin: (email) => api.post("/api/auth/initiate-login", { email }),
    verifyLoginOTP: (email, otp) =>
      api.post("/api/auth/verify-login-otp", { email, otp }),
    login: (credentials) => api.post("/api/auth/login", credentials),
    register: (userData) => api.post("/api/auth/register", userData),
    logout: () => api.post("/api/auth/logout"),
    refreshToken: () => api.post("/api/auth/refresh-token"),
    forgotPassword: (identifier) =>
      api.post("/api/auth/forgot-password", { identifier }),
    verifyForgotPasswordOTP: (email, otp) =>
      api.post("/api/auth/verify-forgot-password-otp", { email, otp }),
    resetPassword: (resetToken, newPassword) =>
      api.post("/api/auth/reset-password", { resetToken, newPassword }),
    verifyRegistrationOtp: (email, otp, username = null) =>
      api.post("/api/auth/verify-otp", { email, otp, username }),
    resendOtp: (email) => api.post("/api/auth/resend-otp", { email }),
    changePassword: (passwords) =>
      api.put("/api/auth/change-password", passwords),
    getProfile: () => api.get("/api/auth/profile"),
    updateProfile: (profileData) => api.put("/api/auth/profile", profileData),
  },

  profile: {
    getPublicProfile: (username) => api.get(`/api/profile/${username}`),
    getUserSettings: () => api.get(`/api/profile/settings`),
    getGlobalLeaderboard: (limit = 100) =>
      api.get(`/api/profile/leaderboard/global?limit=${limit}`),
    getUserPosition: () => api.get(`/api/profile/leaderboard/position`),
    searchUsernames: (query, limit = 10) =>
      api.get(`/api/profile/search?query=${query}&limit=${limit}`),
  },
  // course methods
  // course methods
  courses: {
    getAll: (params = {}) => {
      // SAFETY: Never allow frontend to request inactive courses
      const safeParams = { ...params };
      delete safeParams.isActive; // Remove any isActive filter attempts
      return api.get("/api/courses", { params: safeParams });
    },
    getById: (id) => api.get(`/api/courses/${id}`),
    getCategories: () => api.get("/api/courses/categories"),
    search: (query) =>
      api.get(`/courses/search?q=${encodeURIComponent(query)}`),
    getByCategory: (categoryId) => api.get(`/courses/categories/${categoryId}`),
  },

  // payment routes
  payments: {
    createOrder: (data) => api.post("/api/payments/create-order", data),
    verifyPayment: (paymentData) =>
      api.post("/api/payments/verify", paymentData),
    checkPurchase: (courseId) =>
      api.get(`/api/payments/check-purchase/${courseId}`),
    getPurchaseHistory: () => api.get("/api/payments/history"),
  },

  coupons: {
    verify: (data) => api.post("/api/coupons/verify", data),
  },
  // content methods
  content: {
    getSettings: () => api.get("/api/content/settings"),
    getFAQs: (category = null) => {
      const params = category ? `?category=${category}` : "";
      return api.get(`/api/content/faqs${params}`);
    },
    getContactInfo: () => api.get("/api/content/contact"),
    getLegalPage: (type) => api.get(`/api/content/legal/${type}`),
    getAllLegalPages: () => api.get("/api/content/legal"),
  },

  // Test methods
  tests: {
    startTest: (courseId, difficulty) =>
      api.get(`/api/tests/start/${courseId}/${difficulty}`),

    checkAnswer: (courseId, questionId, answer, showAnswer = false) =>
      api.post(`/api/tests/check-answer`, {
        courseId,
        questionId,
        answer,
        showAnswer,
      }),

    submitAnswer: (testId, questionId, answer) =>
      api.post(`/api/tests/${testId}/answer`, { questionId, answer }),

    submitTest: (data) => api.post(`/api/tests/submit`, data),

    getResult: (testId) => api.get(`/api/tests/result/${testId}`),

    getHistory: () => api.get(`/api/tests/history`),

    getStats: () => api.get(`/api/tests/performance`),

    getLeaderboard: (courseId, difficulty = null) => {
      const params = difficulty ? `?difficulty=${difficulty}` : "";
      return api.get(`/api/tests/leaderboard/${courseId}${params}`);
    },
    abandonTest: (data) => api.post(`/api/tests/abandon`, data),
    getLeaderboardInfo: () => api.get(`/api/tests/leaderboard/info`),
  },
};

// Helper functions for common operations
export const handleApiError = (error, defaultMessage = "An error occurred") => {
  console.error("API Error:", error);

  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.message) {
    return error.message;
  }

  return defaultMessage;
};

export const isNetworkError = (error) => {
  return !error.response && error.code === "NETWORK_ERROR";
};

export const getErrorMessage = (error) => {
  if (error.response?.data?.errors) {
    return error.response.data.errors.map((err) => err.message).join(", ");
  }
  return (
    error.response?.data?.message ||
    error.message ||
    "An unexpected error occurred"
  );
};

export default api;
