import React, { createContext, useContext, useReducer, useEffect } from "react";
import { apiMethods, handleApiError } from "../services/api";
import toast from "react-hot-toast";

// Initial state
const initialState = {
  courses: [],
  categories: [],
  currentCourse: null,
  loading: false,
  error: null,
  filters: {
    category: "",
    difficulty: "",
    price: "",
    searchTerm: "",
    sortBy: "newest",
  },
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalCourses: 0,
    limit: 12,
  },
};

// Action types
const COURSE_ACTIONS = {
  SET_LOADING: "SET_LOADING",
  SET_COURSES: "SET_COURSES",
  SET_CATEGORIES: "SET_CATEGORIES",
  SET_CURRENT_COURSE: "SET_CURRENT_COURSE",
  SET_ERROR: "SET_ERROR",
  CLEAR_ERROR: "CLEAR_ERROR",
  SET_FILTERS: "SET_FILTERS",
  RESET_FILTERS: "RESET_FILTERS",
  SET_PAGINATION: "SET_PAGINATION",
  ADD_COURSE: "ADD_COURSE",
  UPDATE_COURSE: "UPDATE_COURSE",
  DELETE_COURSE: "DELETE_COURSE",
};

// Reducer function
const courseReducer = (state, action) => {
  switch (action.type) {
    case COURSE_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };

    case COURSE_ACTIONS.SET_COURSES:
      return {
        ...state,
        courses: action.payload.courses,
        pagination: {
          ...state.pagination,
          ...action.payload.pagination,
        },
        loading: false,
        error: null,
      };

    case COURSE_ACTIONS.SET_CATEGORIES:
      return {
        ...state,
        categories: action.payload,
        error: null,
      };

    case COURSE_ACTIONS.SET_CURRENT_COURSE:
      return {
        ...state,
        currentCourse: action.payload,
        loading: false,
        error: null,
      };

    case COURSE_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false,
      };

    case COURSE_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case COURSE_ACTIONS.SET_FILTERS:
      return {
        ...state,
        filters: {
          ...state.filters,
          ...action.payload,
        },
        pagination: {
          ...state.pagination,
          currentPage: 1, // Reset to first page when filters change
        },
      };

    case COURSE_ACTIONS.RESET_FILTERS:
      return {
        ...state,
        filters: initialState.filters,
        pagination: {
          ...state.pagination,
          currentPage: 1,
        },
      };

    case COURSE_ACTIONS.SET_PAGINATION:
      return {
        ...state,
        pagination: {
          ...state.pagination,
          ...action.payload,
        },
      };

    case COURSE_ACTIONS.ADD_COURSE:
      return {
        ...state,
        courses: [action.payload, ...state.courses],
      };

    case COURSE_ACTIONS.UPDATE_COURSE:
      return {
        ...state,
        courses: state.courses.map((course) =>
          course._id === action.payload._id ? action.payload : course
        ),
        currentCourse:
          state.currentCourse?._id === action.payload._id
            ? action.payload
            : state.currentCourse,
      };

    case COURSE_ACTIONS.DELETE_COURSE:
      return {
        ...state,
        courses: state.courses.filter(
          (course) => course._id !== action.payload
        ),
        currentCourse:
          state.currentCourse?._id === action.payload
            ? null
            : state.currentCourse,
      };

    default:
      return state;
  }
};

// Create context
const CourseContext = createContext();

