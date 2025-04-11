const express = require("express");
const router = express.Router();
const client = require("../config/db");
const path = require("path");
const fs = require("fs");

// Get all transcriptions
router.get("/", async (req, res) => {
  try {
    // Only get transcriptions from recorded audio files (not training data)
    const result = await client.query(
      "SELECT * FROM audio_transcriptions WHERE filename LIKE 'recording_%' ORDER BY id ASC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching transcriptions:", error);
    res.status(500).json({ error: "Failed to fetch transcriptions" });
  }
});

// Get a specific transcription by filename
router.get("/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    const result = await client.query(
      "SELECT * FROM audio_transcriptions WHERE filename = $1",
      [filename]
    );

    if (result.rows.length === 0) {
      // Return 202 if the transcription is still processing
      return res.status(202).json({
        status: "processing",
        message: "Transcription is still being processed"
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching transcription:", error);
    res.status(500).json({ error: "Failed to fetch transcription" });
  }
});

// POST a new transcription
router.post("/", async (req, res) => {
  try {
    const { relationship, maragoli, notes, example_sentence, filename, transcription, translation } = req.body;
    if (!filename || !transcription) {
      return res.status(400).json({ error: "Filename and transcription are required" });
    }

    const result = await client.query(
      `INSERT INTO audio_transcriptions 
      (relationship, maragoli, notes, example_sentence, filename, transcription, translation) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [relationship, maragoli, notes, example_sentence, filename, transcription, translation]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding transcription:", error);
    res.status(500).json({ error: "Failed to add transcription" });
  }
});

// PUT update an existing transcription by ID
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { relationship, maragoli, notes, example_sentence, filename, transcription, translation } = req.body;
  try {
    const result = await client.query(
      `UPDATE audio_transcriptions 
       SET relationship = $1, maragoli = $2, notes = $3, example_sentence = $4, filename = $5, transcription = $6, translation = $7 
       WHERE id = $8 RETURNING *`,
      [relationship, maragoli, notes, example_sentence, filename, transcription, translation, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Transcription not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating transcription:", error);
    res.status(500).json({ error: "Failed to update transcription" });
  }
});

// Delete a transcription by filename
router.delete("/:filename", async (req, res) => {
  try {
    const { filename } = req.params;

    // Only allow deletion of recorded audio files (not training data)
    if (!filename.startsWith('recording_')) {
      return res.status(403).json({ error: "Cannot delete training data" });
    }

    const result = await client.query(
      "DELETE FROM audio_transcriptions WHERE filename = $1 RETURNING *",
      [filename]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Transcription not found" });
    }

    // Delete the audio file if it exists
    const audioPath = path.join(__dirname, "../../asr_model/audio_files", filename);
    if (fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
    }

    res.json({ message: "Transcription deleted successfully" });
  } catch (error) {
    console.error("Error deleting transcription:", error);
    res.status(500).json({ error: "Failed to delete transcription" });
  }
});

module.exports = router;
