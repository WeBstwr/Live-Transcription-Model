// server/src/app.js
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();

const transcriptionRoutes = require("./routes/transcriptionRoutes");
const recordRoutes = require("./routes/recordRoutes");

const app = express();

// Increase timeout to 10 minutes
app.use((req, res, next) => {
  res.setTimeout(600000); // 10 minutes
  next();
});

// Enable CORS for all routes
app.use(cors());

// Middleware
app.use(express.json());
app.use(morgan("dev"));

// Routes
app.use("/api/transcriptions", transcriptionRoutes);
app.use("/api/record", recordRoutes);

// Root route
app.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

module.exports = app;
