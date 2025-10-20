import React, { createContext, useContext, useState, useEffect } from "react";
import { apiMethods } from "../services/api";
import toast from "react-hot-toast";

const ContentContext = createContext();

export const useContent = () => {
  const context = useContext(ContentContext);
  if (!context) {
    throw new Error("useContent must be used within ContentProvider");
  }
  return context;
};

export const ContentProvider = ({ children }) => {
  const [contentSettings, setContentSettings] = useState(null);
  const [faqs, setFaqs] = useState([]);
  const [contactInfo, setContactInfo] = useState(null);
  const [legalPages, setLegalPages] = useState({});
  const [loading, setLoading] = useState(false);

  // Fetch Content Settings
  const fetchContentSettings = async () => {
    try {
      const response = await apiMethods.get("/api/content/settings");
      if (response.data.success) {
        setContentSettings(response.data.data.settings);
        return response.data.data.settings;
      }
    } catch (error) {
      console.error("Error fetching content settings:", error);
      return null;
    }
  };

  // Fetch FAQs
  const fetchFAQs = async (category = null) => {
    try {
      const params = category ? `?category=${category}` : "";
      const response = await apiMethods.get(`/api/content/faqs${params}`);
      if (response.data.success) {
        setFaqs(response.data.data.faqs);
        return response.data.data.faqs;
      }
    } catch (error) {
      console.error("Error fetching FAQs:", error);
      return [];
    }
  };

  // Fetch Contact Info
  const fetchContactInfo = async () => {
    try {
      const response = await apiMethods.get("/api/content/contact");
      if (response.data.success) {
        setContactInfo(response.data.data.contactInfo);
        return response.data.data.contactInfo;
      }
    } catch (error) {
      console.error("Error fetching contact info:", error);
      return null;
    }
  };

  // Fetch Legal Page
  const fetchLegalPage = async (type) => {
    try {
      const response = await apiMethods.get(`/api/content/legal/${type}`);
      if (response.data.success) {
        setLegalPages((prev) => ({
          ...prev,
          [type]: response.data.data.page,
        }));
        return response.data.data.page;
      }
    } catch (error) {
      console.error(`Error fetching ${type} page:`, error);
      return null;
    }
  };

  // Fetch all legal pages
  const fetchAllLegalPages = async () => {
    try {
      const response = await apiMethods.get("/api/content/legal");
      if (response.data.success) {
        const pages = response.data.data.pages.reduce((acc, page) => {
          acc[page.type] = page;
          return acc;
        }, {});
        setLegalPages(pages);
        return pages;
      }
    } catch (error) {
      console.error("Error fetching legal pages:", error);
      return {};
    }
  };

  // Initialize - fetch content on mount
  useEffect(() => {
    fetchContentSettings();
    fetchContactInfo();
    fetchAllLegalPages();
  }, []);

  // NEW: Listen for updates from admin panel
  useEffect(() => {
    const handleSettingsUpdate = () => {
      fetchContentSettings();
    };

    const handleContactUpdate = () => {
      fetchContactInfo();
    };

    window.addEventListener("contentSettingsUpdated", handleSettingsUpdate);
    window.addEventListener("contactInfoUpdated", handleContactUpdate);

    return () => {
      window.removeEventListener(
        "contentSettingsUpdated",
        handleSettingsUpdate
      );
      window.removeEventListener("contactInfoUpdated", handleContactUpdate);
    };
  }, []);

  const value = {
    contentSettings,
    faqs,
    contactInfo,
    legalPages,
    loading,
    fetchContentSettings,
    fetchFAQs,
    fetchContactInfo,
    fetchLegalPage,
    fetchAllLegalPages,
  };

  return (
    <ContentContext.Provider value={value}>{children}</ContentContext.Provider>
  );
};
