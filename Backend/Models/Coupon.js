import mongoose from "mongoose";
import crypto from "crypto";

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 4,
      maxlength: 20,
    },
    hashedCode: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["course", "universal"],
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      // Only required if type is "course"
      required: function () {
        return this.type === "course";
      },
    },
    discount: {
      type: Number,
      enum: [2, 5, 10, 15, 20],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    maxUsage: {
      type: Number,
      default: null, // null means unlimited
    },
    validFrom: {
      type: Date,
      default: Date.now,
    },
    validUntil: {
      type: Date,
      default: null, // null means no expiry
    },
    usedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        usedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    createdBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Method to verify coupon code
couponSchema.methods.verifyCode = function (inputCode) {
  const hashedInput = crypto
    .createHash("sha256")
    .update(inputCode.toUpperCase())
    .digest("hex");
  return this.hashedCode === hashedInput;
};

// Method to check if coupon is valid
couponSchema.methods.isValid = function (userId = null) {
  // Check if active
  if (!this.isActive) return { valid: false, reason: "Coupon is inactive" };

  // Check if expired
  if (this.validUntil && new Date() > this.validUntil) {
    return { valid: false, reason: "Coupon has expired" };
  }

  // Check if not yet valid
  if (this.validFrom && new Date() < this.validFrom) {
    return { valid: false, reason: "Coupon is not yet valid" };
  }

  // Check max usage
  if (this.maxUsage && this.usageCount >= this.maxUsage) {
    return { valid: false, reason: "Coupon usage limit reached" };
  }

  // Check if user already used this coupon
  if (userId && this.usedBy.some((u) => u.user.toString() === userId)) {
    return { valid: false, reason: "You have already used this coupon" };
  }

  return { valid: true };
};

// Indexes
// Indexes
couponSchema.index({ code: 1 }, { unique: true });
couponSchema.index({ hashedCode: 1 }, { unique: true });
couponSchema.index({ type: 1, course: 1 });
couponSchema.index({ isActive: 1, validUntil: 1 });
couponSchema.index({ type: 1, isActive: 1, validUntil: 1 });

export default mongoose.model("Coupon", couponSchema);
