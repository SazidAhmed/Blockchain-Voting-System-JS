function apiKeyAuth(req, res, next) {
  const key = req.headers["x-api-key"];
  const expected = process.env.BLOCKCHAIN_API_KEY;
  if (!expected) {
    console.warn("BLOCKCHAIN_API_KEY not set — auth disabled (dev mode)");
    return next();
  }
  if (!key || key !== expected) {
    return res
      .status(401)
      .json({ error: "Unauthorized", message: "Valid API key required" });
  }
  next();
}

module.exports = { apiKeyAuth };
