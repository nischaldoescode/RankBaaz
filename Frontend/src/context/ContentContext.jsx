/**
 * provides public content context state, api access, loading flags, and shared actions to child views
 *
 * @file frontend/src/context/contentcontext.jsx
 * @module frontend/src/context/contentcontext
 * @exports provider and hooks used by child components
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import { apiMethods } from "../services/api";
import { cachedAPICall } from "../utils/cacheManager";
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
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // fetch content settings
  const fetchContentSettings = async (forceRefresh = false) => {
    try {
      const data = await cachedAPICall(
        "/api/content/settings",
        { schemaVersion: 2 },
        async () => {
          const response = await apiMethods.get("/api/content/settings");
          if (response.data.success) {
            return response.data.data.settings;
          }
          throw new Error("Invalid response");
        },
        { forceRefresh, maxAge: 5 * 60 * 1000 }
      );

      setContentSettings(data);

      // preload logo image if it exists
      if (data?.logo?.url) {
        // dynamic import to avoid circular dependency
        import("../utils/cacheManager").then(({ cacheManager }) => {
          cacheManager.cacheImage(data.logo.url).catch((err) => {
            console.error("[Content] Failed to preload logo:", err);
          });
        });
      }

      return data;
    } catch (error) {
      console.error("Error fetching content settings:", error);
      return null;
    }
  };

  // fetch faqs
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

  // fetch contact info
  const fetchContactInfo = async (forceRefresh = false) => {
    try {
      const data = await cachedAPICall(
        "/api/content/contact",
        {},
        async () => {
          const response = await apiMethods.get("/api/content/contact");
          if (response.data.success) {
            return response.data.data.contactInfo;
          }
          throw new Error("Invalid response");
        },
        { forceRefresh }
      );

      setContactInfo(data);
      return data;
    } catch (error) {
      console.error("Error fetching contact info:", error);
      return null;
    }
  };

  // fetch legal page
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

  // fetch all legal pages
  const fetchAllLegalPages = async (forceRefresh = false) => {
    try {
      const data = await cachedAPICall(
        "/api/content/legal",
        {},
        async () => {
          const response = await apiMethods.get("/api/content/legal");
          if (response.data.success) {
            return response.data.data.pages.reduce((acc, page) => {
              acc[page.type] = page;
              return acc;
            }, {});
          }
          throw new Error("Invalid response");
        },
        { forceRefresh }
      );

      setLegalPages(data);
      return data;
    } catch (error) {
      console.error("Error fetching legal pages:", error);
      return {};
    }
  };

  // initialize - fetch content on mount
  useEffect(() => {
    const initializeContent = async () => {
      setLoading(true);
      await Promise.all([
        fetchContentSettings(),
        fetchContactInfo(),
        fetchAllLegalPages(),
      ]);
      setLoading(false);
      setIsInitialLoad(false);
    };

    initializeContent();
  }, []);

  // listen for updates from admin panel
  useEffect(() => {
    const handleSettingsUpdate = () => {
      fetchContentSettings(true);
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
