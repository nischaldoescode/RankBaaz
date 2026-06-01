import mongoose from "mongoose";

const blogAuthorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 2,
      maxlength: 90,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid author slug"],
    },
    title: { type: String, trim: true, maxlength: 120, default: "" },
    bio: { type: String, trim: true, maxlength: 600, default: "" },
    avatar: {
      url: { type: String, trim: true, default: "" },
      public_id: { type: String, trim: true, default: "" },
      alt: { type: String, trim: true, maxlength: 140, default: "" },
    },
    socialLinks: {
      website: { type: String, trim: true, default: "" },
      twitter: { type: String, trim: true, default: "" },
      linkedin: { type: String, trim: true, default: "" },
      instagram: { type: String, trim: true, default: "" },
    },
    isActive: { type: Boolean, default: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  { timestamps: true },
);

blogAuthorSchema.index({ isActive: 1, name: 1 });

export default mongoose.model("BlogAuthor", blogAuthorSchema);
