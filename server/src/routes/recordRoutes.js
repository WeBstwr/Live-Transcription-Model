// server/src/routes/recordRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { processAudio } = require("../asrProcessor");
const client = require("../config/db");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../../../asr_model/audio_files"));
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${path.basename(file.originalname, ext)}_${timestamp}${ext}`);
  }
});
const upload = multer({ storage });

// POST endpoint to receive and process a single audio file
router.post("/", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file uploaded" });
    }
    const filePath = req.file.path;
    console.log("Received file:", filePath);

    // Process the audio file with ASR (transcription and translation)
    const { transcription, translation } = await processAudio(filePath);
    const finalTranscription = transcription || "Not transcribed";
    const finalTranslation = translation || "Not translated";

    // Insert the record into the database
    const result = await client.query(
      `INSERT INTO audio_transcriptions (filename, transcription, translation)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.file.filename, finalTranscription, finalTranslation]
    );

    res.status(201).json({
      message: "Audio processed and saved successfully",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Error processing audio:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
