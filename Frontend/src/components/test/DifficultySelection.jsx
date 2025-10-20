import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

  useEffect(() => {
    loadCourseData();
  }, [courseId]);

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
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Card className="text-center">
          <CardContent className="p-6">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold mb-4">Error Loading Course</h1>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={onCancel}>Return to Courses</Button>
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
