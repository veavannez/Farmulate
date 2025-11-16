from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from supabase import create_client, Client
from ultralytics import YOLO
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime
import pandas as pd
import numpy as np
import pickle, os, tempfile, requests, traceback
from jose import jwt
import asyncio
from typing import Optional

# ===============================
# Load Environment Variables
# ===============================
env_path = Path(_file_).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

if not SUPABASE_URL or not SUPABASE_KEY or not SUPABASE_JWT_SECRET:
    raise RuntimeError("Missing Supabase environment variables")

# ===============================
# Initialize FastAPI & Supabase
# ===============================
app = FastAPI(title="Soil Texture & Crop Recommendation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ===============================
# Request Schema
# ===============================
class PredictRequest(BaseModel):
    imageUrl: str = Field(..., alias="imageUrl")
    image_name: Optional[str] = None
    N: float
    P: float
    K: float
    ph: float
    pot_name: str

    class Config:
        allow_population_by_field_name = True

# ===============================
# Helper Functions
# ===============================
def verify_supabase_token(token: str) -> str:
    try:
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], options={"verify_aud": False})
        return payload["sub"]
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

# ===============================
# Load Models & Data
# ===============================
base_dir = Path(_file_).resolve().parent / "model"

# YOLO model for soil detection (optional, for info)
yolo_model = YOLO(str(base_dir / "best.pt"))

# XGB model for crop recommendation
with open(base_dir / "model.pkl", "rb") as f:
    xgb_model = pickle.load(f)

# Label encoder
with open(base_dir / "label_encoder.pkl", "rb") as f:
    le_label = pickle.load(f)

# Companion & avoid crop data
records_df = pd.read_excel(base_dir / "avoidcrop.xlsx", engine="openpyxl")
records_df.columns = records_df.columns.str.strip()
records_df = records_df.dropna(subset=["Crops"])
records_df["Crops"] = records_df["Crops"].str.strip().str.lower()

companion_crops = {
    row["Crops"]: [c.strip().lower() for c in str(row.get("Helps", "")).split(",") if c.strip()]
    for _, row in records_df.iterrows()
}
avoid_crops = {
    row["Crops"]: [c.strip().lower() for c in str(row.get("Avoid", "")).split(",") if c.strip()]
    for _, row in records_df.iterrows()
}

CROP_TOP_PROB_THRESHOLD = 0.70

# ===============================
# Health Check
# ===============================
@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "Soil Texture & Crop Recommendation API",
        "endpoints": {
            "/predict": "POST",
            "/docs": "GET"
        }
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# ===============================
# Predict Endpoint
# ===============================
@app.post("/predict")
async def predict(req: PredictRequest, authorization: Optional[str] = Header(None)):

    # -------------------------
    # 1️⃣ Verify Authorization
    # -------------------------
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.split(" ")[1]
    user_id = verify_supabase_token(token)

    # -------------------------
    # 2️⃣ YOLO Soil Detection (optional for info)
    # -------------------------
    try:
        response = requests.get(req.imageUrl, timeout=15)
        response.raise_for_status()
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp.write(response.content)
            tmp_path = tmp.name

        results = yolo_model.predict(tmp_path)
        result = results[0]
        if getattr(result, "probs", None) is None:
            soil_texture = "No soil detected"
        else:
            raw = result.names[int(result.probs.top1)]
            soil_texture = raw.replace("_Trained", "").strip()

    except Exception as e:
        soil_texture = "No soil detected"
        print(f"YOLO warning: {e}")

    # -------------------------
    # 3️⃣ Crop Recommendation (XGB)
    # -------------------------
    try:
        input_features = np.array([[req.N, req.P, req.K, req.ph]])
        probs = xgb_model.predict_proba(input_features)[0]
        top_idx = int(np.argmax(probs))
        top_prob = float(probs[top_idx])
        pred_crop = le_label.inverse_transform([top_idx])[0].lower()

        if top_prob >= CROP_TOP_PROB_THRESHOLD:
            recommended_crop = pred_crop
            companions = companion_crops.get(pred_crop, [])
            avoids = avoid_crops.get(pred_crop, [])
            crop_confidence = top_prob
        else:
            recommended_crop = "no_crop"
            companions = []
            avoids = []
            crop_confidence = top_prob

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Crop prediction failed: {str(e)}")

    # -------------------------
    # 4️⃣ Save Result to Supabase
    # -------------------------
    try:
        supabase.table("soil_results").insert({
            "user_id": user_id,
            "pot_name": req.pot_name,
            "image_name": req.image_name or os.path.basename(req.imageUrl),
            "image_url": req.imageUrl,
            "prediction": soil_texture,
            "recommended_crop": recommended_crop,
            "n": req.N,
            "p": req.P,
            "k": req.K,
            "ph_level": req.ph,
            "companions": companions,
            "avoids": avoids,
            "crop_confidence": crop_confidence,
            "created_at": datetime.utcnow().isoformat()
        }).execute()
    except Exception as e:
        print(f"⚠️ Supabase insert failed: {e}")

    return {
        "soil_texture": soil_texture,
        "recommended_crop": recommended_crop,
        "companions": companions,
        "avoids": avoids,
        "confidence": crop_confidence,
        "input_values": {
            "N": req.N,
            "P": req.P,
            "K": req.K,
            "ph": req.ph
        }
    }

# ===============================
# Realtime Listener
# ===============================
async def soil_results_listener():
    channel = supabase.realtime.channel("public:soil_results")
    channel.on(
        "postgres_changes",
        {"event": "INSERT", "schema": "public", "table": "soil_results"},
        lambda payload: print("🟢 New prediction inserted:", payload["new"])
    ).subscribe()
    while True:
        await asyncio.sleep(1)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(soil_results_listener())
    print("✅ Supabase Realtime listener for 'soil_results' enabled")