import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAdmin } from "../contexts/AdminContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  BookOpen,
  Search,
  Filter,
  Edit2,
  Edit,
  Trash2,
  Eye,
  Plus,
  ChevronDown,
  ChevronRight,
  Clock,
  Target,
  Play,
  Tag,
  Image as ImageIcon,
  Calendar,
  BarChart3,
  Loader2,
  AlertCircle,
  RefreshCw,
  Settings,
  TrendingUp,
  X,
  CheckSquare,
  Square,
} from "lucide-react";

import RichTextRenderer from "../components/plugins/RichTextRenderer";

// Coupon Form Component with debounce
const CouponForm = ({ courseId, onSuccess, onCancel }) => {
  const { createCoupon, fetchCourseCoupons } = useAdmin();
  const [formData, setFormData] = useState({
    code: "",
    discount: "5",
    maxUsage: "",
    validUntil: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [existingCoupons, setExistingCoupons] = useState([]);

  const discountOptions = [2, 5, 10, 15, 20];

  // Load existing coupons for duplicate check
  useEffect(() => {
    const loadCoupons = async () => {
      const result = await fetchCourseCoupons(courseId);
      if (result.success) {
        setExistingCoupons(result.data);
      }
    };
    loadCoupons();
  }, [courseId]);

  // Debounced duplicate check
  const checkDuplicateCoupon = useCallback(
    (code) => {
      if (!code || code.length < 4) return;

      setCheckingDuplicate(true);

      const isDuplicate = existingCoupons.some(
        (c) => c.code.toUpperCase() === code.toUpperCase()
      );

      if (isDuplicate) {
        setErrors((prev) => ({
          ...prev,
          code: "This coupon code already exists for this course",
        }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.code;
          return newErrors;
        });
      }

      setCheckingDuplicate(false);
    },
    [existingCoupons]
  );

  const debouncedDuplicateCheck = useCallback(
    (() => {
      let timeoutId = null;
      return (code) => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          checkDuplicateCoupon(code);
        }, 500);
      };
    })(),
    [checkDuplicateCoupon]
  );

  const validateForm = () => {
    const newErrors = {};

    if (!formData.code.trim()) {
      newErrors.code = "Coupon code is required";
    } else if (formData.code.length < 4) {
      newErrors.code = "Code must be at least 4 characters";
    } else if (!/^[A-Z0-9]+$/.test(formData.code)) {
      newErrors.code = "Code must contain only uppercase letters and numbers";
    }

    if (formData.maxUsage && formData.maxUsage < 1) {
      newErrors.maxUsage = "Max usage must be at least 1";
    }

    if (formData.validUntil) {
      const selectedDate = new Date(formData.validUntil);
      if (selectedDate < new Date()) {
        newErrors.validUntil = "Expiry date must be in the future";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);

    const couponData = {
      code: formData.code.toUpperCase(),
      type: "course",
      course: courseId,
      discount: parseInt(formData.discount),
      maxUsage: formData.maxUsage ? parseInt(formData.maxUsage) : null,
      validUntil: formData.validUntil || null,
    };

    const result = await createCoupon(couponData);

    if (result.success) {
      onSuccess();
    }

    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Coupon Code *
        </label>
        <input
          type="text"
          value={formData.code}
          onChange={(e) => {
            const value = e.target.value
              .toUpperCase()
              .replace(/[^A-Z0-9]/g, "");
            setFormData({ ...formData, code: value });
            debouncedDuplicateCheck(value); // ADD DEBOUNCED CHECK
            if (errors.code) {
              setErrors({ ...errors, code: "" });
            }
          }}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono ${
            errors.code ? "border-red-500" : "border-gray-300"
          }`}
          placeholder="e.g., SAVE20"
          maxLength={20}
        />
        {/* ADD CHECKING INDICATOR */}
        {checkingDuplicate && (
          <p className="text-blue-500 text-xs mt-1 flex items-center">
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
            Checking availability...
          </p>
        )}
        {errors.code && (
          <p className="text-red-500 text-xs mt-1">{errors.code}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          4-20 characters, uppercase letters and numbers only
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Discount *
        </label>
        <select
          value={formData.discount}
          onChange={(e) =>
            setFormData({ ...formData, discount: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {discountOptions.map((option) => (
            <option key={option} value={option}>
              {option}% OFF
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Max Usage (Optional)
        </label>
        <input
          type="number"
          value={formData.maxUsage}
          onChange={(e) => {
            setFormData({ ...formData, maxUsage: e.target.value });
            if (errors.maxUsage) {
              setErrors({ ...errors, maxUsage: "" });
            }
          }}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.maxUsage ? "border-red-500" : "border-gray-300"
          }`}
          placeholder="Leave empty for unlimited"
          min="1"
        />
        {errors.maxUsage && (
          <p className="text-red-500 text-xs mt-1">{errors.maxUsage}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Valid Until (Optional)
        </label>
        <input
          type="date"
          value={formData.validUntil}
          onChange={(e) => {
            setFormData({ ...formData, validUntil: e.target.value });
            if (errors.validUntil) {
              setErrors({ ...errors, validUntil: "" });
            }
          }}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.validUntil ? "border-red-500" : "border-gray-300"
          }`}
          min={new Date().toISOString().split("T")[0]}
        />
        {errors.validUntil && (
          <p className="text-red-500 text-xs mt-1">{errors.validUntil}</p>
        )}
      </div>

      <div className="flex space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || checkingDuplicate || !!errors.code}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {submitting ? "Creating..." : "Create Coupon"}
        </button>
      </div>
    </form>
  );
};

const CourseCoupons = ({ courseId }) => {
  const { fetchCourseCoupons, updateCouponStatus, deleteCoupon } = useAdmin();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCourseCoupons();
  }, [courseId]);

  const loadCourseCoupons = async () => {
    setLoading(true);
    const result = await fetchCourseCoupons(courseId);
    if (result.success) {
      setCoupons(result.data);
    }
    setLoading(false);
  };

  const handleToggleCouponStatus = async (couponId, currentStatus) => {
    const result = await updateCouponStatus(couponId, !currentStatus);
    if (result.success) {
      await loadCourseCoupons();
    }
  };

  const handleDeleteCoupon = async (couponId) => {
    if (window.confirm("Are you sure you want to delete this coupon?")) {
      const result = await deleteCoupon(couponId);
      if (result.success) {
        await loadCourseCoupons();
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (coupons.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg">
        <Tag className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600 text-sm">
          No coupons created for this course yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {coupons.map((coupon) => (
        <div
          key={coupon._id}
          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
        >
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <code className="px-3 py-1 bg-purple-100 text-purple-700 rounded font-mono text-sm font-bold">
                {coupon.code}
              </code>
              <span className="text-green-600 font-semibold">
                {coupon.discount}% OFF
              </span>
              <span
                className={`px-2 py-1 rounded-full text-xs ${
                  coupon.isActive
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {coupon.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span>Used: {coupon.usageCount} times</span>
              {coupon.maxUsage && <span>Max: {coupon.maxUsage} uses</span>}
              <span>
                Created: {new Date(coupon.createdAt).toLocaleDateString()}
              </span>
              {coupon.validUntil && (
                <span>
                  Expires: {new Date(coupon.validUntil).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() =>
                handleToggleCouponStatus(coupon._id, coupon.isActive)
              }
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                coupon.isActive
                  ? "text-green-600 hover:bg-green-50"
                  : "text-gray-400 hover:bg-gray-50"
              }`}
              title={coupon.isActive ? "Deactivate" : "Activate"}
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDeleteCoupon(coupon._id)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              title="Delete Coupon"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Video Player Modal Component
const VideoPlayerModal = ({ video, onClose }) => {
  if (!video) return null;

  const getEmbedUrl = (url, platform) => {
    try {
      const urlObj = new URL(url);

      if (
        platform === "YouTube" ||
        url.includes("youtube.com") ||
        url.includes("youtu.be")
      ) {
        let videoId;
        if (url.includes("youtu.be/")) {
          videoId = urlObj.pathname.slice(1);
        } else if (url.includes("youtube.com")) {
          videoId = urlObj.searchParams.get("v");
        }
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1`;
      } else if (platform === "Vimeo" || url.includes("vimeo.com")) {
        const videoId = urlObj.pathname.split("/").pop();
        return `https://player.vimeo.com/video/${videoId}?autoplay=1`;
      } else if (
        platform === "Dailymotion" ||
        url.includes("dailymotion.com")
      ) {
        const videoId = urlObj.pathname.split("/").pop();
        return `https://www.dailymotion.com/embed/video/${videoId}?autoplay=1`;
      } else if (platform === "Wistia" || url.includes("wistia.com")) {
        const videoId = urlObj.pathname.split("/").pop();
        return `https://fast.wistia.net/embed/iframe/${videoId}?autoplay=1`;
      }

      return url;
    } catch (error) {
      console.error("Error parsing video URL:", error);
      return url;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-gray-50">
          <div className="truncate">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
              {video.title || "Video Player"}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 truncate">
              {video.platform || detectPlatform(video.url)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Video Player */}
        <div className="relative bg-black flex-1 w-full">
          <div
            className="relative w-full h-0"
            style={{ paddingBottom: "56.25%" }}
          >
            <iframe
              src={getEmbedUrl(video.url, video.platform)}
              className="absolute top-0 left-0 w-full h-full rounded-none sm:rounded-b-xl"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              playsInline
              title={video.title || "Video"}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 text-sm flex items-center space-x-1 cursor-pointer"
            >
              <span>Open in new tab</span>
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors cursor-pointer w-full sm:w-auto"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Generic Confirmation Modal
const ConfirmationModal = ({ modal, onClose }) => {
  if (!modal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-3 sm:p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-5 sm:p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div
              className={`p-3 rounded-full ${
                modal.type === "removeVideos" || modal.type === "danger"
                  ? "bg-red-100"
                  : "bg-yellow-100"
              }`}
            >
              <AlertCircle
                className={`h-6 w-6 ${
                  modal.type === "removeVideos" || modal.type === "danger"
                    ? "text-red-600"
                    : "text-yellow-600"
                }`}
              />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                {modal.title}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600">
                This action cannot be undone
              </p>
            </div>
          </div>
          <p className="text-gray-700 mb-6 text-sm sm:text-base">
            {modal.message}
          </p>
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer w-full sm:w-auto"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                modal.onConfirm();
                onClose();
              }}
              className={`px-4 py-2 text-white rounded-lg transition-colors cursor-pointer w-full sm:w-auto ${
                modal.type === "removeVideos" || modal.type === "danger"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-yellow-600 hover:bg-yellow-700"
              }`}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Courses = () => {
  const {
    courses,
    categories,
    fetchCourses,
    fetchCategories,
    fetchQuestions,
    deleteCourse,
    updateCourse,
    updateQuestion,
    deleteQuestion,
    loading,
    createQuestion,
    bulkDeleteQuestions,
    toggleCourseStatus,
    createCoupon,
    fetchCoupons,
    fetchCourseCoupons,
    updateCouponStatus,
    deleteCoupon,
  } = useAdmin();

  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("");
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [courseQuestions, setCourseQuestions] = useState({});
  const [questionsLoading, setQuestionsLoading] = useState({});
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("card"); // card or table
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [confirmationModal, setConfirmationModal] = useState(null);
  const [editingVideoContent, setEditingVideoContent] = useState(null);
  const [videoEditFormData, setVideoEditFormData] = useState({
    type: "none",
    courseVideo: { links: [] },
    difficultyVideos: [],
  });
  const [addingCoupon, setAddingCoupon] = useState(null);
  const [courseCoupons, setCourseCoupons] = useState({});
  const [loadingCoupons, setLoadingCoupons] = useState({});
  const [newCouponData, setNewCouponData] = useState({
    code: "",
    discount: "5",
    maxUsage: "",
    validUntil: "",
  });
  const [videoPlayerModal, setVideoPlayerModal] = useState(null); // { url, title, platform }
  const [showEditPreview, setShowEditPreview] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [deleteConfirmCourse, setDeleteConfirmCourse] = useState(null);
  const [bulkDeleteConfirmation, setBulkDeleteConfirmation] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionFormData, setQuestionFormData] = useState({});
  const [addingQuestion, setAddingQuestion] = useState(null); // { courseId, difficulty }
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [imageEditMode, setImageEditMode] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState({});
  const [selectAllStates, setSelectAllStates] = useState({});
  const [newQuestionData, setNewQuestionData] = useState({
    question: "",
    questionType: "single", // single, multiple, truefalse
    singleAnswer: "",
    options: ["", "", "", ""],
    correctAnswer: 0,
    truefalseAnswer: true,
    explanation: "",
    image: null,
  });
  useEffect(() => {
    const initializeData = async () => {
      await Promise.all([fetchCourses(), fetchCategories()]);
    };
    initializeData();
  }, []);

  // Handle URL parameters for editing/managing
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const editCourseId = urlParams.get("edit");
    const manageCourseId = urlParams.get("manage");

    if (editCourseId) {
      const courseToEdit = courses.find((c) => c._id === editCourseId);
      if (courseToEdit) {
        handleEditCourse(courseToEdit);
      }
    }

    if (manageCourseId) {
      const courseToManage = courses.find((c) => c._id === manageCourseId);
      if (courseToManage) {
        handleExpandCourse(manageCourseId);
      }
    }
  }, [courses]); // Run when courses are loaded

  const loadCourseCoupons = async (courseId) => {
    setLoadingCoupons((prev) => ({ ...prev, [courseId]: true }));
    const result = await fetchCourseCoupons(courseId);
    if (result.success) {
      setCourseCoupons((prev) => ({ ...prev, [courseId]: result.data }));
    }
    setLoadingCoupons((prev) => ({ ...prev, [courseId]: false }));
  };

  useEffect(() => {
    // Initialize courseQuestions for all courses when courses are loaded
    if (courses.length > 0) {
      const initialQuestions = {};
      courses.forEach((course) => {
        if (course.questions) {
          initialQuestions[course._id] = course.questions;
        }
      });
      setCourseQuestions((prev) => ({ ...prev, ...initialQuestions }));
    }
  }, [courses]);
  // Memoized filtered and sorted courses
  const filteredAndSortedCourses = useMemo(() => {
    let filtered = courses.filter((course) => {
      const matchesSearch =
        course.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        !selectedCategory ||
        (() => {
          // Handle populated category object
          if (
            course.category &&
            typeof course.category === "object" &&
            course.category._id
          ) {
            return course.category._id.toString() === selectedCategory;
          }
          // Handle direct ObjectId reference
          if (course.category && typeof course.category === "string") {
            return course.category === selectedCategory;
          }
          // Handle categoryId field (if it exists)
          if (course.categoryId) {
            return course.categoryId === selectedCategory;
          }
          return false;
        })();

      const matchesStatus =
        !selectedStatus ||
        (selectedStatus === "active"
          ? course.isActive || course.status === "active"
          : !course.isActive && course.status !== "active");

      const matchesDifficulty =
        !selectedDifficulty ||
        course.difficulties?.some(
          (level) =>
            level.name.toLowerCase() === selectedDifficulty.toLowerCase()
        );

      return (
        matchesSearch && matchesCategory && matchesStatus && matchesDifficulty
      );
    });

    // Sort courses
    switch (sortBy) {
      case "newest":
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case "oldest":
        filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case "name":
        filtered.sort((a, b) =>
          (a.name || a.title || "").localeCompare(b.name || b.title || "")
        );
        break;
      case "questions":
        filtered.sort(
          (a, b) => (b.totalQuestions || 0) - (a.totalQuestions || 0)
        );
        break;
      default:
        break;
    }

    return filtered;
  }, [
    courses,
    searchTerm,
    selectedCategory,
    selectedStatus,
    selectedDifficulty,
    sortBy,
  ]);

  useEffect(() => {
    if (expandedCourse) {
      // Clean up selection states when switching courses
      setSelectedQuestions({});
      setSelectAllStates({});
    }
  }, [expandedCourse]);

  // Add this custom hook at the top of the Courses component
  const useStatePreservation = () => {
    const preserveExpandedStates = useCallback(
      () => ({
        expandedCourse,
        expandedQuestions: { ...expandedQuestions },
        selectedQuestions: { ...selectedQuestions },
        selectAllStates: { ...selectAllStates },
      }),
      [expandedCourse, expandedQuestions, selectedQuestions, selectAllStates]
    );

    const restoreExpandedStates = useCallback((preservedState) => {
      if (preservedState.expandedCourse) {
        setExpandedCourse(preservedState.expandedCourse);
        setExpandedQuestions(preservedState.expandedQuestions);
        setSelectedQuestions(preservedState.selectedQuestions);
        setSelectAllStates(preservedState.selectAllStates);
      }
    }, []);

    return { preserveExpandedStates, restoreExpandedStates };
  };

  const handleExpandCourse = async (courseId) => {
    if (expandedCourse === courseId) {
      setExpandedCourse(null);
      const url = new URL(window.location);
      url.searchParams.delete("manage");
      window.history.pushState({}, "", url);
    } else {
      setExpandedCourse(courseId);
      const url = new URL(window.location);
      url.searchParams.set("manage", courseId);
      window.history.pushState({}, "", url);

      // Always fetch questions when expanding, but don't show loading if we have cached data
      if (!courseQuestions[courseId]) {
        setQuestionsLoading((prev) => ({ ...prev, [courseId]: true }));
      }

      try {
        const questionsData = await fetchQuestions(courseId);
        setCourseQuestions((prev) => ({
          ...prev,
          [courseId]: questionsData || [],
        }));
      } catch (error) {
        console.error("Error fetching questions:", error);
      } finally {
        setQuestionsLoading((prev) => ({ ...prev, [courseId]: false }));
      }
    }
  };

  const handleSelectQuestion = (
    courseId,
    difficulty,
    questionId,
    isSelected
  ) => {
    const key = `${courseId}-${difficulty}`;
    const questions = getQuestionsByDifficulty(courseId)[difficulty] || [];

    setSelectedQuestions((prev) => {
      const current = prev[key] || [];
      let newSelected;

      if (isSelected) {
        newSelected = [...current, questionId];
      } else {
        newSelected = current.filter((id) => id !== questionId);
      }

      // Update selectAllStates based on the new selection
      setSelectAllStates((prevStates) => ({
        ...prevStates,
        [key]: newSelected.length === questions.length && questions.length > 0,
      }));

      return { ...prev, [key]: newSelected };
    });
  };

  const handleSelectAll = (courseId, difficulty, questions) => {
    const key = `${courseId}-${difficulty}`;
    const currentSelected = selectedQuestions[key] || [];
    const isCurrentlyAllSelected =
      currentSelected.length === questions.length && questions.length > 0;

    if (!isCurrentlyAllSelected) {
      // Select all questions
      setSelectedQuestions((prev) => ({
        ...prev,
        [key]: questions.map((q) => q._id),
      }));
      setSelectAllStates((prev) => ({
        ...prev,
        [key]: true,
      }));
    } else {
      // Deselect all questions
      setSelectedQuestions((prev) => ({
        ...prev,
        [key]: [],
      }));
      setSelectAllStates((prev) => ({
        ...prev,
        [key]: false,
      }));
    }
  };

  const handleBulkDelete = async (courseId, difficulty) => {
    const key = `${courseId}-${difficulty}`;
    const questionsToDelete = selectedQuestions[key] || [];

    if (questionsToDelete.length === 0) {
      toast.error("No questions selected for deletion");
      return;
    }

    // Show confirmation modal instead of window.confirm
    setBulkDeleteConfirmation({
      courseId,
      difficulty,
      count: questionsToDelete.length,
    });
  };

  const confirmBulkDelete = async () => {
    if (!bulkDeleteConfirmation) return;

    const { courseId, difficulty } = bulkDeleteConfirmation;
    const key = `${courseId}-${difficulty}`;
    const questionsToDelete = selectedQuestions[key] || [];

    const result = await bulkDeleteQuestions(courseId, questionsToDelete);

    if (result.success && result.successful > 0) {
      // Update local state directly without server fetch
      const key = `${courseId}-${difficulty}`;
      const questionsToDelete = selectedQuestions[key] || [];

      setCourseQuestions((prev) => ({
        ...prev,
        [courseId]: (prev[courseId] || []).filter(
          (q) => !questionsToDelete.includes(q._id)
        ),
      }));

      // Clear selections
      setSelectedQuestions((prev) => ({ ...prev, [key]: [] }));
      setSelectAllStates((prev) => ({ ...prev, [key]: false }));
    }

    setBulkDeleteConfirmation(null);
  };

  const getStatusColor = (course) => {
    const isActive = course.isActive || course.status === "active";
    return isActive
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-red-100 text-red-800 border-red-200";
  };

  const getStatusText = (course) => {
    return course.isActive || course.status === "active"
      ? "Active"
      : "Inactive";
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case "easy":
        return "bg-green-100 text-green-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "hard":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find((cat) => cat._id === categoryId);
    return category ? category.name : "Uncategorized";
  };

  const getQuestionsByDifficulty = (courseId) => {
    const questions = courseQuestions[courseId] || [];
    return questions.reduce((acc, question) => {
      const difficulty = question.difficulty || "Unknown";
      if (!acc[difficulty]) {
        acc[difficulty] = [];
      }
      acc[difficulty].push(question);
      return acc;
    }, {});
  };

  const getCourseName = (course) => {
    return course.name || course.title || "Untitled Course";
  };

  const getCourseStats = (course) => {
    const questions = courseQuestions[course._id] || [];
    const totalQuestions = questions.length;
    const activeQuestions = questions.filter(
      (q) => q.isActive !== false
    ).length;
    const difficulties = [...new Set(questions.map((q) => q.difficulty))];

    return {
      totalQuestions: course.totalQuestions || totalQuestions,
      activeQuestions,
      difficulties: difficulties.length,
    };
  };

  // Reset filters
  const resetFilters = () => {
    setSearchTerm("");
    setSelectedCategory("");
    setSelectedStatus("");
    setSelectedDifficulty("");
    setSortBy("newest");
  };

  // ADD THESE HANDLER FUNCTIONS
  const handleEditCourse = (course) => {
    setEditingCourse(course);
    setEditFormData({
      name: course.name,
      description: course.description || "",
      isActive: course.isActive,
      category: course.category?._id || course.categoryId || null,
      isPaid: course.isPaid || false,
      price: course.price || 0,
    });
    setErrors({});
    // Update URL without page reload
    const url = new URL(window.location);
    url.searchParams.set("edit", course._id);
    window.history.pushState({}, "", url);
  };

  const validateCourseForm = () => {
    const newErrors = {};

    if (!editFormData.name?.trim()) {
      newErrors.name = "Course title is required";
    } else if (editFormData.name.trim().length < 2) {
      newErrors.name = "Course title must be at least 2 characters";
    } else if (editFormData.name.trim().length > 100) {
      newErrors.name = "Course title cannot exceed 100 characters";
    }

    if (!editFormData.description?.trim()) {
      newErrors.description = "Course description is required";
    } else if (editFormData.description.trim().length < 5) {
      newErrors.description =
        "Course description must be at least 5 characters";
    } else if (editFormData.description.trim().length > 800) {
      newErrors.description = "Course description cannot exceed 800 characters";
    }
    if (editFormData.isPaid && editFormData.price <= 0) {
      newErrors.price = "Price must be greater than 0 for paid courses";
    }
    if (editFormData.isPaid && editFormData.price >= 50000) {
      newErrors.price = "Price must be smaller than ₹50,000 for paid courses";
    }
    return newErrors;
  };

  const handleToggleCourseStatus = async (course) => {
    const result = await updateCourse(editingCourse._id, editFormData);
    if (result.success) {
      setEditingCourse(null);
      setEditFormData({});
    }
  };

  const handleUpdateCourse = async () => {
    const validationErrors = validateCourseForm();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return; // Don't proceed with update
    }

    setErrors({}); // Clear errors if validation passes
    const result = await updateCourse(editingCourse._id, editFormData);
    if (result.success) {
      setEditingCourse(null);
      setEditFormData({});
      // Clear URL parameters
      const url = new URL(window.location);
      url.searchParams.delete("edit");
      window.history.pushState({}, "", url);

      // Refresh courses list
      await fetchCourses();
    }
  };

  const handleCancelEdit = () => {
    setEditingCourse(null);
    setEditFormData({});
    setEditingQuestion(null);
    setQuestionFormData({});
    // Clear URL parameters
    const url = new URL(window.location);
    url.searchParams.delete("edit");
    window.history.pushState({}, "", url);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmCourse) {
      // Preserve expansion states before deletion
      const currentExpandedCourse = expandedCourse;
      const currentExpandedQuestions = { ...expandedQuestions };

      const result = await deleteCourse(deleteConfirmCourse._id);
      if (result.success) {
        if (expandedCourse === deleteConfirmCourse._id) {
          setExpandedCourse(null);
        }
        setCourseQuestions((prev) => {
          const updated = { ...prev };
          delete updated[deleteConfirmCourse._id];
          return updated;
        });

        // Refresh courses list
        await fetchCourses();

        // Restore expansion states only if the deleted course wasn't the expanded one
        if (currentExpandedCourse !== deleteConfirmCourse._id) {
          setExpandedCourse(currentExpandedCourse);
          setExpandedQuestions(currentExpandedQuestions);
        }
      }
      setDeleteConfirmCourse(null);
    }
  };
  // Question editing handlers
  const handleEditQuestion = (question, courseId) => {
    setEditingQuestion({ ...question, courseId });
    setQuestionFormData({
      question: question.question || "",
      questionType: question.questionType || "single",
      // Fix: Properly initialize based on question type
      singleAnswer:
        question.questionType === "single" ? question.correctAnswer || "" : "",
      options:
        question.questionType === "multiple"
          ? question.options || ["", "", "", ""]
          : ["", "", "", ""],
      correctAnswer:
        question.questionType === "multiple" ? question.correctAnswer || 0 : 0,
      truefalseAnswer:
        question.questionType === "truefalse"
          ? question.correctAnswer === 0 // 0 = True, 1 = False
          : true,
      explanation: question.explanation || "",
      difficulty: question.difficulty || "Easy",
      isActive: question.isActive !== undefined ? question.isActive : true,
      image: question.image ? { url: question.image.url, file: null } : null,
    });
  };

  const handleUpdateQuestion = async () => {
    let answer = "";
    let updateData = {
      question: questionFormData.question,
      explanation: questionFormData.explanation,
      difficulty: questionFormData.difficulty,
      isActive: questionFormData.isActive,
      questionType: questionFormData.questionType,
    };
    if (questionFormData.image && questionFormData.image.file) {
      updateData.image = questionFormData.image;
    }
    // Set correctAnswer based on question type (not answer field)
    switch (questionFormData.questionType) {
      case "single":
        updateData.correctAnswer = questionFormData.singleAnswer;
        break;
      case "multiple":
        updateData.options = questionFormData.options;
        updateData.correctAnswer = questionFormData.correctAnswer;
        updateData.numberOfOptions = questionFormData.options.length;
        break;
      case "truefalse":
        updateData.options = ["True", "False"];
        updateData.correctAnswer = questionFormData.truefalseAnswer ? 0 : 1;
        updateData.numberOfOptions = 2;
        break;
    }
    updateData.answer = answer;
    if (editingQuestion) {
      const result = await updateQuestion(
        editingQuestion.courseId,
        editingQuestion._id,
        updateData
      );
      if (result.success) {
        setEditingQuestion(null);
        setQuestionFormData({});
        // Only update question data, preserve course expansion
        const questionsData = await fetchQuestions(editingQuestion.courseId);
        setCourseQuestions((prev) => ({
          ...prev,
          [editingQuestion.courseId]: questionsData || [],
        }));
      }
    }
  };

  const handleDeleteQuestion = async (courseId, questionId) => {
    setDeleteConfirmation({ courseId, questionId });
  };

  const confirmDeleteQuestion = async () => {
    if (!deleteConfirmation) return;

    const { courseId, questionId } = deleteConfirmation;
    const result = await deleteQuestion(courseId, questionId);

    if (result.success) {
      // Only update local state - no refetch needed
      setCourseQuestions((prev) => ({
        ...prev,
        [courseId]: (prev[courseId] || []).filter((q) => q._id !== questionId),
      }));

      // Clear selections if question was selected
      const allKeys = Object.keys(selectedQuestions);
      const updatedSelections = { ...selectedQuestions };
      allKeys.forEach((key) => {
        if (key.startsWith(`${courseId}-`)) {
          updatedSelections[key] =
            updatedSelections[key]?.filter((id) => id !== questionId) || [];
        }
      });
      setSelectedQuestions(updatedSelections);
    }
    setDeleteConfirmation(null);
  };

  const handleAddQuestion = (courseId, difficulty = null) => {
    const course = courses.find((c) => c._id === courseId);

    if (!difficulty) {
      // If no difficulty specified, show difficulty selection
      const availableDifficulties = course?.difficulties || [];
      if (availableDifficulties.length === 1) {
        // If only one difficulty, auto-select it
        difficulty = availableDifficulties[0].name;
      } else {
        // Show difficulty selection modal or dropdown
        setShowDifficultySelection({ courseId, availableDifficulties });
        return;
      }
    }

    const difficultyLevel = course?.difficulties?.find(
      (d) => d.name.toLowerCase() === difficulty.toLowerCase()
    );

    setAddingQuestion({
      courseId,
      difficulty,
      marksPerQuestion: difficultyLevel?.marksPerQuestion || 1,
    });
    setNewQuestionData({
      question: "",
      questionType: "single",
      singleAnswer: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      truefalseAnswer: true,
      explanation: "",
    });
  };
  const getDifficultyLevel = (course, difficultyName) => {
    return course.difficulties?.find(
      (diff) => diff.name.toLowerCase() === difficultyName.toLowerCase()
    );
  };
  const handleCreateQuestion = async () => {
    if (!addingQuestion) return;

    // Validate question text (minlength: 10, maxlength: 1000)
    if (!newQuestionData.question.trim()) {
      toast.error("Question text is required");
      return;
    }
    if (newQuestionData.question.trim().length < 10) {
      toast.error("Question must be at least 10 characters long");
      return;
    }
    if (newQuestionData.question.trim().length > 1000) {
      toast.error("Question cannot exceed 1000 characters");
      return;
    }

    // Validate explanation (required: true, minlength: 10)
    if (!newQuestionData.explanation.trim()) {
      toast.error("Explanation is required");
      return;
    }
    if (newQuestionData.explanation.trim().length < 10) {
      toast.error("Explanation must be at least 10 characters long");
      return;
    }

    // Prepare question data based on type
    let answer = "";
    switch (newQuestionData.questionType) {
      case "single":
        if (!newQuestionData.singleAnswer.trim()) {
          toast.error("Answer is required");
          return;
        }
        // Validate answer length (minlength: 1, maxlength: 2500)
        if (newQuestionData.singleAnswer.trim().length > 2500) {
          toast.error("Answer cannot exceed 2500 characters");
          return;
        }
        answer = newQuestionData.singleAnswer;
        break;
      case "multiple":
        if (newQuestionData.options.some((opt) => !opt.trim())) {
          toast.error("All options must be filled");
          return;
        }
        // Validate selected answer length
        const selectedAnswer =
          newQuestionData.options[newQuestionData.correctAnswer];
        if (selectedAnswer.length > 2500) {
          toast.error("Answer cannot exceed 2500 characters");
          return;
        }
        answer = selectedAnswer;
        break;
      case "truefalse":
        answer = newQuestionData.truefalseAnswer === true ? "True" : "False";
        break;
    }

    const questionPayload = {
      course: addingQuestion.courseId,
      question: newQuestionData.question,
      correctAnswer: answer, // Use correctAnswer instead of answer
      explanation: newQuestionData.explanation,
      difficulty: addingQuestion.difficulty,
      marksPerQuestion: addingQuestion.marksPerQuestion,
      questionType: newQuestionData.questionType,
    };
    if (newQuestionData.image && newQuestionData.image.file) {
      questionPayload.image = newQuestionData.image;
    }
    // Add question type specific fields
    if (newQuestionData.questionType === "multiple") {
      questionPayload.options = newQuestionData.options;
      questionPayload.numberOfOptions = newQuestionData.options.length;
    } else if (newQuestionData.questionType === "truefalse") {
      questionPayload.options = ["True", "False"];
      questionPayload.numberOfOptions = 2;
    }

    const result = await createQuestion(questionPayload);
    if (result.success) {
      const courseId = addingQuestion.courseId;
      setAddingQuestion(null);
      setNewQuestionData({
        question: "",
        questionType: "single",
        singleAnswer: "",
        options: ["", "", "", ""],
        correctAnswer: 0,
        truefalseAnswer: true,
        explanation: "",
      });

      const questionsData = await fetchQuestions(addingQuestion.courseId);
      setCourseQuestions((prev) => ({
        ...prev,
        [addingQuestion.courseId]: questionsData || [],
      }));
      await fetchCourses();
    }
  };

  // Handler to open video edit modal
  const handleEditVideoContent = (course) => {
    setEditingVideoContent({
      courseId: course._id,
      courseName: getCourseName(course),
      course: course,
    });

    // Initialize form data with existing video content
    if (course.videoContent && course.videoContent.type !== "none") {
      setVideoEditFormData({
        type: course.videoContent.type,
        courseVideo: {
          links: course.videoContent.courseVideo?.links || [],
        },
        difficultyVideos: course.videoContent.difficultyVideos || [],
      });
    } else {
      // Initialize empty structure
      const emptyDiffVideos =
        course.difficulties?.map((diff) => ({
          difficulty: diff.name,
          links: [],
        })) || [];

      setVideoEditFormData({
        type: "none",
        courseVideo: { links: [] },
        difficultyVideos: emptyDiffVideos,
      });
    }
  };

  // Handler to save video content changes
  const handleUpdateVideoContent = async () => {
    if (!editingVideoContent) return;

    try {
      // Prepare update data
      const updateData = {
        videoType: videoEditFormData.type,
      };

      if (videoEditFormData.type === "course") {
        // Filter out empty links
        const validLinks = videoEditFormData.courseVideo.links.filter(
          (link) => link.url && link.url.trim()
        );

        if (validLinks.length === 0) {
          toast.error("At least one video link is required for course videos");
          return;
        }

        if (validLinks.length > 2) {
          toast.error("Maximum 2 video links allowed");
          return;
        }

        updateData.courseVideoLinks = JSON.stringify(validLinks);
      } else if (videoEditFormData.type === "difficulty") {
        const diffVideosData = {};

        // Process each difficulty
        for (const diffVideo of videoEditFormData.difficultyVideos) {
          const validLinks = diffVideo.links.filter(
            (link) => link.url && link.url.trim()
          );

          if (validLinks.length > 0) {
            if (validLinks.length > 2) {
              toast.error(
                `Maximum 2 video links allowed for ${diffVideo.difficulty}`
              );
              return;
            }
            diffVideosData[diffVideo.difficulty] = { links: validLinks };
          }
        }

        if (Object.keys(diffVideosData).length === 0) {
          toast.error("At least one difficulty must have video links");
          return;
        }

        updateData.difficultyVideosData = JSON.stringify(diffVideosData);
      } else if (videoEditFormData.type === "none") {
        updateData.videoType = "remove";
      }

      // Call update API
      const result = await updateCourse(
        editingVideoContent.courseId,
        updateData
      );

      if (result.success) {
        toast.success("Video content updated successfully!");
        setEditingVideoContent(null);
        setVideoEditFormData({
          type: "none",
          courseVideo: { links: [] },
          difficultyVideos: [],
        });

        // Refresh courses
        await fetchCourses();
      }
    } catch (error) {
      console.error("Error updating video content:", error);
      toast.error("Failed to update video content");
    }
  };

  // Handler to remove all video content
  const handleRemoveAllVideos = async (courseId) => {
    try {
      const result = await updateCourse(courseId, {
        videoType: "remove",
      });

      if (result.success) {
        toast.success("All videos removed successfully!");
        await fetchCourses();
      }
    } catch (error) {
      console.error("Error removing videos:", error);
      toast.error("Failed to remove videos");
    }
  };

  // Helper function to detect video platform
  const detectPlatform = (url) => {
    if (!url) return "Unknown";

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace("www.", "");

      if (domain.includes("youtube.com") || domain.includes("youtu.be")) {
        return "YouTube";
      } else if (domain.includes("vimeo.com")) {
        return "Vimeo";
      } else if (domain.includes("dailymotion.com")) {
        return "Dailymotion";
      } else if (domain.includes("wistia.com")) {
        return "Wistia";
      }
      return "Other";
    } catch {
      return "Invalid URL";
    }
  };
  const toggleQuestionsExpansion = (courseId, difficulty) => {
    const key = `${courseId}-${difficulty}`;
    setExpandedQuestions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleImageUpload = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      // Add file size validation (e.g., 5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }

      // Add file type validation
      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = {
          file: file,
          url: e.target.result,
        };

        if (type === "edit") {
          setQuestionFormData({ ...questionFormData, image: imageData });
        } else {
          setNewQuestionData({ ...newQuestionData, image: imageData });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Add this new function for removing images
  const handleRemoveImage = (type) => {
    if (type === "edit") {
      setQuestionFormData({ ...questionFormData, image: null });
    } else {
      setNewQuestionData({ ...newQuestionData, image: null });
    }
  };

  const hasActiveFilters =
    searchTerm || selectedCategory || selectedStatus || selectedDifficulty;

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text">
                Course Management
              </h1>
              <p className="text-gray-600 mt-1">
                Manage all courses and their content
              </p>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-sm text-gray-500">
                <span className="flex items-center space-x-1">
                  <BarChart3 className="h-4 w-4" />
                  <span>{filteredAndSortedCourses.length} courses</span>
                </span>
                <span className="flex items-center space-x-1">
                  <TrendingUp className="h-4 w-4" />
                  <span>{categories.length} categories</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg border transition-all duration-200 flex items-center space-x-2 cursor-pointer ${
                showFilters || hasActiveFilters
                  ? "bg-blue-50 border-blue-200 text-blue-700"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {
                    [
                      searchTerm,
                      selectedCategory,
                      selectedStatus,
                      selectedDifficulty,
                    ].filter(Boolean).length
                  }
                </span>
              )}
            </button>

            <button
              onClick={async () => {
                const preserveState = {
                  expandedCourse,
                  expandedQuestions: { ...expandedQuestions },
                  selectedQuestions: { ...selectedQuestions },
                  selectAllStates: { ...selectAllStates },
                };

                await fetchCourses();

                // Restore all preserved states
                setExpandedCourse(preserveState.expandedCourse);
                setExpandedQuestions(preserveState.expandedQuestions);
                setSelectedQuestions(preserveState.selectedQuestions);
                setSelectAllStates(preserveState.selectAllStates);
              }}
              disabled={loading}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => navigate("/courses/create")}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Create Course</span>
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {(showFilters || hasActiveFilters) && (
          <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
              {/* Search */}
              <div className="sm:col-span-2 lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Courses
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name or description..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name">Name A-Z</option>
                  <option value="questions">Most Questions</option>
                </select>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span>
                    Showing {filteredAndSortedCourses.length} of{" "}
                    {courses.length} courses
                  </span>
                </div>
                <button
                  onClick={resetFilters}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Courses List */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Courses ({filteredAndSortedCourses.length})
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode("card")}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${
                  viewMode === "card"
                    ? "bg-blue-100 text-blue-600"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <BarChart3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${
                  viewMode === "table"
                    ? "bg-blue-100 text-blue-600"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Loading courses...
            </h3>
            <p className="text-gray-600">
              Please wait while we fetch your courses
            </p>
          </div>
        ) : filteredAndSortedCourses.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              {hasActiveFilters ? (
                <Search className="h-8 w-8 text-gray-400" />
              ) : (
                <BookOpen className="h-8 w-8 text-gray-400" />
              )}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {hasActiveFilters ? "No courses found" : "No courses available"}
            </h3>
            <p className="text-gray-600 mb-6">
              {hasActiveFilters
                ? "Try adjusting your search or filter criteria."
                : "Start by creating your first course to begin building your content."}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={resetFilters}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            ) : (
              <button
                onClick={() => navigate("/courses/create")}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Create Your First Course
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredAndSortedCourses.map((course) => {
              const courseName = getCourseName(course);
              const courseStats = getCourseStats(course);
              const isExpanded = expandedCourse === course._id;
              const questionsByDifficulty =
                courseQuestions[course._id]?.reduce((acc, question) => {
                  const difficulty = question.difficulty || "Unknown";
                  if (!acc[difficulty]) {
                    acc[difficulty] = [];
                  }
                  acc[difficulty].push(question);
                  return acc;
                }, {}) || {};

              return (
                <div
                  key={course._id}
                  className="p-4 sm:p-6 hover:bg-gray-50 transition-colors duration-150"
                >
                  {/* Course Header */}
                  <div className="flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-4">
                    {/* Course Image */}
                    <div className="flex-shrink-0">
                      {course.image ? (
                        <img
                          src={
                            typeof course.image === "string"
                              ? course.image
                              : course.image.url
                          }
                          alt={courseName}
                          className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 mx-auto sm:mx-0"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl flex items-center justify-center border-2 border-gray-200 shadow-sm">
                          <ImageIcon className="h-10 w-10 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Course Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex-1 lg:pr-4">
                          <div className="flex items-center space-x-3 mb-3">
                            <h3 className="text-xl font-bold text-gray-900 truncate">
                              {courseName}
                            </h3>
                            <span
                              className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(
                                course
                              )}`}
                            >
                              {getStatusText(course)}
                            </span>
                          </div>

                          {course.description && (
                            <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
                              {course.description}
                            </p>
                          )}

                          {/* Course Metadata */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 text-sm">
                            <div className="flex items-center space-x-2 text-gray-500">
                              <Calendar className="h-4 w-4 text-blue-500" />
                              <span className="font-medium">Category:</span>
                              <span>{getCategoryName(course.categoryId)}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-gray-500">
                              <Clock className="h-4 w-4 text-green-500" />
                              <span className="font-medium">Created:</span>
                              <span>
                                {new Date(
                                  course.createdAt
                                ).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 text-gray-500">
                              <BarChart3 className="h-4 w-4 text-purple-500" />
                              <span className="font-medium">Questions:</span>
                              <span>{courseStats.totalQuestions}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-gray-500">
                              <Target className="h-4 w-4 text-orange-500" />
                              <span className="font-medium">Difficulties:</span>
                              <span>{courseStats.difficulties}</span>
                            </div>
                          </div>

                          {/* Difficulty Levels */}
                          {course.difficulties &&
                            course.difficulties.length > 0 && (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {course.difficulties.map((level) => (
                                  <span
                                    key={level.name}
                                    className={`px-3 py-1 text-xs font-medium rounded-full ${getDifficultyColor(
                                      level.name
                                    )}`}
                                  >
                                    {level.name} ({course.maxQuestionsPerTest}{" "}
                                    max questions, {level.marksPerQuestion}{" "}
                                    marks each)
                                  </span>
                                ))}
                              </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-row items-start justify-start lg:justify-end gap-1 sm:gap-2 mt-4 lg:mt-0 lg:ml-2 w-full lg:w-auto lg:flex-shrink-0">
                          <button
                            onClick={() => handleExpandCourse(course._id)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 group cursor-pointer flex-shrink-0"
                            title={isExpanded ? "Hide Details" : "View Details"}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform" />
                            ) : (
                              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform" />
                            )}
                          </button>
                          <button
                            onClick={() => handleToggleCourseStatus(course)}
                            className={`p-2 rounded-lg transition-all duration-200 group cursor-pointer flex-shrink-0 ${
                              course.isActive || course.status === "active"
                                ? "text-green-600 hover:text-green-700 hover:bg-green-50"
                                : "text-red-600 hover:text-red-700 hover:bg-red-50"
                            }`}
                            title={`${
                              course.isActive || course.status === "active"
                                ? "Deactivate"
                                : "Activate"
                            } Course`}
                          >
                            <Eye className="h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform" />
                          </button>
                          <button
                            onClick={() => handleEditCourse(course)}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 group cursor-pointer flex-shrink-0"
                            title="Edit Course"
                          >
                            <Edit2 className="h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmCourse(course)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 group cursor-pointer flex-shrink-0"
                            title="Delete Course"
                          >
                            <Trash2 className="h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Course Details */}
                  {isExpanded && (
                    <div className="mt-8 pt-8 border-t border-gray-200 space-y-8 animate-in slide-in-from-top-4 duration-300">
                      {/* Course Configuration */}
                      {course.difficulties &&
                        course.difficulties.length > 0 && (
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                              <Settings className="h-5 w-5 text-blue-500" />
                              <span>Course Configuration</span>
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                              {course.difficulties.map((level) => (
                                <div
                                  key={level.name}
                                  className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 hover:shadow-md transition-all duration-200"
                                >
                                  <div className="flex items-center justify-between mb-4">
                                    <span
                                      className={`px-3 py-1 text-sm font-semibold rounded-full ${getDifficultyColor(
                                        level.name
                                      )}`}
                                    >
                                      {level.name}
                                    </span>
                                    <Target className="h-5 w-5 text-gray-400" />
                                  </div>
                                  <div className="space-y-3 text-sm">
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-600">
                                        Max Questions:
                                      </span>
                                      <span className="font-semibold text-gray-900">
                                        {course.maxQuestionsPerTest}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-600">
                                        Marks Each:
                                      </span>
                                      <span className="font-semibold text-gray-900">
                                        {level.marksPerQuestion}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-600">
                                        Time Limit:
                                      </span>
                                      <span className="font-semibold text-gray-900">
                                        {level.timerSettings?.minTime}-
                                        {level.timerSettings?.maxTime}min
                                      </span>
                                    </div>
                                    <div className="pt-2 border-t border-gray-300">
                                      <div className="flex justify-between items-center">
                                        <span className="text-gray-600">
                                          Questions:
                                        </span>
                                        <span className="font-semibold text-gray-900">
                                          {getQuestionsByDifficulty(course._id)[
                                            level.name
                                          ]?.length || 0}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-gray-600">
                                          Total Marks:
                                        </span>
                                        <span className="font-bold text-blue-600">
                                          {(getQuestionsByDifficulty(
                                            course._id
                                          )[level.name]?.length || 0) *
                                            level.marksPerQuestion}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-gray-600">
                                          Max Test Marks:
                                        </span>
                                        <span className="font-semibold text-gray-500">
                                          {Math.min(
                                            course.maxQuestionsPerTest,
                                            getQuestionsByDifficulty(
                                              course._id
                                            )[level.name]?.length || 0
                                          ) * level.marksPerQuestion}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Questions Section */}
                      <div>
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                            <BookOpen className="h-5 w-5 text-purple-500" />
                            <span>Questions by Difficulty</span>
                          </h4>
                          {questionsLoading[course._id] && (
                            <div className="flex items-center space-x-2 text-blue-600">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm">
                                Loading questions...
                              </span>
                            </div>
                          )}
                        </div>

                        {courseQuestions[course._id] ? (
                          Object.keys(questionsByDifficulty).length > 0 ? (
                            <div className="space-y-6">
                              {Object.entries(questionsByDifficulty).map(
                                ([difficulty, questions]) => (
                                  <div
                                    key={difficulty}
                                    className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow duration-200"
                                  >
                                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                          <span
                                            className={`px-3 py-1 text-sm font-semibold rounded-full ${getDifficultyColor(
                                              difficulty
                                            )}`}
                                          >
                                            {difficulty}
                                          </span>
                                          <span className="text-gray-600 text-sm">
                                            {questions.length} question
                                            {questions.length !== 1 ? "s" : ""}
                                          </span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          {questions.length > 3 && (
                                            <button
                                              onClick={() =>
                                                toggleQuestionsExpansion(
                                                  course._id,
                                                  difficulty
                                                )
                                              }
                                              className="text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                                            >
                                              {expandedQuestions[
                                                `${course._id}-${difficulty}`
                                              ]
                                                ? "Show Less"
                                                : "View All"}
                                            </button>
                                          )}

                                          {/* Bulk selection controls */}
                                          {questions.length > 0 && (
                                            <>
                                              <button
                                                onClick={() =>
                                                  handleSelectAll(
                                                    course._id,
                                                    difficulty,
                                                    questions
                                                  )
                                                }
                                                className="text-sm text-purple-600 hover:text-purple-700 font-medium cursor-pointer flex items-center space-x-1"
                                                title={(() => {
                                                  const key = `${course._id}-${difficulty}`;
                                                  const selected =
                                                    selectedQuestions[key] ||
                                                    [];
                                                  const isAllSelected =
                                                    selected.length ===
                                                      questions.length &&
                                                    questions.length > 0;
                                                  return isAllSelected
                                                    ? "Deselect All"
                                                    : "Select All";
                                                })()}
                                              >
                                                {(() => {
                                                  const key = `${course._id}-${difficulty}`;
                                                  const selected =
                                                    selectedQuestions[key] ||
                                                    [];
                                                  const isAllSelected =
                                                    selected.length ===
                                                      questions.length &&
                                                    questions.length > 0;
                                                  return isAllSelected ? (
                                                    <CheckSquare className="h-4 w-4 cursor-pointer" />
                                                  ) : (
                                                    <Square className="h-4 w-4 cursor-pointer" />
                                                  );
                                                })()}
                                              </button>
                                              {selectedQuestions[
                                                `${course._id}-${difficulty}`
                                              ]?.length > 0 && (
                                                <button
                                                  onClick={() =>
                                                    handleBulkDelete(
                                                      course._id,
                                                      difficulty
                                                    )
                                                  }
                                                  className="text-sm text-red-600 hover:text-red-700 font-medium cursor-pointer flex items-center space-x-1"
                                                >
                                                  <Trash2 className="h-3 w-3" />
                                                  <span>
                                                    Delete Selected (
                                                    {
                                                      selectedQuestions[
                                                        `${course._id}-${difficulty}`
                                                      ].length
                                                    }
                                                    )
                                                  </span>
                                                </button>
                                              )}
                                            </>
                                          )}

                                          <button
                                            onClick={() =>
                                              handleAddQuestion(
                                                course._id,
                                                difficulty
                                              )
                                            }
                                            className="text-blue-600 hover:text-blue-800 font-medium transition-colors cursor-pointer flex items-center space-x-1"
                                          >
                                            <Plus className="h-4 w-4" />
                                            <span>
                                              Add Question (
                                              {getDifficultyLevel(
                                                course,
                                                difficulty
                                              )?.marksPerQuestion || 1}{" "}
                                              marks)
                                            </span>
                                          </button>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="p-6">
                                      <div className="space-y-4">
                                        {(expandedQuestions[
                                          `${course._id}-${difficulty}`
                                        ]
                                          ? questions
                                          : questions.slice(0, 3)
                                        ).map((question, index) => (
                                          <div
                                            key={question._id || index}
                                            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow duration-200"
                                          >
                                            <div className="flex items-start justify-between space-x-4">
                                              <div className="flex items-start space-x-3 flex-1 min-w-0">
                                                <input
                                                  type="checkbox"
                                                  checked={
                                                    selectedQuestions[
                                                      `${course._id}-${difficulty}`
                                                    ]?.includes(question._id) ||
                                                    false
                                                  }
                                                  onChange={(e) =>
                                                    handleSelectQuestion(
                                                      course._id,
                                                      difficulty,
                                                      question._id,
                                                      e.target.checked
                                                    )
                                                  }
                                                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                                />
                                                <div className="flex-1 min-w-0">
                                                  <p className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">
                                                    {question.question ||
                                                      question.text ||
                                                      "Question text not available"}
                                                  </p>
                                                  {question.answer && (
                                                    <p className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded inline-block">
                                                      Answer: {question.answer}
                                                    </p>
                                                  )}
                                                </div>
                                              </div>
                                              <div className="flex items-center space-x-1 flex-shrink-0">
                                                <button
                                                  onClick={() =>
                                                    handleEditQuestion(
                                                      question,
                                                      course._id
                                                    )
                                                  }
                                                  className="p-1 text-gray-400 hover:text-green-600 transition-colors cursor-pointer"
                                                >
                                                  <Edit2 className="h-3 w-3" />
                                                </button>
                                                <button
                                                  onClick={() =>
                                                    handleDeleteQuestion(
                                                      course._id,
                                                      question._id
                                                    )
                                                  }
                                                  className="p-1 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                                                >
                                                  <Trash2 className="h-3 w-3" />
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        ))}

                                        {questions.length > 3 &&
                                          !expandedQuestions[
                                            `${course._id}-${difficulty}`
                                          ] && (
                                            <div className="text-center pt-4">
                                              <button
                                                onClick={() =>
                                                  toggleQuestionsExpansion(
                                                    course._id,
                                                    difficulty
                                                  )
                                                }
                                                className="text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                                              >
                                                View {questions.length - 3} more
                                                questions
                                              </button>
                                            </div>
                                          )}

                                        {questions.length === 0 && (
                                          <div className="text-center py-8">
                                            <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                            <p className="text-gray-500 text-sm">
                                              No questions available for this
                                              difficulty
                                            </p>
                                            <button
                                              onClick={() =>
                                                handleAddQuestion(
                                                  course._id,
                                                  difficulty
                                                )
                                              }
                                              className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                                            >
                                              Add First Question
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-12">
                              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                                <BookOpen className="h-8 w-8 text-gray-400" />
                              </div>
                              <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No questions found
                              </h3>
                              <p className="text-gray-600 mb-4">
                                This course doesn't have any questions yet.
                              </p>
                              <button
                                onClick={() => {
                                  const firstDifficulty =
                                    course.difficulties?.[0]?.name || "Easy";
                                  handleAddQuestion(
                                    course._id,
                                    firstDifficulty
                                  );
                                }}
                                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                              >
                                Add Questions
                              </button>
                            </div>
                          )
                        ) : (
                          <div className="text-center py-8">
                            <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
                              <AlertCircle className="h-6 w-6 text-gray-400" />
                            </div>
                            <p className="text-gray-500">
                              Click to load questions for this course
                            </p>
                          </div>
                        )}
                      </div>

                      {course.isPaid && (
                        <div className="mt-8 pt-8 border-t border-gray-200">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                              <Tag className="h-5 w-5 text-purple-500" />
                              <span>Course Coupons</span>
                            </h4>
                            <button
                              onClick={() => setAddingCoupon(course._id)}
                              className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center space-x-1 text-sm cursor-pointer"
                            >
                              <Plus className="h-4 w-4" />
                              <span>Add Coupon</span>
                            </button>
                          </div>

                          {/* USE THE COMPONENT HERE */}
                          <CourseCoupons courseId={course._id} />
                        </div>
                      )}
                      {/* Video Content Preview with Edit/Delete buttons */}
                      {course.videoContent &&
                        course.videoContent.type &&
                        course.videoContent.type !== "none" && (
                          <div className="mt-8 pt-8 border-t border-gray-200">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                                <Play className="h-5 w-5 text-purple-500" />
                                <span>Video Content</span>
                              </h4>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleEditVideoContent(course)}
                                  className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center space-x-1 text-sm"
                                >
                                  <Edit2 className="h-4 w-4" />
                                  <span>Edit Videos</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setConfirmationModal({
                                      type: "removeVideos",
                                      title: "Remove All Videos",
                                      message:
                                        "Are you sure you want to remove all video content from this course? This will delete all course-level and difficulty-level videos.",
                                      courseId: course._id,
                                      onConfirm: () =>
                                        handleRemoveAllVideos(course._id),
                                    });
                                  }}
                                  className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center space-x-1 text-sm cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span>Remove All</span>
                                </button>
                              </div>
                            </div>

                            {course.videoContent.type === "course" && (
                              <div className="space-y-3">
                                <p className="text-sm text-gray-600 mb-3">
                                  Course-level video content
                                </p>

                                {course.videoContent.courseVideo?.links
                                  ?.length > 0 ? (
                                  course.videoContent.courseVideo.links.map(
                                    (link, idx) => (
                                      <div
                                        key={idx}
                                        className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 p-4 rounded-lg hover:shadow-md transition-shadow"
                                      >
                                        <div className="flex items-start justify-between">
                                          <div className="flex-1">
                                            <div className="flex items-center space-x-2 mb-2">
                                              <Play className="h-4 w-4 text-blue-600" />
                                              <p className="font-medium text-gray-900">
                                                {link.title || "Video Lesson"}
                                              </p>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                                {link.platform ||
                                                  detectPlatform(link.url)}
                                              </span>

                                              <button
                                                onClick={() =>
                                                  setVideoPlayerModal({
                                                    url: link.url,
                                                    title:
                                                      link.title ||
                                                      "Video Lesson",
                                                    platform:
                                                      link.platform ||
                                                      detectPlatform(link.url),
                                                  })
                                                }
                                                className="text-blue-600 hover:text-blue-700 text-sm flex items-center space-x-1 cursor-pointer"
                                              >
                                                <Play className="h-4 w-4" />
                                                <span>Play Video</span>
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  )
                                ) : (
                                  <p className="text-sm text-gray-500 italic">
                                    No video links added yet
                                  </p>
                                )}
                              </div>
                            )}

                            {course.videoContent.type === "difficulty" && (
                              <div className="space-y-4">
                                <p className="text-sm text-gray-600 mb-3">
                                  Difficulty-specific videos
                                </p>

                                {course.videoContent.difficultyVideos?.length >
                                0 ? (
                                  course.videoContent.difficultyVideos.map(
                                    (diffVideo) => (
                                      <div
                                        key={diffVideo.difficulty}
                                        className={`border rounded-lg p-4 ${
                                          diffVideo.difficulty === "Easy"
                                            ? "bg-green-50 border-green-200"
                                            : diffVideo.difficulty === "Medium"
                                            ? "bg-yellow-50 border-yellow-200"
                                            : "bg-red-50 border-red-200"
                                        }`}
                                      >
                                        <h5 className="font-medium mb-3 flex items-center space-x-2">
                                          <span
                                            className={`px-2 py-1 rounded-full text-xs ${getDifficultyColor(
                                              diffVideo.difficulty
                                            )}`}
                                          >
                                            {diffVideo.difficulty}
                                          </span>
                                        </h5>

                                        {diffVideo.links &&
                                        diffVideo.links.length > 0 ? (
                                          <div className="space-y-2">
                                            {diffVideo.links.map(
                                              (link, idx) => (
                                                <div
                                                  key={idx}
                                                  className="bg-white p-3 rounded border border-gray-200"
                                                >
                                                  <div className="flex items-center justify-between">
                                                    <div>
                                                      <p className="text-sm font-medium text-gray-900">
                                                        {link.title ||
                                                          `${diffVideo.difficulty} Video`}
                                                      </p>
                                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 mt-1">
                                                        {link.platform ||
                                                          detectPlatform(
                                                            link.url
                                                          )}
                                                      </span>
                                                    </div>

                                                    <button
                                                      onClick={() =>
                                                        setVideoPlayerModal({
                                                          url: link.url,
                                                          title:
                                                            link.title ||
                                                            `${diffVideo.difficulty} Video`,
                                                          platform:
                                                            link.platform ||
                                                            detectPlatform(
                                                              link.url
                                                            ),
                                                        })
                                                      }
                                                      className="text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                                                    >
                                                      <Play className="h-4 w-4" />
                                                      <span className="text-sm">
                                                        Watch
                                                      </span>
                                                    </button>
                                                  </div>
                                                </div>
                                              )
                                            )}
                                          </div>
                                        ) : (
                                          <p className="text-sm text-gray-500 italic">
                                            No videos added for this difficulty
                                          </p>
                                        )}
                                      </div>
                                    )
                                  )
                                ) : (
                                  <p className="text-sm text-gray-500 italic">
                                    No difficulty videos added yet
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                      {/* Video Content Management Modal */}
                      {editingVideoContent && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="text-xl font-semibold text-gray-900">
                                    Manage Video Content
                                  </h3>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {editingVideoContent.courseName}
                                  </p>
                                </div>
                                <button
                                  onClick={() => setEditingVideoContent(null)}
                                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                  <X className="h-5 w-5 text-gray-500" />
                                </button>
                              </div>
                            </div>

                            <div className="p-6 space-y-6">
                              {/* Video Type Selection */}
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Video Type
                                </label>
                                <select
                                  value={videoEditFormData.type || "none"}
                                  onChange={(e) =>
                                    setVideoEditFormData({
                                      ...videoEditFormData,
                                      type: e.target.value,
                                    })
                                  }
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="none">No Videos</option>
                                  <option value="course">
                                    Course-Level Videos
                                  </option>
                                  <option value="difficulty">
                                    Difficulty-Specific Videos
                                  </option>
                                </select>
                              </div>

                              {/* Course-Level Video Links */}
                              {videoEditFormData.type === "course" && (
                                <div className="space-y-4">
                                  <h4 className="font-medium text-gray-900">
                                    Course Video Links
                                  </h4>

                                  {videoEditFormData.courseVideo?.links?.map(
                                    (link, index) => (
                                      <div
                                        key={index}
                                        className="border rounded-lg p-4 space-y-3"
                                      >
                                        <div className="flex items-start space-x-2">
                                          <div className="flex-1 space-y-2">
                                            <input
                                              type="url"
                                              placeholder="Video URL (YouTube, Vimeo, etc.)"
                                              value={link.url}
                                              onChange={(e) => {
                                                const newLinks = [
                                                  ...videoEditFormData
                                                    .courseVideo.links,
                                                ];
                                                newLinks[index].url =
                                                  e.target.value;
                                                setVideoEditFormData({
                                                  ...videoEditFormData,
                                                  courseVideo: {
                                                    ...videoEditFormData.courseVideo,
                                                    links: newLinks,
                                                  },
                                                });
                                              }}
                                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            />
                                            <input
                                              type="text"
                                              placeholder="Video title (optional)"
                                              value={link.title || ""}
                                              onChange={(e) => {
                                                const newLinks = [
                                                  ...videoEditFormData
                                                    .courseVideo.links,
                                                ];
                                                newLinks[index].title =
                                                  e.target.value;
                                                setVideoEditFormData({
                                                  ...videoEditFormData,
                                                  courseVideo: {
                                                    ...videoEditFormData.courseVideo,
                                                    links: newLinks,
                                                  },
                                                });
                                              }}
                                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            />
                                          </div>

                                          {videoEditFormData.courseVideo.links
                                            .length > 1 && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const newLinks =
                                                  videoEditFormData.courseVideo.links.filter(
                                                    (_, i) => i !== index
                                                  );
                                                setVideoEditFormData({
                                                  ...videoEditFormData,
                                                  courseVideo: {
                                                    ...videoEditFormData.courseVideo,
                                                    links: newLinks,
                                                  },
                                                });
                                              }}
                                              className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </button>
                                          )}
                                        </div>

                                        {/* Platform badge and preview link */}
                                        {link.url && (
                                          <div className="flex items-center justify-between">
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                              ✓ {detectPlatform(link.url)}
                                            </span>

                                            <a
                                              href={link.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:text-blue-700 text-sm flex items-center space-x-1"
                                            >
                                              <Eye className="h-4 w-4" />
                                              <span>Preview</span>
                                            </a>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  )}

                                  {/* Add Link Button */}
                                  {videoEditFormData.courseVideo?.links
                                    ?.length < 2 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newLinks = [
                                          ...(videoEditFormData.courseVideo
                                            ?.links || []),
                                          { url: "", title: "", platform: "" },
                                        ];
                                        setVideoEditFormData({
                                          ...videoEditFormData,
                                          courseVideo: {
                                            ...videoEditFormData.courseVideo,
                                            links: newLinks,
                                          },
                                        });
                                      }}
                                      className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-500 transition-colors flex items-center justify-center space-x-2"
                                    >
                                      <Plus className="h-4 w-4" />
                                      <span>
                                        Add Video Link (
                                        {videoEditFormData.courseVideo?.links
                                          ?.length || 0}
                                        /2)
                                      </span>
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Difficulty-Specific Video Links */}
                              {videoEditFormData.type === "difficulty" && (
                                <div className="space-y-6">
                                  {editingVideoContent.course?.difficulties?.map(
                                    (diff) => (
                                      <div
                                        key={diff.name}
                                        className={`border rounded-lg p-4 ${
                                          diff.name === "Easy"
                                            ? "bg-green-50"
                                            : diff.name === "Medium"
                                            ? "bg-yellow-50"
                                            : "bg-red-50"
                                        }`}
                                      >
                                        <h4 className="font-medium text-gray-900 mb-3">
                                          {diff.name} Difficulty Videos
                                        </h4>

                                        {videoEditFormData.difficultyVideos
                                          ?.find(
                                            (dv) => dv.difficulty === diff.name
                                          )
                                          ?.links?.map((link, index) => (
                                            <div
                                              key={index}
                                              className="mb-3 space-y-2"
                                            >
                                              <div className="flex items-start space-x-2">
                                                <div className="flex-1 space-y-2">
                                                  <input
                                                    type="url"
                                                    placeholder="Video URL"
                                                    value={link.url}
                                                    onChange={(e) => {
                                                      const newDiffVideos = [
                                                        ...videoEditFormData.difficultyVideos,
                                                      ];
                                                      const diffIndex =
                                                        newDiffVideos.findIndex(
                                                          (dv) =>
                                                            dv.difficulty ===
                                                            diff.name
                                                        );
                                                      newDiffVideos[
                                                        diffIndex
                                                      ].links[index].url =
                                                        e.target.value;
                                                      setVideoEditFormData({
                                                        ...videoEditFormData,
                                                        difficultyVideos:
                                                          newDiffVideos,
                                                      });
                                                    }}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                  />
                                                  <input
                                                    type="text"
                                                    placeholder="Video title (optional)"
                                                    value={link.title || ""}
                                                    onChange={(e) => {
                                                      const newDiffVideos = [
                                                        ...videoEditFormData.difficultyVideos,
                                                      ];
                                                      const diffIndex =
                                                        newDiffVideos.findIndex(
                                                          (dv) =>
                                                            dv.difficulty ===
                                                            diff.name
                                                        );
                                                      newDiffVideos[
                                                        diffIndex
                                                      ].links[index].title =
                                                        e.target.value;
                                                      setVideoEditFormData({
                                                        ...videoEditFormData,
                                                        difficultyVideos:
                                                          newDiffVideos,
                                                      });
                                                    }}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                  />
                                                </div>

                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const newDiffVideos = [
                                                      ...videoEditFormData.difficultyVideos,
                                                    ];
                                                    const diffIndex =
                                                      newDiffVideos.findIndex(
                                                        (dv) =>
                                                          dv.difficulty ===
                                                          diff.name
                                                      );
                                                    newDiffVideos[
                                                      diffIndex
                                                    ].links = newDiffVideos[
                                                      diffIndex
                                                    ].links.filter(
                                                      (_, i) => i !== index
                                                    );
                                                    setVideoEditFormData({
                                                      ...videoEditFormData,
                                                      difficultyVideos:
                                                        newDiffVideos,
                                                    });
                                                  }}
                                                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                  <Trash2 className="h-4 w-4" />
                                                </button>
                                              </div>

                                              {link.url && (
                                                <div className="flex items-center justify-between">
                                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                                    ✓ {detectPlatform(link.url)}
                                                  </span>

                                                  <a
                                                    href={link.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:text-blue-700 text-sm flex items-center space-x-1"
                                                  >
                                                    <Eye className="h-4 w-4" />
                                                    <span>Preview</span>
                                                  </a>
                                                </div>
                                              )}
                                            </div>
                                          ))}

                                        {/* Add Link Button for each difficulty */}
                                        {(!videoEditFormData.difficultyVideos?.find(
                                          (dv) => dv.difficulty === diff.name
                                        )?.links ||
                                          videoEditFormData.difficultyVideos?.find(
                                            (dv) => dv.difficulty === diff.name
                                          )?.links.length < 2) && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const newDiffVideos = [
                                                ...videoEditFormData.difficultyVideos,
                                              ];
                                              const diffIndex =
                                                newDiffVideos.findIndex(
                                                  (dv) =>
                                                    dv.difficulty === diff.name
                                                );

                                              if (diffIndex === -1) {
                                                // Create new difficulty video entry
                                                newDiffVideos.push({
                                                  difficulty: diff.name,
                                                  links: [
                                                    {
                                                      url: "",
                                                      title: "",
                                                      platform: "",
                                                    },
                                                  ],
                                                });
                                              } else {
                                                // Add link to existing difficulty
                                                newDiffVideos[
                                                  diffIndex
                                                ].links.push({
                                                  url: "",
                                                  title: "",
                                                  platform: "",
                                                });
                                              }

                                              setVideoEditFormData({
                                                ...videoEditFormData,
                                                difficultyVideos: newDiffVideos,
                                              });
                                            }}
                                            className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-500 transition-colors flex items-center justify-center space-x-2"
                                          >
                                            <Plus className="h-4 w-4" />
                                            <span>
                                              Add Video Link (
                                              {videoEditFormData.difficultyVideos?.find(
                                                (dv) =>
                                                  dv.difficulty === diff.name
                                              )?.links?.length || 0}
                                              /2)
                                            </span>
                                          </button>
                                        )}
                                      </div>
                                    )
                                  )}
                                </div>
                              )}

                              {/* Supported Platforms Info */}
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-xs text-gray-600">
                                  <strong>Supported platforms:</strong> YouTube,
                                  Vimeo, Dailymotion, Wistia
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                  <strong>Note:</strong> Videos must be publicly
                                  embeddable. Private videos will not work.
                                </p>
                              </div>
                            </div>

                            {/* Footer with Save/Cancel buttons */}
                            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl">
                              <div className="flex justify-end space-x-3">
                                <button
                                  onClick={() => setEditingVideoContent(null)}
                                  className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleUpdateVideoContent}
                                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  Save Changes
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Course Modal */}
      {editingCourse && (
        <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4 z-50 bg-black/10 backdrop-blur-md border border-white/20 shadow-lg">
          <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-sm sm:max-w-md mx-2 sm:mx-0">
            <h3 className="text-lg font-semibold mb-4">Edit Course</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course Name
                </label>
                <input
                  type="text"
                  value={editFormData.name || ""}
                  onChange={(e) => {
                    setEditFormData({ ...editFormData, name: e.target.value });
                    // Clear error when user starts typing
                    if (errors.name) {
                      setErrors({ ...errors, name: "" });
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.name
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  }`}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editFormData.description || ""}
                  onChange={(e) => {
                    setEditFormData({
                      ...editFormData,
                      description: e.target.value,
                    });
                    // Clear error when user starts typing
                    if (errors.description) {
                      setErrors({ ...errors, description: "" });
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 resize-none ${
                    errors.description
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  }`}
                  rows="3"
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.description}
                  </p>
                )}
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Category
                </label>
                <select
                  value={editFormData.category || ""}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      category: e.target.value || null,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No Category</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Course Type
                </label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={editFormData.isPaid || false}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            isPaid: e.target.checked,
                            price: e.target.checked ? editFormData.price : 0,
                          })
                        }
                        className="sr-only"
                      />
                      <div
                        className={`w-12 h-6 sm:w-14 sm:h-8 rounded-full transition-all duration-300 ease-in-out shadow-inner flex items-center ${
                          editFormData.isPaid
                            ? "bg-gradient-to-r from-blue-500 to-blue-600 shadow-blue-200"
                            : "bg-gray-300 hover:bg-gray-400"
                        } group-hover:shadow-lg`}
                      >
                        <div
                          className={`w-4 h-4 sm:w-5 sm:h-5 bg-white rounded-full shadow-md transform transition-all duration-300 ease-in-out ${
                            editFormData.isPaid
                              ? "translate-x-7 sm:translate-x-8 shadow-lg"
                              : "translate-x-1 shadow-sm"
                          } group-hover:shadow-lg`}
                        ></div>
                      </div>
                    </div>
                    <span
                      className={`ml-3 text-xs sm:text-sm font-medium transition-colors duration-200 ${
                        editFormData.isPaid ? "text-blue-700" : "text-gray-700"
                      }`}
                    >
                      {editFormData.isPaid ? "Paid Course" : "Free Course"}
                    </span>
                  </label>
                </div>

                {editFormData.isPaid && (
                  <div className="mt-3 transition-all duration-300 ease-in-out">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                      Price (₹)
                    </label>
                    <input
                      type="number"
                      value={editFormData.price || ""}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          price: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 bg-white shadow-sm text-sm sm:text-base"
                      placeholder="Enter price"
                      min="0"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editFormData.isActive || false}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      isActive: e.target.checked,
                    })
                  }
                  className="mr-2"
                />
                <label
                  htmlFor="isActive"
                  className="text-sm font-medium text-gray-700"
                >
                  Active
                </label>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleCancelEdit}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateCourse}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmCourse && (
        <div className="fixed inset-0 bg-opacity-30 flex items-center justify-center p-2 sm:p-4 z-50 bg-black/10 backdrop-blur-md border border-white/20 shadow-lg">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete Course
                </h3>
                <p className="text-sm text-gray-600">
                  This action cannot be undone
                </p>
              </div>
            </div>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete "{deleteConfirmCourse.name}"?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setDeleteConfirmCourse(null)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Question Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 bg-opacity-30 flex items-center justify-center p-2 sm:p-4 z-50 bg-black/10 backdrop-blur-md border border-white/20 shadow-lg">
          <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-sm sm:max-w-2xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-0">
            <h3 className="text-lg font-semibold mb-4">Edit Question</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Question
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowEditPreview(!showEditPreview)}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                  >
                    <Eye className="h-3 w-3" />
                    <span>{showEditPreview ? "Hide" : "Show"} Preview</span>
                  </button>
                </div>

                <textarea
                  value={questionFormData.question || ""}
                  onChange={(e) =>
                    setQuestionFormData({
                      ...questionFormData,
                      question: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
                  rows="5"
                  placeholder="Use `code`, ```language for blocks, $math$ for equations"
                />

                {showEditPreview && questionFormData.question && (
                  <div className="mt-2 border border-gray-300 rounded-lg p-3 bg-gray-50">
                    <p className="text-xs text-gray-600 mb-2 font-semibold">
                      Preview:
                    </p>
                    <RichTextRenderer content={questionFormData.question} />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                  <button
                    onClick={() =>
                      setQuestionFormData({
                        ...questionFormData,
                        questionType: "single",
                      })
                    }
                    className={`p-3 border-2 rounded-lg text-center transition-all cursor-pointer ${
                      questionFormData.questionType === "single"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-medium">Single Answer</div>
                  </button>
                  <button
                    onClick={() =>
                      setQuestionFormData({
                        ...questionFormData,
                        questionType: "multiple",
                      })
                    }
                    className={`p-3 border-2 rounded-lg text-center transition-all cursor-pointer${
                      questionFormData.questionType === "multiple"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-medium">Multiple Choice</div>
                  </button>
                  <button
                    onClick={() =>
                      setQuestionFormData({
                        ...questionFormData,
                        questionType: "truefalse",
                      })
                    }
                    className={`p-3 border-2 rounded-lg text-center transition-all cursor-pointer ${
                      questionFormData.questionType === "truefalse"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-medium">True/False</div>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Answer *
                </label>

                {questionFormData.questionType === "single" && (
                  <input
                    type="text"
                    value={questionFormData.singleAnswer}
                    onChange={(e) =>
                      setQuestionFormData({
                        ...questionFormData,
                        singleAnswer: e.target.value,
                      })
                    }
                    placeholder="Enter the correct answer..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}

                {questionFormData.questionType === "multiple" && (
                  <div className="space-y-3">
                    {questionFormData.options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <input
                          type="radio"
                          id={`edit-option-${index}`}
                          name="editCorrectAnswer"
                          checked={questionFormData.correctAnswer === index}
                          onChange={() =>
                            setQuestionFormData({
                              ...questionFormData,
                              correctAnswer: index,
                            })
                          }
                          className="w-4 h-4 text-blue-600"
                        />
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...questionFormData.options];
                            newOptions[index] = e.target.value;
                            setQuestionFormData({
                              ...questionFormData,
                              options: newOptions,
                            });
                          }}
                          placeholder={`Option ${index + 1}...`}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {questionFormData.questionType === "truefalse" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <button
                      onClick={() =>
                        setQuestionFormData({
                          ...questionFormData,
                          truefalseAnswer: true,
                        })
                      }
                      className={`p-4 rounded-lg border-2 transition-all font-medium cursor-pointer ${
                        questionFormData.truefalseAnswer === true
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-gray-200 hover:border-blue-300"
                      }`}
                    >
                      ✅ True
                    </button>
                    <button
                      onClick={() =>
                        setQuestionFormData({
                          ...questionFormData,
                          truefalseAnswer: false,
                        })
                      }
                      className={`p-4 rounded-lg border-2 transition-all font-medium cursor-pointer ${
                        questionFormData.truefalseAnswer === false
                          ? "border-red-500 bg-red-50 text-red-700"
                          : "border-gray-200 hover:border-blue-300"
                      }`}
                    >
                      ❌ False
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Explanation
                </label>
                <textarea
                  value={questionFormData.explanation || ""}
                  onChange={(e) =>
                    setQuestionFormData({
                      ...questionFormData,
                      explanation: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows="3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Question Image (Optional)
                </label>
                <div className="space-y-3">
                  {questionFormData.image && !imageEditMode ? (
                    // Display mode
                    <div className="relative">
                      <img
                        src={
                          questionFormData.image.url || questionFormData.image
                        }
                        alt="Question"
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <div className="absolute top-2 right-2 flex space-x-1">
                        <button
                          type="button"
                          onClick={() => setImageEditMode(true)}
                          className="bg-blue-500 text-white rounded-full p-1 hover:bg-blue-600 cursor-pointer"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setQuestionFormData({
                              ...questionFormData,
                              image: null,
                            });
                            setImageEditMode(false);
                          }}
                          className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600 cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Upload mode
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          handleImageUpload(e, "edit");
                          setImageEditMode(false);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {questionFormData.image && (
                        <button
                          type="button"
                          onClick={() => setImageEditMode(false)}
                          className="mt-2 text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Difficulty
                  </label>
                  <select
                    value={questionFormData.difficulty || "Easy"}
                    onChange={(e) =>
                      setQuestionFormData({
                        ...questionFormData,
                        difficulty: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div className="flex items-center pt-6">
                  <input
                    type="checkbox"
                    id="questionActive"
                    checked={questionFormData.isActive !== false}
                    onChange={(e) =>
                      setQuestionFormData({
                        ...questionFormData,
                        isActive: e.target.checked,
                      })
                    }
                    className="mr-2"
                  />
                  <label
                    htmlFor="questionActive"
                    className="text-sm font-medium text-gray-700"
                  >
                    Active
                  </label>
                </div>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setEditingQuestion(null)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateQuestion}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Update Question
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Question Modal with Glassmorphism Effect */}
      {addingQuestion && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center p-4 z-50 bg-black/10 backdrop-blur-md border border-white/20 shadow-lg">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm sm:max-w-2xl lg:max-w-3xl max-h-[95vh] overflow-y-auto mx-2 sm:mx-0">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Add New Question
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Difficulty:{" "}
                    <span className="font-medium text-blue-600">
                      {addingQuestion.difficulty}
                    </span>
                    {addingQuestion.marksPerQuestion && (
                      <span className="ml-3">
                        Marks:{" "}
                        <span className="font-medium text-green-600">
                          {addingQuestion.marksPerQuestion}
                        </span>
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setAddingQuestion(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Question Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Question Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                  <button
                    onClick={() =>
                      setNewQuestionData({
                        ...newQuestionData,
                        questionType: "single",
                      })
                    }
                    className={`p-4 border-2 rounded-lg text-center transition-all cursor-pointer ${
                      newQuestionData.questionType === "single"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-medium">Single Answer</div>
                    <div className="text-xs text-gray-500 mt-1">Text input</div>
                  </button>
                  <button
                    onClick={() =>
                      setNewQuestionData({
                        ...newQuestionData,
                        questionType: "multiple",
                      })
                    }
                    className={`p-4 border-2 rounded-lg text-center transition-all cursor-pointer ${
                      newQuestionData.questionType === "multiple"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-medium">Multiple Choice</div>
                    <div className="text-xs text-gray-500 mt-1">4 options</div>
                  </button>
                  <button
                    onClick={() =>
                      setNewQuestionData({
                        ...newQuestionData,
                        questionType: "truefalse",
                      })
                    }
                    className={`p-4 border-2 rounded-lg text-center transition-all cursor-pointer${
                      newQuestionData.questionType === "truefalse"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-medium">True/False</div>
                    <div className="text-xs text-gray-500 mt-1">Boolean</div>
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Text *
                </label>
                <div>
                  <textarea
                    value={newQuestionData.question}
                    onChange={(e) =>
                      setNewQuestionData({
                        ...newQuestionData,
                        question: e.target.value,
                      })
                    }
                    placeholder="Enter your question here..."
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent resize-none ${
                      newQuestionData.question.length > 0 &&
                      newQuestionData.question.length < 10
                        ? "border-red-300 focus:ring-red-500"
                        : newQuestionData.question.length > 1000
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"
                    }`}
                    rows="4"
                    maxLength="1000"
                  />
                  <div className="flex justify-between text-xs mt-1">
                    <span
                      className={`${
                        newQuestionData.question.length < 10 &&
                        newQuestionData.question.length > 0
                          ? "text-red-500"
                          : "text-gray-500"
                      }`}
                    >
                      {newQuestionData.question.length < 10
                        ? `Minimum 10 characters (${
                            10 - newQuestionData.question.length
                          } more needed)`
                        : "Minimum requirement met"}
                    </span>
                    <span
                      className={`${
                        newQuestionData.question.length > 1000
                          ? "text-red-500"
                          : "text-gray-500"
                      }`}
                    >
                      {newQuestionData.question.length}/1000
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Image (Optional)
                </label>
                <div className="space-y-3">
                  {newQuestionData.image ? (
                    <div className="relative">
                      <img
                        src={newQuestionData.image.url}
                        alt="Question preview"
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setNewQuestionData({
                            ...newQuestionData,
                            image: null,
                          })
                        }
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, "add")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              </div>
              {/* Answer Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Answer *
                </label>

                {newQuestionData.questionType === "single" && (
                  <div>
                    <input
                      type="text"
                      value={newQuestionData.singleAnswer}
                      onChange={(e) =>
                        setNewQuestionData({
                          ...newQuestionData,
                          singleAnswer: e.target.value,
                        })
                      }
                      placeholder="Enter the correct answer..."
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent ${
                        newQuestionData.singleAnswer.length > 2500
                          ? "border-red-300 focus:ring-red-500"
                          : "border-gray-300 focus:ring-blue-500"
                      }`}
                      maxLength="2500"
                    />
                    <div className="text-xs mt-1 text-right">
                      <span
                        className={`${
                          newQuestionData.singleAnswer.length > 2500
                            ? "text-red-500"
                            : "text-gray-500"
                        }`}
                      >
                        {newQuestionData.singleAnswer.length}/2500
                      </span>
                    </div>
                  </div>
                )}

                {newQuestionData.questionType === "multiple" && (
                  <div className="space-y-3">
                    {newQuestionData.options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <input
                          type="radio"
                          id={`option-${index}`}
                          name="correctAnswer"
                          checked={newQuestionData.correctAnswer === index}
                          onChange={() =>
                            setNewQuestionData({
                              ...newQuestionData,
                              correctAnswer: index,
                            })
                          }
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...newQuestionData.options];
                            newOptions[index] = e.target.value;
                            setNewQuestionData({
                              ...newQuestionData,
                              options: newOptions,
                            });
                          }}
                          placeholder={`Option ${index + 1}...`}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <label
                          htmlFor={`option-${index}`}
                          className="text-sm text-gray-500"
                        >
                          {newQuestionData.correctAnswer === index
                            ? "Correct"
                            : "Option"}
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                {newQuestionData.questionType === "truefalse" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <button
                      onClick={() =>
                        setNewQuestionData({
                          ...newQuestionData,
                          truefalseAnswer: true,
                        })
                      }
                      className={`p-4 rounded-lg border-2 transition-all duration-200 font-medium cursor-pointer ${
                        newQuestionData.truefalseAnswer === true
                          ? "border-green-500 bg-green-50 text-green-700 shadow-md"
                          : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                      }`}
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <span className="text-lg">✅</span>
                        <span>True</span>
                      </div>
                    </button>
                    <button
                      onClick={() =>
                        setNewQuestionData({
                          ...newQuestionData,
                          truefalseAnswer: false,
                        })
                      }
                      className={`p-4 rounded-lg border-2 transition-all duration-200 font-medium cursor-pointer ${
                        newQuestionData.truefalseAnswer === false
                          ? "border-red-500 bg-red-50 text-red-700 shadow-md"
                          : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                      }`}
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <span className="text-lg">❌</span>
                        <span>False</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Explanation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Explanation *
                </label>
                <div>
                  <textarea
                    value={newQuestionData.explanation}
                    onChange={(e) =>
                      setNewQuestionData({
                        ...newQuestionData,
                        explanation: e.target.value,
                      })
                    }
                    placeholder="Provide an explanation for the answer (minimum 10 characters)..."
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent resize-none ${
                      newQuestionData.explanation.length > 0 &&
                      newQuestionData.explanation.length < 10
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-blue-500"
                    }`}
                    rows="3"
                  />
                  <div className="text-xs mt-1">
                    <span
                      className={`${
                        newQuestionData.explanation.length < 10 &&
                        newQuestionData.explanation.length > 0
                          ? "text-red-500"
                          : "text-gray-500"
                      }`}
                    >
                      {newQuestionData.explanation.length < 10
                        ? `Minimum 10 characters (${
                            10 - newQuestionData.explanation.length
                          } more needed)`
                        : "Minimum requirement met"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setAddingQuestion(null)}
                  className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateQuestion}
                  disabled={
                    !newQuestionData.question.trim() ||
                    newQuestionData.question.length < 10 ||
                    newQuestionData.question.length > 1000 ||
                    !newQuestionData.explanation.trim() ||
                    newQuestionData.explanation.length < 10 ||
                    (newQuestionData.questionType === "single" &&
                      !newQuestionData.singleAnswer.trim()) ||
                    (newQuestionData.questionType === "multiple" &&
                      newQuestionData.options.some((opt) => !opt.trim()))
                  }
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Add Question
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Delete Question
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this question? This action
                cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeleteConfirmation(null)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteQuestion}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {bulkDeleteConfirmation && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Delete Selected Questions
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete {bulkDeleteConfirmation.count}{" "}
                selected questions? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setBulkDeleteConfirmation(null)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBulkDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
                >
                  Delete {bulkDeleteConfirmation.count} Questions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Video Player Modal */}
      {videoPlayerModal && (
        <VideoPlayerModal
          video={videoPlayerModal}
          onClose={() => setVideoPlayerModal(null)}
        />
      )}

      {/* Generic Confirmation Modal */}
      {confirmationModal && (
        <ConfirmationModal
          modal={confirmationModal}
          onClose={() => setConfirmationModal(null)}
        />
      )}
      {confirmationModal && (
        <ConfirmationModal
          modal={confirmationModal}
          onClose={() => setConfirmationModal(null)}
        />
      )}

      {/* Add Coupon Modal */}
      {addingCoupon && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Create Coupon
                </h3>
                <button
                  onClick={() => setAddingCoupon(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <CouponForm
                courseId={addingCoupon}
                onSuccess={() => {
                  setAddingCoupon(null);
                  // Reload the expanded course to show new coupon
                  if (expandedCourse === addingCoupon) {
                    handleExpandCourse(addingCoupon);
                  }
                }}
                onCancel={() => setAddingCoupon(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Courses;
