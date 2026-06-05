/**
 * defines the course database schema, validation rules, indexes, and document relationships
 *
 * @file backend/models/course.js
 * @module backend/models/course
 * @exports mongoose model used by controllers and services
 */

import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      minlength: 5,
      maxlength: 800,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: false, // making it optional
    },
    image: {
      public_id: String,
      url: String,
    },
    difficulties: [
      {
        name: {
          type: String,
          required: true,
          enum: ["Easy", "Medium", "Hard"],
        },
        marksPerQuestion: {
          type: Number,
          required: true,
          min: 1,
          max: 100,
        },
        maxQuestions: {
          type: Number,
          required: true,
          min: 1,
        },
        totalMarks: {
          type: Number,
          required: true,
          min: 1,
        },
        timerSettings: {
          type: {
            minTime: {
              type: Number,
              required: true,
              min: 1,
            },
            maxTime: {
              type: Number,
              required: true,
            },
          },
          required: true,
          validate: {
            validator: function (timerSettings) {
              return timerSettings.maxTime >= timerSettings.minTime;
            },
            message: "Max time must be greater than or equal to min time",
          },
        },
      },
    ],
    maxQuestionsPerTest: {
      type: Number,
      default: 20,
      min: 1,
    },
    isPaid: {
      type: Boolean,
      default: false,
      required: true,
    },
    price: {
      type: Number,
      min: 0,
      default: 0,
      validate: {
        validator: function (value) {
          // if course is paid, price greater than 0
          if (this.isPaid && value <= 0) {
            return false;
          }
          return true;
        },
        message: "Price must be greater than 0 for paid courses",
      },
    },
    currency: {
      type: String,
      default: "INR",
      enum: ["INR", "NPR"],
    },
    videoContent: {
      type: {
        type: String,
        enum: ["none", "course", "difficulty"],
        default: "none",
      },
      // course-level videos (max 2 links)
      courseVideo: {
        links: {
          type: [
            {
              url: {
                type: String,
                required: true,
                trim: true,
              },
              platform: {
                type: String,
                enum: ["youtube", "vimeo", "dailymotion", "wistia", "other"],
                required: true,
              },
              title: {
                type: String,
                trim: true,
                default: "Video Lesson",
              },
            },
          ],
          validate: {
            validator: function (links) {
              return links.length <= 2;
            },
            message: "Maximum 2 video links allowed for course video",
          },
        },
      },
      // difficulty-level videos (max 2 links per difficulty)
      difficultyVideos: [
        {
          difficulty: {
            type: String,
            enum: ["Easy", "Medium", "Hard"],
            required: true,
          },
          links: {
            type: [
              {
                url: {
                  type: String,
                  required: true,
                  trim: true,
                },
                platform: {
                  type: String,
                  enum: ["youtube", "vimeo", "dailymotion", "wistia", "other"],
                  required: true,
                },
                title: {
                  type: String,
                  trim: true,
                  default: "Video Lesson",
                },
              },
            ],
            validate: {
              validator: function (links) {
                return links.length <= 2;
              },
              message: "Maximum 2 video links allowed per difficulty level",
            },
          },
        },
      ],
    },
    hasPdfExport: {
      type: Boolean,
      default: false,
      required: true,
    },

    activeCouponsCount: {
      type: Number,
      default: 0,
    },
    totalQuestions: {
      type: Number,
      default: 0,
    },
    questions: [
      {
        difficulty: {
          type: String,
          required: true,
          enum: ["Easy", "Medium", "Hard"],
        },
        question: {
          type: String,
          required: true,
          trim: true,
          minlength: 2,
          maxlength: 1500,
        },
        numberOfOptions: {
          type: Number,
          default: 0,
        },
        image: {
          public_id: String,
          url: String,
        },
        questionType: {
          type: String,
          required: true,
          enum: ["multiple", "single", "truefalse"],
          default: "multiple",
        },
        options: [
          {
            type: String,
            trim: true,
          },
        ],
        correctAnswer: {
          type: mongoose.Schema.Types.Mixed, // it can be number (index) or string (direct answer)
          required: true,
        },
        explanation: {
          type: String,
          required: true,
          trim: true,
          minlength: 10,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },

    // null means the course was created by admin
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      default: null,
    },
    // approval flow for teacher-created courses
    approvalStatus: {
      type: String,
      enum: ["approved", "pending", "rejected"],
      default: "approved", // admin-created = auto-approved
    },
    approvalNote: { type: String, default: null },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    approvedAt: { type: Date, default: null },
    // geo restriction: null = global, "india" = india only, "nepal" = nepal only
    geoRestriction: {
      type: String,
      enum: ["india", "nepal", null],
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// courseschema.js
courseSchema.index({ category: 1, isActive: 1 });
courseSchema.index({ "questions.isActive": 1, "questions.difficulty": 1 });
courseSchema.index({ isActive: 1 });

courseSchema.index(
  {
    _id: 1,
    "questions._id": 1,
    "questions.questionType": 1,
    "questions.correctAnswer": 1,
  },
  {
    name: "check_answer_optimized",
    background: true,
  },
);

// video validation middleware
courseSchema.pre("save", function (next) {
  // only validate video content for paid courses
  if (this.isPaid && this.videoContent) {
    const { type, courseVideo, difficultyVideos } = this.videoContent;

    // validate course video links
    if (type === "course" && courseVideo?.links) {
      const linkCount = courseVideo.links.length;

      if (linkCount > 2) {
        return next(
          new Error("Maximum 2 video links allowed for course video"),
        );
      }

      if (linkCount === 0) {
        return next(
          new Error(
            "At least 1 video link required when video type is 'course'",
          ),
        );
      }
    }

    // validate difficulty video links
    if (type === "difficulty" && difficultyVideos) {
      for (const diffVideo of difficultyVideos) {
        const linkCount = diffVideo.links?.length || 0;

        if (linkCount > 2) {
          return next(
            new Error(
              `Maximum 2 video links allowed for ${diffVideo.difficulty} difficulty`,
            ),
          );
        }

        if (linkCount === 0) {
          return next(
            new Error(
              `At least 1 video link required for ${diffVideo.difficulty} difficulty`,
            ),
          );
        }
      }
    }
  }

  // if changing from paid to free, remove video content
  if (!this.isPaid && this.videoContent && this.videoContent.type !== "none") {
    console.log(
      `Course ${this._id} changed to free - removing video content`,
    );
    this.videoContent = {
      type: "none",
      courseVideo: { links: [] },
      difficultyVideos: [],
    };
  }

  next();
});
export default mongoose.model("Course", courseSchema);
