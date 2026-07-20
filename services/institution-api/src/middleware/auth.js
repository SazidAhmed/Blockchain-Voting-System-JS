function apiKeyAuth(req, res, next) {
  const key = req.headers["x-api-key"];
  const expected = process.env.INSTITUTION_API_KEY;

  if (!expected) {
    console.warn("INSTITUTION_API_KEY not set - auth disabled (dev mode)");
    return next();
  }

  if (!key || key !== expected) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}

module.exports = { apiKeyAuth };
