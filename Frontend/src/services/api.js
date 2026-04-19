import axios from "axios";
import toast from "react-hot-toast";
import crypto from "crypto-js";
import { requestSigner } from "../utils/requestSigning.js";
// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:7000",
  timeout: 60000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * SHA-256 Challenge Solver (Browser-compatible)
 */
const solveChallenge = async (seed, difficulty) => {
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

    if (nonce % 1000 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    if (nonce > 1000000) {
      throw new Error("Challenge solving timeout");
    }
  }
};

const logApiError = (error, context) => {
  if (import.meta.env.VITE_VITE_ENV !== "development") return;

  console.group(`[API_ERROR] ${context}`);
  console.error("Full error object:", error);

  if (error.response) {
    console.error("Response details:", {
      status: error.response.status,
      statusText: error.response.statusText,
      data: error.response.data,
      headers: error.response.headers,
    });
  } else if (error.request) {
    console.error("Request details:", {
      method: error.config?.method?.toUpperCase(),
      url: error.config?.url,
      headers: error.config?.headers,
      hasRequest: !!error.request,
      requestReadyState: error.request?.readyState,
    });
  } else {
    console.error("Error message:", error.message);
  }

  console.groupEnd();
};

/**
 * Request interceptor
 * - Adds request signatures to authenticated endpoints
 * - Skips signature for public endpoints
 * - Loads signing secret from localStorage if available
 */
