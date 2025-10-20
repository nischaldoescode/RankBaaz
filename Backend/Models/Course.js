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
      required: false, // Making it optional
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
          // If course is paid, price must be greater than 0
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
      enum: ["INR"],
    },
    videoContent: {
      type: {
        type: String,
        enum: ["none", "course", "difficulty"],
        default: "none",
      },
      // COURSE-LEVEL VIDEOS (max 2 links)
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
      // DIFFICULTY-LEVEL VIDEOS (max 2 links per difficulty)
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
          type: mongoose.Schema.Types.Mixed, // It can be Number (index) or String (direct answer)
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
  },
  {
    timestamps: true,
  }
);

// courseSchema.js
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
  }
);

// Video validation middleware
courseSchema.pre("save", function (next) {
  // Only validate video content for paid courses
  if (this.isPaid && this.videoContent) {
    const { type, courseVideo, difficultyVideos } = this.videoContent;

    // Validate course video links
    if (type === "course" && courseVideo?.links) {
      const linkCount = courseVideo.links.length;

      if (linkCount > 2) {
        return next(
          new Error("Maximum 2 video links allowed for course video")
        );
      }

      if (linkCount === 0) {
        return next(
          new Error(
            "At least 1 video link required when video type is 'course'"
          )
        );
      }
    }

    // Validate difficulty video links
    if (type === "difficulty" && difficultyVideos) {
      for (const diffVideo of difficultyVideos) {
        const linkCount = diffVideo.links?.length || 0;

        if (linkCount > 2) {
          return next(
            new Error(
              `Maximum 2 video links allowed for ${diffVideo.difficulty} difficulty`
            )
          );
        }

        if (linkCount === 0) {
          return next(
            new Error(
              `At least 1 video link required for ${diffVideo.difficulty} difficulty`
            )
          );
        }
      }
    }
  }

  // If changing from paid to free, remove video content
  if (!this.isPaid && this.videoContent && this.videoContent.type !== "none") {
    console.log(
      `[SCHEMA] Course ${this._id} changed to free - removing video content`
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
