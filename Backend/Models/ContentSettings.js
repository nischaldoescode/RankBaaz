/**
 * defines the content settings database schema, validation rules, indexes, and document relationships
 *
 * @file backend/models/contentsettings.js
 * @module backend/models/contentsettings
 * @exports mongoose model used by controllers and services
 */

import mongoose from 'mongoose';
import connection2 from '../Config/mongodb2.js';

const defaultHomeStoryChapters = [
  {
    kicker: 'Read',
    title: 'Course notes that stay usable',
    description:
      "Open a lesson, keep the teacher's context nearby, and revise from material that still feels usable after the first read.",
    image: {
      url: null,
      publicId: null,
      fallbackSrc: '/images/home-course-notes.webp',
      alt: 'Course notes and teacher context in the Vidhgrow study flow',
    },
    imageName: 'home-course-notes.webp',
  },
  {
    kicker: 'Practice',
    title: 'Tests with real feedback',
    description:
      'Take a timed attempt, review the weak spots, and understand what changed before moving to the next round.',
    image: {
      url: null,
      publicId: null,
      fallbackSrc: '/images/home-practice-test.webp',
      alt: 'Timed practice test with useful feedback',
    },
    imageName: 'home-practice-test.webp',
  },
  {
    kicker: 'Review',
    title: 'Progress you can read',
    description:
      'See scores, rank movement, attempts, and course progress in a way that helps you decide what to do next.',
    image: {
      url: null,
      publicId: null,
      fallbackSrc: '/images/home-progress-review.webp',
      alt: 'Readable score and progress review after practice',
    },
    imageName: 'home-progress-review.webp',
  },
];

