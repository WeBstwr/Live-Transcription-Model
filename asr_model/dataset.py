import sounddevice as sd
import numpy as np
import wave
import os
import time
from config import connect_db

# Directory for saving audio files
AUDIO_DIR = "audio_files"
if not os.path.exists(AUDIO_DIR):
    os.makedirs(AUDIO_DIR)

def record_audio(filename, duration=5, sample_rate=16000):
    print("🎤 Recording... Speak now for", duration, "seconds!")
    audio_data = sd.rec(int(duration * sample_rate), samplerate=sample_rate, channels=1, dtype=np.int16)
    sd.wait()  # Wait until recording is finished
    filepath = os.path.join(AUDIO_DIR, filename)
    
    with wave.open(filepath, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16-bit audio
        wf.setframerate(sample_rate)
        wf.writeframes(audio_data.tobytes())
        
    print(f"✅ Audio saved as {filepath}")
    return filepath

def save_audio_metadata(filename):
    conn = connect_db()
    if conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO audio_transcriptions (filename, transcription) VALUES (%s, %s)",
            (filename, "")
        )
        conn.commit()
        cursor.close()
        conn.close()
        print(f"✅ Metadata for {filename} saved in database.")

if __name__ == "__main__":
    # Create a unique filename based on current timestamp
    filename = f"audio_{int(time.time())}.wav"
    record_audio(filename, duration=5)  # Record for 5 seconds
    save_audio_metadata(filename)
