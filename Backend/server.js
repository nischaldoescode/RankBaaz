import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import connectDB from "./Config/mongodb.js";
import { v2 as cloudinary } from "cloudinary";
import redisClient from "./Config/redis.js";
import fileUpload from "express-fileupload";
import mongoose from "mongoose";
import ioredisRatelimit from "ioredis-ratelimit";
// Import routes
import authRoutes from "./Routes/authRoutes.js";
import courseRoutes from "./Routes/courseRoutes.js";
import testRoutes from "./Routes/testRoutes.js";
import adminRoutes from "./Routes/adminRoutes.js";
import profileRoutes from "./Routes/profileRoutes.js";
import connection2 from "./Config/mongodb2.js";
import contentRoutes from "./Routes/contentRoutes.js";
import paymentRoutes from "./Routes/paymentRoutes.js";
import couponRoutes from "./Routes/couponRoutes.js";
// Load environment variables
dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});
// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

const mongoOptions = {
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
  compressors: ["zlib"], // Enable compression
};

// we will await for the Data base connection
await connectDB(mongoOptions);

try {
  await connection2.asPromise();
  console.log("Content database initialized successfully");
} catch (error) {
  console.error("Content database initialization failed:", error);
  process.exit(1);
}

// Create rate limiter functions using ioredis-ratelimit
const createRateLimiter = (options) => {
  const limiter = ioredisRatelimit({
    client: redisClient,
    key: options.keyFn || ((req) => `ratelimit:${options.prefix}:${req.ip}`),
    limit: options.max,
    duration: options.windowMs,
    mode: "binary",
  });

  console.log(
    `Rate limiter '${options.prefix}' initialized - Max: ${options.max} requests per ${options.windowMs / 1000}s`
  );

  return async (req, res, next) => {
    if (options.skip && options.skip(req)) {
      return next();
    }

    try {
      await limiter(req);
      next();
    } catch (error) {
      return res.status(429).json(options.message);
    }
  };
};

// Rate limiting
const limiter = createRateLimiter({
  prefix: "general",
  windowMs: 20 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 200 : 1000,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
  skip: (req) => req.path === "/health",
});

// Coupon rate limiter
const couponLimiter = createRateLimiter({
  prefix: "coupon",
  windowMs: 20 * 60 * 1000,
  max: 60,
  message: {
    success: false,
    message: "Too many coupon requests, please try again later.",
  },
});

// Stricter rate limiting for auth routes
const authLimiter = createRateLimiter({
  prefix: "auth",
  windowMs: 20 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later.",
  },
});

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://localhost:5173",
      "http://locahost:7000",
      "http://localhost:6000",
      "https://rankbaaz-frontend.onrender.com",
      "https://rankbaaz.com",
      "https://www.rankbaaz.com",
      "https://rankbaaz.com/",
      "https://admin.rankbaaz.com",
      "https://rankbaaz-admin.onrender.com",
      "https://rankbaaz-frontend.onrender.com/",
      "https://rankbaaz.onrender.com",
    ];

    if (!origin) {
        // console.log("Request without origin allowed (development mode)");
        return callback(null, true);
    }

    // Normalize and check origin
    const normalizedOrigin = origin.replace(/\/$/, "");
    const isAllowed = allowedOrigins.some(
      (allowed) => allowed.replace(/\/$/, "") === normalizedOrigin
    );

    if (isAllowed) {
      callback(null, true);
    } else {
      // console.warn(`Blocked origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["X-Total-Count"],
  maxAge: 86400,
  preflightContinue: false,
};

// Middleware
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://cdn.vidstack.io",
          "https://www.youtube.com",
          "https://player.vimeo.com",
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.vidstack.io"],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://res.cloudinary.com",
          "https://i.ytimg.com",
          "https://i.vimeocdn.com",
        ],
        mediaSrc: [
          "'self'",
          "blob:",
          "https://res.cloudinary.com",
          "https://www.youtube.com",
          "https://player.vimeo.com",
        ],
        frameSrc: [
          "'self'",
          "https://www.youtube.com",
          "https://player.vimeo.com",
          "https://www.dailymotion.com",
        ],
        connectSrc: [
          "'self'",
          "https://res.cloudinary.com",
          "https://www.youtube.com",
          "https://player.vimeo.com",
          "https://rankbaaz.onrender.com",
          "wss://rankbaaz.onrender.com",
          "https://rankbaaz.com",
          "wss://rankbaaz.com",
          "razorpay.com",
          "api.razorpay.com",
          "https://api.razorpay.com",
          "https://checkout.razorpay.com",
          "https://rankbaaz.com/",
        ],
        workerSrc: ["'self'", "blob:"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(compression());
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser(process.env.JWT_SECRET));

