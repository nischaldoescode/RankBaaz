import React, { useState, useEffect } from "react";
import { useContent } from "../contexts/ContentContext";
import {
  FileText,
  MessageSquare,
  Phone,
  Scale,
  Save,
  Plus,
  Trash2,
  Edit,
  X,
  Instagram,
  Twitter,
  Facebook,
  Linkedin,
  Youtube,
  Mail,
  MapPin,
  Clock,
  Eye,
  Home,
  Info,
  BarChart2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Brain,
  Target,
  Trophy,
  Zap,
  Lightbulb,
  Rocket,
  BookOpen,
  TrendingUp,
  Shield,
  Award,
  Users,
  Heart,
  PanelBottom,
} from "lucide-react";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { HomePreview } from "../helpers/HomePreview";
import { AboutPreview } from "../helpers/AboutPreview";
import { FooterPreview } from "../helpers/FooterPreview";
import { ContactPreview } from "../helpers/ContactPreview";
import { LegalPagePreview } from "../helpers/LegalPagePreview";
import ConfirmModal from "../helpers/Modals/ConfirmModal";
const iconMap = {
  Brain,
  Target,
  Trophy,
  Zap,
  Lightbulb,
  Rocket,
  BookOpen,
  TrendingUp,
  Shield,
  Award,
  Users,
  Heart,
};

// Sortable Legal Section Component
const SortableLegalSection = ({
  section,
  sectionIndex,
  legalForm,
  setLegalForm,
  sensors,
  showConfirmModal,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const updateSection = (updates) => {
    setLegalForm((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) =>
        i === sectionIndex ? { ...s, ...updates } : s
      ),
    }));
  };

  const deleteSection = () => {
    showConfirmModal(
      "Delete Section",
      "Are you sure you want to delete this section? This action cannot be undone.",
      () => {
        setLegalForm((prev) => ({
          ...prev,
          sections: prev.sections.filter((_, i) => i !== sectionIndex),
        }));
      },
      "danger"
    );
  };

  const addSubheader = () => {
    const newSubheader = {
      id: `subheader-${Date.now()}`,
      title: "",
      points: [""],
      order: section.subheaders?.length || 0,
    };
    updateSection({
      subheaders: [...(section.subheaders || []), newSubheader],
    });
  };

  const updateSubheader = (subIndex, updates) => {
    const newSubheaders = section.subheaders.map((sub, i) =>
      i === subIndex ? { ...sub, ...updates } : sub
    );
    updateSection({ subheaders: newSubheaders });
  };

