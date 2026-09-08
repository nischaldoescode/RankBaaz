/**
 * handles content settings, public page previews, faqs, contact data, and legal page updates
 *
 * @file backend/controllers/contentcontroller.js
 * @module backend/controllers/contentcontroller
 * @exports request handlers used by content routes and admin content tools
 */
import ContentSettings from "../Models/ContentSettings.js";
import FAQ from "../Models/FAQ.js";
import ContactInfo from "../Models/ContactInfo.js";
import LegalPage from "../Models/LegalPages.js";
import Course from "../Models/Course.js";
import TestResult from "../Models/TestResult.js";
import User from "../Models/User.js";
import { v2 as cloudinary } from "cloudinary";
import { invalidateCache } from "../Config/redis.js";

// content settings

const getUploadedFile = (files, field) => {
  const value = files?.[field];
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
};

const getUploadPath = (file) => file?.path || file?.tempFilePath;

const assertImageUpload = (file) => {
  if (!file) return;

  const mime = file.mimetype || file.type || "";
  if (!mime.startsWith("image/")) {
    throw new Error("Only image uploads are allowed for page content");
  }

  if (file.size && file.size > 5 * 1024 * 1024) {
    throw new Error("Content images must be 5MB or smaller");
  }

  if (!getUploadPath(file)) {
    throw new Error("Invalid file upload format");
  }
};

const destroyCloudinaryAsset = async (publicId) => {
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary asset delete failed:", error);
  }
};

