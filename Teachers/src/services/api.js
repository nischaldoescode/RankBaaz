import axios from "axios";
import { teacherRequestSigner } from "../utils/requestSigning.js";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:7000/api";

const api = axios.create({
  baseURL: BASE,
  withCredentials: true,
});

// these routes don't require HMAC signing — teacher has no secret yet
const UNSIGNED_ROUTES = [
  "/teachers/login",
  "/teachers/logout",
  "/teachers/signup",
  "/teachers/otp/send",
  "/teachers/otp/verify",
  "/teachers/verify-invite",
  "/teachers/check-email",
  "/teachers/forgot-password",
  "/teachers/forgot-password/verify-otp",
  "/teachers/forgot-password/reset",
  "/teachers/apply",
  "/teachers/application/status",
];

api.interceptors.request.use((config) => {
  const writeMethod = ["post", "put", "patch", "delete"].includes(
    config.method?.toLowerCase(),
  );

  if (!writeMethod) return config;

  const url = config.url || "";
  const isUnsigned = UNSIGNED_ROUTES.some((p) => url.includes(p));

  if (isUnsigned) {
    // no signing headers for public auth routes
    return config;
  }

  // only sign if we actually have a secret
  if (!teacherRequestSigner.hasSecret()) {
    return config;
  }

  const { signature, timestamp, nonce } = teacherRequestSigner.sign(
    config.data ? JSON.stringify(config.data) : "",
  );
  config.headers["x-signature"] = signature;
  config.headers["x-timestamp"] = timestamp;
  config.headers["x-nonce"] = nonce;

  return config;
});

// list of endpoints that are allowed to return 401 without triggering session expiry
const AUTH_PASSTHROUGH_URLS = [
  "/teachers/login",
  "/teachers/me", // fails on signup page — expected
  "/teachers/otp/send",
  "/teachers/otp/verify",
  "/teachers/signup",
  "/teachers/verify-invite",
  "/teachers/check-email",
  "/teachers/forgot-password",
  "/teachers/forgot-password/verify-otp",
  "/teachers/forgot-password/reset",
];

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const url = err.config?.url || "";
    const isPassthrough = AUTH_PASSTHROUGH_URLS.some((p) => url.includes(p));

    if (
      err.response?.status === 403 &&
      err.response?.data?.code === "ACCESS_BLOCKED" &&
      !url.includes("/teachers/me/documents")
    ) {
      window.dispatchEvent(
        new CustomEvent("teacher-access-blocked", {
          detail: err.response.data,
        }),
      );

      if (!err.config?._accessReloaded) {
        err.config._accessReloaded = true;
        setTimeout(() => window.location.reload(), 250);
      }
    }

    // only attempt token refresh for authenticated routes
    if (
      err.response?.status === 401 &&
      err.response?.data?.code === "INVALID_SIGNATURE" &&
      !err.config._retried &&
      !isPassthrough
    ) {
      err.config._retried = true;
      try {
        const refreshRes = await axios.post(
          `${BASE}/auth/signing-secret`,
          {},
          { withCredentials: true },
        );
        if (refreshRes.data.success) {
          teacherRequestSigner.setSigningSecret(
            refreshRes.data.data.signingSecret,
            refreshRes.data.data.expiresIn,
          );
          return api(err.config);
        }
      } catch {}
    }

    return Promise.reject(err);
  },
);

export const teacherApi = {
  auth: {
    login: (data) => api.post("/teachers/login", data),
    logout: () => api.post("/teachers/logout"),
    signup: (data) => api.post("/teachers/signup", data),
    verifyInvite: (token) => api.get(`/teachers/verify-invite?token=${token}`),
    sendOtp: (data) => api.post("/teachers/otp/send", data),
    verifyOtp: (data) => api.post("/teachers/otp/verify", data),
    forgotPassword: (data) => api.post("/teachers/forgot-password", data),
    verifyForgotOtp: (data) =>
      api.post("/teachers/forgot-password/verify-otp", data),
    resetPassword: (data) => api.post("/teachers/forgot-password/reset", data),
    checkEmailExists: (email) => api.post("/teachers/check-email", { email }),
  },
  profile: {
    get: () => api.get("/teachers/me"),
    getAnalytics: () => api.get("/teachers/me/analytics"),
    update: (data) => api.put("/teachers/me/profile", data),
    updatePayment: (data) => api.put("/teachers/me/payment-details", data),
    uploadDocuments: (formData) =>
      api.post("/teachers/me/documents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
  },
  courses: {
    updateQuestion: (courseId, questionId, data) =>
      api.put(`/teachers/me/courses/${courseId}/questions/${questionId}`, data),
    deleteQuestion: (courseId, questionId) =>
      api.delete(`/teachers/me/courses/${courseId}/questions/${questionId}`),
    updateCourse: (courseId, data) =>
      api.put(`/teachers/me/courses/${courseId}`, data),

    getAll: () => api.get("/teachers/me/courses/all"),
    create: (formData) =>
      api.post("/teachers/me/courses", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    updateCourse: (courseId, data) =>
      api.put(`/teachers/me/courses/${courseId}`, data),
    getQuestions: (courseId) =>
      api.get(`/teachers/me/courses/${courseId}/questions`),
    addQuestion: (courseId, data) =>
      api.post(`/teachers/me/courses/${courseId}/questions`, data),
  },
  coupons: {
    create: (data) => api.post("/coupons/teacher", data),
    getByCourse: (courseId) => api.get(`/coupons/teacher/course/${courseId}`),
    delete: (couponId) => api.delete(`/coupons/teacher/${couponId}`),
    toggleStatus: (couponId, isActive) =>
      api.patch(`/coupons/teacher/${couponId}/status`, { isActive }),
  },
};
