import { createIndexes } from '../database/index.js';
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const runMigration = async () => {
  try {
    // Connect to your database
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log("Running index creation migration...");
    await createIndexes();
    
    console.log("Migration completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

runMigration();