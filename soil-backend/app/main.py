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
env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

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
# Required Columns
# ===============================
REQUIRED_COLUMNS = [
    "user_id", "pot_name", "image_name", "image_url",
    "prediction", "recommended_crop", "crop_confidence",
    "n", "p", "k", "ph_level",
    "companions", "avoids",
    "created_at"
]

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
def convert_mgkg_to_kgha(N_mgkg, P_mgkg, K_mgkg, soil_type):
    bd_values = {"sandy": 1.6, "loamy": 1.3, "clay": 1.15, "silt": 1.25}
    soil_type = soil_type.lower()
    if soil_type not in bd_values:
        raise ValueError(f"Invalid soil type: {soil_type}")
    bulk_density = bd_values[soil_type]
    soil_mass = bulk_density * 30 * 1e5
    N = N_mgkg * (soil_mass / 1e6)
    P = P_mgkg * (soil_mass / 1e6)
    K = K_mgkg * (soil_mass / 1e6)
    return N, P, K

def verify_supabase_token(token: str) -> str:
    try:
        payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], options={"verify_aud": False})
        return payload["sub"]
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

# ===============================
# Load Models & Data
# ===============================
base_dir = Path(__file__).resolve().parent / "model"

yolo_model = YOLO(str(base_dir / "best.pt"))

with open(base_dir / "model.pkl", "rb") as f:
    xgb_model = pickle.load(f)
try:
    n_features = getattr(xgb_model, "n_features_in_", None)
    print(f"✅ XGBoost model loaded. Expected input features: {n_features}")
    if n_features != 8:
        raise RuntimeError(f"❌ XGBoost model expects {n_features} features, but 8 are required. Please retrain or check model.")
except Exception as e:
    print(f"❌ Error validating XGBoost model input features: {e}")
    raise

with open(base_dir / "label_encoder.pkl", "rb") as f:
    le_label = pickle.load(f)

with open(base_dir / "soil_encoder.pkl", "rb") as f:
    soil_encoder = pickle.load(f)

data = pd.read_csv(base_dir / "reccocrop.csv")

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

# ===============================
# Detection thresholds
# ===============================
CROP_TOP_PROB_THRESHOLD = 0.5 
NPK_MIN = 0
NPK_MAX = 500
PH_MIN = 3.5
PH_MAX = 9.5

