import mongoose from "mongoose";

const courseReviewSchema = new mongoose.Schema(
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
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    testResult: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TestResult",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    feedback: {
      type: String,
      trim: true,
      minlength: 10,
      maxlength: 800,
      required: true,
    },
    status: {
      type: String,
      enum: ["approved", "pending", "rejected"],
      default: "approved",
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    evaluation: {
      badges: [{ type: String, trim: true }],
      quality: {
        type: String,
        enum: ["brief", "helpful", "detailed"],
        default: "brief",
      },
      evaluatedAt: { type: Date, default: Date.now },
    },
  },
  { timestamps: true },
);

courseReviewSchema.index({ teacher: 1, status: 1, createdAt: -1 });
courseReviewSchema.index({ course: 1, status: 1, createdAt: -1 });
courseReviewSchema.index({ user: 1, testResult: 1 }, { unique: true });

export default mongoose.model("CourseReview", courseReviewSchema);
