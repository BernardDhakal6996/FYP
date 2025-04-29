from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import cv2
import numpy as np
from PIL import Image
import io
import logging
from typing import Annotated
from ultralytics import YOLO
import pyttsx3
import threading
from collections import defaultdict

"""initialising the fast api"""
app = FastAPI(title="Object Detection API")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

"""cors configuration for accessing files"""
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

"""loading the yolo model """
model = YOLO("yolov8x.pt")
CONFIDENCE_THRESHOLD = 0.2

"""initialise the tts"""
try:
    engine = pyttsx3.init()
    engine.setProperty('rate', 150)
except Exception as e:
    logger.warning(f"Failed to initialize TTS engine: {str(e)}")
    engine = None

tts_lock = threading.Lock()



"""function call with tts lock"""
def speak_text(text: str):
    """Helper function for text-to-speech"""
    if not engine:
        return
    with tts_lock:
        try:
            engine.say(text)
            engine.runAndWait()
        except Exception as e:
            logger.error(f"TTS error: {str(e)}")



def detect_objects(image: np.ndarray):
    """Perform object detection on the image"""
    detections = defaultdict(int)
    annotated = image.copy()

    results = model(image, verbose=False)
    if results and results[0].boxes:
        boxes = results[0].boxes
        class_names = results[0].names

        for box in boxes:
            conf = float(box.conf[0])
            if conf >= CONFIDENCE_THRESHOLD:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                class_id = int(box.cls[0])
                name = class_names.get(class_id, "Unknown")
                detections[name] += 1

                label = f"{name}: {conf:.2f}"
                cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)
                (w, h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
                cv2.rectangle(annotated, (x1, y1 - h - 10), (x1 + w, y1), (0, 255, 0), cv2.FILLED)
                cv2.putText(annotated, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)

    return annotated, dict(detections)

@app.post("/detect/")
async def detect_objects_api(
    file: Annotated[UploadFile, File(description="Image file to process")],
    tts: Annotated[bool, Form()] = False
):
    """
    Process uploaded image and return detection results.
    Set tts=true to enable text-to-speech of detected objects.
    """
    try:
        if not file:
            raise HTTPException(status_code=400, detail="No file uploaded")
            
        logger.info(f"Processing file: {file.filename}")
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Empty file received")
        try:
            pil_image = Image.open(io.BytesIO(contents))
            if pil_image.mode != 'RGB':
                pil_image = pil_image.convert('RGB')
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid image file: {str(e)}"
            )
        image_np = np.array(pil_image)
        image_cv = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)
        processed_image, objects = detect_objects(image_cv)
        if tts and engine and objects:
            tts_text = "Detected: " + ", ".join(
                f"{v} {k}{'s' if v > 1 else ''}" 
                for k, v in objects.items()
            )
            threading.Thread(target=speak_text, args=(tts_text,)).start()

        """encoding part is done here """
        success, buffer = cv2.imencode(".jpg", processed_image)
        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to encode result image"
            )

        return StreamingResponse(
            io.BytesIO(buffer.tobytes()),
            media_type="image/jpeg",
            headers={"X-Detected-Objects": str(objects)}
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Processing error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@app.get("/test/")
async def test_connection():
    """Test endpoint to verify server is running"""
    return {"status": "ok", "message": "Server is running"}

@app.get("/")
async def root():
    """Root endpoint with basic information"""
    return {
        "message": "Object Detection API",
        "endpoints": {
            "/test": "Check server status",
            "/detect": "POST endpoint for object detection"
        }
    }