const defaultAboutStoryPoints = [
  {
    icon: 'Target',
    title: 'Mission',
    description:
      'Make serious practice easier to begin, easier to repeat, and easier to understand after every attempt.',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    icon: 'Heart',
    title: 'Values',
    description:
      'Keep the product accessible, readable, and useful for students and teachers doing real work.',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
  },
  {
    icon: 'Users',
    title: 'Community',
    description:
      'Support learners who want structured courses, calm testing, and feedback they can act on.',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
];

const defaultAboutStats = [
  { value: 'Teacher-led', label: 'Courses and notes' },
  { value: 'Timed', label: 'Practice tests' },
  { value: 'Clear', label: 'Progress reports' },
];

const contentSettingsSchema = new mongoose.Schema({
  // site identity
  siteName: {
    type: String,
    default: 'Vidhgrow',
    required: true,
  },
  siteTagline: {
    type: String,
    default: 'Courses, practice tests, and clear progress',
  },
  siteDescription: {
    type: String,
    default: 'Learn from courses, attempt timed tests, review your score reports, and see what to study next.',
  },

  // logo & branding
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


  // hero section
  herotitle: {
    type: string,
    default: 'learn clearly. practice with purpose.',
  },
  herohighlight: {
    type: string,
    default: 'keep progress visible',
  },
  herodescription: {
    type: string,
    default: 'vidhgrow brings teacher-led courses, exam-style tests, and progress reports into one calm workspace, so every attempt points to the next useful step.',
  },

  // home page story section
  homestoryeyebrow: {
    type: string,
    default: 'how the work moves',
  },
  homestorytitle: {
    type: string,
    default: 'a study rhythm that feels easy to return to.',
  },
  homestoryhighlightedtext: {
    type: string,
    default: 'a study rhythm',
  },
  homestorydescription: {
    type: string,
    default:
      'learn from the course, test the idea, then use the result to choose the next revision. the page stays quiet, but the work keeps moving.',
  },
  homestorychapters: [{
    kicker: {
      type: string,
      default: '',
    },
    title: {
      type: string,
      default: '',
    },
    description: {
      type: string,
      default: '',
    },
    image: {
      url: {
        type: string,
        default: null,
      },
      publicid: {
        type: string,
        default: null,
      },
      fallbacksrc: {
        type: string,
        default: null,
      },
      alt: {
        type: string,
        default: '',
      },
    },
    imagename: {
      type: string,
      default: '',
    },
  }],
  // stats section for home page
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

  // chart configuration for home page
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

  // features section for home page
  featuresTitle: {
    type: String,
    default: 'A quieter way to keep moving',
  },
  featuresDescription: {
    type: String,
    default: 'Study material, test attempts, and progress signals sit close together without turning the page into noise.',
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

  // about page values section
  aboutHeroEyebrow: {
    type: String,
    default: '',
  },
  aboutHeroTitle: {
    type: String,
    default: 'A calmer place for courses, tests, and the next revision.',
  },
  aboutHeroDescription: {
    type: String,
    default:
      'Vidhgrow is built for learners who want structure without noise: course material, timed practice, teacher context, and progress signals in one focused workspace.',
  },
  aboutHeroImage: {
    url: {
      type: String,
      default: null,
    },
    publicId: {
      type: String,
      default: null,
    },
    fallbackSrc: {
      type: String,
      default: '/images/about-learning-workspace.webp',
    },
    alt: {
      type: String,
      default: 'Students and teachers reviewing course progress together',
    },
  },
  aboutValuesEyebrow: {
    type: String,
    default: 'What drives us',
  },
  aboutValuesTitle: {
    type: String,
    default: 'Useful tools for real study habits.',
  },
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

  // about page features section
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

  // about page stats
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

  // cta section
  ctaTitle: {
    type: String,
    default: 'Start small. Keep the work visible.',
  },
  ctaDescription: {
    type: String,
    default: 'Create your free account and keep course progress, attempts, score reports, and next steps in one place.',
  },
  aboutCtaTitle: {
    type: String,
    default: 'Start with one course. Keep the work visible.',
  },
  aboutCtaDescription: {
    type: String,
    default:
      'Browse available courses or create an account to keep attempts, reports, and revision steps together.',
  },

  // colors & theme
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

  // background elements
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

  // metadata
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

// ensure only one settings document exists
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
        { icon: 'Brain', title: 'Course learning', description: 'Follow organized lessons and teacher-created material before you test yourself.' },
        { icon: 'Target', title: 'Focused practice tests', description: 'Attempt timed tests and review where your answers were strong or weak.' },
        { icon: 'Trophy', title: 'Progress that stays visible', description: 'Track results, badges, and leaderboard movement as you keep practicing.' },
      ],
      homeStoryChapters: defaultHomeStoryChapters,
      aboutValues: defaultAboutStoryPoints,
      aboutFeatures: [
        { icon: 'BookOpen', title: 'Comprehensive Content', description: 'Extensive question banks across multiple subjects and difficulty levels' },
        { icon: 'Zap', title: 'Instant Feedback', description: 'Real-time performance analytics and detailed explanations' },
        { icon: 'TrendingUp', title: 'Progress Tracking', description: 'Visual dashboards to monitor your improvement over time' },
        { icon: 'Shield', title: 'Secure Platform', description: 'Your data is protected with industry-standard security' },
        { icon: 'Award', title: 'Gamification', description: 'Earn badges and compete on leaderboards to stay motivated' },
        { icon: 'Users', title: 'Community Support', description: 'Connect with peers and learn together' },
      ],
      aboutStats: defaultAboutStats,
    });
  } else {
    let needsSave = false;

    if (!settings.homeStoryChapters?.length) {
      settings.homeStoryChapters = defaultHomeStoryChapters;
      needsSave = true;
    }

    if (!settings.aboutHeroImage?.fallbackSrc) {
      settings.aboutHeroImage = {
        ...(settings.aboutHeroImage || {}),
        fallbackSrc: '/images/about-learning-workspace.webp',
        alt:
          settings.aboutHeroImage?.alt ||
          'Students and teachers reviewing course progress together',
      };
      needsSave = true;
    }

    if (
      !settings.aboutValues?.length ||
      settings.aboutValues.some((value) => /^Our\s/i.test(value.title || ''))
    ) {
      settings.aboutValues = defaultAboutStoryPoints;
      needsSave = true;
    }

    if (
      !settings.aboutStats?.length ||
      settings.aboutStats.some((stat) => /50,?000|1m\+|95%/i.test(stat.value || ''))
    ) {
      settings.aboutStats = defaultAboutStats;
      needsSave = true;
    }

    if (needsSave) {
      await settings.save();
    }
  }
  return settings;
};

const ContentSettings = connection2.model('ContentSettings', contentSettingsSchema);

export default ContentSettings;
