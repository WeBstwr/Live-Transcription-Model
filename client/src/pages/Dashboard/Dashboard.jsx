import "./dashboard.css";
import { useState, useEffect, useRef } from "react";
import { FaMicrophone, FaMicrophoneSlash, FaRegTrashAlt } from "react-icons/fa";

const Icon = ({ icon, label, onClick, className }) => {
  return (
    <div className="icons_container" onClick={onClick}>
      <div className="icons-icon-wrapper">{icon}</div>
      {label}
    </div>
  );
};

function Dashboard() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState([]);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const streamRef = useRef(null);

  // Start recording when isRecording becomes true, and stop when it becomes false.
  useEffect(() => {
    if (isRecording) {
      // Request permission and start recording
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          streamRef.current = stream;
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          recordedChunksRef.current = [];
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              recordedChunksRef.current.push(event.data);
            }
          };
          mediaRecorder.onstop = async () => {
            const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
            const file = new File([blob], `recording_${Date.now()}.webm`, { type: 'audio/webm' });
            await uploadAudio(file);
          };
          mediaRecorder.start();
        })
        .catch((err) => {
          console.error("Error accessing microphone:", err);
        });
    } else {
      // Stop recording if in progress
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  }, [isRecording]);

  const toggleRecording = () => {
    setIsRecording((prev) => !prev);
  };

  // Function to upload audio to backend
  const uploadAudio = async (file) => {
    const formData = new FormData();
    formData.append("audio", file);
    try {
      const response = await fetch("http://localhost:5000/api/record", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error("Failed to upload audio");
      }
      const data = await response.json();
      // Append new record to recordings state so it appears in the UI
      setRecordings((prev) => [...prev, data.data]);
    } catch (error) {
      console.error("Error uploading audio:", error);
    }
  };

  return (
    <section className="dashboard">
      <div className="word-space_container">
        <div className="word-space">
          <h2>Transcript</h2>
          <div className="transcript_display">
            {recordings.length === 0 ? (
              <p>No transcript available yet.</p>
            ) : (
              recordings.map((rec) => (
                <div key={rec.id}>
                  <p><strong>Filename:</strong> {rec.filename}</p>
                  <p><strong>Transcription:</strong> {rec.transcription}</p>
                  <p><strong>Translation:</strong> {rec.translation}</p>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="microphone">
          {isRecording ? (
            <Icon
              icon={<FaMicrophoneSlash />}
              label="Stop"
              onClick={toggleRecording}
            />
          ) : (
            <Icon
              icon={<FaMicrophone />}
              label="Record"
              onClick={toggleRecording}
            />
          )}
        </div>
      </div>
      <div className="storage_container">
        <h2>Storage</h2>
        {recordings.length === 0 ? (
          <p>No recordings yet.</p>
        ) : (
          recordings.map((rec, index) => (
            <div key={rec.id} className="file">
              <p>File {index + 1}</p>
              <p><strong>{rec.filename}</strong></p>
              <p>Transcription: {rec.transcription}</p>
              <p>Translation: {rec.translation}</p>
              <div className="delete_file">
                <Icon icon={<FaRegTrashAlt className="trash-icon" />} />
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default Dashboard;
