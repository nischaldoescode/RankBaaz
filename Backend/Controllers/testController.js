/**
 * handles test controller api requests, input validation, persistence calls, side effects, and response shaping
 *
 * @file backend/controllers/testcontroller.js
 * @module backend/controllers/testcontroller
 * @exports request handlers used by backend routes
 */

import { body, validationResult } from "express-validator";
import TestResult from "../Models/TestResult.js";
import Course from "../Models/Course.js";
import User from "../Models/User.js";
import CourseReview from "../Models/CourseReview.js";
import leaderboardService from "../services/leaderboardService.js";
import mongoose from "mongoose";
import redisClient from "../Config/redis.js";
import Payment from "../Models/Payment.js";
import questionCacheService from "../services/questionCacheService.js";
import { invalidateCache } from "../Config/redis.js";
import {
  setNoStoreHeaders,
  setPdfDownloadHeaders,
} from "../helpers/pdfResponseHeaders.js";

// test submission validation rules
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
      // for multi-difficulty tests, answers can be empty since they're in difficultyresultssummary
      if (req.body.testSettings?.isMultiDifficulty) {
        return Array.isArray(value);
      }
      // timed attempts may finish with every question unanswered
      return Array.isArray(value);
    })
    .withMessage("Answers must be an array"),

  body("timeTaken")
    .isInt({ min: 0 })
    .withMessage("Time taken must be a non-negative integer"),

  body("testSettings").isObject().withMessage("Test settings are required"),

  body("difficultyResultsSummary")
    .optional()
    .isArray()
    .withMessage("Difficulty results summary must be an array"),
];

/**
 * starts a test and returns only safe question data plus authoritative timing
 *
 * @param {object} req express request containing course and difficulty params
 * @param {object} res express response used to return the test payload
 * @returns {promise<void>} resolves after the test payload has been sent
 */
