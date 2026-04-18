import mongoose from "mongoose";

/**
 * stores teacher join requests visible in admin panel
 */
const teacherApplicationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    qualification: { type: String, required: true, maxlength: 500 },
    reason: { type: String, required: true, maxlength: 1000 },
    country: { type: String, required: true, enum: ["india", "nepal"] },
    status: {
      type: String,
      enum: ["pending", "invited", "rejected"],
      default: "pending",
    },
    inviteSentAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  { timestamps: true }
);

teacherApplicationSchema.index({ status: 1, createdAt: -1 });
teacherApplicationSchema.index({ email: 1 });

export default mongoose.model("TeacherApplication", teacherApplicationSchema);