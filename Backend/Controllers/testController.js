import { body, validationResult } from "express-validator";
import TestResult from "../Models/TestResult.js";
import Course from "../Models/Course.js";
import User from "../Models/User.js";
import leaderboardService from "../services/leaderboardService.js";
import mongoose from "mongoose";
import redisClient from "../Config/redis.js";
import Payment from "../Models/Payment.js";
import questionCacheService from "../services/questionCacheService.js";

// Test submission validation rules
export const testSubmissionValidation = [
  body("courseId").isMongoId().withMessage("Invalid course ID"),

  body("difficulty")
    .custom((value) => {
      if (typeof value === "string") {
        return ["Easy", "Medium", "Hard", "Multi"].includes(value);
      }
      if (Array.isArray(value)) {
        return value.every((diff) => ["Easy", "Medium", "Hard"].includes(diff));
      }
      return false;
    })
    .withMessage(
      "Difficulty must be Easy, Medium, Hard, Multi, or array of difficulties"
    ),

  body("answers")
    .custom((value, { req }) => {
      // For multi-difficulty tests, answers can be empty since they're in difficultyResultsSummary
      if (req.body.testSettings?.isMultiDifficulty) {
        return Array.isArray(value);
      }
      // For single difficulty tests, require at least 1 answer
      return Array.isArray(value) && value.length >= 1;
    })
    .withMessage("Answers array is required for single difficulty tests"),

  body("timeTaken")
    .isInt({ min: 1 })
    .withMessage("Time taken must be a positive integer"),

  body("testSettings").isObject().withMessage("Test settings are required"),

  body("difficultyResultsSummary")
    .optional()
    .isArray()
    .withMessage("Difficulty results summary must be an array"),
];

// Start a new test
export const startTest = async (req, res) => {
  try {
    const { courseId, difficulty } = req.params;
    const numberOfQuestions = parseInt(req.query.questions) || 20;
    const userId = req.user?.userId;

    // Validate course and difficulty
    const course = await Course.findOne({ _id: courseId, isActive: true });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found or inactive",
      });
    }

    // SECURITY CHECK: If course is paid, verify purchase
    if (course.isPaid) {
      const payment = await Payment.findOne({
        user: userId,
        course: courseId,
        status: "success",
      });

      if (!payment) {
        return res.status(403).json({
          success: false,
          message: "Please purchase this course to access it",
          requiresPayment: true,
          coursePrice: course.price,
          courseName: course.name,
        });
      }
    }

    const difficultyConfig = course.difficulties.find(
      (diff) => diff.name === difficulty
    );
    if (!difficultyConfig) {
      return res.status(400).json({
        success: false,
        message: `Difficulty level '${difficulty}' not available for this course`,
      });
    }

    // Get random questions for the test from course.questions
    console.log(
      `Fetching questions for course: ${courseId}, difficulty: ${difficulty}`
    );
    const maxQuestions = Math.min(
      numberOfQuestions,
      course.maxQuestionsPerTest
    );

    // Filter questions by difficulty and active status
    const availableQuestions = course.questions.filter(
      (q) => q.difficulty === difficulty && q.isActive === true
    );

    console.log(
      `Available questions found: ${availableQuestions.length} for difficulty: ${difficulty}`
    );

    if (availableQuestions.length === 0) {
      console.log(
        `No active questions found for course ${courseId} with difficulty ${difficulty}`
      );
      return res.status(404).json({
        success: false,
        message: "No questions available for this course and difficulty",
      });
    }

    // Randomly sample questions
    const shuffled = availableQuestions.sort(() => 0.5 - Math.random());
    const questions = shuffled
      .slice(0, Math.min(maxQuestions, availableQuestions.length))
      .map((q) => ({
        _id: q._id,
        question: q.question,
        questionType: q.questionType,
        options: q.options,
        difficulty: q.difficulty,
        image: q.image,
      }));

    console.log(`Selected ${questions.length} questions for the test`);

    res.status(200).json({
      success: true,
      message: "Test started successfully",
      data: {
        questions,
        courseInfo: {
          name: course.name,
          difficulty: difficultyConfig,
          maxTime: difficultyConfig.timerSettings.maxTime,
          questionTimeLimit: difficultyConfig.timerSettings.maxTime,
          minTime: difficultyConfig.timerSettings.minTime,
          marksPerQuestion: difficultyConfig.marksPerQuestion,
        },
        totalQuestions: questions.length,
      },
    });
  } catch (error) {
    console.error("Start test error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start test",
    });
  }
};

