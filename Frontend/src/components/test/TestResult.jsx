import React, { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useTests } from "../../context/TestContext";
import {
  CheckCircleIcon,
  XCircleIcon,
  TrophyIcon,
  ClockIcon,
  ChartBarIcon,
  EyeIcon,
  ArrowRightIcon,
  AcademicCapIcon,
  StarIcon,
  PlayCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import Loading from "../common/Loading";
import VideoPlayer from "../video/VideoPlayer";
import { apiMethods } from "@/services/api";

const TestResult = ({ isPaid }) => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { theme, animations, reducedMotion } = useTheme();
  const { getTestResult, testResult, loading, error } = useTests();

  const [showDetails, setShowDetails] = useState(false);
  const [celebrationComplete, setCelebrationComplete] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [expandedDifficulties, setExpandedDifficulties] = useState({});
  const [showVideoSection, setShowVideoSection] = useState(false);
  const [expandedVideoSections, setExpandedVideoSections] = useState({});
  const [courseData, setCourseData] = useState(null);

  useEffect(() => {
    const loadTestData = async () => {
      if (testId && !testResult && !loading) {
        await getTestResult(testId);
      }

      // Just load course data (payment already verified at course access)
      if (testResult?.course?._id && !courseData) {
        try {
          const response = await apiMethods.courses.getById(
            testResult.course._id
          );
          if (response.data.success) {
            setCourseData(response.data.data.course);
          }
        } catch (error) {
          console.error("Failed to load course data:", error);
        }
      }
    };

    loadTestData();
  }, [testId, testResult, loading, courseData]);

  // Handle celebration animation completion
  useEffect(() => {
    if (testResult) {
      const timer = setTimeout(() => {
        setCelebrationComplete(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [testResult]);

  // Change from useCallback to useMemo since it returns computed data
  const getDifficultyResults = useMemo(() => {
    if (!testResult) return [];

    const difficultyResults = testResult.testSettings?.difficultyResults;
    const isMultiDifficulty =
      testResult.difficulty === "Multi" ||
      Array.isArray(testResult.difficulty) ||
      (difficultyResults && Array.isArray(difficultyResults));

    if (isMultiDifficulty && difficultyResults) {
      // Group questions by difficulty efficiently
      const questionsByDifficulty =
        testResult.questions?.reduce((acc, q) => {
          const diff = q.difficulty;
          if (!diff) return acc;

          if (!acc[diff]) acc[diff] = [];
          acc[diff].push(q);
          return acc;
        }, {}) || {};

      // Map results with pre-grouped questions
      return difficultyResults.map((result) => {
        const questionsForDiff = questionsByDifficulty[result.difficulty] || [];
        const correctCount = questionsForDiff.filter((q) => q.isCorrect).length;

        return {
          ...result,
          questions: questionsForDiff,
          correctAnswers: correctCount,
          percentage:
            result.maxPossibleScore > 0
              ? Math.round((result.totalScore / result.maxPossibleScore) * 100)
              : 0,
        };
      });
    }

    // Single difficulty fallback
    return [
      {
        difficulty: Array.isArray(testResult.difficulty)
          ? testResult.difficulty[0]
          : testResult.difficulty,
        totalQuestions: testResult.totalQuestions,
        correctAnswers: testResult.correctAnswers,
        wrongAnswers: testResult.wrongAnswers,
        unanswered: testResult.unanswered,
        totalScore: testResult.totalScore,
        maxPossibleScore: testResult.maxPossibleScore,
        percentage: testResult.percentage,
        timeTaken: testResult.timeTaken,
        questions: testResult.questions || [],
      },
    ];
  }, [testResult]);

  // Calculate performance metrics
  const getPerformanceMetrics = useCallback(() => {
    if (!testResult) return null;

    const {
      percentage,
      totalQuestions,
      correctAnswers,
      timeTaken,
      difficulty,
    } = testResult;
    const accuracy = Math.round((correctAnswers / totalQuestions) * 100);
    const timePerQuestion = Math.round(timeTaken / totalQuestions);

    // Performance rating based on score and time
    let performanceRating = "Poor";
    let ratingColor = "red";

    if (percentage >= 90) {
      performanceRating = "Excellent";
      ratingColor = "green";
    } else if (percentage >= 80) {
      performanceRating = "Very Good";
      ratingColor = "blue";
    } else if (percentage >= 70) {
      performanceRating = "Good";
      ratingColor = "yellow";
    } else if (percentage >= 60) {
      performanceRating = "Fair";
      ratingColor = "orange";
    }

    return {
      accuracy,
      timePerQuestion,
      performanceRating,
      ratingColor,
      isPassed: percentage >= (testResult.passingScore || 70),
      isExcellent: percentage >= 90,
      isFast: timePerQuestion < 60,
    };
  }, [testResult]);

  // Handle share result
  const handleShare = useCallback(() => {
    if (!testResult) return;

    const shareData = {
      title: "Test Result Achievement",
      text: `I scored ${testResult.percentage}% on "${testResult.courseTitle}"!`,
      url: window.location.href,
    };

    if (navigator.share) {
      navigator.share(shareData);
    } else {
      navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
    }
  }, [testResult]);

  // Handle save result
  const handleSaveResult = useCallback(() => {
    console.log("Save result functionality");
  }, []);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  };

  const celebrationVariants = {
    hidden: { opacity: 0, scale: 0.5, rotate: -180 },
    visible: {
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 10,
      },
    },
  };

  // Score color based on performance
  const getScoreColor = (score) => {
    if (score >= 90) return "text-green-500";
    if (score >= 80) return "text-blue-500";
    if (score >= 70) return "text-yellow-500";
    if (score >= 60) return "text-orange-500";
    return "text-red-500";
  };

  // Get difficulty color
  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case "easy":
        return "text-green-600 bg-green-100 dark:bg-green-900/20";
      case "medium":
        return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20";
      case "hard":
        return "text-red-600 bg-red-100 dark:bg-red-900/20";
      default:
        return "text-gray-600 bg-gray-100 dark:bg-gray-900/20";
    }
  };

  if (loading) {
    return <Loading message="Loading your test results..." />;
  }

  if (error || !testResult) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="p-8 text-center max-w-md">
          <XCircleIcon className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2">
            Result Not Found
          </h2>
          <p className="text-gray-600 dark:text-slate-400 mb-6">
            {error || "The test result could not be loaded."}
          </p>
          <Button
            onClick={() => navigate("/profile/tests")}
            className="cursor-pointer"
          >
            View Test History
          </Button>
        </Card>
      </div>
    );
  }

  const metrics = getPerformanceMetrics();
  const difficultyResults = getDifficultyResults;
  const isMultiDifficulty = difficultyResults.length > 1;

  // Filter questions based on selected difficulty
  const getFilteredQuestions = () => {
    if (!showDetails) return [];

    if (selectedDifficulty === "all") {
      return testResult.questions || [];
    }

    const diffResult = difficultyResults.find(
      (d) => d.difficulty === selectedDifficulty
    );
    return diffResult?.questions || [];
  };

  return (
    <motion.div
      className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6"
      variants={animations && !reducedMotion ? containerVariants : {}}
      initial="hidden"
      animate="visible"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Celebration Header */}
        <motion.div variants={animations && !reducedMotion ? itemVariants : {}}>
          <Card
            className={`
            p-8 text-center relative overflow-hidden
            ${
              metrics.isPassed
                ? "bg-gradient-to-r from-green-500 to-blue-500 text-white"
                : "bg-gradient-to-r from-gray-500 to-slate-600 text-white"
            }
          `}
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-gradient-to-br from-white to-transparent" />
            </div>

            <motion.div
              variants={animations && !reducedMotion ? celebrationVariants : {}}
              className="relative z-10"
            >
              <motion.div
                animate={
                  metrics.isPassed && !celebrationComplete
                    ? {
                        scale: [1, 1.2, 1],
                        rotate: [0, 5, -5, 0],
                      }
                    : {}
                }
                transition={{
                  duration: 0.6,
                  repeat: metrics.isPassed ? 3 : 0,
                  ease: "easeInOut",
                }}
              >
                {metrics.isPassed ? (
                  <TrophyIcon className="w-16 h-16 mx-auto mb-4 text-yellow-300" />
                ) : (
                  <AcademicCapIcon className="w-16 h-16 mx-auto mb-4" />
                )}
              </motion.div>

              <h1 className="text-3xl font-bold mb-2">
                {metrics.isPassed ? "Congratulations!" : "Test Completed"}
              </h1>
              <p className="text-lg opacity-90 mb-4">
                {testResult.courseTitle}
              </p>

              {/* Score Display */}
              <div className="flex items-center justify-center space-x-6 mb-6">
                <div className="text-center">
                  <div className="text-5xl font-bold mb-2">
                    {testResult.percentage}%
                  </div>
                  <div className="text-sm opacity-80">Overall Score</div>
                </div>

                <div className="h-16 w-px bg-white/30" />

                <div className="text-center">
                  <div className="text-2xl font-bold mb-2">
                    {testResult.correctAnswers}/{testResult.totalQuestions}
                  </div>
                  <div className="text-sm opacity-80">Total Correct</div>
                </div>
              </div>

              <div
                className={`
                inline-flex items-center px-6 py-2 rounded-full text-sm font-medium
                ${
                  metrics.isPassed
                    ? "bg-white/20 text-white"
                    : "bg-white/20 text-white"
                }
              `}
              >
                <StarIcon className="w-4 h-4 mr-2" />
                {metrics.performanceRating} Performance
              </div>
            </motion.div>
          </Card>
        </motion.div>

        {/* Key Metrics */}
        <motion.div
          variants={animations && !reducedMotion ? itemVariants : {}}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <Card className="p-6 text-center">
            <ClockIcon className="w-8 h-8 mx-auto text-blue-500 mb-3" />
            <div className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-1">
              {Math.floor(testResult.timeTaken / 60)}:
              {(testResult.timeTaken % 60).toString().padStart(2, "0")}
            </div>
            <div className="text-sm text-gray-600 dark:text-slate-400">
              Total Time
            </div>
          </Card>

          <Card className="p-6 text-center">
            <ChartBarIcon className="w-8 h-8 mx-auto text-green-500 mb-3" />
            <div className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-1">
              {metrics.accuracy}%
            </div>
            <div className="text-sm text-gray-600 dark:text-slate-400">
              Accuracy
            </div>
          </Card>

          <Card className="p-6 text-center">
            <StarIcon className="w-8 h-8 mx-auto text-yellow-500 mb-3" />
            <div className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-1">
              {testResult.percentile || "N/A"}
            </div>
            <div className="text-sm text-gray-600 dark:text-slate-400">
              Percentile
            </div>
          </Card>
        </motion.div>

        {/* Performance Analysis */}
        <motion.div variants={animations && !reducedMotion ? itemVariants : {}}>
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
              Performance Analysis
            </h3>

            <div className="space-y-4">
              {/* Overall Score Breakdown */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                    Overall Score
                  </span>
                  <span className="text-sm text-gray-600 dark:text-slate-400">
                    {testResult.percentage}% ({testResult.correctAnswers}/
                    {testResult.totalQuestions})
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3">
                  <motion.div
                    className={`h-full rounded-full ${
                      testResult.percentage >= 70
                        ? "bg-green-500"
                        : "bg-red-500"
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${testResult.percentage}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
              </div>

              {/* Difficulty-wise Performance for Multi-difficulty Tests */}
              {isMultiDifficulty && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
                    Performance by Difficulty Level
                  </h4>
                  <div className="space-y-3">
                    {difficultyResults.map((result, index) => (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-600 dark:text-slate-400">
                            {result.difficulty}
                          </span>
                          <span className="text-sm font-medium">
                            {result.correctAnswers}/{result.totalQuestions} (
                            {result.percentage}%) -
                            {Math.floor(result.timeTaken / 60)}:
                            {(result.timeTaken % 60)
                              .toString()
                              .padStart(2, "0")}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                          <motion.div
                            className={`h-full rounded-full ${
                              result.percentage >= 70
                                ? "bg-green-500"
                                : result.percentage >= 50
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                            initial={{ width: 0 }}
                            animate={{
                              width: `${result.percentage}%`,
                            }}
                            transition={{
                              duration: 0.8,
                              delay: 0.2 + index * 0.1,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Rank Change Indicator */}
            {testResult.rankInfo && testResult.rankInfo.newRank && (
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  {testResult.rankInfo.rankChange > 0 ? (
                    <span className="text-green-400 text-3xl font-bold flex items-center">
                      ↑ {testResult.rankInfo.rankChange}
                    </span>
                  ) : testResult.rankInfo.rankChange < 0 ? (
                    <span className="text-red-400 text-3xl font-bold flex items-center">
                      ↓ {Math.abs(testResult.rankInfo.rankChange)}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-3xl font-bold flex items-center">
                      ~ 0
                    </span>
                  )}
                </div>
                <div className="text-sm opacity-80">
                  Rank: #{testResult.rankInfo.newRank}
                  {testResult.rankInfo.previousRank && (
                    <span className="text-xs ml-1">
                      (was #{testResult.rankInfo.previousRank})
                    </span>
                  )}
                </div>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Detailed Results */}
        <motion.div variants={animations && !reducedMotion ? itemVariants : {}}>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                Question Review
              </h3>
              <Button
                variant="ghost"
                onClick={() => setShowDetails(!showDetails)}
                className="cursor-pointer"
              >
                {showDetails ? "Hide Details" : "Show Details"}
                <EyeIcon className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  {(() => {
                    const filteredQuestions = getFilteredQuestions();

                    // Ensure each question has difficulty field
                    const questionsWithDifficulty = filteredQuestions.map(
                      (q) => {
                        if (!q.difficulty && isMultiDifficulty) {
                          const diffResult = difficultyResults.find((dr) =>
                            dr.questions?.some(
                              (dq) =>
                                dq.questionId === q.question?._id ||
                                dq.questionId === q.question
                            )
                          );
                          return {
                            ...q,
                            difficulty: diffResult?.difficulty || "Unknown",
                          };
                        }
                        return q;
                      }
                    );

                    const groupedQuestions = questionsWithDifficulty.reduce(
                      (acc, question, index) => {
                        const diff =
                          question.difficulty ||
                          testResult.difficulty ||
                          "Unknown";
                        if (!acc[diff]) acc[diff] = [];
                        acc[diff].push({ ...question, index });
                        return acc;
                      },
                      {}
                    );

                    // Render collapsible difficulty sections
                    return Object.entries(groupedQuestions).map(
                      ([difficulty, questions]) => {
                        const diffResult = difficultyResults.find(
                          (d) => d.difficulty === difficulty
                        );
                        const isExpanded = expandedDifficulties[difficulty];

                        return (
                          <div
                            key={difficulty}
                            className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden"
                          >
                            {/* Collapsible Header */}
                            <div
                              onClick={() =>
                                setExpandedDifficulties((prev) => ({
                                  ...prev,
                                  [difficulty]: !prev[difficulty],
                                }))
                              }
                              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                            >
                              <div className="flex items-center space-x-3 flex-wrap gap-2">
                                <h4 className="font-semibold text-base text-gray-800 dark:text-slate-200">
                                  {difficulty}
                                </h4>

                                {/* Info Chips */}
                                <div className="flex items-center space-x-2 flex-wrap gap-2">
                                  {/* Correct answers chip */}
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium">
                                    <CheckCircleIcon className="w-3.5 h-3.5 mr-1" />
                                    {diffResult?.correctAnswers}/
                                    {diffResult?.totalQuestions}
                                  </span>

                                  {/* Time chip */}
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium">
                                    <ClockIcon className="w-3.5 h-3.5 mr-1" />
                                    {Math.floor(
                                      (diffResult?.timeTaken || 0) / 60
                                    )}
                                    m {(diffResult?.timeTaken || 0) % 60}s
                                  </span>

                                  {/* Score chip */}
                                  <span
                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                      (diffResult?.percentage || 0) >= 70
                                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                        : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                    }`}
                                  >
                                    {diffResult?.percentage || 0}%
                                  </span>
                                </div>
                              </div>

                              {/* Expand/Collapse Icon */}
                              <motion.div
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <svg
                                  className="w-5 h-5 text-gray-500"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </motion.div>
                            </div>

                            {/* Expanded Content - Individual Questions */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.3 }}
                                  className="border-t border-gray-200 dark:border-slate-700"
                                >
                                  <div className="p-4 space-y-3 bg-gray-50/50 dark:bg-slate-800/50">
                                    {questions.map((question, qIndex) => (
                                      <div
                                        key={qIndex}
                                        className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg p-4"
                                      >
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="flex items-center space-x-2">
                                            <span className="font-semibold text-gray-900 dark:text-slate-100 text-sm">
                                              Q{qIndex + 1}
                                            </span>
                                            {/* Show check/cross icon right next to Q number */}
                                            {question.isCorrect ? (
                                              <CheckCircleIcon className="w-5 h-5 text-green-500" />
                                            ) : (
                                              <XCircleIcon className="w-5 h-5 text-red-500" />
                                            )}
                                          </div>

                                          {/* Marks chip on the right */}
                                          <span className="text-xs font-medium text-gray-600 dark:text-slate-400 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-slate-800">
                                            {question.marksAwarded || 0} marks
                                          </span>
                                        </div>

                                        {/* Only show full question if available */}
                                        {question.question?.question && (
                                          <p className="text-sm text-gray-700 dark:text-slate-300 mb-3">
                                            {question.question.question}
                                          </p>
                                        )}

                                        <div className="space-y-2 text-sm">
                                          {!question.isCorrect && (
                                            <div className="flex items-center">
                                              <span className="text-gray-600 dark:text-slate-400 w-28 flex-shrink-0">
                                                Correct:
                                              </span>
                                              <span className="font-medium text-green-600 dark:text-green-400 truncate">
                                                {question.correctAnswer}
                                              </span>
                                            </div>
                                          )}

                                          <div className="flex items-center">
                                            <span className="text-gray-600 dark:text-slate-400 w-28 flex-shrink-0">
                                              Marks:
                                            </span>
                                            <span className="font-medium">
                                              {question.marksAwarded || 0} marks
                                            </span>
                                          </div>

                                          {question.question?.explanation && (
                                            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                              <div className="text-blue-900 dark:text-blue-100 text-xs">
                                                <strong>Explanation:</strong>{" "}
                                                {question.question.explanation}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      }
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>

        {/* Video Learning Section - Only for Paid Courses */}
        {/* Video Learning Section - Only for Paid Courses */}
        {courseData?.isPaid && courseData?.videoContent?.type !== "none" && (
          <motion.div
            variants={animations && !reducedMotion ? itemVariants : {}}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <PlayCircleIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                      Course Video Resources
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                      Watch these videos to reinforce your learning
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setShowVideoSection(!showVideoSection)}
                  className="cursor-pointer"
                >
                  {showVideoSection ? (
                    <ChevronUpIcon className="w-5 h-5" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5" />
                  )}
                </Button>
              </div>

              <AnimatePresence>
                {showVideoSection && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Course-level videos */}
                    {courseData.videoContent.type === "course" &&
                      courseData.videoContent.courseVideo?.links?.length >
                        0 && (
                        <div className="space-y-6">
                          <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-3">
                            Course Videos
                          </h4>
                          {courseData.videoContent.courseVideo.links.map(
                            (link, idx) => (
                              <div key={idx} className="space-y-2">
                                <VideoPlayer
                                  videoData={link}
                                  courseId={courseData._id}
                                  className="w-full"
                                />
                              </div>
                            )
                          )}
                        </div>
                      )}

                    {/* Difficulty-based videos */}
                    {courseData.videoContent.type === "difficulty" && (
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900 dark:text-slate-100 mb-3">
                          Difficulty-Specific Videos
                        </h4>

                        {courseData.videoContent.difficultyVideos?.map(
                          (diffVideo) => {
                            const hasPassed =
                              difficultyResults.find(
                                (dr) => dr.difficulty === diffVideo.difficulty
                              )?.percentage >= 70;

                            const hasLinks = diffVideo.links?.length > 0;
                            if (!hasLinks) return null;

                            return (
                              <div
                                key={diffVideo.difficulty}
                                className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden"
                              >
                                <div
                                  onClick={() =>
                                    setExpandedVideoSections((prev) => ({
                                      ...prev,
                                      [diffVideo.difficulty]:
                                        !prev[diffVideo.difficulty],
                                    }))
                                  }
                                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                >
                                  <div className="flex items-center space-x-3">
                                    <span
                                      className={`px-3 py-1 text-sm font-medium rounded-full ${getDifficultyColor(
                                        diffVideo.difficulty
                                      )}`}
                                    >
                                      {diffVideo.difficulty}
                                    </span>
                                    <span className="text-sm text-gray-600 dark:text-slate-400">
                                      {diffVideo.links.length} video
                                      {diffVideo.links.length !== 1
                                        ? "s"
                                        : ""}{" "}
                                      •{" "}
                                      {hasPassed
                                        ? "Review content"
                                        : "Watch to improve"}
                                    </span>
                                  </div>
                                  {expandedVideoSections[
                                    diffVideo.difficulty
                                  ] ? (
                                    <ChevronUpIcon className="w-5 h-5 text-gray-500" />
                                  ) : (
                                    <ChevronDownIcon className="w-5 h-5 text-gray-500" />
                                  )}
                                </div>

                                <AnimatePresence>
                                  {expandedVideoSections[
                                    diffVideo.difficulty
                                  ] && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.3 }}
                                      className="p-4 space-y-6 bg-white dark:bg-slate-900"
                                    >
                                      {diffVideo.links.map((link, idx) => (
                                        <div key={idx}>
                                          <VideoPlayer
                                            videoData={link}
                                            courseId={courseData._id}
                                            difficulty={diffVideo.difficulty}
                                            className="w-full"
                                          />
                                        </div>
                                      ))}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          }
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          variants={animations && !reducedMotion ? itemVariants : {}}
          className="flex flex-wrap gap-4 justify-center"
        >
          {/* Retake button only for FREE courses */}
          {!isPaid && (
            <Button
              variant="primary"
              onClick={() => window.location.reload()}
              leftIcon={<PlayCircleIcon className="w-4 h-4" />}
              className="cursor-pointer"
            >
              Retake Test
            </Button>
          )}

          <Button
            variant="primary"
            onClick={() =>
              navigate("/profile", { state: { initialTab: "leaderboard" } })
            }
            leftIcon={<TrophyIcon className="w-4 h-4" />}
            className="cursor-pointer"
          >
            View Leaderboard
          </Button>

          <Button
            variant="secondary"
            onClick={() => navigate("/courses")}
            leftIcon={<ArrowRightIcon className="w-4 h-4" />}
            className="cursor-pointer"
          >
            Browse More Courses
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigate("/profile/tests")}
            leftIcon={<ChartBarIcon className="w-4 h-4" />}
            className="cursor-pointer"
          >
            View Test History
          </Button>
        </motion.div>

        {/* Achievement Badges */}
        {testResult.achievements && testResult.achievements.length > 0 && (
          <motion.div
            variants={animations && !reducedMotion ? itemVariants : {}}
          >
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
                🏆 Achievements Unlocked
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {testResult.achievements.map((achievement, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1 + index * 0.2 }}
                    className="text-center p-4 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg text-white"
                  >
                    <div className="text-3xl mb-2">{achievement.icon}</div>
                    <h4 className="font-semibold mb-1">{achievement.title}</h4>
                    <p className="text-xs opacity-90">
                      {achievement.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Enhanced Confetti Animation */}
      <AnimatePresence>
        {metrics.isPassed && !celebrationComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-50"
          >
            {[...Array(metrics.isExcellent ? 100 : 60)].map((_, i) => {
              const colors = [
                "bg-yellow-400",
                "bg-blue-400",
                "bg-green-400",
                "bg-pink-400",
                "bg-purple-400",
              ];
              const shapes = ["rounded-full", "rounded", "rounded-lg"];
              const sizes = ["w-2 h-2", "w-3 h-3", "w-1 h-1"];

              return (
                <motion.div
                  key={i}
                  className={`absolute ${colors[i % colors.length]} ${
                    shapes[i % shapes.length]
                  } ${sizes[i % sizes.length]}`}
                  initial={{
                    x:
                      Math.random() *
                      (typeof window !== "undefined"
                        ? window.innerWidth
                        : 1200),
                    y: -10,
                    rotate: 0,
                    scale: 0,
                  }}
                  animate={{
                    y:
                      (typeof window !== "undefined"
                        ? window.innerHeight
                        : 800) + 50,
                    rotate: Math.random() * 720,
                    x:
                      Math.random() *
                      (typeof window !== "undefined"
                        ? window.innerWidth
                        : 1200),
                    scale: [0, 1, 0.8, 0],
                  }}
                  transition={{
                    duration: 3 + Math.random() * 2,
                    delay: Math.random() * 3,
                    ease: "easeOut",
                  }}
                />
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TestResult;
