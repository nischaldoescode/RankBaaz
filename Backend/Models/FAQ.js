import mongoose from 'mongoose';
import connection2 from '../Config/mongodb2.js';

const faqSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'Question is required'],
    trim: true,
  },
  answer: {
    type: String,
    required: [true, 'Answer is required'],
    trim: true,
  },
  // REMOVED category field completely
  order: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },
}, {
  timestamps: true,
});

// CHANGED INDEX - removed category
faqSchema.index({ order: 1, isActive: 1 });

const FAQ = connection2.model('FAQ', faqSchema);

export default FAQ;