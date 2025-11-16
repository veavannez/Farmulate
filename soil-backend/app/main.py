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
    allow_origins=["*"],  # Allow all for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ===============================
# Required Columns
# ===============================
REQUIRED_COLUMNS = [
    # Core identification
    "user_id", "pot_name", "image_name", "image_url",
    # Prediction outputs
    "prediction", "recommended_crop", "crop_confidence",
    # Inputs (stored raw)
    "n", "p", "k", "ph_level",
    # Related agronomic lists
    "companions", "avoids",
    # Metadata
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
    """Validate table schema; allow empty table."""
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
# Helper Functions
# ===============================
def convert_mgkg_to_kgha(N_mgkg, P_mgkg, K_mgkg, soil_type):
    bd_values = {"sandy": 1.6, "loamy": 1.3, "clay": 1.15, "silt": 1.25}
    soil_type = soil_type.lower()
    if soil_type not in bd_values:
        raise ValueError(f"Invalid soil type: {soil_type}")
    bulk_density = bd_values[soil_type]
    soil_mass = bulk_density * 30 * 1e5  # 30 cm depth
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

# Load label encoder (for crop output classes)
with open(base_dir / "label_encoder.pkl", "rb") as f:
    le_label = pickle.load(f)

# Note: soil texture is one-hot encoded manually in prediction (no soil_encoder.pkl needed)

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
CROP_CONF_THRESHOLD = 0.5  # legacy threshold (kept for reference)
CROP_TOP_PROB_THRESHOLD = 0.7  # require >= 0.70 top class probability

# Reasonable NPK/pH ranges for agriculture (converted kg/ha for NPK)
NPK_MIN = 0
NPK_MAX = 500  # kg/ha
PH_MIN = 3.5
PH_MAX = 9.5

# ===============================
# Health Check Endpoint
# ===============================
@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "Soil Texture & Crop Recommendation API",
        "endpoints": {
            "/predict": "POST - Analyze soil and get crop recommendations",
            "/docs": "GET - Interactive API documentation"
        }
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# ===============================
# Predict Endpoint
# ===============================
@app.post("/predict")
async def predict(req: PredictRequest, authorization: str | None = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.split(" ")[1]
    user_id = verify_supabase_token(token)

    # YOLO prediction
    try:
        print("➡️ /predict invoked with payload:", {
            "imageUrl": req.imageUrl,
            "image_name": req.image_name,
            "N": req.N, "P": req.P, "K": req.K, "ph": req.ph,
            "pot_name": req.pot_name
        })
        response = requests.get(req.imageUrl, timeout=15)
        response.raise_for_status()
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp.write(response.content)
            tmp_path = tmp.name

        results = yolo_model.predict(tmp_path)
        result = results[0]
        
        # Extract confidence for logging
        yolo_confidence = float(getattr(result.probs, "top1conf", 0.0)) if getattr(result, "probs", None) else 0.0
        print(f"🔍 YOLO Confidence: {yolo_confidence:.3f}")
        
        # If model returned no probabilities, short-circuit with "No Soil Detected"
        if getattr(result, "probs", None) is None:
            soil_texture = "No soil detected"
            recommended_crop = "no_crop"
            companions = []
            avoids = []

            # Try to persist the attempt for history/analytics (optional if table allows)
            try:
                supabase.table("soil_results").insert({
                    "user_id": user_id,
                    "pot_name" : req.pot_name,
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
                    "crop_confidence": None,
                    "created_at": datetime.utcnow().isoformat()
                }).execute()
            except Exception as e:
                print("⚠️ Supabase insert (no-soil) failed:", e)

            return {
                "soil_texture": soil_texture,
                "recommended_crop": recommended_crop,
                "companions": companions,
                "avoid": avoids,
                "confidence": None,
                # Return raw inputs when soil type is unknown
                "converted_values": {"N": req.N, "P": req.P, "K": req.K, "ph": req.ph}
            }

        # Confident soil detection path
        top_idx = int(result.probs.top1)
        raw_label = result.names[top_idx]
        normalized_label = str(raw_label).strip().lower().replace(" ", "_")
        if normalized_label in {"not_soil", "no_soil", "no_soil_detected", "notsoil"}:
            soil_texture = "No soil detected"
            recommended_crop = "no_crop"
            companions = []
            avoids = []
            try:
                supabase.table("soil_results").insert({
                    "user_id": user_id,
                    "pot_name" : req.pot_name,
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
                    "crop_confidence": None,
                    "created_at": datetime.utcnow().isoformat()
                }).execute()
            except Exception as e:
                print("⚠️ Supabase insert (not_soil) failed:", e)

            return {
                "soil_texture": soil_texture,
                "recommended_crop": recommended_crop,
                "companions": companions,
                "avoid": avoids,
                "confidence": None,
                "converted_values": {"N": req.N, "P": req.P, "K": req.K, "ph": req.ph}
            }

        soil_texture = raw_label.replace("_Trained", "").capitalize()
    except Exception as e:
        print("❌ YOLO prediction exception:", e)
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"YOLO prediction failed: {type(e).__name__}: {e}")

    # Convert NPK
    try:
        N, P, K = convert_mgkg_to_kgha(req.N, req.P, req.K, soil_texture)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"NPK conversion failed: {e}")

    # Initialize companions and avoids
    companions = []
    avoids = []
    crop_confidence: float | None = None
    
    # Check for extreme values
    if not (NPK_MIN <= N <= NPK_MAX and NPK_MIN <= P <= NPK_MAX and NPK_MIN <= K <= NPK_MAX):
        recommended_crop = "no_crop"
    elif not (PH_MIN <= req.ph <= PH_MAX):
        recommended_crop = "no_crop"
    else:
        # XGBoost prediction with defensive handling
        try:
            # TEMPORARY FIX: Use 4 features until model is retrained with 8 features
            # Soil texture is used for NPK conversion but NOT passed to XGBoost
            # TODO: Retrain model with one-hot encoded soil texture for better accuracy
            
            # Construct feature array: [N, P, K, pH] only
            input_features = np.array([[N, P, K, req.ph]])
            expected_features = getattr(xgb_model, 'n_features_in_', None)
            if expected_features is not None and expected_features != input_features.shape[1]:
                raise HTTPException(status_code=400, detail=(
                    f"Model expects {expected_features} features, received {input_features.shape[1]}. "
                    "Check model training schema (may require soil texture encoding or additional inputs)."
                ))

            raw_pred = xgb_model.predict(input_features)[0]
            print(f"🔎 XGB raw prediction: {raw_pred} (type={type(raw_pred)})")

            # Determine encoded integer for label encoder inverse transform
            if isinstance(raw_pred, (int, np.integer)):
                pred_encoded = int(raw_pred)
            else:
                # Try to map string -> index via label encoder classes
                try:
                    classes_list = list(le_label.classes_)
                    pred_encoded = classes_list.index(str(raw_pred).strip())
                except Exception:
                    # Fallback: treat as no_crop
                    pred_encoded = None

            decoded_label = None
            if pred_encoded is not None and 0 <= pred_encoded < len(le_label.classes_):
                try:
                    decoded_label = le_label.inverse_transform([pred_encoded])[0]
                except Exception as dec_err:
                    print(f"⚠️ Label decode failed: {dec_err}")
                    decoded_label = None

            # Probability extraction (optional)
            try:
                pred_proba_row = xgb_model.predict_proba(input_features)[0]
                if pred_encoded is not None and pred_encoded < len(pred_proba_row):
                    max_proba = float(pred_proba_row[pred_encoded])
                    crop_confidence = max_proba
                else:
                    crop_confidence = None
            except Exception as proba_err:
                print(f"ℹ️ predict_proba unavailable or failed: {proba_err}")
                crop_confidence = None

            # Decide recommendation
            normalized_decoded = (decoded_label or '').strip().lower()
            if (crop_confidence is not None and crop_confidence < CROP_TOP_PROB_THRESHOLD) or normalized_decoded in {"", "no_crop"}:
                recommended_crop = "no_crop"
                companions = []
                avoids = []
                if decoded_label is None:
                    print("ℹ️ Falling back to no_crop due to undecodable label")
            else:
                recommended_crop = decoded_label or "no_crop"
                if recommended_crop == "no_crop":
                    companions = []
                    avoids = []
                else:
                    companions = companion_crops.get(recommended_crop.lower(), [])
                    avoids = avoid_crops.get(recommended_crop.lower(), [])
        except HTTPException:
            raise
        except Exception as e:
            print(f"❌ XGBoost prediction error (graceful fallback): {e}")
            print(traceback.format_exc())
            recommended_crop = "no_crop"
            companions = []
            avoids = []
            crop_confidence = None

    # Store in Supabase
    try:
        supabase.table("soil_results").insert({
            "user_id": user_id,
            "pot_name" : req.pot_name,
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

    return {
    "soil_texture": soil_texture,
    "recommended_crop": recommended_crop,
    "companions": companions,
    "avoid": avoids,
    "confidence": crop_confidence,
    "converted_values": {"N": N, "P": P, "K": K, "ph": req.ph}
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