/**
 * stores durable teacher portal notifications created by trusted backend events
 *
 * @file backend/models/teachernotification.js
 * @module backend/models/teachernotification
 * @exports mongoose model used by teacher review and account status flows
 */

import mongoose from "mongoose";

/**
 * defines a teacher-facing notification that survives refreshes and new sessions
 *
 * @param {mongoose.Types.ObjectId} teacher teacher account that owns the notification
 * @param {string} type stable event type used by the teacher portal
 * @param {string} title short heading shown in the notification surface
 * @param {string} message human readable update shown to the teacher
 * @param {string} link dashboard tab or route the notification should open
 * @param {object} metadata small non-sensitive event data for the frontend
 * @returns {mongoose.Schema} teacher notification schema
 */
const teacherNotificationSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["documents_requested", "documents_verified", "documents_rejected"],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    link: {
      type: String,
      default: "documents",
      trim: true,
      maxlength: 80,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

teacherNotificationSchema.index({ teacher: 1, createdAt: -1 });
teacherNotificationSchema.index({ teacher: 1, readAt: 1 });

export default mongoose.model("TeacherNotification", teacherNotificationSchema);
