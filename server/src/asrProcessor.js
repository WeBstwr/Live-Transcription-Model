// server/src/asrProcessor.js
const path = require("path");
const { execFile } = require("child_process");
const fs = require("fs");

async function processAudio(filePath) {
  return new Promise((resolve, reject) => {
    console.log("Starting audio processing for:", filePath);
    const scriptPath = path.join(__dirname, "../../asr_model/transcribe.py");

    // Convert file path to absolute path if it's not already
    const absoluteFilePath = path.resolve(filePath);
    console.log("Absolute file path:", absoluteFilePath);
    console.log("File exists:", fs.existsSync(absoluteFilePath));
    console.log("Script path:", scriptPath);
    console.log("Script exists:", fs.existsSync(scriptPath));

    // Add timeout to the process (10 minutes)
    const timeout = setTimeout(() => {
      console.error("Process timed out after 10 minutes");
      process.kill(process.pid);
      reject(new Error("Audio processing timed out after 10 minutes"));
    }, 600000); // 10 minutes

    let outputData = '';
    let errorData = '';

    // Use python3 explicitly on Windows
    const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
    console.log("Using Python command:", pythonCommand);

    // Add environment variables for better Python process handling
    const env = {
      ...process.env,
      PYTHONUNBUFFERED: '1', // Force Python to run unbuffered
      PYTHONIOENCODING: 'utf-8' // Ensure proper encoding
    };

    console.log("Starting Python process with environment:", env);

    const pythonProcess = execFile(pythonCommand, [scriptPath, absoluteFilePath], { env }, (error, stdout, stderr) => {
      clearTimeout(timeout);

      if (error) {
        console.error("Python error:", error);
        console.error("Python stderr:", stderr);
        console.error("Python stdout:", stdout);
        reject(new Error(`Python processing error: ${error.message}`));
        return;
      }

      if (stderr) {
        console.warn("Python stderr:", stderr);
      }

      try {
        // Split output into lines and filter out empty lines
        const lines = stdout.split("\n").filter(line => line.trim() !== "");

        // Find the last JSON object in the output
        const jsonLines = lines.filter(line => line.trim().startsWith('{'));
        if (jsonLines.length === 0) {
          throw new Error("No JSON output found in Python script response");
        }

        const lastJsonLine = jsonLines[jsonLines.length - 1];
        console.log("Processing last JSON output:", lastJsonLine);

        const result = JSON.parse(lastJsonLine);

        // Check if this is a status update or final result
        if (result.status === "complete" && result.result) {
          resolve(result.result);
        } else if (result.error) {
          reject(new Error(result.error));
        } else {
          reject(new Error("Unexpected output format from Python script"));
        }
      } catch (err) {
        console.error("JSON parsing error:", err);
        console.error("Raw output:", stdout);
        reject(new Error(`JSON Parsing Error: ${err.message}`));
      }
    });

    // Collect output data
    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
      console.log("Python output:", data.toString());
    });

    // Collect error data
    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
      console.error("Python error output:", data.toString());
    });

    // Handle process errors
    pythonProcess.on('error', (err) => {
      console.error("Process error:", err);
      clearTimeout(timeout);
      reject(new Error(`Process error: ${err.message}`));
    });

    // Handle process exit
    pythonProcess.on('exit', (code) => {
      console.log(`Python process exited with code ${code}`);
    });
  });
}

module.exports = { processAudio };
