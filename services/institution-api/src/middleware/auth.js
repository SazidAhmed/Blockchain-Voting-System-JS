const crypto = require("crypto");

function apiKeyAuth(req, res, next) {
  const key = req.headers["x-api-key"];
  const expected = process.env.INSTITUTION_API_KEY;

  if (!expected) {
    return res.status(500).json({ error: "Server misconfigured: INSTITUTION_API_KEY not set" });
  }

  if (!key || !crypto.timingSafeEqual(Buffer.from(key), Buffer.from(expected))) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}

module.exports = { apiKeyAuth };