// Get question details for answer validation (server-side only)
const getQuestionDetails = async (courseId, questionId) => {
  try {
    const course = await Course.findById(courseId);
    if (!course) return null;

    const question = course.questions.find(
      (q) => q._id.toString() === questionId
    );
    return question;
  } catch (error) {
    return null;
  }
};

export const checkAnswer = async (req, res) => {
  try {
    const { courseId, questionId, answer, showAnswer = false } = req.body;

    // NEW: Try cache first
    let question = await questionCacheService.getCachedQuestion(
      courseId,
      questionId
    );

    if (!question) {
      // Cache miss - fetch from database
      const courseData = await Course.findOne(
        {
          _id: courseId,
          "questions._id": questionId,
        },
        {
          "questions.$": 1,
        }
      ).lean();

      if (
        !courseData ||
        !courseData.questions ||
        courseData.questions.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message: "Question not found",
        });
      }

      question = courseData.questions[0];

      // NEW: Cache for future requests
      await questionCacheService.cacheQuestion(courseId, questionId, question);
    }

    // Rest of validation logic remains same...
    const correctAnswer = question.correctAnswer;
    const questionType = question.questionType;

    let isCorrect = false;

    if (questionType === "multiple" || questionType === "truefalse") {
      isCorrect = parseInt(answer) === parseInt(correctAnswer);
    } else if (questionType === "single") {
      isCorrect =
        String(answer).toLowerCase().trim() ===
        String(correctAnswer).toLowerCase().trim();
    }

    const responseData = {
      isCorrect,
      questionId,
    };

    if (showAnswer) {
      responseData.correctAnswer = correctAnswer;
      responseData.explanation = question.explanation;
    }

    return res.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error("Check answer error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check answer",
    });
  }
};

