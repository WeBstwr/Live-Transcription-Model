import React, { useState, useEffect } from "react";
import "./Dashboard.css";

const Dashboard = () => {
    const [realTimeTranscript, setRealTimeTranscript] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentChunk, setCurrentChunk] = useState(0);
    const [chunks, setChunks] = useState([]);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [currentFile, setCurrentFile] = useState(null);
    const [transcription, setTranscription] = useState("");
    const [translation, setTranslation] = useState("");
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const [storedFiles, setStoredFiles] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);

    // Fetch stored files on component mount
    useEffect(() => {
        fetchStoredFiles();
    }, []);

    const fetchStoredFiles = async () => {
        try {
            console.log("Fetching stored files...");
            // Add timestamp to force fresh data
            const timestamp = new Date().getTime();
            const response = await fetch(`http://localhost:5000/api/transcriptions?t=${timestamp}`, {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });

            console.log("Response status:", response.status);

            if (!response.ok) {
                throw new Error('Failed to fetch stored files');
            }

            const data = await response.json();
            console.log("Raw response data:", data);

            if (Array.isArray(data)) {
                console.log("Number of files:", data.length);
                if (data.length > 0) {
                    console.log("First file:", data[0]);
                }
            } else {
                console.log("Data is not an array:", typeof data);
            }

            setStoredFiles(data);
        } catch (error) {
            console.error('Error fetching stored files:', error);
            setError('Failed to load stored files');
        }
    };

    const handleFileClick = async (file) => {
        try {
            // Prevent event bubbling
            event.preventDefault();
            event.stopPropagation();

            // Log the file data to verify structure
            console.log("File data:", file);

            // Verify the file has the required properties
            if (!file || !file.transcription || !file.translation) {
                console.error("Invalid file data:", file);
                setError("Invalid file data");
                return;
            }

            // Update states
            setSelectedFile(file);
            setTranscription(file.transcription);
            setTranslation(file.translation);
            setRealTimeTranscript(file.transcription);
            setMessage(`Selected file: ${file.filename}`);

            // Force a re-render
            setStoredFiles(prev => [...prev]);

        } catch (error) {
            console.error('Error in handleFileClick:', error);
            setError('Failed to load file details');
        }
    };

    const startRecording = async () => {
        try {
            console.log("Starting recording...");
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Check supported MIME types
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm';

            console.log("Using MIME type:", mimeType);

            const recorder = new MediaRecorder(stream, {
                mimeType: mimeType,
                audioBitsPerSecond: 128000
            });

            const chunks = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    console.log("Received chunk, size:", e.data.size);
                    chunks.push(e.data);
                    setChunks(chunks);
                }
            };

            recorder.onstop = async () => {
                console.log("Recording stopped, processing final audio...");
                // Create a single blob from all chunks with the correct MIME type
                const blob = new Blob(chunks, { type: mimeType });
                console.log("Created blob:", {
                    size: blob.size,
                    type: blob.type
                });
                await uploadAudio(blob, mimeType);
                setIsRecording(false);
                setIsProcessing(true);
            };

            // Start recording with 1-second chunks
            recorder.start(1000);
            setMediaRecorder(recorder);
            setIsRecording(true);
            setIsProcessing(false);
            console.log("Recording started successfully");
        } catch (error) {
            console.error("Error accessing microphone:", error);
            setError("Failed to access microphone");
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && isRecording) {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
        }
    };

    const uploadAudio = async (blob, mimeType) => {
        try {
            console.log("Uploading audio with details:", {
                blobSize: blob.size,
                blobType: blob.type,
                mimeType: mimeType
            });

            const formData = new FormData();
            formData.append("audio", blob, "recording.webm");

            // Log FormData contents
            for (let pair of formData.entries()) {
                console.log("FormData entry:", pair[0], pair[1]);
            }

            const response = await fetch("http://localhost:5000/api/record", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Upload error:", errorData.error);
                throw new Error(errorData.error || "Failed to upload audio");
            }

            const data = await response.json();
            console.log("Upload response:", data);

            if (data.filename) {
                setCurrentFile(data.filename);
                setMessage("Recording uploaded successfully. Processing transcription...");
                await pollTranscriptionStatus(data.filename);
            } else {
                throw new Error("No filename received from server");
            }
        } catch (error) {
            console.error("Error uploading audio:", error);
            setError(error.message || "Failed to upload audio");
        }
    };

    // Add polling function to check transcription status
    const pollTranscriptionStatus = async (filename) => {
        try {
            const response = await fetch(`http://localhost:5000/api/transcriptions/${filename}`);
            const data = await response.json();
            console.log("Transcription status:", data);

            if (response.status === 202) {
                // Still processing, poll again in 2 seconds
                console.log("Transcription still processing, polling again...");
                setTimeout(() => pollTranscriptionStatus(filename), 2000);
                return;
            }

            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch transcription status");
            }

            if (data.transcription && data.transcription !== "Processing...") {
                console.log("Received final transcription:", data.transcription);
                setTranscription(data.transcription);
                setIsProcessing(false);
            } else if (data.transcription === "Error processing audio file") {
                console.error("Transcription error:", data.transcription);
                setError("Failed to process audio file");
                setIsProcessing(false);
            } else {
                // Still processing, poll again in 2 seconds
                console.log("Transcription still processing, polling again...");
                setTimeout(() => pollTranscriptionStatus(filename), 2000);
            }
        } catch (error) {
            console.error("Error polling transcription status:", error);
            setError("Failed to check transcription status");
            setIsProcessing(false);
        }
    };

    return (
        <div className="dashboard">
            <h1>Live Transcription Dashboard</h1>

            <div className="controls">
                <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={isRecording ? "stop" : "start"}
                >
                    {isRecording ? "Stop Recording" : "Start Recording"}
                </button>
            </div>

            <div className="transcription-section">
                <h2>Transcription</h2>
                <div className="transcript-box">
                    {transcription || realTimeTranscript || "Start speaking to see real-time transcription..."}
                </div>

                {translation && (
                    <div className="translation-section">
                        <h3>Translation</h3>
                        <div className="transcript-box">
                            {translation}
                        </div>
                    </div>
                )}
            </div>

            {isProcessing && (
                <div className="processing-message">
                    Processing final transcription...
                </div>
            )}

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {message && (
                <div className="success-message">
                    {message}
                </div>
            )}

            <div className="stored-files">
                <h2>Stored Files</h2>
                <div className="files-list">
                    {storedFiles && storedFiles.map((file) => (
                        <div
                            key={file.id}
                            className={`file-item ${selectedFile?.id === file.id ? 'selected' : ''}`}
                            onClick={(e) => handleFileClick(file)}
                            style={{
                                cursor: 'pointer',
                                padding: '10px',
                                margin: '5px',
                                border: '1px solid #ddd',
                                borderRadius: '4px'
                            }}
                        >
                            <div className="file-header">
                                <span className="filename">{file.filename}</span>
                                <span className="date">
                                    {new Date(file.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="file-content">
                                <div className="preview-section">
                                    <strong>Transcription:</strong> {file.transcription}
                                </div>
                                <div className="preview-section">
                                    <strong>Translation:</strong> {file.translation}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Dashboard; 