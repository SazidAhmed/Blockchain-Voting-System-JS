const express = require("express");
const cors = require("cors");

const healthRoute = require("./routes/health");
const membersRoute = require("./routes/members");
const lookupRoute = require("./routes/lookup");
const voterPickerRoute = require("./routes/voter-picker");
const errorHandler = require("./middleware/errorHandler");

const app = express();

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
if (allowedOrigins.length === 0) {
  allowedOrigins.push(
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
  );
}
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json());

// Root discovery route — dev only
if (process.env.NODE_ENV !== "production") {
  app.get("/", (_req, res) => {
    res.json({
      service: "Institution API",
      port: process.env.PORT || 4000,
      endpoints: {
        health: "/api/health",
        members: "/api/members",
        lookup: "/api/lookup",
        voterPicker: "/api/voter-picker",
      },
    });
  });
}

app.use(healthRoute);
app.use(membersRoute);
app.use(lookupRoute);
app.use(voterPickerRoute);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `${req.method} ${req.originalUrl} does not exist`,
    status: 404,
    availableEndpoints: [
      "GET /health",
      "GET /members",
      "GET /lookup",
      "GET /voter-picker",
    ],
  });
});

app.use(errorHandler);

module.exports = app;
