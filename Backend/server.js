import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import helmet from "helmet";
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
import User from "./Models/User.js";
import devToolsRoutes from "./Routes/devToolsRoutes.js";
import { botProtection, verifyChallenge } from "./Middleware/botProtection.js";
import session from "express-session";
import { corsErrorPage } from "./Middleware/ErrorsPages/errorPages.js";
import securityRoutes from "./Routes/securityRoutes.js";
import RedisStore from "connect-redis";

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

const store = new RedisStore({
  client: redisClient,
  prefix: "sess:",
  ttl: 86400,
});

console.log("Redis session store initialized successfully");
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


// Helper to detect if request is from browser
const isBrowserRequest = (req) => {
  const userAgent = req.get("User-Agent") || "";
  // Check for common browser user agents
  return (
    /Mozilla|Chrome|Safari|Firefox|Edge|Opera/i.test(userAgent) &&
    !/bot|crawler|spider|scraper/i.test(userAgent)
  );
};

// Coupon limiter - MORE LENIENT FOR BROWSERS
const couponLimiter = createRateLimiter({
  prefix: "coupon",
  windowMs: 15 * 60 * 1000,
  max: 100, // Increased from 60
  message: {
    success: false,
    message: "Too many coupon requests, please try again later.",
  },
  skip: (req) => isBrowserRequest(req), // Skip for browsers
});

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://localhost:5173",
      "http://localhost:7000",
      "http://localhost:6000",
      "https://api.rankbaaz.com",
      "https://rankbaaz.onrender.com",
      "https://rankbaaz-frontend.onrender.com",
      "https://rankbaaz.com",
      "https://www.rankbaaz.com",
      "https://admin.rankbaaz.com",
      "https://rankbaaz-admin.onrender.com",
      "https://rankbaaz.onrender.com",
      "https://rankbaaz.onrender.com/",
      "http://localhost:4173",
      "https://rankbaaz-admin.onrender.com/",
    ];

    // Handle requests without origin header (server-to-server, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // Normalize origin
    const normalizedOrigin = origin.replace(/\/$/, "");

    // Check for exact match
    const isAllowed = allowedOrigins.some(
      (allowed) => allowed.replace(/\/$/, "") === normalizedOrigin
    );

    if (isAllowed) {
      return callback(null, true);
    }

    // SECURITY: Check for origin mimicking
    try {
      const originHostname = new URL(normalizedOrigin).hostname;
      const isMimicking = allowedOrigins.some((allowed) => {
        const allowedHostname = new URL(allowed).hostname;
        return (
          originHostname.includes(allowedHostname) &&
          originHostname !== allowedHostname
        );
      });

      if (isMimicking) {
        console.warn(`[SECURITY] Detected origin mimicking attempt: ${origin}`);
        return callback(new Error("Not allowed by CORS - Invalid origin"));
      }
    } catch (e) {
      // Invalid URL format
      return callback(new Error("Not allowed by CORS - Malformed origin"));
    }

    // Log rejected origin for monitoring
    console.warn(`[CORS] Rejected origin: ${origin}`);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  // CRITICAL FIX: Add signature headers to allowed headers
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-Request-Signature",
    "X-Request-Timestamp",
    "X-Request-Nonce",
    "Cookie",
  ],
  exposedHeaders: ["X-Total-Count", "Set-Cookie"],
  maxAge: 86400, // Cache preflight for 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204,
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

app.use(
  session({
    store: store,
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: true,
    rolling: true,
    proxy: process.env.NODE_ENV === "production",
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "lax",
      path: "/",
      ...(process.env.NODE_ENV === "production" && {
        domain: ".rankbaaz.com",
        secure: true,
        sameSite: "none",
      }),
    },
    name: "sid",
  })
);

if (process.env.NODE_ENV === "development") {
  console.log("[SESSION_CONFIG] Initialized with:", {
    secure: false,
    httpOnly: true,
    sameSite: "lax",
    maxAge: "24 hours",
    store: "Redis",
  });
}

// console.log(`✓ Session middleware configured for ${process.env.NODE_ENV}`);

/**
 * HELPER: Generate simple 403 HTML page
 * Returns minimal HTML to prevent information disclosure
 */
