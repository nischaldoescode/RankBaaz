import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "./AuthContext";

const AdminContext = createContext();

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
};

export const AdminProvider = ({ children }) => {
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [processingVideo, setProcessingVideo] = useState(false);
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalQuestions: 0,
    totalUsers: 0,
    totalTests: 0,
  });

  // Get authentication status
  const { isAuthenticated, user } = useAuth();

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/courses/categories");
      if (response.data.success) {
        setCategories(response.data.data.categories);
        return { success: true, categories: response.data.data.categories };
      }
      return { success: false, message: "Failed to fetch categories" };
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to fetch categories");
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  };

  const createCategory = async (categoryData) => {
    try {
      setLoading(true);
      const response = await axios.post("/courses/categories", categoryData);

      if (response.data.success) {
        await fetchCategories(); // Refresh categories to get updated course counts
        toast.success("Category created successfully!");

        // Dispatch notification event
        window.dispatchEvent(
          new CustomEvent("adminOperation", {
            detail: {
              operation: "createCategory",
              success: true,
              data: response.data.data.category,
            },
          })
        );
        return { success: true, data: response.data.data.category };
      }
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to create category";
      toast.error(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const updateCategory = async (categoryId, categoryData) => {
    try {
      setLoading(true);
      const response = await axios.put(
        `/courses/categories/${categoryId}`,
        categoryData
      );

      if (response.data.success) {
        await fetchCategories();
        toast.success("Category updated successfully!");

        // Dispatch notification event
        window.dispatchEvent(
          new CustomEvent("adminOperation", {
            detail: { operation: "updateCategory", success: true },
          })
        );
        return { success: true };
      }
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to update category";
      toast.error(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (categoryId) => {
    try {
      setLoading(true);
      const response = await axios.delete(`/courses/categories/${categoryId}`);

      if (response.data.success) {
        await fetchCategories(); // Refresh categories to get updated course counts
        toast.success("Category deleted successfully!");

        // Dispatch notification event
        window.dispatchEvent(
          new CustomEvent("adminOperation", {
            detail: { operation: "deleteCategory", success: true },
          })
        );
        return { success: true };
      }
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to delete category";
      toast.error(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const toggleCourseStatus = async (courseId) => {
    try {
      const response = await axios.patch(`/courses/${courseId}/toggle-status`);

      const data = response.data;

      if (data.success) {
        // Update local state immediately
        setCourses((prev) =>
          prev.map((course) =>
            course._id === courseId
              ? {
                  ...course,
                  isActive: data.data?.course?.isActive ?? !course.isActive,
                }
              : course
          )
        );
        toast.success(data.message);
        return { success: true, data: data.data };
      } else {
        toast.error(data.message || "Failed to toggle course status");
        return { success: false };
      }
    } catch (error) {
      console.error("Toggle course status error:", error);
      toast.error(
        error.response?.data?.message || "Failed to toggle course status"
      );
      return { success: false };
    }
  };
  const fetchCourses = async (force = false) => {
    try {
      // Don't show loading for background refreshes
      if (force) setLoading(true);

      const response = await axios.get("/courses/admin/all", {
        // Add cache busting for forced refreshes
        params: force ? { _t: Date.now() } : {},
      });

      if (response.data.success) {
        const coursesData = response.data.data?.courses || [];
        // Transform backend data to match frontend expectations
        const transformedCourses = coursesData.map((course) => ({
          ...course,
          name: course.title || course.name,
          isActive:
            course.isActive !== undefined
              ? course.isActive
              : course.status === "active",
          // Transform difficulties to difficultyLevels for frontend compatibility
          difficultyLevels:
            course.difficulties?.map((diff) => ({
              difficulty: diff.name,
              maxQuestions: course.maxQuestionsPerTest || 20,
              marksPerQuestion: diff.marksPerQuestion,
              timeLimit: diff.timerSettings?.maxTime || null,
            })) || [],
          // Transform image structure
          image: course.image?.url || course.image,
          // Set categoryId from course data or default
          categoryId:
            course.category?._id ||
            course.category ||
            course.categoryId ||
            null,
          categoryName: course.category?.name || "Uncategorized",
          videoContent: course.videoContent || null,
        }));
        setCourses(Array.isArray(transformedCourses) ? transformedCourses : []);
      } else {
        setCourses([]);
      }
    } catch (error) {
      setCourses([]);
      if (error.response?.status !== 401) {
        const message =
          error.response?.data?.message || "Failed to fetch courses";
        toast.error(message);
      }
      console.error("Error fetching courses:", error);
    } finally {
      if (force) setLoading(false);
    }
  };

  const validateVideoContent = (videoContent) => {
    if (videoContent.type === "course") {
      const hasUpload = !!videoContent.courseVideo?.uploadedVideo;
      const hasLinks = videoContent.courseVideo?.links?.length > 0;

      if (hasUpload && hasLinks) {
        throw new Error(
          "Cannot have both uploaded video and links for course-level video"
        );
      }
      if (hasLinks && videoContent.courseVideo.links.length > 2) {
        throw new Error("Maximum 2 video links allowed for course-level video");
      }
    } else if (videoContent.type === "difficulty") {
      videoContent.difficultyVideos.forEach((diffVideo) => {
        const hasUpload = !!diffVideo.uploadedVideo;
        const hasLinks = diffVideo.links?.length > 0;

        if (hasUpload && hasLinks) {
          throw new Error(
            `Cannot have both uploaded video and links for ${diffVideo.difficulty}`
          );
        }
        if (hasLinks && diffVideo.links.length > 2) {
          throw new Error(
            `Maximum 2 video links allowed for ${diffVideo.difficulty}`
          );
        }
      });
    }
    return true;
  };

  const createCourse = async (courseData, silent = false) => {
    try {
      setLoading(true);
      setVideoUploadProgress(0);

      // Create FormData for file upload
      const formData = new FormData();

      // Append basic course data
      formData.append("name", courseData.name);
      if (courseData.description)
        formData.append("description", courseData.description);
      if (courseData.category) {
        formData.append("category", courseData.category);
      }

      // Append difficulties
      formData.append("difficulties", JSON.stringify(courseData.difficulties));
      formData.append("maxQuestionsPerTest", courseData.maxQuestionsPerTest);

      // Append payment info
      let isPaid = courseData.isPaid;
      if (typeof isPaid === "string") {
        isPaid = isPaid.toLowerCase() === "true";
      }
      formData.append("isPaid", isPaid);
      formData.append("price", isPaid ? courseData.price || 0 : 0);

      // Append course image
      if (courseData.image && courseData.image instanceof File) {
        formData.append("image", courseData.image);
      }

      // Handle video content properly
      if (isPaid && courseData.videoContent) {
        const { type, courseVideo, difficultyVideos } = courseData.videoContent;

        formData.append("videoType", type);

        if (type === "course" && courseVideo?.links?.length > 0) {
          // Validate and append course video links
          const validLinks = courseVideo.links.filter(
            (link) => link.url && link.url.trim()
          );

          if (validLinks.length > 0) {
            formData.append("courseVideoLinks", JSON.stringify(validLinks));
          }
        } else if (type === "difficulty") {
          // Handle difficulty-level video links
          const diffVideosData = {};

          if (difficultyVideos && difficultyVideos.length > 0) {
            difficultyVideos.forEach((diffVideo) => {
              const validLinks = diffVideo.links?.filter(
                (link) => link.url && link.url.trim()
              );

              // Only add if there are valid links
              if (validLinks && validLinks.length > 0) {
                diffVideosData[diffVideo.difficulty] = {
                  links: validLinks,
                };
              }
            });
          }

          // Only append if we have at least one difficulty with links
          if (Object.keys(diffVideosData).length > 0) {
            formData.append(
              "difficultyVideosData",
              JSON.stringify(diffVideosData)
            );
          } else {
            // If no valid links, don't send difficultyVideosData at all
            // This prevents backend from requiring links
            formData.append("videoType", "none");
          }
        }
      }

      // Add questions if they exist
      if (courseData.questions && courseData.questions.length > 0) {
        const questionsForJson = courseData.questions.map((q, index) => {
          const { questionImage, imagePreview, ...cleanQuestion } = q;
          if (questionImage && questionImage instanceof File) {
            cleanQuestion.hasImageAtIndex = index;
          }
          return cleanQuestion;
        });

        formData.append("questions", JSON.stringify(questionsForJson));

        // Append question images
        courseData.questions.forEach((question) => {
          if (
            question.questionImage &&
            question.questionImage instanceof File
          ) {
            formData.append("questionImages", question.questionImage);
          }
        });
      }

      // Upload with progress tracking
      const response = await axios.post("/courses", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setVideoUploadProgress(percentCompleted);
        },
      });

      if (response.data.success) {
        if (!silent) {
          toast.success("Course created successfully!");
        }
        return { success: true, data: response.data.data };
      } else {
        const errorMsg = response.data.message || "Failed to create course";
        if (!silent) {
          toast.error(errorMsg);
        }
        return { success: false, message: errorMsg };
      }
    } catch (error) {
      if (error.response?.status !== 401) {
        let message = "Failed to create course";

        if (
          error.response?.data?.errors &&
          error.response.data.errors.length > 0
        ) {
          message = error.response.data.errors[0].msg;
        } else if (error.response?.data?.message) {
          message = error.response.data.message;
        }

        toast.error(message);
      }
      return {
        success: false,
        message:
          error.response?.data?.errors?.[0]?.msg ||
          error.response?.data?.message ||
          "Failed to create course",
      };
    } finally {
      setLoading(false);
      setProcessingVideo(false);
      setVideoUploadProgress(0);
    }
  };

  const updateCourse = async (courseId, courseData) => {
    try {
      setLoading(true);

      // Create FormData for file upload
      const formData = new FormData();

      // Append course data
      if (courseData.name) formData.append("name", courseData.name);
      if (courseData.description)
        formData.append("description", courseData.description);

      if (courseData.category !== undefined)
        formData.append("category", courseData.category);
      // Only append difficulties if they exist in courseData
      if (courseData.difficulties && courseData.difficulties.length > 0) {
        formData.append(
          "difficulties",
          JSON.stringify(courseData.difficulties)
        ); // ← Use JSON.stringify like in create
      }

      if (courseData.maxQuestionsPerTest)
        formData.append("maxQuestionsPerTest", courseData.maxQuestionsPerTest);
      if (courseData.isActive !== undefined)
        formData.append("isActive", courseData.isActive);

      // Add these lines:
      if (courseData.isPaid !== undefined) {
        formData.append("isPaid", courseData.isPaid);
        formData.append("price", courseData.isPaid ? courseData.price || 0 : 0);

        // If changing from paid to free, backend will handle video deletions
        if (courseData.isPaid && courseData.videoContent) {
          const { type, courseVideo, difficultyVideos } =
            courseData.videoContent;
          formData.append("videoType", type);

          // Handle course video
          if (type === "course") {
            if (courseVideo?.uploadedVideo instanceof File) {
              formData.append("courseVideo", courseVideo.uploadedVideo);
            } else if (courseVideo?.links?.length > 0) {
              formData.append(
                "courseVideoLinks",
                JSON.stringify(courseVideo.links)
              );
            }
          }

          // Handle difficulty videos
          else if (type === "difficulty") {
            const diffVideosData = {};
            let hasUploadedVideo = false;
            let uploadedDifficulty = null;

            difficultyVideos.forEach((diffVideo) => {
              if (diffVideo.uploadedVideo instanceof File) {
                hasUploadedVideo = true;
                uploadedDifficulty = diffVideo.difficulty;
              } else if (diffVideo.links?.length > 0) {
                diffVideosData[diffVideo.difficulty] = {
                  links: diffVideo.links,
                };
              }
            });

            if (Object.keys(diffVideosData).length > 0) {
              formData.append(
                "difficultyVideosData",
                JSON.stringify(diffVideosData)
              );
            }

            if (hasUploadedVideo) {
              const uploadedDiffVideo = difficultyVideos.find(
                (dv) => dv.difficulty === uploadedDifficulty
              );
              formData.append(
                "difficultyVideo",
                uploadedDiffVideo.uploadedVideo
              );
              formData.append("difficultyVideoTarget", uploadedDifficulty);
            }
          }
        }
      } else if (!courseData.isPaid) {
        formData.append("videoType", "remove");
      }

      // Append image if exists
      if (courseData.image && courseData.image instanceof File) {
        formData.append("image", courseData.image);
      }

      const response = await axios.put(
        `/courses/update/${courseId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      if (response.data.success) {
        // Update specific course in state instead of full refresh
        setCourses((prev) =>
          prev.map((course) =>
            course._id === courseId
              ? { ...course, ...formData, updatedAt: new Date() }
              : course
          )
        );
        // Dispatch notification event
        window.dispatchEvent(
          new CustomEvent("adminOperation", {
            detail: { operation: "updateCourse", success: true },
          })
        );
        return { success: true };
      }
    } catch (error) {
      if (error.response?.status !== 401) {
        // Check if it's a validation error first
        let message = "Failed to update course";

        if (
          error.response?.data?.errors &&
          error.response.data.errors.length > 0
        ) {
          // Get the first validation error message
          message = error.response.data.errors[0].msg;
        } else if (error.response?.data?.message) {
          // Get the general error message
          message = error.response.data.message;
        }

        toast.error(message);
      }
      return {
        success: false,
        message:
          error.response?.data?.errors?.[0]?.msg ||
          error.response?.data?.message ||
          "Failed to update course",
      };
    } finally {
      setLoading(false);
    }
  };

  const deleteCourse = async (courseId) => {
    try {
      setLoading(true);
      const response = await axios.delete(`/courses/${courseId}`);

      if (response.data.success) {
        // Update local state immediately to prevent flicker
        setCourses((prev) => prev.filter((course) => course._id !== courseId));

        // Background refresh without loading state
        Promise.all([fetchCourses(false), fetchCategories()]);

        // Dispatch notification event
        window.dispatchEvent(
          new CustomEvent("adminOperation", {
            detail: { operation: "updateCourse", success: true },
          })
        );
        return { success: true };
      }
    } catch (error) {
      if (error.response?.status !== 401) {
        const message =
          error.response?.data?.message || "Failed to delete course";
        toast.error(message);
      }
      return {
        success: false,
        message: error.response?.data?.message || "Failed to delete course",
      };
    } finally {
      setLoading(false);
    }
  };

  // Questions Management
  const fetchQuestions = async (courseId) => {
    try {
      setLoading(true);
      const response = await axios.get(`/courses/${courseId}/questions`);
      if (!courseId || courseId === "undefined") {
        console.error("Invalid courseId provided to fetchQuestions");
        return [];
      }
      if (response.data.success) {
        const questionsData = response.data.data?.questions || [];
        setQuestions(Array.isArray(questionsData) ? questionsData : []);
        return questionsData;
      } else {
        setQuestions([]);
        return [];
      }
    } catch (error) {
      setQuestions([]);
      if (error.response?.status !== 401) {
        const message =
          error.response?.data?.message || "Failed to fetch questions";
        toast.error(message);
      }
      console.error("Error fetching questions:", error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const createQuestion = async (questionData) => {
    try {
      setLoading(true);

      // Create FormData if image is present
      let payload = questionData;
      let config = {};

      if (questionData.image && questionData.image.file) {
        const formData = new FormData();

        // Add all text fields
        Object.keys(questionData).forEach((key) => {
          if (key !== "image") {
            if (typeof questionData[key] === "object") {
              formData.append(key, JSON.stringify(questionData[key]));
            } else {
              formData.append(key, questionData[key]);
            }
          }
        });

        // Add image file
        formData.append("image", questionData.image.file);

        payload = formData;
        config = {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        };
      }

      const response = await axios.post(
        `/courses/${questionData.course}/questions`,
        payload,
        config
      );
      if (response.data.success) {
        toast.success("Question created successfully!");
        return {
          success: true,
          data: response.data.data?.question || {},
        };
      }
    } catch (error) {
      if (error.response?.status !== 401) {
        const message =
          error.response?.data?.message || "Failed to create question";
        toast.error(message);
      }
      return {
        success: false,
        message: error.response?.data?.message || "Failed to create question",
      };
    } finally {
      setLoading(false);
    }
  };

  const updateQuestion = async (courseId, questionId, questionData) => {
    try {
      setLoading(true);

      // Create FormData if image is present
      let payload = questionData;
      let config = {};

      if (questionData.image && questionData.image.file) {
        const formData = new FormData();

        // Add all text fields
        Object.keys(questionData).forEach((key) => {
          if (key !== "image") {
            if (typeof questionData[key] === "object") {
              formData.append(key, JSON.stringify(questionData[key]));
            } else {
              formData.append(key, questionData[key]);
            }
          }
        });

        // Add image file
        formData.append("image", questionData.image.file);

        payload = formData;
        config = {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        };
      }

      const response = await axios.put(
        `/courses/${courseId}/questions/${questionId}`,
        payload,
        config
      );
      if (response.data.success) {
        toast.success("Question updated successfully!");
        return { success: true };
      }
    } catch (error) {
      if (error.response?.status !== 401) {
        const message =
          error.response?.data?.message || "Failed to update question";
        toast.error(message);
      }
      return {
        success: false,
        message: error.response?.data?.message || "Failed to update question",
      };
    } finally {
      setLoading(false);
    }
  };

  // Add a silent flag to deleteQuestion
  const deleteQuestion = async (courseId, questionId, silent = false) => {
    try {
      const response = await axios.delete(
        `/courses/${courseId}/questions/${questionId}`
      );

      if (response.data.success) {
        // Only show toast if not silent
        if (!silent) {
          toast.success("Question deleted successfully!");
        }
        return { success: true };
      }
    } catch (error) {
      if (!silent) {
        toast.error(
          error.response?.data?.message || "Failed to delete question"
        );
      }
      return { success: false, message: error.response?.data?.message };
    }
  };

  const bulkDeleteQuestions = async (courseId, questionIds) => {
    try {
      const response = await axios.delete(
        `/courses/${courseId}/questions/bulk`,
        { data: { questionIds } }
      );

      if (response.data.success) {
        // Immediately update courses state to reflect question count changes
        setCourses((prev) =>
          prev.map((course) =>
            course._id === courseId
              ? {
                  ...course,
                  totalQuestions:
                    (course.totalQuestions || 0) - response.data.deletedCount,
                }
              : course
          )
        );

        toast.success(response.data.message);
        return {
          success: true,
          successful: response.data.deletedCount,
          failed: 0,
        };
      }
      return { success: false, successful: 0, failed: questionIds.length };
    } catch (error) {
      const message =
        error.response?.data?.message || "Bulk delete operation failed";
      toast.error(message);
      return { success: false, successful: 0, failed: questionIds.length };
    }
  };

  const createCourseWithQuestions = async (courseData, questions) => {
    try {
      setLoading(true);

      // First validate that we have questions
      const hasQuestions = Object.values(questions).some(
        (questionList) => questionList && questionList.length > 0
      );

      if (!hasQuestions) {
        toast.error("At least one question is required");
        return {
          success: false,
          message: "At least one question is required",
        };
      }

      // Prepare questions for bulk import
      const allQuestions = [];
      Object.entries(questions).forEach(([difficulty, questionList]) => {
        if (questionList && questionList.length > 0) {
          const formattedQuestions = questionList.map((q) => ({
            difficulty:
              difficulty.charAt(0).toUpperCase() +
              difficulty.slice(1).toLowerCase(),
            question: q.question,
            questionType: q.questionType,
            numberOfOptions: q.numberOfOptions || 0,
            options:
              q.questionType === "multiple"
                ? q.options.filter((opt) => opt.trim())
                : q.questionType === "truefalse"
                ? ["True", "False"]
                : [],
            correctAnswer:
              q.questionType === "multiple"
                ? q.correctAnswer
                : q.questionType === "truefalse"
                ? q.correctAnswer
                : q.singleAnswer,
            explanation: q.explanation,
            questionImage: q.questionImage || null,
          }));
          allQuestions.push(...formattedQuestions);
        }
      });

      // Create course with questions in the payload
      const courseDataWithQuestions = {
        ...courseData,
        questions: allQuestions,
      };

      const courseResult = await createCourse(courseDataWithQuestions);

      if (courseResult.success) {
        await fetchCourses();
        toast.success("Course and questions created successfully!");
        return { success: true, data: courseResult.data };
      } else {
        console.error("Course creation failed:", courseResult);
        const errorMsg = courseResult.message || "Failed to create course";
        toast.error(errorMsg);
        return courseResult;
      }
    } catch (error) {
      if (error.response?.status !== 401) {
        const message =
          error.response?.data?.message ||
          "Failed to create course with questions";
        toast.error(message);
      }
      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Failed to create course with questions",
      };
    } finally {
      setLoading(false);
    }
  };
  // Stats
  const fetchStats = async () => {
    try {
      const response = await axios.get("/courses/admin/stats");
      if (response.data.success) {
        setStats(
          response.data.data || {
            totalCourses: 0,
            totalQuestions: 0,
            totalUsers: 0,
            totalTests: 0,
          }
        );
      }
    } catch (error) {
      // Don't show error toast for auth errors
      if (error.response?.status !== 401) {
        console.error("Error fetching stats:", error);
      }
    }
  };

  const createCoupon = async (couponData) => {
    try {
      setLoading(true);
      const response = await axios.post("/coupons", couponData);

      if (response.data.success) {
        toast.success("Coupon created successfully!");
        return { success: true, data: response.data.data };
      }
      return { success: false, message: "Failed to create coupon" };
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to create coupon";
      toast.error(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const fetchCoupons = async (filters = {}) => {
    try {
      setLoading(true);
      const response = await axios.get("/coupons/admin/all", {
        params: filters,
      });

      if (response.data.success) {
        return { success: true, data: response.data.data.coupons };
      }
      return { success: false, data: [] };
    } catch (error) {
      console.error("Fetch coupons error:", error);
      return { success: false, data: [] };
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseCoupons = async (courseId) => {
    try {
      const response = await axios.get(`/coupons/admin/course/${courseId}`);

      if (response.data.success) {
        return { success: true, data: response.data.data.coupons };
      }
      return { success: false, data: [] };
    } catch (error) {
      console.error("Fetch course coupons error:", error);
      return { success: false, data: [] };
    }
  };

  const updateCoupon = async (couponId, updateData) => {
    try {
      setLoading(true);
      const response = await axios.put(`/coupons/${couponId}`, updateData);

      if (response.data.success) {
        toast.success("Coupon updated successfully!");
        return { success: true, data: response.data.data };
      }
      return { success: false };
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to update coupon";
      toast.error(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const updateCouponStatus = async (couponId, isActive) => {
    try {
      const response = await axios.patch(`/coupons/${couponId}/status`, {
        isActive,
      });

      if (response.data.success) {
        toast.success(response.data.message);
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to update coupon";
      toast.error(message);
      return { success: false, message };
    }
  };

  const deleteCoupon = async (couponId) => {
    try {
      const response = await axios.delete(`/coupons/${couponId}`);

      if (response.data.success) {
        toast.success("Coupon deleted successfully!");
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to delete coupon";
      toast.error(message);
      return { success: false, message };
    }
  };
  const invalidateCache = (patterns) => {
    // Clear relevant cache entries
    patterns.forEach((pattern) => {
      // This would depend on your cache implementation
      // For now, we'll handle it through refetch timing
    });
  };

  // Add these new functions to AdminProvider
  const fetchUserStats = async (filters = {}) => {
    try {
      setLoading(true);
      const response = await axios.get("/courses/admin/user-stats", {
        params: filters,
      });

      if (response.data?.success) {
        return { success: true, data: response.data.data };
      } else {
        return {
          success: false,
          data: {
            totalUsers: 0,
            activeUsers: 0,
            totalTests: 0,
            averageScore: 0,
            topPerformers: [],
            coursePerformance: [],
            difficultyStats: [
              {
                difficulty: "easy",
                averageScore: 0,
                totalAttempts: 0,
                averageTime: 0,
              },
              {
                difficulty: "medium",
                averageScore: 0,
                totalAttempts: 0,
                averageTime: 0,
              },
              {
                difficulty: "hard",
                averageScore: 0,
                totalAttempts: 0,
                averageTime: 0,
              },
            ],
            recentActivity: [],
          },
        };
      }
    } catch (error) {
      console.error("Error fetching user stats:", error);
      return {
        success: false,
        data: {
          totalUsers: 0,
          activeUsers: 0,
          totalTests: 0,
          averageScore: 0,
          topPerformers: [],
          coursePerformance: [],
          difficultyStats: [
            {
              difficulty: "easy",
              averageScore: 0,
              totalAttempts: 0,
              averageTime: 0,
            },
            {
              difficulty: "medium",
              averageScore: 0,
              totalAttempts: 0,
              averageTime: 0,
            },
            {
              difficulty: "hard",
              averageScore: 0,
              totalAttempts: 0,
              averageTime: 0,
            },
          ],
          recentActivity: [],
        },
      };
    } finally {
      setLoading(false);
    }
  };

  const countDifficultyAttempts = (tests, difficulty) => {
    if (!tests || tests.length === 0) return 0;

    return tests.filter((test) => {
      if (Array.isArray(test.difficulty)) {
        return test.difficulty.includes(difficulty);
      }
      return test.difficulty === difficulty;
    }).length;
  };

  const calculateDifficultyAverage = (tests, difficulty) => {
    if (!tests || tests.length === 0) return 0;

    // Separate multi-difficulty and single-difficulty tests
    const singleDiffTests = tests.filter((test) => {
      if (Array.isArray(test.difficulty)) {
        // For multi-difficulty, check if there's specific difficulty data
        if (test.testSettings?.difficultyResults) {
          return test.testSettings.difficultyResults.some(
            (dr) => dr.difficulty === difficulty
          );
        }
        return false;
      }
      return test.difficulty === difficulty;
    });

    if (singleDiffTests.length === 0) return 0;

    let totalScore = 0;
    let count = 0;

    singleDiffTests.forEach((test) => {
      if (
        Array.isArray(test.difficulty) &&
        test.testSettings?.difficultyResults
      ) {
        // For multi-difficulty tests, use the specific difficulty result
        const diffResult = test.testSettings.difficultyResults.find(
          (dr) => dr.difficulty === difficulty
        );
        if (diffResult && diffResult.maxPossibleScore > 0) {
          const diffPercentage =
            (diffResult.totalScore / diffResult.maxPossibleScore) * 100;
          totalScore += diffPercentage;
          count++;
        }
      } else if (test.difficulty === difficulty) {
        // For single-difficulty tests, use the overall percentage
        totalScore += test.percentage || 0;
        count++;
      }
    });

    return count > 0 ? totalScore / count : 0;
  };

  const fetchUserDetails = async (userId) => {
    try {
      setLoading(true);
      const response = await axios.get(`/admin/users/${userId}`);

      if (response.data?.success) {
        const userData = response.data.data;

        // Transform the data structure to match what the modal expects
        const userDetails = {
          name: userData.user?.name || "Unknown User",
          email: userData.user?.email || "Unknown Email",
          totalTests: userData.recentTests?.length || 0,
          averageScore:
            userData.recentTests?.length > 0
              ? userData.recentTests.reduce(
                  (sum, test) => sum + (test.percentage || 0),
                  0
                ) / userData.recentTests.length
              : 0,
          performanceByDifficulty: [
            {
              difficulty: "Easy", // Changed from lowercase
              averageScore: calculateDifficultyAverage(
                userData.recentTests,
                "Easy"
              ),
              totalAttempts: countDifficultyAttempts(
                userData.recentTests,
                "Easy"
              ),
            },
            {
              difficulty: "Medium", // Changed from lowercase
              averageScore: calculateDifficultyAverage(
                userData.recentTests,
                "Medium"
              ),
              totalAttempts: countDifficultyAttempts(
                userData.recentTests,
                "Medium"
              ),
            },
            {
              difficulty: "Hard", // Changed from lowercase
              averageScore: calculateDifficultyAverage(
                userData.recentTests,
                "Hard"
              ),
              totalAttempts: countDifficultyAttempts(
                userData.recentTests,
                "Hard"
              ),
            },
          ],
          recentTests:
            userData.recentTests?.map((test) => ({
              ...test,
              courseName: test.course?.name || "Unknown Course", // Fix course name
              percentage: test.percentage || 0, // Ensure percentage exists
              difficulty: Array.isArray(test.difficulty)
                ? test.difficulty.join(", ") // Add spacing between difficulties
                : test.difficulty,
              completedAt: test.completedAt || test.createdAt, // Use completedAt with fallback
            })) || [],
        };

        return { success: true, data: userDetails };
      }
      return { success: false, data: null };
    } catch (error) {
      console.error("Error fetching user details:", error);
      return { success: false, data: null };
    } finally {
      setLoading(false);
    }
  };

  const exportUserStats = async (userStats) => {
    try {
      const csvData = [
        [
          "Course Name",
          "Category",
          "Average Score",
          "Total Attempts",
          "Unique Users",
          "Accuracy Rate",
          "Note",
        ],
        ...(userStats.coursePerformance || []).map((course) => [
          course.name || "Unknown",
          course.category || "Unknown",
          (course.averageScore || 0).toFixed(1) + "%",
          course.totalAttempts || 0,
          course.uniqueUsers || 0,
          (course.accuracyRate || 0).toFixed(1) + "%",
          "Completion rate removed - misleading for multi-difficulty tests",
        ]),
      ];

      const csvContent =
        "data:text/csv;charset=utf-8," +
        csvData.map((e) => e.map((cell) => `"${cell}"`).join(",")).join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `user-stats-${new Date().toISOString().split("T")[0]}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success("Statistics exported successfully");
      return { success: true };
    } catch (error) {
      console.error("Error exporting stats:", error);
      toast.error("Failed to export statistics");
      return { success: false };
    }
  };

  const fetchAllUsers = async (
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "desc"
  ) => {
    try {
      setLoading(true);
      const response = await axios.get("/admin/users", {
        params: { page, limit, sortBy, sortOrder },
      });

      if (response.data.success) {
        return {
          success: true,
          data: response.data.data.users,
          pagination: response.data.data.pagination,
        };
      }
      return { success: false, data: [] };
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
      return { success: false, data: [] };
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query) => {
    try {
      const response = await axios.get("/admin/users/search", {
        params: { query },
      });

      if (response.data.success) {
        return { success: true, data: response.data.data.users };
      }
      return { success: false, data: [] };
    } catch (error) {
      console.error("Error searching users:", error);
      toast.error("Failed to search users");
      return { success: false, data: [] };
    }
  };

  const getUserDetails = async (userId) => {
    try {
      setLoading(true);

      // Use the correct admin endpoint
      const response = await axios.get(`/admin/users/${userId}`);

      if (response.data?.success) {
        return { success: true, data: response.data.data };
      }

      return {
        success: false,
        data: null,
        message: response.data?.message || "Failed to fetch user details",
      };
    } catch (error) {
      console.error("Error fetching user details:", error);

      // Don't show toast for auth errors as they're handled globally
      if (error.response?.status !== 401) {
        toast.error(
          error.response?.data?.message || "Failed to fetch user details"
        );
      }

      return {
        success: false,
        data: null,
        message: error.response?.data?.message || error.message,
      };
    } finally {
      setLoading(false);
    }
  };

  // Only fetch courses and stats when user is authenticated and is admin
  useEffect(() => {
    if (isAuthenticated && user && user.role === "admin") {
      fetchCourses();
      fetchStats();
      fetchCategories();
    }
  }, [isAuthenticated, user]);

  // Clear data when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setCourses([]);
      setQuestions([]);
      setStats({
        totalCourses: 0,
        totalQuestions: 0,
        totalUsers: 0,
        totalTests: 0,
      });
    }
  }, [isAuthenticated]);

  const value = {
    // Categories
    categories,
    createCategory,
    updateCategory,
    deleteCategory,
    fetchCategories,

    // Courses
    courses,
    createCourse,
    updateCourse,
    deleteCourse,
    fetchCourses,

    // Questions
    questions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    fetchQuestions,
    createCourseWithQuestions,
    toggleCourseStatus,
    bulkDeleteQuestions,
    // Stats
    stats,
    fetchStats,
    fetchUserStats,
    fetchUserDetails,
    exportUserStats,

    fetchAllUsers,
    searchUsers,
    getUserDetails,

    // Video states
    videoUploadProgress,
    processingVideo,

    // Coupons
    createCoupon,
    fetchCoupons,
    fetchCourseCoupons,
    updateCouponStatus,
    deleteCoupon,
    updateCoupon,
    // Loading
    loading,
  };

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
};
