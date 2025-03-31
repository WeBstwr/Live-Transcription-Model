import sounddevice as sd
import numpy as np
import wave
import os
import time
import csv

AUDIO_DIR = "audio_files"
CSV_FILE = "audio_text_pairs.csv"

if not os.path.exists(AUDIO_DIR):
    os.makedirs(AUDIO_DIR)

def record_audio(filename, duration=3, sample_rate=16000):
    print(f"🎤 Recording '{filename}' for {duration} seconds!")
    audio_data = sd.rec(int(duration * sample_rate), samplerate=sample_rate, channels=1, dtype=np.int16)
    sd.wait()  # Wait until recording is finished
    filepath = os.path.join(AUDIO_DIR, filename)
    
    with wave.open(filepath, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(audio_data.tobytes())
    
    print(f"✅ Audio saved as {filepath}")
    return filepath

def update_csv(row_index, filename, transcript):
    # Read the current CSV data
    with open(CSV_FILE, newline='', encoding="utf-8") as f:
        reader = list(csv.reader(f))
    
    # Update the specified row (assumes header row is at index 0)
    if row_index + 1 < len(reader):
        reader[row_index + 1][4] = filename    # filename column (5th column)
        reader[row_index + 1][5] = transcript    # transcript column (6th column)
    else:
        print("Row index out of range!")
        return
    
    # Write the updated CSV data back
    with open(CSV_FILE, "w", newline='', encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerows(reader)
    print("✅ CSV updated.")

def record_for_entry(row_index, transcript):
    # Create a systematic filename using the transcript and timestamp
    filename = f"{transcript.lower().replace(' ', '_')}_{int(time.time())}.wav"
    # Record the audio for the given family name
    record_audio(filename, duration=5)
    # Update the CSV row with the filename and transcription
    update_csv(row_index, filename, transcript)

if __name__ == "__main__":
    # For demonstration, record for the first entry in the CSV.
    # In practice, loop through all rows or handle one by one.
    # For example, if the first row (after header) corresponds to "Kholu":
    record_for_entry(33, "Muramwa wa chindichi")
