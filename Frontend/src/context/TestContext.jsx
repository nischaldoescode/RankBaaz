import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
} from "react";
import { apiMethods, handleApiError } from "../services/api";
import toast from "react-hot-toast";

// Initial state
const initialState = {
  currentTest: null,
  currentQuestion: null,
  answers: {},
  testResult: null,
  testHistory: [],
  userStats: null,
  loading: false,
  error: null,
  isValidatingAnswer: false,
  testState: {
    isActive: false,
    isPaused: false,
    timeRemaining: 0,
    questionTimeRemaining: 0,
    questionTimeLimit: 0,
    totalTimeAllowed: 0,
    currentQuestionIndex: 0,
    totalQuestions: 0,
    maxPossibleMarks: 0,
    startTime: null,
    endTime: null,
    difficultyLocked: false,
  },
};

// Action types
const TEST_ACTIONS = {
  UPDATE_QUESTION_TIMER: "UPDATE_QUESTION_TIMER",
  RESET_QUESTION_TIMER: "RESET_QUESTION_TIMER",
  AUTO_NEXT_QUESTION: "AUTO_NEXT_QUESTION",
  SET_LOADING: "SET_LOADING",
  COMPLETE_DIFFICULTY: "COMPLETE_DIFFICULTY",
  START_TEST: "START_TEST",
  SET_CURRENT_QUESTION: "SET_CURRENT_QUESTION",
  SUBMIT_ANSWER: "SUBMIT_ANSWER",
  NEXT_QUESTION: "NEXT_QUESTION",
  SUBMIT_TEST: "SUBMIT_TEST",
  SET_TEST_RESULT: "SET_TEST_RESULT",
  SET_TEST_HISTORY: "SET_TEST_HISTORY",
  SET_USER_STATS: "SET_USER_STATS",
  SET_ERROR: "SET_ERROR",
  CLEAR_ERROR: "CLEAR_ERROR",
  UPDATE_TIMER: "UPDATE_TIMER",
  PAUSE_TEST: "PAUSE_TEST",
  RESUME_TEST: "RESUME_TEST",
  END_TEST: "END_TEST",
  RESET_TEST: "RESET_TEST",
  SET_VALIDATING: "SET_VALIDATING",
};

