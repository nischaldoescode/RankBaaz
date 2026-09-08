/**
 * repairs legacy negative point balances with one guarded database update
 *
 * @file backend/scripts/repair-negative-points.js
 * @module backend/scripts/repair-negative-points
 * @returns {promise<void>} resolves after invalid balances are clamped to zero
 */

import "dotenv/config";
import mongoose from "mongoose";
import User from "../Models/User.js";

const run = async () => {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_POINTS_REPAIR !== "true"
  ) {
    throw new Error("set ALLOW_POINTS_REPAIR=true for a production point repair");
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error("MONGODB_URI is required");

  await mongoose.connect(mongoUri);

  try {
    const result = await User.updateMany(
      { points: { $lt: 0 } },
      { $set: { points: 0 } },
    );

    console.log(`repaired ${result.modifiedCount || 0} negative point balances`);
  } finally {
    await mongoose.disconnect();
  }
};

run().catch(async (error) => {
  console.error("negative point repair failed:", error.message);
  try {
    await mongoose.disconnect();
  } catch {
    // the connection may not have been established
  }
  process.exitCode = 1;
});
