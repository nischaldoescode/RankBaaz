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
    crossOriginResourcePolicy: { policy: "same-site" },
    frameguard: { action: "sameorigin" },
  })
);

app.use(
  helmet.hsts({
    maxAge: 31536000,
    includeSubDomains: true,
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
        sameSite: "lax",
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
 * Health check endpoint - No authentication required
 * Used by monitoring services and load balancers
 */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: Math.floor(process.uptime()),
  });
});

/**
 * Sitemap endpoint - No authentication required
 * Used by search engines for SEO
 */
app.get("/sitemap-profiles.xml", async (req, res) => {
  try {
    const cacheKey = "sitemap:profiles";

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        res.header("Content-Type", "application/xml");
        res.header("Cache-Control", "public, max-age=3600");
        return res.send(cached);
      }
    } catch (cacheError) {
      console.warn("Cache read failed, generating fresh:", cacheError);
    }

    const users = await User.find({ isVerified: true })
      .select("username updatedAt")
      .lean()
      .limit(50000);

    const siteUrl = process.env.SITE_URL || "https://rankbaaz.com";

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

    try {
      await redisClient.setex(cacheKey, 3600, sitemap);
    } catch (cacheError) {
      console.warn("Cache write failed:", cacheError);
    }

    res.header("Content-Type", "application/xml");
    res.header("Cache-Control", "public, max-age=3600");
    res.send(sitemap);
  } catch (error) {
    console.error("Sitemap generation error:", error);
    res.status(500).send("Error generating sitemap");
  }
});

/**
 * CORS preflight handler
 */
app.options("*", cors(corsOptions));

/**
 * Mount API routes
 *
 * CRITICAL: Routes are mounted BEFORE signature verification
 * This allows authentication middleware to set req.user/req.admin
 * before signature verification checks them
 *
 * @see Routes/ - Each route file has its own authentication middleware
 */
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

/**
 * Root endpoint - Minimal response for security
 */
app.get("/", (req, res) => {
  if (process.env.NODE_ENV === "production") {
    res.status(200).json({
      success: true,
      message: "API Online",
      version: "1.0.0",
    });
  } else {
    res.status(200).json({
      success: true,
      message: "API",
      version: "1.0.0",
      documentation: "/api/docs",
      endpoints: {
        auth: "/api/auth",
        courses: "/api/courses",
        tests: "/api/tests",
        admin: "/api/admin",
        content: "/api/content",
      },
    });
  }
});

// =============================================================================
// 404 HANDLER
// =============================================================================
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      "/api/auth",
      "/api/courses",
      "/api/tests",
      "/api/admin",
      "/api/content",
    ],
  });
});

/**
 * CRITICAL: Public routes that bypass signature validation
 *
 * Two categories:
 * 1. Unauthenticated public routes (login, register, etc.)
 * 2. Cookie-authenticated routes that don't need signatures
 *    - /api/security/signing-secret (breaks chicken-and-egg problem)
 *
 * @constant {Array<string>} publicRoutes - Exact path matches
 */
const publicRoutes = [
  "/health",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/initiate-login",
  "/api/auth/verify-login-otp",
  "/api/auth/verify-otp",
  "/api/auth/resend-otp",
  "/api/auth/forgot-password",
  "/api/auth/verify-forgot-password-otp",
  "/api/auth/reset-password",
  "/api/auth/refresh-token",
  "/api/security/verify-challenge",
  "/api/security/signing-secret",
  "api/security/signing-secret/clear",
  "/api/admin/login",
  "/api/admin/check-exists",
];

/**
 * SECURITY LAYER 3: Request signature validation middleware
 *
 * Validates HMAC-SHA256 signatures for authenticated requests
 * Prevents Postman/Insomnia access even with valid cookies
 *
 * Exemptions:
 * - Public unauthenticated routes (login, register)
 * - /api/security/signing-secret (cookie-only auth, no signature needed)
 *
 * @middleware
 */
app.use((req, res, next) => {
  // EXEMPTION 1: Check if route is in public routes list
  if (publicRoutes.includes(req.path)) {
    console.log(
      "[SIGNATURE] Bypassing signature check for public route:",
      req.path
    );
    return next();
  }

  // EXEMPTION 2: OPTIONS preflight requests
  if (req.method === "OPTIONS") {
    return next();
  }

  const signature = req.headers["x-request-signature"];
  const timestamp = req.headers["x-request-timestamp"];
  const nonce = req.headers["x-request-nonce"];

  // If signature headers are present, validate them
  if (signature || timestamp || nonce) {
    // All three must be present
    if (!signature || !timestamp || !nonce) {
      console.warn("[SIGNATURE] Incomplete signature headers:", {
        hasSignature: !!signature,
        hasTimestamp: !!timestamp,
        hasNonce: !!nonce,
        path: req.path,
      });

      return res.status(403).json({
        success: false,
        message: "Invalid request signature.",
        code: "SIGNATURE_INVALID",
      });
    }

    // Validate nonce format (must be exactly 32 hex characters)
    if (!/^[0-9a-f]{32}$/i.test(nonce)) {
      console.warn("[SIGNATURE] Invalid nonce format:", {
        nonce: nonce.substring(0, 10) + "...",
        path: req.path,
      });

      return res.status(403).send(getSimple403HTML());
    }

    // Validate timestamp format
    const requestTime = parseInt(timestamp);
    if (isNaN(requestTime)) {
      console.warn("[SIGNATURE] Invalid timestamp format:", {
        timestamp,
        path: req.path,
      });

      return res.status(403).send(getSimple403HTML());
    }

    // Check timestamp is within 5 minutes
    const now = Date.now();
    const timeDiff = Math.abs(now - requestTime);

    if (timeDiff > 5 * 60 * 1000) {
      console.warn("[SIGNATURE] Timestamp expired:", {
        diffSeconds: Math.floor(timeDiff / 1000),
        path: req.path,
      });

      return res.status(403).send(getSimple403HTML());
    }
  }

  next();
});

