function errorHandler(err, _req, res, _next) {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: err.message || 'Internal server error' });
}

module.exports = errorHandler;
