import os
import logging
import shutil
import subprocess
from pathlib import Path

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# List of required DLL files for FFmpeg
REQUIRED_FILES = [
    'ffmpeg.exe',
    'avcodec-60.dll',
    'avdevice-60.dll',
    'avfilter-9.dll',
    'avformat-60.dll',
    'avutil-58.dll',
    'postproc-57.dll',
    'swresample-4.dll',
    'swscale-9.dll'
]

def verify_ffmpeg_files():
    """Verify that all required FFmpeg files are present and accessible."""
    script_dir = Path(os.path.dirname(os.path.abspath(__file__)))
    ffmpeg_dir = script_dir / 'ffmpeg'
    
    logger.info(f"Checking FFmpeg directory: {ffmpeg_dir}")
    
    if not ffmpeg_dir.exists():
        logger.error(f"FFmpeg directory not found at: {ffmpeg_dir}")
        return False
        
    missing_files = []
    existing_files = []
    
    for required_file in REQUIRED_FILES:
        file_path = ffmpeg_dir / required_file
        if not file_path.exists():
            missing_files.append(required_file)
        else:
            try:
                size = file_path.stat().st_size
                existing_files.append(f"{required_file} ({size:,} bytes)")
            except Exception as e:
                logger.error(f"Error checking {required_file}: {str(e)}")
                missing_files.append(required_file)
    
    if existing_files:
        logger.info("Found files:")
        for file in existing_files:
            logger.info(f"  ✓ {file}")
    
    if missing_files:
        logger.error("Missing required files:")
        for file in missing_files:
            logger.error(f"  ✗ {file}")
        return False
    
    # Try to run ffmpeg -version to verify it works
    try:
        ffmpeg_path = str(ffmpeg_dir / 'ffmpeg.exe')
        result = subprocess.run(
            [ffmpeg_path, '-version'],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            logger.info("FFmpeg version check successful:")
            logger.info(result.stdout.split('\n')[0])  # Print first line of version info
            return True
        else:
            logger.error(f"FFmpeg version check failed with error: {result.stderr}")
            return False
    except Exception as e:
        logger.error(f"Error running FFmpeg: {str(e)}")
        return False

def setup_instructions():
    """Print instructions for setting up FFmpeg."""
    logger.info("\nTo set up FFmpeg:")
    logger.info("1. Download the shared build of FFmpeg:")
    logger.info("   https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl-shared.zip")
    logger.info("\n2. Extract the downloaded zip file")
    logger.info("\n3. Copy ALL files from the 'bin' directory to your 'asr_model/ffmpeg' directory:")
    for file in REQUIRED_FILES:
        logger.info(f"   - {file}")
    logger.info("\n4. Run this script again to verify the installation")

if __name__ == "__main__":
    logger.info("Starting FFmpeg verification...")
    if verify_ffmpeg_files():
        logger.info("All FFmpeg files are present and working correctly!")
    else:
        logger.error("FFmpeg verification failed!")
        logger.info("\n=== Setup Instructions ===")
        setup_instructions() 