// Reducer
const testReducer = (state, action) => {
  switch (action.type) {
    case TEST_ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };

    case TEST_ACTIONS.START_TEST:
      // Get the test data from API response
      const testData = action.payload.test;
      // console.log("Test data structure:", testData);

      // Extract difficulty settings from courseInfo
      const difficultySettings = testData.courseInfo?.difficulty;
      const timeLimit =
        difficultySettings?.timerSettings?.maxTime ||
        testData.courseInfo?.maxTime ||
        60;

      // Questions are directly in testData.questions
      const questions = testData.questions || [];
      const firstQuestion = questions.length > 0 ? questions[0] : null;

      // console.log("First question:", firstQuestion);

      return {
        ...state,
        currentTest: {
          _id: testData._id || `test_${Date.now()}`,
          questions: questions,
          courseInfo: {
            ...testData.courseInfo,
            _id: action.payload.courseId,
          },
        },
        selectedCourseId: action.payload.courseId,
        allDifficulties: action.payload.allDifficulties, // Add this
        completedDifficulties: action.payload.completedDifficulties || [],
        allTestResults: state.allTestResults || [],
        currentQuestion: firstQuestion,
        answers: {},
        loading: false,
        error: null,
        selectedDifficulty: action.payload.difficulty,
        difficultyProgression: action.payload.difficultyProgression || [
          action.payload.difficulty,
        ],
        currentProgressionIndex: 0,
        selectedDifficultySettings: difficultySettings,
        testState: {
          isActive: true,
          isPaused: false,
          timeRemaining: timeLimit,
          questionTimeRemaining: timeLimit,
          questionTimeLimit: timeLimit,
          totalTimeAllowed: timeLimit,
          currentQuestionIndex: 0,
          totalQuestions: questions.length,
          maxPossibleMarks: difficultySettings?.totalMarks || 0,
          startTime: new Date(),
          endTime: null,
          difficultyLocked: true,
        },
      };

    case TEST_ACTIONS.SET_VALIDATING:
      return { ...state, isValidatingAnswer: action.payload };

    case TEST_ACTIONS.SET_CURRENT_QUESTION:
      return {
        ...state,
        currentQuestion: action.payload.question,
        testState: {
          ...state.testState,
          currentQuestionIndex: action.payload.index,
        },
      };

    case TEST_ACTIONS.COMPLETE_DIFFICULTY:
      return {
        ...state,
        completedDifficulties: [
          ...state.completedDifficulties,
          action.payload.difficulty,
        ],
        allTestResults: [
          ...(state.allTestResults || []),
          action.payload.result,
        ],
        answers: {}, // Reset answers for next difficulty
        currentQuestion: null,
      };

    case TEST_ACTIONS.SUBMIT_ANSWER:
      return {
        ...state,
        answers: {
          ...state.answers,
          [action.payload.questionId]: action.payload.answer,
        },
      };

    case TEST_ACTIONS.NEXT_QUESTION:
      const nextIndex = state.testState.currentQuestionIndex + 1;
      return {
        ...state,
        currentQuestion: state.currentTest.questions[nextIndex],
        testState: {
          ...state.testState,
          currentQuestionIndex: nextIndex,
          questionTimeRemaining: state.testState.questionTimeLimit,
        },
      };

    case TEST_ACTIONS.SUBMIT_TEST:
      return {
        ...state,
        testState: {
          ...state.testState,
          isActive: false,
          endTime: new Date(),
        },
        loading: true,
      };

    case TEST_ACTIONS.SET_TEST_RESULT:
      return {
        ...state,
        testResult: action.payload,
        loading: false,
        error: null,
      };

    case TEST_ACTIONS.SET_TEST_HISTORY:
      return {
        ...state,
        testHistory: action.payload,
        error: null,
      };

    case TEST_ACTIONS.SET_USER_STATS:
      return {
        ...state,
        userStats: action.payload,
        error: null,
      };

    case TEST_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false,
      };

    case TEST_ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };

    case TEST_ACTIONS.UPDATE_TIMER:
      return {
        ...state,
        testState: {
          ...state.testState,
          timeRemaining: Math.max(0, action.payload),
        },
      };

    case TEST_ACTIONS.PAUSE_TEST:
      return {
        ...state,
        testState: {
          ...state.testState,
          isPaused: true,
        },
      };

    case TEST_ACTIONS.RESUME_TEST:
      return {
        ...state,
        testState: {
          ...state.testState,
          isPaused: false,
        },
      };

    case TEST_ACTIONS.END_TEST:
      return {
        ...state,
        testState: {
          ...state.testState,
          isActive: false,
          isPaused: false,
          endTime: new Date(),
        },
      };

    case TEST_ACTIONS.UPDATE_QUESTION_TIMER:
      return {
        ...state,
        testState: {
          ...state.testState,
          questionTimeRemaining: Math.max(0, action.payload || 0),
        },
      };

    case TEST_ACTIONS.RESET_QUESTION_TIMER:
      return {
        ...state,
        testState: {
          ...state.testState,
          questionTimeRemaining: state.testState.questionTimeLimit,
        },
      };

    case TEST_ACTIONS.RESET_TEST:
      return { ...initialState };

    default:
      return state;
  }
};

const TestContext = createContext();

