/**
 * keeps the content context context focused and readable.
 */
import React, { createContext, useContext, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { adminRequestSigner } from "../utils/adminRequestSigner.js";

const ContentContext = createContext();

export const useContent = () => {
  const context = useContext(ContentContext);
  if (!context) {
    throw new Error("useContent must be used within ContentProvider");
  }
  return context;
};

export const ContentProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [contentSettings, setContentSettings] = useState(null);
  const [faqs, setFaqs] = useState([]);
  const [contactInfo, setContactInfo] = useState(null);
  const [legalPages, setLegalPages] = useState({});

  // create axios instance with credentials and signing
  const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:7000/api",
    withCredentials: true,
  });

  // request interceptor to sign requests
  api.interceptors.request.use(
    (config) => {
      if (config._skipInterceptor) {
        return config;
      }

      // load secret if not in memory
      if (!adminRequestSigner.isSecretValid()) {
        adminRequestSigner.loadSigningSecret();
      }

      // we will only need to sign requests if the admin is authenticated
      const isAuthenticated = !!localStorage.getItem("currentUser");

      if (isAuthenticated && adminRequestSigner.isSecretValid()) {
        config = adminRequestSigner.signRequest(config);
      }

      return config;
    },
    (error) => {
      return Promise.reject(error);
    },
  );

  // this entire response interceptor
  /**
   * response interceptor - handle signature errors
   * same as authcontext but for contentcontext axios instance
   */
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // signature error codes from backend
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
        // prevent infinite retry loop
        if (originalRequest._signatureRetry) {
          console.error(
            "Signature retry failed - clearing auth",
          );
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

          // fetch secret
          const apiBase = (
            import.meta.env.VITE_API_URL || "http://localhost:7000/api"
          ).replace(/\/$/, "");
          const secretResponse = await axios.get(
            `${apiBase}/security/signing-secret`,
            {
              withCredentials: true,
              params: { _ts: Date.now() },
              _skipInterceptor: true,
            },
          );

          if (!secretResponse.data.success) {
            throw new Error("Failed to get signing secret");
          }

          const { signingSecret, expiresIn } = secretResponse.data.data;
          adminRequestSigner.setSigningSecret(signingSecret, expiresIn);

          console.log(
            "Signing secret refreshed successfully",
          );

          // keep _signatureretry on the retried request so a permanent
          // mismatch fails once instead of starting a refresh loop.
          const signedRequest = adminRequestSigner.signRequest(originalRequest);
          return api(signedRequest);
        } catch (signatureError) {
          console.error(
            "Signature refresh failed:",
            signatureError,
          );
          adminRequestSigner.clearSigningSecret();

          if (signatureError.response?.status === 401) {
            localStorage.removeItem("currentUser");
            window.location.href = "/login";
          }

          return Promise.reject(error);
        }
      }

      // handle 401 errors
      if (error.response?.status === 401) {
        if (!originalRequest._retry) {
          originalRequest._retry = true;

          if (
            !window.location.pathname.includes("/login") &&
            localStorage.getItem("currentUser")
          ) {
            const userData = JSON.parse(localStorage.getItem("currentUser"));
            if (userData.role === "admin") {
              localStorage.removeItem("currentUser");
              adminRequestSigner.clearSigningSecret();

              // settimeout(() => {
              //   window.location.href = "/login";
              // }, 100);
            }
          }
        }
      }

      return Promise.reject(error);
    },
  );

  // fetch content settings
  const fetchContentSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get("/content/settings");
      if (response.data.success) {
        setContentSettings(response.data.data.settings);
        return { success: true, data: response.data.data.settings };
      }
    } catch (error) {
      console.error("Error fetching content settings:", error);
      toast.error("Failed to fetch content settings");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // update content settings
  const updateContentSettings = async (data) => {
    try {
      setLoading(true);
      const formData = new FormData();
      Object.keys(data).forEach((key) => {
        if (key === "logo" || key === "favicon") {
          // only append actual files.
          if (data[key] instanceof File) {
            formData.append(key, data[key]);
          }
          // do not send logo object as json; backend manages it via req.files
        } else if (typeof data[key] === "object" && data[key] !== null) {
          formData.append(key, JSON.stringify(data[key]));
        } else if (data[key] !== null && data[key] !== undefined) {
          formData.append(key, data[key]);
        }
      });

      const response = await api.put("/content/settings", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.data.success) {
        setContentSettings(response.data.data.settings);
        toast.success("Content settings updated successfully!");
        return { success: true };
      }
    } catch (error) {
      console.error("Error updating content settings:", error);
      toast.error(error.response?.data?.message || "Failed to update settings");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // fetch faqs
  const fetchFAQs = async (filters = {}) => {
    try {
      setLoading(true);
      const params = new URLSearchParams(filters).toString();
      const response = await api.get(`/content/faqs?${params}`);

      if (response.data.success) {
        setFaqs(response.data.data.faqs);
        return { success: true, data: response.data.data.faqs };
      }
    } catch (error) {
      console.error("Error fetching FAQs:", error);
      toast.error("Failed to fetch FAQs");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // this entire function the value object
  const deleteLogo = async () => {
    try {
      setLoading(true);
      const response = await api.delete("/content/settings/logo");

      if (response.data.success) {
        setContentSettings(response.data.data.settings);
        toast.success("Logo deleted successfully!");
        return { success: true };
      }
    } catch (error) {
      console.error("Error deleting logo:", error);
      toast.error(error.response?.data?.message || "Failed to delete logo");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };
  // create faq
  const createFAQ = async (faqData) => {
    try {
      setLoading(true);
      const response = await api.post("/content/faqs", faqData);

      if (response.data.success) {
        await fetchFAQs();
        toast.success("FAQ created successfully!");
        return { success: true };
      }
    } catch (error) {
      console.error("Error creating FAQ:", error);
      toast.error(error.response?.data?.message || "Failed to create FAQ");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // update faq
  const updateFAQ = async (id, faqData) => {
    try {
      setLoading(true);
      const response = await api.put(`/content/faqs/${id}`, faqData);

      if (response.data.success) {
        await fetchFAQs();
        toast.success("FAQ updated successfully!");
        return { success: true };
      }
    } catch (error) {
      console.error("Error updating FAQ:", error);
      toast.error(error.response?.data?.message || "Failed to update FAQ");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // delete faq
  const deleteFAQ = async (id) => {
    try {
      setLoading(true);
      const response = await api.delete(`/content/faqs/${id}`);

      if (response.data.success) {
        await fetchFAQs();
        toast.success("FAQ deleted successfully!");
        return { success: true };
      }
    } catch (error) {
      console.error("Error deleting FAQ:", error);
      toast.error(error.response?.data?.message || "Failed to delete FAQ");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // deletefaq function,
  const bulkUpdateFAQOrder = async (faqs) => {
    try {
      setLoading(true);
      const response = await api.post("/content/faqs/bulk-order", { faqs });

      if (response.data.success) {
        await fetchFAQs();
        toast.success("FAQ order updated successfully!");
        return { success: true };
      }
    } catch (error) {
      console.error("Error updating FAQ order:", error);
      toast.error(
        error.response?.data?.message || "Failed to update FAQ order",
      );
      return { success: false };
    } finally {
      setLoading(false);
    }
  };
  // fetch contact info
  const fetchContactInfo = async () => {
    try {
      setLoading(true);
      const response = await api.get("/content/contact");

      if (response.data.success) {
        setContactInfo(response.data.data.contactInfo);
        return { success: true, data: response.data.data.contactInfo };
      }
    } catch (error) {
      console.error("Error fetching contact info:", error);
      toast.error("Failed to fetch contact info");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // update contact info
  const updateContactInfo = async (data) => {
    try {
      setLoading(true);
      const response = await api.put("/content/contact", data);

      if (response.data.success) {
        setContactInfo(response.data.data.contactInfo);
        toast.success("Contact info updated successfully!");
        return { success: true };
      }
    } catch (error) {
      console.error("Error updating contact info:", error);
      toast.error(
        error.response?.data?.message || "Failed to update contact info",
      );
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // fetch legal pages
  const fetchLegalPages = async () => {
    try {
      setLoading(true);
      const response = await api.get("/content/legal");

      if (response.data.success) {
        const pages = response.data.data.pages.reduce((acc, page) => {
          acc[page.type] = page;
          return acc;
        }, {});
        setLegalPages(pages);
        return { success: true, data: pages };
      }
    } catch (error) {
      console.error("Error fetching legal pages:", error);
      toast.error("Failed to fetch legal pages");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // ed: function for bulk updating section order
  const bulkUpdateSectionOrder = async (type, sections) => {
    try {
      setLoading(true);
      const response = await api.post(`/content/legal/${type}/bulk-order`, {
        sections,
      });

      if (response.data.success) {
        await fetchLegalPages();
        toast.success("Section order updated successfully!");
        return { success: true };
      }
    } catch (error) {
      console.error("Error updating section order:", error);
      toast.error(
        error.response?.data?.message || "Failed to update section order",
      );
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const updateLegalPage = async (type, data) => {
    try {
      setLoading(true);

      // ed: validate type
      if (!["privacy", "terms"].includes(type)) {
        toast.error("Invalid legal page type");
        return { success: false };
      }

      // version from data
      const { version, ...restData } = data;

      const response = await api.put(`/content/legal/${type}`, restData);

      if (response.data.success) {
        await fetchLegalPages();
        toast.success("Legal page updated successfully!");
        return { success: true };
      }
    } catch (error) {
      console.error("Error updating legal page:", error);
      toast.error(
        error.response?.data?.message || "Failed to update legal page",
      );
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // get legal template hints
  const getLegalTemplateHints = async (type) => {
    try {
      const response = await api.get(`/content/legal/${type}/hints`);
      if (response.data.success) {
        return { success: true, data: response.data.data.hints };
      }
    } catch (error) {
      console.error("Error fetching template hints:", error);
      return { success: false };
    }
  };

  // fetch preview data
  const fetchHomePreview = async () => {
    try {
      const response = await api.get("/content/preview/home");
      if (response.data.success) {
        return { success: true, data: response.data.data };
      }
    } catch (error) {
      console.error("Error fetching home preview:", error);
      return { success: false };
    }
  };

  const fetchAboutPreview = async () => {
    try {
      const response = await api.get("/content/preview/about");
      if (response.data.success) {
        return { success: true, data: response.data.data };
      }
    } catch (error) {
      console.error("Error fetching about preview:", error);
      return { success: false };
    }
  };

  const fetchFooterPreview = async () => {
    try {
      const response = await api.get("/content/preview/footer");
      if (response.data.success) {
        return { success: true, data: response.data.data };
      }
    } catch (error) {
      console.error("Error fetching footer preview:", error);
      return { success: false };
    }
  };

  const fetchLegalPage = async (type) => {
    try {
      const response = await api.get(`/content/legal/${type}`);
      if (response.data.success) {
        const page = response.data.data.page;
        // ensure sections array exists
        if (!page.sections) {
          page.sections = [];
        }
        return { success: true, data: page };
      }
    } catch (error) {
      console.error(`Error fetching ${type} legal page:`, error);
      toast.error(`Failed to load ${type} page`);
      return { success: false, error: error.response?.data?.message };
    }
  };

  const value = {
    loading,
    contentSettings,
    faqs,
    deleteLogo,
    contactInfo,
    legalPages,
    fetchContentSettings,
    updateContentSettings,
    fetchFAQs,
    createFAQ,
    updateFAQ,
    deleteFAQ,
    fetchContactInfo,
    updateContactInfo,
    fetchLegalPages,
    fetchLegalPage,
    updateLegalPage,
    bulkUpdateFAQOrder,
    getLegalTemplateHints,
    fetchHomePreview,
    fetchAboutPreview,
    fetchFooterPreview,
    bulkUpdateSectionOrder,
  };

  return (
    <ContentContext.Provider value={value}>{children}</ContentContext.Provider>
  );
};
