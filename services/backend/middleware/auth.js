const jwt = require('jsonwebtoken');
const tokenBlacklist = require('../utils/tokenBlacklist');
require('dotenv').config();

// Middleware to verify JWT token
function auth(req, res, next) {
  // Get token from header, then cookie fallback
  let token = req.header('x-auth-token');
  
  if (!token) {
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    token = req.cookies?.token;
  }

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });

    if (decoded.jti && tokenBlacklist.has(decoded.jti)) {
      return res.status(401).json({ message: 'Token revoked' });
    }
    
    // Add user from payload
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
}

// Middleware to check if user is an admin
function adminAuth(req, res, next) {
  auth(req, res, () => {
    if (req.user.role === 'admin' || req.user.role === 'board_member') {
      next();
    } else {
      res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
  });
}

module.exports = { auth, adminAuth };