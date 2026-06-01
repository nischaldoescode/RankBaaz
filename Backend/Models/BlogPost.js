import mongoose from "mongoose";

const encryptedPayloadSchema = new mongoose.Schema(
  {
    algorithm: { type: String, default: "aes-256-gcm" },
    keyVersion: { type: String, default: "v1" },
    iv: { type: String, required: true },
    tag: { type: String, required: true },
    data: { type: String, required: true },
  },
  { _id: false },
);

const blogPostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 140,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 5,
      maxlength: 160,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid blog slug"],
    },
    excerpt: {
      type: String,
      trim: true,
      maxlength: 320,
      default: "",
    },
    status: {
      type: String,
      enum: ["draft", "scheduled", "published", "archived"],
      default: "draft",
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BlogAuthor",
      index: true,
    },
    coverImage: {
      url: { type: String, trim: true, default: "" },
      public_id: { type: String, trim: true, default: "" },
      resource_type: { type: String, trim: true, default: "image" },
      alt: { type: String, trim: true, maxlength: 180, default: "" },
      placement: {
        type: String,
        enum: ["hero", "inline", "wide"],
        default: "hero",
      },
    },
    contentEncrypted: {
      type: encryptedPayloadSchema,
      required: true,
    },
    contentHash: { type: String, required: true },
    plainTextPreview: { type: String, trim: true, maxlength: 500, default: "" },
    h1: { type: String, trim: true, maxlength: 140, default: "" },
    wordCount: { type: Number, default: 0, min: 0 },
    readingTimeMinutes: { type: Number, default: 1, min: 1 },
    tags: [{ type: String, trim: true, lowercase: true, maxlength: 40 }],
    category: { type: String, trim: true, maxlength: 60, default: "learning" },
    seo: {
      metaTitle: { type: String, trim: true, maxlength: 70, default: "" },
      metaDescription: { type: String, trim: true, maxlength: 170, default: "" },
      keywords: [{ type: String, trim: true, lowercase: true, maxlength: 60 }],
      canonicalUrl: { type: String, trim: true, default: "" },
      robots: {
        index: { type: Boolean, default: true },
        follow: { type: Boolean, default: true },
        maxSnippet: { type: Number, default: -1 },
        maxImagePreview: {
          type: String,
          enum: ["none", "standard", "large"],
          default: "large",
        },
      },
    },
    social: {
      shareTitle: { type: String, trim: true, maxlength: 90, default: "" },
      shareDescription: {
        type: String,
        trim: true,
        maxlength: 220,
        default: "",
      },
    },
    publishedAt: { type: Date, default: null, index: true },
    scheduledFor: { type: Date, default: null },
    lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  { timestamps: true },
);

blogPostSchema.index({ status: 1, publishedAt: -1 });
blogPostSchema.index({ tags: 1, status: 1 });
blogPostSchema.index({ title: "text", excerpt: "text", plainTextPreview: "text" });

export default mongoose.model("BlogPost", blogPostSchema);