// Submit test results
export const submitTest = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    console.log(`=== SUBMIT TEST REQUEST ===`);
    // console.log(`User ID: ${req.user?.id}`);
    console.log(`Request body keys: ${Object.keys(req.body).join(", ")}`);
    console.log(`Answers count: ${req.body.answers?.length || 0}`);

    const {
      courseId,
      difficulty,
      answers,
      timeTaken,
      testSettings,
      difficultyResultsSummary,
    } = req.body;
    const userId = req.user?.userId;

    // Validate course
    const course = await Course.findOne({ _id: courseId, isActive: true });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found or inactive",
      });
    }

    let finalTestResult;

    if (testSettings.isMultiDifficulty && difficultyResultsSummary) {
      // FIRST: Create detailed questions array from all difficulties
      const allQuestions = [];

      difficultyResultsSummary.forEach((diffResult) => {
        // Initialize counters for THIS difficulty
        let diffCorrectCount = 0;
        let diffTotalScore = 0;

        if (diffResult.answerMapping) {
          Object.entries(diffResult.answerMapping).forEach(
            ([questionId, userAnswer]) => {
              const question = course.questions.find(
                (q) => q._id.toString() === questionId
              );
              if (question) {
                let isCorrect = false;
                if (
                  question.questionType === "multiple" ||
                  question.questionType === "truefalse"
                ) {
                  isCorrect =
                    parseInt(userAnswer) === parseInt(question.correctAnswer);
                } else if (question.questionType === "single") {
                  isCorrect =
                    String(userAnswer).toLowerCase().trim() ===
                    String(question.correctAnswer).toLowerCase().trim();
                }

                const diffConfig = course.difficulties.find(
                  (d) => d.name === diffResult.difficulty
                );
                const marksAwarded = isCorrect
                  ? diffConfig?.marksPerQuestion || 5
                  : 0;

                // updating counters for this difficulty ...
                if (isCorrect) diffCorrectCount++;
                diffTotalScore += marksAwarded;

                // Store questions in the difficulty result toooo ohhhhh yeahh
                if (!diffResult.questions) {
                  diffResult.questions = [];
                }

                diffResult.questions.push({
                  questionId: questionId,
                  userAnswer: String(userAnswer),
                  correctAnswer: String(question.correctAnswer),
                  isCorrect,
                  marksAwarded,
                  timeSpent: 0,
                  difficulty: diffResult.difficulty,
                });

                // Add to main questions array
                allQuestions.push({
                  question: questionId,
                  userAnswer: String(userAnswer),
                  correctAnswer: String(question.correctAnswer),
                  isCorrect,
                  marksAwarded,
                  timeSpent: 0,
                  timedOut: false,
                  difficulty: diffResult.difficulty,
                });
              }
            }
          );
        }

        // UPDATE THE DIFFICULTY RESULT WITH CORRECT VALUES
        diffResult.correctAnswers = diffCorrectCount;
        diffResult.wrongAnswers = diffResult.totalQuestions - diffCorrectCount;
        diffResult.totalScore = diffTotalScore;
      });

      // NOW: Calculate aggregated stats from populated allQuestions array
      const aggregated = {
        totalQuestions: allQuestions.length,
        correctAnswers: allQuestions.filter((q) => q.isCorrect).length,
        wrongAnswers: allQuestions.filter((q) => !q.isCorrect && q.userAnswer)
          .length,
        unanswered: allQuestions.filter((q) => !q.userAnswer).length,
        totalScore: allQuestions.reduce(
          (sum, q) => sum + (q.marksAwarded || 0),
          0
        ),
        maxPossibleScore: difficultyResultsSummary.reduce(
          (sum, r) => sum + (r.maxPossibleScore || 0),
          0
        ),
        timeTaken: difficultyResultsSummary.reduce(
          (sum, r) => sum + (r.timeTaken || 0),
          0
        ),
      };

      console.log("Aggregated multi-difficulty results:", aggregated);

      // Calculate percentage for multi-difficulty test
      const percentage =
        aggregated.maxPossibleScore > 0
          ? Math.round(
              (aggregated.totalScore / aggregated.maxPossibleScore) * 100
            )
          : 0;
      finalTestResult = new TestResult({
        user: userId,
        course: courseId,
        difficulty: testSettings.difficulties, // Store as array
        questions: allQuestions, // Include all questions from all difficulties
        totalQuestions: aggregated.totalQuestions,
        correctAnswers: aggregated.correctAnswers,
        wrongAnswers: aggregated.wrongAnswers,
        unanswered: aggregated.unanswered,
        totalScore: aggregated.totalScore,
        maxPossibleScore: aggregated.maxPossibleScore,
        percentage,
        timeTaken: aggregated.timeTaken,
        completedAt: new Date(),
        testSettings: {
          ...testSettings,
          difficultyResults: difficultyResultsSummary,
        },
      });
    } else {
      // Single difficulty test - process normally
      const difficultyConfig = course.difficulties.find(
        (diff) => diff.name === difficulty
      );
      if (!difficultyConfig) {
        return res.status(400).json({
          success: false,
          message: `Difficulty level '${difficulty}' not available for this course`,
        });
      }

      // Process single difficulty normally (your existing logic)
      const questionIds = answers.map((ans) => ans.questionId);
      const questions = course.questions.filter(
        (q) =>
          questionIds.includes(q._id.toString()) &&
          q.difficulty === difficulty &&
          q.isActive === true
      );

      if (questions.length !== questionIds.length) {
        return res.status(400).json({
          success: false,
          message: "Some questions are invalid or inactive",
        });
      }

      // Calculate results for single difficulty
      const questionMap = new Map();
      questions.forEach((q) => questionMap.set(q._id.toString(), q));

      let correctAnswers = 0;
      let wrongAnswers = 0;
      let unanswered = 0;
      let totalScore = 0;
      const processedQuestions = [];

      answers.forEach((userAnswer) => {
        const question = questionMap.get(userAnswer.questionId);
        if (!question) return;

        const userAnswerText =
          userAnswer.answer !== undefined && userAnswer.answer !== null
            ? String(userAnswer.answer).trim()
            : "";
        const correctAnswer =
          question.correctAnswer !== undefined &&
          question.correctAnswer !== null
            ? String(question.correctAnswer).trim()
            : "";

        let isCorrect = false;
        let marksAwarded = 0;

        if (!userAnswerText) {
          unanswered++;
        } else {
          if (
            question.questionType === "multiple" ||
            question.questionType === "truefalse"
          ) {
            isCorrect =
              parseInt(userAnswer.answer) === parseInt(question.correctAnswer);
          } else if (question.questionType === "single") {
            isCorrect =
              userAnswerText.toLowerCase() === correctAnswer.toLowerCase();
          }

          if (isCorrect) {
            correctAnswers++;
            marksAwarded = difficultyConfig.marksPerQuestion;
          } else {
            wrongAnswers++;
            marksAwarded = 0;
          }
        }

        totalScore += marksAwarded;

        processedQuestions.push({
          question: question._id,
          userAnswer: userAnswerText,
          correctAnswer: correctAnswer,
          isCorrect: isCorrect,
          marksAwarded: marksAwarded,
          timeSpent: userAnswer.timeSpent || 0,
          timedOut: userAnswer.timedOut || false,
        });
      });

      const maxPossibleScore =
        questions.length * difficultyConfig.marksPerQuestion;
      const percentage = Math.round((totalScore / maxPossibleScore) * 100);

      finalTestResult = new TestResult({
        user: userId,
        course: courseId,
        difficulty: difficulty,
        questions: processedQuestions,
        totalQuestions: questions.length,
        correctAnswers,
        wrongAnswers,
        unanswered,
        totalScore,
        maxPossibleScore,
        percentage,
        timeTaken,
        completedAt: new Date(),
        testSettings,
      });
    }

    // Calculate percentile BEFORE saving
    const allTestsForCourse = await TestResult.find({
      course: courseId,
      difficulty: finalTestResult.difficulty,
    })
      .select("percentage")
      .lean();

    let percentile = 0;
    if (allTestsForCourse.length > 0) {
      const lowerScores = allTestsForCourse.filter(
        (test) => test.percentage < finalTestResult.percentage
      ).length;
      percentile = Math.round((lowerScores / allTestsForCourse.length) * 100);
    }

    // Add percentile to the test result
    finalTestResult.percentile = percentile;

    const pointsService = (await import("../services/pointsService.js"))
      .default;
    const badgeService = (await import("../services/badgeService.js")).default;

    const pointsEarned = pointsService.calculatePointsForTest(finalTestResult);
    finalTestResult.pointsEarned = pointsEarned;
    finalTestResult.wasAbandoned = false;

    // Save test result
    await finalTestResult.save();

    // Update user points and stats
    await pointsService.updateUserPoints(
      userId,
      pointsEarned,
      "test_completion"
    );

    // Get previous rank before updating points
    const previousRank = await pointsService.getUserRank(userId);

    // Update user stats
    await User.findByIdAndUpdate(userId, {
      $inc: {
        "stats.testsCompleted": 1,
        "stats.questionsAnswered": finalTestResult.totalQuestions,
      },
      $set: {
        "stats.averagePercentile": finalTestResult.percentile,
        "stats.lastKnownRank": previousRank,
        "stats.rankLastUpdated": new Date(),
      },
    });

    // Store previous rank in test result for frontend
    finalTestResult.previousRank = previousRank;

    // Check for badge eligibility
    await badgeService.checkAndAwardBadges(userId);

    // Update leaderboard with points
    if (
      finalTestResult.difficulty &&
      finalTestResult.percentage !== undefined
    ) {
      const difficulties = Array.isArray(finalTestResult.difficulty)
        ? finalTestResult.difficulty
        : [finalTestResult.difficulty];

      // Ensure userId is string for Redis operations
      const userIdForRedis = userId.toString();

      for (const diff of difficulties) {
        await leaderboardService.updateLeaderboard(
          userIdForRedis,
          courseId.toString(),
          diff,
          finalTestResult.percentage,
          finalTestResult.timeTaken
        );

        // update points-based leaderboard
        const leaderboardService2 = (
          await import("../services/leaderboardService.js")
        ).default;
        const key = `leaderboard:points:${courseId}:${diff}`;
        await redisClient.zadd(key, pointsEarned, userId.toString());
        await redisClient.expire(key, 7 * 24 * 60 * 60);
      }

      await leaderboardService.updateLeaderboard(
        userId,
        courseId,
        "all",
        finalTestResult.percentage,
        finalTestResult.timeTaken
      );
    }

    // Populate course name
    const populatedResult = await TestResult.findById(finalTestResult._id)
      .populate("course", "name")
      .lean();

    // Add courseTitle for frontend
    populatedResult.courseTitle = populatedResult.course.name;

    // Get new rank after points update
    const newRank = await pointsService.getUserRank(userId);
    const rankChange = previousRank && newRank ? previousRank - newRank : null;

    res.status(201).json({
      success: true,
      message: "Test submitted successfully",
      data: {
        pointsEarned,
        newBadges: await badgeService.checkAndAwardBadges(userId),
        testResult: populatedResult,
        rankInfo: {
          previousRank,
          newRank,
          rankChange,
        },
      },
    });
  } catch (error) {
    console.error("=== SUBMIT TEST ERROR ===");
    console.error("Error details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit test",
    });
  }
};