export const startTest = async (req, res) => {
  try {
    const { courseId, difficulty } = req.params;
    const numberOfQuestions = parseInt(req.query.questions) || 20;
    const userId = req.user?.userId;

    // validate course and difficulty
    const course = await Course.findOne({ _id: courseId, isActive: true });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found or inactive",
      });
    }

    // security check: if course is paid, verify purchase
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

    // get random questions for the test from course.questions
    console.log(
      `Fetching questions for course: ${courseId}, difficulty: ${difficulty}`
    );
    const maxQuestions = Math.min(
      numberOfQuestions,
      course.maxQuestionsPerTest
    );

    // filter questions by difficulty and active status
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

    // randomly sample questions
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

    const questionTimeLimit = Math.max(
      1,
      Number(difficultyConfig.timerSettings.maxTime) || 1,
    );
    const totalTime = questionTimeLimit * questions.length;

    console.log(`Selected ${questions.length} questions for the test`);

    res.status(200).json({
      success: true,
      message: "Test started successfully",
      data: {
        questions,
        courseInfo: {
          name: course.name,
          difficulty: difficultyConfig,
          maxTime: questionTimeLimit,
          questionTimeLimit,
          totalTime,
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

// get question details for answer validation (server-side only)
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

    // try cache first
    let question = await questionCacheService.getCachedQuestion(
      courseId,
      questionId
    );

    if (!question) {
      // cache miss - fetch from database
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

      // cache for future requests
      await questionCacheService.cacheQuestion(courseId, questionId, question);
    }

    // rest of validation logic remains same
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

// submit test results
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
    // console.log(`user id: ${req.user?.id}`);
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

    // validate course
    const course = await Course.findOne({ _id: courseId, isActive: true });
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found or inactive",
      });
    }

    let finalTestResult;

    if (testSettings.isMultiDifficulty && difficultyResultsSummary) {
      // first: create detailed questions array from all difficulties
      const allQuestions = [];

      difficultyResultsSummary.forEach((diffResult) => {
        // initialize counters for this difficulty
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

                // updating counters for this difficulty
                if (isCorrect) diffCorrectCount++;
                diffTotalScore += marksAwarded;

                // store questions in the difficulty result toooo ohhhhh yeahh
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

                // to main questions array
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

        // update the difficulty result with correct values
        diffResult.correctAnswers = diffCorrectCount;
        diffResult.wrongAnswers = diffResult.totalQuestions - diffCorrectCount;
        diffResult.totalScore = diffTotalScore;
      });

      // now: calculate aggregated stats from populated allquestions array
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

      // calculate percentage for multi-difficulty test
      const percentage =
        aggregated.maxPossibleScore > 0
          ? Math.round(
              (aggregated.totalScore / aggregated.maxPossibleScore) * 100
            )
          : 0;
      finalTestResult = new TestResult({
        user: userId,
        course: courseId,
        difficulty: testSettings.difficulties, // store as array
        questions: allQuestions, // include all questions from all difficulties
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
      // single difficulty test - process normally
      const difficultyConfig = course.difficulties.find(
        (diff) => diff.name === difficulty
      );
      if (!difficultyConfig) {
        return res.status(400).json({
          success: false,
          message: `Difficulty level '${difficulty}' not available for this course`,
        });
      }

      // process single difficulty normally (your existing logic)
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

      // calculate results for single difficulty
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
      const percentage =
        maxPossibleScore > 0
          ? Math.round((totalScore / maxPossibleScore) * 100)
          : 0;

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

    // calculate percentile saving
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

    // percentile to the test result
    finalTestResult.percentile = percentile;

    const pointsService = (await import("../services/pointsService.js"))
      .default;
    const badgeService = (await import("../services/badgeService.js")).default;

    const pointsEarned = pointsService.calculatePointsForTest(finalTestResult);
    finalTestResult.pointsEarned = pointsEarned;
    finalTestResult.wasAbandoned = false;

    // save test result
    await finalTestResult.save();

    // update user points and stats
    await pointsService.updateUserPoints(
      userId,
      pointsEarned,
      "test_completion"
    );

    // get previous rank updating points
    const previousRank = await pointsService.getUserRank(userId);

    // update user stats
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $inc: {
          "stats.testsCompleted": 1,
          "stats.questionsAnswered": finalTestResult.totalQuestions,
        },
        $set: {
          "stats.averagePercentile": finalTestResult.percentile,
          "stats.lastKnownRank": previousRank,
          "stats.rankLastUpdated": new Date(),
        },
      },
      { new: true, select: "username" },
    ).lean();

    // store previous rank in test result for frontend
    finalTestResult.previousRank = previousRank;

    // check for badge eligibility
    await badgeService.checkAndAwardBadges(userId);

    // update leaderboard with points
    if (
      finalTestResult.difficulty &&
      finalTestResult.percentage !== undefined
    ) {
      const difficulties = Array.isArray(finalTestResult.difficulty)
        ? finalTestResult.difficulty
        : [finalTestResult.difficulty];

      // ensure userid is string for redis operations
      const userIdForRedis = userId.toString();

      for (const diff of difficulties) {
        await leaderboardService.updateLeaderboard(
          userIdForRedis,
          courseId.toString(),
          diff,
          finalTestResult.percentage,
          finalTestResult.timeTaken
        );

        const key = `leaderboard:points:${courseId}:${diff}`;
        // keep the completed attempt successful when the optional redis index is down
        try {
          await redisClient.zadd(key, pointsEarned, userId.toString());
          await redisClient.expire(key, 7 * 24 * 60 * 60);
        } catch (redisError) {
          console.warn("Points leaderboard update skipped:", redisError.message);
        }
      }

      await leaderboardService.updateLeaderboard(
        userId,
        courseId,
        "all",
        finalTestResult.percentage,
        finalTestResult.timeTaken
      );
    }

    // populate course name
    const populatedResult = await TestResult.findById(finalTestResult._id)
      .populate({
        path: "course",
        select: "name teacher",
        populate: {
          path: "teacher",
          select: "name username profileImage",
        },
      })
      .lean();

    // coursetitle for frontend
    populatedResult.courseTitle = populatedResult.course.name;

    // get rank points update
    const newRank = await pointsService.getUserRank(userId);
    const rankChange = previousRank && newRank ? previousRank - newRank : null;
    // cache invalidation should never turn a saved result into a failed submission
    await invalidateCache
      .leaderboard(courseId)
      .catch((error) =>
        console.warn("Leaderboard cache invalidation skipped:", error.message),
      );
    await invalidateCache
      .test(userId, finalTestResult._id)
      .catch((error) =>
        console.warn("Test cache invalidation skipped:", error.message),
      );
    await invalidateCache
      .user(userId, updatedUser?.username)
      .catch((error) =>
        console.warn("Profile cache invalidation skipped:", error.message),
      );

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

// get test result by id with detailed answers
export const getTestResult = async (req, res) => {
  try {
    const { testId } = req.params;
    const userId = req.user.userId;

    // parallel execution - fetch test and course data simultaneously
    const [testResult, courseData] = await Promise.all([
      TestResult.findOne({
        _id: testId,
        user: userId,
      })
        .select("-__v") // exclude version key
        .lean(), // convert to plain object immediately

      // we'll get course checking if test exists
      null,
    ]);

    if (!testResult) {
      return res.status(404).json({
        success: false,
        message: "Test result not found",
      });
    }

    // now fetch course details for the saved attempt
    const course = await Course.findById(testResult.course)
      .select("name teacher questions._id questions.question questions.explanation")
      .populate("teacher", "name username profileimage")
      .lean();
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // create question lookup map for o(1) access instead of o(n) find operations
    const questionMap = new Map(
      course.questions.map((q) => [q._id.toString(), q])
    );

    // efficiently populate questions with explanations
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

    // course info
    testResult.course = {
      _id: course._id,
      name: course.name,
      teacher: course.teacher
        ? {
            _id: course.teacher._id,
            name: course.teacher.name,
            username: course.teacher.username,
            profileImage: course.teacher.profileImage,
          }
        : null,
    };
    testResult.courseTitle = course.name;

    const review = course.teacher
      ? await CourseReview.findOne({
          user: userId,
          testResult: testResult._id,
          course: course._id,
        })
          .select("rating feedback status evaluation createdAt updatedAt")
          .lean()
      : null;
    testResult.review = review;

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

export const submitCourseFeedback = async (req, res) => {
  try {
    const { testId } = req.params;
    const userId = req.user.userId;
    const rating = Number(req.body.rating);
    const feedback = String(req.body.feedback || "")
      .trim()
      .replace(/\s+/g, " ");

    if (!mongoose.Types.ObjectId.isValid(testId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid test result",
      });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    if (feedback.length < 10 || feedback.length > 800) {
      return res.status(400).json({
        success: false,
        message: "Feedback must be 10 to 800 characters",
      });
    }

    const testResult = await TestResult.findOne({
      _id: testId,
      user: userId,
      wasAbandoned: { $ne: true },
    }).lean();

    if (!testResult) {
      return res.status(404).json({
        success: false,
        message: "Completed test result not found",
      });
    }

    const course = await Course.findById(testResult.course)
      .select("name teacher")
      .populate("teacher", "username")
      .lean();

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    if (!course.teacher) {
      return res.status(400).json({
        success: false,
        message: "Feedback is available for teacher-created courses only",
      });
    }

    const wordCount = feedback.split(/\s+/).filter(Boolean).length;
    const quality =
      feedback.length >= 160 || wordCount >= 25
        ? "detailed"
        : feedback.length >= 60 || wordCount >= 10
          ? "helpful"
          : "brief";

    const badges = [
      rating === 5 ? "Excellent clarity" : null,
      rating >= 4 ? "Recommended by student" : null,
      quality === "detailed" ? "Detailed feedback" : null,
      testResult.percentage >= 80 ? "Strong student outcome" : null,
    ].filter(Boolean);

    const review = await CourseReview.findOneAndUpdate(
      { user: userId, testResult: testResult._id },
      {
        user: userId,
        course: course._id,
        teacher: course.teacher._id,
        testResult: testResult._id,
        rating,
        feedback,
        status: "approved",
        isPublic: true,
        evaluation: {
          badges,
          quality,
          evaluatedAt: new Date(),
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).lean();

    await redisClient
      .del(`teacher:profile:${course.teacher.username}`)
      .catch(() => {});

    return res.status(200).json({
      success: true,
      message: "Feedback saved",
      data: { review },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Feedback already exists for this test result",
      });
    }
    console.error("Submit course feedback error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save feedback",
    });
  }
};

/**
 * download test result as pdf
 * @route get /api/tests/download-pdf/:testid
 * @access private (user who took test or admin)
 * @param {string} testid - test result id
 * @returns {buffer} pdf file
 *
 * security:
 * users need ownership, a valid signed request, and a one-time token
 * admins need authentication, request signing, and route-level rate limits
 * no-store headers keep generated files out of shared browser and edge caches
 */
export const downloadTestPDF = async (req, res) => {
  setNoStoreHeaders(res);

  try {
    const { testId } = req.params;
    const userId = req.user?.userId;
    const isAdmin = req.admin?.isAdmin === true;
    const downloadToken = req.query.token; // one-time token for users

    console.log(`=== PDF DOWNLOAD REQUEST ===`);
    // validate testid format
    if (!mongoose.Types.ObjectId.isValid(testId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid test ID format",
      });
    }

    // fetch test result with populated data
    const testResult = await TestResult.findById(testId)
      .populate({
        path: "course",
        select: "name description hasPdfExport questions difficulties",
      })
      .populate({
        path: "user",
        select: "name email",
      })
      .lean();

    if (!testResult) {
      return res.status(404).json({
        success: false,
        message: "Test result not found",
      });
    }

    // security check 1: verify ownership (unless admin)
    if (!isAdmin && testResult.user._id.toString() !== userId) {
      console.log(
        `Unauthorized PDF access attempt by user ${userId}`
      );
      return res.status(403).json({
        success: false,
        message: "You can only download your own test results",
      });
    }

    // security check 2: check if user is banned from this course (non-admin only)
    if (!isAdmin) {
      const User = (await import("../Models/User.js")).default;
      const user = await User.findById(userId);

      const isBanned = user?.bannedCourses?.some(
        (ban) =>
          ban.courseId.toString() === testResult.course._id.toString() &&
          (ban.permanent || (ban.unbanAt && ban.unbanAt > new Date()))
      );

      if (isBanned) {
        return res.status(403).json({
          success: false,
          message: "You are banned from accessing content for this course",
        });
      }
    }

    // security check 3: check if course has pdf export enabled (skip for admin)
    if (!isAdmin && !testResult.course.hasPdfExport) {
      return res.status(403).json({
        success: false,
        message: "PDF export is not available for this course",
      });
    }

    // security check 4: validate one-time download token (non-admin only)
    if (!isAdmin) {
      if (!downloadToken) {
        return res.status(403).json({
          success: false,
          message: "Download token required",
        });
      }

      // verify token hasn't been used
      const crypto = await import("crypto");
      const expectedToken = crypto
        .createHash("sha256")
        .update(
          `${testResult._id}-${testResult.user._id}-${testResult.createdAt}`
        )
        .digest("hex");

      if (downloadToken !== expectedToken) {
        return res.status(403).json({
          success: false,
          message: "Invalid or expired download token",
        });
      }

      // check if already downloaded
      if (testResult.pdfDownloaded) {
        return res.status(403).json({
          success: false,
          message:
            "You have already downloaded this test result. Each test can only be downloaded once.",
          downloadedAt: testResult.pdfDownloadedAt,
        });
      }
    }

    // import pdf service
    const pdfService = (await import("../services/pdfService.js")).default;

    // generate the report after ownership and export rules are settled
    const pdfBuffer = await pdfService.generateTestResultPDF(
      testResult,
      testResult.course,
      testResult.user,
      isAdmin
    );
    if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
      throw new Error("test pdf renderer returned an empty buffer");
    }

    // update download status (only for non-admin users)
    if (!isAdmin) {
      await TestResult.findByIdAndUpdate(testId, {
        pdfDownloaded: true,
        pdfDownloadedAt: new Date(),
      });
    }

    // set response headers
    const safeCourseName = String(testResult.course.name || "course")
      .replace(/[^a-z0-9]+/gi, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 72);
    const filename = `Vidhgrow_${safeCourseName || "course"}_${
      new Date().toISOString().split("T")[0]
    }.pdf`;

    setPdfDownloadHeaders(res, {
      filename,
      length: pdfBuffer.length,
    });

    // send pdf
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Download PDF error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate PDF",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * generate one-time download token for pdf
 * @route get /api/tests/generate-pdf-token/:testid
 * @access private (user only)
 * @param {string} testid - test result id
 * @returns {object} download token
 */
export const generatePDFDownloadToken = async (req, res) => {
  setNoStoreHeaders(res);

  try {
    const { testId } = req.params;
    const userId = req.user?.userId;

    // validate testid
    if (!mongoose.Types.ObjectId.isValid(testId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid test ID format",
      });
    }

    // fetch test result
    const testResult = await TestResult.findById(testId)
      .populate({
        path: "course",
        select: "hasPdfExport",
      })
      .select("user pdfDownloaded course createdAt")
      .lean();

    if (!testResult) {
      return res.status(404).json({
        success: false,
        message: "Test result not found",
      });
    }

    // verify ownership
    if (testResult.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only access your own test results",
      });
    }

    // check if course has pdf export enabled
    if (!testResult.course.hasPdfExport) {
      return res.status(403).json({
        success: false,
        message: "PDF export is not available for this course",
      });
    }

    // check if already downloaded
    if (testResult.pdfDownloaded) {
      return res.status(403).json({
        success: false,
        message: "This test result has already been downloaded",
      });
    }

    // generate one-time token
    const crypto = await import("crypto");
    const token = crypto
      .createHash("sha256")
      .update(`${testResult._id}-${testResult.user}-${testResult.createdAt}`)
      .digest("hex");

    res.status(200).json({
      success: true,
      data: {
        token,
        expiresIn: 300000, // 5 minutes in milliseconds
      },
    });
  } catch (error) {
    console.error("Generate PDF token error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate download token",
    });
  }
};

