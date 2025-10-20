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