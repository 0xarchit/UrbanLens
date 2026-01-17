import os
import shutil
import uuid
from pathlib import Path
from fastapi import FastAPI, Request, File, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from ultralytics import YOLO

app = FastAPI()


BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "static/uploads"
RESULTS_DIR = BASE_DIR / "static/results"
TEMPLATES_DIR = BASE_DIR / "templates"
MODEL_PATH = BASE_DIR.parent / "urban_issues_yolov8/weights/best.pt"


UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
RESULTS_DIR.mkdir(parents=True, exist_ok=True)


app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")


templates = Jinja2Templates(directory=str(TEMPLATES_DIR))



if not MODEL_PATH.exists():
    raise FileNotFoundError(f"Trained model not found at {MODEL_PATH}. Please ensure user has trained the model.")

model = YOLO(MODEL_PATH)

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/detect")
async def detect(file: UploadFile = File(...)):
    
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = UPLOAD_DIR / unique_filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    
    
    results = model(file_path)
    
    
    
    result_filename = f"pred_{unique_filename}"
    result_path = RESULTS_DIR / result_filename
    
    
    im_array = results[0].plot()  
    
    
    from PIL import Image
    import cv2
    
    
    
    
    
    
    
    
    cv2.imwrite(str(result_path), im_array)

    return JSONResponse(content={
        "original_url": f"/static/uploads/{unique_filename}",
        "result_url": f"/static/results/{result_filename}",
        "detections": len(results[0].boxes)
    })

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
