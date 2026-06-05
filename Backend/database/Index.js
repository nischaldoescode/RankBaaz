/**
 * connects backend database startup, connection errors, and shared persistence configuration
 *
 * @file backend/database/index.js
 * @module backend/database/index
 * @exports connection helpers used during backend startup
 */

import Course from "../Models/Course.js";
import Category from "../Models/Category.js";
import TestResult from "../Models/TestResult.js";
import mongoose from "mongoose";
// this to your database setup or migration file
export const createIndexes = async () => {
  try {
    console.log("Creating database indexes...");

    // wait for connection to be ready
    if (mongoose.connection.readyState !== 1) {
      console.log("Waiting for database connection...");
      await new Promise(resolve => mongoose.connection.once('open', resolve));
    }

    // course indexes (skip name index as it's already unique in schema)
    await Course.collection.createIndex({ isActive: 1 }, { background: true });
    await Course.collection.createIndex({ category: 1 }, { background: true });
    await Course.collection.createIndex({ createdAt: -1 }, { background: true });
    await Course.collection.createIndex({ "questions.difficulty": 1 }, { background: true });
    await Course.collection.createIndex({ "questions.isActive": 1 }, { background: true });

    // category indexes (skip name index as it's already unique in schema)
    await Category.collection.createIndex({ isActive: 1 }, { background: true });

    // testresult indexes (these don't conflict)
    await TestResult.collection.createIndex({ course: 1 }, { background: true });
    await TestResult.collection.createIndex({ user: 1 }, { background: true });
    await TestResult.collection.createIndex({ createdAt: -1 }, { background: true });
    await TestResult.collection.createIndex({ difficulty: 1 }, { background: true });

    console.log("Database indexes created successfully");
    return true;
  } catch (error) {
    console.error("Error creating indexes:", error);
    return false;
  }
};