import mongoose from 'mongoose';
import connection2 from '../Config/mongodb2.js';

const contentSettingsSchema = new mongoose.Schema({
  // Site Identity
  siteName: {
    type: String,
    default: 'TestMaster Pro',
    required: true,
  },
  siteTagline: {
    type: String,
    default: 'Master Your Skills with Advanced Testing',
  },
  siteDescription: {
    type: String,
    default: 'Experience personalized learning. Track your progress, identify strengths, and achieve your goals faster than ever.',
  },
  
  // Logo & Branding
  logo: {
    url: {
      type: String,
      default: null,
    },
    publicId: {
      type: String,
      default: null,
    },
  },
  
  
  // Hero Section
  heroTitle: {
    type: String,
    default: 'Master Your Skills with',
  },
  heroHighlight: {
    type: String,
    default: 'Advanced Testing',
  },
  heroDescription: {
    type: String,
    default: 'Experience personalized learning. Track your progress, identify strengths, and achieve your goals faster than ever.',
  },
  
  // Stats Section for Home Page
  stats: [{
    icon: {
      type: String,
      enum: ['Users', 'BookOpen', 'Award', 'TrendingUp'],
      required: true,
    },
    value: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
  }],
  
  // Chart Configuration for Home Page
  chartConfig: {
    type: {
      type: String,
      enum: ['pie', 'bar', 'line', 'doughnut'],
      default: 'pie',
    },
    position: {
      type: String,
      enum: ['left', 'right'],
      default: 'right',
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  
  // Features Section for Home Page
  featuresTitle: {
    type: String,
    default: 'Why Choose TestMaster Pro',
  },
  featuresDescription: {
    type: String,
    default: 'Our platform combines cutting-edge technology with proven learning methodologies to deliver personalized experiences that accelerate your growth.',
  },
  features: [{
    icon: {
      type: String,
      enum: ['Brain', 'Target', 'Trophy', 'Zap', 'Lightbulb', 'Rocket', 'BookOpen', 'TrendingUp', 'Shield', 'Award', 'Users'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
  }],
  
  // About Page Values Section
  aboutValues: [{
    icon: {
      type: String,
      enum: ['Target', 'Heart', 'Users', 'Award', 'Shield', 'Zap'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      default: 'text-blue-500',
    },
    bgColor: {
      type: String,
      default: 'bg-blue-500/10',
    },
  }],
  
  // About Page Features Section
  aboutFeatures: [{
    icon: {
      type: String,
      enum: ['BookOpen', 'Zap', 'TrendingUp', 'Shield', 'Award', 'Users'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
  }],
  
  // About Page Stats
  aboutStats: [{
    value: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
  }],
  
  // CTA Section
  ctaTitle: {
    type: String,
    default: 'Ready to Transform Your Learning Journey?',
  },
  ctaDescription: {
    type: String,
    default: 'Join thousands of learners accelerating their growth with personalized testing.',
  },
  
  // Colors & Theme
  primaryColor: {
    type: String,
    default: '#3b82f6',
  },
  secondaryColor: {
    type: String,
    default: '#10b981',
  },
  accentColor: {
    type: String,
    default: '#f59e0b',
  },
  
  // Background Elements
  backgroundElements: {
    enabled: {
      type: Boolean,
      default: true,
    },
    animationSpeed: {
      type: String,
      enum: ['slow', 'medium', 'fast'],
      default: 'medium',
    },
  },
  
  // Metadata
  isActive: {
    type: Boolean,
    default: true,
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },
}, {
  timestamps: true,
});

// Ensure only one settings document exists
contentSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne({ isActive: true });
  if (!settings) {
    settings = await this.create({
      stats: [
        { icon: 'Users', value: '50K+', label: 'Active Students' },
        { icon: 'BookOpen', value: '1.2K+', label: 'Courses' },
        { icon: 'Award', value: '2.5M+', label: 'Tests Completed' },
        { icon: 'TrendingUp', value: '94%', label: 'Success Rate' },
      ],
      features: [
        { icon: 'Brain', title: 'Smart Learning', description: 'Personalized learning paths adapted to your pace and style.' },
        { icon: 'Target', title: 'Precision Testing', description: 'Expert-designed assessments with detailed analytics.' },
        { icon: 'Trophy', title: 'Achievement System', description: 'Earn badges and track your progress with gamification.' },
      ],
      aboutValues: [
        { icon: 'Target', title: 'Our Mission', description: 'To democratize quality education through innovative testing and personalized learning experiences that empower every student to reach their full potential.', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
        { icon: 'Heart', title: 'Our Values', description: 'We believe in accessibility, excellence, and continuous improvement. Every feature we build is designed with the learner\'s success in mind.', color: 'text-red-500', bgColor: 'bg-red-500/10' },
        { icon: 'Users', title: 'Our Community', description: 'Join thousands of learners worldwide who are transforming their educational journey with data-driven insights and adaptive learning paths.', color: 'text-green-500', bgColor: 'bg-green-500/10' },
      ],
      aboutFeatures: [
        { icon: 'BookOpen', title: 'Comprehensive Content', description: 'Extensive question banks across multiple subjects and difficulty levels' },
        { icon: 'Zap', title: 'Instant Feedback', description: 'Real-time performance analytics and detailed explanations' },
        { icon: 'TrendingUp', title: 'Progress Tracking', description: 'Visual dashboards to monitor your improvement over time' },
        { icon: 'Shield', title: 'Secure Platform', description: 'Your data is protected with industry-standard security' },
        { icon: 'Award', title: 'Gamification', description: 'Earn badges and compete on leaderboards to stay motivated' },
        { icon: 'Users', title: 'Community Support', description: 'Connect with peers and learn together' },
      ],
      aboutStats: [
        { value: '50,000+', label: 'Active Learners' },
        { value: '1M+', label: 'Questions Answered' },
        { value: '95%', label: 'Success Rate' },
        { value: '24/7', label: 'Platform Access' },
      ],
    });
  }
  return settings;
};

const ContentSettings = connection2.model('ContentSettings', contentSettingsSchema);

export default ContentSettings;