# Explicit mapping from YOLO labels to encoder categories
YOLO_TO_ENCODER = {
    "Clay": "Clay",
    "clay": "Clay",
    "Loamy": "Loamy",
    "loamy": "Loamy",
    "Sandy": "Sandy",
    "sandy": "Sandy",
    "Silt": "Silt",
    "silt": "Silt",
}

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
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.split(" ")[1]
    user_id = verify_supabase_token(token)

    # ------------ YOLO INFERENCE ------------
    soil_encoded = None  # Initialize for later use
    
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
            recommended_crop = "no_crop"
            companions = []
            avoids = []
            crop_confidence = None
            N, P, K = req.N, req.P, req.K
            return {
                "soil_texture": soil_texture,
                "recommended_crop": recommended_crop,
                "companions": companions,
                "avoids": avoids,
                "confidence": crop_confidence,
                "converted_values": {"N": N, "P": P, "K": K, "ph": req.ph}
            }

        top_idx = int(result.probs.top1)
        raw_label = result.names[top_idx]
        normalized_label = raw_label.strip().lower().replace(" ", "_")

        if normalized_label in {"not_soil", "no_soil", "no_soil_detected"}:
            soil_texture = "No soil detected"
            recommended_crop = "no_crop"
            companions = []
            avoids = []
            crop_confidence = None
            N, P, K = req.N, req.P, req.K
            return {
                "soil_texture": soil_texture,
                "recommended_crop": recommended_crop,
                "companions": companions,
                "avoids": avoids,
                "confidence": crop_confidence,
                "converted_values": {"N": N, "P": P, "K": K, "ph": req.ph}
            }

        # Normalize YOLO label and map explicitly to encoder categories
        clean_label = raw_label.replace("_Trained", "").strip()
        soil_texture = YOLO_TO_ENCODER.get(clean_label, YOLO_TO_ENCODER.get(clean_label.lower(), None))
        if not soil_texture:
            low = clean_label.lower()
            if "clay" in low:
                soil_texture = "Clay"
            elif "loam" in low:
                soil_texture = "Loamy"
            elif "sand" in low:
                soil_texture = "Sandy"
            elif "silt" in low:
                soil_texture = "Silt"
            else:
                soil_texture = "Loamy"

        # One-hot encode soil texture for XGBoost
        soil_encoded_result = soil_encoder.transform([[soil_texture]])
        # Handle both sparse matrix and dense array
        if hasattr(soil_encoded_result, 'toarray'):
            soil_encoded = soil_encoded_result.toarray()[0]
        else:
            soil_encoded = soil_encoded_result[0]

    except Exception as e:
        print(f"❌ YOLO prediction error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"YOLO prediction failed: {e}")

    # ------------ NPK Conversion ------------
    try:
        N, P, K = convert_mgkg_to_kgha(req.N, req.P, req.K, soil_texture.lower())
        print(f"🔎 Converted NPK values: N={N}, P={P}, K={K}, pH={req.ph}")
    except Exception as e:
        print(f"❌ NPK conversion error: {e}")
        raise HTTPException(status_code=400, detail=f"NPK conversion failed: {e}")

    companions = []
    avoids = []
    crop_confidence = None

    # Reject if values are out of range
    if not (NPK_MIN <= N <= NPK_MAX and NPK_MIN <= P <= NPK_MAX and NPK_MIN <= K <= NPK_MAX):
        recommended_crop = "no_crop"
    elif not (PH_MIN <= req.ph <= PH_MAX):
        recommended_crop = "no_crop"
    else:
        # ------------ XGBOOST PREDICTION (8-FEATURE LOGIC) ------------
        try:
            # Combine NPK, pH, and soil_encoded into 8 features
            input_features = np.hstack([[N, P, K, req.ph], soil_encoded])
            print(f"🔎 XGBoost input_features: {input_features} | Shape: {input_features.shape}")
            if not isinstance(input_features, np.ndarray) or input_features.shape[0] != 8:
                raise RuntimeError(f"❌ XGBoost input_features shape is {input_features.shape}, expected (8,)")
            probs = xgb_model.predict_proba([input_features])[0]
            print("🔎 Class probabilities:")
            for idx, prob in enumerate(probs):
                crop_name = le_label.inverse_transform([idx])[0]
                print(f"  - {crop_name}: {prob:.2%}")

            print(f"🌾 Top 3 predictions:")
            top3_indices = np.argsort(probs)[-3:][::-1]
            for i, idx in enumerate(top3_indices, 1):
                crop_name = le_label.inverse_transform([idx])[0]
                print(f"  {i}. {crop_name}: {probs[idx]:.2%}")

            top_idx = int(np.argmax(probs))
            top_prob = float(probs[top_idx])

            pred_crop = le_label.inverse_transform([top_idx])[0].strip().lower()
            crop_confidence = top_prob

            if top_prob < CROP_TOP_PROB_THRESHOLD:
                recommended_crop = "no_crop"
            else:
                recommended_crop = pred_crop
                companions = companion_crops.get(pred_crop, [])
                avoids = avoid_crops.get(pred_crop, [])

        except Exception as e:
            print("❌ XGBoost fallback:", e)
            traceback.print_exc()
            recommended_crop = "no_crop"

    # ------------ Save to Supabase ------------
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
        print("⚠️ Supabase insert failed:", e)

        # ===============================
        # Debug Endpoint for Model/Data Validation
        # ===============================

    return {
        "soil_texture": soil_texture,
        "recommended_crop": recommended_crop,
        "companions": companions,
        "avoids": avoids,
        "confidence": crop_confidence,
        "converted_values": {"N": N, "P": P, "K": K, "ph": req.ph}
    }