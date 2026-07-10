const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware to verify JWT token
function auth(req, res, next) {
  // Get token from header - support both x-auth-token and Authorization: Bearer
  let token = req.header('x-auth-token');
  
  if (!token) {
    // Try Authorization header with Bearer format
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    }
  }

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
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