const rateLimit = require("express-rate-limit");

const voteLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: "Too many vote requests" },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { voteLimiter };
