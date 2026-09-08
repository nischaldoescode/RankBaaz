/**
 * renders the public test page with content settings, auth aware actions, seo data, and responsive layout
 *
 * @file frontend/src/pages/test.jsx
 * @module frontend/src/pages/test
 * @exports route component rendered by the client router
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTests } from "../context/TestContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import TestQuestion from "../components/test/TestQuestion";
import TestResult from "../components/test/TestResult";
import { Button } from "@/components/ui/Button";
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
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const [violationRecorded, setViolationRecorded] = useState(false);

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
    // pausetest,
    // resumetest,
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
  const [courseLoading, setCourseLoading] = useState(true); // this line
  const transitionLockRef = useRef(false);
  const [transitionInProgress, setTransitionInProgress] = useState(false);

  const primaryColors = getPrimaryColorClasses();

  useEffect(() => {
    // only run in production
    if (import.meta.env.MODE !== "production") {
      return;
    }

    // skip if not in active test
    if (!testState.isActive || testPhase !== "active") {
      return;
    }

    let detectionInterval;
    let initialDetectionTimeout;

    // method 1: console detection
    const consoleCheck = () => {
      const startTime = performance.now();
      debugger; // will pause if devtools open
      const endTime = performance.now();

      // if execution takes >100ms, devtools likely open
      return endTime - startTime > 100;
    };

    // method 2: window size detection
    const sizeCheck = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      return widthThreshold || heightThreshold;
    };

    // combined detection
    const detectDevTools = () => {
      let detected = false;

      try {
        detected = consoleCheck() || sizeCheck();
      } catch (error) {
        detected = sizeCheck();
      }

      if (detected && !devToolsOpen && !violationRecorded) {
        setDevToolsOpen(true);
        handleDevToolsDetected();
      } else if (!detected && devToolsOpen) {
        setDevToolsOpen(false);
      }
    };

    // run detection every 1 second
    detectionInterval = setInterval(detectDevTools, 1000);
    initialDetectionTimeout = window.setTimeout(detectDevTools, 250);

    // also detect on window resize
    window.addEventListener("resize", detectDevTools);

    // prevent right-click context menu
    const preventContextMenu = (e) => {
      if (testState.isActive && testPhase === "active") {
        e.preventDefault();
        toast.error("Right-click disabled during test", {
          id: "test-input-guard",
        });
      }
    };

    document.addEventListener("contextmenu", preventContextMenu);

    // prevent f12 and ctrl+shift+i
    const preventDevToolsShortcuts = (e) => {
      if (testState.isActive && testPhase === "active") {
        if (
          e.key === "F12" ||
          (e.ctrlKey && e.shiftKey && e.key === "I") ||
          (e.ctrlKey && e.shiftKey && e.key === "J") ||
          (e.ctrlKey && e.shiftKey && e.key === "C") ||
          (e.ctrlKey && e.key === "U")
        ) {
          e.preventDefault();
          toast.error("Keyboard shortcuts disabled during test", {
            id: "test-input-guard",
          });
          handleDevToolsDetected();
        }
      }
    };

    document.addEventListener("keydown", preventDevToolsShortcuts);
    // tab / window inactive detection
    const handleVisibilityChange = () => {
      if (document.hidden && testState.isActive && testPhase === "active") {
        toast.error("Tab switching or minimizing is not allowed during the test", {
          id: "test-input-guard",
        });
        handleDevToolsDetected();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      clearInterval(detectionInterval);
      window.clearTimeout(initialDetectionTimeout);
      window.removeEventListener("resize", detectDevTools);
      document.removeEventListener("contextmenu", preventContextMenu);
      document.removeEventListener("keydown", preventDevToolsShortcuts);
    };
  }, [testState.isActive, testPhase, devToolsOpen, violationRecorded]);

  // handle devtools detection (instant ban)
  const handleDevToolsDetected = async () => {
    if (violationRecorded) return;

    setViolationRecorded(true);

    try {
      const response = await apiMethods.post("/api/devtools/violation", {
        courseId,
        courseName: courseData?.name,
        detectionMethod: "multiple",
      });

      // d: instant ban message (no warnings)
      if (response.data.banned || response.data.success === false) {
        const pointsDeducted = response.data.pointsDeducted || 10;

        // show severe warning toast
        toast.error(
          ` SECURITY VIOLATION DETECTED!\n\n` +
            `DevTools/Inspector usage is strictly prohibited.\n` +
            `-${pointsDeducted} points deducted.\n\n` +
            `You have been permanently banned from "${courseData?.name}".`,
          {
            duration: 10000,
            style: {
              background: "#991b1b",
              color: "#fff",
              fontSize: "16px",
              fontWeight: "bold",
            },
          }
        );

        // d: immediate redirect (reduced delay to 3 seconds)
        setTimeout(() => {
          resetTest();
          navigate("/courses");
        }, 3000);
      } else {
        // this branch should never execute with instant ban
        toast.error("Violation recorded", { duration: 5000 });
      }
    } catch (error) {
      console.error("Failed to record violation:", error);

      // still redirect on error to prevent cheating
      toast.error("Security violation detected. Exiting test.", {
        duration: 5000,
      });
      setTimeout(() => {
        resetTest();
        navigate("/courses");
      }, 3000);
    }
  };

  // initialize test phase based on current state
  useEffect(() => {
    if (testResult) {
      // console.log("setting phase to result");
      setTestPhase("result");
    } else if (currentTest && testState.isActive) {
      if (testState.isPaused) {
        // console.log("setting phase to paused");
        setTestPhase("paused");
      } else {
        // console.log("setting phase to active");
        setTestPhase("active");
      }
    } else if (currentTest) {
      // console.log("setting phase to start");
      setTestPhase("start");
    } else {
      // console.log("no valid state, keeping current phase:", testphase);
    }
  }, [currentTest, testResult, testState, currentQuestion]);

  // reset test state when course s
  useEffect(() => {
    resetTest(); // clear old test data
    setSelectedDifficulty(null);
    setTestPhase("start");
    setCourseData(null);
  }, [courseId]);

  useEffect(() => {
    // skip if course data hasn't loaded yet
    if (!courseData) {
      return;
    }

    // check if user came directly to test url
    const cameFromCourses =
      document.referrer.includes("/courses") ||
      sessionStorage.getItem(`test_access_${courseId}`) === "granted";

    // only enforce checks if not from courses page
    if (!cameFromCourses && !currentTest && !testResult) {
      // authentication check
      if (!isAuthenticated) {
        toast.error("Please login to access tests");
        navigate("/login", { state: { from: location } });
        return;
      }

      // paid course check
      if (courseData.isPaid) {
        const checkPurchase = async () => {
          try {
            const purchaseCheck = await apiMethods.payments.checkPurchase(
              courseId
            );

            if (!purchaseCheck.data.data.hasPurchased) {
              toast.error("Please purchase this course to access the test");
              navigate("/courses");
              return;
            }

            // access granted
            sessionStorage.setItem(`test_access_${courseId}`, "granted");
          } catch (error) {
            console.error("Purchase error", error);
            toast.error("Failed to verify purchase. Please try from courses.");
            navigate("/courses");
          }
        };

        checkPurchase();
      } else {
        // free course - grant access immediately
        sessionStorage.setItem(`test_access_${courseId}`, "granted");
      }
    }
  }, [
    courseData,
    courseId,
    isAuthenticated,
    navigate,
    location,
    currentTest,
    testResult,
  ]);

  // clear session flag when component unmounts
  useEffect(() => {
    return () => {
      sessionStorage.removeItem(`test_access_${courseId}`);
    };
  }, [courseId]);

  // handle browser navigation with custom modal
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

    // always listeners (but they only act when test is active)
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("keydown", handleKeyDown, { capture: true });

    // push history state only when test becomes active
    if (testState.isActive) {
      window.history.pushState(null, "", window.location.pathname);
    }

    return () => {
      // always clean up all listeners
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [testState.isActive, testState.isPaused, setShowReloadWarning]);

  const handleStayInTest = () => {
    setShowReloadWarning(false);
  };

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

  const calculateCurrentDifficultyResults = () => {
    const currentQuestions = currentTest?.questions || [];
    const answeredQuestionIds = Object.keys(answers).filter((questionId) =>
      currentQuestions.some((question) => question._id === questionId)
      && answers[questionId] !== ""
      && answers[questionId] !== null
      && answers[questionId] !== undefined
    );
    const correctAnswersCount = Object.entries(answers).filter(
      ([questionId, userAnswer]) => {
        const question = currentQuestions.find(
          (q) => q._id === questionId
        );
        if (!question) return false;
        return parseInt(userAnswer) === parseInt(question.correctAnswer);
      }
    ).length;

    const totalQuestions = currentQuestions.length || testState.totalQuestions;
    const answeredQuestionsCount = answeredQuestionIds.length;
    const wrongAnswersCount = Math.max(
      0,
      answeredQuestionsCount - correctAnswersCount
    );
    const unansweredCount = Math.max(0, totalQuestions - answeredQuestionsCount);
    const maxMarksPerQuestion = selectedDifficulty?.marksPerQuestion || 5;
    const totalScore = correctAnswersCount * maxMarksPerQuestion;
    const maxPossibleScore = totalQuestions * maxMarksPerQuestion;

    return {
      difficulty: selectedDifficulty.name,
      totalQuestions,
      correctAnswers: correctAnswersCount,
      wrongAnswers: wrongAnswersCount,
      unanswered: unansweredCount,
      totalScore,
      maxPossibleScore,
      timeTaken: Math.floor(
        (Date.now() - new Date(testState.startTime)) / 1000
      ),
      // keep unanswered question ids so timed submissions can still be graded
      answerMapping: Object.fromEntries(
        currentQuestions.map((question) => [
          question._id,
          answers[question._id] ?? "",
        ]),
      ),
    };
  };

  const handleDifficultySelect = useCallback(
    (difficulty, course, remainingDifficulties) => {
      setSelectedDifficulty(difficulty);
      setCourseData(course);

      // store the progression order starting from selected difficulty
      setAllDifficulties(remainingDifficulties);
      setCurrentDifficultyIndex(0); // start from index 0 of remaining difficulties

      setShowTerms(true);
    },
    []
  );

  const handleStartTest = useCallback(
    async (difficultyOverride = null, triedDifficulties = new Set()) => {
      const activeDifficulty = difficultyOverride || selectedDifficulty;

      // auth verification api call
      if (!isAuthenticated) {
        // console.error("authentication required");
        toast.error("Please log in to start the test", {
          id: "test-start-error",
        });
        navigate("/login", { state: { from: location } });
        return { success: false, error: "Not authenticated" };
      }

      // verify localstorage user exists
      const storedUser = localStorage.getItem("user");
      if (!storedUser) {
        // console.error("no user in localstorage");
        toast.error("Session expired. Please login again.", {
          id: "test-start-error",
        });
        navigate("/login", { state: { from: location } });
        return { success: false, error: "No session" };
      }

      // console.log("auth check passed, proceeding with test start");

      if (!activeDifficulty) {
        // console.error("no difficulty selected");
        return { success: false, error: "No difficulty selected" };
      }

      // verify coursedata is loaded
      if (!courseData) {
        // console.error("course data not loaded");
        toast.error("Course information not loaded. Please try again.", {
          id: "test-start-error",
        });
        return { success: false, error: "Course data missing" };
      }

      try {
        clearError();

        // dispatch({ type: test_actions.set_loading, payload: true });
        // the loading state is already managed by the starttest function in testcontext

        // console.log(
        // `starting test for course: ${courseid}, difficulty: ${selecteddifficulty.name}`
        // );

        const result = await startTest(courseId, activeDifficulty.name);

        // better error handling
        if (!result) {
          throw new Error("No response from start test");
        }

        if (result.success) {
          // console.log("test started successfully");
          setTestPhase("active");
          setSelectedAnswer(null);
          setAnswers({});
          return result;
        }

        if (result.isNoQuestionsError) {
          const nextTriedDifficulties = new Set(triedDifficulties);
          nextTriedDifficulties.add(activeDifficulty.name);
          const availableDifficulties = Array.isArray(courseData?.difficulties)
            ? courseData.difficulties.filter((difficulty) => difficulty?.name)
            : [];
          const allDiffOrder = availableDifficulties.length
            ? availableDifficulties.map((difficulty) => difficulty.name)
            : ["Easy", "Medium", "Hard"];
          const currentIndex = allDiffOrder.indexOf(activeDifficulty.name);
          const nextDifficultyName = allDiffOrder.find(
            (difficultyName, index) =>
              index > currentIndex && !nextTriedDifficulties.has(difficultyName)
          );

          if (nextDifficultyName) {
            const nextDiff =
              availableDifficulties.find(
                (difficulty) => difficulty.name === nextDifficultyName
              ) || { name: nextDifficultyName };

            if (nextDiff) {
              toast.info(
                `Skipping ${activeDifficulty.name} (no questions). Starting ${nextDifficultyName}...`,
                {
                  id: "test-difficulty-transition",
                }
              );
              setSelectedDifficulty(nextDiff);

              return handleStartTest(nextDiff, nextTriedDifficulties);
            }
          } else {
            toast.error(
              "No difficulties with questions available for this course",
              {
                id: "test-difficulty-transition",
              }
            );
            navigate("/courses");
          }
          return result;
        }

        // handle authentication errors specifically
        if (
          result.error?.includes("Credentials") ||
          result.error?.includes("authentication")
        ) {
          // console.error("authentication error");
          toast.error("Session expired. Please login again.", {
            id: "test-start-error",
          });
          navigate("/login", { state: { from: location } });
          return result;
        }

        // console.error("test start failed:", result.error);
        toast.error(result.error || "Failed to start test", {
          id: "test-start-error",
        });
        return result;
      } catch (error) {
        // console.error("exception:", error);

        // handle network/auth errors
        if (error.response?.status === 401) {
          toast.error("Session expired. Please login again.", {
            id: "test-start-error",
          });
          navigate("/login", { state: { from: location } });
        } else {
          toast.error(error.message || "Failed to start test", {
            id: "test-start-error",
          });
        }

        return { success: false, error: error.message };
      }
      // finally block with dispatch
    },
    [
      courseId,
      selectedDifficulty,
      startTest,
      clearError,
      courseData,
      navigate,
      location,
      isAuthenticated,
    ]
  );
  const handleTermsAccept = useCallback(async () => {
    setTermsAccepted(true);
    setShowTerms(false);

    // loading state and proper error handling
    try {
      const result = await handleStartTest();
      if (result && result.success) {
        // console.log("test started successfully terms acceptance");
      }
    } catch (error) {
      // console.error("failed to start test terms acceptance:", error);
    }
  }, [handleStartTest]);

  const handleTermsCancel = useCallback(() => {
    setShowTerms(false);
    setSelectedDifficulty(null);
  }, []);
  // handle answer selection
  const handleAnswerSelect = useCallback(
    async (answer) => {
      if (!currentQuestion) return;

      setSelectedAnswer(answer);

      try {
        const result = await submitAnswer(currentQuestion._id, answer);

        if (result?.success) {
          setAnswers((prev) => ({
            ...prev,
            [currentQuestion._id]: answer,
          }));

          // pass feedback to testquestion component
          return { feedback: result.feedback };
        }

        return { error: result?.error || "Answer validation failed" };
      } catch (error) {
        console.error("Failed to submit answer:", error);
        return { error: error.message || "Answer validation failed" };
      }
    },
    [currentQuestion, submitAnswer]
  );

  const handleNextQuestion = useCallback(() => {
    // only allow navigation if answer was validated
    if (!currentQuestion || selectedAnswer === null) {
      toast.error("Please answer the current question first", {
        id: "test-question-guard",
      });
      return;
    }

    const result = nextQuestion();
    setSelectedAnswer(null);

    // reset validation lock for next question
    if (result.hasNext) {
      // question navigation successful
    } else {
      // no more questions - prepare for difficulty completion
    }
  }, [nextQuestion, currentQuestion, selectedAnswer]);

  // handle test submission
  const handleSubmitTest = useCallback(async () => {
    try {
      const result = await submitTest();

      if (result.success) {
        setTestPhase("result");
        setShowSubmitModal(false);
      }
    } catch (error) {
      // console.error("failed to submit test:", error);
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

  const handleAutoSubmit = useCallback(async (options = {}) => {
    const allowIncomplete = Boolean(options?.allowIncomplete);

    if (transitionLockRef.current) {
      return;
    }

    if (!allowIncomplete && !canCompleteDifficulty()) {
      toast.error("Please answer all questions before proceeding", {
        id: "test-completion-guard",
      });
      return;
    }

    transitionLockRef.current = true;
    setTransitionInProgress(true);

    try {
      const currentResults = calculateCurrentDifficultyResults();
      const updatedResults = [...allDifficultyResults, currentResults];
      setAllDifficultyResults(updatedResults);
      setCompletedDifficulties((prev) => [...prev, selectedDifficulty.name]);

      const currentDiffName =
        currentTest?.courseInfo?.difficulty?.name || selectedDifficulty.name;
      const courseDifficulties = Array.isArray(courseData?.difficulties)
        ? courseData.difficulties.filter((difficulty) => difficulty?.name)
        : [];
      const allDiffs = courseDifficulties.length
        ? courseDifficulties.map((difficulty) => difficulty.name)
        : ["Easy", "Medium", "Hard"];
      const currentIndex = allDiffs.indexOf(currentDiffName);
      const nextDifficultyName =
        currentIndex >= 0 ? allDiffs[currentIndex + 1] : null;

      const nextDiff = nextDifficultyName
        ? courseDifficulties.find((d) => d.name === nextDifficultyName)
        : null;

      if (nextDiff) {
        const startResult = await startTest(courseId, nextDifficultyName);

        if (startResult.success) {
          // successfully started next difficulty
          setSelectedDifficulty(nextDiff);
          setTestPhase("active");
          setAnswers({});
          setSelectedAnswer(null);
          toast.success(`Starting ${nextDifficultyName} difficulty`, {
            id: "test-difficulty-transition",
          });
        } else if (startResult.isNoQuestionsError) {
          // next difficulty has no questions - try to find the next one
          toast(
            `No questions in ${nextDifficultyName}. Checking for more difficulties...`,
            {
              id: "test-difficulty-transition",
            }
          );

          const nextIndex = allDiffs.indexOf(nextDifficultyName);
          const subsequentDiff = allDiffs[nextIndex + 1];

          if (
            subsequentDiff &&
            courseDifficulties.find((d) => d.name === subsequentDiff)
          ) {
            // try the difficulty the one with no questions
            const secondNextResult = await startTest(courseId, subsequentDiff);

            if (secondNextResult.success) {
              // successfully started the subsequent difficulty
              const secondNextDiffObj = courseDifficulties.find(
                (d) => d.name === subsequentDiff
              );
              setSelectedDifficulty(secondNextDiffObj);
              setTestPhase("active");
              setAnswers({});
              setSelectedAnswer(null);
              toast.success(`Starting ${subsequentDiff} difficulty`, {
                id: "test-difficulty-transition",
              });
            } else if (secondNextResult.isNoQuestionsError) {
              // subsequent difficulty also has no questions - submit test
              toast("No more difficulties available. Completing test...", {
                id: "test-difficulty-transition",
              });
              const result = await submitTest(true, updatedResults);

              if (result.success) {
                const { pointsEarned, rankInfo } = result.data || {};

                // show points and rank
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
                    { duration: 5000, id: "test-complete" }
                  );
                }

                // show badges if any
                if (
                  result.data?.newBadges &&
                  result.data.newBadges.length > 0
                ) {
                  setTimeout(() => {
                    toast.success(`New badge unlocked!`, {
                      duration: 5000,
                      icon: "",
                      id: "test-new-badge",
                    });
                  }, 1000);
                }

                setTestPhase("result");
              }
            } else {
              // error starting subsequent difficulty
              console.error(secondNextResult);
              toast.error("Failed to start next difficulty", {
                id: "test-difficulty-transition",
              });
            }
          } else {
            // no subsequent difficulty exists - submit test with current results
            toast("No more difficulties available. Completing test...", {
              id: "test-difficulty-transition",
            });
            const result = await submitTest(true, updatedResults);

            if (result.success) {
              const { pointsEarned, rankInfo } = result.data || {};

              // show points and rank
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
                  { duration: 5000, id: "test-complete" }
                );
              }

              // show badges if any
              if (result.data?.newBadges && result.data.newBadges.length > 0) {
                setTimeout(() => {
                  toast.success(`New badge unlocked!`, {
                    duration: 5000,
                    icon: "",
                    id: "test-new-badge",
                  });
                }, 1000);
              }

              setTestPhase("result");
            }
          }
        } else {
          // other error starting next difficulty
          console.error(startResult);
          toast.error("Failed to start next difficulty", {
            id: "test-difficulty-transition",
          });
        }
      } else {
        // no more difficulties configured - submit test
        const result = await submitTest(true, updatedResults);

        if (result.success) {
          const { pointsEarned, rankInfo } = result.data || {};

          // show points and rank
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
              { duration: 5000, id: "test-complete" }
            );
          }

          // show badges if any
          if (result.data?.newBadges && result.data.newBadges.length > 0) {
            setTimeout(() => {
              toast.success(`New badge unlocked!`, {
                duration: 5000,
                icon: "",
                id: "test-new-badge",
              });
            }, 1000);
          }

          setTestPhase("result");
        }
      }
    } catch (error) {
      // console.error("auto-transition failed:", error);
      toast.error("Failed to proceed", {
        id: "test-difficulty-transition",
      });
    } finally {
      transitionLockRef.current = false;
      setTransitionInProgress(false);
    }
  }, [
    allDifficultyResults,
    submitTest,
    courseData,
    selectedDifficulty,
    courseId,
    startTest,
    answers,
    currentTest,
    testState.startTime,
    testState.totalQuestions,
    canCompleteDifficulty,
  ]);

  const handleTimeExpiredSubmit = useCallback(() => {
    if (
      !currentTest ||
      !testState.isActive ||
      testState.totalQuestions <= 0 ||
      testState.totalTimeAllowed <= 0
    ) {
      return;
    }

    if (transitionLockRef.current) {
      return;
    }

    setShowExitModal(false);
    setShowSubmitModal(false);
    setShowReloadWarning(false);

    toast("Time is up. Moving to the next available step.", {
      duration: 3000,
      id: "test-difficulty-transition",
    });

    handleAutoSubmit({ allowIncomplete: true, reason: "timeExpired" });
  }, [
    currentTest,
    testState.isActive,
    testState.totalQuestions,
    testState.totalTimeAllowed,
    handleAutoSubmit,
  ]);

  useEffect(() => {
    if (
      testState.isActive &&
      testState.timeRemaining === 0 &&
      testState.totalTimeAllowed > 0 &&
      currentTest &&
      !testResult
    ) {
      handleTimeExpiredSubmit();
    }
  }, [
    testState.timeRemaining,
    testState.totalTimeAllowed,
    testState.isActive,
    currentTest,
    testResult,
    handleTimeExpiredSubmit,
  ]);

  useEffect(() => {
    const loadCourseInfo = async () => {
      if (!courseId) {
        // console.error("no courseid provided");
        navigate("/courses");
        return;
      }

      setCourseLoading(true);

      try {
        // console.log(`loading course data for: ${courseid}`);
        const response = await apiMethods.courses.getById(courseId);

        if (!response?.data?.data?.course) {
          // console.error("invalid response structure:", response);
          toast.error("Failed to load course information");
          navigate("/courses");
          return;
        }

        const course = response.data.data.course;

        // console.log(`course loaded:`, {
        // name: course.name,
        // ispaid: course.ispaid,
        // difficulties: course.difficulties?.length,
        // });

        setCourseData(course);
      } catch (error) {
        // console.error("error loading course:", error);

        // better error handling
        if (error.response?.status === 404) {
          toast.error("Course not found");
        } else if (error.response?.status === 401) {
          toast.error("Please login to access this course");
          navigate("/login", { state: { from: location } });
          return;
        } else if (error.response?.status === 403) {
          toast.error("Access denied");
        } else {
          toast.error("Failed to load course. Please try again.");
        }

        // redirect showing error
        setTimeout(() => navigate("/courses"), 2000);
      } finally {
        setCourseLoading(false);
      }
    };

    loadCourseInfo();
  }, [courseId, navigate, location]);

  // in test.jsx - ed version with proper error handling
  useEffect(() => {
    const checkAndLoadExistingTest = async () => {
      // check authentication first checking ispaid
      if (!isAuthenticated) {
        // console.log("user not authenticated, redirecting to login");
        navigate("/login", { state: { from: location } });
        return;
      }

      // wait for coursedata to be loaded checking
      if (!courseData) {
        // console.log("course data still loading");
        return;
      }

      // only check for existing tests if course is paid
      if (courseData.isPaid) {
        try {
          const response = await apiMethods.tests.getHistory();
          const userTests = response.data.data.testHistory;

          const existingTest = userTests.find(
            (test) => test.course._id === courseId
          );

          if (existingTest) {
            await apiMethods.tests.getResult(existingTest._id);
            setTestPhase("result");
            return;
          }
        } catch (error) {
          // console.error("failed to check test history:", error);
          // don't block if history check fails
          if (error.response?.status === 401) {
            navigate("/login", { state: { from: location } });
            return;
          }
        }
      }

      // only proceed if we have both auth and coursedata
      if (isAuthenticated && courseData) {
        setTestPhase("start");
      }
    };

    checkAndLoadExistingTest();
  }, [courseData, courseId, isAuthenticated, navigate, location]);

  // handle test exit
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
      // console.error("failed to record abandonment:", error);
    }
  }, [
    courseId,
    selectedDifficulty,
    completedDifficulties,
    resetTest,
    navigate,
  ]);

  // handle forced exit
  const handleForceExit = useCallback(() => {
    // clear all local storage and context data
    resetTest();
    setAnswers({});
    setSelectedAnswer(null);
    setTestPhase("start");
    setShowExitModal(false);
    navigate("/courses");
    toast("Test progress discarded");
  }, [resetTest, navigate]);

  // navigation handlers
  const handleReturnToCourses = () => navigate("/courses");

  const handleViewResults = () => navigate("/profile");
  const handleRetakeTest = () => {
    // only allow retake for free courses
    if (courseData?.isPaid) {
      toast.error("Paid courses can only be taken once");
      navigate("/courses");
      return;
    }

    resetTest();
    setTestPhase("start");
    setSelectedDifficulty(null); // reset to difficulty selection
  };

  // loading state
  if (loading && !currentTest) {
    return <Loading message="Loading test..." />;
  }

  if (error && !currentTest) {
    const isSessionError = /session|auth|login|credential/i.test(error);

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-12">
        <div className="mx-auto max-w-xl">
          <Card className="!p-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
              <ExclamationTriangleIcon className="h-7 w-7" />
            </div>
            <h1 className="mb-3 text-2xl font-semibold text-gray-950 dark:text-white">
              Could not start this test
            </h1>
            <p className="mb-6 text-sm leading-6 text-gray-600 dark:text-gray-300">
              {error}
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                variant="secondary"
                onClick={() => {
                  clearError();
                  setShowTerms(false);
                  setTermsAccepted(false);
                  setSelectedDifficulty(null);
                }}
              >
                Choose difficulty again
              </Button>
              <Button
                onClick={() => {
                  clearError();
                  if (isSessionError) {
                    navigate("/login", { state: { from: location } });
                    return;
                  }
                  navigate("/courses");
                }}
              >
                {isSessionError ? "Log in again" : "Back to courses"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const renderTestPhase = () => {
    // step 0: if paid course and still loading test result
    if (courseData?.isPaid && loading && !testResult && !currentTest) {
      return (
        <div className="max-w-2xl mx-auto text-center">
          <Card className="!p-8">
            <Loading message="Loading your test result..." />
          </Card>
        </div>
      );
    }

    if (courseLoading) {
      return (
        <div className="max-w-2xl mx-auto text-center">
          <Card className="!p-8">
            <Loading message="Loading course information..." />
          </Card>
        </div>
      );
    }

    // step 1: if paid course and test result loaded, show it immediately
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

    // step 2: show difficulty selection if no difficulty selected (free course or first attempt)
    if (!selectedDifficulty) {
      return (
        <DifficultySelection
          courseId={courseId}
          onSelectDifficulty={handleDifficultySelect}
          onCancel={() => navigate("/courses")}
        />
      );
    }

    // step 3: show terms if difficulty selected but not accepted
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

    // step 3: show loading while starting test
    if (termsAccepted && !currentTest && loading) {
      return (
        <div className="max-w-2xl mx-auto text-center">
          <Card className="!p-8">
            <Loading message="Starting your test..." />
          </Card>
        </div>
      );
    }

    // remove the "start" case entirely since difficultyselection handles everything

    switch (testPhase) {
      // remove case "start" completely

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
            {/* ed header */}
            <div className="sticky top-16 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b shadow-sm">
              <div className="max-w-6xl mx-auto px-4 py-3">
                {/* course name and controls */}
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
                    {/* timer */}
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
                      onClick={handleExitTest}
                      className="cursor-pointer text-red-600 hover:text-red-700"
                    >
                      <XMarkIcon className="w-4 h-4" />
                      Exit
                    </Button>
                  </div>
                </div>

                {/* question counter */}
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Question {testState.currentQuestionIndex + 1} of{" "}
                  {testState.totalQuestions}
                </div>
              </div>
            </div>

            {/* scrollable content area */}
            <div className="flex-1 overflow-auto">
              <div className="max-w-4xl mx-auto py-6">
                <TestQuestion
                  question={currentQuestion}
                  onNextQuestion={handleNextQuestion}
                  selectedAnswer={selectedAnswer}
                  onAnswerSelect={handleAnswerSelect}
                  isAnswered={isCurrentQuestionAnswered}
                  isValidatingAnswer={isValidatingAnswer}
                  showCorrectAnswer={false}
                  correctAnswerIndex={null}
                />
              </div>
            </div>

            {/* ed bottom progress bar */}
            <div className="sticky bottom-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t shadow-lg">
              <div className="max-w-6xl mx-auto px-4 py-4">
                {/* progress bar */}
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

                {/* navigation controls */}
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Answered: {answeredQuestions}/{testState.totalQuestions}
                  </div>

                  <div className="flex items-center space-x-3">
                    {isLastQuestion ? (
                      // check if there are more difficulties to complete
                      hasNextDifficulty() ? (
                        <Button
                          onClick={() => handleAutoSubmit()}
                          disabled={!canCompleteDifficulty() || transitionInProgress}
                          loading={transitionInProgress}
                          className={`px-6 py-2 cursor-pointer transition-all duration-200 ${
                            !canCompleteDifficulty() || transitionInProgress
                              ? "opacity-50 cursor-not-allowed bg-gray-400 text-gray-700"
                              : "bg-blue-600 hover:bg-blue-700 text-white"
                          }`}
                        >
                          {transitionInProgress
                            ? "Moving..."
                            : canCompleteDifficulty()
                            ? "Next Difficulty"
                            : "Answer All Questions"}
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleAutoSubmit()}
                          disabled={
                            !canCompleteDifficulty() ||
                            isValidatingAnswer ||
                            transitionInProgress
                          }
                          loading={isValidatingAnswer || transitionInProgress}
                          className={`px-6 py-2 cursor-pointer transition-all duration-200 ${
                            !canCompleteDifficulty() ||
                            isValidatingAnswer ||
                            transitionInProgress
                              ? "opacity-50 cursor-not-allowed bg-gray-400 text-gray-700"
                              : "bg-blue-600 hover:bg-blue-700 text-white"
                          }`}
                        >
                          {transitionInProgress
                            ? "Submitting..."
                            : isValidatingAnswer
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
      case "completing":
        return (
          <div className="max-w-2xl mx-auto text-center">
            <Card className="!p-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <CheckCircleIcon className="mx-auto mb-4 h-14 w-14 text-blue-600" />
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
    <div className="vg-test-shell min-h-screen bg-transparent py-4 lg:py-8">
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

      {/* submit confirmation modal */}
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

      {/* custom reload warning modal */}
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
