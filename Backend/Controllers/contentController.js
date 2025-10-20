import ContentSettings from "../Models/ContentSettings.js";
import FAQ from "../Models/FAQ.js";
import ContactInfo from "../Models/ContactInfo.js";
import LegalPage from "../Models/LegalPages.js";
import { v2 as cloudinary } from "cloudinary";

// ============ CONTENT SETTINGS ============

export const getContentSettings = async (req, res) => {
  try {
    const settings = await ContentSettings.getSettings();

    res.status(200).json({
      success: true,
      data: { settings },
    });
  } catch (error) {
    console.error("Get content settings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch content settings",
    });
  }
};

export const updateContentSettings = async (req, res) => {
  try {
    const settings = await ContentSettings.getSettings();
    const updateData = { ...req.body };

    // Parse JSON fields if they come as strings
    if (typeof updateData.stats === "string") {
      updateData.stats = JSON.parse(updateData.stats);
    }
    if (typeof updateData.features === "string") {
      updateData.features = JSON.parse(updateData.features);
    }
    if (typeof updateData.aboutValues === "string") {
      updateData.aboutValues = JSON.parse(updateData.aboutValues);
    }
    if (typeof updateData.aboutFeatures === "string") {
      updateData.aboutFeatures = JSON.parse(updateData.aboutFeatures);
    }
    if (typeof updateData.aboutStats === "string") {
      updateData.aboutStats = JSON.parse(updateData.aboutStats);
    }
    if (typeof updateData.chartConfig === "string") {
      updateData.chartConfig = JSON.parse(updateData.chartConfig);
    }
    if (typeof updateData.backgroundElements === "string") {
      updateData.backgroundElements = JSON.parse(updateData.backgroundElements);
    }

    // Handle logo upload (supports both express-fileupload and multer)
    if (req.files?.logo) {
      // Delete old logo if exists
      if (settings.logo?.publicId) {
        try {
          await cloudinary.uploader.destroy(settings.logo.publicId);
        } catch (error) {
          console.error("Error deleting old logo:", error);
        }
      }

      let logoResult;

      // Check if it's from multer (has path property) or express-fileupload (has tempFilePath)
      if (req.files.logo[0]?.path) {
        // Multer format
        logoResult = await cloudinary.uploader.upload(req.files.logo[0].path, {
          folder: "content/logos",
          transformation: [{ width: 200, height: 200, crop: "fit" }],
        });
      } else if (req.files.logo.tempFilePath) {
        // Express-fileupload format
        logoResult = await cloudinary.uploader.upload(
          req.files.logo.tempFilePath,
          {
            folder: "content/logos",
            transformation: [{ width: 200, height: 200, crop: "fit" }],
          }
        );
      } else {
        throw new Error("Invalid file upload format");
      }

      updateData.logo = {
        url: logoResult.secure_url,
        publicId: logoResult.public_id,
      };
    }

    updateData.lastModifiedBy = req.admin.userId;

    Object.assign(settings, updateData);
    await settings.save();

    res.status(200).json({
      success: true,
      message: "Content settings updated successfully",
      data: { settings },
    });
  } catch (error) {
    console.error("Update content settings error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update content settings",
    });
  }
};

// NEW FUNCTION - Delete logo
export const deleteLogo = async (req, res) => {
  try {
    const settings = await ContentSettings.getSettings();

    if (!settings.logo || !settings.logo.publicId) {
      return res.status(404).json({
        success: false,
        message: "No logo found to delete",
      });
    }

    // Delete from Cloudinary
    try {
      await cloudinary.uploader.destroy(settings.logo.publicId);
    } catch (error) {
      console.error("Error deleting logo from Cloudinary:", error);
    }

    // Clear logo from database
    settings.logo = {
      url: null,
      publicId: null,
    };
    settings.lastModifiedBy = req.admin.userId;
    await settings.save();

    res.status(200).json({
      success: true,
      message: "Logo deleted successfully",
      data: { settings },
    });
  } catch (error) {
    console.error("Delete logo error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete logo",
    });
  }
};

// ============ FAQ MANAGEMENT ============

export const getAllFAQs = async (req, res) => {
  try {
    const { isActive, limit } = req.query;
    // No need of category filter anymore

    const filter = {};
    // REMOVED category filter
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const faqs = await FAQ.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: { faqs, total: faqs.length },
    });
  } catch (error) {
    console.error("Get FAQs error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch FAQs",
    });
  }
};

export const createFAQ = async (req, res) => {
  try {
    const faqData = {
      ...req.body,
      createdBy: req.admin.userId,
      lastModifiedBy: req.admin.userId,
    };

    const faq = await FAQ.create(faqData);

    res.status(201).json({
      success: true,
      message: "FAQ created successfully",
      data: { faq },
    });
  } catch (error) {
    console.error("Create FAQ error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create FAQ",
    });
  }
};

