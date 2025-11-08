# app/main.py
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from ultralytics import YOLO
from PIL import Image
import io, os, json

APP = FastAPI(title="Soil Texture Classifier (YOLOv8)")

APP.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = os.getenv("MODEL_PATH", "model/best.pt")
LABELS_PATH = os.getenv("LABELS_PATH", "model/class_labels.json")

model = None
CLASS_LABELS = {}

@APP.on_event("startup")
def load_model():
    global model, CLASS_LABELS
    # load labels
    if os.path.exists(LABELS_PATH):
        with open(LABELS_PATH, "r", encoding="utf-8") as f:
            CLASS_LABELS = json.load(f)
    else:
        CLASS_LABELS = {}

    print(f"Loading YOLO model from: {MODEL_PATH} ...")
    model = YOLO(MODEL_PATH)
    print("Model loaded.")

def pretty_label(raw_name: str) -> str:
    # Convert names like "Loamy_Trained" -> "Loamy"
    if not raw_name: return raw_name
    return raw_name.replace("_Trained", "").replace("_", " ").title()

@APP.get("/")
def root():
    return {"message": "Soil Texture Classifier API running."}

@APP.post("/predict")
async def predict(file: UploadFile = File(...), top_k: int = 1):
    """POST multipart/form-data with field `file` (image). Returns top_k predictions."""
    global model
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded.")

    try:
        img_bytes = await file.read()
        pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file.")

    # inference (imgsz tuneable). Use small imgsz like 640.
    results = model(pil_img, imgsz=640)
    r = results[0]

    detections = []
    boxes = getattr(r, "boxes", None)
    if boxes is not None and len(boxes) > 0:
        for box in boxes:
            try:
                xyxy = box.xyxy.tolist()[0]
            except Exception:
                xyxy = []
            try:
                conf = float(box.conf.tolist()[0])
            except Exception:
                conf = float(box.conf) if hasattr(box, "conf") else 0.0
            try:
                cls_idx = int(box.cls.tolist()[0])
            except Exception:
                cls_idx = int(box.cls) if hasattr(box, "cls") else None

            raw_name = CLASS_LABELS.get(str(cls_idx), None)
            detections.append({
                "class_id": cls_idx,
                "class_name": raw_name,
                "pretty_name": pretty_label(raw_name) if raw_name else None,
                "confidence": conf,
                "bbox": {"x1": xyxy[0], "y1": xyxy[1], "x2": xyxy[2], "y2": xyxy[3]} if xyxy else None
            })

        # sort by confidence desc
        detections = sorted(detections, key=lambda d: d["confidence"], reverse=True)

    # If no boxes found, possible classification-only model -> try r.probs or names (fallback)
    if not detections:
        # attempt to read r.probs or r.names
        try:
            # ultralytics classification returns r.probs maybe; this is best-effort fallback
            probs = getattr(r, "probs", None)
            names = getattr(r, "names", None)
            if probs is not None:
                # probs is tensor or list
                topk = min(int(top_k), len(probs))
                sorted_idxs = sorted(range(len(probs)), key=lambda i: float(probs[i]), reverse=True)[:topk]
                for idx in sorted_idxs:
                    raw_name = CLASS_LABELS.get(str(idx), names[idx] if names else str(idx))
                    detections.append({
                        "class_id": idx,
                        "class_name": raw_name,
                        "pretty_name": pretty_label(raw_name) if raw_name else None,
                        "confidence": float(probs[idx])
                    })
        except Exception:
            pass

    return JSONResponse({"predictions": detections[:max(1,int(top_k))], "count": len(detections)})
