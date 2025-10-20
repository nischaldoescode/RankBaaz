import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAdmin } from "../contexts/AdminContext";

import {
  FiUsers,
  FiBookOpen,
  FiTrendingUp,
  FiTrendingDown,
  FiClock,
  FiTarget,
  FiActivity,
  FiPieChart,
  FiFilter,
  FiDownload,
  FiRefreshCw,
  FiEye,
  FiX,
} from "react-icons/fi";

const UserStats = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalTests: 0,
    averageScore: 0,
    topPerformers: [],
    coursePerformance: [],
    difficultyStats: [],
    recentActivity: [],
  });

  const [filters, setFilters] = useState({
    timeRange: "all",
    courseId: "",
    difficulty: "",
  });
  const [showDifficultyWarning, setShowDifficultyWarning] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userDetails, setUserDetails] = useState(null);

  // Use AdminContext instead of local state and functions
  const {
    fetchUserStats,
    fetchUserDetails,
    exportUserStats,
    courses,
    loading,
    fetchCourses,
  } = useAdmin();

  useEffect(() => {
    fetchUserStatsData();
  }, [filters]);

  useEffect(() => {
    if (courses.length === 0) {
      fetchCourses();
    }
  }, []);

  const fetchUserStatsData = async () => {
    try {
      // Add image optimization params
      const optimizedFilters = {
        ...filters,
        imageTransform: "w_100,h_100,c_fill,q_auto,f_auto", // Cloudinary transforms
      };
      const result = await fetchUserStats(optimizedFilters);
      if (result.success) {
        setUserStats(result.data);
      } else {
        // Set fallback data
        setUserStats({
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
        });
      }
    } catch (error) {
      console.error("Error fetching user stats:", error);
      toast.error("Failed to fetch user statistics");
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUserStatsData();
    setRefreshing(false);
  };

  const handleUserClick = async (userId) => {
    setSelectedUser(userId);
    const result = await fetchUserDetails(userId);
    if (result.success) {
      setUserDetails(result.data);
      setShowUserModal(true);
    } else {
      toast.error("Failed to fetch user details");
    }
  };

  const handleExport = async () => {
    await exportUserStats(userStats);
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case "Easy":
        return "text-emerald-700 bg-emerald-50 border border-emerald-200";
      case "Medium":
        return "text-blue-700 bg-blue-50 border border-blue-200";
      case "Hard":
        return "text-red-700 bg-red-50 border border-red-200";
      default:
        return "text-gray-700 bg-gray-50 border border-gray-200";
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-emerald-600 font-semibold";
    if (score >= 60) return "text-amber-600 font-semibold";
    return "text-red-600 font-semibold";
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (loading && !refreshing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">
            Loading user statistics...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              User Statistics
            </h1>
            <p className="text-gray-600 text-lg">
              Monitor user performance and engagement metrics
            </p>
          </div>
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-6 py-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl hover:bg-white hover:shadow-lg transition-all duration-300 disabled:opacity-50 group flex-1 lg:flex-none cursor-pointer"
            >
              <FiRefreshCw
                className={`w-4 h-4 transition-transform duration-300 ${
                  refreshing ? "animate-spin" : "group-hover:rotate-180"
                }`}
              />
              <span className="font-medium">Refresh</span>
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex-1 lg:flex-none cursor-pointer"
            >
              <FiDownload className="w-4 h-4" />
              <span className="font-medium">Export</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6 mb-8 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FiFilter className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-lg font-semibold text-gray-800">Filters</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {["Time Range", "Course", "Difficulty"].map((label, index) => (
              <div key={label} className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  {label}
                </label>
                <select
                  value={
                    index === 0
                      ? filters.timeRange
                      : index === 1
                      ? filters.courseId
                      : filters.difficulty
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    const field =
                      index === 0
                        ? "timeRange"
                        : index === 1
                        ? "courseId"
                        : "difficulty";

                    setFilters((prev) => ({
                      ...prev,
                      [field]: value,
                    }));

                    // Show/hide warning for difficulty filter
                    if (field === "difficulty") {
                      setShowDifficultyWarning(value === "");
                    }
                  }}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm transition-all duration-200 hover:bg-white"
                >
                  {index === 0 ? (
                    <>
                      <option value="all">All time</option>
                      <option value="7d">Last 7 days</option>
                      <option value="30d">Last 30 days</option>
                      <option value="90d">Last 90 days</option>
                    </>
                  ) : index === 1 ? (
                    <>
                      <option value="">All Courses</option>
                      {Array.isArray(courses) &&
                        courses.map((course) => (
                          <option key={course._id} value={course._id}>
                            {course.name}
                          </option>
                        ))}
                    </>
                  ) : (
                    <>
                      <option value="">All Difficulties</option>
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </>
                  )}
                </select>
              </div>
            ))}
          </div>

          {showDifficultyWarning && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
              <span className="text-amber-600 font-semibold">ℹ️</span>
              <p className="text-amber-700">
                Showing combined stats. Multi-difficulty tests count towards
                each difficulty level. Select a specific difficulty for more
                accurate single-difficulty performance.
              </p>
            </div>
          )}
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            {
              label: "Total Users",
              value: userStats.totalUsers,
              icon: FiUsers,
              color: "blue",
              gradient: "from-blue-500 to-blue-600",
            },
            {
              label: "Active Users",
              value: userStats.activeUsers,
              icon: FiTrendingUp,
              color: "emerald",
              gradient: "from-emerald-500 to-emerald-600",
            },
            {
              label: "Total Tests",
              value: userStats.totalTests,
              icon: FiBookOpen,
              color: "amber",
              gradient: "from-amber-500 to-amber-600",
            },
            {
              label: "Average Score",
              value: `${(userStats.averageScore || 0).toFixed(1)}%`,
              icon: FiTarget,
              color: "purple",
              gradient: "from-purple-500 to-purple-600",
            },
          ].map((stat, index) => (
            <div key={stat.label} className="group">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                      {stat.label}
                    </p>
                    <p className="text-2xl lg:text-3xl font-bold text-gray-900">
                      {typeof stat.value === "number"
                        ? stat.value.toLocaleString()
                        : stat.value}
                    </p>
                  </div>
                  <div
                    className={`p-4 bg-gradient-to-br ${stat.gradient} rounded-2xl shadow-lg transform group-hover:scale-110 transition-transform duration-300`}
                  >
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Top Performers */}
          <div className="xl:col-span-2">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 hover:shadow-xl transition-all duration-300">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FiActivity className="w-5 h-5 text-green-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Top Performers
                    </h2>
                  </div>
                </div>
              </div>
              <div className="p-6">
                {Array.isArray(userStats.topPerformers) &&
                userStats.topPerformers.length > 0 ? (
                  <div className="space-y-4">
                    {userStats.topPerformers.map((user, index) => (
                      <div
                        key={user._id || index}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl hover:from-blue-50 hover:to-blue-100/50 transition-all duration-300 group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {user.name || "Unknown User"}
                            </p>
                            <p className="text-sm text-gray-600">
                              {user.email || "No email"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p
                              className={`text-lg font-bold ${getScoreColor(
                                user.averageScore || 0
                              )}`}
                            >
                              {(user.averageScore || 0).toFixed(1)}%
                            </p>
                            <p className="text-sm text-gray-600">
                              {user.testsCompleted || 0} tests
                            </p>
                          </div>
                          <button
                            onClick={() => handleUserClick(user._id)}
                            className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 opacity-0 group-hover:opacity-100 cursor-pointer"
                          >
                            <FiEye className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FiActivity className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-lg font-medium">
                      No performance data available
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      User performance will appear here once tests are completed
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Difficulty Performance */}
          <div>
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 hover:shadow-xl transition-all duration-300">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FiPieChart className="w-5 h-5 text-purple-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Difficulty Performance
                  </h2>
                </div>
              </div>
              <div className="p-6">
                {/* Add explanation banner */}
                <div className="mb-6 p-4 bg-purple-50 border border-purple-100 rounded-xl">
                  <div className="flex items-start gap-3">
                    <FiPieChart className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-purple-900 mb-1">
                        Understanding Difficulty Stats
                      </p>
                      <p className="text-sm text-purple-800">
                        {filters.difficulty === "" ? (
                          <>
                            <strong>Aggregated Mode:</strong> Stats show
                            combined performance across ALL courses.
                            Multi-difficulty tests are counted separately for
                            each difficulty level.
                            <br />
                            <span className="text-xs text-purple-600 mt-1 inline-block">
                              Example: A test with Easy(100%), Medium(80%),
                              Hard(60%) counts as 3 separate attempts.
                            </span>
                          </>
                        ) : (
                          <>
                            <strong>Filtered Mode:</strong> Showing only{" "}
                            {filters.difficulty} difficulty performance
                            {filters.courseId
                              ? ` for the selected course`
                              : ` across all courses`}
                            .
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                {Array.isArray(userStats.difficultyStats) &&
                userStats.difficultyStats.length > 0 ? (
                  <div className="space-y-6">
                    {userStats.difficultyStats.map((stat, index) => (
                      <div key={index} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-semibold ${getDifficultyColor(
                              stat.difficulty
                            )}`}
                          >
                            {stat.difficulty || "Unknown"}
                          </span>
                          <span className="text-lg font-bold text-gray-900">
                            {(stat.averageScore || 0).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-1000 ease-out"
                            style={{
                              width: `${Math.max(stat.averageScore || 0, 2)}%`,
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                          <span className="font-medium">
                            {stat.totalAttempts || 0} attempts
                          </span>
                          <span>Avg: {formatTime(stat.averageTime || 0)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FiPieChart className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium">
                      No difficulty data available
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Course Performance */}
        <div className="mt-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 hover:shadow-xl transition-all duration-300">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <FiBookOpen className="w-5 h-5 text-indigo-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Course Performance
                </h2>
              </div>
            </div>
            <div className="p-6">
              {Array.isArray(userStats.coursePerformance) &&
              userStats.coursePerformance.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {userStats.coursePerformance.map((course, index) => (
                    <div key={course._id || index} className="group">
                      <div className="p-6 border border-gray-200 rounded-2xl bg-gradient-to-br from-white to-gray-50 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                        <div className="flex items-center gap-4 mb-4">
                          {course.image?.url || course.image ? (
                            <img
                              src={course.image?.url || course.image}
                              alt={course.name}
                              className="w-12 h-12 rounded-xl object-cover shadow-md"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                              <FiBookOpen className="w-6 h-6 text-white" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 truncate">
                              {course.name || "Unknown Course"}
                            </h3>
                            <p className="text-sm text-gray-600 truncate">
                              {course.category || "Uncategorized"}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {[
                            {
                              label: "Average Score",
                              value: `${(course.averageScore || 0).toFixed(
                                1
                              )}%`,
                              color: getScoreColor(course.averageScore || 0),
                            },
                            {
                              label: "Total Attempts",
                              value: (course.totalAttempts || 0).toString(),
                              color: "font-semibold text-gray-900",
                            },
                            {
                              label: "Unique Users",
                              value: (course.uniqueUsers || 0).toString(),
                              color: "font-semibold text-indigo-600",
                            },
                            {
                              label: "Accuracy Rate",
                              value: `${(course.accuracyRate || 0).toFixed(
                                1
                              )}%`,
                              color: "font-semibold text-emerald-600",
                            },
                          ].map((item, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between items-center text-sm"
                            >
                              <span className="text-gray-600 font-medium">
                                {item.label}:
                              </span>
                              <span className={item.color}>{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiBookOpen className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-lg font-medium">
                    No course performance data available
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    Course statistics will appear here once users complete tests
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 hover:shadow-xl transition-all duration-300">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FiClock className="w-5 h-5 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Recent Activity
                </h2>
              </div>
            </div>
            <div className="p-6">
              {Array.isArray(userStats.recentActivity) &&
              userStats.recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {userStats.recentActivity.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl hover:from-green-50 hover:to-green-100/50 transition-all duration-300"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-green-600 rounded-full shadow-lg"></div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {activity.userName || "Unknown User"}
                          </p>
                          <p className="text-sm text-gray-600">
                            Completed {activity.courseName || "Unknown Course"}{" "}
                            - {activity.difficulty || "Unknown"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-lg font-bold ${getScoreColor(
                            activity.percentage || 0
                          )}`}
                        >
                          {(activity.percentage || 0).toFixed(1)}%
                        </p>
                        <p className="text-sm text-gray-600">
                          {activity.completedAt
                            ? new Date(activity.completedAt).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                            : activity.createdAt
                            ? new Date(activity.createdAt).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )
                            : "Date not available"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiClock className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-lg font-medium">
                    No recent activity
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    Recent user activities will appear here
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* User Details Modal */}
        {showUserModal && userDetails && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    User Performance Details
                  </h2>
                  <button
                    onClick={() => setShowUserModal(false)}
                    className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all duration-200 cursor-pointer"
                  >
                    <FiX className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl">
                    <div className="flex items-center gap-3 mb-2">
                      <FiBookOpen className="w-6 h-6 text-blue-600" />
                      <span className="font-semibold text-gray-700">
                        Total Tests
                      </span>
                    </div>
                    <p className="text-3xl font-bold text-blue-600">
                      {userDetails.totalTests}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl">
                    <div className="flex items-center gap-3 mb-2">
                      <FiTarget className="w-6 h-6 text-green-600" />
                      <span className="font-semibold text-gray-700">
                        Average Score
                      </span>
                    </div>
                    <p className="text-3xl font-bold text-green-600">
                      {userDetails.averageScore.toFixed(1)}%
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl">
                    <div className="flex items-center gap-3 mb-2">
                      <FiActivity className="w-6 h-6 text-purple-600" />
                      <span className="font-semibold text-gray-700">
                        User Info
                      </span>
                    </div>
                    <p className="text-lg font-bold text-purple-600">
                      {userDetails.name}
                    </p>
                    <p className="text-sm text-gray-600">{userDetails.email}</p>
                  </div>
                </div>

                {/* Performance by Difficulty */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Performance by Difficulty
                  </h3>
                  <div className="space-y-4">
                    {userDetails.performanceByDifficulty
                      .filter((perf) => perf.totalAttempts > 0) // Only show difficulties with attempts
                      .map((perf, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                        >
                          <div className="flex flex-col gap-1">
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-semibold ${getDifficultyColor(
                                perf.difficulty
                              )}`}
                            >
                              {perf.difficulty}
                            </span>
                            <span className="text-xs text-gray-600 ml-1">
                              {perf.totalAttempts}{" "}
                              {perf.totalAttempts === 1
                                ? "attempt"
                                : "attempts"}
                            </span>
                          </div>
                          <div className="flex-1 mx-4">
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-1000"
                                style={{
                                  width: `${Math.max(perf.averageScore, 2)}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                          <span
                            className={`text-lg font-bold ${getScoreColor(
                              perf.averageScore
                            )}`}
                          >
                            {perf.averageScore.toFixed(1)}%
                          </span>
                        </div>
                      ))}
                  </div>
                  {userDetails.performanceByDifficulty.filter(
                    (perf) => perf.totalAttempts > 0
                  ).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No difficulty-specific data available
                    </div>
                  )}
                </div>

                {/* Recent Tests */}
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Recent Tests
                  </h3>
                  {userDetails.recentTests.length > 0 ? (
                    <div className="space-y-3">
                      {userDetails.recentTests.map((test, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-200"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">
                                {test.courseName}
                              </p>
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Handle multiple difficulties with proper spacing */}
                                {test.difficulty && (
                                  <div className="flex gap-1">
                                    {test.difficulty
                                      .split(", ")
                                      .map((diff, idx) => (
                                        <span
                                          key={idx}
                                          className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(
                                            diff.trim()
                                          )}`}
                                        >
                                          {diff.trim()}
                                        </span>
                                      ))}
                                  </div>
                                )}
                                <span className="text-sm text-gray-600">
                                  {test.completedAt
                                    ? new Date(
                                        test.completedAt
                                      ).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })
                                    : "Date not available"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-lg font-bold ${getScoreColor(
                                test.percentage
                              )}`}
                            >
                              {test.percentage.toFixed(1)}%
                            </p>
                            <p className="text-sm text-gray-600">
                              {formatTime(test.timeTaken || 0)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No recent tests available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserStats;
