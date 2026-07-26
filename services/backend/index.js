const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

if (!process.env.NULLIFIER_SECRET) {
    console.error('FATAL: NULLIFIER_SECRET environment variable is required');
    process.exit(1);
}

if (
  process.env.NODE_ENV === "production" &&
  process.env.JWT_SECRET ===
    "your-super-secret-jwt-key-change-in-production-minimum-32-chars"
) {
  console.error(
    "CRITICAL: Default JWT_SECRET detected. Generate a random secret and update .env",
  );
  process.exit(1);
}

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const { csrfProtection, setCsrfToken } = require("./middleware/csrf");
const { generalLimiter } = require("./middleware/rateLimiter");
const { pool } = require("./config/db");
const userRoutes = require("./routes/users");
const electionRoutes = require("./routes/elections");
const emailService = require("./services/emailService");

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy (required for correct IP behind reverse proxy / load balancer)
app.set("trust proxy", 1);

// Health check endpoint (before CORS so Docker healthcheck without Origin header works)
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running" });
});

// Root discovery route — dev only (hides service details in production)
if (process.env.NODE_ENV !== "production") {
  app.get("/", (req, res) => {
    res.json({
      service: "Backend API",
      version: "1.0.0",
      port: PORT,
      endpoints: {
        health: "/health",
        users: "/api/users",
        elections: "/api/elections",
      },
    });
  });
}

// Security Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow frontend to embed resources
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  }),
);

// CORS Configuration - Restrict to known origins
// Set CORS_ALLOWED_ORIGINS as a comma-separated list in production.
// Fallback: dev defaults cover both frontend (5173) and admin panel (5174).
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
if (allowedOrigins.length === 0) {
  allowedOrigins.push(
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
  );
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (non-browser clients: curl, Postman, server-to-server)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-auth-token", "x-csrf-token"],
};
app.use(cors(corsOptions));

// Global rate limiting
app.use(generalLimiter);

// Body Parser with size limits
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(cookieParser());
app.use(setCsrfToken);
app.use(csrfProtection);

// Request timeout middleware (30 seconds)
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    res.status(408).json({ message: "Request timeout" });
  });
  res.setTimeout(30000, () => {
    res.status(408).json({ message: "Response timeout" });
  });
  next();
});

// Disable X-Powered-By header
app.disable("x-powered-by");

// Routes
app.use("/api/users", userRoutes);
app.use("/api/elections", electionRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `${req.method} ${req.originalUrl} does not exist`,
    status: 404,
  });
});

// Auto-release results scheduler — checks every 60s
setInterval(async () => {
  try {
    const [expired] = await pool.query(
      `SELECT id FROM elections 
       WHERE status = 'active' AND results_released = FALSE AND end_date < NOW()`,
    );
    for (const election of expired) {
      await pool.query(
        "UPDATE elections SET results_released = TRUE, results_released_at = NOW() WHERE id = ?",
        [election.id],
      );
      console.log(`🔓 Auto-released results for election #${election.id}`);
    }
  } catch (err) {
    console.error("Auto-release scheduler error:", err.message);
  }
}, 60000);

// Global error handler - sanitize error messages
app.use((err, req, res, next) => {
  // Log error for debugging (but don't expose to client)
  console.error("Error:", err);

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Send safe error message
  const isDev = process.env.NODE_ENV !== "production";

  res.status(statusCode).json({
    message: isDev
      ? err.message || "Internal server error"
      : statusCode >= 500
        ? "An error occurred processing your request"
        : err.message || "An error occurred",
    ...(isDev && {
      stack: err.stack,
      code: err.code,
      type: err.name,
    }),
  });
});

// Email service initializes lazily on first institutional email (Ethereal account created on demand)
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Security features enabled:");
  console.log("  ✓ Helmet.js (Security headers)");
  console.log("  ✓ CORS (Restricted origin)");
  console.log("  ✓ Input validation (express-validator)");
  console.log("  ✓ Rate limiting");
  console.log("  ✓ Request timeouts");
  console.log("  ✓ Body size limits");
  console.log("  ✓ Email OTP verification");
});

module.exports = app; // Export for testing
