import os
import sys
import json
import torch
import logging
import librosa
import soundfile as sf
import numpy as np
from transformers import WhisperForConditionalGeneration, WhisperProcessor
import subprocess

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def convert_webm_to_wav(webm_path, wav_path):
    """Convert WebM to WAV using ffmpeg"""
    try:
        # Get the directory of the current script
        current_dir = os.path.dirname(os.path.abspath(__file__))
        ffmpeg_path = os.path.join(current_dir, "ffmpeg", "ffmpeg.exe")
        
        # Verify ffmpeg exists
        if not os.path.exists(ffmpeg_path):
            raise Exception(f"FFmpeg not found at {ffmpeg_path}")
            
        # Construct command with proper path handling
        cmd = [
            ffmpeg_path,
            '-i', webm_path,
            '-acodec', 'pcm_s16le',
            '-ar', '16000',
            '-ac', '1',
            wav_path
        ]
        
        # Log the command being run
        logger.info(f"Running command: {' '.join(cmd)}")
        
        # Run ffmpeg command without shell=True to handle paths properly
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            logger.error(f"FFmpeg error:\n{result.stderr}")
            raise Exception(f"Failed to convert WebM to WAV: {result.stderr}")
            
        # Verify the WAV file was created
        if not os.path.exists(wav_path):
            raise Exception(f"WAV file was not created at {wav_path}")
            
        logger.info(f"Successfully converted {webm_path} to {wav_path}")
        return wav_path
        
    except Exception as e:
        logger.error(f"Error converting WebM to WAV: {str(e)}")
        raise

def load_audio(file_path):
    """Load audio file using multiple methods with fallback"""
    try:
        # First check if it's a WebM file
        if file_path.endswith('.webm'):
            logger.info("Detected WebM file, converting to WAV first")
            wav_path = file_path.replace('.webm', '.wav')
            file_path = convert_webm_to_wav(file_path, wav_path)
        elif not file_path.endswith('.wav'):
            raise ValueError(f"Unsupported audio format: {file_path}")
        
        # Try loading with librosa
        logger.info(f"Attempting to load audio with librosa: {file_path}")
        audio, sr = librosa.load(file_path, sr=16000)
        logger.info(f"Successfully loaded audio with librosa, sample rate: {sr}")
        return audio, sr
    except Exception as e:
        logger.warning(f"Librosa failed to load audio: {str(e)}")
        
        try:
            # Try soundfile
            logger.info("Attempting to load audio with soundfile")
            audio, sr = sf.read(file_path)
            if len(audio.shape) > 1:
                logger.info("Converting stereo to mono")
                audio = np.mean(audio, axis=1)
            if sr != 16000:
                logger.info(f"Resampling from {sr} to 16000 Hz")
                audio = librosa.resample(audio, orig_sr=sr, target_sr=16000)
                sr = 16000
            logger.info(f"Successfully loaded audio with soundfile, sample rate: {sr}")
            return audio, sr
        except Exception as e:
            logger.error(f"Soundfile failed to load audio: {str(e)}")
            
            try:
                # Try audioread as last resort
                logger.info("Attempting to load audio with audioread")
                import audioread
                with audioread.audio_open(file_path) as f:
                    audio = np.zeros(f.duration * f.samplerate)
                    for i, block in enumerate(f):
                        audio[i * f.samplerate:(i + 1) * f.samplerate] = block
                sr = f.samplerate
                if sr != 16000:
                    logger.info(f"Resampling from {sr} to 16000 Hz")
                    audio = librosa.resample(audio, orig_sr=sr, target_sr=16000)
                    sr = 16000
                logger.info(f"Successfully loaded audio with audioread, sample rate: {sr}")
                return audio, sr
            except Exception as e:
                logger.error(f"All audio loading methods failed: {str(e)}")
                raise Exception(f"Failed to load audio file: {str(e)}")

def transcribe_audio(audio_path):
    try:
        # Verify file exists
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")
            
        # Load the audio file
        logger.info(f"Loading audio file: {audio_path}")
        audio, sr = load_audio(audio_path)
        
        # Verify audio data
        if len(audio) == 0:
            raise ValueError("Audio file is empty")
            
        # Load the fine-tuned Whisper model and processor
        logger.info("Loading fine-tuned Whisper model and processor...")
        model_path = os.path.join(os.path.dirname(__file__), "fine_tuned_whisper_model")
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Fine-tuned model not found at: {model_path}")
            
        processor = WhisperProcessor.from_pretrained(model_path)
        model = WhisperForConditionalGeneration.from_pretrained(model_path)
        
        # Process the audio
        logger.info("Processing audio...")
        input_features = processor(audio, sampling_rate=sr, return_tensors="pt").input_features
        
        # Generate transcription
        predicted_ids = model.generate(input_features)
        transcription = processor.batch_decode(predicted_ids, skip_special_tokens=True)[0]
        
        logger.info("Transcription completed successfully")
        return {"transcription": transcription}
        
    except Exception as e:
        logger.error(f"Error during transcription: {str(e)}")
        return {"error": str(e)}

def process_audio_chunk(audio_path):
    """Process a single audio chunk for real-time transcription."""
    try:
        # Load the audio chunk
        audio, sr = load_audio(audio_path)
        
        # Transcribe the chunk
        transcription = transcribe_audio(audio)
        
        return {
            "transcription": transcription,
            "error": None
        }
    except Exception as e:
        logging.error(f"Error processing audio chunk: {str(e)}")
        return {
            "transcription": "",
            "error": str(e)
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No audio file path provided"}))
        sys.exit(1)

    audio_path = sys.argv[1]
    
    try:
        # Process the audio file
        result = transcribe_audio(audio_path)
        print(json.dumps(result))
        sys.exit(0 if not result.get("error") else 1)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
