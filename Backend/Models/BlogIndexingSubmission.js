/**
 * keeps the blog indexing submission model focused and readable.
 */
import mongoose from "mongoose";

const blogIndexingSubmissionSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ["indexnow"],
      required: true,
      index: true,
    },
    kind: {
      type: String,
      enum: ["url", "sitemap"],
      default: "url",
      index: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
    },
    urlHash: {
      type: String,
      required: true,
      index: true,
    },
    batchId: {
      type: String,
      required: true,
      index: true,
    },
    host: {
      type: String,
      trim: true,
      maxlength: 180,
      default: "",
    },
    sitemapUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: "",
    },
    status: {
      type: String,
      enum: ["success", "failed", "skipped"],
      required: true,
      index: true,
    },
    responseStatus: {
      type: Number,
      default: null,
    },
    responseBody: {
      type: String,
      maxlength: 4000,
      default: "",
    },
    errorMessage: {
      type: String,
      maxlength: 1000,
      default: "",
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true },
);

blogIndexingSubmissionSchema.index({ provider: 1, urlHash: 1, status: 1, submittedAt: -1 });
blogIndexingSubmissionSchema.index({ provider: 1, batchId: 1, submittedAt: -1 });

export default mongoose.model("BlogIndexingSubmission", blogIndexingSubmissionSchema);
