/**
 * configures the vidhgrow api server, middleware order, trusted origins, sessions, routes, and production security headers
 *
 * @file backend/server.js
 * @module backend/server
 * @exports module members used by the related app runtime
 */

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import helmet from "helmet";
import compression from "compression";
import connectDB from "./Config/mongodb.js";
import { v2 as cloudinary } from "cloudinary";
import redisClient, {
  isRedisConnectionError,
  summarizeRedisError,
} from "./Config/redis.js";
import fileUpload from "express-fileupload";
import mongoose from "mongoose";
import ioredisRatelimit from "ioredis-ratelimit";
// import routes
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
import trackingRoutes from "./Routes/trackingRoutes.js";
import { checkIpBlock } from "./Middleware/ipBlockMiddleware.js";
import teacherRoutes from "./Routes/teacherRoutes.js";
import khaltiRoutes from "./Routes/khaltiRoutes.js";
import blogRoutes from "./Routes/blogRoutes.js";

// load environment variables
dotenv.config();

// configure cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});
// create express app
const app = express();
const PORT = process.env.PORT || 5000;
app.disable("x-powered-by");
app.set(
  "trust proxy",
  process.env.TRUST_PROXY_COUNT ? Number(process.env.TRUST_PROXY_COUNT) : false,
);

const mongoOptions = {
  maxPoolSize: 100, // increased for production
  minPoolSize: 10, // maintain minimum connections
  serverSelectionTimeoutMS: 10000, // increased timeout
  socketTimeoutMS: 60000, // increased socket timeout
  connectTimeoutMS: 15000, // connection timeout
  bufferCommands: false,
  retryWrites: true,
  retryReads: true,
  // these for better connection management
  maxIdleTimeMS: 60000,
  compressors: ["zlib"], // enable compression
};

// we will await for the data base connection
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

// create rate limiter functions using ioredis-ratelimit
const createRateLimiter = (options) => {
  const limiter = ioredisRatelimit({
    client: redisClient,
    key: options.keyFn || ((req) => `ratelimit:${options.prefix}:${req.ip}`),
    limit: options.max,
    duration: options.windowMs,
    mode: "binary",
  });

  console.log(
    `Rate limiter '${options.prefix}' initialized - Max: ${options.max} requests per ${options.windowMs / 1000}s`,
  );

  return async (req, res, next) => {
    if (options.skip && options.skip(req)) {
      return next();
    }

    try {
      await limiter(req);
      next();
    } catch (error) {
      if (isRedisConnectionError(error)) {
        console.warn(
          `[RATE_LIMIT:${options.prefix}] Redis unavailable; allowing request:`,
          summarizeRedisError(error),
        );
        return next();
      }

      return res.status(429).json(options.message);
    }
  };
};

// helper to detect if request is from browser
const isBrowserRequest = (req) => {
  const userAgent = req.get("User-Agent") || "";
  // check for common browser user agents
  return (
    /Mozilla|Chrome|Safari|Firefox|Edge|Opera/i.test(userAgent) &&
    !/bot|crawler|spider|scraper/i.test(userAgent)
  );
};

// coupon limiter - more lenient for browsers
const couponLimiter = createRateLimiter({
  prefix: "coupon",
  windowMs: 15 * 60 * 1000,
  max: 100, // increased from 60
  message: {
    success: false,
    message: "Too many coupon requests, please try again later.",
  },
  skip: (req) => isBrowserRequest(req), // skip for browsers
});

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://localhost:7000",
  "http://localhost:6000",
  "https://api.vidhgrow.online",
  "https://rankbaaz.onrender.com",
  "https://rankbaaz-frontend.onrender.com",
  "https://vidhgrow.online",
  "https://www.vidhgrow.online",
  "https://admin.vidhgrow.online",
  "https://rankbaaz-admin.onrender.com",
  "http://localhost:4173",
  "http://localhost:5175",
  "https://teachers.vidhgrow.online",
  "https://www.teachers.vidhgrow.online",
  "https://blogs.vidhgrow.online",
  "https://www.blogs.vidhgrow.online",

  "http://localhost:5174",
  "http://localhost:5176",
  "http://localhost:8080",
];

const envAllowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

const allowedOrigins = [
  ...new Set(
    [...DEFAULT_ALLOWED_ORIGINS, ...envAllowedOrigins].map((origin) =>
      origin.replace(/\/$/, ""),
    ),
  ),
];

const corsOptions = {
  origin: function (origin, callback) {
    // handle requests without origin header (server-to-server, curl, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // normalize origin
    const normalizedOrigin = origin.replace(/\/$/, "");

    // check for exact match
    const isAllowed = allowedOrigins.some(
      (allowed) => allowed.replace(/\/$/, "") === normalizedOrigin,
    );

    if (isAllowed) {
      return callback(null, true);
    }

    // security: check for origin mimicking
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
        console.warn(`Detected origin mimicking attempt: ${origin}`);
        return callback(new Error("Not allowed by CORS - Invalid origin"));
      }
    } catch (e) {
      // invalid url format
      return callback(new Error("Not allowed by CORS - Malformed origin"));
    }

    // log rejected origin for monitoring
    console.warn(`Rejected origin: ${origin}`);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  // signature headers to allowed headers
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-Request-Signature",
    "X-Request-Timestamp",
    "X-Request-Nonce",
    "Cache-Control",
    "Pragma",
    "Cookie",
  ],
  exposedHeaders: ["X-Total-Count", "Set-Cookie"],
  maxAge: 86400, // cache preflight for 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// middleware
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
          "https://http://vidhgrow.online/",
          "wss://vidhgrow.online",
          "razorpay.com",
          "api.razorpay.com",
          "https://api.razorpay.com",
          "https://checkout.razorpay.com",
          "https://vidhgrow.online/",
        ],
        workerSrc: ["'self'", "blob:"],
      },
    },
    crossOriginResourcePolicy: { policy: "same-site" },
    frameguard: { action: "sameorigin" },
  }),
);

app.use(
  helmet.hsts({
    maxAge: 31536000,
    includeSubDomains: true,
  }),
);

app.use(compression());
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser(process.env.JWT_SECRET));

app.use((req, res, next) => {
  const host = req.get("Host") || "";
  const forwardedHost = req.get("X-Forwarded-Host") || "";
  const forwardedProto = req.get("X-Forwarded-Proto") || "";

  if (host.length > 255 || forwardedHost.length > 255) {
    return res.status(400).json({ success: false, message: "Invalid request" });
  }

  if (forwardedProto && !/^(https?|wss?)$/i.test(forwardedProto.split(",")[0].trim())) {
    return res.status(400).json({ success: false, message: "Invalid request" });
  }

  next();
});

app.use(
  session({
    store: store,
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    proxy: process.env.NODE_ENV === "production",
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "lax",
      path: "/",
      ...(process.env.NODE_ENV === "production" && {
        domain: ".vidhgrow.online",
        secure: true,
        sameSite: "lax",
      }),
    },
    name: "sid",
  }),
);

if (process.env.NODE_ENV === "development") {
  console.log("Initialized with:", {
    secure: false,
    httpOnly: true,
    sameSite: "lax",
    maxAge: "24 hours",
    store: "Redis",
  });
}

/**
 * helper: generate simple 403 html page
 * returns minimal html to prevent information disclosure
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
    <p class="brand">Vidhgrow</p>
  </div>
</body>
</html>
  `;
};

// check ip block any route

app.use(checkIpBlock);

// apply bot protection globally (routes)
app.use(botProtection);

// console.log(
// " bot protection and origin enforcement disabled for testing"
// );

app.post("/api/security/verify-challenge", verifyChallenge);

/**
 * health check endpoint - no authentication required
 * used by monitoring services and load balancers
 */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: Math.floor(process.uptime()),
  });
});

