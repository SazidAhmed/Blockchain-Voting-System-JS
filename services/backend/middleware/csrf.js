const crypto = require("crypto");

const CSRF_EXEMPT_PATHS = [
  "/api/users/login",
  "/api/users/register",
  "/api/users/forgot-password",
  "/api/users/reset-password",
  "/api/users/verify-otp",
];

function csrfProtection(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

  // Skip CSRF for public auth endpoints (no session to protect)
  if (CSRF_EXEMPT_PATHS.includes(req.path)) return next();

  const csrfCookie = req.cookies?.["csrf-token"];
  const csrfHeader = req.headers["x-csrf-token"];

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return res.status(403).json({
      message: "CSRF token mismatch. Please refresh the page and try again.",
    });
  }
  next();
}

function setCsrfToken(req, res, next) {
  if (!req.cookies?.["csrf-token"]) {
    const token = crypto.randomBytes(32).toString("hex");
    res.cookie("csrf-token", token, {
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 86400000,
    });
  }
  next();
}

// Rotate the CSRF token after a successful state-changing request (M-54)
function rotateCsrfToken(req, res, next) {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode < 400) {
        const token = crypto.randomBytes(32).toString("hex");
        res.cookie("csrf-token", token, {
          sameSite: "strict",
          secure: process.env.NODE_ENV === "production",
          maxAge: 86400000,
        });
      }
      return originalJson(body);
    };
  }
  next();
}

module.exports = { csrfProtection, setCsrfToken, rotateCsrfToken };