// Apply express-fileupload ONLY to routes that need it
app.use((req, res, next) => {
  // Skip express-fileupload for course routes (they use multer)
  if (req.path.startsWith("/api/courses")) {
    return next();
  }

  // Apply express-fileupload to all other routes
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
    // 10 MB file size limit
    limits: { fileSize: 10 * 1024 * 1024 },

    abortOnLimit: true,
    createParentPath: true,
  })(req, res, next);
});

// Health check endpoint
app.get("/health", (req, res) => {
  // Quick response for health checks
  res.status(200).json({
    status: "ok",
    uptime: Math.floor(process.uptime()),
  });
});

// Apply general limiter but exclude admin routes
app.use((req, res, next) => {
  if (
    req.path.startsWith("/api/courses") ||
    req.path.startsWith("/api/admin")
  ) {
    return next(); // Skip rate limiting for admin operations
  }
  return limiter(req, res, next);
});

app.use("/api/auth", (req, res, next) => {
  if (req.path === "/admin-login" || req.path === "/refresh-token") {
    return next(); // Skip auth limiter for admin login and refresh
  }
  return authLimiter(req, res, next);
});
// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/tests", testRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/coupons", couponLimiter, couponRoutes);
// Root endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API",
    version: "1.0.0",
    documentation: "/api/docs",
    endpoints: {
      auth: "/api/auth",
      courses: "/api/courses",
      questions: "/api/questions",
      tests: "/api/tests",
      admin: "/api/admin",
    },
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      "/api/auth",
      "/api/courses",
      "/api/questions",
      "/api/tests",
      "/api/admin",
    ],
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Error:", error);

  // CORS error
  if (error.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: "CORS policy violation - origin not allowed",
    });
  }

  // Validation error
  if (error.name === "ValidationError") {
    const errors = Object.values(error.errors).map((err) => ({
      field: err.path,
      message: err.message,
    }));
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors,
    });
  }

  // MongoDB duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  // JWT errors
  if (error.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }

  if (error.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token expired",
    });
  }

  // MongoDB cast error
  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format",
    });
  }

  // Default error
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: error.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
});

const gracefulShutdown = (signal) => {
  console.log(`Received ${signal}. Closing HTTP server gracefully...`);

  server.close(async () => {
    console.log("HTTP server closed.");

    // Close Redis connection
    try {
      await redisClient.quit();
      console.log("Redis connection closed.");
    } catch (error) {
      console.error("Error closing Redis:", error);
    }

    // Close MongoDB connections
    try {
      await mongoose.connection.close();
      console.log("MongoDB connection closed.");
    } catch (error) {
      console.error("Error closing MongoDB:", error);
    }

    // Close second database connection
    try {
      await connection2.close();
      console.log("Content database connection closed.");
    } catch (error) {
      console.error("Error closing content database:", error);
    }

    process.exit(0);
  });

  // Force close after 30 seconds
  setTimeout(() => {
    console.error(
      "Could not close connections in time, forcefully shutting down"
    );
    process.exit(1);
  }, 30000);
};

// Start server
const server = app.listen(PORT, async () => {
  console.log(`
        Server is running
        URL: http://localhost:${PORT}
        Environment: ${process.env.NODE_ENV || "development"}
        Started at: ${new Date().toLocaleString()}
        Database: ${process.env.NODE_ENV === "production" ? "Production" : "Development"}
    `);

  // Initialize leaderboards asynchronously (don't block startup)
  try {
    const { default: leaderboardService } = await import(
      "./services/leaderboardService.js"
    );

    if (typeof leaderboardService.initialize === "function") {
      leaderboardService.initialize().catch((err) => {
        console.error("Background leaderboard initialization failed:", err);
      });
    } else {
      console.log("Leaderboard service ready (no initialization needed)");
    }
  } catch (error) {
    console.error("Failed to start leaderboard initialization:", error);
  }
});
// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

// Handle termination signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export default app;
