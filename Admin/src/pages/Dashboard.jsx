import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Users,
  FileText,
  Award,
  TrendingUp,
  TrendingDown,
  Eye,
  Edit,
  Trash2,
  Plus,
  Activity,
  BarChart3,
} from "lucide-react";
import { useAdmin } from "../contexts/AdminContext";

const Dashboard = () => {
  const {
    courses,
    stats,
    categories,
    fetchCourses,
    fetchStats,
    fetchCategories,
    deleteCourse,
    loading,
  } = useAdmin();
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [previousStats, setPreviousStats] = useState({});
  const [animatedStats, setAnimatedStats] = useState({});
  const [deleteConfirmCourse, setDeleteConfirmCourse] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      await fetchCategories();
      await fetchCourses();
      await fetchStats();
    };
    loadData();
  }, []);

  // Animate stats when they change
  useEffect(() => {
    if (stats && Object.keys(stats).length > 0) {
      const newAnimatedStats = {
        totalCourses: {
          value:
            stats.overview?.totalCourses ||
            stats.totalCourses ||
            courses.length,
          change: calculateChange(
            previousStats.overview?.totalCourses || previousStats.totalCourses,
            stats.overview?.totalCourses || stats.totalCourses || courses.length
          ),
          trend: getTrend(
            previousStats.overview?.totalCourses || previousStats.totalCourses,
            stats.overview?.totalCourses || stats.totalCourses || courses.length
          ),
        },
        totalQuestions: {
          value: stats.totalQuestions || 0, // Now comes directly from stats
          change: calculateChange(
            previousStats.totalQuestions,
            stats.totalQuestions || 0
          ),
          trend: getTrend(
            previousStats.totalQuestions,
            stats.totalQuestions || 0
          ),
        },
        totalUsers: {
          value: stats.totalUsers || 0, // Now comes directly from stats
          change: calculateChange(
            previousStats.totalUsers,
            stats.totalUsers || 0
          ),
          trend: getTrend(previousStats.totalUsers, stats.totalUsers || 0),
        },
        totalTests: {
          value: stats.totalTests || 0, // Now comes directly from stats
          change: calculateChange(
            previousStats.totalTests,
            stats.totalTests || 0
          ),
          trend: getTrend(previousStats.totalTests, stats.totalTests || 0),
        },
      };

      setAnimatedStats(newAnimatedStats);
      setPreviousStats(stats);
    }
  }, [stats, courses]);

  const calculateChange = (previous, current) => {
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    const change = ((current - previous) / previous) * 100;
    return Math.round(change * 10) / 10; // Round to 1 decimal place
  };

  const getTrend = (previous, current) => {
    if (!previous || previous === current) return "neutral";
    return current > previous ? "up" : "down";
  };

  const handleDeleteCourse = async (courseId) => {
    setDeleteConfirmCourse(courseId);
  };

  const confirmDeleteCourse = async () => {
    if (deleteConfirmCourse) {
      await deleteCourse(deleteConfirmCourse);
      setDeleteConfirmCourse(null);
    }
  };

  const toggleCourseExpansion = (courseId) => {
    setExpandedCourse(expandedCourse === courseId ? null : courseId);
  };

  const getCategoryName = (category) => {
    // If no category provided
    if (!category) return "Uncategorized";

    // If category is already a populated object with name
    if (typeof category === "object" && category.name) {
      return category.name;
    }

    // If category is just an ID string, find it in categories array
    if (typeof category === "string") {
      if (!categories || categories.length === 0) {
        return "Loading...";
      }
      const foundCategory = categories.find((cat) => cat._id === category);
      return foundCategory ? foundCategory.name : "Uncategorized";
    }

    return "Uncategorized";
  };

  const StatCard = ({ title, data, icon: Icon, color }) => {
    const { value, change, trend } = data || {
      value: 0,
      change: 0,
      trend: "neutral",
    };
    const TrendIcon =
      trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Activity;
    const trendColor =
      trend === "up"
        ? "text-green-600"
        : trend === "down"
        ? "text-red-600"
        : "text-gray-600";
    const trendBg =
      trend === "up"
        ? "bg-green-50"
        : trend === "down"
        ? "bg-red-50"
        : "bg-gray-50";

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`flex-shrink-0 p-3 rounded-xl ${color} shadow-lg`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                {title}
              </h3>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 animate-pulse">
                {value}
              </p>
            </div>
          </div>

          {change !== 0 && (
            <div
              className={`flex items-center space-x-1 px-3 py-1 rounded-full ${trendBg}`}
            >
              <TrendIcon className={`h-4 w-4 ${trendColor}`} />
              <span className={`text-sm font-medium ${trendColor}`}>
                {Math.abs(change)}%
              </span>
            </div>
          )}
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {trend === "up"
                ? "Increased"
                : trend === "down"
                ? "Decreased"
                : "No change"}{" "}
              from last period
            </span>
            <BarChart3 className="h-3 w-3" />
          </div>
        </div>
      </div>
    );
  };

  const DeleteConfirmModal = () =>
    deleteConfirmCourse && (
      <div className="fixed inset-0 bg-black/15 backdrop-blur-md border border-white/20 shadow-lg flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
          <div className="p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
              Delete Course
            </h3>
            <p className="text-gray-600 text-center mb-6">
              Are you sure you want to delete this course? This action cannot be
              undone.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setDeleteConfirmCourse(null)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteCourse}
                className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Overview of your test application performance
            </p>
          </div>
          <Link
            to="/courses/create"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <Plus className="h-5 w-5" />
            <span>Create Course</span>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <StatCard
            title="Total Courses"
            data={animatedStats.totalCourses}
            icon={BookOpen}
            color="bg-gradient-to-r from-blue-500 to-blue-600"
          />
          <StatCard
            title="Total Questions"
            data={animatedStats.totalQuestions}
            icon={FileText}
            color="bg-gradient-to-r from-green-500 to-green-600"
          />
          <StatCard
            title="Active Users"
            data={animatedStats.totalUsers}
            icon={Users}
            color="bg-gradient-to-r from-purple-500 to-purple-600"
          />
          <StatCard
            title="Tests Taken"
            data={animatedStats.totalTests}
            icon={Award}
            color="bg-gradient-to-r from-orange-500 to-orange-600"
          />
        </div>

        {/* Courses Overview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
              <h2 className="text-xl font-semibold text-gray-900">
                Courses Overview
              </h2>
              <span className="text-sm text-gray-500">
                {courses.length} course{courses.length !== 1 ? "s" : ""} total
              </span>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading courses...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="p-8 text-center">
              <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                <BookOpen className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No courses yet
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Get started by creating your first course to begin building your
                test application
              </p>
              <Link
                to="/courses/create"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg inline-flex items-center space-x-2 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <Plus className="h-5 w-5" />
                <span>Create Course</span>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {courses.map((course, index) => (
                <div
                  key={course._id}
                  className="p-6 sm:p-8 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 border-l-4 border-transparent hover:border-blue-400 hover:shadow-lg rounded-r-xl"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between space-y-4 xl:space-y-0">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 flex-1">
                      {course.image ? (
                        <img
                          src={
                            typeof course.image === "string"
                              ? course.image
                              : course.image.url
                          }
                          alt={course.name}
                          className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover flex-shrink-0 shadow-lg border-2 border-white ring-1 ring-gray-100"
                        />
                      ) : (
                        <div className="h-20 w-20 sm:h-24 sm:w-24 bg-gradient-to-br from-blue-100 via-purple-50 to-indigo-100 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg border-2 border-white ring-1 ring-gray-100">
                          <BookOpen className="h-10 w-10 text-blue-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 space-y-2">
                        <h3 className="text-xl font-bold text-gray-900 truncate hover:text-blue-600 transition-colors cursor-pointer">
                          {course.name}
                        </h3>
                        <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 max-w-2xl">
                          {course.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-3">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm">
                            {getCategoryName(
                              course.category || course.categoryId
                            )}
                          </span>
                          <div className="flex items-center bg-gray-50 px-3 py-1 rounded-full">
                            <FileText className="h-4 w-4 mr-2 text-gray-400" />
                            <span className="text-sm font-medium text-gray-700">
                              {course.questions?.length ||
                                course.totalQuestions ||
                                0}{" "}
                              questions
                            </span>
                          </div>
                          <div
                            className={`flex items-center px-3 py-1 rounded-full ${
                              course.isActive ? "bg-green-50" : "bg-red-50"
                            }`}
                          >
                            <span
                              className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                course.isActive ? "bg-green-500" : "bg-red-500"
                              }`}
                            ></span>
                            <span
                              className={`text-sm font-medium ${
                                course.isActive
                                  ? "text-green-700"
                                  : "text-red-700"
                              }`}
                            >
                              {course.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0 pt-4 xl:pt-0 border-t xl:border-t-0 xl:border-l xl:pl-6 border-gray-100">
                      <button
                        onClick={() => toggleCourseExpansion(course._id)}
                        className="p-3 text-gray-400 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md cursor-pointer"
                        title="View Details"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <Link
                        to={`/courses?edit=${course._id}`}
                        className="p-3 text-blue-400 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md"
                        title="Edit Course"
                      >
                        <Edit className="h-5 w-5" />
                      </Link>
                      <Link
                        to={`/courses?manage=${course._id}`}
                        className="p-3 text-green-400 hover:text-green-600 rounded-xl hover:bg-green-50 transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md"
                        title="Manage Questions"
                      >
                        <FileText className="h-5 w-5" />
                      </Link>
                      <button
                        onClick={() => handleDeleteCourse(course._id)}
                        className="p-3 text-red-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md cursor-pointer"
                        title="Delete Course"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Course Details */}
                  {expandedCourse === course._id && (
                    <div className="mt-6 pt-6 border-t border-gray-100 animate-fadeIn">
                      <h4 className="text-sm font-medium text-gray-900 mb-4 uppercase tracking-wide">
                        Difficulty Levels Configuration
                      </h4>
                      {course.difficulties?.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {course.difficulties.map((level, levelIndex) => (
                            <div
                              key={levelIndex}
                              className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-all duration-200"
                            >
                              <h5 className="font-medium text-gray-900 capitalize mb-3 flex items-center">
                                <Award className="h-4 w-4 mr-2 text-gray-600" />
                                {level.name}
                              </h5>
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">
                                    Max Questions:
                                  </span>
                                  <span className="text-sm font-medium text-gray-900">
                                    {course.maxQuestionsPerTest || 20}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">
                                    Marks per Question:
                                  </span>
                                  <span className="text-sm font-medium text-gray-900">
                                    {level.marksPerQuestion}
                                  </span>
                                </div>
                                {level.timerSettings?.maxTime && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">
                                      Time Limit:
                                    </span>
                                    <span className="text-sm font-medium text-gray-900">
                                      {level.timerSettings.maxTime}s
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Award className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm">
                            No difficulty levels configured
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <DeleteConfirmModal />
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
