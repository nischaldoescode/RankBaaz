import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTests } from "../context/TestContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import TestQuestion from "../components/test/TestQuestion";
import TestResult from "../components/test/TestResult";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import Loading from "../components/common/Loading";
import TermsOfService from "@/components/test/TermsOfService";
import DifficultySelection from "@/components/test/DifficultySelection";
import ReloadWarningModal from "@/components/test/ReloadWarningModal";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import {
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  PauseIcon,
  PlayIcon,
} from "@heroicons/react/24/outline";
import { apiMethods } from "@/services/api";

const Test = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { getThemeClasses, getPrimaryColorClasses } = useTheme();
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [courseData, setCourseData] = useState(null);
  const [completedDifficulties, setCompletedDifficulties] = useState([]);
  const [currentDifficultyIndex, setCurrentDifficultyIndex] = useState(0);
  const [allDifficulties, setAllDifficulties] = useState([]);

  const {
    currentTest,
    currentQuestion,
    testResult,
    loading,
    error,
    testState,
    startTest,
    submitAnswer,
    nextQuestion,
    submitTest,
    pauseTest,
    resumeTest,
    resetTest,
    isLastQuestion,
    answeredQuestions,
    progressPercentage,
    timeRemainingFormatted,
    isCurrentQuestionAnswered,
    clearError,
    canCompleteDifficulty,
    hasNextDifficulty,
    isValidatingAnswer,
  } = useTests();

  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [testPhase, setTestPhase] = useState("start"); // start, active, paused, completed, result
  const [showExitModal, setShowExitModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showReloadWarning, setShowReloadWarning] = useState(false);
  const [answers, setAnswers] = useState({});
  const [allDifficultyResults, setAllDifficultyResults] = useState([]);

  const themeClasses = getThemeClasses();
  const primaryColors = getPrimaryColorClasses();

  // Initialize test phase based on current state
  useEffect(() => {
    if (testResult) {
      // console.log("Setting phase to result");
      setTestPhase("result");
    } else if (currentTest && testState.isActive) {
      if (testState.isPaused) {
        // console.log("Setting phase to paused");
        setTestPhase("paused");
      } else {
        // console.log("Setting phase to active");
        setTestPhase("active");
      }
    } else if (currentTest) {
      // console.log("Setting phase to start");
      setTestPhase("start");
    } else {
      // console.log("No valid state, keeping current phase:", testPhase);
    }
  }, [currentTest, testResult, testState, currentQuestion]);

  // Reset test state when course changes
  useEffect(() => {
    resetTest(); // Clear old test data
    setSelectedDifficulty(null);
    setTestPhase("start");
    setCourseData(null);
  }, [courseId]);

  // Handle browser navigation with custom modal
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (testState.isActive && !testState.isPaused && testPhase !== "result") {
        e.preventDefault();
        e.returnValue = "You have an active test. Your progress will be lost.";
        return e.returnValue;
      }
    };

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "hidden" &&
        testState.isActive &&
        !testState.isPaused &&
        testPhase !== "result"
      ) {
        setShowReloadWarning(true);
      }
    };

    const handlePopState = (e) => {
      if (testState.isActive && !testState.isPaused && testPhase !== "result") {
        window.history.pushState(null, "", window.location.pathname);
        setShowReloadWarning(true);
      }
    };
    const handleKeyDown = (e) => {
      if (testState.isActive && !testState.isPaused && testPhase !== "result") {
        if (
          (e.ctrlKey && (e.key === "r" || e.key === "R")) ||
          e.key === "F5" ||
          (e.ctrlKey && (e.key === "w" || e.key === "W"))
        ) {
          e.preventDefault();
          e.stopPropagation();
          setShowReloadWarning(true);
          return false;
        }
      }
    };

    // Always add listeners (but they only act when test is active)
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("keydown", handleKeyDown, { capture: true });

    // Push history state only when test becomes active
    if (testState.isActive) {
      window.history.pushState(null, "", window.location.pathname);
    }

    return () => {
      // Always clean up all listeners
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [testState.isActive, testState.isPaused, setShowReloadWarning]);

  const handleStayInTest = () => {
    setShowReloadWarning(false);
  };

  const handleTimeExpiredSubmit = useCallback(() => {
    // console.log("Time expired - resetting test");

    // Close any open modals
    setShowExitModal(false);
    setShowSubmitModal(false);
    setShowReloadWarning(false);

    // Show toast notification
    toast.error("Time expired! Test ended.", {
      duration: 3000,
      icon: "⏰",
    });

    // Small delay for animation, then reset and navigate
    setTimeout(() => {
      resetTest();
      setAnswers({});
      setSelectedAnswer(null);
      setTestPhase("start");
      navigate("/courses");
    }, 500);
  }, [resetTest, navigate]);

  const handleLeaveTest = useCallback(async () => {
    await handleAbandonTest();
    setShowReloadWarning(false);
    resetTest();
    setAnswers({});
    setSelectedAnswer(null);
    setTestPhase("start");
    toast("Test exited");
    navigate("/courses");
  }, [resetTest, navigate]);

  const getTestProgress = () => ({
    answered: answeredQuestions,
    total: testState.totalQuestions,
    timeRemaining: timeRemainingFormatted,
  });

  // use effect to Auto-submit when time runs out
  useEffect(() => {
    if (testState.isActive && testState.timeRemaining === 0 && !testResult) {
      console.log("Time expired - resetting test");
      handleTimeExpiredSubmit();
    }
  }, [
    testState.timeRemaining,
    testState.isActive,
    testResult,
    handleTimeExpiredSubmit,
  ]);

  const calculateCurrentDifficultyResults = () => {
    const correctAnswersCount = Object.entries(answers).filter(
      ([questionId, userAnswer]) => {
        const question = currentTest.questions.find(
          (q) => q._id === questionId
        );
        if (!question) return false;
        return parseInt(userAnswer) === parseInt(question.correctAnswer);
      }
    ).length;

    const totalQuestions = testState.totalQuestions;
    const wrongAnswersCount = totalQuestions - correctAnswersCount;
    const maxMarksPerQuestion = selectedDifficulty?.marksPerQuestion || 5;
    const totalScore = correctAnswersCount * maxMarksPerQuestion;
    const maxPossibleScore = totalQuestions * maxMarksPerQuestion;

    return {
      difficulty: selectedDifficulty.name,
      totalQuestions,
      correctAnswers: correctAnswersCount,
      wrongAnswers: wrongAnswersCount,
      unanswered: 0,
      totalScore,
      maxPossibleScore,
      timeTaken: Math.floor(
        (Date.now() - new Date(testState.startTime)) / 1000
      ),
      answerMapping: { ...answers },
    };
  };

  const handleDifficultySelect = useCallback(
    (difficulty, course, remainingDifficulties) => {
      setSelectedDifficulty(difficulty);
      setCourseData(course);

      // Store the progression order starting from selected difficulty
      setAllDifficulties(remainingDifficulties);
      setCurrentDifficultyIndex(0); // Start from index 0 of remaining difficulties

      setShowTerms(true);
    },
    []
  );

  const handleStartTest = useCallback(async () => {
    if (!isAuthenticated) {
      toast.error("Please log in to start the test");
      navigate("/login", { state: { from: location } });
      return;
    }
    if (!selectedDifficulty) {
      return { success: false, error: "No difficulty selected" };
    }

    try {
      clearError();
      const result = await startTest(courseId, selectedDifficulty.name);

      if (result && result.success) {
        setTestPhase("active");
        setSelectedAnswer(null);
        setAnswers({});
      } else if (result.isNoQuestionsError) {
        // NEW: Use the flag instead of string checking
        // Auto-skip to next difficulty if no questions
        const allDiffOrder = ["Easy", "Medium", "Hard"];
        const currentIndex = allDiffOrder.indexOf(selectedDifficulty.name);
        const nextDifficultyName = allDiffOrder[currentIndex + 1];

        if (nextDifficultyName) {
          // Try next difficulty
          const nextDiff = courseData?.difficulties?.find(
            (d) => d.name === nextDifficultyName
          );

          if (nextDiff) {
            toast.info(
              `Skipping ${selectedDifficulty.name} (no questions). Starting ${nextDifficultyName}...`
            );
            setSelectedDifficulty(nextDiff);

            // Recursively try next difficulty
            return handleStartTest();
          }
        } else {
          // No more difficulties available
          toast.error(
            "No difficulties with questions available for this course"
          );
          navigate("/courses");
        }
      } else {
        // Other error - show it
        console.error(result);
        toast.error(result.error || "Failed to start test");
      }

      return result;
    } catch (error) {
      console.error(error);
      return { success: false, error: error.message };
    }
  }, [
    courseId,
    selectedDifficulty,
    startTest,
    clearError,
    courseData,
    navigate,
    location,
  ]);

  const handleTermsAccept = useCallback(async () => {
    setTermsAccepted(true);
    setShowTerms(false);

    // Add loading state and proper error handling
    try {
      const result = await handleStartTest();
      if (result && result.success) {
        // console.log("Test started successfully after terms acceptance");
      }
    } catch (error) {
      // console.error("Failed to start test after terms acceptance:", error);
    }
  }, [handleStartTest]);

  const handleTermsCancel = useCallback(() => {
    setShowTerms(false);
    setSelectedDifficulty(null);
  }, []);
  // Handle answer selection
  const handleAnswerSelect = useCallback(
    async (answer) => {
      if (!currentQuestion) return;

      setSelectedAnswer(answer);

      try {
        const result = await submitAnswer(currentQuestion._id, answer);

        if (result.success) {
          setAnswers((prev) => ({
            ...prev,
            [currentQuestion._id]: answer,
          }));

          // Pass feedback to TestQuestion component
          return { feedback: result.feedback };
        }
      } catch (error) {
        console.error("Failed to submit answer:", error);
      }
    },
    [currentQuestion, submitAnswer]
  );

  const handleNextQuestion = useCallback(() => {
    // CHANGE: Only allow navigation if answer was validated
    if (!currentQuestion || selectedAnswer === null) {
      toast.error("Please answer the current question first");
      return;
    }

    const result = nextQuestion();
    setSelectedAnswer(null);

    // NEW: Reset validation lock for next question
    if (result.hasNext) {
      // Question navigation successful
    } else {
      // No more questions - prepare for difficulty completion
    }
  }, [nextQuestion, currentQuestion, selectedAnswer]);

  // Handle test pause
  const handlePauseTest = useCallback(async () => {
    try {
      await pauseTest();
      setTestPhase("paused");
    } catch (error) {
      // console.error("Failed to pause test:", error);
    }
  }, [pauseTest]);

  // Handle test resume
  const handleResumeTest = useCallback(async () => {
    try {
      await resumeTest();
      setTestPhase("active");
    } catch (error) {
      // console.error("Failed to resume test:", error);
    }
  }, [resumeTest]);

  // Handle test submission
  const handleSubmitTest = useCallback(async () => {
    try {
      const result = await submitTest();

      if (result.success) {
        setTestPhase("result");
        setShowSubmitModal(false);
      }
    } catch (error) {
      // console.error("Failed to submit test:", error);
    }
  }, [submitTest]);

  const calculateScore = useCallback(() => {
    if (!currentTest || !answers) return 0;

    let correctCount = 0;
    const totalQuestions = Object.keys(answers).length;

    Object.entries(answers).forEach(([questionId, userAnswer]) => {
      const question = currentTest.questions.find((q) => q._id === questionId);
      if (question && question.correctAnswer !== undefined) {
        const isCorrect =
          parseInt(userAnswer) === parseInt(question.correctAnswer);
        if (isCorrect) correctCount++;
      }
    });

    return totalQuestions > 0
      ? Math.round((correctCount / totalQuestions) * 100)
      : 0;
  }, [currentTest, answers]);

  const handleAutoSubmit = useCallback(async () => {
    if (!canCompleteDifficulty()) {
      toast.error("Please answer all questions before proceeding");
      return;
    }

    try {
      const currentResults = calculateCurrentDifficultyResults();
      const updatedResults = [...allDifficultyResults, currentResults];
      setAllDifficultyResults(updatedResults);
      setCompletedDifficulties((prev) => [...prev, selectedDifficulty.name]);

      const currentDiffName =
        currentTest?.courseInfo?.difficulty?.name || selectedDifficulty.name;
      const allDiffs = ["Easy", "Medium", "Hard"];
      const currentIndex = allDiffs.indexOf(currentDiffName);
      const nextDifficultyName = allDiffs[currentIndex + 1];

      const nextDiff = nextDifficultyName
        ? courseData.difficulties.find((d) => d.name === nextDifficultyName)
        : null;

      if (nextDiff) {
        const startResult = await startTest(courseId, nextDifficultyName);

        if (startResult.success) {
          // Successfully started next difficulty
          setSelectedDifficulty(nextDiff);
          setTestPhase("active");
          setAnswers({});
          setSelectedAnswer(null);
          toast.success(`Starting ${nextDifficultyName} difficulty`);
        } else if (startResult.isNoQuestionsError) {
          // Next difficulty has no questions - try to find the next one
          toast(
            `No questions in ${nextDifficultyName}. Checking for more difficulties...`
          );

          const allDiffOrder = ["Easy", "Medium", "Hard"];
          const nextIndex = allDiffOrder.indexOf(nextDifficultyName);
          const subsequentDiff = allDiffOrder[nextIndex + 1];

          if (
            subsequentDiff &&
            courseData.difficulties.find((d) => d.name === subsequentDiff)
          ) {
            // Try the difficulty after the one with no questions
            const secondNextResult = await startTest(courseId, subsequentDiff);

            if (secondNextResult.success) {
              // Successfully started the subsequent difficulty
              const secondNextDiffObj = courseData.difficulties.find(
                (d) => d.name === subsequentDiff
              );
              setSelectedDifficulty(secondNextDiffObj);
              setTestPhase("active");
              setAnswers({});
              setSelectedAnswer(null);
              toast.success(`Starting ${subsequentDiff} difficulty`);
            } else if (secondNextResult.isNoQuestionsError) {
              // Subsequent difficulty also has no questions - submit test
              toast("No more difficulties available. Completing test...");
              const result = await submitTest(true, updatedResults);

              if (result.success) {
                const { pointsEarned, rankInfo } = result.data || {};

                // Show points and rank change
                if (pointsEarned && rankInfo) {
                  const { previousRank, newRank, rankChange } = rankInfo;

                  let rankMessage = "";
                  let rankIcon = "";

                  if (rankChange > 0) {
                    rankIcon = "↑";
                    rankMessage = ` | Rank: ${rankIcon}${rankChange} (#${newRank})`;
                  } else if (rankChange < 0) {
                    rankIcon = "↓";
                    rankMessage = ` | Rank: ${rankIcon}${Math.abs(
                      rankChange
                    )} (#${newRank})`;
                  } else if (rankChange === 0 && newRank) {
                    rankIcon = "~";
                    rankMessage = ` | Rank: ${rankIcon} (#${newRank})`;
                  }

                  toast.success(
                    `Test complete! +${pointsEarned} points${rankMessage}`,
                    { duration: 5000 }
                  );
                }

                // Show new badges if any
                if (
                  result.data?.newBadges &&
                  result.data.newBadges.length > 0
                ) {
                  setTimeout(() => {
                    toast.success(`New badge unlocked!`, {
                      duration: 5000,
                      icon: "🏆",
                    });
                  }, 1000);
                }

                setTestPhase("result");
              }
            } else {
              // Error starting subsequent difficulty
              console.error(secondNextResult);
              toast.error("Failed to start next difficulty");
            }
          } else {
            // No subsequent difficulty exists - submit test with current results
            toast("No more difficulties available. Completing test...");
            const result = await submitTest(true, updatedResults);

            if (result.success) {
              const { pointsEarned, rankInfo } = result.data || {};

              // Show points and rank change
              if (pointsEarned && rankInfo) {
                const { previousRank, newRank, rankChange } = rankInfo;

                let rankMessage = "";
                let rankIcon = "";

                if (rankChange > 0) {
                  rankIcon = "↑";
                  rankMessage = ` | Rank: ${rankIcon}${rankChange} (#${newRank})`;
                } else if (rankChange < 0) {
                  rankIcon = "↓";
                  rankMessage = ` | Rank: ${rankIcon}${Math.abs(
                    rankChange
                  )} (#${newRank})`;
                } else if (rankChange === 0 && newRank) {
                  rankIcon = "~";
                  rankMessage = ` | Rank: ${rankIcon} (#${newRank})`;
                }

                toast.success(
                  `Test complete! +${pointsEarned} points${rankMessage}`,
                  { duration: 5000 }
                );
              }

              // Show new badges if any
              if (result.data?.newBadges && result.data.newBadges.length > 0) {
                setTimeout(() => {
                  toast.success(`New badge unlocked!`, {
                    duration: 5000,
                    icon: "🏆",
                  });
                }, 1000);
              }

              setTestPhase("result");
            }
          }
        } else {
          // Other error starting next difficulty
          console.error(startResult);
          toast.error("Failed to start next difficulty");
        }
      } else {
        // No more difficulties configured - submit test
        const result = await submitTest(true, updatedResults);

        if (result.success) {
          const { pointsEarned, rankInfo } = result.data || {};

          // Show points and rank change
          if (pointsEarned && rankInfo) {
            const { previousRank, newRank, rankChange } = rankInfo;

            let rankMessage = "";
            let rankIcon = "";

            if (rankChange > 0) {
              rankIcon = "↑";
              rankMessage = ` | Rank: ${rankIcon}${rankChange} (#${newRank})`;
            } else if (rankChange < 0) {
              rankIcon = "↓";
              rankMessage = ` | Rank: ${rankIcon}${Math.abs(
                rankChange
              )} (#${newRank})`;
            } else if (rankChange === 0 && newRank) {
              rankIcon = "~";
              rankMessage = ` | Rank: ${rankIcon} (#${newRank})`;
            }

            toast.success(
              `Test complete! +${pointsEarned} points${rankMessage}`,
              { duration: 5000 }
            );
          }

          // Show new badges if any
          if (result.data?.newBadges && result.data.newBadges.length > 0) {
            setTimeout(() => {
              toast.success(`New badge unlocked!`, {
                duration: 5000,
                icon: "🏆",
              });
            }, 1000);
          }

          setTestPhase("result");
        }
      }
    } catch (error) {
      console.error("Auto-transition failed:", error);
      toast.error("Failed to proceed");
    }
  }, [
    allDifficultyResults,
    submitTest,
    courseData,
    selectedDifficulty,
    courseId,
    startTest,
    answers,
    canCompleteDifficulty,
  ]);

  useEffect(() => {
    const loadCourseInfo = async () => {
      try {
        const response = await apiMethods.courses.getById(courseId);
        if (response.data.success) {
          setCourseData(response.data.data.course);
        }
      } catch (error) {
        console.error("Failed to load course data:", error);
      }
    };

    loadCourseInfo();
  }, [courseId]);

  // In Test.jsx - SECURE APPROACH
  useEffect(() => {
    const checkAndLoadExistingTest = async () => {
      if (!courseData?.isPaid || !isAuthenticated) {
        return;
      }

      try {
        // Get user's test history from backend
        const response = await apiMethods.tests.getHistory();
        const userTests = response.data.data.testHistory;

        const existingTest = userTests.find(
          (test) => test.course._id === courseId
        );

        if (existingTest) {
          // Load the result using the testId
          // Backend will verify ownership in getTestResult
          await apiMethods.tests.getResult(existingTest._id);
          setTestPhase("result");
          return;
        }
      } catch (error) {
        console.error("Failed to check test history:", error);
      }

      // If no existing test found, proceed normally
      setTestPhase("start");
    };

    checkAndLoadExistingTest();
  }, [courseData, courseId, isAuthenticated, currentTest, testResult]);

  // Handle test exit
  const handleExitTest = useCallback(() => {
    if (testState.isActive) {
      setShowExitModal(true);
    } else {
      navigate("/courses");
    }
  }, [testState.isActive, navigate]);

  const handleAbandonTest = useCallback(async () => {
    try {
      await apiMethods.tests.abandonTest({
        courseId,
        difficulty: selectedDifficulty?.name,
        completedDifficulties,
      });

      toast.error("Test abandoned.", {
        duration: 3000,
      });

      resetTest();
      navigate("/courses");
    } catch (error) {
      console.error("Failed to record abandonment:", error);
    }
  }, [
    courseId,
    selectedDifficulty,
    completedDifficulties,
    resetTest,
    navigate,
  ]);

  // Handle forced exit
  const handleForceExit = useCallback(() => {
    // Clear all local storage and context data
    resetTest();
    setAnswers({});
    setSelectedAnswer(null);
    setTestPhase("start");
    setShowExitModal(false);
    navigate("/courses");
    toast("Test progress discarded");
  }, [resetTest, navigate]);

  // Navigation handlers
  const handleReturnToCourses = () => navigate("/courses");

  const handleViewResults = () => navigate("/profile");
  const handleRetakeTest = () => {
    // Only allow retake for FREE courses
    if (courseData?.isPaid) {
      toast.error("Paid courses can only be taken once");
      navigate("/courses");
      return;
    }

    resetTest();
    setTestPhase("start");
    setSelectedDifficulty(null); // Reset to difficulty selection
  };

  // Loading state
  if (loading && !currentTest) {
    return <Loading message="Loading test..." />;
  }

  // Error state
  if (error && !currentTest) {
    return (
      <div className={`min-h-screen ${themeClasses.background} py-8`}>
        <div className="max-w-2xl mx-auto px-4">
          <Card className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Test Error
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <Button onClick={() => navigate("/courses")}>
              Return to Courses
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const renderTestPhase = () => {
    // Step 0: If paid course and still loading test result
    if (courseData?.isPaid && loading && !testResult && !currentTest) {
      return (
        <div className="max-w-2xl mx-auto text-center">
          <Card className="!p-8">
            <Loading message="Loading your test result..." />
          </Card>
        </div>
      );
    }

    // Step 1: If paid course and test result loaded, show it immediately
    if (courseData?.isPaid && testResult && testPhase === "result") {
      return (
        <TestResult
          result={testResult}
          onRetake={handleRetakeTest}
          onViewHistory={handleViewResults}
          onReturnToCourses={handleReturnToCourses}
          courseData={courseData}
          isPaid={courseData?.isPaid}
        />
      );
    }

    // Step 2: Show difficulty selection if no difficulty selected (free course or first attempt)
    if (!selectedDifficulty) {
      return (
        <DifficultySelection
          courseId={courseId}
          onSelectDifficulty={handleDifficultySelect}
          onCancel={() => navigate("/courses")}
        />
      );
    }

    // Step 3: Show terms if difficulty selected but not accepted
    if (showTerms && !termsAccepted) {
      return (
        <TermsOfService
          onAccept={handleTermsAccept}
          onCancel={handleTermsCancel}
          courseName={courseData?.name || "Unknown Course"}
          difficulty={selectedDifficulty?.name}
        />
      );
    }

    // Step 3: Show loading while starting test
    if (termsAccepted && !currentTest && loading) {
      return (
        <div className="max-w-2xl mx-auto text-center">
          <Card className="!p-8">
            <Loading message="Starting your test..." />
          </Card>
        </div>
      );
    }

    // Remove the "start" case entirely since DifficultySelection handles everything

    switch (testPhase) {
      // Remove case "start" completely

      case "active":
        return (
          <motion.div
            key={selectedDifficulty?.name}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="min-h-screen flex flex-col"
          >
            {/* Fixed Header */}
            <div className="sticky top-16 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b shadow-sm">
              <div className="max-w-6xl mx-auto px-4 py-3">
                {/* Course name and controls */}
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                      {courseData?.name || "Course"}
                    </h1>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Current Difficulty:{" "}
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        {currentTest?.courseInfo?.difficulty?.name ||
                          selectedDifficulty?.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Timer */}
                    <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border bg-gray-50 dark:bg-gray-800">
                      <ClockIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <span
                        className={cn(
                          "font-mono text-sm font-medium transition-all duration-200",
                          testState.timeRemaining <= 60
                            ? "text-red-600 dark:text-red-400 animate-pulse"
                            : "text-gray-900 dark:text-gray-100"
                        )}
                        style={{
                          animation:
                            testState.timeRemaining <= 60
                              ? "shake 0.5s ease-in-out infinite"
                              : "none",
                        }}
                      >
                        {Math.floor(testState.timeRemaining / 60)}:
                        {(testState.timeRemaining % 60)
                          .toString()
                          .padStart(2, "0")}
                      </span>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePauseTest}
                      className="cursor-pointer"
                    >
                      <PauseIcon className="w-4 h-4" />
                      Pause
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleExitTest}
                      className="cursor-pointer text-red-600 hover:text-red-700"
                    >
                      <XMarkIcon className="w-4 h-4" />
                      Exit
                    </Button>
                  </div>
                </div>

                {/* Question counter */}
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Question {testState.currentQuestionIndex + 1} of{" "}
                  {testState.totalQuestions}
                </div>
              </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-auto">
              <div className="max-w-4xl mx-auto py-6">
                <TestQuestion
                  question={currentQuestion}
                  onNextQuestion={handleNextQuestion}
                  selectedAnswer={selectedAnswer}
                  onAnswerSelect={handleAnswerSelect}
                  isAnswered={isCurrentQuestionAnswered}
                  showCorrectAnswer={false}
                  correctAnswerIndex={null}
                />
              </div>
            </div>

            {/* Fixed Bottom Progress Bar */}
            <div className="sticky bottom-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t shadow-lg">
              <div className="max-w-6xl mx-auto px-4 py-4">
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span>Progress</span>
                    <span>{Math.round(progressPercentage)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <motion.div
                      className={`h-2 rounded-full ${primaryColors.bg}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercentage}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                {/* Navigation Controls */}
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Answered: {answeredQuestions}/{testState.totalQuestions}
                  </div>

                  <div className="flex items-center space-x-3">
                    {isLastQuestion ? (
                      // Check if there are more difficulties to complete
                      hasNextDifficulty() ? (
                        <Button
                          onClick={handleAutoSubmit}
                          disabled={!canCompleteDifficulty()}
                          className={`px-6 py-2 cursor-pointer transition-all duration-200 ${
                            !canCompleteDifficulty()
                              ? "opacity-50 cursor-not-allowed bg-gray-400 text-gray-700"
                              : "bg-green-600 hover:bg-green-700 text-white"
                          }`}
                        >
                          {canCompleteDifficulty()
                            ? "Next Difficulty"
                            : "Answer All Questions"}
                        </Button>
                      ) : (
                        <Button
                          onClick={handleAutoSubmit}
                          disabled={
                            !canCompleteDifficulty() || isValidatingAnswer
                          }
                          loading={isValidatingAnswer}
                          className={`px-6 py-2 cursor-pointer transition-all duration-200 ${
                            !canCompleteDifficulty() || isValidatingAnswer
                              ? "opacity-50 cursor-not-allowed bg-gray-400 text-gray-700"
                              : "bg-blue-600 hover:bg-blue-700 text-white"
                          }`}
                        >
                          {isValidatingAnswer
                            ? "Validating..."
                            : canCompleteDifficulty()
                            ? "Complete Test"
                            : "Answer All Questions"}
                        </Button>
                      )
                    ) : (
                      <Button
                        onClick={handleNextQuestion}
                        disabled={
                          !isCurrentQuestionAnswered || isValidatingAnswer
                        }
                        loading={isValidatingAnswer}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isValidatingAnswer
                          ? "Validating..."
                          : "Next Question →"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );
      case "paused":
        return (
          <div className="max-w-2xl mx-auto text-center">
            <Card className="!p-8">
              <div className="text-yellow-500 text-6xl mb-4">⏸️</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Test Paused
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Your test has been paused. Click resume to continue from where
                you left off.
              </p>
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={handleResumeTest}
                  leftIcon={<PlayIcon className="w-4 h-4" />}
                  className="cursor-pointer"
                >
                  Resume Test
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleExitTest}
                  className="cursor-pointer"
                >
                  Exit Test
                </Button>
              </div>
            </Card>
          </div>
        );

      case "completing":
        return (
          <div className="max-w-2xl mx-auto text-center">
            <Card className="!p-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="text-green-500 text-6xl mb-4">🎉</div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  Test Completed!
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
                  Congratulations! You've completed all difficulty levels.
                </p>
                <div className="space-y-2 mb-6">
                  {completedDifficulties.map((diff, idx) => (
                    <div key={idx} className="flex items-center justify-center">
                      <CheckCircleIcon className="w-5 h-5 text-green-500 mr-2" />
                      <span>{diff} - Completed</span>
                    </div>
                  ))}
                </div>
                <Loading message="Calculating final results..." />
              </motion.div>
            </Card>
            {/* Add confetti animation here */}
          </div>
        );

      case "result":
        return (
          <TestResult
            result={testResult}
            onRetake={handleRetakeTest}
            onViewHistory={handleViewResults}
            onReturnToCourses={handleReturnToCourses}
            courseData={courseData}
            isPaid={courseData?.isPaid}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-transparent py-4 lg:py-8">
      {/* Temporary test button - remove in production
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowReloadWarning(true)}
        className="cursor-pointer border-orange-500 text-orange-600"
      >
        Test Modal
      </Button> */}
      <div className="max-w-6xl mx-auto px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={testPhase}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderTestPhase()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Exit Confirmation Modal */}
      <Modal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        title="Exit Test"
        variant="warning"
        size="sm"
      >
        <div className="text-center">
          <div className="text-yellow-500 text-4xl mb-4">
            <ExclamationTriangleIcon className="w-16 h-16 mx-auto" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Are you sure you want to exit the test? Your progress will be saved,
            but you'll need to restart from the beginning.
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              variant="secondary"
              onClick={() => setShowExitModal(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="warning"
              onClick={handleForceExit}
              className="cursor-pointer"
            >
              Exit Test
            </Button>
          </div>
        </div>
      </Modal>

      {/* Submit Confirmation Modal */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Submit Test"
        variant="success"
        size="sm"
      >
        <div className="text-center">
          <div className="text-green-500 text-4xl mb-4">
            <CheckCircleIcon className="w-16 h-16 mx-auto" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            Ready to submit your test?
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            You have answered {answeredQuestions} out of{" "}
            {testState.totalQuestions} questions.
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              variant="secondary"
              onClick={() => setShowSubmitModal(false)}
              className="cursor-pointer"
            >
              Continue Test
            </Button>
            <Button
              variant="success"
              onClick={handleSubmitTest}
              loading={loading}
              className="cursor-pointer"
            >
              Submit Test
            </Button>
          </div>
        </div>
      </Modal>

      {/* Custom Reload Warning Modal */}
      <ReloadWarningModal
        isOpen={showReloadWarning}
        onStay={handleStayInTest}
        onLeave={handleLeaveTest}
        testProgress={getTestProgress()}
      />
    </div>
  );
};

export default Test;
