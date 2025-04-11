const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { spawn } = require("child_process");
const client = require("../config/db");
const fs = require("fs");

const projectRoot = path.join(__dirname, "../../..");

const audioFilesDir = path.join(projectRoot, "asr_model", "audio_files");
if (!fs.existsSync(audioFilesDir)) {
  fs.mkdirSync(audioFilesDir, { recursive: true });
}

// Configure multer for audio file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, audioFilesDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    // Always use .webm extension
    const filename = `recording_${timestamp}.webm`;
    cb(null, filename);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log("Received file:", {
      originalname: file.originalname,
      mimetype: file.mimetype
    });

    // Temporarily accept both WebM and WAV
    if (file.mimetype === 'audio/webm' ||
      file.mimetype === 'audio/webm;codecs=opus' ||
      file.mimetype === 'audio/wav' ||
      file.mimetype === 'audio/x-wav') {
      cb(null, true);
    } else {
      console.error("Rejected file type:", file.mimetype);
      cb(new Error('Only WebM and WAV audio files are allowed'));
    }
  }
});

// Error handling middleware
const handleError = (err, req, res, next) => {
  console.error('Error:', err);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: "File upload error", details: err.message });
  }
  res.status(500).json({ error: "Server error", details: err.message });
};

// POST /api/record - Handle audio file upload and transcription
router.post("/", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file uploaded" });
    }

    const filename = req.file.filename;
    const filePath = path.join(audioFilesDir, filename);
    console.log("Processing file:", {
      path: filePath,
      size: req.file.size,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname
    });

    // Verify file exists and has content
    if (!fs.existsSync(filePath)) {
      throw new Error("File was not saved properly");
    }

    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      throw new Error("File is empty");
    }

    console.log("File stats:", {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime
    });

    // Process the file with Python script
    const pythonScript = path.join(projectRoot, "asr_model", "transcribe.py");
    const pythonPath = process.env.PYTHON_PATH || "python";

    console.log("Starting Python process with:", {
      script: pythonScript,
      file: filePath,
      python: pythonPath
    });

    const pythonProcess = spawn(pythonPath, [pythonScript, filePath], {
      env: { ...process.env, PYTHONUNBUFFERED: "1" }
    });

    let transcriptionOutput = "";
    let errorOutput = "";

    pythonProcess.stdout.on("data", (data) => {
      transcriptionOutput += data.toString();
      console.log("Transcription output:", data.toString());
    });

    pythonProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
      console.error("Transcription error:", data.toString());
    });

    pythonProcess.on("close", async (code) => {
      console.log("Python process exited with code:", code);
      if (code !== 0) {
        console.error("Transcription failed:", errorOutput);
        return res.status(500).json({ error: "Failed to transcribe audio" });
      }

      try {
        const transcriptionData = JSON.parse(transcriptionOutput);
        if (transcriptionData.error) {
          throw new Error(transcriptionData.error);
        }

        // Store transcription in database
        const query = `
          INSERT INTO audio_transcriptions (filename, transcription, translation)
          VALUES ($1, $2, $3)
          RETURNING id
        `;
        const values = [filename, transcriptionData.transcription, transcriptionData.translation];
        const result = await client.query(query, values);

        res.json({
          filename,
          transcription: transcriptionData.transcription,
          translation: transcriptionData.translation
        });
      } catch (error) {
        console.error("Error processing transcription:", error);
        res.status(500).json({ error: "Failed to process transcription" });
      }
    });
  } catch (error) {
    console.error("Error handling audio file:", error);
    res.status(500).json({ error: "Failed to process audio file" });
  }
});

// Apply error handling middleware
router.use(handleError);

module.exports = router;