const getSimple403HTML = () => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>403 Forbidden</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: #f5f5f5;
    }
    .container {
      text-align: center;
      padding: 2rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      max-width: 400px;
    }
    h1 {
      font-size: 3rem;
      margin: 0;
      color: #333;
      font-weight: bold;
    }
    .divider {
      height: 1px;
      background: #ddd;
      margin: 1.5rem 0;
    }
    .brand {
      font-style: italic;
      color: #666;
      font-size: 1.2rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>403 Forbidden</h1>
    <div class="divider"></div>
    <p class="brand">RankBaaz</p>
  </div>
</body>
</html>
  `;
};

// Apply bot protection globally (before routes)
app.use(botProtection);

// console.log(
//   "⚠️  WARNING: Bot protection and origin enforcement DISABLED for testing"
// );

app.post("/api/security/verify-challenge", verifyChallenge);

/**
 * Express-level micro-caching
 * Caches responses in memory for ultra-fast repeated requests
 * Duration: 1 second (perfect for burst traffic)
 */
const microCache = {};
const MICRO_CACHE_DURATION = 5000; // 1 second

app.use((req, res, next) => {
  // Only cache GET requests
  if (req.method !== "GET") return next();

  // Skip for authenticated users (admin/user routes)
  if (req.path.includes("/admin") || req.user || req.admin) {
    return next();
  }

  const key = req.url;
  const cached = microCache[key];

  if (cached && Date.now() - cached.timestamp < MICRO_CACHE_DURATION) {
    return res.send(cached.data);
  }

  // Override res.send to cache response
  const originalSend = res.send.bind(res);
  res.send = (data) => {
    if (res.statusCode === 200) {
      microCache[key] = {
        data,
        timestamp: Date.now(),
      };

      // Auto-cleanup after expiration
      setTimeout(() => {
        delete microCache[key];
      }, MICRO_CACHE_DURATION);
    }
    return originalSend(data);
  };

  next();
});

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

// CRITICAL: Add request logging to debug what's happening
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log("\n[REQUEST_DEBUG] ===================================");
    console.log("[REQUEST_DEBUG] Method:", req.method);
    console.log("[REQUEST_DEBUG] Path:", req.path);
    console.log(
      "[REQUEST_DEBUG] Has auth cookie:",
      !!req.signedCookies.auth_session
    );
    console.log(
      "[REQUEST_DEBUG] Has signature:",
      !!req.headers["x-request-signature"]
    );
    console.log("[REQUEST_DEBUG] Origin:", req.get("Origin") || "none");
    console.log(
      "[REQUEST_DEBUG] User-Agent:",
      req.get("User-Agent")?.substring(0, 50) || "none"
    );
    console.log("[REQUEST_DEBUG] ===================================\n");
    next();
  });
}

// Add before error handlers
app.get("/sitemap-profiles.xml", async (req, res) => {
  try {
    // we will Check Redis cache first (cache for 1 hour)
    const cacheKey = "sitemap:profiles";

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        console.log("Serving sitemap from cache");
        res.header("Content-Type", "application/xml");
        res.header("Cache-Control", "public, max-age=3600"); // 1 hour browser cache
        return res.send(cached);
      }
    } catch (cacheError) {
      console.warn("Cache read failed, generating fresh:", cacheError);
    }

    // Fetch all users with public profiles
    const users = await User.find({ isVerified: true })
      .select("username updatedAt")
      .lean()
      .limit(50000); // Google's limit per sitemap

    const siteUrl = process.env.SITE_URL || "https://rankbaaz.com";

    // Generate XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${users
    .map(
      (user) => `
  <url>
    <loc>${siteUrl}/@${user.username}</loc>
    <lastmod>${new Date(user.updatedAt).toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`
    )
    .join("")}
</urlset>`;

    // Cache for 1 hour (3600 seconds)
    try {
      await redisClient.setex(cacheKey, 3600, sitemap);
      console.log("Sitemap cached successfully");
    } catch (cacheError) {
      console.warn("Cache write failed:", cacheError);
    }

    res.header("Content-Type", "application/xml");
    res.header("Cache-Control", "public, max-age=3600"); // 1 hour browser cache
    res.send(sitemap);
  } catch (error) {
    console.error("Sitemap generation error:", error);
    res.status(500).send("Error generating sitemap");
  }
});
app.options("*", cors(corsOptions));

// console.log('✓ CORS preflight handler configured');

// Health check endpoint
app.get("/health", (req, res) => {
  // Quick response for health checks
  res.status(200).json({
    status: "ok",
    uptime: Math.floor(process.uptime()),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/security", securityRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/tests", testRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/coupons", couponLimiter, couponRoutes);
app.use("/api/devtools", devToolsRoutes);
// Root endpoint
/**
 * Root endpoint - Minimal response for security
 * In production, API root should not expose structure
 * Frontend apps already know the endpoints they need
 */
app.get("/", (req, res) => {
  // In production, return minimal info
  if (process.env.NODE_ENV === "production") {
    res.status(200).json({
      success: true,
      message: "API Online",
      version: "1.0.0",
    });
  } else {
    // In development, show helpful endpoint list
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
  }
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

  const acceptsJson = req.get("Accept")?.includes("application/json");
  const isApiRoute = req.path.startsWith("/api/");

  // CORS error
  // CORS error - Enhanced security for production
  if (error.message === "Not allowed by CORS") {
    // Check if request has no origin/referer (suspicious)
    const hasNoOrigin = !req.get("Origin") && !req.get("Referer");

    if (acceptsJson || isApiRoute) {
      // PRODUCTION: For requests with no origin, send simple HTML instead of JSON
      // This prevents information disclosure about API structure
      if (hasNoOrigin) {
        return res.status(403).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>403 Forbidden</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: #f5f5f5;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              max-width: 400px;
            }
            h1 {
              font-size: 3rem;
              margin: 0;
              color: #333;
              font-weight: bold;
            }
            .divider {
              height: 1px;
              background: #ddd;
              margin: 1.5rem 0;
            }
            .brand {
              font-style: italic;
              color: #666;
              font-size: 1.2rem;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>403 Forbidden</h1>
            <div class="divider"></div>
            <p class="brand">RankBaaz</p>
          </div>
        </body>
        </html>
      `);
      }

      return res.status(403).json({
        success: false,
        message: "CORS policy violation.",
      });
    } else {
      return res
        .status(403)
        .send(corsErrorPage(req.get("Origin") || "Unknown"));
    }
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

  // CRITICAL FIX: Check if headers were already sent
  if (res.headersSent) {
    console.error(
      "[ERROR] Headers already sent, cannot send error response:",
      error
    );
    return next(error);
  }

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
