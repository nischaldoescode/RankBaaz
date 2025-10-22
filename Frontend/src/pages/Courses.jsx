import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useContent } from "../context/ContentContext";
import { Search, BookOpen, Grid3X3, List, Filter } from "lucide-react";
import CourseDetailsExpander from "@/components/testandcourse/CourseDetailsExpander";
import { useCourses } from "../context/CourseContext";
import Loading from "../components/common/Loading";
import { useTheme } from "../context/ThemeContext";
import { useSEO } from "../hooks/useSEO";


const CourseCard = React.memo(
  ({ course, index, isExpanded, onExpandChange }) => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="h-full flex flex-col"
        style={{ willChange: "auto" }}
      >
        <Card className="h-full hover:shadow-md transition-shadow duration-200 cursor-pointer group bg-white border border-gray-200 hover:border-gray-300 overflow-hidden">
          <CardContent className="p-0 flex flex-col h-full">
            <div className="relative aspect-video bg-gray-100 overflow-hidden rounded-t-lg flex-shrink-0">
              {course.image?.url ? (
                <img
                  src={course.image.url}
                  alt={course.name}
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="w-16 h-16 text-gray-400" />
                </div>
              )}

              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />

              <Badge
                className={`absolute top-4 right-4 ${
                  course.isPaid ? "bg-yellow-500" : "bg-green-500"
                }`}
              >
                {course.isPaid ? `₹${course.price}` : "Free"}
              </Badge>
            </div>

            <div className="p-4 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg line-clamp-1 text-gray-800">
                  {course.name}
                </h3>
              </div>

              <p className="text-gray-700 text-sm line-clamp-2 mb-4 leading-relaxed flex-1">
                {course.description}
              </p>

              <div className="mt-auto pt-4 border-t border-gray-200">
                <CourseDetailsExpander
                  course={course}
                  viewMode="grid"
                  isExpanded={isExpanded}
                  onExpandChange={(expanded) =>
                    onExpandChange(course._id, expanded)
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  },
  (prevProps, nextProps) => {


    if (prevProps.isExpanded !== nextProps.isExpanded) {
      return false; // Allow re-render
    }
    // Nothing changed, prevent re-render
    return true;
  }
);

