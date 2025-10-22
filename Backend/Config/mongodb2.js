import mongoose from "mongoose";
import dotenv from "dotenv";

// Ensure environment variables are loaded
dotenv.config();

const MONGODB_URI_2 = process.env.MONGODB_URI_2;

if (!MONGODB_URI_2) {
  console.error("Please check your .env file");
  process.exit(1);
}

const connection2 = mongoose.createConnection(MONGODB_URI_2, {
  maxPoolSize: 100, // Increased for production
  minPoolSize: 10, // Maintain minimum connections
  serverSelectionTimeoutMS: 10000, // Increased timeout
  socketTimeoutMS: 60000, // Increased socket timeout
  connectTimeoutMS: 15000, // Add connection timeout
  bufferCommands: false,
  retryWrites: true,
  retryReads: true,
  // Add these for better connection management
  maxIdleTimeMS: 60000,
});

connection2.on("connected", () => {
  console.log("MongoDB 2 (Content DB) connection successful");
});

connection2.on("error", (err) => {
  console.error("MongoDB 2 connection error:", err);
});

connection2.on("disconnected", () => {
  console.log("MongoDB 2 disconnected");
});

export default connection2;
