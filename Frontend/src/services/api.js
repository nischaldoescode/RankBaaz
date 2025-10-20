import axios from "axios";
import toast from "react-hot-toast";

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  timeout: 30000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

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
      toast.error("Network error. Please check your connection.");
      return Promise.reject(error);
    }

    const { status, data } = error.response;

    // Handle authentication errors
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh using the cookie
        await api.post("/api/auth/refresh-token");
        // If successful, the new cookie is set automatically
        // Retry the original request with the new cookie
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear localStorage and redirect
        localStorage.removeItem("user");
        window.location.href = "/login";
        toast.error("Session expired. Please login again.");
        return Promise.reject(refreshError);
      }
    }
    // Handle other HTTP errors - Log them but don't show toast
    // Let individual components handle their own error messages
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
  courses: {
    getAll: (params = {}) => api.get("/api/courses", { params }),
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
