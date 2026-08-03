const jwt = require("jsonwebtoken");
const tokenBlacklist = require("../utils/tokenBlacklist");
require("dotenv").config();

// Middleware to verify JWT token
async function auth(req, res, next) {
  let token = req.header("x-auth-token");

  if (!token) {
    const authHeader = req.header("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    // Check both admin and voter cookie names for compatibility
    token =
      req.cookies?.admin_token ||
      req.cookies?.voter_token ||
      req.cookies?.token;
  }

  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });

    if (decoded.jti && (await tokenBlacklist.has(decoded.jti))) {
      return res.status(401).json({ message: "Token revoked" });
    }

    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Session expired. Please log in again.",
        code: "TOKEN_EXPIRED",
      });
    } else if (err.name === "JsonWebTokenError") {
      return res.status(401).json({
        message: "Invalid authentication token. Please log in again.",
        code: "TOKEN_INVALID",
      });
    } else {
      return res.status(401).json({
        message: "Token verification failed. Please log in again.",
        code: "TOKEN_ERROR",
      });
    }
  }
}

// Middleware to check if user is an admin (must be used AFTER auth middleware)
function adminAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  if (req.user.role === "admin" || req.user.role === "board_member") {
    next();
  } else {
    res
      .status(403)
      .json({ message: "Access denied. Admin privileges required." });
  }
}

module.exports = { auth, adminAuth };
