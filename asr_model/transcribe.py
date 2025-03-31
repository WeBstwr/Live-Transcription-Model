import os
import torch
import librosa
import pandas as pd
from transformers import WhisperProcessor, WhisperForConditionalGeneration
from config import connect_db

# Define the directories and CSV file name
AUDIO_DIR = "audio_files"
CSV_FILE = "audio_text_pairs.csv" 
MODEL_DIR = "fine_tuned_whisper_model"

def load_model(model_dir=MODEL_DIR):
    """
    Load the Whisper model and processor from the given directory.
    """
    processor = WhisperProcessor.from_pretrained(model_dir)
    model = WhisperForConditionalGeneration.from_pretrained(model_dir)
    return processor, model

def transcribe_audio(filename, processor, model, sample_rate=16000):
    """
    Load an audio file, transcribe it in the source language (Luhya),
    then translate the transcription to English.
    """
    file_path = os.path.join(AUDIO_DIR, filename)
    
    if not os.path.exists(file_path):
        print(f"❌ Error: File '{filename}' not found in {AUDIO_DIR}. Skipping.")
        return None, None
    
    # Load audio
    waveform, _ = librosa.load(file_path, sr=sample_rate)
    inputs = processor(waveform, return_tensors="pt", sampling_rate=sample_rate)
    
    # Transcribe: Let the model auto-detect the language and transcribe
    with torch.no_grad():
        predicted_ids = model.generate(**inputs, task="transcribe")
    luhya_transcription = processor.batch_decode(predicted_ids, skip_special_tokens=True)[0]
    print("✅ Transcription (Luhya):", luhya_transcription)
    
    # Translate: Force the model to translate to English
    forced_decoder_ids = processor.get_decoder_prompt_ids(language="en", task="translate")
    with torch.no_grad():
        predicted_ids_translation = model.generate(**inputs, forced_decoder_ids=forced_decoder_ids, task="translate")
    english_translation = processor.batch_decode(predicted_ids_translation, skip_special_tokens=True)[0]
    print("✅ Translation (English):", english_translation)
    
    return luhya_transcription, english_translation

def update_transcription_in_db(filename, transcription, translation):
    """
    Update the database record for the given filename with the new transcription and translation.
    """
    conn = connect_db()
    if conn:
        cursor = conn.cursor()
        # Optionally, check if the record exists (omitted for brevity)
        cursor.execute(
            "UPDATE audio_transcriptions SET transcription = %s, translation = %s WHERE filename = %s",
            (transcription, translation, filename)
        )
        conn.commit()
        cursor.close()
        conn.close()
        print(f"✅ Database updated for {filename}.")
    else:
        print("❌ Database connection failed.")

def batch_transcribe():
    """
    Load the CSV dataset and reprocess each audio file in batch,
    updating the corresponding transcriptions and translations in the database.
    """
    # Load CSV file into a DataFrame
    df = pd.read_csv(CSV_FILE)
    # Filter to rows that have a non-empty filename
    df = df[df["filename"].notnull()]
    df = df.reset_index(drop=True)
    
    processor, model = load_model()
    
    # Process each entry in the CSV
    for index, row in df.iterrows():
        filename = row["filename"]
        print(f"\n🔄 Processing file: {filename} ({index+1}/{len(df)})")
        transcription, translation = transcribe_audio(filename, processor, model)
        if transcription is not None and translation is not None:
            update_transcription_in_db(filename, transcription, translation)
        else:
            print(f"⚠️ Skipping {filename} due to an error.")
    
if __name__ == "__main__":
    batch_transcribe()