// Get test result by ID with detailed answers
export const getTestResult = async (req, res) => {
  try {
    const { testId } = req.params;
    const userId = req.user.userId;

    // Parallel execution - fetch test and course data simultaneously
    const [testResult, courseData] = await Promise.all([
      TestResult.findOne({
        _id: testId,
        user: userId,
      })
        .select("-__v") // Exclude version key
        .lean(), // Convert to plain object immediately

      // We'll get course after checking if test exists
      null,
    ]);

    if (!testResult) {
      return res.status(404).json({
        success: false,
        message: "Test result not found",
      });
    }

    // Now fetch course with only needed fields
    const course = await Course.findById(testResult.course)
      .select("name questions._id questions.question questions.explanation")
      .lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Create question lookup map for O(1) access instead of O(n) find operations
    const questionMap = new Map(
      course.questions.map((q) => [q._id.toString(), q])
    );

    // Efficiently populate questions with explanations
    testResult.questions = testResult.questions.map((resultQ) => {
      const courseQ = questionMap.get(resultQ.question.toString());

      return {
        ...resultQ,
        question: courseQ
          ? {
              _id: courseQ._id,
              question: courseQ.question,
              explanation: courseQ.explanation,
            }
          : resultQ.question,
      };
    });

    // Add course info
    testResult.course = {
      _id: course._id,
      name: course.name,
    };
    testResult.courseTitle = course.name;

    res.status(200).json({
      success: true,
      message: "Test result retrieved successfully",
      data: {
        testResult,
      },
    });
  } catch (error) {
    console.error("Get test result error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve test result",
    });
  }
};

