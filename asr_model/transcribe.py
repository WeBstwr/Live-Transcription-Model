import os
import sys
import json
import torch
import librosa
from transformers import WhisperProcessor, WhisperForConditionalGeneration

# Directory where your audio files are stored
AUDIO_DIR = "audio_files"
# Define the model directory
MODEL_DIR = "fine_tuned_whisper_model"

def load_model(model_dir=MODEL_DIR):
    if not os.path.isdir(model_dir):
        print(json.dumps({"error": f"Model directory '{model_dir}' not found."}))
        sys.exit(1)
    
    processor = WhisperProcessor.from_pretrained(model_dir)
    model = WhisperForConditionalGeneration.from_pretrained(model_dir, from_safetensors=True)
    return processor, model

def transcribe_audio(filename, processor, model, sample_rate=16000):
    file_path = os.path.join(AUDIO_DIR, filename)
    if not os.path.exists(file_path):
        print(json.dumps({"error": f"File '{filename}' not found in {AUDIO_DIR}"}))
        return None
    
    waveform, _ = librosa.load(file_path, sr=sample_rate)
    inputs = processor(waveform, return_tensors="pt", sampling_rate=sample_rate)
    
    with torch.no_grad():
        predicted_ids = model.generate(**inputs, task="transcribe")
    transcription = processor.batch_decode(predicted_ids, skip_special_tokens=True)[0]
    print("✅ Transcription:", transcription)
    
    with torch.no_grad():
        predicted_ids_translation = model.generate(**inputs, task="translate", language="en")
    translation = processor.batch_decode(predicted_ids_translation, skip_special_tokens=True)[0]
    print("✅ Translation (English):", translation)
    
    result = {"transcription": transcription, "translation": translation}
    print(json.dumps(result, indent=2))
    return result

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No filename provided"}))
        sys.exit(1)
    
    filename = sys.argv[1]
    processor, model = load_model()
    transcribe_audio(filename, processor, model)
