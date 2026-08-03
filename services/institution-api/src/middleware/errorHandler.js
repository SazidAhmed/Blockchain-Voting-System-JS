function errorHandler(err, _req, res, _next) {
  console.error("Unhandled error:", err);
  const isDev = process.env.NODE_ENV !== "production";
  res.status(500).json({
    message: isDev ? err.message : "Internal server error",
  });
}

module.exports = errorHandler;
