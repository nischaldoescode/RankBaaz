import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
      match: [
        /^[a-z0-9_]+$/,
        "Username can only contain lowercase letters, numbers, and underscores",
      ],
    },
    age: {
      type: Number,
      required: true,
      min: 10,
      max: 100,
    },
    gender: {
      type: String,
      required: true,
      enum: ["Male", "Female", "Other"],
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      code: String,
      expiresAt: Date,
      used: {
        type: Boolean,
        default: false,
      },
    },
    totalTestsTaken: {
      type: Number,
      default: 0,
    },
    totalScore: {
      type: Number,
      default: 0,
    },
    lastLoginAt: {
      type: Date,
      default: Date.now,
    },
    subscribeNewsletter: {
      type: Boolean,
      default: false,
    },
    nameVisibility: {
      type: String,
      enum: ["private", "public"],
      default: "private",
    },
    points: {
      type: Number,
      default: 0,
      min: 0,
    },
    badges: [
      {
        type: {
          type: String,
          enum: ["leaderboard_legend", "perfectionist", "speed_demon"],
        },
        earnedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    stats: {
      testsCompleted: { type: Number, default: 0 },
      questionsAnswered: { type: Number, default: 0 },
      averagePercentile: { type: Number, default: 0 },
      fastestTime: { type: Number, default: null },
      leaderboardDaysOnTop: { type: Number, default: 0 },
      lastTopPosition: Date,
      lastKnownRank: { type: Number, default: null },
      rankLastUpdated: { type: Date, default: null },
    },
  },

  {
    timestamps: true,
  }
);

// userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ points: -1 });
userSchema.index({ "stats.leaderboardDaysOnTop": -1 });
userSchema.index({ 'stats.testsCompleted': -1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ name: 'text', email: 'text', username: 'text' });

export default mongoose.model("User", userSchema);