export const updateFAQ = async (req, res) => {
  try {
    const { id } = req.params;

    const faq = await FAQ.findByIdAndUpdate(
      id,
      {
        ...req.body,
        lastModifiedBy: req.admin.userId,
      },
      { new: true, runValidators: true }
    );

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "FAQ updated successfully",
      data: { faq },
    });
  } catch (error) {
    console.error("Update FAQ error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update FAQ",
    });
  }
};

export const deleteFAQ = async (req, res) => {
  try {
    const { id } = req.params;

    const faq = await FAQ.findByIdAndDelete(id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "FAQ deleted successfully",
    });
  } catch (error) {
    console.error("Delete FAQ error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete FAQ",
    });
  }
};

// Bulk update FAQ order (for drag and drop)
export const bulkUpdateFAQOrder = async (req, res) => {
  try {
    const { faqs } = req.body; // Array of { id, order }

    if (!faqs || !Array.isArray(faqs)) {
      return res.status(400).json({
        success: false,
        message: "FAQs array is required",
      });
    }

    // Update each FAQ's order
    const updatePromises = faqs.map((faq) =>
      FAQ.findByIdAndUpdate(faq.id, { order: faq.order }, { new: true })
    );

    await Promise.all(updatePromises);

    // Fetch updated FAQs
    const updatedFAQs = await FAQ.find().sort({ order: 1 });

    res.status(200).json({
      success: true,
      message: "FAQ order updated successfully",
      data: { faqs: updatedFAQs },
    });
  } catch (error) {
    console.error("Bulk update FAQ order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update FAQ order",
    });
  }
};

// ============ CONTACT INFO ============

export const getContactInfo = async (req, res) => {
  try {
    const contactInfo = await ContactInfo.getContactInfo();

    res.status(200).json({
      success: true,
      data: { contactInfo },
    });
  } catch (error) {
    console.error("Get contact info error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch contact info",
    });
  }
};

export const updateContactInfo = async (req, res) => {
  try {
    const contactInfo = await ContactInfo.getContactInfo();

    const updateData = {
      ...req.body,
      lastModifiedBy: req.admin.userId,
    };

    Object.assign(contactInfo, updateData);
    await contactInfo.save();

    res.status(200).json({
      success: true,
      message: "Contact info updated successfully",
      data: { contactInfo },
    });
  } catch (error) {
    console.error("Update contact info error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update contact info",
    });
  }
};

// ============ LEGAL PAGES ============

export const getLegalPage = async (req, res) => {
  try {
    const { type } = req.params;

    if (!["privacy", "terms"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid legal page type",
      });
    }

    const page = await LegalPage.findOne({ type, isActive: true }).lean();

    if (!page) {
      return res.status(404).json({
        success: false,
        message: "Legal page not found",
      });
    }

    // Ensure sections array exists (even if empty)
    if (!page.sections) {
      page.sections = [];
    }

    res.status(200).json({
      success: true,
      data: { page },
    });
  } catch (error) {
    console.error("Get legal page error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch legal page",
    });
  }
};

export const getAllLegalPages = async (req, res) => {
  try {
    const pages = await LegalPage.find({ isActive: true })
      .sort({ type: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: { pages },
    });
  } catch (error) {
    console.error("Get all legal pages error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch legal pages",
    });
  }
};

export const updateLegalPage = async (req, res) => {
  try {
    const { type } = req.params;
    const { title, sections, metadata } = req.body; // REMOVED: content, version

    // ADDED: Validation for type
    if (!["privacy", "terms"].includes(type)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid legal page type. Only 'privacy' and 'terms' are supported.",
      });
    }

    let page = await LegalPage.findOne({ type });

    if (!page) {
      page = new LegalPage({
        type,
        title,
        sections: sections || [],
        metadata: {
          effectiveDate: metadata?.effectiveDate || null,
          lastReviewedDate: metadata?.lastReviewedDate || null,
        },
        templateHints: LegalPage.getTemplateHints(type),
      });
    } else {
      page.title = title;

      if (sections) {
        page.sections = sections.map((section, sectionIndex) => ({
          ...section,
          id: section.id || new mongoose.Types.ObjectId().toString(),
          order: section.order !== undefined ? section.order : sectionIndex,
          // ← CHANGED: Keep content field
          content: section.content || "",
          subheaders:
            section.subheaders
              // ← CHANGED: Only filter if BOTH title and points are empty
              ?.filter((sub) => {
                const hasTitle = sub.title && sub.title.trim() !== "";
                const hasPoints =
                  sub.points && sub.points.some((p) => p && p.trim() !== "");
                return hasTitle || hasPoints; // Keep if has either
              })
              ?.map((sub, subIndex) => ({
                ...sub,
                id: sub.id || new mongoose.Types.ObjectId().toString(),
                order: sub.order !== undefined ? sub.order : subIndex,
                title: sub.title || "", // ← CHANGED: Allow empty title
                points:
                  sub.points?.filter((point) => point && point.trim() !== "") ||
                  [],
              })) || [],
        }));
      }

      // CHANGED: Properly merge metadata
      if (metadata) {
        page.metadata = {
          effectiveDate:
            metadata.effectiveDate || page.metadata?.effectiveDate || null,
          lastReviewedDate:
            metadata.lastReviewedDate ||
            page.metadata?.lastReviewedDate ||
            null,
        };
      }

      page.lastUpdated = new Date();
    }

    page.lastModifiedBy = req.admin.userId;
    await page.save();

    res.status(200).json({
      success: true,
      message: "Legal page updated successfully",
      data: { page },
    });
  } catch (error) {
    console.error("Update legal page error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update legal page",
    });
  }
};

