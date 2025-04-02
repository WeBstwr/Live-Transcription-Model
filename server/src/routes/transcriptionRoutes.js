// server/src/routes/transcriptionRoutes.js
const express = require("express");
const router = express.Router();
const client = require("../config/db");

// GET all transcriptions
router.get("/", async (req, res) => {
  try {
    const result = await client.query("SELECT * FROM audio_transcriptions ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching transcriptions:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET a transcription by ID
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await client.query("SELECT * FROM audio_transcriptions WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Transcription not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching transcription:", err.message);
    res.status(500).json({ error: err.message });
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
  } catch (err) {
    console.error("Error adding transcription:", err.message);
    res.status(500).json({ error: err.message });
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
  } catch (err) {
    console.error("Error updating transcription:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE a transcription by ID
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await client.query("DELETE FROM audio_transcriptions WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Transcription not found" });
    }
    res.json({ message: "Transcription deleted successfully", transcription: result.rows[0] });
  } catch (err) {
    console.error("Error deleting transcription:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