const deleteSubheader = (subIndex) => {
  showConfirmModal(
    "Delete Subheader",
    "Are you sure you want to delete this subheader?",
    () => {
      updateSection({
        subheaders: section.subheaders.filter((_, i) => i !== subIndex),
      });
    },
    "warning"
  );
};

  const addPoint = (subIndex) => {
    const newSubheaders = section.subheaders.map((sub, i) => {
      if (i === subIndex) {
        return {
          ...sub,
          points: [...(sub.points || []), ""],
        };
      }
      return sub;
    });
    updateSection({ subheaders: newSubheaders });
  };

  const updatePoint = (subIndex, pointIndex, value) => {
    const newSubheaders = section.subheaders.map((sub, i) => {
      if (i === subIndex) {
        const newPoints = [...sub.points];
        newPoints[pointIndex] = value;
        return { ...sub, points: newPoints };
      }
      return sub;
    });
    updateSection({ subheaders: newSubheaders });
  };

  const deletePoint = (subIndex, pointIndex) => {
    const newSubheaders = section.subheaders.map((sub, i) => {
      if (i === subIndex) {
        return {
          ...sub,
          points: sub.points.filter((_, pIdx) => pIdx !== pointIndex),
        };
      }
      return sub;
    });
    updateSection({ subheaders: newSubheaders });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white p-6 rounded-lg border-2 border-gray-200 ${
        isDragging ? "shadow-2xl z-50" : ""
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="mt-2 cursor-move text-gray-400 hover:text-gray-600 touch-none"
        >
          <GripVertical className="w-5 h-5" />
        </div>

        <div className="flex-1 space-y-4">
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <input
              type="text"
              value={section.header}
              onChange={(e) => updateSection({ header: e.target.value })}
              placeholder="Section Header (e.g., 1. Introduction)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold"
            />
            <div className="flex gap-2 ml-4">
              <button
                type="button"
                onClick={addSubheader}
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg cursor-pointer"
                title="Add Subheader"
              >
                <Plus className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={deleteSection}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                title="Delete Section"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ← ADD THIS ENTIRE BLOCK: Section Content (paragraph text) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Section Content (optional paragraph text)
            </label>
            <textarea
              value={section.content || ""}
              onChange={(e) => updateSection({ content: e.target.value })}
              placeholder="Add paragraph text here, or leave empty and use bullet points below..."
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Use this for regular paragraph text. For bullet points, add
              subheaders below.
            </p>
          </div>

          {/* Subheaders */}
          {section.subheaders && section.subheaders.length > 0 && (
            <div className="ml-8 space-y-4">
              {section.subheaders.map((subheader, subIndex) => (
                <div
                  key={subheader.id}
                  className="bg-gray-50 p-4 rounded-lg border border-gray-200"
                >
                  {/* ← MODIFY THIS: Make title optional */}
                  <div className="flex items-center justify-between mb-3">
                    <input
                      type="text"
                      value={subheader.title || ""}
                      onChange={(e) =>
                        updateSubheader(subIndex, { title: e.target.value })
                      }
                      placeholder="Subheader Title (optional - e.g., 1.1 Purpose)"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                    <div className="flex gap-2 ml-3">
                      <button
                        type="button"
                        onClick={() => addPoint(subIndex)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer text-sm"
                        title="Add Point"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSubheader(subIndex)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer text-sm"
                        title="Delete Subheader"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Points remain the same */}
                  {subheader.points && subheader.points.length > 0 && (
                    <div className="ml-4 space-y-2">
                      {subheader.points.map((point, pointIndex) => (
                        <div
                          key={pointIndex}
                          className="flex items-center gap-2"
                        >
                          <span className="text-gray-400 text-sm">•</span>
                          <input
                            type="text"
                            value={point}
                            onChange={(e) =>
                              updatePoint(subIndex, pointIndex, e.target.value)
                            }
                            placeholder="Point text"
                            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => deletePoint(subIndex, pointIndex)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                            title="Delete Point"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ADD: FAQs Live Preview Component
const FAQsPreview = ({ data }) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="space-y-6 bg-gradient-to-br from-muted/30 to-background p-8 rounded-xl border border-border">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-foreground mb-2">
          FAQs Preview
        </h3>
        <p className="text-sm text-muted-foreground">
          Live preview of your FAQ section ({data.length} questions)
        </p>
      </div>

      <div className="bg-card rounded-xl p-6 border border-border">
        <div className="space-y-4">
          {data.map((faq, index) => (
            <div
              key={index}
              className="bg-muted/30 rounded-lg p-4 border border-border"
            >
              <div className="flex items-start justify-between mb-3">
                <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <span className="text-primary">Q{index + 1}:</span>
                  {faq.question}
                </h4>
                <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded">
                  Order: {faq.order}
                </span>
              </div>
              <p className="text-muted-foreground pl-8">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ADD: About Stats Live Preview Component
const AboutStatsPreview = ({ data }) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="space-y-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-xl p-8 border border-blue-200 dark:border-blue-800">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-foreground mb-2">
          About Stats Preview
        </h3>
        <p className="text-sm text-muted-foreground">
          How stats will appear on About page ({data.length} stats)
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {data.map((stat, idx) => (
          <div
            key={idx}
            className="bg-card border border-border rounded-xl p-6 text-center hover:shadow-lg transition-shadow"
          >
            <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">
              {stat.value}
            </div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ADD: About Features Live Preview Component
const AboutFeaturesPreview = ({ data }) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="space-y-6 bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-950 dark:to-teal-950 rounded-xl p-8 border border-green-200 dark:border-green-800">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-foreground mb-2">
          About Features Preview
        </h3>
        <p className="text-sm text-muted-foreground">
          How features will appear on About page ({data.length} features)
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.map((feature, idx) => {
          const IconComponent = iconMap[feature.icon] || BookOpen;
          return (
            <div
              key={idx}
              className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all hover:scale-105"
            >
              <IconComponent className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// NEW Sortable FAQ Item Component
const SortableFAQItem = ({ faq, index, handleEditFAQ, handleDeleteFAQ }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: faq._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white p-6 rounded-lg border border-gray-200 transition-shadow ${
        isDragging ? "shadow-2xl z-50" : ""
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="mt-1 cursor-move text-gray-400 hover:text-gray-600 touch-none"
        >
          <GripVertical className="w-5 h-5" />
        </div>

        <div className="flex-1">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h4 className="text-lg font-semibold text-gray-900">
                  {faq.question}
                </h4>
                <span className="text-xs text-gray-500">#{index + 1}</span>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleEditFAQ(faq)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
              >
                <Edit className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleDeleteFAQ(faq._id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
          <p className="text-gray-600">{faq.answer}</p>
        </div>
      </div>
    </div>
  );
};

// ============ MAIN COMPONENT ============

const ContentManagement = () => {
  const {
    loading,
    contentSettings,
    faqs,
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
    fetchHomePreview,
    fetchAboutPreview,
    fetchFooterPreview,
    getLegalTemplateHints,
    bulkUpdateFAQOrder,
    deleteLogo,
  } = useContent();
  const [activeTab, setActiveTab] = useState("settings");
  const [settingsForm, setSettingsForm] = useState({});
  const [faqForm, setFaqForm] = useState({
    question: "",
    answer: "",
    order: 0,
  });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    type: "danger",
  });

  const showConfirmModal = (title, message, onConfirm, type = "danger") => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm,
      type,
    });
  };

  const closeConfirmModal = () => {
    setConfirmModal({
      isOpen: false,
      title: "",
      message: "",
      onConfirm: () => {},
      type: "danger",
    });
  };
  const [editingFAQ, setEditingFAQ] = useState(null);
  const [contactForm, setContactForm] = useState({});
  const [legalForm, setLegalForm] = useState({
    type: "privacy",
    content: "",
    metadata: {
      effectiveDate: null,
      lastReviewedDate: null,
    },
  });
  const [templateHints, setTemplateHints] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewType, setPreviewType] = useState("home");

  useEffect(() => {
    fetchContentSettings();
    fetchFAQs();
    fetchContactInfo();
    fetchLegalPages();
  }, []);

  useEffect(() => {
    if (contentSettings) {
      setSettingsForm({
        ...contentSettings,
        stats: contentSettings.stats || [],
        features: contentSettings.features || [],
        aboutValues: contentSettings.aboutValues || [],
        aboutFeatures: contentSettings.aboutFeatures || [],
        aboutStats: contentSettings.aboutStats || [],
        chartConfig: contentSettings.chartConfig || {
          type: "pie",
          position: "right",
          enabled: true,
        },
      });
    }
  }, [contentSettings]);

  useEffect(() => {
    if (contactInfo) {
      setContactForm(contactInfo);
    }
  }, [contactInfo]);

  // Load template hints when legal page type changes
  useEffect(() => {
    const loadHints = async () => {
      const result = await getLegalTemplateHints(legalForm.type);
      if (result.success) {
        setTemplateHints(result.data);
      }
    };
    loadHints();
  }, [legalForm.type]);

  const tabs = [
    { id: "settings", label: "Site Settings", icon: FileText },
    { id: "faqs", label: "FAQs", icon: MessageSquare },
    { id: "contact", label: "Contact Info", icon: Phone },
    { id: "legal", label: "Legal Pages", icon: Scale },
    { id: "preview", label: "Preview", icon: Eye },
  ];

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    await updateContentSettings(settingsForm);
  };

  const handleFAQSubmit = async (e) => {
    e.preventDefault();
    if (editingFAQ) {
      await updateFAQ(editingFAQ._id, faqForm);
      setEditingFAQ(null);
    } else {
      await createFAQ(faqForm);
    }
    setFaqForm({ question: "", answer: "", order: 0 });
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    await updateContactInfo(contactForm);
  };

  const handleLegalSubmit = async (e) => {
    e.preventDefault();

    // Validation: Must have title
    if (!legalForm.title || legalForm.title.trim() === "") {
      toast.error("Please enter a page title");
      return;
    }

    // Validation: Must have at least one section OR have old content
    if (
      (!legalForm.sections || legalForm.sections.length === 0) &&
      !legalForm.content
    ) {
      toast.error("Please add at least one section to the legal page");
      return;
    }

    // Warning if trying to save with old content
    if (
      legalForm.content &&
      (!legalForm.sections || legalForm.sections.length === 0)
    ) {
      if (
        !window.confirm(
          "You still have old markdown content. Do you want to save anyway? It's recommended to migrate to the new section-based structure."
        )
      ) {
        return;
      }
    }

    await updateLegalPage(legalForm.type, legalForm);
  };

  const handleEditFAQ = (faq) => {
    setEditingFAQ(faq);
    setFaqForm({
      question: faq.question,
      answer: faq.answer,
      order: faq.order,
    });
  };

  const handleDeleteFAQ = async (id) => {
    showConfirmModal(
      "Delete FAQ",
      "Are you sure you want to delete this FAQ? This action cannot be undone.",
      () => deleteFAQ(id),
      "danger"
    );
  };

  // handleFAQDragEnd function
  const handleFAQDragEnd = async (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = faqs.findIndex((faq) => faq._id === active.id);
    const newIndex = faqs.findIndex((faq) => faq._id === over.id);

    const newFaqs = arrayMove(faqs, oldIndex, newIndex);

    // Prepare data for backend
    const updatedFAQs = newFaqs.map((faq, index) => ({
      id: faq._id,
      order: index,
    }));

    // Save to backend - this will refetch automatically
    await bulkUpdateFAQOrder(updatedFAQs);
  };

  // Handle Legal Section Drag End
  const handleSectionDragEnd = async (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = legalForm.sections.findIndex((s) => s.id === active.id);
    const newIndex = legalForm.sections.findIndex((s) => s.id === over.id);

    const newSections = arrayMove(legalForm.sections, oldIndex, newIndex);

    // Update order values
    const updatedSections = newSections.map((section, index) => ({
      ...section,
      order: index,
    }));

    // Update local state immediately
    setLegalForm((prev) => ({
      ...prev,
      sections: updatedSections,
    }));

    // Save to backend
    await bulkUpdateSectionOrder(legalForm.type, updatedSections);
  };

  // ADD this sensors configuration right after handleSectionDragEnd:
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      setSettingsForm((prev) => ({
        ...prev,
        [field]: file,
      }));
    }
  };

  // Preview handlers
  const handleLoadPreview = async (type) => {
    setPreviewType(type);
    setShowPreview(true);
    setPreviewData(null); // Reset preview data

    let result;
    if (type === "home") {
      result = await fetchHomePreview();
    } else if (type === "about") {
      result = await fetchAboutPreview();
    } else if (type === "footer") {
      result = await fetchFooterPreview();
    } else if (type === "contact") {
      // Use contactInfo directly
      setPreviewData(contactInfo);
      return;
    } else if (type === "privacy") {
      result = await fetchLegalPage("privacy");
    } else if (type === "terms") {
      result = await fetchLegalPage("terms");
    }

    if (result?.success) {
      setPreviewData(result.data);
    } else if (result) {
      // For legal pages, result is the data directly
      setPreviewData(result);
    }
  };

  // Dynamic array management helpers
  const addToArray = (field, defaultItem) => {
    setSettingsForm((prev) => ({
      ...prev,
      [field]: [...(prev[field] || []), defaultItem],
    }));
  };

  const removeFromArray = (field, index) => {
    setSettingsForm((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const updateArrayItem = (field, index, updates) => {
    setSettingsForm((prev) => ({
      ...prev,
      [field]: prev[field].map((item, i) =>
        i === index ? { ...item, ...updates } : item
      ),
    }));
  };

  // Social Media Management
  const addSocialMedia = (platform) => {
    setContactForm((prev) => ({
      ...prev,
      socialMedia: {
        ...prev.socialMedia,
        [platform]: "",
      },
    }));
  };

  const removeSocialMedia = (platform) => {
    setContactForm((prev) => {
      const newSocialMedia = { ...prev.socialMedia };
      delete newSocialMedia[platform];
      return {
        ...prev,
        socialMedia: newSocialMedia,
      };
    });
  };

  const socialPlatforms = [
    { name: "instagram", icon: Instagram, label: "Instagram" },
    { name: "twitter", icon: Twitter, label: "Twitter" },
    { name: "facebook", icon: Facebook, label: "Facebook" },
    { name: "linkedin", icon: Linkedin, label: "LinkedIn" },
    { name: "youtube", icon: Youtube, label: "YouTube" },
    { name: "telegram", icon: MessageSquare, label: "Telegram Channel" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Content Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your site content, FAQs, contact information, and legal pages
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav
              className="flex space-x-4 px-6 overflow-x-auto"
              aria-label="Tabs"
            >
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center space-x-2 py-4 px-3 border-b-2 font-medium text-sm cursor-pointer whitespace-nowrap
                      ${
                        activeTab === tab.id
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* Site Settings Tab */}
            {activeTab === "settings" && (
              <form onSubmit={handleSettingsSubmit} className="space-y-8">
                {/* Basic Site Info */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                    Basic Site Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Site Name
                      </label>
                      <input
                        type="text"
                        value={settingsForm.siteName || ""}
                        onChange={(e) =>
                          setSettingsForm((prev) => ({
                            ...prev,
                            siteName: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Site Tagline
                      </label>
                      <input
                        type="text"
                        value={settingsForm.siteTagline || ""}
                        onChange={(e) =>
                          setSettingsForm((prev) => ({
                            ...prev,
                            siteTagline: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Site Description
                      </label>
                      <textarea
                        value={settingsForm.siteDescription || ""}
                        onChange={(e) =>
                          setSettingsForm((prev) => ({
                            ...prev,
                            siteDescription: e.target.value,
                          }))
                        }
                        rows="3"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Logo
                      </label>

                      {/* Show current logo with delete option */}
                      {settingsForm.logo?.url && (
                        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              Current Logo:
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                showConfirmModal(
                                  "Delete Logo",
                                  "Are you sure you want to delete the logo? This action cannot be undone.",
                                  async () => {
                                    const result = await deleteLogo();
                                    if (result.success) {
                                      setSettingsForm((prev) => ({
                                        ...prev,
                                        logo: { url: null, publicId: null },
                                      }));
                                    }
                                  },
                                  "danger"
                                );
                              }}
                              className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete Logo
                            </button>
                          </div>
                          <img
                            src={settingsForm.logo.url}
                            alt="Logo"
                            className="h-20 object-contain bg-white p-2 rounded border border-gray-300"
                          />
                        </div>
                      )}

                      {/* Upload new logo */}
                      <div className="space-y-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, "logo")}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          id="logo-upload"
                        />
                        <p className="text-xs text-gray-500">
                          Recommended: Square image, 200x200px or larger. Max
                          size: 5MB
                        </p>
                      </div>

                      {/* Preview newly selected file (before saving) */}
                      {settingsForm.logo instanceof File && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-xs font-medium text-blue-900 mb-2">
                            New logo selected (not saved yet):
                          </p>
                          <p className="text-xs text-blue-700">
                            {settingsForm.logo.name}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Hero Section */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                    Home Page - Hero Section
                  </h3>

                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Hero Title
                      </label>
                      <input
                        type="text"
                        value={settingsForm.heroTitle || ""}
                        onChange={(e) =>
                          setSettingsForm((prev) => ({
                            ...prev,
                            heroTitle: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Hero Highlight (colored text)
                      </label>
                      <input
                        type="text"
                        value={settingsForm.heroHighlight || ""}
                        onChange={(e) =>
                          setSettingsForm((prev) => ({
                            ...prev,
                            heroHighlight: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Hero Description
                      </label>
                      <textarea
                        value={settingsForm.heroDescription || ""}
                        onChange={(e) =>
                          setSettingsForm((prev) => ({
                            ...prev,
                            heroDescription: e.target.value,
                          }))
                        }
                        rows="3"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Home Page Stats */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Home Page - Stats Section
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        addToArray("stats", {
                          icon: "Users",
                          value: "",
                          label: "",
                        })
                      }
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Stat</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {settingsForm.stats?.map((stat, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <span className="text-sm font-medium text-gray-700">
                            Stat #{index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFromArray("stats", index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Icon
                            </label>
                            <select
                              value={stat.icon}
                              onChange={(e) =>
                                updateArrayItem("stats", index, {
                                  icon: e.target.value,
                                })
                              }
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            >
                              <option value="Users">Users</option>
                              <option value="BookOpen">BookOpen</option>
                              <option value="Award">Award</option>
                              <option value="TrendingUp">TrendingUp</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Value
                            </label>
                            <input
                              type="text"
                              value={stat.value}
                              onChange={(e) =>
                                updateArrayItem("stats", index, {
                                  value: e.target.value,
                                })
                              }
                              placeholder="e.g., 50K+"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Label
                            </label>
                            <input
                              type="text"
                              value={stat.label}
                              onChange={(e) =>
                                updateArrayItem("stats", index, {
                                  label: e.target.value,
                                })
                              }
                              placeholder="e.g., Active Students"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {settingsForm.stats && settingsForm.stats.length > 0 && (
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 uppercase flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Live Preview - Home Stats
                    </h4>
                    <div className="grid grid-cols-2 gap-6">
                      {settingsForm.stats.map((stat, idx) => {
                        const IconComponent = iconMap[stat.icon] || Users;
                        return (
                          <div key={idx} className="text-center">
                            <div className="w-12 h-12 bg-primary/30 rounded-xl mx-auto mb-4 flex items-center justify-center">
                              <IconComponent className="w-6 h-6 text-primary" />
                            </div>
                            <div className="text-3xl font-bold text-foreground">
                              {stat.value || "0"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {stat.label || "Label"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Chart Type Visual Guide */}
                <div className="md:col-span-3 bg-blue-50 dark:bg-blue-950 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Chart Type Guide
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div
                      className={`p-3 rounded-lg border-2 transition-all ${
                        settingsForm.chartConfig?.type === "pie"
                          ? "border-blue-500 bg-blue-100 dark:bg-blue-900"
                          : "border-gray-200 bg-white dark:bg-gray-800"
                      }`}
                    >
                      <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-2 rounded-full border-4 border-blue-500 border-t-transparent"></div>
                        <p className="text-xs font-medium">Pie Chart</p>
                      </div>
                    </div>

                    <div
                      className={`p-3 rounded-lg border-2 transition-all ${
                        settingsForm.chartConfig?.type === "bar"
                          ? "border-blue-500 bg-blue-100 dark:bg-blue-900"
                          : "border-gray-200 bg-white dark:bg-gray-800"
                      }`}
                    >
                      <div className="text-center">
                        <div className="flex items-end justify-center gap-1 h-12 mb-2">
                          <div className="w-2 h-4 bg-blue-500"></div>
                          <div className="w-2 h-8 bg-blue-500"></div>
                          <div className="w-2 h-6 bg-blue-500"></div>
                          <div className="w-2 h-10 bg-blue-500"></div>
                        </div>
                        <p className="text-xs font-medium">Bar Chart</p>
                      </div>
                    </div>

                    <div
                      className={`p-3 rounded-lg border-2 transition-all ${
                        settingsForm.chartConfig?.type === "line"
                          ? "border-blue-500 bg-blue-100 dark:bg-blue-900"
                          : "border-gray-200 bg-white dark:bg-gray-800"
                      }`}
                    >
                      <div className="text-center">
                        <div className="h-12 mb-2 flex items-center justify-center">
                          <svg width="48" height="24" viewBox="0 0 48 24">
                            <polyline
                              points="0,20 16,8 32,14 48,4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className="text-blue-500"
                            />
                          </svg>
                        </div>
                        <p className="text-xs font-medium">Line Chart</p>
                      </div>
                    </div>

                    <div
                      className={`p-3 rounded-lg border-2 transition-all ${
                        settingsForm.chartConfig?.type === "doughnut"
                          ? "border-blue-500 bg-blue-100 dark:bg-blue-900"
                          : "border-gray-200 bg-white dark:bg-gray-800"
                      }`}
                    >
                      <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-2 rounded-full border-8 border-blue-500 border-t-transparent"></div>
                        <p className="text-xs font-medium">Doughnut</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chart Configuration */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                    Home Page - Chart Configuration
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Chart Type Selector */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Chart Type
                      </label>
                      <select
                        value={settingsForm.chartConfig?.type || "pie"}
                        onChange={(e) =>
                          setSettingsForm((prev) => ({
                            ...prev,
                            chartConfig: {
                              ...prev.chartConfig,
                              type: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="pie">Pie Chart</option>
                        <option value="bar">Bar Chart</option>
                        <option value="line">Line Chart</option>
                        <option value="doughnut">Doughnut Chart</option>
                      </select>
                    </div>

                    {/* Chart Position Selector */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Chart Position
                      </label>
                      <select
                        value={settingsForm.chartConfig?.position || "right"}
                        onChange={(e) =>
                          setSettingsForm((prev) => ({
                            ...prev,
                            chartConfig: {
                              ...prev.chartConfig,
                              position: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                      </select>
                    </div>

                    {/* Chart Enable/Disable Toggle */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Show Chart
                      </label>
                      <div className="flex items-center h-full">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={
                              settingsForm.chartConfig?.enabled !== false
                            }
                            onChange={(e) =>
                              setSettingsForm((prev) => ({
                                ...prev,
                                chartConfig: {
                                  ...prev.chartConfig,
                                  enabled: e.target.checked,
                                },
                              }))
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          <span className="ml-3 text-sm font-medium text-gray-700">
                            {settingsForm.chartConfig?.enabled !== false
                              ? "Enabled"
                              : "Disabled"}
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chart Position Visual Guide */}
                <div className="md:col-span-3 bg-purple-50 dark:bg-purple-950 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4" />
                    Chart Position Preview
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                        settingsForm.chartConfig?.position === "left"
                          ? "border-purple-500 bg-purple-100 dark:bg-purple-900"
                          : "border-gray-200 bg-white dark:bg-gray-800"
                      }`}
                    >
                      <div className="flex gap-2">
                        <div className="w-1/2 h-16 bg-gradient-to-r from-purple-400 to-purple-600 rounded flex items-center justify-center text-white text-xs">
                          Chart
                        </div>
                        <div className="w-1/2 h-16 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-xs">
                          Stats
                        </div>
                      </div>
                      <p className="text-center text-xs font-medium mt-2">
                        Left Position
                      </p>
                    </div>

                    <div
                      className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                        settingsForm.chartConfig?.position === "right"
                          ? "border-purple-500 bg-purple-100 dark:bg-purple-900"
                          : "border-gray-200 bg-white dark:bg-gray-800"
                      }`}
                    >
                      <div className="flex gap-2">
                        <div className="w-1/2 h-16 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-xs">
                          Stats
                        </div>
                        <div className="w-1/2 h-16 bg-gradient-to-r from-purple-400 to-purple-600 rounded flex items-center justify-center text-white text-xs">
                          Chart
                        </div>
                      </div>
                      <p className="text-center text-xs font-medium mt-2">
                        Right Position
                      </p>
                    </div>
                  </div>
                </div>

                {/* Home Page Features */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Home Page - Features Section
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        addToArray("features", {
                          icon: "Brain",
                          title: "",
                          description: "",
                        })
                      }
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Feature</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Features Section Title
                      </label>
                      <input
                        type="text"
                        value={settingsForm.featuresTitle || ""}
                        onChange={(e) =>
                          setSettingsForm((prev) => ({
                            ...prev,
                            featuresTitle: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Features Section Description
                      </label>
                      <textarea
                        value={settingsForm.featuresDescription || ""}
                        onChange={(e) =>
                          setSettingsForm((prev) => ({
                            ...prev,
                            featuresDescription: e.target.value,
                          }))
                        }
                        rows="2"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {settingsForm.features?.map((feature, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <span className="text-sm font-medium text-gray-700">
                            Feature #{index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFromArray("features", index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Icon
                            </label>
                            <select
                              value={feature.icon}
                              onChange={(e) =>
                                updateArrayItem("features", index, {
                                  icon: e.target.value,
                                })
                              }
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            >
                              <option value="Brain">Brain</option>
                              <option value="Target">Target</option>
                              <option value="Trophy">Trophy</option>
                              <option value="Zap">Zap</option>
                              <option value="Lightbulb">Lightbulb</option>
                              <option value="Rocket">Rocket</option>
                              <option value="BookOpen">BookOpen</option>
                              <option value="TrendingUp">TrendingUp</option>
                              <option value="Shield">Shield</option>
                              <option value="Award">Award</option>
                              <option value="Users">Users</option>
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Title
                            </label>
                            <input
                              type="text"
                              value={feature.title}
                              onChange={(e) =>
                                updateArrayItem("features", index, {
                                  title: e.target.value,
                                })
                              }
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="md:col-span-3">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Description
                            </label>
                            <textarea
                              value={feature.description}
                              onChange={(e) =>
                                updateArrayItem("features", index, {
                                  description: e.target.value,
                                })
                              }
                              rows="2"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Preview - Features */}
                {settingsForm.features && settingsForm.features.length > 0 && (
                  <div className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-950 dark:to-teal-950 rounded-xl p-6 border border-green-200 dark:border-green-800">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 uppercase flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Live Preview - Features
                    </h4>
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        {settingsForm.featuresTitle || "Features Title"}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {settingsForm.featuresDescription ||
                          "Features description"}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {settingsForm.features.slice(0, 3).map((feature, idx) => {
                        const IconComponent = iconMap[feature.icon] || Brain;
                        return (
                          <div
                            key={idx}
                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-center"
                          >
                            <div className="w-12 h-12 bg-blue-500/15 rounded-xl mx-auto mb-3 flex items-center justify-center">
                              <IconComponent className="w-6 h-6 text-blue-600" />
                            </div>
                            <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-2">
                              {feature.title || "Feature Title"}
                            </h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {feature.description || "Description"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    {settingsForm.features.length > 3 && (
                      <p className="text-center text-xs text-gray-500 mt-3">
                        + {settingsForm.features.length - 3} more features
                      </p>
                    )}
                  </div>
                )}

                {/* CTA Section */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                    Home Page - CTA Section
                  </h3>

                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CTA Title
                      </label>
                      <input
                        type="text"
                        value={settingsForm.ctaTitle || ""}
                        onChange={(e) =>
                          setSettingsForm((prev) => ({
                            ...prev,
                            ctaTitle: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CTA Description
                      </label>
                      <textarea
                        value={settingsForm.ctaDescription || ""}
                        onChange={(e) =>
                          setSettingsForm((prev) => ({
                            ...prev,
                            ctaDescription: e.target.value,
                          }))
                        }
                        rows="3"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* About Page Values */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      About Page - Values Section
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        addToArray("aboutValues", {
                          icon: "Target",
                          title: "",
                          description: "",
                          color: "text-blue-500",
                          bgColor: "bg-blue-500/10",
                        })
                      }
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Value</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {settingsForm.aboutValues?.map((value, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <span className="text-sm font-medium text-gray-700">
                            Value #{index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              removeFromArray("aboutValues", index)
                            }
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Icon
                              </label>
                              <select
                                value={value.icon}
                                onChange={(e) =>
                                  updateArrayItem("aboutValues", index, {
                                    icon: e.target.value,
                                  })
                                }
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer"
                              >
                                <option value="Target">Target</option>
                                <option value="Heart">Heart</option>
                                <option value="Users">Users</option>
                                <option value="Award">Award</option>
                                <option value="Shield">Shield</option>
                                <option value="Zap">Zap</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Color
                              </label>
                              <div className="relative">
                                <select
                                  value={value.color}
                                  onChange={(e) =>
                                    updateArrayItem("aboutValues", index, {
                                      color: e.target.value,
                                    })
                                  }
                                  className="w-full px-4 py-2 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none"
                                >
                                  <option value="text-blue-500">Blue</option>
                                  <option value="text-red-500">Red</option>
                                  <option value="text-green-500">Green</option>
                                  <option value="text-yellow-500">
                                    Yellow
                                  </option>
                                  <option value="text-purple-500">
                                    Purple
                                  </option>
                                  <option value="text-pink-500">Pink</option>
                                </select>
                                {/* Color Preview Dot */}
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                  <div
                                    className={`w-6 h-6 rounded-full ${value.color.replace(
                                      "text-",
                                      "bg-"
                                    )}`}
                                  ></div>
                                </div>
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Background
                              </label>
                              <div className="relative">
                                <select
                                  value={value.bgColor}
                                  onChange={(e) =>
                                    updateArrayItem("aboutValues", index, {
                                      bgColor: e.target.value,
                                    })
                                  }
                                  className="w-full px-4 py-2 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none"
                                >
                                  <option value="bg-blue-500/10">Blue</option>
                                  <option value="bg-red-500/10">Red</option>
                                  <option value="bg-green-500/10">Green</option>
                                  <option value="bg-yellow-500/10">
                                    Yellow
                                  </option>
                                  <option value="bg-purple-500/10">
                                    Purple
                                  </option>
                                  <option value="bg-pink-500/10">Pink</option>
                                </select>
                                {/* Background Preview Box */}
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                  <div
                                    className={`w-6 h-6 rounded border border-gray-300 ${value.bgColor}`}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Title
                            </label>
                            <input
                              type="text"
                              value={value.title}
                              onChange={(e) =>
                                updateArrayItem("aboutValues", index, {
                                  title: e.target.value,
                                })
                              }
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Description
                            </label>
                            <textarea
                              value={value.description}
                              onChange={(e) =>
                                updateArrayItem("aboutValues", index, {
                                  description: e.target.value,
                                })
                              }
                              rows="3"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Preview for About Values */}
                {settingsForm.aboutValues &&
                  settingsForm.aboutValues.length > 0 && (
                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 uppercase flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Live Preview - About Values
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {settingsForm.aboutValues.map((value, idx) => {
                          const IconComponent = iconMap[value.icon] || Target;
                          return (
                            <div
                              key={idx}
                              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm"
                            >
                              <div
                                className={`w-14 h-14 ${value.bgColor} rounded-xl flex items-center justify-center mb-4`}
                              >
                                <IconComponent
                                  className={`w-7 h-7 ${value.color}`}
                                />
                              </div>
                              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                                {value.title || "Title"}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {value.description ||
                                  "Description will appear here"}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {/* About Page Features */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      About Page - Features Section
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        addToArray("aboutFeatures", {
                          icon: "BookOpen",
                          title: "",
                          description: "",
                        })
                      }
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Feature</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {settingsForm.aboutFeatures?.map((feature, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <span className="text-sm font-medium text-gray-700">
                            Feature #{index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              removeFromArray("aboutFeatures", index)
                            }
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Icon
                            </label>
                            <select
                              value={feature.icon}
                              onChange={(e) =>
                                updateArrayItem("aboutFeatures", index, {
                                  icon: e.target.value,
                                })
                              }
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            >
                              <option value="BookOpen">BookOpen</option>
                              <option value="Zap">Zap</option>
                              <option value="TrendingUp">TrendingUp</option>
                              <option value="Shield">Shield</option>
                              <option value="Award">Award</option>
                              <option value="Users">Users</option>
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Title
                            </label>
                            <input
                              type="text"
                              value={feature.title}
                              onChange={(e) =>
                                updateArrayItem("aboutFeatures", index, {
                                  title: e.target.value,
                                })
                              }
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="md:col-span-3">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Description
                            </label>
                            <textarea
                              value={feature.description}
                              onChange={(e) =>
                                updateArrayItem("aboutFeatures", index, {
                                  description: e.target.value,
                                })
                              }
                              rows="2"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {settingsForm.aboutFeatures &&
                  settingsForm.aboutFeatures.length > 0 && (
                    <AboutFeaturesPreview data={settingsForm.aboutFeatures} />
                  )}

                {/* About Page Stats */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      About Page - Stats Section
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        addToArray("aboutStats", { value: "", label: "" })
                      }
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Stat</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {settingsForm.aboutStats?.map((stat, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <span className="text-sm font-medium text-gray-700">
                            Stat #{index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFromArray("aboutStats", index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Value
                            </label>
                            <input
                              type="text"
                              value={stat.value}
                              onChange={(e) =>
                                updateArrayItem("aboutStats", index, {
                                  value: e.target.value,
                                })
                              }
                              placeholder="e.g., 50,000+"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Label
                            </label>
                            <input
                              type="text"
                              value={stat.label}
                              onChange={(e) =>
                                updateArrayItem("aboutStats", index, {
                                  label: e.target.value,
                                })
                              }
                              placeholder="e.g., Active Learners"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {settingsForm.aboutStats &&
                  settingsForm.aboutStats.length > 0 && (
                    <AboutStatsPreview data={settingsForm.aboutStats} />
                  )}

                <div className="flex justify-end pt-6 border-t">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-5 h-5" />
                    <span>{loading ? "Saving..." : "Save All Settings"}</span>
                  </button>
                </div>
              </form>
            )}

            {/* FAQs Tab */}
            {activeTab === "faqs" && (
              <div className="space-y-6">
                <form
                  onSubmit={handleFAQSubmit}
                  className="bg-gray-50 p-6 rounded-lg space-y-4"
                >
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingFAQ ? "Edit FAQ" : "Add New FAQ"}
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Question
                    </label>
                    <input
                      type="text"
                      value={faqForm.question}
                      onChange={(e) =>
                        setFaqForm((prev) => ({
                          ...prev,
                          question: e.target.value,
                        }))
                      }
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Answer
                    </label>
                    <textarea
                      value={faqForm.answer}
                      onChange={(e) =>
                        setFaqForm((prev) => ({
                          ...prev,
                          answer: e.target.value,
                        }))
                      }
                      required
                      rows="4"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* ← ADD THIS ENTIRE SECTION */}
                  <div className="flex justify-end gap-3 pt-4">
                    {editingFAQ && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingFAQ(null);
                          setFaqForm({ question: "", answer: "", order: 0 });
                        }}
                        className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer transition-colors"
                    >
                      <Save className="w-5 h-5" />
                      <span>
                        {loading
                          ? "Saving..."
                          : editingFAQ
                          ? "Update FAQ"
                          : "Add FAQ"}
                      </span>
                    </button>
                  </div>
                </form>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      All FAQs ({faqs.length})
                    </h3>
                    <p className="text-sm text-gray-500">
                      Drag to reorder • Changes save automatically
                    </p>
                  </div>

                  {/* REPLACE the entire DragDropContext section with this: */}
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleFAQDragEnd}
                  >
                    <SortableContext
                      items={faqs.map((faq) => faq._id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {faqs.map((faq, index) => (
                          <SortableFAQItem
                            key={faq._id}
                            faq={faq}
                            index={index}
                            handleEditFAQ={handleEditFAQ}
                            handleDeleteFAQ={handleDeleteFAQ}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>

                {faqs && faqs.length > 0 && (
                  <div className="mt-8">
                    <FAQsPreview data={faqs} />
                  </div>
                )}
              </div>
            )}

            {/* Contact Info Tab */}
            {activeTab === "contact" && (
              <form onSubmit={handleContactSubmit} className="space-y-8">
                {/* Email Section - Simplified */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Support Email
                    <span className="text-red-500 ml-1">*</span>
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    This email will be used for all customer support inquiries
                  </p>
                  <input
                    type="email"
                    value={contactForm.email?.support || ""}
                    onChange={(e) =>
                      setContactForm((prev) => ({
                        ...prev,
                        email: {
                          support: e.target.value,
                        },
                      }))
                    }
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="support@example.com"
                  />
                </div>
                {/* Telegram Section - Simplified */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Support Telegram
                    <span className="text-red-500 ml-1">*</span>
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Your Telegram username for customer support (include @
                    symbol)
                  </p>
                  <input
                    type="text"
                    value={contactForm.telegram?.support || ""}
                    onChange={(e) =>
                      setContactForm((prev) => ({
                        ...prev,
                        telegram: {
                          support: e.target.value,
                        },
                      }))
                    }
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="@yourusername"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Example: @testmasterpro_support
                  </p>
                </div>

                {/* Social Media Section */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Social Media Links
                    </h3>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          addSocialMedia(e.target.value);
                          e.target.value = "";
                        }
                      }}
                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm cursor-pointer"
                    >
                      <option value="">Add Platform</option>
                      {socialPlatforms.map((platform) => {
                        const exists =
                          contactForm.socialMedia?.[platform.name] !==
                          undefined;
                        return (
                          <option
                            key={platform.name}
                            value={platform.name}
                            disabled={exists}
                          >
                            {platform.label} {exists ? "(Added)" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="space-y-4">
                    {contactForm.socialMedia &&
                      Object.entries(contactForm.socialMedia).map(
                        ([key, value]) => {
                          const platform = socialPlatforms.find(
                            (p) => p.name === key
                          );
                          if (!platform) return null;

                          const Icon = platform.icon;

                          return (
                            <div key={key} className="flex gap-3 items-start">
                              <div className="flex-1">
                                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                  <Icon className="w-4 h-4" />
                                  {platform.label}
                                </label>
                                <input
                                  type="url"
                                  value={value || ""}
                                  onChange={(e) =>
                                    setContactForm((prev) => ({
                                      ...prev,
                                      socialMedia: {
                                        ...prev.socialMedia,
                                        [key]: e.target.value,
                                      },
                                    }))
                                  }
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder={`https://${key}.com/yourprofile`}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeSocialMedia(key)}
                                className="mt-8 p-2 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                                title="Remove platform"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          );
                        }
                      )}

                    {(!contactForm.socialMedia ||
                      Object.keys(contactForm.socialMedia).length === 0) && (
                      <p className="text-gray-500 text-sm text-center py-4">
                        No social media links added. Use the dropdown above to
                        add platforms.
                      </p>
                    )}
                  </div>
                </div>

                {/* Address Section */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Address (Optional)
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Add your physical address if applicable. All fields are
                    optional.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Street Address
                      </label>
                      <input
                        type="text"
                        value={contactForm.address?.street || ""}
                        onChange={(e) =>
                          setContactForm((prev) => ({
                            ...prev,
                            address: {
                              ...prev.address,
                              street: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="123 Main Street (optional)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        value={contactForm.address?.city || ""}
                        onChange={(e) =>
                          setContactForm((prev) => ({
                            ...prev,
                            address: {
                              ...prev.address,
                              city: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="New York (optional)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State/Province
                      </label>
                      <input
                        type="text"
                        value={contactForm.address?.state || ""}
                        onChange={(e) =>
                          setContactForm((prev) => ({
                            ...prev,
                            address: {
                              ...prev.address,
                              state: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="NY (optional)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ZIP/Postal Code
                      </label>
                      <input
                        type="text"
                        value={contactForm.address?.zipCode || ""}
                        onChange={(e) =>
                          setContactForm((prev) => ({
                            ...prev,
                            address: {
                              ...prev.address,
                              zipCode: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="10001 (optional)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Country
                      </label>
                      <input
                        type="text"
                        value={contactForm.address?.country || ""}
                        onChange={(e) =>
                          setContactForm((prev) => ({
                            ...prev,
                            address: {
                              ...prev.address,
                              country: e.target.value,
                            },
                          }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="United States (optional)"
                      />
                    </div>
                  </div>
                </div>

                {/* Business Hours */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Business Hours
                  </h3>
                  <input
                    type="text"
                    value={contactForm.businessHours || ""}
                    onChange={(e) =>
                      setContactForm((prev) => ({
                        ...prev,
                        businessHours: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Monday - Friday: 9AM - 6PM"
                  />
                </div>

                {/* Footer Content */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Footer Content
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Footer Description
                      </label>
                      <textarea
                        value={contactForm.footerDescription || ""}
                        onChange={(e) =>
                          setContactForm((prev) => ({
                            ...prev,
                            footerDescription: e.target.value,
                          }))
                        }
                        rows="3"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Brief description about your platform..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Copyright Text
                        <span className="text-xs text-gray-500 ml-2">
                          (Use {"{year}"} for current year)
                        </span>
                      </label>
                      <input
                        type="text"
                        value={contactForm.copyrightText || ""}
                        onChange={(e) =>
                          setContactForm((prev) => ({
                            ...prev,
                            copyrightText: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="© {year} TestMaster Pro. All rights reserved."
                      />
                    </div>
                  </div>

                  {/* Quick Links Section - ADD THIS ENTIRE BLOCK */}
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Footer Quick Links
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setContactForm((prev) => ({
                            ...prev,
                            quickLinks: [
                              ...(prev.quickLinks || []),
                              {
                                name: "",
                                href: "",
                                order: prev.quickLinks?.length || 0,
                              },
                            ],
                          }));
                        }}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Link</span>
                      </button>
                    </div>

                    <div className="space-y-4">
                      {contactForm.quickLinks &&
                      contactForm.quickLinks.length > 0 ? (
                        contactForm.quickLinks
                          .sort((a, b) => a.order - b.order)
                          .map((link, index) => (
                            <div
                              key={index}
                              className="flex gap-3 items-start bg-white p-4 rounded-lg border border-gray-200"
                            >
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Link Name
                                  </label>
                                  <input
                                    type="text"
                                    value={link.name || ""}
                                    onChange={(e) => {
                                      const newQuickLinks = [
                                        ...contactForm.quickLinks,
                                      ];
                                      newQuickLinks[index].name =
                                        e.target.value;
                                      setContactForm((prev) => ({
                                        ...prev,
                                        quickLinks: newQuickLinks,
                                      }));
                                    }}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., About Us"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Link URL
                                  </label>
                                  <input
                                    type="text"
                                    value={link.href || ""}
                                    onChange={(e) => {
                                      const newQuickLinks = [
                                        ...contactForm.quickLinks,
                                      ];
                                      newQuickLinks[index].href =
                                        e.target.value;
                                      setContactForm((prev) => ({
                                        ...prev,
                                        quickLinks: newQuickLinks,
                                      }));
                                    }}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g., /about"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2 mt-8">
                                {/* Move Up */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (index === 0) return;
                                    const newQuickLinks = [
                                      ...contactForm.quickLinks,
                                    ];
                                    [
                                      newQuickLinks[index - 1],
                                      newQuickLinks[index],
                                    ] = [
                                      newQuickLinks[index],
                                      newQuickLinks[index - 1],
                                    ];
                                    // Update order values
                                    newQuickLinks.forEach((link, i) => {
                                      link.order = i;
                                    });
                                    setContactForm((prev) => ({
                                      ...prev,
                                      quickLinks: newQuickLinks,
                                    }));
                                  }}
                                  disabled={index === 0}
                                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                                  title="Move up"
                                >
                                  <ChevronUp className="w-5 h-5" />
                                </button>
                                {/* Move Down */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (
                                      index ===
                                      contactForm.quickLinks.length - 1
                                    )
                                      return;
                                    const newQuickLinks = [
                                      ...contactForm.quickLinks,
                                    ];
                                    [
                                      newQuickLinks[index],
                                      newQuickLinks[index + 1],
                                    ] = [
                                      newQuickLinks[index + 1],
                                      newQuickLinks[index],
                                    ];
                                    // Update order values
                                    newQuickLinks.forEach((link, i) => {
                                      link.order = i;
                                    });
                                    setContactForm((prev) => ({
                                      ...prev,
                                      quickLinks: newQuickLinks,
                                    }));
                                  }}
                                  disabled={
                                    index === contactForm.quickLinks.length - 1
                                  }
                                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                                  title="Move down"
                                >
                                  <ChevronDown className="w-5 h-5" />
                                </button>
                                {/* Delete */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newQuickLinks =
                                      contactForm.quickLinks.filter(
                                        (_, i) => i !== index
                                      );
                                    // Update order values
                                    newQuickLinks.forEach((link, i) => {
                                      link.order = i;
                                    });
                                    setContactForm((prev) => ({
                                      ...prev,
                                      quickLinks: newQuickLinks,
                                    }));
                                  }}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                                  title="Remove link"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          ))
                      ) : (
                        <p className="text-gray-500 text-sm text-center py-4">
                          No quick links added. Click "Add Link" to create
                          footer navigation.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-5 h-5" />
                    <span>{loading ? "Saving..." : "Save Contact Info"}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Legal Pages Tab */}
            {activeTab === "legal" && (
              <div className="space-y-6">
                {/* Page Type Selector */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Select Legal Page to Edit
                  </h3>
                  <select
                    value={legalForm.type}
                    onChange={(e) => {
                      const selectedType = e.target.value;
                      const selectedPage = legalPages[selectedType];
                      setLegalForm({
                        type: selectedType,
                        title: selectedPage?.title || "",
                        sections: selectedPage?.sections || [],
                        metadata: selectedPage?.metadata || {
                          effectiveDate: null,
                          lastReviewedDate: null,
                        },
                      });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="privacy">Privacy Policy</option>
                    <option value="terms">Terms of Service</option>
                  </select>
                </div>

                {/* Old Content Warning */}
                {legalForm.content &&
                  (!legalForm.sections || legalForm.sections.length === 0) && (
                    <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <Info className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-yellow-900 mb-2">
                            Legacy Content Detected
                          </h4>
                          <p className="text-sm text-yellow-800 mb-4">
                            This page uses the old markdown format. The new
                            structure uses sections and subheaders for better
                            organization.
                          </p>

                          {/* Show Old Content */}
                          <div className="bg-white rounded-lg p-4 mb-4 border border-yellow-300 max-h-64 overflow-y-auto">
                            <p className="text-xs font-semibold text-gray-700 mb-2">
                              Current Content:
                            </p>
                            <pre className="whitespace-pre-wrap text-xs text-gray-600 font-mono">
                              {legalForm.content}
                            </pre>
                          </div>

                          {/* Migration Options */}
                          <div className="flex gap-3">
                            <button
                              type="button"
onClick={() => {
  showConfirmModal(
    "Clear Old Content",
    "This will clear the old content and start fresh with the new section-based structure. Continue?",
    () => {
      setLegalForm((prev) => ({
        ...prev,
        content: "",
        sections: [
          {
            id: `section-${Date.now()}`,
            header: "1. Introduction",
            subheaders: [],
            order: 0,
          },
        ],
      }));
    },
    "warning"
  );
}}
                              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 cursor-pointer text-sm font-medium"
                            >
                              Start Fresh (Clear Old Content)
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                // Just clear old content, keep empty sections
                                setLegalForm((prev) => ({
                                  ...prev,
                                  content: "",
                                }));
                              }}
                              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 cursor-pointer text-sm font-medium"
                            >
                              Remove Old Content Only
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Template Hints */}
                {templateHints && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Structure Guide
                    </h4>
                    <pre className="text-xs text-blue-800 whitespace-pre-wrap font-mono">
                      {templateHints}
                    </pre>
                  </div>
                )}

                {/* Page Title */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Page Title
                  </label>
                  <input
                    type="text"
                    value={legalForm.title}
                    onChange={(e) =>
                      setLegalForm((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Privacy Policy"
                  />
                </div>

                {/* Metadata Section */}
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Policy Metadata
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Effective Date
                      </label>
                      <input
                        type="date"
                        value={
                          legalForm.metadata?.effectiveDate
                            ? new Date(legalForm.metadata.effectiveDate)
                                .toISOString()
                                .split("T")[0]
                            : ""
                        }
                        onChange={(e) =>
                          setLegalForm((prev) => ({
                            ...prev,
                            metadata: {
                              ...prev.metadata,
                              effectiveDate: e.target.value
                                ? new Date(e.target.value).toISOString()
                                : null,
                            },
                          }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        When this policy becomes active
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Reviewed Date
                      </label>
                      <input
                        type="date"
                        value={
                          legalForm.metadata?.lastReviewedDate
                            ? new Date(legalForm.metadata.lastReviewedDate)
                                .toISOString()
                                .split("T")[0]
                            : ""
                        }
                        onChange={(e) =>
                          setLegalForm((prev) => ({
                            ...prev,
                            metadata: {
                              ...prev.metadata,
                              lastReviewedDate: e.target.value
                                ? new Date(e.target.value).toISOString()
                                : null,
                            },
                          }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        When this policy was last reviewed
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sections Management */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Sections ({legalForm.sections?.length || 0})
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        const newSection = {
                          id: `section-${Date.now()}`,
                          header: "",
                          subheaders: [],
                          order: legalForm.sections?.length || 0,
                        };
                        setLegalForm((prev) => ({
                          ...prev,
                          sections: [...(prev.sections || []), newSection],
                        }));
                      }}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Section</span>
                    </button>
                  </div>

                  {/* Drag and Drop Sections */}
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleSectionDragEnd}
                  >
                    <SortableContext
                      items={(legalForm.sections || []).map((s) => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-4">
                        {legalForm.sections?.map((section, sectionIndex) => (
                          <SortableLegalSection
                            key={section.id}
                            section={section}
                            sectionIndex={sectionIndex}
                            legalForm={legalForm}
                            setLegalForm={setLegalForm}
                            sensors={sensors}
                            showConfirmModal={showConfirmModal}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>

                {/* Save and Delete Buttons */}
                <div className="flex justify-between items-center pt-6 border-t">
                  {/* Delete Old Content Button (only show if old content exists) */}
                  {legalForm.content && (
                    <button
                      type="button"
onClick={() => {
  showConfirmModal(
    "Clear All Content",
    `Are you sure you want to completely delete this ${legalForm.type} page? This action cannot be undone.`,
    async () => {
      try {
        setLoading(true);
        await updateLegalPage(legalForm.type, {
          ...legalForm,
          content: "",
          sections: [],
          title:
            legalForm.type === "privacy"
              ? "Privacy Policy"
              : "Terms of Service",
        });

        setLegalForm({
          type: legalForm.type,
          title:
            legalForm.type === "privacy"
              ? "Privacy Policy"
              : "Terms of Service",
          sections: [],
          content: "",
          metadata: {
            effectiveDate: null,
            lastReviewedDate: null,
          },
        });

        toast.success("Legal page cleared successfully");
      } catch (error) {
        toast.error("Failed to clear legal page");
      } finally {
        setLoading(false);
      }
    },
    "danger"
  );
}}
                      disabled={loading}
                      className="flex items-center space-x-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                    >
                      <Trash2 className="w-5 h-5" />
                      <span>Clear All Content</span>
                    </button>
                  )}

                  {/* Save Button */}
                  <button
                    onClick={handleLegalSubmit}
                    disabled={loading}
                    className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-5 h-5" />
                    <span>{loading ? "Saving..." : "Save Legal Page"}</span>
                  </button>
                </div>

                {/* Live Preview */}
                {legalForm.sections && legalForm.sections.length > 0 && (
                  <LegalPagePreview
                    title={legalForm.title}
                    sections={legalForm.sections}
                    metadata={legalForm.metadata}
                  />
                )}
              </div>
            )}

            {/* Preview Tab */}
            {/* Preview Tab */}
            {activeTab === "preview" && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Preview Your Changes
                  </h3>
                  <p className="text-gray-600 mb-6">
                    See how your content will look on the live site before
                    publishing
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <button
                      onClick={() => handleLoadPreview("home")}
                      className="flex flex-col items-center justify-center gap-3 px-4 py-6 bg-white border-2 border-blue-300 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      <Home className="w-8 h-8 text-blue-600" />
                      <span className="font-semibold text-gray-900 text-sm">
                        Home Page
                      </span>
                    </button>

                    <button
                      onClick={() => handleLoadPreview("about")}
                      className="flex flex-col items-center justify-center gap-3 px-4 py-6 bg-white border-2 border-purple-300 rounded-lg hover:bg-purple-50 transition-colors cursor-pointer"
                    >
                      <Info className="w-8 h-8 text-purple-600" />
                      <span className="font-semibold text-gray-900 text-sm">
                        About Page
                      </span>
                    </button>

                    <button
                      onClick={() => handleLoadPreview("footer")}
                      className="flex flex-col items-center justify-center gap-3 px-4 py-6 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <PanelBottom className="w-8 h-8 text-gray-600" />
                      <span className="font-semibold text-gray-900 text-sm">
                        Footer
                      </span>
                    </button>

                    <button
                      onClick={() => handleLoadPreview("contact")}
                      className="flex flex-col items-center justify-center gap-3 px-4 py-6 bg-white border-2 border-green-300 rounded-lg hover:bg-green-50 transition-colors cursor-pointer"
                    >
                      <Phone className="w-8 h-8 text-green-600" />
                      <span className="font-semibold text-gray-900 text-sm">
                        Contact Page
                      </span>
                    </button>

                    <button
                      onClick={() => handleLoadPreview("privacy")}
                      className="flex flex-col items-center justify-center gap-3 px-4 py-6 bg-white border-2 border-yellow-300 rounded-lg hover:bg-yellow-50 transition-colors cursor-pointer"
                    >
                      <Shield className="w-8 h-8 text-yellow-600" />
                      <span className="font-semibold text-gray-900 text-sm">
                        Privacy Policy
                      </span>
                    </button>

                    <button
                      onClick={() => handleLoadPreview("terms")}
                      className="flex flex-col items-center justify-center gap-3 px-4 py-6 bg-white border-2 border-red-300 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Scale className="w-8 h-8 text-red-600" />
                      <span className="font-semibold text-gray-900 text-sm">
                        Terms of Service
                      </span>
                    </button>
                  </div>
                </div>

                {showPreview && previewData && (
                  <div className="mt-8">
                    {previewType === "home" && (
                      <HomePreview data={previewData} />
                    )}
                    {previewType === "about" && (
                      <AboutPreview data={previewData} />
                    )}
                    {previewType === "contact" && (
                      <ContactPreview data={previewData} />
                    )}
                    {previewType === "footer" && (
                      <FooterPreview data={previewData} />
                    )}
                    {previewType === "privacy" && (
                      <LegalPagePreview
                        title={previewData.title}
                        sections={previewData.sections}
                        metadata={previewData.metadata}
                        content={previewData.content}
                      />
                    )}
                    {previewType === "terms" && (
                      <LegalPagePreview
                        title={previewData.title}
                        sections={previewData.sections}
                        metadata={previewData.metadata}
                        content={previewData.content}
                      />
                    )}
                  </div>
                )}

                {showPreview && !previewData && (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
          <ConfirmModal
      isOpen={confirmModal.isOpen}
      onClose={closeConfirmModal}
      onConfirm={confirmModal.onConfirm}
      title={confirmModal.title}
      message={confirmModal.message}
      type={confirmModal.type}
    />
    </div>
  );
};

export default ContentManagement;