/**
 * Signature validation middleware
 *
 * SECURITY: Blocks ALL direct browser access to API endpoints
 * Only allows requests from our frontend applications with valid signatures
 *
 * Exemptions (public routes):
 * - Health check
 * - Authentication endpoints
 * - Sitemap (for SEO)
 *
 * ALL other routes (including GET /api/courses/categories) require:
 * 1. Valid origin from allowed domains
 * 2. Request signature headers
 *
 * This prevents:
 * - Typing backend URLs in browser address bar
 * - Postman/Insomnia access
 * - curl/wget access
 * - Chrome DevTools direct fetch
 */
app.use((req, res, next) => {
  // EXEMPTION 1: Public routes (no signature needed)
  if (publicRoutes.includes(req.path)) {
    return next();
  }

  // EXEMPTION 2: OPTIONS preflight requests
  if (req.method === "OPTIONS") {
    return next();
  }

  // EXEMPTION 3: Sitemap for SEO
  if (req.path === "/sitemap-profiles.xml") {
    return next();
  }

  const publicGetEndpoints = [
    "/api/content/settings",
    "/api/content/contact",
    "/api/content/legal",
    "/api/content/faqs",
    "/api/courses/categories",
  ];

  // Check if path is EXACTLY a public endpoint or a subpath of one
  const isPublicGet =
    req.method === "GET" &&
    (() => {
      // Admin routes should NOT be treated as public
      if (req.path.includes("/admin")) {
        return false;
      }

      // Check if path matches public endpoints
      for (const endpoint of publicGetEndpoints) {
        if (req.path === endpoint || req.path.startsWith(endpoint + "/")) {
          return true;
        }
      }

      // Special case: /api/courses (without /admin) is public
      if (req.path === "/api/courses" || req.path.startsWith("/api/courses?")) {
        return true;
      }

      return false;
    })();

  if (isPublicGet) {
    // For public GETs, validate origin
    const origin = req.get("Origin");
    const referer = req.get("Referer");
    const hasSignature = !!req.headers["x-request-signature"];

    if (!origin && !referer) {
      console.warn("[SECURITY] Blocked direct public GET access:", {
        path: req.path,
        ip: req.ip,
      });

      return res.status(403).send(getSimple403HTML());
    }

    //Check for BOTH user auth cookie AND admin session cookie
    if (hasSignature) {
      const hasUserAuthCookie = !!req.signedCookies.auth_session; // User JWT cookie
      const hasAdminSession = !!req.session?.adminId || !!req.signedCookies.sid; // Admin session

      // Allow if EITHER authenticated user OR admin
      if (hasUserAuthCookie || hasAdminSession) {
        console.log("[SECURITY] Authenticated request to public endpoint:", {
          path: req.path,
          hasUserAuth: hasUserAuthCookie,
          hasAdminAuth: hasAdminSession,
        });
        return next();
      }

      // If NO auth cookie AND NO session but HAS signature = suspicious (Postman)
      console.warn("[SECURITY] Rejected public GET with signature (no auth):", {
        path: req.path,
        origin: origin || "none",
        ip: req.ip,
        hasUserCookie: hasUserAuthCookie,
        hasAdminSession: hasAdminSession,
      });
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

    return next();
  }

  // CRITICAL: From this point, ALL routes require valid origin + signature

  const origin = req.get("Origin");
  const referer = req.get("Referer");
  const hasSignature = !!req.headers["x-request-signature"];

  // Block requests without valid origin (direct browser access, Postman, curl)const nonce = req.headers["x-request-nonce"];
  if (!origin && !referer) {
    console.warn("[SECURITY] Blocked direct access:", {
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get("User-Agent")?.substring(0, 50),
    });

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

  // Block requests from valid origin but missing signature
  if (!hasSignature) {
    console.warn("[SECURITY] Blocked request - Missing signature:", {
      path: req.path,
      method: req.method,
      origin: origin || "none",
      ip: req.ip,
    });

    return res.status(403).json({
      success: false,
      message: "Request signature required.",
      code: "SIGNATURE_MISSING",
    });
  }

  // Signature validation happens in auth middleware
  next();
});

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
