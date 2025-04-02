// server/src/app.js
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Import routes
const transcriptionRoutes = require("./routes/transcriptionRoutes");
const recordRoutes = require("./routes/recordRoutes");

// Use routes
app.use("/api/transcriptions", transcriptionRoutes);
app.use("/api/record", recordRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Live Transcription API is running!" });
});

module.exports = app;
app.use(morgan("dev"));
console.log("Server is running on port 3000");
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});