export const abandonTest = async (req, res) => {
  try {
    const { courseId, difficulty, completedDifficulties } = req.body;
    const userId = req.user.userId;

    // Calculate deduction based on where they quit
    const pointsService = (await import("../services/pointsService.js"))
      .default;
    let deduction = 0;

    if (!completedDifficulties || completedDifficulties.length === 0) {
      // Quit at first difficulty
      deduction = pointsService.POINTS_CONFIG.DEDUCTION_EASY;
    } else if (
      completedDifficulties.includes("Easy") &&
      !completedDifficulties.includes("Medium")
    ) {
      // Quit after Easy
      deduction = pointsService.POINTS_CONFIG.DEDUCTION_MEDIUM;
    } else if (completedDifficulties.includes("Medium")) {
      // Quit after Medium or during Hard
      deduction = pointsService.POINTS_CONFIG.DEDUCTION_HARD;
    }

    // Record abandoned test
    const abandonedTest = new TestResult({
      user: userId,
      course: courseId,
      difficulty:
        completedDifficulties.length > 0 ? completedDifficulties : [difficulty],
      questions: [],
      totalQuestions: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      unanswered: 0,
      totalScore: 0,
      maxPossibleScore: 0,
      percentage: 0,
      timeTaken: 0,
      wasAbandoned: true,
      abandonedAtDifficulty:
        completedDifficulties[completedDifficulties.length - 1] || difficulty,
      pointsDeducted: deduction,
      testSettings: {
        isMultiDifficulty: completedDifficulties.length > 0,
        difficulties: completedDifficulties,
      },
    });

    await abandonedTest.save();

    // Deduct points
    await pointsService.updateUserPoints(userId, -deduction, "test_abandoned");

    res.status(200).json({
      success: true,
      message: "Test abandoned",
      data: {
        pointsDeducted: deduction,
        reason: `Abandoned at ${abandonedTest.abandonedAtDifficulty} difficulty`,
      },
    });
  } catch (error) {
    console.error("Abandon test error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to record abandoned test",
    });
  }
};

