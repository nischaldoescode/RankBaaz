/**
 * keeps the teacher payout model focused and readable.
 */
import mongoose from "mongoose";

/**
 * tracks payout records for teachers
 */
const teacherPayoutSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    amount: { type: Number, required: true },
    platformFee: { type: Number, required: true },
    teacherAmount: { type: Number, required: true },
    currency: { type: String, enum: ["INR", "NPR"], required: true },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["razorpay", "esewa", "khalti", "manual"],
    },
    transactionId: { type: String, default: null },
    note: { type: String, default: null },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("TeacherPayout", teacherPayoutSchema);