/**
 * sitemap endpoint - no authentication required
 * used by search engines for seo
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
      console.warn(
        "Cache read failed, generating fresh:",
        summarizeRedisError(cacheError),
      );
    }

    const users = await User.find({ isVerified: true })
      .select("username updatedAt")
      .lean()
      .limit(50000);

    const siteUrl = process.env.SITE_URL || "https://vidhgrow.online";

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
  </url>`,
    )
    .join("")}
</urlset>`;

    try {
      await redisClient.setex(cacheKey, 3600, sitemap);
    } catch (cacheError) {
      console.warn("Cache write failed:", summarizeRedisError(cacheError));
    }

    res.header("Content-Type", "application/xml");
    res.header("Cache-Control", "public, max-age=3600");
    res.send(sitemap);
  } catch (error) {
    console.error("Sitemap generation error:", error);
    res.status(500).send("Error generating sitemap");
  }
});

// apply express-fileupload only to routes that need it
app.use((req, res, next) => {
  // routes with multer need the raw multipart stream
  const multerRoutes = ["/api/courses", "/api/teachers"];
  if (multerRoutes.some((route) => req.path.startsWith(route))) {
    return next();
  }

  // content and blog media routes still use express-fileupload
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
    // 10 mb file size limit
    limits: { fileSize: 10 * 1024 * 1024 },

    abortOnLimit: true,
    createParentPath: true,
  })(req, res, next);
});
/**
 * cors preflight handler
 */
app.options("*", cors(corsOptions));

/**
 * mount api routes
 *
 * routes are mounted signature verification
 * this allows authentication middleware to set req.user/req.admin
 * signature verification checks them
 *
 * @see routes/ - each route file has its own authentication middleware
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
app.use("/track", trackingRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/payments/khalti", khaltiRoutes);
app.use("/api/blogs", blogRoutes);
/**
 * root endpoint - minimal response for security
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

// 404 handler
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
 * public routes that bypass signature validation
 *
 * two categories:
 * 1. unauthenticated public routes (login, register, etc.)
 * 2. cookie-authenticated routes that don't need signatures
 * - /api/security/signing-secret (breaks chicken-and-egg problem)
 *
 * @constant {array<string>} publicroutes - exact path matches
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
  "/api/teachers/apply",
  "/api/teachers/login",
  "/api/teachers/logout",
  "/api/teachers/signup",
  "/api/teachers/verify-invite",
  "/api/teachers/waitlist-count",
  "/api/blogs/public",
  "/api/blogs/settings/share",
  "/api/blogs/sitemap.xml",
];


/**
 * security layer 3: request signature validation middleware
 *
 * validates hmac-sha256 signatures for authenticated requests
 * prevents postman/insomnia access even with valid cookies
 *
 * exemptions:
 * - public unauthenticated routes (login, register)
 * - /api/security/signing-secret (cookie-only auth, no signature needed)
 *
 * @middleware
 */
