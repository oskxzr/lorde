import os
import subprocess

def convert_srt_to_vtt(file_path):
    """Convert a .srt file to .vtt format using ffmpeg."""
    vtt_path = file_path.replace('.srt', '.vtt')

    try:
        # Run ffmpeg to convert SRT to VTT
        subprocess.run(['ffmpeg', '-i', file_path, vtt_path], check=True)
        
        print(f"Converted: {file_path} -> {vtt_path}")
    except subprocess.CalledProcessError as e:
        print(f"Error converting {file_path}: {e}")

def process_current_directory():
    """Process all .srt files in the current directory and its descendants."""
    current_directory = os.getcwd()  # Get the current working directory
    for dirpath, _, filenames in os.walk(current_directory):
        for filename in filenames:
            if filename.endswith('.srt'):
                file_path = os.path.join(dirpath, filename)
                convert_srt_to_vtt(file_path)

# Run the function
if __name__ == "__main__":
    process_current_directory()
