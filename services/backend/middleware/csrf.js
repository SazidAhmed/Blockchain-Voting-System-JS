const crypto = require("crypto");

function csrfProtection(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

  const csrfCookie = req.cookies?.["csrf-token"];
  const csrfHeader = req.headers["x-csrf-token"];

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return res.status(403).json({ error: "CSRF token mismatch" });
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

module.exports = { csrfProtection, setCsrfToken };
