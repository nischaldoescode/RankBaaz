/**
 * configures mongodb for backend startup, shared connections, secrets, and production fallbacks
 *
 * @file backend/config/mongodb.js
 * @module backend/config/mongodb
 * @exports connection helpers used during backend startup
 */

import mongoose from 'mongoose';

const connectDB = async (options = {}) => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, options);
    console.log('MongoDB connection successful');

  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

export default connectDB;