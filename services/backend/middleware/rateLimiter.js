const rateLimit = require("express-rate-limit");

function createLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    message: { message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        message,
        retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
      });
    },
  });
}

const registerLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message:
    "Too many registration attempts from this IP, please try again after 15 minutes",
});
const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message:
    "Too many login attempts from this IP, please try again after 15 minutes",
});
const voteLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Too many voting attempts from this IP, please slow down",
});
const generalLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later",
});
const otpLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message:
    "Too many verification code requests. Please try again after 15 minutes.",
});

module.exports = {
  registerLimiter,
  loginLimiter,
  voteLimiter,
  otpLimiter,
  generalLimiter,
};
