/**
 * keeps the blog comment model focused and readable.
 */
import mongoose from "mongoose";

const blogCommentSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BlogPost",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BlogComment",
      default: null,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    status: {
      type: String,
      enum: ["visible", "hidden", "removed"],
      default: "visible",
      index: true,
    },
    ipHash: { type: String, default: "" },
    userAgentHash: { type: String, default: "" },
  },
  { timestamps: true },
);

blogCommentSchema.index(
  { post: 1, user: 1, parentComment: 1 },
  {
    unique: true,
    partialFilterExpression: { parentComment: null },
  },
);
blogCommentSchema.index({ post: 1, status: 1, createdAt: -1 });

export default mongoose.model("BlogComment", blogCommentSchema);