api.interceptors.request.use(
  async (config) => {
    const publicEndpoints = [
      "/api/auth/register",
      "/api/auth/initiate-login",
      "/api/auth/verify-login-otp",
      "/api/auth/login",
      "/api/auth/resend-otp",
      "/api/auth/verify-otp",
      "/api/auth/forgot-password",
      "/api/auth/verify-forgot-password-otp",
      "/api/auth/reset-password",
      "/api/security/signing-secret",
      "/api/auth/refresh-token",
    ];

    const isPublicEndpoint = publicEndpoints.some((endpoint) =>
      config.url?.includes(endpoint),
    );

    // Public GET endpoints (no auth required)
    const publicGetEndpoints = [
      "/api/content/settings",
      "/api/content/contact",
      "/api/content/legal",
      "/api/content/faqs",
      "/api/courses/categories",
      "/api/courses",
    ];

    const isPublicGet =
      config.method === "get" &&
      publicGetEndpoints.some((endpoint) => config.url?.startsWith(endpoint)) &&
      !config.url?.includes("/admin");

    if (isPublicEndpoint || isPublicGet) {
      return config;
    }

    if (!requestSigner.isSecretValid()) {
      requestSigner.loadSigningSecret();
    }

    const isAuthenticated = !!localStorage.getItem("user");

    if (isAuthenticated && requestSigner.isSecretValid()) {
      config = requestSigner.signRequest(config);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Helper function to add signature to request
function addSignatureToRequest(config, secret) {
  const timestamp = Date.now().toString();
  const nonce = crypto.lib.WordArray.random(16).toString();

  const method = config.method.toUpperCase();
  const path =
    new URL(config.url, config.baseURL || window.location.origin).pathname +
    (new URL(config.url, config.baseURL || window.location.origin).search ||
      "");
  const body = config.data ? JSON.stringify(config.data) : "";

  const payload = `${timestamp}:${nonce}:${method}:${path}:${body}`;

  const signature = crypto.HmacSHA256(payload, secret).toString();

  config.headers["x-request-signature"] = signature;
  config.headers["x-request-timestamp"] = timestamp;
  config.headers["x-request-nonce"] = nonce;

  if (import.meta.env.VITE_ENV === "development") {
    console.log("[API_REQUEST] Request signed:", {
      method,
      path,
      signature: signature.substring(0, 16) + "...",
    });
  }

  return config;
}

// CRITICAL: Signature error handler - Must be AFTER auth refresh interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle signature-related errors
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
      // Prevent infinite retry loops
      if (originalRequest._signatureRetry) {
        // console.error("[SIGNATURE] Retry failed - clearing auth");
        requestSigner.clearSigningSecret();

        // If signature keeps failing, might be auth issue
        if (error.response.status === 401 || error.response.status === 403) {
          localStorage.removeItem("user");
          window.location.href = "/login";
        }

        return Promise.reject(error);
      }

      try {
        if (import.meta.env.VITE_ENV === "development") {
          console.log(
            `[SIGNATURE] Handling ${error.response.data.code}, fetching new secret...`,
          );
        }

        // Mark this request as a retry
        originalRequest._signatureRetry = true;

        // Clear old secret
        requestSigner.clearSigningSecret();

        // CRITICAL FIX: Use base axios instance to avoid interceptor recursion
        // Create a new axios instance specifically for fetching signing secret
        const baseURL = import.meta.env.VITE_API_URL || "http://localhost:7000";
        const secretResponse = await axios
          .create({
            baseURL,
            withCredentials: true,
            timeout: 10000,
          })
          .get("/api/security/signing-secret");

        if (!secretResponse.data.success) {
          throw new Error("Failed to get signing secret");
        }

        const newSecret = secretResponse.data.data.signingSecret;
        const expiresIn = secretResponse.data.data.expiresIn;

        // Store new secret
        requestSigner.setSigningSecret(newSecret, expiresIn);

        if (import.meta.env.VITE_ENV === "development") {
          console.log("[SIGNATURE] Secret refreshed successfully");
        }

        // CRITICAL: Remove the retry flag before re-signing
        delete originalRequest._signatureRetry;

        // Re-sign the original request with new secret
        const signedRequest = requestSigner.signRequest(originalRequest);

        if (import.meta.env.VITE_ENV === "development") {
          console.log("[SIGNATURE] Retrying original request");
        }

        // Retry the original request
        return api(signedRequest);
      } catch (signatureError) {
        // console.error("[SIGNATURE] Refresh failed:", signatureError);
        requestSigner.clearSigningSecret();

        // If we can't get signing secret, auth is likely broken
        if (signatureError.response?.status === 401) {
          localStorage.removeItem("user");
          window.location.href = "/login";
        }

        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

// Response Interceptor - Handle Auth & Errors
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
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    logApiError(error, originalRequest?.url || "Unknown URL");

    // Handle network errors
    if (!error.response) {
      const detailedMessage =
        import.meta.env.VITE_ENV === "development"
          ? `Network error on ${originalRequest?.method?.toUpperCase()} ${
              originalRequest?.url
            }. ` +
            `Check if backend is running on ${
              import.meta.env.VITE_API_URL || "http://localhost:7000"
            }`
          : "Network error. Please check your connection.";

      console.error("[API] Network error details:", {
        url: originalRequest?.url,
        method: originalRequest?.method,
        baseURL: import.meta.env.VITE_API_URL,
        message: error.message,
      });

      return Promise.reject({
        message: detailedMessage,
        isNetworkError: true,
        originalError: error,
        debug: {
          url: originalRequest?.url,
          method: originalRequest?.method,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const { status, data } = error.response;

    if (import.meta.env.VITE_ENV === "development") {
      console.warn(`[API] ${status} Error:`, {
        url: originalRequest?.url,
        method: originalRequest?.method,
        status,
        message: data?.message,
      });
    }
    if (status === 401) {
      // ENHANCED: Check for specific error codes
      const errorCode = data?.code;

      // If CSRF token error, try to refresh CSRF token first
      if (errorCode && errorCode.includes("CSRF")) {
        console.log(
          "[API] CSRF error detected, token will be refreshed automatically",
        );
        // The interceptor at the top will handle fetching new CSRF token
        return Promise.reject(error);
      }

      if (
        originalRequest._retry ||
        originalRequest.url?.includes("/refresh-token") ||
        data?.message === "Refresh token not found" ||
        data?.message === "Session expired"
      ) {
        localStorage.removeItem("user");
        isRefreshing = false;
        processQueue(error, null);

        if (
          !window.location.pathname.includes("/login") &&
          !window.location.pathname.includes("/register")
        ) {
          console.log("[API] Redirecting to login due to auth failure");
          window.location.href = "/login";
        }

        return Promise.reject({
          message: "Session expired. Please login again.",
          isAuthError: true,
        });
      }

      originalRequest._retry = true;

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
  },
);

// API methods
export const apiMethods = {
  get: (url, config = {}) => api.get(url, config),
  post: (url, data = {}, config = {}) => api.post(url, data, config),
  put: (url, data = {}, config = {}) => api.put(url, data, config),
  patch: (url, data = {}, config = {}) => api.patch(url, data, config),
  delete: (url, config = {}) => api.delete(url, config),

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
    getSigningSecret: () => api.get("/api/security/signing-secret"),
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

  courses: {
    getAll: (params = {}) => {
      const safeParams = { ...params };
      delete safeParams.isActive;
      return api.get("/api/courses", { params: safeParams });
    },
    getById: (id) => api.get(`/api/courses/${id}`),
    getCategories: () => api.get("/api/courses/categories"),
    search: (query) =>
      api.get(`/courses/search?q=${encodeURIComponent(query)}`),
    getByCategory: (categoryId) => api.get(`/courses/categories/${categoryId}`),
  },

  payments: {
    createOrder: (data) => api.post("/api/payments/create-order", data),
    verifyPayment: (paymentData) =>
      api.post("/api/payments/verify", paymentData),
    checkPurchase: (courseId) =>
      api.get(`/api/payments/check-purchase/${courseId}`),
    getPurchaseHistory: () => api.get("/api/payments/history"),
    // khalti (nepal)
    khaltiInitiate: (data) => api.post("/api/payments/khalti/initiate", data),
    khaltiVerify: (data) => api.post("/api/payments/khalti/verify", data),
  },
  teacher: {
    getWaitlistCount: () => api.get("/api/teachers/waitlist-count"),
    apply: (data) => api.post("/api/teachers/apply", data),
    getPublicProfile: (username) => api.get(`/api/teachers/public/${username}`),
    sendOtp: (data) => api.post("/api/teachers/otp/send", data),
    verifyOtp: (data) => api.post("/api/teachers/otp/verify", data),
    signup: (data) => api.post("/api/teachers/signup", data),
    login: (data) => api.post("/api/teachers/login", data),
    logout: () => api.post("/api/teachers/logout"),
    forgotPassword: (data) => api.post("/api/teachers/forgot-password", data),
    verifyForgotOtp: (data) =>
      api.post("/api/teachers/forgot-password/verify-otp", data),
    resetPassword: (data) =>
      api.post("/api/teachers/forgot-password/reset", data),
    getProfile: () => api.get("/api/teachers/me"),
    getAnalytics: () => api.get("/api/teachers/me/analytics"),
    updateProfile: (data) => api.put("/api/teachers/me/profile", data),
    updatePayment: (data) => api.put("/api/teachers/me/payment-details", data),
    uploadDocuments: (formData) =>
      api.post("/api/teachers/me/documents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
  },

  coupons: {
    verify: (data) => api.post("/api/coupons/verify", data),
  },

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
    generatePDFToken: (testId) =>
      api.get(`/api/tests/generate-pdf-token/${testId}`),

    downloadPDF: (testId, token) =>
      api.get(`/api/tests/download-pdf/${testId}?token=${token}`, {
        responseType: "blob",
      }),
  },
};

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
