import mongoose from "mongoose";

const testResultSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    difficulty: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      validate: {
        validator: function (v) {
          if (typeof v === "string") {
            return ["Easy", "Medium", "Hard", "Multi"].includes(v);
          }
          if (Array.isArray(v)) {
            return v.every((diff) => ["Easy", "Medium", "Hard"].includes(diff));
          }
          return false;
        },
        message:
          "Difficulty must be Easy, Medium, Hard, Multi, or an array of difficulties",
      },
    },
    questions: [
      {
        question: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Question",
          required: true,
        },
        userAnswer: {
          type: String,
          trim: true,
        },
        correctAnswer: {
          type: String,
          required: true,
        },
        difficulty: {
          type: String,
          enum: ["Easy", "Medium", "Hard"],
        },
        isCorrect: {
          type: Boolean,
          required: true,
        },
        marksAwarded: {
          type: Number,
          required: true,
          min: 0,
        },
        timeSpent: {
          type: Number, // in seconds
          default: 0,
        },
        timedOut: {
          type: Boolean,
          default: false,
        },
      },
    ],
    totalQuestions: {
      type: Number,
      required: true,
    },
    correctAnswers: {
      type: Number,
      required: true,
      default: 0,
    },
    wrongAnswers: {
      type: Number,
      required: true,
      default: 0,
    },
    unanswered: {
      type: Number,
      required: true,
      default: 0,
    },
    totalScore: {
      type: Number,
      required: true,
      default: 0,
    },
    maxPossibleScore: {
      type: Number,
      required: true,
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    percentile: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    timeTaken: {
      type: Number,
      required: true,
    },
    testSettings: {
      timerEnabled: Boolean,
      timePerQuestion: Number,
      numberOfQuestions: Number,
      isMultiDifficulty: Boolean,
      difficulties: [String],
      maxTime: Number,
      difficultyResults: [
        {
          difficulty: String,
          totalQuestions: Number,
          correctAnswers: Number,
          wrongAnswers: Number,
          unanswered: Number,
          totalScore: Number,
          maxPossibleScore: Number,
          timeTaken: Number,
          questions: [
            {
              questionId: String,
              userAnswer: String,
              correctAnswer: String,
              isCorrect: Boolean,
              marksAwarded: Number,
              timeSpent: Number,
            },
          ],
        },
      ],
    },
    pointsEarned: {
      type: Number,
      default: 0,
    },
    pointsDeducted: {
      type: Number,
      default: 0,
    },
    wasAbandoned: {
      type: Boolean,
      default: false,
    },
    abandonedAtDifficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard", null],
      default: null,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient and fast databse queries
testResultSchema.index({ user: 1, createdAt: -1 });
testResultSchema.index({ course: 1, createdAt: -1 });
testResultSchema.index({ user: 1, course: 1 });

testResultSchema.index({ course: 1, percentage: -1, timeTaken: 1 });
testResultSchema.index({ user: 1, pointsEarned: -1 });
testResultSchema.index({ _id: 1, user: 1 }, { unique: true });
testResultSchema.index(
  {
    course: 1,
    difficulty: 1,
    createdAt: -1,
  },
  { name: "course_difficulty_date" }
);

testResultSchema.index(
  {
    user: 1,
    percentage: -1,
    createdAt: -1,
  },
  { name: "user_performance" }
);

// Compound index for leaderboard queries
testResultSchema.index(
  {
    course: 1,
    percentage: -1,
    timeTaken: 1,
    createdAt: -1,
  },
  { name: "leaderboard_optimized" }
);
testResultSchema.index({ createdAt: -1, percentage: -1 });

export default mongoose.model("TestResult", testResultSchema);
