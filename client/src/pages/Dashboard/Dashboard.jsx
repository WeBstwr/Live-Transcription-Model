import "./dashboard.css";
import { useState, useEffect, useRef } from "react";
import { FaMicrophone, FaMicrophoneSlash, FaRegTrashAlt, FaSpinner } from "react-icons/fa";

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("");
  const [currentTranscript, setCurrentTranscript] = useState(null);
  const [currentRecording, setCurrentRecording] = useState(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const streamRef = useRef(null);

  // Fetch existing recordings when component mounts
  useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/transcriptions");
      if (response.ok) {
        const data = await response.json();
        const sortedData = data.sort((a, b) => a.id - b.id);
        setRecordings(sortedData);
      }
    } catch (error) {
      console.error("Error fetching recordings:", error);
    }
  };

  // Function to delete a recording
  const deleteRecording = async (filename) => {
    try {
      const response = await fetch(`http://localhost:5000/api/transcriptions/${filename}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setRecordings(prev => prev.filter(rec => rec.filename !== filename));
        if (currentTranscript && currentTranscript.filename === filename) {
          setCurrentTranscript(null);
        }
      } else {
        throw new Error("Failed to delete recording");
      }
    } catch (error) {
      console.error("Error deleting recording:", error);
      setProcessingStatus("Error deleting recording");
    }
  };

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

          // Create a temporary recording object
          const tempRecording = {
            id: Date.now(),
            filename: `recording_${Date.now()}.webm`,
            transcription: "Recording...",
            translation: "Processing..."
          };
          setCurrentRecording(tempRecording);
          setCurrentTranscript(tempRecording);

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              recordedChunksRef.current.push(event.data);
            }
          };

          mediaRecorder.onstop = async () => {
            const blob = new Blob(recordedChunksRef.current, { type: 'audio/wav' });
            const file = new File([blob], tempRecording.filename.replace('.webm', '.wav'), { type: 'audio/wav' });
            await uploadAudio(file);
          };

          mediaRecorder.start();
        })
        .catch((err) => {
          console.error("Error accessing microphone:", err);
          setIsRecording(false);
          setProcessingStatus("Error accessing microphone");
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
    setIsProcessing(true);
    setProcessingStatus("Uploading audio file...");
    const formData = new FormData();
    formData.append("audio", file);

    try {
      console.log("Starting upload for file:", file.name, "Type:", file.type, "Size:", file.size);
      const response = await fetch("http://localhost:5000/api/record", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Server error response:", errorData);
        throw new Error(errorData.details || errorData.error || "Failed to upload audio");
      }

      setProcessingStatus("Processing audio...");
      const data = await response.json();
      console.log("Upload successful, received data:", data);

      // Poll for results with timeout
      let attempts = 0;
      const maxAttempts = 30; // 1 minute maximum (2 seconds * 30)

      const pollInterval = setInterval(async () => {
        try {
          console.log("Polling for results... Attempt:", attempts + 1);
          const resultResponse = await fetch(`http://localhost:5000/api/transcriptions/${data.filename}`);

          if (resultResponse.status === 202) {
            // Still processing
            attempts++;
            if (attempts >= maxAttempts) {
              clearInterval(pollInterval);
              setIsProcessing(false);
              setProcessingStatus("Processing timeout. Please try again.");
              return;
            }
            return;
          }

          if (resultResponse.ok) {
            const resultData = await resultResponse.json();
            console.log("Received transcription result:", resultData);
            setRecordings(prev => {
              const newRecordings = [...prev, resultData];
              return newRecordings.sort((a, b) => a.id - b.id);
            });
            setCurrentTranscript(resultData);
            setCurrentRecording(null);
            setIsProcessing(false);
            setProcessingStatus("");
            clearInterval(pollInterval);
          } else {
            const errorData = await resultResponse.json();
            console.error("Error response from polling:", errorData);
            throw new Error(errorData.details || errorData.error || "Failed to get transcription results");
          }
        } catch (error) {
          console.error("Error polling for results:", error);
          clearInterval(pollInterval);
          setIsProcessing(false);
          setProcessingStatus("Error getting results: " + error.message);
        }
      }, 2000); // Poll every 2 seconds

    } catch (error) {
      console.error("Error uploading audio:", error);
      setIsProcessing(false);
      setProcessingStatus(error.message || "Error processing audio");
    }
  };

  return (
    <section className="dashboard">
      <div className="word-space_container">
        <div className="word-space">
          <h2>Transcript</h2>
          <div className="transcript_display">
            {currentTranscript ? (
              <div className="transcript-item">
                <p><strong>Transcription:</strong> {currentTranscript.transcription}</p>
                <p><strong>Translation:</strong> {currentTranscript.translation}</p>
              </div>
            ) : (
              <p>No transcript available yet.</p>
            )}
            {isProcessing && (
              <div className="processing-status">
                <FaSpinner className="spinner" />
                <p>{processingStatus}</p>
              </div>
            )}
          </div>
        </div>
        <div className="microphone">
          {isRecording ? (
            <Icon
              icon={<FaMicrophone />}
              label="Stop"
              onClick={toggleRecording}
            />
          ) : (
            <Icon
              icon={<FaMicrophoneSlash />}
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
              <p>Transcription: {rec.transcription}</p>
              <p>Translation: {rec.translation}</p>
              <div className="delete_file" onClick={() => deleteRecording(rec.filename)}>
                <Icon icon={<FaRegTrashAlt className="trash-icon" />} label="Delete" />
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default Dashboard;
