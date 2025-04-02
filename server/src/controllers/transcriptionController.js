// server/src/controllers/transcriptionController.js
const db = require("../config/db");

exports.getAllTranscriptions = async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM audio_transcriptions ORDER BY id ASC");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching transcriptions:", error);
    res.status(500).json({ error: "Failed to fetch transcriptions" });
  }
};

exports.getTranscriptionByFilename = async (req, res) => {
  const { filename } = req.params;
  try {
    const result = await db.query("SELECT * FROM audio_transcriptions WHERE filename = $1", [filename]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Transcription not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching transcription:", error);
    res.status(500).json({ error: "Failed to fetch transcription" });
  }
};

exports.updateTranscription = async (req, res) => {
  const { filename, transcription, translation } = req.body;
  try {
    const result = await db.query(
      "UPDATE audio_transcriptions SET transcription = $1, translation = $2 WHERE filename = $3 RETURNING *",
      [transcription, translation, filename]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Transcription not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating transcription:", error);
    res.status(500).json({ error: "Failed to update transcription" });
  }
};
