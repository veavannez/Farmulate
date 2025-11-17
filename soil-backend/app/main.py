rom fastapi import FastAPI, HTTPException, Header
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

# ===============================
# Load Environment Variables
# ===============================
env_path = Path(_file_).resolve().parents[1] / ".env"
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
# Validation Functions
# ===============================
def validate_env():
    missing = []
    if not SUPABASE_URL:
        missing.append("SUPABASE_URL")
    if not SUPABASE_KEY:
        missing.append("SUPABASE_KEY")
    if not SUPABASE_JWT_SECRET:
        missing.append("SUPABASE_JWT_SECRET")
    if missing:
        raise RuntimeError(f"Missing environment variables: {', '.join(missing)}")

def validate_supabase_table(supabase: Client, table_name: str):
    try:
        schema = supabase.table(table_name).select("*").limit(0).execute()
        if hasattr(schema, "error") and schema.error:
            raise RuntimeError(f"Error fetching table schema: {schema.error}")
        columns = list(schema.data[0].keys()) if schema.data else REQUIRED_COLUMNS
    except Exception as e:
        print(f"⚠️ Could not fetch table schema, skipping strict validation: {e}")
        columns = REQUIRED_COLUMNS
    missing_cols = [col for col in REQUIRED_COLUMNS if col not in columns]
    if missing_cols:
        raise RuntimeError(f"Missing columns in '{table_name}': {', '.join(missing_cols)}")

validate_env()
validate_supabase_table(supabase, "soil_results")

# ===============================
# Request Schema
# ===============================
class PredictRequest(BaseModel):
    imageUrl: str = Field(..., alias="imageUrl")
    image_name: str | None = None
    N: float
    P: float
    K: float
    ph: float
    pot_name: str

    class Config:
        populate_by_name = True

# ===============================
# Conversion Function
# ===============================
def convert_mgkg_to_kgha(N_mgkg, P_mgkg, K_mgkg, soil_type):
    bd_values = {"sandy": 1.6, "loamy": 1.3, "clay": 1.15, "silt": 1.25}
    soil_type = soil_type.lower()
    if soil_type not in bd_values:
        raise ValueError(f"Invalid soil type: {soil_type}")
    bulk_density = bd_values[soil_type]
    soil_mass = bulk_density * 30 * 1e5  # 30 cm layer, kg/ha
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
base_dir = Path(_file_).resolve().parent / "model"

yolo_model = YOLO(str(base_dir / "best.pt"))

with open(base_dir / "model.pkl", "rb") as f:
    xgb_model = pickle.load(f)

with open(base_dir / "label_encoder.pkl", "rb") as f:
    le_label = pickle.load(f)

with open(base_dir / "soil_encoder.pkl", "rb") as f:
    soil_encoder = pickle.load(f)

# Companion & Avoid crops
companion_file = base_dir.parent / "avoidcrop.xlsx"
records_df = pd.read_excel(companion_file, engine="openpyxl")
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

# Thresholds
CROP_TOP_PROB_THRESHOLD = 0.5
NPK_MIN = 0
NPK_MAX = 500
PH_MIN = 3.5
PH_MAX = 9.5

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
# Health & Debug Endpoints
# ===============================
@app.get("/")
async def root():
    return {"status": "online", "service": "Soil Texture & Crop Recommendation API", "endpoints": {"/predict": "POST", "/docs": "GET"}}

@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

@app.get("/debug")
async def debug():
    debug_report = {}
    try:
        debug_report["label_encoder_classes"] = le_label.classes_.tolist()
    except Exception as e:
        debug_report["label_encoder_classes"] = f"Error: {e}"
    try:
        debug_report["xgb_model_n_classes"] = getattr(xgb_model, 'n_classes_', None)
    except Exception as e:
        debug_report["xgb_model_n_classes"] = f"Error: {e}"
    try:
        match = len(le_label.classes_) == getattr(xgb_model, 'n_classes_', None)
        debug_report["encoder_model_match"] = match
    except Exception as e:
        debug_report["encoder_model_match"] = f"Error: {e}"
    return debug_report