// NEW FUNCTION - Add after updateLegalPage function
export const bulkUpdateSectionOrder = async (req, res) => {
  try {
    const { type } = req.params;
    const { sections } = req.body;

    if (!["privacy", "terms"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid legal page type",
      });
    }

    if (!sections || !Array.isArray(sections)) {
      return res.status(400).json({
        success: false,
        message: "Sections array is required",
      });
    }

    const page = await LegalPage.findOne({ type });

    if (!page) {
      return res.status(404).json({
        success: false,
        message: "Legal page not found",
      });
    }

    // Update order for all sections and subheaders
    page.sections = sections.map((section) => {
      const existingSection = page.sections.find((s) => s.id === section.id);
      return {
        ...existingSection?._doc,
        ...section,
        subheaders:
          section.subheaders?.map((sub) => {
            const existingSub = existingSection?.subheaders?.find(
              (s) => s.id === sub.id
            );
            return {
              ...existingSub?._doc,
              ...sub,
            };
          }) || [],
      };
    });

    page.lastModifiedBy = req.admin.userId;
    page.lastUpdated = new Date();
    await page.save();

    res.status(200).json({
      success: true,
      message: "Section order updated successfully",
      data: { page },
    });
  } catch (error) {
    console.error("Bulk update section order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update section order",
    });
  }
};

// ============ PREVIEW ENDPOINTS ============

export const getHomePreview = async (req, res) => {
  try {
    const settings = await ContentSettings.getSettings();
    const faqs = await FAQ.find({ isActive: true })
      .sort({ order: 1 })
      .limit(5)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        hero: {
          title: settings.heroTitle,
          highlight: settings.heroHighlight,
          description: settings.heroDescription,
        },
        stats: settings.stats,
        features: settings.features,
        chartConfig: settings.chartConfig,
        cta: {
          title: settings.ctaTitle,
          description: settings.ctaDescription,
        },
        faqs: faqs,
        logo: settings.logo,
        featuresTitle: settings.featuresTitle,
        featuresDescription: settings.featuresDescription,
      },
    });
  } catch (error) {
    console.error("Get home preview error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch home preview",
    });
  }
};

export const getAboutPreview = async (req, res) => {
  try {
    const settings = await ContentSettings.getSettings();

    res.status(200).json({
      success: true,
      data: {
        siteName: settings.siteName,
        siteDescription: settings.siteDescription,
        values: settings.aboutValues || [],
        features: settings.aboutFeatures || [],
        stats: settings.aboutStats || [],
        logo: settings.logo,
      },
    });
  } catch (error) {
    console.error("Get about preview error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch about preview",
    });
  }
};

export const getFooterPreview = async (req, res) => {
  try {
    const contactInfo = await ContactInfo.getContactInfo();
    const settings = await ContentSettings.getSettings();

    res.status(200).json({
      success: true,
      data: {
        logo: settings.logo,
        siteName: settings.siteName,
        footerDescription: contactInfo.footerDescription,
        copyrightText: contactInfo.copyrightText,
        email: contactInfo.email,
        phone: contactInfo.phone,
        socialMedia: contactInfo.socialMedia,
        quickLinks: contactInfo.quickLinks,
      },
    });
  } catch (error) {
    console.error("Get footer preview error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch footer preview",
    });
  }
};

// ============ TEMPLATE HINTS ============

export const getLegalTemplateHints = async (req, res) => {
  try {
    const { type } = req.params;
    const hints = LegalPage.getTemplateHints(type);

    res.status(200).json({
      success: true,
      data: { hints },
    });
  } catch (error) {
    console.error("Get template hints error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch template hints",
    });
  }
};
