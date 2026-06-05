/**
 * provides admin context state, api access, loading flags, and shared actions to child views
 *
 * @file admin/src/contexts/admincontext.jsx
 * @module admin/src/contexts/admincontext
 * @exports provider and hooks used by child components
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "./AuthContext";
import { adminRequestSigner } from "../utils/adminRequestSigner.js";

const AdminContext = createContext();
axios.defaults.baseURL =
  import.meta.env.VITE_API_URL || "http://localhost:7000/api";
axios.defaults.withCredentials = true;

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

  const [pdfGenerating, setPdfGenerating] = useState(false);

  // get authentication status
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
        await fetchCategories(); // refresh categories to get updated course counts
        toast.success("Category created successfully!");

        // dispatch notification event
        window.dispatchEvent(
          new CustomEvent("adminOperation", {
            detail: {
              operation: "createCategory",
              success: true,
              data: response.data.data.category,
            },
          }),
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
        categoryData,
      );

      if (response.data.success) {
        await fetchCategories();
        toast.success("Category updated successfully!");

        // dispatch notification event
        window.dispatchEvent(
          new CustomEvent("adminOperation", {
            detail: { operation: "updateCategory", success: true },
          }),
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
        await fetchCategories(); // refresh categories to get updated course counts
        toast.success("Category deleted successfully!");

        // dispatch notification event
        window.dispatchEvent(
          new CustomEvent("adminOperation", {
            detail: { operation: "deleteCategory", success: true },
          }),
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
        // update local state immediately
        setCourses((prev) =>
          prev.map((course) =>
            course._id === courseId
              ? {
                  ...course,
                  isActive: data.data?.course?.isActive ?? !course.isActive,
                }
              : course,
          ),
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
        error.response?.data?.message || "Failed to toggle course status",
      );
      return { success: false };
    }
  };
  const fetchCourses = async (force = false) => {
    try {
      // don't show loading for background refreshes
      if (force) setLoading(true);

      const response = await axios.get("/courses/admin/all", {
        // cache busting for forced refreshes
        params: force ? { _t: Date.now() } : {},
      });

      if (response.data.success) {
        const coursesData = response.data.data?.courses || [];
        // transform backend data to match frontend expectations
        const transformedCourses = coursesData.map((course) => ({
          ...course,
          name: course.title || course.name,
          isActive:
            course.isActive !== undefined
              ? course.isActive
              : course.status === "active",
          // transform difficulties to difficultylevels for frontend compatibility
          difficultyLevels:
            course.difficulties?.map((diff) => ({
              difficulty: diff.name,
              maxQuestions: course.maxQuestionsPerTest || 20,
              marksPerQuestion: diff.marksPerQuestion,
              timeLimit: diff.timerSettings?.maxTime || null,
            })) || [],
          // transform image structure
          image: course.image?.url || course.image,
          // set categoryid from course data or default
          categoryId:
            course.category?._id ||
            course.category ||
            course.categoryId ||
            null,
          categoryName: course.category?.name || "Uncategorized",
          videoContent: course.videoContent || null,
          // preserve haspdfexport field from backend
          hasPdfExport: course.hasPdfExport || false,
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

  /**
   * download course data as pdf (admin only)
   * @param {string} courseid - course id
   * @returns {promise<{success: boolean, message?: string}>}
   */
  const downloadCoursePDF = async (courseId) => {
    try {
      setPdfGenerating(true);

      const response = await axios.get(`/courses/${courseId}/download-pdf`, {
        responseType: "blob", // important for file download
      });

      // create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      // extract filename from content-disposition header
      const contentDisposition = response.headers["content-disposition"];
      let filename = `Vidhgrow_Course_${
        new Date().toISOString().split("T")[0]
      }.pdf`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }

      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();

      // cleanup
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Course PDF downloaded successfully!");
      return { success: true };
    } catch (error) {
      console.error("Download course PDF error:", error);
      const message =
        error.response?.data?.message || "Failed to download course PDF";
      toast.error(message);
      return { success: false, message };
    } finally {
      setPdfGenerating(false);
    }
  };

  /**
   * download test result pdf for admin
   * @param {string} testid - test result id
   * @returns {promise<{success: boolean, message?: string}>}
   */
  const downloadTestPDF = async (testId) => {
    try {
      setPdfGenerating(true);

      const response = await axios.get(`/tests/download-pdf/${testId}`, {
        responseType: "blob", // important for file download
      });

      // create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      // extract filename from content-disposition header
      const contentDisposition = response.headers["content-disposition"];
      let filename = `Vidhgrow_Test_Result_${
        new Date().toISOString().split("T")[0]
      }.pdf`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }

      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();

      // cleanup
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("PDF downloaded successfully!");
      return { success: true };
    } catch (error) {
      console.error("Download PDF error:", error);
      const message = error.response?.data?.message || "Failed to download PDF";
      toast.error(message);
      return { success: false, message };
    } finally {
      setPdfGenerating(false);
    }
  };

  const validateVideoContent = (videoContent) => {
    if (videoContent.type === "course") {
      const hasUpload = !!videoContent.courseVideo?.uploadedVideo;
      const hasLinks = videoContent.courseVideo?.links?.length > 0;

      if (hasUpload && hasLinks) {
        throw new Error(
          "Cannot have both uploaded video and links for course-level video",
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
            `Cannot have both uploaded video and links for ${diffVideo.difficulty}`,
          );
        }
        if (hasLinks && diffVideo.links.length > 2) {
          throw new Error(
            `Maximum 2 video links allowed for ${diffVideo.difficulty}`,
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

      // create formdata for file upload
      const formData = new FormData();

      // append basic course data
      formData.append("name", courseData.name);
      if (courseData.description)
        formData.append("description", courseData.description);
      if (courseData.category) {
        formData.append("category", courseData.category);
      }

      // append difficulties
      formData.append("difficulties", JSON.stringify(courseData.difficulties));
      formData.append("maxQuestionsPerTest", courseData.maxQuestionsPerTest);

      // append payment info
      let isPaid = courseData.isPaid;
      if (typeof isPaid === "string") {
        isPaid = isPaid.toLowerCase() === "true";
      }
      formData.append("isPaid", isPaid);
      formData.append("price", isPaid ? courseData.price || 0 : 0);

      // append course image
      if (courseData.image && courseData.image instanceof File) {
        formData.append("image", courseData.image);
      }

      // handle video content properly
      if (isPaid && courseData.videoContent) {
        const { type, courseVideo, difficultyVideos } = courseData.videoContent;

        formData.append("videoType", type);

        if (type === "course" && courseVideo?.links?.length > 0) {
          // validate and append course video links
          const validLinks = courseVideo.links.filter(
            (link) => link.url && link.url.trim(),
          );

          if (validLinks.length > 0) {
            formData.append("courseVideoLinks", JSON.stringify(validLinks));
          }
        } else if (type === "difficulty") {
          // handle difficulty-level video links
          const diffVideosData = {};

          if (difficultyVideos && difficultyVideos.length > 0) {
            difficultyVideos.forEach((diffVideo) => {
              const validLinks = diffVideo.links?.filter(
                (link) => link.url && link.url.trim(),
              );

              // only if there are valid links
              if (validLinks && validLinks.length > 0) {
                diffVideosData[diffVideo.difficulty] = {
                  links: validLinks,
                };
              }
            });
          }

          // only append if we have at least one difficulty with links
          if (Object.keys(diffVideosData).length > 0) {
            formData.append(
              "difficultyVideosData",
              JSON.stringify(diffVideosData),
            );
          } else {
            // if no valid links, don't send difficultyvideosdata at all
            // this prevents backend from requiring links
            formData.append("videoType", "none");
          }
        }
      }

      // questions if they exist
      if (courseData.questions && courseData.questions.length > 0) {
        const questionsForJson = courseData.questions.map((q, index) => {
          const { questionImage, imagePreview, ...cleanQuestion } = q;
          if (questionImage && questionImage instanceof File) {
            cleanQuestion.hasImageAtIndex = index;
          }
          return cleanQuestion;
        });

        formData.append("questions", JSON.stringify(questionsForJson));

        // append question images
        courseData.questions.forEach((question) => {
          if (
            question.questionImage &&
            question.questionImage instanceof File
          ) {
            formData.append("questionImages", question.questionImage);
          }
        });
      }

      // upload with progress tracking
      const response = await axios.post("/courses", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
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

      // create formdata for file upload
      const formData = new FormData();

      // append course data
      if (courseData.name) formData.append("name", courseData.name);
      if (courseData.description)
        formData.append("description", courseData.description);

      if (courseData.category !== undefined)
        formData.append("category", courseData.category);

      if (courseData.difficulties && courseData.difficulties.length > 0) {
        formData.append(
          "difficulties",
          JSON.stringify(courseData.difficulties),
        );
      }

      if (courseData.maxQuestionsPerTest)
        formData.append("maxQuestionsPerTest", courseData.maxQuestionsPerTest);

      if (courseData.isActive !== undefined)
        formData.append("isActive", courseData.isActive);

      // handle pdf export toggle
      if (courseData.hasPdfExport !== undefined) {
        // ensure boolean value is sent correctly
        const hasPdfExportValue =
          courseData.hasPdfExport === true ||
          courseData.hasPdfExport === "true" ||
          courseData.hasPdfExport === 1;
        formData.append("hasPdfExport", hasPdfExportValue);

        console.log("Sending hasPdfExport:", {
          original: courseData.hasPdfExport,
          converted: hasPdfExportValue,
          type: typeof hasPdfExportValue,
        });
      }

      // handle ispaid and price
      if (courseData.isPaid !== undefined) {
        formData.append("isPaid", courseData.isPaid);
        formData.append("price", courseData.isPaid ? courseData.price || 0 : 0);

        // video content flow
      } else if (!courseData.isPaid) {
        formData.append("videoType", "remove");
      }

      // append image if exists
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
        },
      );

      if (response.data.success) {
        // extract updated course from response
        const updatedCourseData =
          response.data.data?.course || response.data.data;

        console.log("Received response:", {
          hasPdfExport: updatedCourseData?.hasPdfExport,
          isPaid: updatedCourseData?.isPaid,
          fullData: updatedCourseData,
        });

        // update courses array with exact backend data
        setCourses((prev) =>
          prev.map((course) =>
            course._id === courseId
              ? {
                  ...course,
                  ...updatedCourseData,
                  // ensure these fields are properly set
                  hasPdfExport: updatedCourseData.hasPdfExport === true,
                  isPaid: updatedCourseData.isPaid === true,
                  price: updatedCourseData.price || 0,
                  isActive: updatedCourseData.isActive !== false,
                  updatedAt: new Date(),
                }
              : course,
          ),
        );

        // dispatch notification event
        window.dispatchEvent(
          new CustomEvent("adminOperation", {
            detail: { operation: "updateCourse", success: true },
          }),
        );

        // return the updated course data
        return {
          success: true,
          updatedCourse: updatedCourseData,
          data: { course: updatedCourseData },
        };
      }

      // handle non-success response
      return {
        success: false,
        message: response.data.message || "Update failed",
      };
    } catch (error) {
      console.error("Error:", error);

      if (error.response?.status !== 401) {
        let message = "Failed to update course";

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
        // update local state immediately to prevent flicker
        setCourses((prev) => prev.filter((course) => course._id !== courseId));

        // background refresh without loading state
        Promise.all([fetchCourses(false), fetchCategories()]);

        // dispatch notification event
        window.dispatchEvent(
          new CustomEvent("adminOperation", {
            detail: { operation: "updateCourse", success: true },
          }),
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

  // questions management
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

      // create formdata if image is present
      let payload = questionData;
      let config = {};

      if (questionData.image && questionData.image.file) {
        const formData = new FormData();

        // all text fields
        Object.keys(questionData).forEach((key) => {
          if (key !== "image") {
            if (typeof questionData[key] === "object") {
              formData.append(key, JSON.stringify(questionData[key]));
            } else {
              formData.append(key, questionData[key]);
            }
          }
        });

        // image file
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
        config,
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

      // create formdata if image is present
      let payload = questionData;
      let config = {};

      if (questionData.image && questionData.image.file) {
        const formData = new FormData();

        // all text fields
        Object.keys(questionData).forEach((key) => {
          if (key !== "image") {
            if (typeof questionData[key] === "object") {
              formData.append(key, JSON.stringify(questionData[key]));
            } else {
              formData.append(key, questionData[key]);
            }
          }
        });

        // image file
        formData.append("image", questionData.image.file);

        payload = formData;
        config = {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        };
      } else if (questionData.image === null) {
        // explicitly handle image deletion
        // send null as json to signal image removal
        payload = { ...questionData, image: null };
        config = {
          headers: {
            "Content-Type": "application/json",
          },
        };
      }

      const response = await axios.put(
        `/courses/${courseId}/questions/${questionId}`,
        payload,
        config,
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

  // a silent flag to deletequestion
  const deleteQuestion = async (courseId, questionId, silent = false) => {
    try {
      const response = await axios.delete(
        `/courses/${courseId}/questions/${questionId}`,
      );

      if (response.data.success) {
        // only show toast if not silent
        if (!silent) {
          toast.success("Question deleted successfully!");
        }
        return { success: true };
      }
    } catch (error) {
      if (!silent) {
        toast.error(
          error.response?.data?.message || "Failed to delete question",
        );
      }
      return { success: false, message: error.response?.data?.message };
    }
  };

  const bulkDeleteQuestions = async (courseId, questionIds) => {
    try {
      const response = await axios.delete(
        `/courses/${courseId}/questions/bulk`,
        { data: { questionIds } },
      );

      if (response.data.success) {
        // immediately update courses state to reflect question count s
        setCourses((prev) =>
          prev.map((course) =>
            course._id === courseId
              ? {
                  ...course,
                  totalQuestions:
                    (course.totalQuestions || 0) - response.data.deletedCount,
                }
              : course,
          ),
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

      // first validate that we have questions
      const hasQuestions = Object.values(questions).some(
        (questionList) => questionList && questionList.length > 0,
      );

      if (!hasQuestions) {
        toast.error("At least one question is required");
        return {
          success: false,
          message: "At least one question is required",
        };
      }

      // prepare questions for bulk import
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

      // create course with questions in the payload
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

  /**
   * toggle pdf export status for a course
   * @param {string} courseid - course id
   * @returns {promise<{success: boolean}>}
   */
  const togglePdfExport = async (courseId) => {
    try {
      const course = courses.find((c) => c._id === courseId);
      if (!course) {
        toast.error("Course not found");
        return { success: false };
      }

      const newStatus = !course.hasPdfExport;

      const result = await updateCourse(courseId, {
        hasPdfExport: newStatus,
      });

      if (result.success) {
        // update local state immediately
        setCourses((prev) =>
          prev.map((c) =>
            c._id === courseId ? { ...c, hasPdfExport: newStatus } : c,
          ),
        );

        toast.success(
          `PDF export ${newStatus ? "enabled" : "disabled"} successfully!`,
        );

        return { success: true };
      }

      return { success: false };
    } catch (error) {
      console.error("Toggle PDF export error:", error);
      toast.error(
        error.response?.data?.message || "Failed to toggle PDF export",
      );
      return { success: false };
    }
  };

  // stats
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
          },
        );
      }
    } catch (error) {
      // don't show error toast for auth errors
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
    // clear relevant cache entries
    patterns.forEach((pattern) => {
      // this would depend on your cache implementation
      // for now, we'll handle it through refetch timing
    });
  };

  // these functions to adminprovider
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

    // separate multi-difficulty and single-difficulty tests
    const singleDiffTests = tests.filter((test) => {
      if (Array.isArray(test.difficulty)) {
        // for multi-difficulty, check if there's specific difficulty data
        if (test.testSettings?.difficultyResults) {
          return test.testSettings.difficultyResults.some(
            (dr) => dr.difficulty === difficulty,
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
        // for multi-difficulty tests, use the specific difficulty result
        const diffResult = test.testSettings.difficultyResults.find(
          (dr) => dr.difficulty === difficulty,
        );
        if (diffResult && diffResult.maxPossibleScore > 0) {
          const diffPercentage =
            (diffResult.totalScore / diffResult.maxPossibleScore) * 100;
          totalScore += diffPercentage;
          count++;
        }
      } else if (test.difficulty === difficulty) {
        // for single-difficulty tests, use the overall percentage
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

        // transform the data structure to match what the modal expects
        const userDetails = {
          name: userData.user?.name || "Unknown User",
          email: userData.user?.email || "Unknown Email",
          totalTests: userData.recentTests?.length || 0,
          averageScore:
            userData.recentTests?.length > 0
              ? userData.recentTests.reduce(
                  (sum, test) => sum + (test.percentage || 0),
                  0,
                ) / userData.recentTests.length
              : 0,
          performanceByDifficulty: [
            {
              difficulty: "Easy", // d from lowercase
              averageScore: calculateDifficultyAverage(
                userData.recentTests,
                "Easy",
              ),
              totalAttempts: countDifficultyAttempts(
                userData.recentTests,
                "Easy",
              ),
            },
            {
              difficulty: "Medium", // d from lowercase
              averageScore: calculateDifficultyAverage(
                userData.recentTests,
                "Medium",
              ),
              totalAttempts: countDifficultyAttempts(
                userData.recentTests,
                "Medium",
              ),
            },
            {
              difficulty: "Hard", // d from lowercase
              averageScore: calculateDifficultyAverage(
                userData.recentTests,
                "Hard",
              ),
              totalAttempts: countDifficultyAttempts(
                userData.recentTests,
                "Hard",
              ),
            },
          ],
          recentTests:
            userData.recentTests?.map((test) => ({
              ...test,
              courseName: test.course?.name || "Unknown Course", // course name
              percentage: test.percentage || 0, // ensure percentage exists
              difficulty: Array.isArray(test.difficulty)
                ? test.difficulty.join(", ") // spacing between difficulties
                : test.difficulty,
              completedAt: test.completedAt || test.createdAt, // use completedat with fallback
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
        `user-stats-${new Date().toISOString().split("T")[0]}.csv`,
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
    sortOrder = "desc",
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

      // use the correct admin endpoint
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

      // don't show toast for auth errors as they're handled globally
      if (error.response?.status !== 401) {
        toast.error(
          error.response?.data?.message || "Failed to fetch user details",
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

  // only fetch courses and stats when user is authenticated and is admin
  useEffect(() => {
    if (isAuthenticated && user && user.role === "admin") {
      fetchCourses();
      fetchStats();
      fetchCategories();
    }
  }, [isAuthenticated, user]);

  // clear data when user logs out
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

  const adminRequest = async (method, url, data = null) => {
    try {
      let config = {
        method: method.toLowerCase(),
        url,
        withCredentials: true,
      };

      if (data) config.data = data;
      config = adminRequestSigner.signRequest(config);

      return await axios(config);
    } catch (error) {
      throw error;
    }
  };

  const value = {
    // categories
    categories,
    createCategory,
    updateCategory,
    deleteCategory,
    fetchCategories,

    // courses
    courses,
    createCourse,
    updateCourse,
    deleteCourse,
    fetchCourses,

    // questions
    questions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    fetchQuestions,
    createCourseWithQuestions,
    toggleCourseStatus,
    bulkDeleteQuestions,
    // stats
    stats,
    fetchStats,
    fetchUserStats,
    fetchUserDetails,
    exportUserStats,

    fetchAllUsers,
    searchUsers,
    getUserDetails,

    // video states
    videoUploadProgress,
    processingVideo,

    // coupons
    createCoupon,
    fetchCoupons,
    fetchCourseCoupons,
    updateCouponStatus,
    deleteCoupon,
    updateCoupon,
    // loading
    loading,

    downloadTestPDF,
    downloadCoursePDF,
    pdfGenerating,

    togglePdfExport,

    adminRequest,
  };

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
};
