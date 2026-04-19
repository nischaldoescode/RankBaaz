import axios from "axios";
import { teacherRequestSigner } from "../utils/requestSigning.js";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:7000/api";

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

const publicEndpoints = [
  "/teachers/login",
  "/teachers/logout",
  "/teachers/signup",
  "/teachers/verify-invite",
  "/teachers/waitlist-count",
  "/teachers/apply",
];

api.interceptors.request.use(
  (config) => {
    const isPublic = publicEndpoints.some((ep) => config.url?.includes(ep));
    if (isPublic) return config;

    if (!teacherRequestSigner.isSecretValid()) {
      teacherRequestSigner.loadSigningSecret();
    }

    const isAuthenticated = !!localStorage.getItem("teacher");
    if (isAuthenticated && teacherRequestSigner.isSecretValid()) {
      config = teacherRequestSigner.signRequest(config);
    }

    return config;
  },
  (error) => Promise.reject(error),
);

const signatureErrorCodes = [
  "SIGNATURE_EXPIRED",
  "SIGNATURE_MISSING",
  "SIGNATURE_INVALID",
  "REPLAY_ATTACK",
];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (
      error.response?.data?.code &&
      signatureErrorCodes.includes(error.response.data.code)
    ) {
      if (original._signatureRetry) {
        teacherRequestSigner.clearSigningSecret();
        localStorage.removeItem("teacher");
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        original._signatureRetry = true;
        teacherRequestSigner.clearSigningSecret();

        const secretRes = await axios.get(
          `${BASE_URL}/security/signing-secret`,
          {
            withCredentials: true,
          },
        );

        if (secretRes.data.success) {
          const { signingSecret, expiresIn } = secretRes.data.data;
          teacherRequestSigner.setSigningSecret(signingSecret, expiresIn);
        }

        delete original._signatureRetry;
        const signed = teacherRequestSigner.signRequest(original);
        return api(signed);
      } catch {
        teacherRequestSigner.clearSigningSecret();
        localStorage.removeItem("teacher");
        window.location.href = "/login";
        return Promise.reject(error);
      }
    }

    if (error.response?.status === 401) {
      localStorage.removeItem("teacher");
      teacherRequestSigner.clearSigningSecret();
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export const teacherApi = {
  auth: {
    login: (data) => api.post("/teachers/login", data),
    checkEmailExists: (email) => api.post("/teachers/check-email", { email }),
    logout: () => api.post("/teachers/logout"),
    verifyInvite: (token) => api.get(`/teachers/verify-invite?token=${token}`),
    signup: (data) => api.post("/teachers/signup", data),
    getSigningSecret: () => api.get("/security/signing-secret"),
  },
  profile: {
    get: () => api.get("/teachers/me"),
    update: (data) => {
      const formData = new FormData();
      Object.entries(data).forEach(([k, v]) => {
        if (v !== undefined && v !== null) formData.append(k, v);
      });
      return api.put("/teachers/me/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    updatePayment: (data) => api.put("/teachers/me/payment-details", data),
  },
  courses: {
    create: (formData) =>
      api.post("/teachers/me/courses", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
  },
};

export default api;
