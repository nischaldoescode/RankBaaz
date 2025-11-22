import React, { useState, useEffect, useCallback } from "react";
import { Eye } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, Trophy, Target, Zap, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiMethods } from "../../services/api";
import Loading from "../common/Loading";

const DifficultySelection = ({ courseId, onSelectDifficulty, onCancel }) => {
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDiff, setSelectedDiff] = useState(null);
  const [banInfo, setBanInfo] = useState(null);

  useEffect(() => {
    loadCourseData();
    checkBanStatus(); // NEW
  }, [courseId]);

  // NEW: Check if user is banned
  const checkBanStatus = async () => {
    try {
      const response = await apiMethods.get(
        `/api/devtools/check-ban/${courseId}`
      );

      if (response.data.banned) {
        setError("banned");
        setBanInfo(response.data.data);
      }
    } catch (error) {
      console.error("Ban check error:", error);
    }
  };

  const loadCourseData = async () => {
    try {
      setLoading(true);
      const response = await apiMethods.courses.getById(courseId);
      setCourse(response.data.data.course);
    } catch (error) {
      setError("Failed to load course information");
      console.error("Load course error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyIcon = (diffName) => {
    switch (diffName.toLowerCase()) {
      case "easy":
        return <Target className="w-5 h-5 text-green-600" />;
      case "medium":
        return <Trophy className="w-5 h-5 text-yellow-600" />;
      case "hard":
        return <Zap className="w-5 h-5 text-red-600" />;
      default:
        return <Target className="w-5 h-5" />;
    }
  };

  const getDifficultyColor = (diffName) => {
    switch (diffName.toLowerCase()) {
      case "easy":
        return "border-green-200 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-950";
      case "medium":
        return "border-yellow-200 hover:border-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-950";
      case "hard":
        return "border-red-200 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-950";
      default:
        return "border-gray-200 hover:border-gray-400";
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return remainingSeconds > 0
        ? `${minutes}m ${remainingSeconds}s`
        : `${minutes}m`;
    }
    return `${seconds}s`;
  };

  const handleDifficultySelect = (difficulty) => {
    setSelectedDiff(difficulty);
  };

  const handleConfirmSelection = () => {
    if (selectedDiff) {
      // Pass all difficulties starting from selected one
      const allDifficultyOrder = ["Easy", "Medium", "Hard"];
      const startIndex = allDifficultyOrder.indexOf(selectedDiff.name);
      const remainingDifficulties = allDifficultyOrder.slice(startIndex);

      // Filter to only include difficulties that exist in the course
      const availableDifficulties = remainingDifficulties.filter((diffName) =>
        course.difficulties.some((d) => d.name === diffName)
      );

      onSelectDifficulty(selectedDiff, course, availableDifficulties);
    }
  };
  const getAvailableDifficulties = useCallback(() => {
    if (!course?.difficulties) return [];

    // Filter to only include difficulties that have questions
    return course.difficulties.filter((difficulty) => {
      const questionsForDifficulty =
        course.questions?.filter(
          (q) => q.difficulty === difficulty.name && q.isActive === true
        ) || [];
      return questionsForDifficulty.length > 0;
    });
  }, [course]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading variant="page" />
      </div>
    );
  }

  if (error) {
    // NEW: Handle banned state with custom UI
    if (error === "banned" && banInfo) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 p-4">
          <Card className="max-w-2xl w-full border-2 border-red-200 dark:border-red-800 shadow-2xl">
            <CardContent className="p-8 text-center">
              {/* Icon */}
              <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg
                  className="w-12 h-12 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>

              {/* Title */}
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Access Denied
              </h1>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-6">
                <p className="text-xl font-bold text-red-900 dark:text-red-200 mb-3">
                  🚫 PERMANENTLY BANNED
                </p>
                <p className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">
                  Course: {banInfo.courseName}
                </p>
                <div className="bg-red-100 dark:bg-red-900/40 border-l-4 border-red-600 p-4 mb-4">
                  <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
                    Violation Reason:
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {banInfo.reason}
                  </p>
                </div>
                <div className="text-xs text-red-600 dark:text-red-400 space-y-1">
                  <p>Banned: {new Date(banInfo.bannedAt).toLocaleString()}</p>
                  <p className="font-bold">Status: PERMANENT BAN</p>
                  <p className="italic">Zero-tolerance policy enforced</p>
                </div>
              </div>

              {/* Support Info */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  If you believe this is a mistake, please contact our support
                  team:
                </p>
                <a
                  href={`mailto:support@rankbaaz.com?subject=Appeal Ban - ${banInfo.courseName}`}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  support@rankbaaz.com
                </a>
              </div>

              {/* Action Button */}
              <Button onClick={onCancel} className="w-full max-w-xs" size="lg">
                Return to Courses
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Polished + centered + professional error UI
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-white px-4">
        <Card className="w-full max-w-xl shadow-lg border bg-white text-black">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">⚠️</div>

            <h1 className="text-3xl font-semibold mb-3">
              Error Loading Course
            </h1>

            <p className="text-gray-600 mb-6 text-base">{error}</p>

            <Button
              onClick={onCancel}
              className="px-6 py-2 text-base font-medium"
            >
              Return to Courses
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  return (
    <div className="max-w-4xl mx-auto p-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={onCancel} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Courses
        </Button>

        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">{course?.name}</h1>
          <p className="text-muted-foreground">
            Select your preferred difficulty level to begin the test
          </p>
        </div>
      </div>

      {/* Course Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Course Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold">Total Questions</div>
              <div className="text-muted-foreground">
                {course?.totalQuestions || 0}
              </div>
            </div>
            <div className="text-center">
              <div className="font-semibold">Question Types</div>
              <div className="text-muted-foreground">
                Multiple Choice, Single Answer
              </div>
            </div>
            <div className="text-center">
              <div className="font-semibold">Total Marks Available</div>
              <div className="text-muted-foreground">
                {course?.difficulties?.reduce(
                  (total, diff) => total + (diff.totalMarks || 0),
                  0
                ) || "N/A"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Difficulty Selection */}
      <div
        className={cn(
          "mb-6",
          getAvailableDifficulties().length === 1
            ? "flex justify-center"
            : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        )}
      >
        {getAvailableDifficulties().map((difficulty) => (
          <div
            key={difficulty.name}
            className={cn(
              getAvailableDifficulties().length === 1 ? "w-full max-w-md" : ""
            )}
          >
            <Card
              className={cn(
                "cursor-pointer transition-all duration-200 hover:scale-[1.02]",
                getDifficultyColor(difficulty.name),
                selectedDiff?.name === difficulty.name &&
                  "ring-2 ring-blue-500 border-blue-400"
              )}
              onClick={() => handleDifficultySelect(difficulty)}
            >
              <CardHeader className="text-center">
                <CardTitle className="text-xl">{difficulty.name}</CardTitle>
                <CardDescription>
                  {difficulty.name === "Easy" &&
                    "Perfect for beginners and practice"}
                  {difficulty.name === "Medium" &&
                    "Balanced challenge for most users"}
                  {difficulty.name === "Hard" && "Advanced level for experts"}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Time Limit
                    </span>
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      <Clock className="w-3 h-3" />
                      {formatTime(difficulty.timerSettings?.maxTime || 0)}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Points per Question
                    </span>
                    <Badge variant="outline">
                      {difficulty.marksPerQuestion} pts
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Total Questions
                    </span>
                    <Badge variant="secondary">
                      {difficulty.maxQuestions} questions
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Maximum Marks
                    </span>
                    <Badge
                      variant="outline"
                      className="bg-blue-50 text-blue-700"
                    >
                      {difficulty.totalMarks} marks
                    </Badge>
                  </div>

                  <Separator />

                  <div className="text-xs text-muted-foreground text-center">
                    {selectedDiff?.name === difficulty.name
                      ? "Selected - Click Confirm to continue"
                      : "Click to select this difficulty"}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Confirm Button */}
      <div className="text-center">
        <Button
          onClick={handleConfirmSelection}
          disabled={!selectedDiff}
          className="min-w-[200px]"
          size="lg"
        >
          {selectedDiff
            ? `Start ${selectedDiff.name} Test`
            : "Select a Difficulty"}
        </Button>
      </div>

      {/* Additional Info */}
      <Card className="mt-6">
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground text-center space-y-2">
            <p>
              <strong>Note:</strong> Once you start the test, you cannot change
              the difficulty level.
            </p>
            <p>
              Make sure you have a stable internet connection and sufficient
              time to complete the test.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DifficultySelection;
