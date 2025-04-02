// server/src/server.js
require("dotenv").config();
const express = require("express");
const app = require("./app");

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});
