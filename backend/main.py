import os
import time
import httpx
from datetime import datetime
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

app = FastAPI(title="Weather Radar Backend")

# Enable CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

IMAGE_URL = "https://wx.baf.mil.bd/FTP_Folder/mtr.jpg"
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
MAX_IMAGES = 600  # 10 hours * 60 minutes

os.makedirs(DATA_DIR, exist_ok=True)

async def download_image():
    """Download the latest radar image and save it with a timestamp."""
    try:
        async with httpx.AsyncClient(verify=False) as client:
            response = await client.get(IMAGE_URL, timeout=10.0)
            response.raise_for_status()
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"mtr_{timestamp}.jpg"
            filepath = os.path.join(DATA_DIR, filename)
            
            with open(filepath, "wb") as f:
                f.write(response.content)
            
            print(f"[{datetime.now()}] Downloaded: {filename}")
            cleanup_old_images()
    except Exception as e:
        print(f"[{datetime.now()}] Error downloading image: {e}")

def cleanup_old_images():
    """Keep only the latest MAX_IMAGES in the data directory."""
    files = [f for f in os.listdir(DATA_DIR) if f.startswith("mtr_") and f.endswith(".jpg")]
    files.sort(key=lambda x: os.path.getmtime(os.path.join(DATA_DIR, x)))
    
    if len(files) > MAX_IMAGES:
        files_to_delete = files[:-MAX_IMAGES]
        for f in files_to_delete:
            try:
                os.remove(os.path.join(DATA_DIR, f))
                print(f"Deleted old image: {f}")
            except Exception as e:
                print(f"Error deleting file {f}: {e}")

@app.on_event("startup")
async def start_scheduler():
    scheduler = AsyncIOScheduler()
    scheduler.add_job(download_image, IntervalTrigger(minutes=1))
    scheduler.start()
    
    # Run once immediately on startup
    await download_image()

@app.get("/api/images")
async def get_images():
    """Return a chronological list of available images."""
    files = [f for f in os.listdir(DATA_DIR) if f.startswith("mtr_") and f.endswith(".jpg")]
    files.sort()  # Sort by filename which includes timestamp (chronological)
    return JSONResponse(content={"images": files})
