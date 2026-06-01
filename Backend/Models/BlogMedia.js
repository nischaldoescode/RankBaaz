import mongoose from "mongoose";

const blogMediaSchema = new mongoose.Schema(
  {
    public_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    url: { type: String, required: true, trim: true },
    resource_type: {
      type: String,
      enum: ["image", "video", "raw"],
      default: "image",
      index: true,
    },
    type: { type: String, trim: true, default: "upload" },
    purpose: { type: String, trim: true, maxlength: 60, default: "blog-media" },
    sessionId: { type: String, trim: true, maxlength: 120, index: true, default: "" },
    originalFilename: { type: String, trim: true, maxlength: 180, default: "" },
    bytes: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["pending", "attached", "deleted"],
      default: "pending",
      index: true,
    },
    attachedTo: {
      kind: {
        type: String,
        enum: ["post", "author", ""],
        default: "",
      },
      id: { type: mongoose.Schema.Types.ObjectId, default: null },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      index: true,
    },
    attachedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

blogMediaSchema.index({ status: 1, createdAt: 1 });
blogMediaSchema.index({ "attachedTo.kind": 1, "attachedTo.id": 1 });

export default mongoose.model("BlogMedia", blogMediaSchema);