export const abandonTest = async (req, res) => {
  try {
    const { courseId, difficulty, completedDifficulties } = req.body;
    const userId = req.user.userId;

    // calculate deduction based on where they quit
    const pointsService = (await import("../services/pointsService.js"))
      .default;
    let deduction = 0;

    if (!completedDifficulties || completedDifficulties.length === 0) {
      // quit at first difficulty
      deduction = pointsService.POINTS_CONFIG.DEDUCTION_EASY;
    } else if (
      completedDifficulties.includes("Easy") &&
      !completedDifficulties.includes("Medium")
    ) {
      // quit easy
      deduction = pointsService.POINTS_CONFIG.DEDUCTION_MEDIUM;
    } else if (completedDifficulties.includes("Medium")) {
      // quit medium or during hard
      deduction = pointsService.POINTS_CONFIG.DEDUCTION_HARD;
    }

    // record abandoned test
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

    // deduct points
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

// get user's test history
export const getTestHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const courseId = req.query.course;

    // build filter query
    let filterQuery = { user: userId };
    if (courseId) {
      filterQuery.course = courseId;
    }

    const testHistory = await TestResult.find(filterQuery)
      .populate("course", "name")
      .select("-questions") // exclude detailed questions for list view
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

// get user performance statistics
export const getPerformanceStats = async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log(`Fetching performance stats for user: ${userId}`);

    // early return for users with no tests
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

    // overall statistics
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

    // course-wise performance
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

    // difficulty-wise performance
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

    // recent performance trend (last 10 tests)
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

// get leaderboard for a course
export const getLeaderboard = async (req, res) => {
  try {
    const { courseId } = req.params;
    const difficulty = req.query.difficulty || "all";
    const limit = parseInt(req.query.limit) || 100;

    // validate course exists
    const Course = (await import("../Models/Course.js")).default;
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // get leaderboard from service (handles redis + mongodb fallback)
    const leaderboard = await leaderboardService.getLeaderboard(
      courseId,
      difficulty,
      limit
    );

    // get current user's rank if authenticated
    let userRank = null;
    if (req.user?.userId) {
      userRank = await leaderboardService.getUserRank(
        req.user.userId,
        courseId,
        difficulty
      );
    }

    // handle all edge cases
    if (!leaderboard || leaderboard.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No test results yet for this course and difficulty level",
        data: {
          leaderboard: [],
          userRank: null,
          total: 0,
          isEmpty: true, // flag for frontend
        },
      });
    }

    // success with data
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