export const getLeaderboardInfo = async (req, res) => {
  try {
    const pointsService = (await import("../services/pointsService.js"))
      .default;
    const badgeService = (await import("../services/badgeService.js")).default;

    res.status(200).json({
      success: true,
      data: {
        pointsSystem: {
          baseCompletion: pointsService.POINTS_CONFIG.BASE_COMPLETION,
          percentageMultiplier:
            pointsService.POINTS_CONFIG.PERCENTAGE_MULTIPLIER,
          questionPoints: pointsService.POINTS_CONFIG.QUESTION_POINTS,
          timeBonusMax: pointsService.POINTS_CONFIG.TIME_BONUS_MAX,
          difficultyMultipliers: {
            Easy: 1.0,
            Medium: 1.5,
            Hard: 2.0,
          },
        },
        deductions: {
          abandonEasy: pointsService.POINTS_CONFIG.DEDUCTION_EASY,
          abandonMedium: pointsService.POINTS_CONFIG.DEDUCTION_MEDIUM,
          abandonHard: pointsService.POINTS_CONFIG.DEDUCTION_HARD,
          maxDeduction: pointsService.POINTS_CONFIG.MAX_DEDUCTION,
        },
        badges: badgeService.getAllBadgeInfo(),
        calculationExample: {
          description: "Example: Medium difficulty test with 20 questions",
          basePoints: 10,
          percentagePoints: "50 (for 100%)",
          questionPoints: "4 (20 questions * 0.2)",
          timeBonus: "up to 5 (based on speed)",
          difficultyMultiplier: "1.5x (Medium)",
          totalPossible: "~103 points",
        },
      },
    });
  } catch (error) {
    console.error("Get leaderboard info error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get leaderboard information",
    });
  }
};

// Get user's test history
export const getTestHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const courseId = req.query.course;

    // Build filter query
    let filterQuery = { user: userId };
    if (courseId) {
      filterQuery.course = courseId;
    }

    const testHistory = await TestResult.find(filterQuery)
      .populate("course", "name")
      .select("-questions") // Exclude detailed questions for list view
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalTests = await TestResult.countDocuments(filterQuery);
    const totalPages = Math.ceil(totalTests / limit);

    res.status(200).json({
      success: true,
      message: "Test history retrieved successfully",
      data: {
        testHistory,
        pagination: {
          currentPage: page,
          totalPages,
          totalTests,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get test history error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve test history",
    });
  }
};