// MOVE CourseListItem HERE TOO - OUTSIDE the Courses component
const CourseListItem = React.memo(
  ({
    course,
    index,
    isExpanded,
    onExpandChange,
    animations,
    reducedMotion,
  }) => (
    <motion.div
      initial={animations && !reducedMotion ? { opacity: 0, x: -10 } : {}}
      animate={animations && !reducedMotion ? { opacity: 1, x: 0 } : {}}
      transition={
        animations && !reducedMotion
          ? { delay: index * 0.03, duration: 0.3 }
          : {}
      }
      className="group"
    >
      <Card className="h-full hover:shadow-md transition-shadow duration-200 cursor-pointer group bg-white border border-gray-200 hover:border-gray-300">
        <CardContent className="p-0">
          <div className="flex items-start p-2 space-x-6">
            {/* Course Image */}
            <motion.div className="flex-shrink-0" whileHover={{ scale: 1.05 }}>
              <div className="flex-shrink-0 aspect-square h-full w-49 max-w-[11rem] bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                {course.image?.url ? (
                  <img
                    src={course.image.url}
                    alt={course.name}
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-purple-500 group-hover:text-purple-700 transition-colors" />
                  </div>
                )}
              </div>
            </motion.div>

            {/* Course Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-xl font-semibold text-gray-800 line-clamp-2">
                  {course.name}
                </h3>
                <Badge
                  className={`ml-4 flex-shrink-0 ${
                    course.isPaid
                      ? "bg-orange-500 text-white"
                      : "bg-green-500 text-white"
                  }`}
                >
                  {course.isPaid ? `₹${course.price}` : "Free"}
                </Badge>
              </div>

              <p className="text-gray-600 text-sm line-clamp-2 mb-4 leading-relaxed">
                {course.description}
              </p>

              <div className="mt-4">
                <CourseDetailsExpander
                  course={course}
                  viewMode="list"
                  isExpanded={isExpanded}
                  onExpandChange={onExpandChange}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  ),
  (prevProps, nextProps) => {
    // Only re-render if these specific props change for THIS course
    const shouldNotRerender =
      prevProps.course._id === nextProps.course._id &&
      prevProps.isExpanded === nextProps.isExpanded;

    return shouldNotRerender;
  }
);

const Courses = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [expandedCourseId, setExpandedCourseId] = useState(null);
  const [localFilters, setLocalFilters] = useState({
    category: "all",
    difficulty: "all",
    price: "all",
    duration: "all",
    rating: "all",
  });

  const {
    courses,
    categories,
    loading,
    error,
    filters,
    pagination,
    setFilters,
    resetFilters,
    setPage,
    loadCourses,
    hasFiltersApplied,
  } = useCourses();

    const { contentSettings } = useContent();
  
  useSEO({
    title: 'Courses',
    description: `Explore ${pagination.totalCourses || 'our'} courses designed to test and improve your skills. Find courses from beginner to advanced levels.`,
    keywords: 'courses, online courses, learning, test preparation, skills development, education',
    type: 'website',
  });
  // const navigate = useNavigate();
  const { animations, reducedMotion } = useTheme();

  const handleExpandChange = useCallback((courseId, isExpanded) => {


    if (isExpanded) {
      setExpandedCourseId(courseId);
    } else {
      setExpandedCourseId(null);
    }
  }, []);

  useEffect(() => {
    setLocalFilters({
      category: filters.category || "all",
      difficulty: filters.difficulty || "all",
      price: filters.price || "all",
      duration: filters.duration || "all",
      rating: filters.rating || "all",
    });
    setSearchTerm(filters.searchTerm || "");
  }, []); // Remove filters dependency to prevent loops

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    // Remove the automatic debounced search
  };

  const handleSearchSubmit = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setFilters({ searchTerm: searchTerm });
    }
  };

  // Add this useEffect after your existing useEffect
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 500;
      setIsMobile(mobile);
      if (mobile && viewMode === "list") {
        setViewMode("grid");
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [viewMode]);

  const handleFilterChange = (filterType, value) => {
    const newLocalFilters = {
      ...localFilters,
      [filterType]: value,
    };
    setLocalFilters(newLocalFilters);

    // Build the complete filter object
    const newFilters = { ...filters };

    if (value === "all") {
      // Remove this specific filter
      delete newFilters[filterType];
    } else {
      // Set this specific filter
      newFilters[filterType] = value;
    }

    setFilters(newFilters);
  };

  const handleViewModeChange = (mode) => {
    if (mode === "list" && isMobile) {
      return; // Prevent list view on mobile
    }
    setViewMode(mode);
  };

  const clearFilters = () => {
    setLocalFilters({
      category: "all",
      difficulty: "all",
      price: "all",
      duration: "all",
      rating: "all",
    });
    setSearchTerm("");
    resetFilters();
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case "easy":
        return "text-green-400 bg-green-500/20";
      case "medium":
        return "text-yellow-400 bg-yellow-500/20";
      case "hard":
        return "text-red-400 bg-red-500/20";
      default:
        return "text-slate-400 bg-slate-500/20";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-12 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Loading variant="page" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={animations && !reducedMotion ? { opacity: 0, y: 20 } : {}}
          animate={animations && !reducedMotion ? { opacity: 1, y: 0 } : {}}
          transition={animations && !reducedMotion ? { duration: 0.6 } : {}}
          className="text-center mb-12"
        >
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">
            Explore <span className="gradient-text-blue">Courses</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Discover a wide range of courses designed to test and improve your
            skills. From beginner to advanced levels, find the perfect challenge
            for your learning journey.
          </p>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={animations && !reducedMotion ? { opacity: 0, y: 20 } : {}}
          animate={animations && !reducedMotion ? { opacity: 1, y: 0 } : {}}
          transition={
            animations && !reducedMotion ? { duration: 0.6, delay: 0.1 } : {}
          }
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search courses... (Press Enter to search)"
                  value={searchTerm}
                  onChange={handleSearch}
                  onKeyPress={handleSearchSubmit}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant={showFilters ? "default" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {hasFiltersApplied && (
                  <Badge className="ml-2 h-2 w-2 p-0 bg-blue-500" />
                )}
              </Button>

              {!isMobile && (
                <div className="flex border rounded-md">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleViewModeChange("grid")}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleViewModeChange("list")}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
          {/* Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Filters
                      {hasFiltersApplied && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearFilters}
                        >
                          Clear all
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Category
                        </label>
                        <Select
                          value={localFilters.category}
                          onValueChange={(value) =>
                            handleFilterChange("category", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All Categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map((category) => (
                              <SelectItem
                                key={category._id}
                                value={category._id}
                              >
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Difficulty
                        </label>
                        <Select
                          value={localFilters.difficulty}
                          onValueChange={(value) =>
                            handleFilterChange("difficulty", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All Levels" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Levels</SelectItem>
                            <SelectItem value="Easy">Easy</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Price
                        </label>
                        <Select
                          value={localFilters.price}
                          onValueChange={(value) =>
                            handleFilterChange("price", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All Prices" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Prices</SelectItem>
                            <SelectItem value="free">Free</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Sort By
                        </label>
                        <Select
                          value={filters.sortBy}
                          onValueChange={(value) =>
                            setFilters({ sortBy: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="newest">Newest First</SelectItem>
                            <SelectItem value="oldest">Oldest First</SelectItem>
                            <SelectItem value="name">Name A-Z</SelectItem>
                            <SelectItem value="popular">
                              Most Popular
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Results Summary */}
        <motion.div
          initial={animations && !reducedMotion ? { opacity: 0 } : {}}
          animate={animations && !reducedMotion ? { opacity: 1 } : {}}
          transition={
            animations && !reducedMotion ? { duration: 0.6, delay: 0.2 } : {}
          }
          className="flex items-center justify-between mb-8"
        >
          <div className="text-slate-400">
            {loading ? (
              <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            ) : (
              `Showing ${courses.length} of ${pagination.totalCourses} courses`
            )}
          </div>
          {loading && !courses.length && (
            <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          )}
        </motion.div>

        {/* Error State */}
        {error && (
          <motion.div
            initial={animations && !reducedMotion ? { opacity: 0, y: 20 } : {}}
            animate={animations && !reducedMotion ? { opacity: 1, y: 0 } : {}}
            className="text-center py-12"
          >
            <div className="text-red-400 mb-4">{error}</div>
            <button onClick={loadCourses} className="btn-primary">
              Try Again
            </button>
          </motion.div>
        )}

        {/* No Results */}
        {!loading && !error && courses.length === 0 && (
          <motion.div
            initial={animations && !reducedMotion ? { opacity: 0, y: 20 } : {}}
            animate={animations && !reducedMotion ? { opacity: 1, y: 0 } : {}}
            className="text-center py-12"
          >
            <BookOpen className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No courses found
            </h3>
            <p className="text-slate-400 mb-6">
              Try adjusting your search criteria or filters
            </p>
            {hasFiltersApplied && (
              <button onClick={clearFilters} className="btn-primary">
                Clear Filters
              </button>
            )}
          </motion.div>
        )}

        {/* Courses Grid/List */}
        {courses.length > 0 && (
          <motion.div
            initial={animations && !reducedMotion ? { opacity: 0 } : {}}
            animate={animations && !reducedMotion ? { opacity: 1 } : {}}
            transition={
              animations && !reducedMotion ? { duration: 0.6, delay: 0.3 } : {}
            }
          >
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8 items-start">
                {courses.map((course, index) => (
                  <CourseCard
                    key={course._id}
                    course={course}
                    index={index}
                    isExpanded={expandedCourseId === course._id}
                    onExpandChange={handleExpandChange}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {courses.map((course, index) => (
                  <CourseListItem
                    key={course._id}
                    course={course}
                    index={index}
                    isExpanded={expandedCourseId === course._id}
                    animations={animations}
                    reducedMotion={reducedMotion}
                    onExpandChange={(isExpanded) =>
                      handleExpandChange(course._id, isExpanded)
                    }
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <motion.div
            initial={animations && !reducedMotion ? { opacity: 0, y: 20 } : {}}
            animate={animations && !reducedMotion ? { opacity: 1, y: 0 } : {}}
            transition={
              animations && !reducedMotion ? { duration: 0.6, delay: 0.4 } : {}
            }
            className="flex justify-center mt-12"
          >
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              {[...Array(pagination.totalPages)].map((_, index) => {
                const page = index + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setPage(page)}
                    className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                      pagination.currentPage === page
                        ? "bg-blue-500 text-white"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    {page}
                  </button>
                );
              })}

              <button
                onClick={() => setPage(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Courses;
