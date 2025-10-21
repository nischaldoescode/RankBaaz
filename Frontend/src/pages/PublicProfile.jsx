import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { apiMethods } from "../services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/Button";
import Loading from "../components/common/Loading";
import {
  Trophy,
  Target,
  Award,
  Calendar,
  TrendingUp,
  Clock,
  ArrowLeft,
  Settings,
} from "lucide-react";
import toast from "react-hot-toast";

const PublicProfile = () => {
  const { username: rawUsername } = useParams();

  // Strip @ if it exists (handles both /@username and /username)
  const username = rawUsername.startsWith("@")
    ? rawUsername.slice(1)
    : rawUsername;

  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await apiMethods.profile.getPublicProfile(username);
      setProfileData(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load profile");
      toast.error("Profile not found");
    } finally {
      setLoading(false);
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
    return colors[initial.toUpperCase()] || colors.A;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { year: "numeric", month: "long" };
    return date.toLocaleDateString("en-US", options);
  };

  const getBadgeIcon = (badgeType) => {
    const icons = {
      leaderboard_legend: "🏆",
      perfectionist: "💯",
      speed_demon: "⚡",
    };
    return icons[badgeType] || "🎖️";
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-16">
        <Loading variant="profile" />
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <Card className="max-w-md w-full text-center p-8">
          <p className="text-destructive mb-4">
            {error || "Profile not found"}
          </p>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 pb-8 sm:pb-12 bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
            size="sm"
          >
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden xs:inline">Back</span>
          </Button>
          {profileData.isOwnProfile && (
            <Button
              variant="outline"
              onClick={() => navigate("/profile")}
              className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
              size="sm"
            >
              <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Settings</span>
            </Button>
          )}
        </div>

        {/* Profile Header */}
        <Card className="mb-4 sm:mb-6 overflow-hidden">
          <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-4 sm:gap-6">
              <Avatar className="w-20 h-20 sm:w-24 sm:h-24 shrink-0">
                <AvatarFallback
                  className="text-2xl sm:text-3xl font-bold text-white"
                  style={{
                    backgroundColor: getAvatarColor(
                      profileData.username.charAt(0)
                    ),
                  }}
                >
                  {profileData.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 text-center md:text-left w-full">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-1 break-all hyphens-auto max-w-full">
                  {profileData.name || `@${profileData.username}`}
                </h1>
                <p className="text-lg sm:text-xl text-muted-foreground mb-2 break-all max-w-full">
                  @{profileData.username}
                </p>
                {!profileData.name && !profileData.isOwnProfile && (
                  <p className="text-xs sm:text-sm text-muted-foreground italic">
                    This user keeps their name private
                  </p>
                )}

                {/* Rank Badge */}
                {profileData.rank && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-primary/10 rounded-full mb-3 sm:mb-4 mt-2">
                    <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    <span className="text-sm sm:text-base font-semibold text-primary">
                      Rank #{profileData.rank}
                    </span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-center md:justify-start text-sm w-full">
                  <div className="flex items-center gap-2 justify-center md:justify-start min-w-0 flex-shrink-0">
                    <Award className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 flex-shrink-0" />
                    <span className="font-bold text-xl sm:text-2xl flex-shrink-0">
                      {profileData.points}
                    </span>
                    <span className="text-muted-foreground flex-shrink-0">
                      points
                    </span>
                  </div>
                  <div className="flex items-center gap-2 justify-center md:justify-start min-w-0 max-w-full flex-1">
                    <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs sm:text-sm break-words flex-1 min-w-0">
                      Member since {formatDate(profileData.stats.memberSince)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Badges Section */}
        {profileData.badges.length > 0 && (
          <Card className="mb-4 sm:mb-6 overflow-hidden">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-lg sm:text-xl">Badges</CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 w-full">
                {profileData.badges.map((badge, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-lg border-2 border-amber-300 dark:border-amber-700 min-w-0"
                  >
                    <div className="text-3xl sm:text-4xl flex-shrink-0">
                      {getBadgeIcon(badge.type)}
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <h4 className="font-bold text-foreground text-sm sm:text-base break-words">
                        {badge.name}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 break-words overflow-wrap-anywhere">
                        {badge.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 break-words">
                        Earned {formatDate(badge.earnedAt)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6 w-full">
          <Card className="overflow-hidden min-w-0">
            <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 flex-shrink-0" />
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="text-xl sm:text-2xl font-bold break-words">
                    {profileData.stats.testsCompleted}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground break-words">
                    Tests Completed
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden min-w-0">
            <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <Target className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 flex-shrink-0" />
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="text-xl sm:text-2xl font-bold break-words">
                    {profileData.stats.averagePercentage}%
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground break-words">
                    Avg Score
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2 lg:col-span-1 overflow-hidden min-w-0">
            <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500 flex-shrink-0" />
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="text-xl sm:text-2xl font-bold break-words">
                    {profileData.stats.questionsAnswered}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground break-words">
                    Questions Answered
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="overflow-hidden">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="text-lg sm:text-xl">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            {profileData.recentActivity.length > 0 ? (
              <div className="space-y-2 sm:space-y-3 w-full">
                {profileData.recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 bg-muted/50 rounded-lg min-w-0 w-full"
                  >
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <h4 className="font-medium text-sm sm:text-base break-words max-w-full">
                        {activity.courseName}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground mt-1 min-w-0 max-w-full">
                        <span className="break-words max-w-full">
                          {Array.isArray(activity.difficulty)
                            ? activity.difficulty.join(", ")
                            : activity.difficulty}
                        </span>
                        <span className="hidden sm:inline flex-shrink-0">
                          •
                        </span>
                        <span className="text-xs flex-shrink-0 break-words">
                          {formatDate(activity.completedAt)}
                        </span>
                      </div>
                    </div>
                    <div className="text-left sm:text-right flex-shrink-0 min-w-0">
                      <p className="text-xl sm:text-2xl font-bold text-primary break-words">
                        {activity.percentage}%
                      </p>
                      <p className="text-xs text-muted-foreground break-words">
                        +{activity.pointsEarned} pts
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm sm:text-base">
                No recent activity
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicProfile;