// Get user performance statistics
export const getPerformanceStats = async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log(`Fetching performance stats for user: ${userId}`);

    // Early return for users with no tests
    const testCount = await TestResult.countDocuments({ user: userId });
    if (testCount === 0) {
      console.log(`No tests found for user: ${userId}`);
      return res.status(200).json({
        success: true,
        message: "No test history yet",
        data: {
          overall: {
            totalTests: 0,
            averageScore: 0,
            bestScore: 0,
            worstScore: 0,
            totalTimeSpent: 0,
            totalCorrectAnswers: 0,
            totalQuestions: 0,
          },
          courseStats: [],
          difficultyStats: [],
          recentTests: [],
        },
      });
    }

    // Overall statistics
    const overallStats = await TestResult.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          totalTests: { $sum: 1 },
          averageScore: { $avg: "$percentage" },
          bestScore: { $max: "$percentage" },
          worstScore: { $min: "$percentage" },
          totalTimeSpent: { $sum: "$timeTaken" },
          totalCorrectAnswers: { $sum: "$correctAnswers" },
          totalQuestions: { $sum: "$totalQuestions" },
        },
      },
    ]);

    // Course-wise performance
    const courseStats = await TestResult.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: "$course",
          testsTaken: { $sum: 1 },
          averageScore: { $avg: "$percentage" },
          bestScore: { $max: "$percentage" },
          totalTimeSpent: { $sum: "$timeTaken" },
        },
      },
      {
        $lookup: {
          from: "courses",
          localField: "_id",
          foreignField: "_id",
          as: "courseInfo",
        },
      },
      { $unwind: "$courseInfo" },
      {
        $project: {
          courseName: "$courseInfo.name",
          testsTaken: 1,
          averageScore: { $round: ["$averageScore", 2] },
          bestScore: 1,
          totalTimeSpent: 1,
        },
      },
      { $sort: { testsTaken: -1 } },
    ]);

    // Difficulty-wise performance
    const difficultyStats = await TestResult.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: "$difficulty",
          testsTaken: { $sum: 1 },
          averageScore: { $avg: "$percentage" },
          bestScore: { $max: "$percentage" },
        },
      },
      {
        $project: {
          difficulty: "$_id",
          testsTaken: 1,
          averageScore: { $round: ["$averageScore", 2] },
          bestScore: 1,
        },
      },
    ]);

    // Recent performance trend (last 10 tests)
    const recentTests = await TestResult.find({ user: userId })
      .populate("course", "name")
      .select("course difficulty percentage completedAt")
      .sort({ completedAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      message: "Performance statistics retrieved successfully",
      data: {
        overall: overallStats[0] || {
          totalTests: 0,
          averageScore: 0,
          bestScore: 0,
          worstScore: 0,
          totalTimeSpent: 0,
          totalCorrectAnswers: 0,
          totalQuestions: 0,
        },
        courseStats,
        difficultyStats,
        recentTests,
      },
    });
  } catch (error) {
    console.error("Get performance stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve performance statistics",
    });
  }
};

// Get leaderboard for a course
export const getLeaderboard = async (req, res) => {
  try {
    const { courseId } = req.params;
    const difficulty = req.query.difficulty || "all";
    const limit = parseInt(req.query.limit) || 100;

    // Validate course exists
    const Course = (await import("../Models/Course.js")).default;
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Get leaderboard from service (handles Redis + MongoDB fallback)
    const leaderboard = await leaderboardService.getLeaderboard(
      courseId,
      difficulty,
      limit
    );

    // Get current user's rank if authenticated
    let userRank = null;
    if (req.user?.userId) {
      userRank = await leaderboardService.getUserRank(
        req.user.userId,
        courseId,
        difficulty
      );
    }

    // Handle all edge cases
    if (!leaderboard || leaderboard.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No test results yet for this course and difficulty level",
        data: {
          leaderboard: [],
          userRank: null,
          total: 0,
          isEmpty: true, // Flag for frontend
        },
      });
    }

    // Success with data
    res.status(200).json({
      success: true,
      message: "Leaderboard retrieved successfully",
      data: {
        leaderboard,
        userRank,
        total: leaderboard.length,
        isEmpty: false,
      },
    });
  } catch (error) {
    console.error("Get leaderboard error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve leaderboard",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
