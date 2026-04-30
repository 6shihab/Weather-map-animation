import os
import json
import httpx
import cv2
import numpy as np
import time
from datetime import datetime
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

app = FastAPI(title="Weather Radar Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

IMAGE_URL = "https://wx.baf.mil.bd/FTP_Folder/mtr.jpg"
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
METADATA_FILE = os.path.join(DATA_DIR, "metadata.json")
MAX_IMAGES = 600 # 10 hours * 60 minutes
MAX_AGE_SECONDS = 36000 # 10 hours (in seconds)

os.makedirs(DATA_DIR, exist_ok=True)

def load_metadata():
    if os.path.exists(METADATA_FILE):
        try:
            with open(METADATA_FILE, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return []

def save_metadata(metadata):
    with open(METADATA_FILE, "w") as f:
        json.dump(metadata, f)

def process_image(filepath, prev_filepath=None):
    intensity = 0.0
    vector = {"dx": 0.0, "dy": 0.0}
    
    try:
        img = cv2.imread(filepath)
        if img is None:
            return intensity, vector
            
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        # Ranges for severe weather (reds/magentas)
        lower_red1 = np.array([0, 100, 100])
        upper_red1 = np.array([10, 255, 255])
        lower_red2 = np.array([160, 100, 100])
        upper_red2 = np.array([180, 255, 255])
        
        mask1 = cv2.inRange(hsv, lower_red1, upper_red1)
        mask2 = cv2.inRange(hsv, lower_red2, upper_red2)
        mask = cv2.bitwise_or(mask1, mask2)
        
        total_pixels = img.shape[0] * img.shape[1]
        severe_pixels = cv2.countNonZero(mask)
        intensity = min(100.0, (severe_pixels / total_pixels) * 500.0)

        # Optical Flow calculation
        if prev_filepath and os.path.exists(prev_filepath):
            prev_img = cv2.imread(prev_filepath)
            if prev_img is not None:
                prev_gray = cv2.cvtColor(prev_img, cv2.COLOR_BGR2GRAY)
                curr_gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                
                flow = cv2.calcOpticalFlowFarneback(prev_gray, curr_gray, None, 0.5, 3, 15, 3, 5, 1.2, 0)
                
                _, content_mask = cv2.threshold(curr_gray, 20, 255, cv2.THRESH_BINARY)
                
                mean_dx = np.mean(flow[..., 0][content_mask > 0])
                mean_dy = np.mean(flow[..., 1][content_mask > 0])
                
                vector["dx"] = float(mean_dx * 10) if not np.isnan(mean_dx) else 0.0
                vector["dy"] = float(mean_dy * 10) if not np.isnan(mean_dy) else 0.0

    except Exception as e:
        print(f"Error processing image: {e}")
        
    return round(intensity, 2), vector

def cleanup_old_files(metadata):
    """Clean up files explicitly older than 10 hours and keep metadata synced."""
    current_time = time.time()
    valid_metadata = []
    
    # 1. Check actual files in DATA_DIR and remove those older than 10 hours
    for filename in os.listdir(DATA_DIR):
        if filename.endswith(".jpg"):
            filepath = os.path.join(DATA_DIR, filename)
            try:
                if os.path.getmtime(filepath) < current_time - MAX_AGE_SECONDS:
                    os.remove(filepath)
                    print(f"Deleted file older than 10 hours: {filename}")
            except OSError as e:
                print(f"Error deleting old file {filename}: {e}")
                
    # 2. Rebuild metadata only with files that still exist and respect MAX_IMAGES
    for item in metadata:
        filepath = os.path.join(DATA_DIR, item["filename"])
        if os.path.exists(filepath):
            valid_metadata.append(item)
            
    # 3. Enforce sliding window max images (600 images)
    if len(valid_metadata) > MAX_IMAGES:
        removed = valid_metadata[:-MAX_IMAGES]
        valid_metadata = valid_metadata[-MAX_IMAGES:]
        for item in removed:
            try:
                os.remove(os.path.join(DATA_DIR, item["filename"]))
            except OSError:
                pass
                
    return valid_metadata

async def download_image():
    try:
        async with httpx.AsyncClient(verify=False) as client:
            response = await client.get(IMAGE_URL, timeout=10.0)
            response.raise_for_status()
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"mtr_{timestamp}.jpg"
            filepath = os.path.join(DATA_DIR, filename)
            
            with open(filepath, "wb") as f:
                f.write(response.content)
            
            metadata = load_metadata()
            prev_filepath = os.path.join(DATA_DIR, metadata[-1]["filename"]) if metadata else None
            
            intensity, vector = process_image(filepath, prev_filepath)
            
            metadata.append({
                "filename": filename,
                "timestamp": timestamp,
                "intensity": intensity,
                "vector": vector
            })
            
            metadata = cleanup_old_files(metadata)
            save_metadata(metadata)
            
            print(f"[{datetime.now()}] Downloaded & Processed: {filename} (Intensity: {intensity})")
            
    except Exception as e:
        print(f"[{datetime.now()}] Error downloading image: {e}")

@app.on_event("startup")
async def start_scheduler():
    scheduler = AsyncIOScheduler()
    scheduler.add_job(download_image, IntervalTrigger(minutes=1))
    scheduler.start()
    
    await download_image()

@app.get("/api/images")
async def get_images():
    metadata = load_metadata()
    return JSONResponse(content={"images": metadata})
