import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  User,
  Calendar,
  Mail,
  Edit2,
  Save,
  X,
  Lock,
  Trophy,
  TrendingUp,
  Clock,
  Target,
  Award,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTests } from "../context/TestContext";
import { useTheme } from "../context/ThemeContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Loading from "../components/common/Loading";
import toast from "react-hot-toast";
import { LeaderboardInfoModal } from "@/components/Leaderboard/LeaderboardInfoModal";
import { apiMethods } from "../services/api";
import { useSEO } from "../hooks/useSEO";
import { useContent } from "../context/ContentContext";

const GlobalLeaderboard = ({ userId }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [userPosition, setUserPosition] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Combine both API calls in parallel
    const fetchLeaderboardData = async () => {
      try {
        setLoading(true);
        const [leaderboardRes, positionRes] = await Promise.allSettled([
          apiMethods.profile.getGlobalLeaderboard(100),
          apiMethods.profile.getUserPosition(),
        ]);

        if (leaderboardRes.status === "fulfilled") {
          setLeaderboard(leaderboardRes.value.data.data.leaderboard);
        } else {
          console.error("Leaderboard fetch failed:", leaderboardRes.reason);
        }

        if (positionRes.status === "fulfilled") {
          setUserPosition(positionRes.value.data.data);
        } else {
          console.warn(
            "User position unavailable - user may not have completed tests"
          );
        }
      } catch (error) {
        console.error("Failed to fetch leaderboard data:", error);
        toast.error("Failed to load leaderboard");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboardData();
  }, []); // Empty dependency array - only run once on mount

  if (loading) return <Loading variant="spinner" />;

  const getTopThreeBg = (rank) => {
    if (rank === 1) return "bg-gradient-to-r from-amber-400 to-yellow-500";
    if (rank === 2) return "bg-gradient-to-r from-gray-300 to-gray-400";
    if (rank === 3) return "bg-gradient-to-r from-orange-400 to-orange-600";
    return "bg-muted/30";
  };

  return (
    <div className="space-y-4">
      {/* User's Position Banner - Only show if user has a rank */}
      {userPosition && userPosition.rank ? (
        <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Trophy className="w-6 h-6 text-primary flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground">Your Position</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-2xl font-bold text-primary">
                    #{userPosition.rank}
                  </p>
                  {userPosition.rankChange !== undefined &&
                    userPosition.rankChange !== null && (
                      <span
                        className={cn(
                          "text-sm font-medium flex items-center",
                          userPosition.rankChange > 0
                            ? "text-green-600"
                            : userPosition.rankChange < 0
                            ? "text-red-600"
                            : "text-gray-500"
                        )}
                      >
                        {userPosition.rankChange > 0 && (
                          <>↑ {userPosition.rankChange}</>
                        )}
                        {userPosition.rankChange < 0 && (
                          <>↓ {Math.abs(userPosition.rankChange)}</>
                        )}
                        {userPosition.rankChange === 0 && <>~ 0</>}
                      </span>
                    )}
                </div>
              </div>
            </div>
            <div className="text-left sm:text-right flex-shrink-0">
              <p className="text-sm text-muted-foreground">Total Points</p>
              <p className="text-2xl font-bold break-words">
                {userPosition.points}
              </p>
            </div>
          </div>
        </div>
      ) : userPosition ? (
        // Show message when user has no rank yet
        <div className="p-4 bg-muted/20 border border-muted rounded-lg text-center">
          <Trophy className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
          <p className="text-lg font-medium mb-1">No Rank Yet</p>
          <p className="text-sm text-muted-foreground">
            {userPosition.message || "Complete tests to earn a rank"}
          </p>
        </div>
      ) : null}

      {/* Leaderboard List - Only show if there are entries */}
      {leaderboard.length > 0 ? (
        <div className="space-y-2">
          {leaderboard.map((entry) => {
            const isCurrentUser = entry.userId === userId;
            const isTopThree = entry.rank <= 3;

            return (
              <motion.div
                key={entry.userId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: entry.rank * 0.02 }}
                className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg transition-all min-w-0 ${
                  isCurrentUser
                    ? "bg-primary/10 border-2 border-primary/20 shadow-lg"
                    : getTopThreeBg(entry.rank)
                } ${isTopThree && !isCurrentUser ? "text-white" : ""}`}
              >
                {/* Rank Badge */}
                <div
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-base sm:text-lg flex-shrink-0 ${
                    isTopThree && !isCurrentUser
                      ? "bg-white/20 backdrop-blur-sm"
                      : "bg-muted"
                  }`}
                >
                  {entry.rank}
                </div>

                {/* User Info */}

                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      to={`/${entry.username}`}
                      className={`font-semibold hover:underline break-all ${
                        isCurrentUser ? "text-primary" : ""
                      }`}
                    >
                      {isCurrentUser ? "You" : entry.name}
                    </Link>
                    {entry.badges.length > 0 && (
                      <div className="flex gap-1 flex-shrink-0">
                        {entry.badges.slice(0, 3).map((badge, idx) => (
                          <span key={idx} className="text-base sm:text-lg">
                            {getBadgeIcon(badge.type)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <p
                    className={`text-xs sm:text-sm break-all ${
                      isTopThree && !isCurrentUser
                        ? "text-white/80"
                        : "text-muted-foreground"
                    }`}
                  >
                    @{entry.username} • {entry.testsCompleted} tests
                  </p>
                </div>

                {/* Points */}
                <div className="text-right flex-shrink-0">
                  <p
                    className={`text-xl sm:text-2xl font-bold break-words ${
                      isTopThree && !isCurrentUser
                        ? "text-white"
                        : "text-primary"
                    }`}
                  >
                    {entry.points}
                  </p>
                  <p
                    className={`text-xs ${
                      isTopThree && !isCurrentUser
                        ? "text-white/70"
                        : "text-muted-foreground"
                    }`}
                  >
                    points
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        // Show message when leaderboard is empty
        <div className="p-8 text-center text-muted-foreground">
          <Trophy className="w-16 h-16 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium mb-1">No Rankings Yet</p>
          <p className="text-sm">Be the first to complete a test!</p>
        </div>
      )}
    </div>
  );
};

// Helper function for badge icons
const getBadgeIcon = (badgeType) => {
  const icons = {
    leaderboard_legend: "🏆",
    perfectionist: "💯",
    speed_demon: "⚡",
  };
  return icons[badgeType] || "🎖️";
};

const Profile = () => {
  const { user, loading: authLoading, updateProfile } = useAuth();

  const {
    testHistory,
    userStats,
    getTestHistory,
    getUserStats,
    getLeaderboard,
  } = useTests();
  const { contentSettings } = useContent();
  const { animations, reducedMotion } = useTheme();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [editMode, setEditMode] = useState(null);
  const [expandedTest, setExpandedTest] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showLeaderboardInfo, setShowLeaderboardInfo] = useState(false);
  const [leaderboardInfoData, setLeaderboardInfoData] = useState(null);

  const [editData, setEditData] = useState({
    name: "",
    dateOfBirth: "",
    gender: "",
    password: "",
  });

  const [leaderboardData, setLeaderboardData] = useState(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

    useSEO({
    title: 'My Profile',
    description: `Manage your ${contentSettings?.siteName || 'TestMaster Pro'} profile, view test history, track progress, and check leaderboard rankings.`,
    keywords: 'profile, dashboard, test history, progress tracking, leaderboard, user profile',
    type: 'website',
    noindex: true, // Private profile pages should not be indexed
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      name: user?.name || 'User Profile',
      description: 'User profile dashboard',
      url: window.location.href,
      mainEntity: {
        '@type': 'Person',
        name: user?.name,
        identifier: user?.username
      }
    }
  });

  useEffect(() => {
    if (user && !userStats) {
      // Only fetch if we don't have stats yet
      const fetchInitialData = async () => {
        await Promise.all([getTestHistory(), getUserStats()]);
      };
      fetchInitialData();
    }
  }, [user?._id]); // Only depend on user ID, not entire user object
  useEffect(() => {
    if (showLeaderboardInfo && !leaderboardInfoData) {
      fetchLeaderboardInfo();
    }
  }, [showLeaderboardInfo]);

  useEffect(() => {
    if (location.state?.initialTab) {
      setActiveTab(location.state.initialTab);
    }
  }, [location.state]);

  const fetchLeaderboardInfo = async () => {
    try {
      const response = await apiMethods.tests.getLeaderboardInfo();
      setLeaderboardInfoData(response.data.data);
    } catch (error) {
      console.error("Failed to fetch leaderboard info");
    }
  };

  const getAvatarColor = (initial) => {
    const colors = {
      A: "#3b82f6",
      B: "#8b5cf6",
      C: "#ec4899",
      D: "#f59e0b",
      E: "#10b981",
      F: "#6366f1",
      G: "#14b8a6",
      H: "#f43f5e",
      I: "#8b5cf6",
      J: "#06b6d4",
      K: "#84cc16",
      L: "#f97316",
      M: "#a855f7",
      N: "#22c55e",
      O: "#eab308",
      P: "#ef4444",
      Q: "#06b6d4",
      R: "#8b5cf6",
      S: "#14b8a6",
      T: "#f59e0b",
      U: "#3b82f6",
      V: "#ec4899",
      W: "#10b981",
      X: "#6366f1",
      Y: "#f43f5e",
      Z: "#84cc16",
    };
    const char = initial.charAt(0).toUpperCase();
    return colors[char] || colors.A;
  };

  const getUsernameInitial = () => {
    if (!user?.username) return "U";
    return user.username.charAt(0).toUpperCase();
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) return "N/A";

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  };

  // const handleEditClick = (field) => {
  //   setEditMode(field);
  //   setEditData({
  //     ...editData,
  //     [field]:
  //       field === "dateOfBirth" ? formatDate(user[field]) : user[field] || "",
  //     password: "",
  //   });
  //   setShowPasswordModal(true);
  // };

  const handleSave = async () => {
    if (!editData.password) {
      toast.error("Password is required to update profile");
      return;
    }

    setLoading(true);
    try {
      const updatePayload = {
        password: editData.password,
      };

      if (editMode === "name") {
        if (!editData.name?.trim()) {
          toast.error("Name is required");
          setLoading(false);
          return;
        }
        updatePayload.name = editData.name.trim();
      } else if (editMode === "dateOfBirth") {
        const datePattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        const match = editData.dateOfBirth.match(datePattern);

        if (!match) {
          toast.error("Please enter date in DD/MM/YYYY format");
          setLoading(false);
          return;
        }

        const [, day, month, year] = match;
        const date = new Date(year, month - 1, day);

        if (
          date.getDate() !== parseInt(day) ||
          date.getMonth() !== parseInt(month) - 1
        ) {
          toast.error("Please enter a valid date");
          setLoading(false);
          return;
        }

        if (date > new Date()) {
          toast.error("Date of birth cannot be in the future");
          setLoading(false);
          return;
        }

        updatePayload.dateOfBirth = date.toISOString();
      } else if (editMode === "gender") {
        if (!["Male", "Female", "Other"].includes(editData.gender)) {
          toast.error("Please select a valid gender");
          setLoading(false);
          return;
        }
        updatePayload.gender = editData.gender;
      }

      // updateProfile from context (already destructured at top)
      const result = await updateProfile(updatePayload);

      if (result.success) {
        toast.success("Profile updated successfully");
        setEditMode(null);
        setEditData({ name: "", dateOfBirth: "", gender: "", password: "" });
        setShowPassword(false);
      }
    } catch (error) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditMode(null);
    setShowPasswordModal(false);
    setEditData({ name: "", dateOfBirth: "", gender: "", password: "" });
  };

  const fetchLeaderboard = async (courseId, difficulty = "all") => {
    setLeaderboardLoading(true);
    setLeaderboardData(null);

    try {
      const result = await getLeaderboard(courseId, difficulty);

      if (result.success) {
        // Check if explicitly empty
        if (result.data?.isEmpty) {
          toast("ℹ️ No one has completed this course yet. Be the first!");
          setLeaderboardData([]);
        } else if (!result.leaderboard || result.leaderboard.length === 0) {
          // Fallback check
          toast("ℹ️ No leaderboard data available");
          setLeaderboardData([]);
        } else {
          // Has data
          setLeaderboardData(result.leaderboard);
        }
      } else {
        throw new Error(result.error || "Failed to load leaderboard");
      }
    } catch (error) {
      console.error("Leaderboard fetch error:", error);
      toast.error(error.message || "Failed to load leaderboard");
      setLeaderboardData([]);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen pt-16">
        <Loading variant="profile" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full overflow-x-hidden">
        {/* Profile Header */}
        <motion.div
          initial={animations && !reducedMotion ? { opacity: 0, y: 20 } : {}}
          animate={animations && !reducedMotion ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-8"
        >
          <Avatar className="w-24 h-24 mx-auto mb-4">
            <AvatarFallback
              className="text-3xl font-bold text-white"
              style={{ backgroundColor: getAvatarColor(getUsernameInitial()) }}
            >
              {getUsernameInitial()}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-3xl font-bold text-foreground mb-2 break-words px-4 max-w-full">
            {user?.name}
          </h1>
          <p className="text-muted-foreground mb-2 break-all px-4 max-w-full">
            {user?.email}
          </p>
          <Link
            to={`/@${user?.username}`}
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline break-all px-4 max-w-full"
          >
            <User className="w-4 h-4 flex-shrink-0" />
            <span className="break-all">
              View public profile (@{user?.username})
            </span>
          </Link>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 w-full">
          <Card className="min-w-0">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 min-w-0">
                <Trophy className="w-8 h-8 text-primary flex-shrink-0" />
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="text-2xl font-bold break-words">
                    {userStats?.overall?.totalTests || 0}
                  </p>
                  <p className="text-sm text-muted-foreground break-words">
                    Tests Taken
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Target className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {userStats?.overall?.averageScore?.toFixed(1) || 0}%
                  </p>
                  <p className="text-sm text-muted-foreground">Avg Score</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 min-w-0">
                <Award className="w-8 h-8 text-amber-500 flex-shrink-0" />
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="text-2xl font-bold break-words">
                    {userStats?.overall?.bestScore || 0}%
                  </p>
                  <p className="text-sm text-muted-foreground break-words">
                    Best Score
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 min-w-0">
                <Clock className="w-8 h-8 text-blue-500 flex-shrink-0" />
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="text-2xl font-bold break-words">
                    {Math.round((userStats?.overall?.totalTimeSpent || 0) / 60)}
                  </p>
                  <p className="text-sm text-muted-foreground break-words">
                    Total Minutes
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 sm:gap-4 mb-6 border-b border-border overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-3 px-2 sm:px-3 font-medium transition-colors relative whitespace-nowrap text-sm sm:text-base ${
              activeTab === "overview"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Overview
            {activeTab === "overview" && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab("information")}
            className={`pb-3 px-2 sm:px-3 font-medium transition-colors relative whitespace-nowrap text-sm sm:text-base ${
              activeTab === "information"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Personal Information
            {activeTab === "information" && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`pb-3 px-2 sm:px-3 font-medium transition-colors relative whitespace-nowrap text-sm sm:text-base ${
              activeTab === "history"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Test History
            {activeTab === "history" && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`pb-3 px-2 sm:px-3 font-medium transition-colors relative whitespace-nowrap text-sm sm:text-base ${
              activeTab === "leaderboard"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Leaderboard
            {activeTab === "leaderboard" && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
              />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Course Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  {userStats?.courseStats?.length > 0 ? (
                    <div className="space-y-4 w-full">
                      {userStats.courseStats.map((course) => (
                        <div
                          key={course._id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-muted/50 rounded-lg min-w-0"
                        >
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <h4 className="font-medium break-words">
                              {course.courseName}
                            </h4>
                            <p className="text-sm text-muted-foreground break-words">
                              {course.testsTaken} tests • Avg:{" "}
                              {course.averageScore.toFixed(1)}%
                            </p>
                          </div>
                          <div className="text-left sm:text-right flex-shrink-0">
                            <p className="text-2xl font-bold text-primary break-words">
                              {course.bestScore}%
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Best Score
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No test history yet. Start your first test!
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === "information" && (
            <motion.div
              key="information"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-3"
            >
              {/* Name Field */}
              <Card>
                <CardContent className="p-0">
                  <button
                    onClick={() =>
                      setEditMode(editMode === "name" ? null : "name")
                    }
                    className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 w-full">
                      <User className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <div className="text-left min-w-0 flex-1 overflow-hidden">
                        <p className="text-sm font-medium text-muted-foreground">
                          Name
                        </p>
                        <p className="font-medium break-words">{user?.name}</p>
                      </div>
                    </div>
                    {editMode === "name" ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </button>

                  <AnimatePresence>
                    {editMode === "name" && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border overflow-hidden"
                      >
                        <div className="p-4 space-y-4 w-full">
                          <div className="w-full">
                            <Input
                              type="text"
                              value={editData.name}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  name: e.target.value,
                                })
                              }
                              placeholder="Enter new name"
                              className="w-full"
                            />
                          </div>
                          <div className="space-y-2 w-full">
                            <label className="text-sm font-medium">
                              Password (Required)
                            </label>
                            <div className="relative w-full">
                              <Input
                                type={showPassword ? "text" : "password"}
                                value={editData.password}
                                onChange={(e) =>
                                  setEditData({
                                    ...editData,
                                    password: e.target.value,
                                  })
                                }
                                placeholder="Enter your password"
                                className="pr-10 w-full"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2"
                              >
                                {showPassword ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                          <div className="flex gap-2 w-full">
                            <Button
                              variant="outline"
                              onClick={() => setEditMode(null)}
                              className="flex-1 min-w-0"
                            >
                              <span className="truncate">Cancel</span>
                            </Button>
                            <Button
                              onClick={handleSave}
                              disabled={loading}
                              className="flex-1 min-w-0"
                            >
                              <span className="truncate">
                                {loading ? "Saving..." : "Save"}
                              </span>
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>

              {/* Email Field (Read-only) */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 min-w-0 w-full">
                    <Mail className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p className="text-sm font-medium text-muted-foreground">
                        Email
                      </p>
                      <p className="font-medium break-all">{user?.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Date of Birth Field */}
              <Card>
                <CardContent className="p-0">
                  <button
                    onClick={() =>
                      setEditMode(
                        editMode === "dateOfBirth" ? null : "dateOfBirth"
                      )
                    }
                    className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-muted-foreground">
                          Date of Birth
                        </p>
                        <p className="font-medium">
                          {formatDate(user?.dateOfBirth)}
                        </p>
                      </div>
                    </div>
                    {editMode === "dateOfBirth" ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </button>

                  <AnimatePresence>
                    {editMode === "dateOfBirth" && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border overflow-hidden"
                      >
                        <div className="p-4 space-y-4 w-full">
                          <div className="space-y-2 w-full">
                            <label className="text-sm font-medium break-words">
                              Date of Birth (DD/MM/YYYY)
                            </label>
                            <div className="w-full">
                              <Input
                                type="text"
                                value={editData.dateOfBirth}
                                onChange={(e) =>
                                  setEditData({
                                    ...editData,
                                    dateOfBirth: e.target.value,
                                  })
                                }
                                placeholder="DD/MM/YYYY"
                                maxLength={10}
                                className="w-full"
                              />
                            </div>
                          </div>
                          <div className="space-y-2 w-full">
                            <label className="text-sm font-medium">
                              Password (Required)
                            </label>
                            <div className="relative w-full">
                              <Input
                                type={showPassword ? "text" : "password"}
                                value={editData.password}
                                onChange={(e) =>
                                  setEditData({
                                    ...editData,
                                    password: e.target.value,
                                  })
                                }
                                placeholder="Enter your password"
                                className="pr-10 w-full"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 flex-shrink-0"
                              >
                                {showPassword ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                          <div className="flex gap-2 w-full">
                            <Button
                              variant="outline"
                              onClick={() => setEditMode(null)}
                              className="flex-1 min-w-0"
                            >
                              <span className="truncate">Cancel</span>
                            </Button>
                            <Button
                              onClick={handleSave}
                              disabled={loading}
                              className="flex-1 min-w-0"
                            >
                              <span className="truncate">
                                {loading ? "Saving..." : "Save"}
                              </span>
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>

              {/* Gender Field */}
              <Card>
                <CardContent className="p-0">
                  <button
                    onClick={() =>
                      setEditMode(editMode === "gender" ? null : "gender")
                    }
                    className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 w-full">
                      <User className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <div className="text-left min-w-0 flex-1 overflow-hidden">
                        <p className="text-sm font-medium text-muted-foreground">
                          Gender
                        </p>
                        <p className="font-medium">{user?.gender}</p>
                      </div>
                    </div>
                    {editMode === "gender" ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </button>

                  <AnimatePresence>
                    {editMode === "gender" && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border overflow-hidden"
                      >
                        <div className="p-4 space-y-4 w-full">
                          <div className="w-full">
                            <Select
                              value={editData.gender}
                              onValueChange={(value) =>
                                setEditData({ ...editData, gender: value })
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Male">Male</SelectItem>
                                <SelectItem value="Female">Female</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2 w-full">
                            <label className="text-sm font-medium">
                              Password (Required)
                            </label>
                            <div className="relative w-full">
                              <Input
                                type={showPassword ? "text" : "password"}
                                value={editData.password}
                                onChange={(e) =>
                                  setEditData({
                                    ...editData,
                                    password: e.target.value,
                                  })
                                }
                                placeholder="Enter your password"
                                className="pr-10 w-full"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 flex-shrink-0"
                              >
                                {showPassword ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                          <div className="flex gap-2 w-full">
                            <Button
                              variant="outline"
                              onClick={() => setEditMode(null)}
                              className="flex-1 min-w-0"
                            >
                              <span className="truncate">Cancel</span>
                            </Button>
                            <Button
                              onClick={handleSave}
                              disabled={loading}
                              className="flex-1 min-w-0"
                            >
                              <span className="truncate">
                                {loading ? "Saving..." : "Save"}
                              </span>
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>

              {/* Name Visibility Toggle */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <User className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-muted-foreground">
                          Name Visibility
                        </p>
                        <p className="text-xs text-muted-foreground break-words">
                          {user?.nameVisibility === "public"
                            ? "Your name is visible to everyone"
                            : "Only you can see your name"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {user?.nameVisibility === "public"
                          ? "Public"
                          : "Private"}
                      </span>
                      <button
                        onClick={async () => {
                          const newVisibility =
                            user?.nameVisibility === "public"
                              ? "private"
                              : "public";
                          const result = await updateProfile({
                            nameVisibility: newVisibility,
                          });
                          if (result.success) {
                            toast.success(
                              `Name is now ${
                                newVisibility === "public"
                                  ? "public"
                                  : "private"
                              }`
                            );
                          }
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          user?.nameVisibility === "public"
                            ? "bg-primary"
                            : "bg-muted-foreground/30"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            user?.nameVisibility === "public"
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card>
                <CardHeader>
                  {" "}
                  <CardTitle className="mt-2">Test History</CardTitle>
                </CardHeader>
                <CardContent>
                  {testHistory?.length > 0 ? (
                    <div className="space-y-3">
                      {testHistory.map((test) => (
                        <div
                          key={test._id}
                          className="border border-border rounded-lg overflow-hidden"
                        >
                          <button
                            onClick={() =>
                              setExpandedTest(
                                expandedTest === test._id ? null : test._id
                              )
                            }
                            className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors min-w-0"
                          >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div
                                className={`w-16 h-16 rounded-lg flex items-center justify-center text-white font-bold text-xl ${
                                  test.percentage >= 80
                                    ? "bg-green-500"
                                    : test.percentage >= 60
                                    ? "bg-blue-500"
                                    : test.percentage >= 40
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                                }`}
                              >
                                {test.percentage}%
                              </div>
                              <div className="text-left flex-1 min-w-0 overflow-hidden">
                                <h4 className="font-semibold break-words">
                                  {test.course?.name || "Unknown Course"}
                                </h4>
                                <p className="text-sm text-muted-foreground break-words">
                                  {Array.isArray(test.difficulty)
                                    ? test.difficulty.join(", ")
                                    : test.difficulty}{" "}
                                  • {test.totalQuestions} questions
                                </p>
                                <p className="text-xs text-muted-foreground break-words">
                                  {formatDate(test.completedAt)}
                                </p>
                              </div>
                            </div>
                            {expandedTest === test._id ? (
                              <ChevronDown className="w-5 h-5" />
                            ) : (
                              <ChevronRight className="w-5 h-5" />
                            )}
                          </button>

                          <AnimatePresence>
                            {expandedTest === test._id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="border-t border-border"
                              >
                                <div className="p-4 space-y-3 bg-muted/20">
                                  {test.testSettings?.isMultiDifficulty &&
                                  test.testSettings?.difficultyResults ? (
                                    <div className="space-y-2">
                                      {test.testSettings.difficultyResults.map(
                                        (diffResult) => {
                                          const diffPercentage =
                                            diffResult.maxPossibleScore > 0
                                              ? Math.round(
                                                  (diffResult.totalScore /
                                                    diffResult.maxPossibleScore) *
                                                    100
                                                )
                                              : 0;
                                          return (
                                            <div
                                              key={diffResult.difficulty}
                                              className="p-3 bg-background rounded-lg min-w-0"
                                            >
                                              <div className="flex items-center justify-between mb-2 gap-2 min-w-0">
                                                <span className="font-medium break-words flex-1 min-w-0">
                                                  {diffResult.difficulty}
                                                </span>
                                                <span
                                                  className={`text-lg sm:text-xl font-bold flex-shrink-0 ${
                                                    diffPercentage >= 80
                                                      ? "text-green-500"
                                                      : diffPercentage >= 60
                                                      ? "text-blue-500"
                                                      : diffPercentage >= 40
                                                      ? "text-amber-500"
                                                      : "text-red-500"
                                                  }`}
                                                >
                                                  {diffPercentage}%
                                                </span>
                                              </div>
                                              <div className="grid grid-cols-3 gap-2 text-sm w-full">
                                                <div className="text-center min-w-0">
                                                  <p className="text-green-500 font-semibold break-words">
                                                    {diffResult.correctAnswers}
                                                  </p>
                                                  <p className="text-xs text-muted-foreground">
                                                    Correct
                                                  </p>
                                                </div>
                                                <div className="text-center min-w-0">
                                                  <p className="text-red-500 font-semibold break-words">
                                                    {diffResult.wrongAnswers}
                                                  </p>
                                                  <p className="text-xs text-muted-foreground">
                                                    Wrong
                                                  </p>
                                                </div>
                                                <div className="text-center min-w-0">
                                                  <p className="text-muted-foreground font-semibold break-words">
                                                    {diffResult.unanswered || 0}
                                                  </p>
                                                  <p className="text-xs text-muted-foreground">
                                                    Skipped
                                                  </p>
                                                </div>
                                              </div>
                                              <div className="mt-2 text-center text-xs text-muted-foreground opacity-50 cursor-not-allowed break-words">
                                                Already completed
                                              </div>
                                            </div>
                                          );
                                        }
                                      )}
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-3 gap-3 sm:gap-4 text-center w-full">
                                      <div className="min-w-0">
                                        <p className="text-xl sm:text-2xl font-bold text-green-500 break-words">
                                          {test.correctAnswers}
                                        </p>
                                        <p className="text-xs sm:text-sm text-muted-foreground">
                                          Correct
                                        </p>
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xl sm:text-2xl font-bold text-red-500 break-words">
                                          {test.wrongAnswers}
                                        </p>
                                        <p className="text-xs sm:text-sm text-muted-foreground">
                                          Wrong
                                        </p>
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xl sm:text-2xl font-bold text-muted-foreground break-words">
                                          {test.unanswered}
                                        </p>
                                        <p className="text-xs sm:text-sm text-muted-foreground">
                                          Skipped
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  <div className="pt-3 border-t border-border/50">
                                    <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 text-xs sm:text-sm">
                                      <span className="text-muted-foreground break-words">
                                        Score: {test.totalScore}/
                                        {test.maxPossibleScore}
                                      </span>
                                      <span className="text-muted-foreground whitespace-nowrap">
                                        Time: {Math.floor(test.timeTaken / 60)}m{" "}
                                        {test.timeTaken % 60}s
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No test history yet. Start your first test!
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === "leaderboard" && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Global Leaderboard */}
              <Card className="mt-6">
                {" "}
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-6">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="mt-6 break-words">
                      Global Leaderboard
                    </CardTitle>
                    <p className="text-sm text-muted-foreground break-words">
                      Top players by total points
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowLeaderboardInfo(true)}
                    className="flex items-center gap-2 flex-shrink-0 whitespace-nowrap"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs sm:text-sm">How Points Work</span>
                  </Button>
                </CardHeader>
                <CardContent>
                  <GlobalLeaderboard userId={user?._id} />
                </CardContent>
              </Card>

              {/* Course-specific leaderboards */}
              <Card>
                <CardHeader>
                  {" "}
                  <CardTitle className="mt-6 break-words">
                    Course Leaderboards
                  </CardTitle>
                  <p className="text-sm text-muted-foreground break-words">
                    Your rankings in specific courses
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {userStats?.courseStats?.length > 0 ? (
                    <div className="space-y-4">
                      {userStats.courseStats.map((course) => (
                        <div key={course._id} className="space-y-3 w-full">
                          <button
                            onClick={() => fetchLeaderboard(course._id)}
                            className="w-full p-4 bg-muted/50 hover:bg-muted rounded-lg transition-colors text-left flex items-center justify-between gap-3 min-w-0"
                          >
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <h4 className="font-semibold break-words">
                                {course.courseName}
                              </h4>
                              <p className="text-sm text-muted-foreground whitespace-nowrap">
                                Your best: {course.bestScore}%
                              </p>
                            </div>
                            <ChevronRight className="w-5 h-5 flex-shrink-0" />
                          </button>

                          {leaderboardData !== null && !leaderboardLoading && (
                            <div className="pl-4 space-y-2">
                              {leaderboardData.length === 0 ? (
                                <Alert>
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertDescription>
                                    No test results yet for this course.
                                    Complete a test to appear on the
                                    leaderboard!
                                  </AlertDescription>
                                </Alert>
                              ) : (
                                leaderboardData
                                  .slice(0, 10)
                                  .map((entry, index) => {
                                    const isCurrentUser =
                                      entry.userId === user?._id;

                                    // CORRECT: Use the pre-decoded values from leaderboardService
                                    // The formatLeaderboardResults already extracts these correctly
                                    const percentage =
                                      entry.percentage ||
                                      Math.floor((entry.score || 0) / 1000);
                                    const timeTaken =
                                      entry.timeTaken ||
                                      1000000 - ((entry.score || 0) % 1000);
                                    const minutes = Math.floor(timeTaken / 60);
                                    const seconds = timeTaken % 60;

                                    return (
                                      <div
                                        key={entry.userId}
                                        className={`flex items-center gap-2 sm:gap-3 p-3 rounded-lg min-w-0 ${
                                          isCurrentUser
                                            ? "bg-primary/10 border border-primary/20"
                                            : "bg-muted/30"
                                        }`}
                                      >
                                        <div
                                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                                            index === 0
                                              ? "bg-amber-500 text-white"
                                              : index === 1
                                              ? "bg-gray-400 text-white"
                                              : index === 2
                                              ? "bg-orange-600 text-white"
                                              : "bg-muted text-muted-foreground"
                                          }`}
                                        >
                                          {entry.rank}
                                        </div>
                                        <div className="flex-1 min-w-0 overflow-hidden">
                                          <p
                                            className={`font-medium break-all ${
                                              isCurrentUser
                                                ? "text-primary"
                                                : ""
                                            }`}
                                          >
                                            {isCurrentUser ? "You" : entry.name}
                                          </p>
                                          <p className="text-xs text-muted-foreground whitespace-nowrap">
                                            {minutes}m {seconds}s
                                          </p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                          <p className="text-base sm:text-lg font-bold text-primary">
                                            {percentage}%
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            Score
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })
                              )}
                            </div>
                          )}

                          {leaderboardLoading && (
                            <div className="flex justify-center py-8">
                              <Loading variant="spinner" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Complete tests to appear on leaderboards
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <LeaderboardInfoModal
        isOpen={showLeaderboardInfo}
        onClose={() => setShowLeaderboardInfo(false)}
        infoData={leaderboardInfoData}
      />
    </div>
  );
};

export default Profile;
