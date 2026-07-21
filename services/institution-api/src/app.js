const express = require("express");
const cors = require("cors");

const healthRoute = require("./routes/health");
const membersRoute = require("./routes/members");
const lookupRoute = require("./routes/lookup");
const voterPickerRoute = require("./routes/voter-picker");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(cors({ origin: process.env.BACKEND_URL || "http://localhost:3000" }));
app.use(express.json());

// Root discovery route (before CORS so service is identifiable from browser)
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
