// server/src/asrProcessor.js
const path = require("path");
const { execFile } = require("child_process");

async function processAudio(filePath) {
  return new Promise((resolve, reject) => {
    // Adjust the path to transcribe.py relative to this file:
    const scriptPath = path.join(__dirname, "../../asr_model/transcribe.py");
    execFile("python", [scriptPath, filePath], (error, stdout, stderr) => {
      if (error) {
        console.error("Python error:", stderr);
        return reject(`Error: ${error.message}`);
      }
      if (stderr) {
        console.error("Python stderr:", stderr);
        // Optionally, you can choose to ignore stderr or log it.
      }
      try {
        // Split stdout into lines, filter out empty lines, and take the last non-empty line as JSON.
        const lines = stdout.split("\n").filter(line => line.trim() !== "");
        const jsonStr = lines[lines.length - 1];
        const result = JSON.parse(jsonStr);
        resolve(result);
      } catch (err) {
        console.error("JSON parsing error:", err);
        reject(`JSON Parsing Error: ${err.message}`);
      }
    });
  });
}

module.exports = { processAudio };
