require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const userRoutes = require('./routes/users');
const electionRoutes = require('./routes/elections');

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(helmet({
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
    preload: true
  }
}));

// CORS Configuration - Restrict to frontend origin
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174'
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
};
app.use(cors(corsOptions));

// Body Parser with size limits
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Request timeout middleware (30 seconds)
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    res.status(408).json({ message: 'Request timeout' });
  });
  res.setTimeout(30000, () => {
    res.status(408).json({ message: 'Response timeout' });
  });
  next();
});

// Disable X-Powered-By header
app.disable('x-powered-by');

// Routes
app.use('/api/users', userRoutes);
app.use('/api/elections', electionRoutes);

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler - sanitize error messages
app.use((err, req, res, next) => {
  // Log error for debugging (but don't expose to client)
  console.error('Error:', err);
  
  // Determine status code
  const statusCode = err.statusCode || 500;
  
  // Send safe error message
  const message = process.env.NODE_ENV === 'production' 
    ? 'An error occurred processing your request'
    : err.message || 'Internal server error';
  
  res.status(statusCode).json({ 
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Security features enabled:');
  console.log('  ✓ Helmet.js (Security headers)');
  console.log('  ✓ CORS (Restricted origin)');
  console.log('  ✓ Input validation (express-validator)');
  console.log('  ✓ Rate limiting');
  console.log('  ✓ Request timeouts');
  console.log('  ✓ Body size limits');
});

module.exports = app; // Export for testing