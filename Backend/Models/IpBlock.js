/**
 * keeps the ip block model focused and readable.
 */
import mongoose from "mongoose";

/**
 * stores blocked ip resses with optional expiry
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
    // user may be deleted while the block remains.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// auto-expire documents using mongodb ttl index
// documents with null expiresat are not expired (ttl only fires when field exists)
ipBlockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

const IpBlock = mongoose.model("IpBlock", ipBlockSchema);
export default IpBlock;