const uploadContentImage = async (file, folder, transformation) => {
  assertImageUpload(file);
  const result = await cloudinary.uploader.upload(getUploadPath(file), {
    folder,
    transformation,
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
};

const parseJsonField = (updateData, field) => {
  if (typeof updateData[field] === "string") {
    updateData[field] = JSON.parse(updateData[field]);
  }
};

/**
 * calculates non-identifying platform totals used by the public home page
 *
 * @returns {Promise<object>} verified aggregate values and display eligibility
 */
const getPublicPlatformStats = async () => {
  const activeSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const completedAttemptFilter = {
    wasAbandoned: { $ne: true },
    percentage: { $gte: 0, $lte: 100 },
  };

  const [courseCount, attemptRows, activeStudentRows] = await Promise.all([
    Course.countDocuments({
      isActive: true,
      approvalStatus: "approved",
      totalQuestions: { $gt: 0 },
    }),
    TestResult.aggregate([
      { $match: completedAttemptFilter },
      {
        $lookup: {
          from: User.collection.name,
          localField: "user",
          foreignField: "_id",
          as: "verifiedUser",
        },
      },
      { $match: { "verifiedUser.0.isVerified": true } },
      {
        $group: {
          _id: null,
          testsCompleted: { $sum: 1 },
          successfulTests: {
            $sum: { $cond: [{ $gte: ["$percentage", 60] }, 1, 0] },
          },
        },
      },
    ]),
    TestResult.aggregate([
      {
        $match: {
          ...completedAttemptFilter,
          completedAt: { $gte: activeSince },
        },
      },
      { $group: { _id: "$user" } },
      {
        $lookup: {
          from: User.collection.name,
          localField: "_id",
          foreignField: "_id",
          as: "verifiedUser",
        },
      },
      { $match: { "verifiedUser.0.isVerified": true } },
      { $count: "count" },
    ]),
  ]);

  const testsCompleted = Math.max(0, attemptRows[0]?.testsCompleted || 0);
  const successfulTests = Math.max(0, attemptRows[0]?.successfulTests || 0);
  const activeStudents = Math.max(0, activeStudentRows[0]?.count || 0);
  const activeCourses = Math.max(0, courseCount || 0);
  const successRate =
    testsCompleted > 0
      ? Math.min(100, Math.round((successfulTests / testsCompleted) * 100))
      : 0;

  return {
    eligible:
      testsCompleted > 5 &&
      activeStudents > 5 &&
      activeCourses >= 10 &&
      successRate >= 60,
    thresholds: {
      testsCompleted: 6,
      activeStudents: 6,
      activeCourses: 10,
      successRate: 60,
    },
    items: [
      { key: "activeStudents", value: activeStudents, label: "Active Students" },
      { key: "testsCompleted", value: testsCompleted, label: "Tests Completed" },
      { key: "activeCourses", value: activeCourses, label: "Active Courses" },
      { key: "successRate", value: successRate, suffix: "%", label: "Success Rate" },
    ],
    measuredAt: new Date().toISOString(),
  };
};

export const getContentSettings = async (req, res) => {
  try {
    const settings = await ContentSettings.getSettings();
    const platformStats = await getPublicPlatformStats().catch((error) => {
      console.warn("Public platform stats unavailable:", error.message);
      return {
        eligible: false,
        items: [],
        measuredAt: new Date().toISOString(),
      };
    });
    const publicSettings =
      typeof settings.toObject === "function" ? settings.toObject() : settings;

    res.status(200).json({
      success: true,
      data: {
        settings: {
          ...publicSettings,
          platformStats,
        },
      },
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
  const uploadedPublicIds = [];
  const oldPublicIdsToDelete = [];

  try {
    const settings = await ContentSettings.getSettings();
    const updateData = { ...req.body };

    // parse json fields if they come as strings
    [
      "stats",
      "features",
      "aboutValues",
      "aboutFeatures",
      "aboutStats",
      "chartConfig",
      "backgroundElements",
      "homeStoryChapters",
      "aboutHeroImage",
    ].forEach((field) => parseJsonField(updateData, field));

    // sanitize chartconfig enums so mongoose validation never fails on bad data
    if (updateData.chartConfig) {
      const validTypes = ["pie", "bar", "line", "doughnut"];
      const validPositions = ["left", "right"];
      if (!validTypes.includes(updateData.chartConfig.type)) {
        updateData.chartConfig.type = "pie";
      }
      if (!validPositions.includes(updateData.chartConfig.position)) {
        updateData.chartConfig.position = "right";
      }
      if (typeof updateData.chartConfig.enabled !== "boolean") {
        updateData.chartConfig.enabled = true;
      }
    }
    // handle logo upload (supports both express-fileupload and multer)
    const logoFile = getUploadedFile(req.files, "logo");
    if (logoFile) {
      const logoResult = await uploadContentImage(
        logoFile,
        "content/logos",
        [{ width: 200, height: 200, crop: "fit" }],
      );
      uploadedPublicIds.push(logoResult.publicId);
      if (settings.logo?.publicId) {
        oldPublicIdsToDelete.push(settings.logo.publicId);
      }
      updateData.logo = {
        url: logoResult.url,
        publicId: logoResult.publicId,
      };
    }

    const aboutHeroImageFile = getUploadedFile(req.files, "aboutHeroImageFile");
    if (aboutHeroImageFile) {
      const uploaded = await uploadContentImage(
        aboutHeroImageFile,
        "content/page-images",
        [{ width: 1400, height: 1000, crop: "limit", quality: "auto" }],
      );
      uploadedPublicIds.push(uploaded.publicId);
      if (settings.aboutHeroImage?.publicId) {
        oldPublicIdsToDelete.push(settings.aboutHeroImage.publicId);
      }

      updateData.aboutHeroImage = {
        ...(updateData.aboutHeroImage || settings.aboutHeroImage?.toObject?.() || {}),
        ...uploaded,
        fallbackSrc:
          updateData.aboutHeroImage?.fallbackSrc ||
          settings.aboutHeroImage?.fallbackSrc ||
          "/images/about-learning-workspace.webp",
        alt:
          updateData.aboutHeroImage?.alt ||
          settings.aboutHeroImage?.alt ||
          "Students and teachers reviewing course progress together",
      };
    }

    if (Array.isArray(updateData.homeStoryChapters)) {
      const existingChapters = settings.homeStoryChapters || [];
      const chapters = [...updateData.homeStoryChapters];

      for (let index = 0; index < chapters.length; index += 1) {
        const file = getUploadedFile(req.files, `homeStoryImageFile_${index}`);
        const existingImage = existingChapters[index]?.image || {};
        const nextImage = chapters[index]?.image || existingImage || {};

        if (file) {
          const uploaded = await uploadContentImage(
            file,
            "content/page-images",
            [{ width: 1400, height: 900, crop: "limit", quality: "auto" }],
          );
          uploadedPublicIds.push(uploaded.publicId);
          if (existingImage.publicId) {
            oldPublicIdsToDelete.push(existingImage.publicId);
          }

          chapters[index] = {
            ...chapters[index],
            image: {
              ...nextImage,
              ...uploaded,
              fallbackSrc: nextImage.fallbackSrc || existingImage.fallbackSrc,
              alt:
                nextImage.alt ||
                chapters[index]?.title ||
                existingImage.alt ||
                "Vidhgrow study flow image",
            },
          };
        } else {
          chapters[index] = {
            ...chapters[index],
            image: {
              ...nextImage,
              fallbackSrc: nextImage.fallbackSrc || existingImage.fallbackSrc,
              alt:
                nextImage.alt ||
                chapters[index]?.title ||
                existingImage.alt ||
                "Vidhgrow study flow image",
            },
          };
        }
      }

      updateData.homeStoryChapters = chapters;
    }

    updateData.lastModifiedBy = req.admin.userId;

    Object.assign(settings, updateData);
    await settings.save();
    await Promise.all(oldPublicIdsToDelete.map((publicId) => destroyCloudinaryAsset(publicId)));
    await invalidateCache.content().catch((error) => {
      console.error("Content cache invalidation failed:", error);
    });
    res.status(200).json({
      success: true,
      message: "Content settings updated successfully",
      data: { settings },
    });
  } catch (error) {
    await Promise.all(uploadedPublicIds.map((publicId) => destroyCloudinaryAsset(publicId)));
    console.error("Update content settings error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update content settings",
    });
  }
};

// function - delete logo
export const deleteLogo = async (req, res) => {
  try {
    const settings = await ContentSettings.getSettings();

    if (!settings.logo || !settings.logo.publicId) {
      return res.status(404).json({
        success: false,
        message: "No logo found to delete",
      });
    }

    // delete from cloudinary
    try {
      await cloudinary.uploader.destroy(settings.logo.publicId);
    } catch (error) {
      console.error("Error deleting logo from Cloudinary:", error);
    }

    // clear logo from database
    settings.logo = {
      url: null,
      publicId: null,
    };
    settings.lastModifiedBy = req.admin.userId;
    await settings.save();
    await invalidateCache.content();
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

// faq management

export const getAllFAQs = async (req, res) => {
  try {
    const { isActive, limit } = req.query;
    // no need of category filter anymore

    const filter = {};
    // category filter
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
    await invalidateCache.content();
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
      { new: true, runValidators: true },
    );

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: "FAQ not found",
      });
    }
    await invalidateCache.content();
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
    await invalidateCache.content();
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

// bulk update faq order (for drag and drop)
export const bulkUpdateFAQOrder = async (req, res) => {
  try {
    const { faqs } = req.body; // array of { id, order }

    if (!faqs || !Array.isArray(faqs)) {
      return res.status(400).json({
        success: false,
        message: "FAQs array is required",
      });
    }

    // update each faq's order
    const updatePromises = faqs.map((faq) =>
      FAQ.findByIdAndUpdate(faq.id, { order: faq.order }, { new: true }),
    );

    await Promise.all(updatePromises);

    // fetch updated faqs
    const updatedFAQs = await FAQ.find().sort({ order: 1 });

    await invalidateCache.content();
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

// contact info

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
    await invalidateCache.content();
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

// legal pages

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

    // ensure sections array exists (even if empty)
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
    const { title, version, sections, metadata } = req.body;

    // ed: validation for type
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
        version: typeof version === "string" && version.trim() ? version.trim() : "1.0",
        sections: sections || [],
        metadata: {
          effectiveDate: metadata?.effectiveDate || null,
          lastReviewedDate: metadata?.lastReviewedDate || null,
        },
        templateHints: LegalPage.getTemplateHints(type),
      });
    } else {
      page.title = title;
      if (version !== undefined) {
        page.version =
          typeof version === "string" && version.trim()
            ? version.trim()
            : page.version || "1.0";
      }

      if (sections) {
        page.sections = sections.map((section, sectionIndex) => ({
          ...section,
          id: section.id || new mongoose.Types.ObjectId().toString(),
          order: section.order !== undefined ? section.order : sectionIndex,
          // ← d: keep content field
          content: section.content || "",
          subheaders:
            section.subheaders
              // ← d: only filter if both title and points are empty
              ?.filter((sub) => {
                const hasTitle = sub.title && sub.title.trim() !== "";
                const hasPoints =
                  sub.points && sub.points.some((p) => p && p.trim() !== "");
                return hasTitle || hasPoints; // keep if has either
              })
              ?.map((sub, subIndex) => ({
                ...sub,
                id: sub.id || new mongoose.Types.ObjectId().toString(),
                order: sub.order !== undefined ? sub.order : subIndex,
                title: sub.title || "", // ← d: allow empty title
                points:
                  sub.points?.filter((point) => point && point.trim() !== "") ||
                  [],
              })) || [],
        }));
      }

      // d: properly merge metadata
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

    // invalidate legal page cache
    await invalidateCache.legalPage(type);
    await invalidateCache.content();
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

// function - updatelegalpage function
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

    // update order for all sections and subheaders
    page.sections = sections.map((section) => {
      const existingSection = page.sections.find((s) => s.id === section.id);
      return {
        ...existingSection?._doc,
        ...section,
        subheaders:
          section.subheaders?.map((sub) => {
            const existingSub = existingSection?.subheaders?.find(
              (s) => s.id === sub.id,
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

    await invalidateCache.legalPage(type);
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

// preview endpoints

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
        story: {
          eyebrow: settings.homeStoryEyebrow,
          title: settings.homeStoryTitle,
          highlightedText: settings.homeStoryHighlightedText,
          description: settings.homeStoryDescription,
          chapters: settings.homeStoryChapters || [],
        },
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
        hero: {
          eyebrow: settings.aboutHeroEyebrow,
          title: settings.aboutHeroTitle,
          description: settings.aboutHeroDescription,
          image: settings.aboutHeroImage,
        },
        valuesMeta: {
          eyebrow: settings.aboutValuesEyebrow,
          title: settings.aboutValuesTitle,
        },
        cta: {
          title: settings.aboutCtaTitle,
          description: settings.aboutCtaDescription,
        },
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

// template hints

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
