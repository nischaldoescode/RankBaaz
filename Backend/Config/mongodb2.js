import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

const MONGODB_URI_2 = process.env.MONGODB_URI_2;

if (!MONGODB_URI_2) {
  console.error('Please check your .env file');
  process.exit(1);
}

const connection2 = mongoose.createConnection(MONGODB_URI_2, {
  maxPoolSize: 50,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferCommands: false,
});

connection2.on('connected', () => {
  console.log('MongoDB 2 (Content DB) connection successful');
});

connection2.on('error', (err) => {
  console.error('MongoDB 2 connection error:', err);
});

connection2.on('disconnected', () => {
  console.log('MongoDB 2 disconnected');
});

export default connection2;