// Provider component
export const CourseProvider = ({ children }) => {
  const [state, dispatch] = useReducer(courseReducer, initialState);

  // Load categories and initial courses on mount
  useEffect(() => {
    loadCategories();
    loadCourses();
  }, []);

  useEffect(() => {
    // Immediately trigger loadCourses on filter/page change
    loadCourses(true); // Always show loading spinner
  }, [JSON.stringify(state.filters), state.pagination.currentPage]);

  // Helper function to calculate estimated time
  const calculateEstimatedTime = (course) => {
    if (!course.difficulties || course.difficulties.length === 0) {
      return "30 minutes"; // default fallback
    }

    // Calculate total time from all difficulties
    let totalSeconds = 0;
    course.difficulties.forEach((difficulty) => {
      if (difficulty.timerSettings) {
        // Use average of min and max time for each difficulty
        const avgTime =
          (difficulty.timerSettings.minTime +
            difficulty.timerSettings.maxTime) /
          2;
        totalSeconds += avgTime;
      }
    });

    // Add 2 minutes buffer (120 seconds)
    totalSeconds += 240;
    // Convert to minutes and format
    const totalMinutes = Math.ceil(totalSeconds / 60);

    if (totalMinutes < 60) {
      return `${totalMinutes} minutes`;
    } else {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return minutes > 0
        ? `${hours}h ${minutes}m`
        : `${hours} hour${hours > 1 ? "s" : ""}`;
    }
  };

  const loadCourses = async (showLoadingSpinner = true) => {
    try {
      if (showLoadingSpinner) {
        dispatch({ type: COURSE_ACTIONS.SET_LOADING, payload: true });
        dispatch({
          type: COURSE_ACTIONS.SET_COURSES,
          payload: { courses: [], pagination: state.pagination },
        });
      }

      const params = {
        page: state.pagination.currentPage,
        limit: state.pagination.limit,
        sortBy: state.filters.sortBy,
      };

      // Only add filters if they have actual values (not "all" or empty)
      if (state.filters.category && state.filters.category !== "all") {
        params.category = state.filters.category;
      }

      if (state.filters.difficulty && state.filters.difficulty !== "all") {
        params.difficulty = state.filters.difficulty;
      }

      if (state.filters.searchTerm) {
        params.search = state.filters.searchTerm;
      }

      // Handle price filter conversion
      if (state.filters.price) {
        if (state.filters.price === "free") {
          params.isPaid = false;
        } else if (state.filters.price === "paid") {
          params.isPaid = true;
        }
      }

      // console.log("API params being sent:", params);
      const response = await apiMethods.courses.getAll(params);
      const { courses, pagination } = response.data.data || {
        courses: [],
        pagination: {},
      };

      dispatch({
        type: COURSE_ACTIONS.SET_COURSES,
        payload: { courses, pagination },
      });
    } catch (error) {
      if (error.response?.status !== 401) {
        const errorMessage = handleApiError(error, "Failed to load courses");
        dispatch({ type: COURSE_ACTIONS.SET_ERROR, payload: errorMessage });
      }
    }
  };

  const loadCategories = async () => {
    try {
      const response = await apiMethods.courses.getCategories();
      dispatch({
        type: COURSE_ACTIONS.SET_CATEGORIES,
        payload: response.data.data?.categories || [],
      });
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  const getCourseById = async (courseId) => {
    try {
      dispatch({ type: COURSE_ACTIONS.SET_LOADING, payload: true });

      const response = await apiMethods.courses.getById(courseId);
      const course = response.data.course;

      dispatch({
        type: COURSE_ACTIONS.SET_CURRENT_COURSE,
        payload: course,
      });

      return { success: true, course };
    } catch (error) {
      const errorMessage = handleApiError(error, "Failed to load course");
      dispatch({ type: COURSE_ACTIONS.SET_ERROR, payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  };

  const searchCourses = async (searchTerm) => {
    try {
      dispatch({ type: COURSE_ACTIONS.SET_LOADING, payload: true });

      const response = await apiMethods.courses.search(searchTerm);
      const courses = response.data.courses;

      dispatch({
        type: COURSE_ACTIONS.SET_COURSES,
        payload: {
          courses,
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalCourses: courses?.length || 0,
            limit: courses.length,
          },
        },
      });

      return { success: true, courses };
    } catch (error) {
      const errorMessage = handleApiError(error, "Search failed");
      dispatch({ type: COURSE_ACTIONS.SET_ERROR, payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  };

  const getCoursesByCategory = async (categoryId) => {
    try {
      dispatch({ type: COURSE_ACTIONS.SET_LOADING, payload: true });

      const response = await apiMethods.courses.getByCategory(categoryId);
      const courses = response.data.courses;

      dispatch({
        type: COURSE_ACTIONS.SET_COURSES,
        payload: {
          courses,
          pagination: {
            currentPage: 1,
            totalPages: 1,
            totalCourses: courses?.length || 0,
            limit: courses?.length || 0,
          },
        },
      });

      return { success: true, courses };
    } catch (error) {
      const errorMessage = handleApiError(
        error,
        "Failed to load courses by category"
      );
      dispatch({ type: COURSE_ACTIONS.SET_ERROR, payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  };

  const setFilters = (newFilters) => {
    dispatch({
      type: COURSE_ACTIONS.SET_FILTERS,
      payload: newFilters,
    });
  };

  const resetFilters = () => {
    dispatch({ type: COURSE_ACTIONS.RESET_FILTERS });
  };

  const setPage = (page) => {
    dispatch({
      type: COURSE_ACTIONS.SET_PAGINATION,
      payload: { currentPage: page },
    });
  };

  const clearError = () => {
    dispatch({ type: COURSE_ACTIONS.CLEAR_ERROR });
  };

  const clearCurrentCourse = () => {
    dispatch({
      type: COURSE_ACTIONS.SET_CURRENT_COURSE,
      payload: null,
    });
  };

  // Computed values
  const filteredCoursesCount = state.courses?.length;
  const hasFiltersApplied = Object.entries(state.filters).some(
    ([key, value]) => key !== "sortBy" && value !== ""
  );

  const value = {
    ...state,
    loadCourses,
    loadCategories,
    getCourseById,
    searchCourses,
    getCoursesByCategory,
    setFilters,
    resetFilters,
    setPage,
    clearError,
    clearCurrentCourse,
    filteredCoursesCount,
    hasFiltersApplied,
    calculateEstimatedTime,
  };

  return (
    <CourseContext.Provider value={value}>{children}</CourseContext.Provider>
  );
};

// Hook to use course context
export const useCourses = () => {
  const context = useContext(CourseContext);
  if (!context) {
    throw new Error("useCourses must be used within a CourseProvider");
  }
  return context;
};

export default CourseContext;