export const TestProvider = ({ children }) => {
  const [state, dispatch] = useReducer(testReducer, initialState);

  useEffect(() => {
    let timer;
    if (
      state.testState.isActive &&
      !state.testState.isPaused &&
      state.testState.timeRemaining > 0
    ) {
      timer = setInterval(() => {
        dispatch({
          type: TEST_ACTIONS.UPDATE_TIMER,
          payload: state.testState.timeRemaining - 1,
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [
    state.testState.isActive,
    state.testState.isPaused,
    state.testState.timeRemaining,
  ]);

  // Modified effect for difficulty transition
  useEffect(() => {
    if (
      state.testState.isActive &&
      state.testState.timeRemaining === 0 &&
      !state.testResult
    ) {
      console.log("Difficulty time expired, checking for next difficulty");
      // Handle difficulty transition instead of auto-submit
      // This should be handled in Test.jsx component
    }
  }, [
    state.testState.timeRemaining,
    state.testState.isActive,
    state.testResult,
  ]);

  const startTest = async (courseId, difficulty) => {
    try {
      dispatch({ type: TEST_ACTIONS.SET_LOADING, payload: true });
      const response = await apiMethods.tests.startTest(courseId, difficulty);
      const test = response.data.data;

      dispatch({
        type: TEST_ACTIONS.START_TEST,
        payload: { test, difficulty: difficulty, courseId: courseId },
      });
      if (!state.testState.isActive) {
        toast.success("Test started! Good luck!");
      }
      return { success: true, test, difficulty: difficulty };
    } catch (err) {
      // NEW: Extract the exact error message from backend
      const backendMessage = err.response?.data?.message || "";
      const msg = handleApiError(err, "Failed to start test");

      dispatch({ type: TEST_ACTIONS.SET_ERROR, payload: msg });

      // NEW: Don't show toast here - let caller handle it
      // This allows the caller to determine if it's a fatal error or just "no questions"

      return {
        success: false,
        error: msg,
        isNoQuestionsError: backendMessage.includes("No questions available"), // NEW: Flag to identify the specific error
      };
    }
  };

  const submitAnswer = async (questionId, answer) => {
    dispatch({ type: TEST_ACTIONS.SET_VALIDATING, payload: true }); // NEW: Lock

    try {
      const actualCourseId =
        state.currentTest.courseInfo?._id || state.selectedCourseId || courseId;

      const response = await apiMethods.tests.checkAnswer(
        actualCourseId,
        questionId,
        answer,
        true
      );

      dispatch({
        type: TEST_ACTIONS.SUBMIT_ANSWER,
        payload: { questionId, answer },
      });

      // NEW: Unlock after brief delay
      setTimeout(
        () => {
          dispatch({ type: TEST_ACTIONS.SET_VALIDATING, payload: false });
        },
        response.data.data.isCorrect ? 1500 : 2500
      );

      return { success: true, feedback: response.data.data };
    } catch (err) {
      dispatch({
        type: TEST_ACTIONS.SUBMIT_ANSWER,
        payload: { questionId, answer },
      });

      dispatch({ type: TEST_ACTIONS.SET_VALIDATING, payload: false });
      return { success: true, error: err.message };
    }
  };

  const nextQuestion = () => {
    const nextIndex = state.testState.currentQuestionIndex + 1;
    if (nextIndex < state.currentTest.questions.length) {
      dispatch({ type: TEST_ACTIONS.NEXT_QUESTION });
      return { hasNext: true };
    }
    return { hasNext: false };
  };

  const calculateCurrentScore = useCallback(() => {
    if (!state.currentTest || !state.answers) return 0;

    let correctCount = 0;
    const totalQuestions = Object.keys(state.answers).length;

    Object.entries(state.answers).forEach(([questionId, userAnswer]) => {
      const question = state.currentTest.questions.find(
        (q) => q._id === questionId
      );
      if (question && question.correctAnswer !== undefined) {
        const isCorrect =
          parseInt(userAnswer) === parseInt(question.correctAnswer);
        if (isCorrect) correctCount++;
      }
    });

    return totalQuestions > 0
      ? Math.round((correctCount / totalQuestions) * 100)
      : 0;
  }, [state.currentTest, state.answers]);

  const submitTest = async (
    isFinalSubmission = false,
    accumulatedResults = []
  ) => {
    try {
      dispatch({ type: TEST_ACTIONS.SUBMIT_TEST });

      if (!isFinalSubmission) {
        // Not a final submission - just return success for local storage
        return { success: true, storedLocally: true };
      }

      // Final submission only - use accumulated results from component
      console.log(
        "Final submission with accumulated results:",
        accumulatedResults
      );

      if (!accumulatedResults || accumulatedResults.length === 0) {
        throw new Error("No accumulated results provided for final submission");
      }

      // Collect all answers from all difficulties
      const allAnswers = [];
      accumulatedResults.forEach((diffResult) => {
        if (diffResult.answerMapping) {
          Object.entries(diffResult.answerMapping).forEach(
            ([questionId, answer]) => {
              allAnswers.push({
                questionId,
                answer,
                timeSpent: 0,
              });
            }
          );
        }
      });

      const response = await apiMethods.tests.submitTest({
        courseId: state.selectedCourseId || state.currentTest.courseInfo._id,
        difficulty:
          accumulatedResults.length > 1
            ? "Multi"
            : accumulatedResults[0].difficulty,
        answers: allAnswers,
        timeTaken: accumulatedResults.reduce((sum, r) => sum + r.timeTaken, 0),
        testSettings: {
          isMultiDifficulty: accumulatedResults.length > 1,
          difficulties: accumulatedResults.map((r) => r.difficulty),
          totalQuestions: accumulatedResults.reduce(
            (sum, r) => sum + r.totalQuestions,
            0
          ),
          maxTime: state.testState.totalTimeAllowed,
        },
        difficultyResultsSummary: accumulatedResults,
      });

      dispatch({
        type: TEST_ACTIONS.SET_TEST_RESULT,
        payload: {
          ...response.data.data.testResult,
          rankInfo: response.data.data.rankInfo,
          pointsEarned: response.data.data.pointsEarned,
        },
      });
      dispatch({ type: TEST_ACTIONS.END_TEST });

      toast.success("Test submitted successfully!");
      return { success: true };
    } catch (err) {
      const msg = handleApiError(err, "Failed to submit test");
      dispatch({ type: TEST_ACTIONS.SET_ERROR, payload: msg });
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  const canCompleteDifficulty = useCallback(() => {
    if (!state.currentTest || !state.testState.isActive) return false;

    // Check if all questions are answered or time is up
    const allQuestionsAnswered =
      Object.keys(state.answers).length === state.testState.totalQuestions;
    const timeIsUp = state.testState.timeRemaining === 0;

    return allQuestionsAnswered || timeIsUp;
  }, [state.answers, state.testState, state.currentTest]);

  const hasNextDifficulty = useCallback(() => {
    if (
      !state.selectedDifficulty ||
      !state.currentTest?.courseInfo?.difficulties
    ) {
      return false;
    }

    const allDiffs = ["Easy", "Medium", "Hard"];
    const currentIndex = allDiffs.indexOf(state.selectedDifficulty);
    const nextDifficulty = allDiffs[currentIndex + 1];

    if (!nextDifficulty) return false;

    return state.currentTest.courseInfo.difficulties.some(
      (d) => d.name === nextDifficulty
    );
  }, [state.selectedDifficulty, state.currentTest]);

  const getTestResult = async (testId) => {
    try {
      dispatch({ type: TEST_ACTIONS.SET_LOADING, payload: true });
      const response = await apiMethods.tests.getResult(testId);
      dispatch({
        type: TEST_ACTIONS.SET_TEST_RESULT,
        payload: response.data.data.testResult,
      });
      return { success: true };
    } catch (err) {
      const msg = handleApiError(err, "Failed to load test result");
      dispatch({ type: TEST_ACTIONS.SET_ERROR, payload: msg });
      return { success: false, error: msg };
    }
  };

  const getLeaderboard = async (courseId, difficulty) => {
    try {
      const response = await apiMethods.tests.getLeaderboard(
        courseId,
        difficulty
      );
      return { success: true, leaderboard: response.data.data.leaderboard };
    } catch (err) {
      const msg = handleApiError(err, "Failed to get leaderboard Stats");
      dispatch({ type: TEST_ACTIONS.SET_ERROR, payload: msg });
      return { success: false, error: msg };
    }
  };

  const getTestHistory = async () => {
    try {
      const response = await apiMethods.tests.getHistory();
      dispatch({
        type: TEST_ACTIONS.SET_TEST_HISTORY,
        payload: response.data.data.testHistory,
      });
      return { success: true };
    } catch (err) {
      const msg = handleApiError(err, "Failed to load test history");
      dispatch({ type: TEST_ACTIONS.SET_ERROR, payload: msg });
      return { success: false, error: msg };
    }
  };

  const getUserStats = async () => {
    try {
      const response = await apiMethods.tests.getStats();
      dispatch({
        type: TEST_ACTIONS.SET_USER_STATS,
        payload: response.data.data,
      });
      return { success: true };
    } catch (err) {
      const msg = handleApiError(err, "Failed to load user stats");
      dispatch({ type: TEST_ACTIONS.SET_ERROR, payload: msg });
      return { success: false, error: msg };
    }
  };

  const pauseTest = () => {
    if (state.testState.isActive && !state.testState.isPaused) {
      dispatch({ type: TEST_ACTIONS.PAUSE_TEST });
      toast("Test paused");
    }
  };

  const resumeTest = () => {
    if (state.testState.isActive && state.testState.isPaused) {
      dispatch({ type: TEST_ACTIONS.RESUME_TEST });
      toast("ℹ️ Test resumed");
    }
  };

  const resetTest = () => {
    dispatch({ type: TEST_ACTIONS.RESET_TEST });
  };

  const clearError = () => {
    dispatch({ type: TEST_ACTIONS.CLEAR_ERROR });
  };

  const isLastQuestion =
    state.testState.currentQuestionIndex === state.testState.totalQuestions - 1;
  const answeredQuestions = Object.keys(state.answers).length;
  const unansweredQuestions =
    state.testState.totalQuestions - answeredQuestions;
  const progressPercentage =
    state.testState.totalQuestions > 0
      ? (state.testState.currentQuestionIndex /
          state.testState.totalQuestions) *
        100
      : 0;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const timeRemainingFormatted = formatTime(state.testState.timeRemaining);

  const isCurrentQuestionAnswered = state.currentQuestion
    ? state.answers.hasOwnProperty(state.currentQuestion._id)
    : false;

  const value = {
    ...state,
    startTest,
    submitAnswer,
    nextQuestion,
    submitTest,
    getTestResult,
    getTestHistory,
    getLeaderboard,
    getUserStats,
    pauseTest,
    resumeTest,
    resetTest,
    clearError,
    isLastQuestion,
    answeredQuestions,
    unansweredQuestions,
    progressPercentage,
    timeRemainingFormatted,
    isCurrentQuestionAnswered,
    canCompleteDifficulty,
    hasNextDifficulty,
  };

  return <TestContext.Provider value={value}>{children}</TestContext.Provider>;
};

export const useTests = () => {
  const context = useContext(TestContext);
  if (!context) throw new Error("useTests must be used within a TestProvider");
  return context;
};
