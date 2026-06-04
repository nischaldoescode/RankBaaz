/**
 * keeps the teacher model focused and readable.
 */
import mongoose from "mongoose";

/**
 * teacher account schema
 * - invite-only
 * - document verification required access
 * - supports india (razorpay) and nepal (khalti)
 */
const teacherSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Invalid email"],
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: [/^[a-z0-9_]+$/, "Username: lowercase, numbers, underscores only"],
    },
    age: {
      type: Number,
      required: true,
      min: [19, "Must be at least 19 years old"],
      max: 100,
    },
    gender: {
      type: String,
      required: true,
      enum: ["Male", "Female", "Other"],
    },
    bio: { type: String, maxlength: 500, default: "" },
    qualification: { type: String, maxlength: 300, default: "" },
    showQualification: { type: Boolean, default: true },
    profileImage: {
      public_id: String,
      url: String,
    },
    country: {
      type: String,
      required: true,
      enum: ["india", "nepal"],
    },
    // verification documents
    documents: [
      {
        public_id: { type: String, required: true },
        url: { type: String, required: true },
        originalName: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    // document verification status
    documentStatus: {
      type: String,
      enum: ["not_uploaded", "pending", "verified", "rejected"],
      default: "not_uploaded",
    },
    documentRejectionReason: { type: String, default: null },
    documentVerifiedAt: { type: Date, default: null },
    documentVerifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    // whether admin has requested documents
    documentRequested: { type: Boolean, default: false },
    documentRequestedAt: { type: Date, default: null },
    documentRequestNote: { type: String, default: null },

    // access control
    // account is fully blocked until documents verified (when requested)
    accessBlocked: { type: Boolean, default: false },
    accessBlockReason: { type: String, default: null },

    // payment
    paymentDetails: {
      india: {
        accountNumber: { type: String, default: null },
        ifsc: { type: String, default: null },
        accountHolderName: { type: String, default: null },
        bankName: { type: String, default: null },
        upiId: { type: String, default: null },
      },
      nepal: {
        khaltiId: { type: String, default: null },
      },
      verified: { type: Boolean, default: false },
    },

    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false }, // email verified
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    inviteEmailSentAt: { type: Date, default: null },
    // admin can grant/revoke coupon creation permission
    couponAccess: { type: Boolean, default: false },

    revenueSharePercent: { type: Number, default: 80 },
    totalEarnings: { type: Number, default: 0 },
    pendingPayout: { type: Number, default: 0 },
    totalPaidOut: { type: Number, default: 0 },

    lastLoginAt: { type: Date, default: null },
    lastIp: { type: String, default: null },

    otp: {
      code: String,
      expiresAt: Date,
      used: { type: Boolean, default: false },
      purpose: {
        type: String,
        enum: ["signup", "forgot_password"],
        default: "signup",
      },
    },
  },
  { timestamps: true },
);
teacherSchema.index({ country: 1 });
teacherSchema.index({ documentStatus: 1 });
teacherSchema.index({ isActive: 1 });
teacherSchema.index({ createdAt: -1 });

export default mongoose.model("Teacher", teacherSchema);