# ===============================
# Predict Endpoint (Fully Verbose)
# ===============================
@app.post("/predict")
async def predict(req: PredictRequest, authorization: str | None = Header(None)):
    # ------------------------------
    # 1️⃣ Verify token
    # ------------------------------
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.split(" ")[1]
    user_id = verify_supabase_token(token)

    # ------------------------------
    # 2️⃣ YOLO Soil Detection
    # ------------------------------
    soil_texture = "Unknown"
    soil_encoded = None
    try:
        response = requests.get(req.imageUrl, timeout=15)
        response.raise_for_status()
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp.write(response.content)
            tmp_path = tmp.name

        results = yolo_model.predict(tmp_path)
        result = results[0]

        if getattr(result, "probs", None) is None:
            print("YOLO: No soil detected")
            soil_texture = "No soil detected"
        else:
            top_idx = int(result.probs.top1)
            raw_label = result.names[top_idx]
            normalized_label = raw_label.strip().lower().replace(" ", "_")

            if normalized_label in {"not_soil", "no_soil", "no_soil_detected"}:
                print("YOLO: Not soil detected label")
                soil_texture = "No soil detected"
            else:
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
                # Soil encoding
                try:
                    soil_encoded_result = soil_encoder.transform([[soil_texture]])
                    if hasattr(soil_encoded_result, 'toarray'):
                        soil_encoded = soil_encoded_result.toarray()[0]
                    else:
                        soil_encoded = soil_encoded_result[0]
                except Exception:
                    soil_encoded = None
                print(f"YOLO: Detected soil texture: {soil_texture}, Encoded: {soil_encoded}")
    except Exception as e:
        print(f"❌ YOLO prediction error: {e}")
        traceback.print_exc()
        soil_texture = "Unknown"

    # ------------------------------
    # 3️⃣ Convert mg/kg → kg/ha
    # ------------------------------
    try:
        N_kgha, P_kgha, K_kgha = convert_mgkg_to_kgha(req.N, req.P, req.K, soil_texture.lower())
        print(f"Converted NPK (kg/ha): N={N_kgha}, P={P_kgha}, K={K_kgha}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"NPK conversion failed: {e}")

    # ------------------------------
    # 4️⃣ XGBoost Prediction
    # ------------------------------
    recommended_crop = "no_crop"
    companions = []
    avoids = []
    crop_confidence = None

    if not (NPK_MIN <= N_kgha <= NPK_MAX and NPK_MIN <= P_kgha <= NPK_MAX and NPK_MIN <= K_kgha <= NPK_MAX):
        print("⚠️ NPK values out of range")
    elif not (PH_MIN <= req.ph <= PH_MAX):
        print("⚠️ pH value out of range")
    else:
        try:
            input_features = np.array([[N_kgha, P_kgha, K_kgha, req.ph]])
            probs = xgb_model.predict_proba(input_features)[0]
            top_idx = int(np.argmax(probs))
            top_prob = float(probs[top_idx])
            try:
                pred_crop = le_label.inverse_transform([top_idx])[0].strip().lower()
            except Exception as e:
                print(f"LabelEncoder mismatch: {e}")
                pred_crop = "unknown_crop"
            crop_confidence = top_prob

            # Print all probabilities
            print("🔎 Class probabilities:")
            for idx, prob in enumerate(probs):
                try:
                    crop_name = le_label.inverse_transform([idx])[0]
                except Exception as e:
                    crop_name = f"Label error: {e}"
                print(f"  - {crop_name}: {prob:.2%}")

            # Top 3 predictions
            top3_indices = np.argsort(probs)[-3:][::-1]
            print("🌾 Top 3 predictions:")
            for i, idx in enumerate(top3_indices, 1):
                try:
                    crop_name = le_label.inverse_transform([idx])[0]
                except Exception as e:
                    crop_name = f"Label error: {e}"
                print(f"  {i}. {crop_name}: {probs[idx]:.2%}")

            if top_prob < CROP_TOP_PROB_THRESHOLD:
                recommended_crop = "no_crop"
                companions = []
                avoids = []
            else:
                recommended_crop = pred_crop
                companions = companion_crops.get(pred_crop, [])
                avoids = avoid_crops.get(pred_crop, [])

        except Exception as e:
            print("❌ XGBoost fallback:", e)
            traceback.print_exc()

    # ------------------------------
    # 5️⃣ Save Result to Supabase
    # ------------------------------
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
            "converted_values": {"N_kg_ha": N_kgha, "P_kg_ha": P_kgha, "K_kg_ha": K_kgha},
            "created_at": datetime.utcnow().isoformat()
        }).execute()
    except Exception as e:
        print("⚠️ Supabase insert failed:", e)

    return {
        "soil_texture": soil_texture,
        "recommended_crop": recommended_crop,
        "companions": companions,
        "avoid": avoids,
        "confidence": crop_confidence,
        "converted_values": {"N_kg_ha": N_kgha, "P_kg_ha": P_kgha, "K_kg_ha": K_kgha},
        "raw_input": {"N_mg_kg": req.N, "P_mg_kg": req.P, "K_mg_kg": req.K, "ph": req.ph}
    }

# ===============================
# Supabase Realtime Listener
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