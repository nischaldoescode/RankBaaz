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
    expires: 900, // we will performmm autoo-deletion after 15 minutes using TTL index
  },
});

export default mongoose.model("PendingRegistration", pendingRegistrationSchema);