import mongoose from "mongoose";

/**
 * stores blocked ip addresses with optional expiry
 */
const ipBlockSchema = new mongoose.Schema(
  {
    ip: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    reason: {
      type: String,
      default: "admin action",
    },
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    // null = permanent
    expiresAt: {
      type: Date,
      default: null,
    },
    // soft reference — user may be deleted
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// auto-expire documents using mongodb ttl index
// documents with null expiresAt are NOT expired (ttl only fires when field exists)
ipBlockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

const IpBlock = mongoose.model("IpBlock", ipBlockSchema);
export default IpBlock;