app.use((req, res, next) => {
  // exemption 1: check if route is in public routes list
  if (publicRoutes.includes(req.path)) {
    console.log("Bypassing signature check for public route:", req.path);
    return next();
  }

  // exemption 2: options preflight requests
  if (req.method === "OPTIONS") {
    return next();
  }

  const signature = req.headers["x-request-signature"];
  const timestamp = req.headers["x-request-timestamp"];
  const nonce = req.headers["x-request-nonce"];

  // if signature headers are present, validate them
  if (signature || timestamp || nonce) {
    // all three present
    if (!signature || !timestamp || !nonce) {
      console.warn("Incomplete signature headers:", {
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

    // validate nonce format (exactly 32 hex characters)
    if (!/^[0-9a-f]{32}$/i.test(nonce)) {
      console.warn("Invalid nonce format:", {
        nonce: nonce.substring(0, 10) + "...",
        path: req.path,
      });

      return res.status(403).send(getSimple403HTML());
    }

    if (!/^[0-9a-f]{64}$/i.test(signature)) {
      console.warn("Invalid signature format:", {
        path: req.path,
      });

      return res.status(403).send(getSimple403HTML());
    }

    // validate timestamp format
    const requestTime = parseInt(timestamp);
    if (isNaN(requestTime)) {
      console.warn("Invalid timestamp format:", {
        timestamp,
        path: req.path,
      });

      return res.status(403).send(getSimple403HTML());
    }

    // check timestamp is within 5 minutes
    const now = Date.now();
    const timeDiff = Math.abs(now - requestTime);

    if (timeDiff > 5 * 60 * 1000) {
      console.warn("Timestamp expired:", {
        diffSeconds: Math.floor(timeDiff / 1000),
        path: req.path,
      });

      return res.status(403).send(getSimple403HTML());
    }
  }

  next();
});

/**
 * signature validation middleware
 *
 * security: blocks all direct browser access to api endpoints
 * only allows requests from our frontend applications with valid signatures
 *
 * exemptions (public routes):
 * - health check
 * - authentication endpoints
 * - sitemap (for seo)
 *
 * all other routes (including get /api/courses/categories) require:
 * 1. valid origin from allowed domains
 * 2. request signature headers
 *
 * this prevents:
 * - typing backend urls in browser ress bar
 * - postman/insomnia access
 * - curl/wget access
 * - chrome devtools direct fetch
 */
app.use((req, res, next) => {
  // exemption 1: public routes (no signature needed)
  if (publicRoutes.includes(req.path)) {
    return next();
  }

  // exemption 2: options preflight requests
  if (req.method === "OPTIONS") {
    return next();
  }

  // exemption 3: sitemap for seo
  if (req.path === "/sitemap-profiles.xml") {
    return next();
  }
  if (req.path.startsWith("/track/") && req.method === "GET") {
    return next();
  }

  const publicGetEndpoints = [
    "/api/content/settings",
    "/api/content/contact",
    "/api/content/legal",
    "/api/content/faqs",
    "/api/courses/categories",
    "/api/teachers/waitlist-count",
    "/api/teachers/profile",
    "/api/teachers/verify-invite",
    "/api/blogs/public",
    "/api/blogs/authors",
    "/api/blogs/settings/share",
    "/api/blogs/sitemap.xml",
  ];

  // check if path is exactly a public endpoint or a subpath of one
  const isPublicGet =
    req.method === "GET" &&
    (() => {
      // admin routes should not be treated as public
      if (req.path.includes("/admin")) {
        return false;
      }

      // check if path matches public endpoints
      for (const endpoint of publicGetEndpoints) {
        if (req.path === endpoint || req.path.startsWith(endpoint + "/")) {
          return true;
        }
      }

      // special case: /api/courses (without /admin) is public
      if (req.path === "/api/courses" || req.path.startsWith("/api/courses?")) {
        return true;
      }

      return false;
    })();

  if (isPublicGet) {
    // for public gets, validate origin
    const origin = req.get("Origin");
    const referer = req.get("Referer");
    const hasSignature = !!req.headers["x-request-signature"];

    if (!origin && !referer) {
      console.warn("Blocked direct public GET access:", {
        path: req.path,
        ip: req.ip,
      });

      return res.status(403).send(getSimple403HTML());
    }

    // check for both user auth cookie and admin session cookie
    if (hasSignature) {
      const hasUserAuthCookie = !!req.signedCookies.auth_session; // user jwt cookie
      const hasAdminSession = !!req.session?.adminId || !!req.signedCookies.sid; // admin session

      // allow if either authenticated user or admin
      if (hasUserAuthCookie || hasAdminSession) {
        console.log("Authenticated request to public endpoint:", {
          path: req.path,
          hasUserAuth: hasUserAuthCookie,
          hasAdminAuth: hasAdminSession,
        });
        return next();
      }

      // if no auth cookie and no session but has signature = suspicious (postman)
      console.warn("Rejected public GET with signature (no auth):", {
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
            <p class="brand">Vidhgrow </p>
          </div>
        </body>
        </html>
      `);
    }

    return next();
  }

  // from this point, all routes require valid origin + signature

  const origin = req.get("Origin");
  const referer = req.get("Referer");
  const hasSignature = !!req.headers["x-request-signature"];

  // block direct api access without a trusted origin
  if (!origin && !referer) {
    console.warn("Blocked direct access:", {
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
          <p class="brand">Vidhgrow</p>
        </div>
      </body>
      </html>
    `);
  }

  // block requests from valid origin but missing signature
  if (!hasSignature) {
    console.warn("Blocked request - Missing signature:", {
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

  // signature validation happens in auth middleware
  next();
});

/**
 * express-level micro-caching
 * caches responses in memory for ultra-fast repeated requests
 * duration: 1 second (perfect for burst traffic)
 */
const microCache = {};
const MICRO_CACHE_DURATION = 5000; // 1 second

app.use((req, res, next) => {
  // only cache get requests
  if (req.method !== "GET") return next();

  // skip for authenticated users (admin/user routes)
  if (req.path.includes("/admin") || req.user || req.admin) {
    return next();
  }

  const key = req.url;
  const cached = microCache[key];

  if (cached && Date.now() - cached.timestamp < MICRO_CACHE_DURATION) {
    return res.send(cached.data);
  }

  // override res.send to cache response
  const originalSend = res.send.bind(res);
  res.send = (data) => {
    if (res.statusCode === 200) {
      microCache[key] = {
        data,
        timestamp: Date.now(),
      };

      // auto-cleanup expiration
      setTimeout(() => {
        delete microCache[key];
      }, MICRO_CACHE_DURATION);
    }
    return originalSend(data);
  };

  next();
});

// from this point, all routes require valid origin + signature
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log("Method:", req.method);
    console.log("Path:", req.path);
    console.log(
      "Has auth cookie:",
      !!req.signedCookies.auth_session,
    );
    console.log(
      "Has signature:",
      !!req.headers["x-request-signature"],
    );
    console.log("Origin:", req.get("Origin") || "none");
    console.log(
      "User-Agent:",
      req.get("User-Agent")?.substring(0, 50) || "none",
    );
    next();
  });
}

// error handling middleware
app.use((error, req, res, next) => {
  if (isRedisConnectionError(error)) {
    console.warn("Request failed because Redis is unavailable:", {
      path: req.path,
      ...summarizeRedisError(error),
    });

    if (res.headersSent) {
      return next(error);
    }

    return res.status(503).json({
      success: false,
      message: "Service temporarily unavailable. Please try again.",
      code: "REDIS_UNAVAILABLE",
    });
  }

  console.error("Error:", error);

  const acceptsJson = req.get("Accept")?.includes("application/json");
  const isApiRoute = req.path.startsWith("/api/");

  // cors error - enhanced security for production
  if (error.message?.startsWith("Not allowed by CORS")) {
    // check if request has no origin/referer (suspicious)
    const hasNoOrigin = !req.get("Origin") && !req.get("Referer");

    if (acceptsJson || isApiRoute) {
      // production: for requests with no origin, send simple html instead of json
      // this prevents information disclosure about api structure
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
            <p class="brand">Vidhgrow</p>
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
  // validation error
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

  // mongodb duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  // jwt errors
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

  // mongodb cast error
  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format",
    });
  }

  // default error
  const statusCode = error.statusCode || 500;

  // check if headers were already sent
  if (res.headersSent) {
    console.error(
      "Headers already sent, cannot send error response:",
      error,
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

    // close redis connection
    try {
      await redisClient.quit();
      console.log("Redis connection closed.");
    } catch (error) {
      console.error("Error closing Redis:", error);
    }

    // close mongodb connections
    try {
      await mongoose.connection.close();
      console.log("MongoDB connection closed.");
    } catch (error) {
      console.error("Error closing MongoDB:", error);
    }

    // close second database connection
    try {
      await connection2.close();
      console.log("Content database connection closed.");
    } catch (error) {
      console.error("Error closing content database:", error);
    }

    process.exit(0);
  });

  // force close 30 seconds
  setTimeout(() => {
    console.error(
      "Could not close connections in time, forcefully shutting down",
    );
    process.exit(1);
  }, 30000);
};

// start server
const server = app.listen(PORT, async () => {
  console.log(`
        Server is running
        URL: http://localhost:${PORT}
        Environment: ${process.env.NODE_ENV || "development"}
        Started at: ${new Date().toLocaleString()}
        Database: ${process.env.NODE_ENV === "production" ? "Production" : "Development"}
    `);

  // initialize leaderboards asynchronously (don't block startup)
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
// handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);
  server.close(() => {
    process.exit(1);
  });
});

// handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

// handle termination signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
export default app;
