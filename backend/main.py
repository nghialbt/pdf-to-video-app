from fastapi import FastAPI, File, UploadFile, Form, WebSocket, WebSocketDisconnect
from fastapi.concurrency import run_in_threadpool
from typing import List, Dict
import asyncio
from proglog import ProgressBarLogger
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

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]

    async def send_personal_message(self, message: str, client_id: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_text(message)

manager = ConnectionManager()

# Custom Logger for MoviePy
class ProgressLogger(ProgressBarLogger):
    def __init__(self, client_id, loop):
        super().__init__(init_state=None, bars=None, ignored_bars=None,
                         logged_bars='all', min_time_interval=0, ignore_bars_under=0)
        self.client_id = client_id
        self.loop = loop
        self.last_percentage = -1

    def bars_callback(self, bar, attr, value, old_value=None):
        if bar == 't' and attr == 'index':
            total = self.state['bars'][bar]['total']
            if total > 0:
                percentage = int((value / total) * 100)
                if percentage != self.last_percentage:
                    self.last_percentage = percentage
                    asyncio.run_coroutine_threadsafe(
                        manager.send_personal_message(f"progress:{percentage}", self.client_id),
                        self.loop
                    )

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(client_id)


@app.post("/generate-video")
async def generate_video(
    file: UploadFile = File(...),
    duration: float = Form(...),
    transition: str = Form("none"),
    transition_duration: float = Form(1.0),
    quality: str = Form("low"),
    client_id: str = Form(None)
):
    # Split transitions if multiple are provided (comma separated)
    transition_list = [t.strip() for t in transition.split(",")] if "," in transition else transition
    # Generare unique ID for this request
    request_id = str(uuid.uuid4())
    
    # 1. Save uploaded PDF
    pdf_filename = f"{request_id}.pdf"
    pdf_path = os.path.join(UPLOAD_DIR, pdf_filename)
    with open(pdf_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # 2. Extract Images
    images_output_folder = os.path.join(PROCESSED_IMAGES_DIR, request_id)
    should_resize = (quality == "low")
    image_paths = extract_images_from_pdf(pdf_path, images_output_folder, resize=should_resize)
    
    if not image_paths:
        return {"error": "No images found in the PDF"}
        
    # 3. Generate Video
    video_filename = f"{request_id}.mp4"
    output_video_path = os.path.join(OUTPUT_VIDEO_DIR, video_filename)
    
    # Ensure transition duration is safe (must be less than slide duration)
    safe_transition_duration = min(transition_duration, duration - 0.1)
    if safe_transition_duration < 0: safe_transition_duration = 0
    
    # Setup logger if client_id is provided
    logger = "bar"
    if client_id:
        loop = asyncio.get_running_loop()
        logger = ProgressLogger(client_id, loop)
    
    # Run video generation in a separate thread to avoid blocking the event loop
    from fastapi.concurrency import run_in_threadpool
    await run_in_threadpool(create_video_from_images, image_paths, output_video_path, duration, transition_list, safe_transition_duration, logger=logger)
    
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
