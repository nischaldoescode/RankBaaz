/**
 * wraps teacher api access, signed requests, retries, and response handling
 *
 * @file teachers/src/services/api.js
 * @module teachers/src/services/api
 * @exports api helpers used by client views
 */

import axios from "axios";
import { teacherRequestSigner } from "../utils/requestSigning.js";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:7000/api";

const api = axios.create({
  baseURL: BASE,
  withCredentials: true,
});

const refreshTeacherSigningSecret = async () => {
  const res = await axios.get(`${BASE}/security/signing-secret`, {
    withCredentials: true,
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
    params: { _ts: Date.now(), surface: "teacher" },
  });

  if (res.data?.success && res.data?.data?.signingSecret) {
    teacherRequestSigner.setSigningSecret(
      res.data.data.signingSecret,
      res.data.data.expiresIn,
    );
    return true;
  }

  return false;
};

// public teacher routes do not have a signing secret yet
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

api.interceptors.request.use(async (config) => {
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

  if (!teacherRequestSigner.isSecretValid()) {
    teacherRequestSigner.loadSigningSecret();
  }

  if (!teacherRequestSigner.isSecretValid()) {
    await refreshTeacherSigningSecret().catch(() => false);
  }

  return teacherRequestSigner.isSecretValid()
    ? teacherRequestSigner.signRequest(config)
    : config;
});

// list of endpoints that are allowed to return 401 without triggering session expiry
const AUTH_PASSTHROUGH_URLS = [
  "/teachers/login",
  "/teachers/me", // expected on signup before a session exists
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
    const isPassthrough = AUTH_PASSTHROUGH_URLS.some(
      (p) => url === p || url.startsWith(`${p}?`),
    );

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

    const signatureCodes = [
      "SIGNATURE_INVALID",
      "SIGNATURE_EXPIRED",
      "SIGNATURE_MISSING",
      "INVALID_SIGNATURE",
    ];

    if (
      [401, 403].includes(err.response?.status) &&
      signatureCodes.includes(err.response?.data?.code) &&
      !err.config._retried &&
      !isPassthrough
    ) {
      err.config._retried = true;
      try {
        const refreshed = await refreshTeacherSigningSecret();
        if (refreshed) {
          return api(err.config);
        }
      } catch {}
    }

    return Promise.reject(err);
  },
);

export const teacherApi = {
  content: {
    settings: () => api.get("/content/settings"),
  },
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
    update: (data, config = {}) => api.put("/teachers/me/profile", data, config),
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
