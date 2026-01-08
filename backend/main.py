from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import shutil
import uuid
from pdf_processor import extract_images_from_pdf
from video_generator import create_video_from_images

app = FastAPI()

# Enable CORS for Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development, allow all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create directories
UPLOAD_DIR = "uploads"
PROCESSED_IMAGES_DIR = "processed_images"
OUTPUT_VIDEO_DIR = "output_videos"

for directory in [UPLOAD_DIR, PROCESSED_IMAGES_DIR, OUTPUT_VIDEO_DIR]:
    if not os.path.exists(directory):
        os.makedirs(directory)

# Mount static files to serve generated videos
app.mount("/videos", StaticFiles(directory=OUTPUT_VIDEO_DIR), name="videos")

@app.post("/generate-video")
async def generate_video(
    file: UploadFile = File(...),
    duration: float = Form(...),
    transition: str = Form("none"),
    transition_duration: float = Form(1.0)
):
    # Generare unique ID for this request
    request_id = str(uuid.uuid4())
    
    # 1. Save uploaded PDF
    pdf_filename = f"{request_id}.pdf"
    pdf_path = os.path.join(UPLOAD_DIR, pdf_filename)
    with open(pdf_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # 2. Extract Images
    images_output_folder = os.path.join(PROCESSED_IMAGES_DIR, request_id)
    image_paths = extract_images_from_pdf(pdf_path, images_output_folder)
    
    if not image_paths:
        return {"error": "No images found in the PDF"}
        
    # 3. Generate Video
    video_filename = f"{request_id}.mp4"
    output_video_path = os.path.join(OUTPUT_VIDEO_DIR, video_filename)
    
    # Ensure transition duration is safe (must be less than slide duration)
    safe_transition_duration = min(transition_duration, duration - 0.1)
    if safe_transition_duration < 0: safe_transition_duration = 0
    
    create_video_from_images(image_paths, output_video_path, duration, transition, safe_transition_duration)
    
    # 4. Return video URL
    base_url = os.getenv("RENDER_EXTERNAL_URL", "http://localhost:8000")
    video_url = f"{base_url}/videos/{video_filename}"
    
    return {
        "video_url": video_url, 
        "message": "Video generated successfully",
        "image_count": len(image_paths)
    }

@app.get("/")
def read_root():
    return {"message": "PDF to Video Converter API Ready"}
