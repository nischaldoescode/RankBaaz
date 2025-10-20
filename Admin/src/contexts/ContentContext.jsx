import React, { createContext, useContext, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

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

  // Create axios instance with credentials
  const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
    withCredentials: true,
  });

  // Fetch Content Settings
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

  // Update Content Settings
  const updateContentSettings = async (data) => {
    try {
      setLoading(true);
      const formData = new FormData();

      Object.keys(data).forEach((key) => {
        if (key === "logo" || key === "favicon") {
          if (data[key] instanceof File) {
            formData.append(key, data[key]);
          }
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

  // Fetch FAQs
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

  // ADD THIS ENTIRE FUNCTION before the value object
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
  // Create FAQ
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

  // Update FAQ
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

  // Delete FAQ
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

  // AFTER deleteFAQ function, ADD:
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
        error.response?.data?.message || "Failed to update FAQ order"
      );
      return { success: false };
    } finally {
      setLoading(false);
    }
  };
  // Fetch Contact Info
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

  // Update Contact Info
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
        error.response?.data?.message || "Failed to update contact info"
      );
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // Fetch Legal Pages
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

  // ADDED: New function for bulk updating section order
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
        error.response?.data?.message || "Failed to update section order"
      );
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const updateLegalPage = async (type, data) => {
    try {
      setLoading(true);

      // ADDED: Validate type
      if (!["privacy", "terms"].includes(type)) {
        toast.error("Invalid legal page type");
        return { success: false };
      }

      // REMOVED: version from data
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
        error.response?.data?.message || "Failed to update legal page"
      );
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  // Get legal template hints
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

  // Fetch preview data
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
        // Ensure sections array exists
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
