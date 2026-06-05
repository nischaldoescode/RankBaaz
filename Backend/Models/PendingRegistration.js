/**
 * defines the pending registration database schema, validation rules, indexes, and document relationships
 *
 * @file backend/models/pendingregistration.js
 * @module backend/models/pendingregistration
 * @exports mongoose model used by controllers and services
 */

import mongoose from "mongoose";

const pendingRegistrationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  name: String,
  password: String,
  age: Number,
  gender: String,
  dateOfBirth: Date,
  subscribeNewsletter: Boolean,
  otp: {
    code: String,
    expiresAt: Date,
  },
  otpVerified: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 900, // we will performmm autoo-deletion 15 minutes using ttl index
  },
});

export default mongoose.model("PendingRegistration", pendingRegistrationSchema);