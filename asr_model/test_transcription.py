import os
import logging
import json
from transcribe import transcribe_audio

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_full_pipeline():
    try:
        # Get the directory where this script is located
        script_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Path to the test WebM file
        input_file = os.path.join(script_dir, "audio_files", "recording_1743686916132.webm")
        
        logger.info(f"Starting full transcription pipeline test...")
        logger.info(f"Input file: {input_file}")
        
        # Run the transcription
        result = transcribe_audio(input_file)
        
        # Log the results
        if "error" in result:
            logger.error(f"Transcription failed: {result['error']}")
            return False
        else:
            logger.info("Transcription successful!")
            logger.info(f"Transcription: {result['transcription']}")
            return True
            
    except Exception as e:
        logger.error(f"Error in test pipeline: {str(e)}")
        return False

if __name__ == "__main__":
    logger.info("Starting full transcription pipeline test...")
    success = test_full_pipeline()
    if success:
        logger.info("Test completed successfully!")
    else:
        logger.error("Test failed!") 