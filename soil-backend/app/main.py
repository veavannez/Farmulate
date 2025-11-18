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
    "created_at",
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
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
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

# 🔧 Patch for older pickled XGBoost models on newer xgboost versions
if not hasattr(xgb_model, "use_label_encoder"):
    xgb_model.use_label_encoder = False
    print("🔧 Patched xgb_model.use_label_encoder = False")

# 🔧 Patch missing gpu_id so newer xgboost can call predict_proba without exploding
if not hasattr(xgb_model, "gpu_id"):
    xgb_model.gpu_id = -1  # CPU mode
    print("🔧 Patched xgb_model.gpu_id = -1 (CPU mode)")

# 🔧 Patch missing predictor attribute expected by newer xgboost
if not hasattr(xgb_model, "predictor"):
    # "auto" is the default in modern xgboost, safe for CPU models
    xgb_model.predictor = "auto"
    print("🔧 Patched xgb_model.predictor = 'auto'")

# Debug: see what the model expects
print(
    "✅ XGBoost model loaded. n_features_in_ =",
    getattr(xgb_model, "n_features_in_", "unknown"),
)

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
            "/docs": "GET",
        },
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

    print("\n===== Incoming Prediction Request =====")
    print(
        f"Raw request: N={req.N}, P={req.P}, K={req.K}, pH={req.ph}, "
        f"imageUrl={req.imageUrl}, pot_name={req.pot_name}"
    )
    soil_encoded = None  # Initialize for later use

    # ---------- YOLO SOIL TEXTURE DETECTION ----------
    try:
        response = requests.get(req.imageUrl, timeout=15)
        response.raise_for_status()
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp.write(response.content)
            tmp_path = tmp.name

        results = yolo_model.predict(tmp_path)
        result = results[0]

        print(f"YOLO detection result: {result}")
        if getattr(result, "probs", None) is None:
            print("YOLO: No soil detected in image.")
            soil_texture = "No soil detected"
            recommended_crop = "no_crop"
            companions = []
            avoids = []
            crop_confidence = None
            N, P, K = req.N, req.P, req.K
            print(
                f"Returning early: soil_texture={soil_texture}, "
                f"NPK (raw)={N},{P},{K}, pH={req.ph}"
            )
            return {
                "soil_texture": soil_texture,
                "recommended_crop": recommended_crop,
                "companions": companions,
                "avoid": avoids,
                "confidence": crop_confidence,
                "converted_values": {"N": N, "P": P, "K": K, "ph": req.ph},
            }

        top_idx = int(result.probs.top1)
        raw_label = result.names[top_idx]
        normalized_label = raw_label.strip().lower().replace(" ", "_")
        print(f"YOLO raw label: {raw_label}, normalized: {normalized_label}")

        if normalized_label in {"not_soil", "no_soil", "no_soil_detected"}:
            print("YOLO: Detected label is not soil.")
            soil_texture = "No soil detected"
            recommended_crop = "no_crop"
            companions = []
            avoids = []
            crop_confidence = None
            N, P, K = req.N, req.P, req.K
            print(
                f"Returning early: soil_texture={soil_texture}, "
                f"NPK (raw)={N},{P},{K}, pH={req.ph}"
            )
            return {
                "soil_texture": soil_texture,
                "recommended_crop": recommended_crop,
                "companions": companions,
                "avoid": avoids,
                "confidence": crop_confidence,
                "converted_values": {"N": N, "P": P, "K": K, "ph": req.ph},
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
        print(f"Final soil texture for NPK conversion: {soil_texture}")

        # One-hot encode soil texture (kept for compatibility/logging)
        soil_encoded_result = soil_encoder.transform([[soil_texture]])
        if hasattr(soil_encoded_result, "toarray"):
            soil_encoded = soil_encoded_result.toarray()[0]
        else:
            soil_encoded = soil_encoded_result[0]
        print(f"soil_encoded (one-hot): {soil_encoded}")

    except Exception as e:
        print(f"❌ YOLO prediction error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"YOLO prediction failed: {e}")

    # ------------ NPK Conversion ------------
    try:
        N_raw = req.N
        P_raw = req.P
        K_raw = req.K
        ph = req.ph
        print(
            f"Raw NPK before conversion: N={N_raw}, P={P_raw}, K={K_raw}, "
            f"pH={ph}, soil_texture={soil_texture}"
        )
        N, P, K = convert_mgkg_to_kgha(N_raw, P_raw, K_raw, soil_texture)
        print(
            f"Converted NPK values (kg/ha): N={N}, P={P}, K={K}, "
            f"pH={ph}, soil_texture={soil_texture}"
        )
    except Exception as e:
        print(f"NPK conversion error: {e}")
        raise HTTPException(status_code=400, detail=f"NPK conversion failed: {e}")

    companions = []
    avoids = []
    crop_confidence = None

    # Reject if values are out of range
    if not (NPK_MIN <= N <= NPK_MAX and NPK_MIN <= P <= NPK_MAX and NPK_MIN <= K <= NPK_MAX):
        print(
            f"Input out of range: N={N}, P={P}, K={K}, pH={ph}, "
            f"soil_texture={soil_texture}"
        )
        recommended_crop = "no_crop"
    elif not (PH_MIN <= ph <= PH_MAX):
        print(f"pH out of range: {ph}, soil_texture={soil_texture}")
        recommended_crop = "no_crop"
    else:
        # ------------ XGBOOST PREDICTION (4 FEATURES: N, P, K, pH) ------------
        try:
            # Model was trained on 4 features (N, P, K, pH), so only use those
            numeric_features = np.array([N, P, K, ph], dtype=float)
            X_input = numeric_features.reshape(1, -1)

            print(
                "xgb_model.n_features_in_ =",
                getattr(xgb_model, "n_features_in_", "unknown"),
            )
            print("XGBoost X_input shape:", X_input.shape)
            print("XGBoost X_input values:", X_input)

            # Predict probabilities
            probs = xgb_model.predict_proba(X_input)[0]

            top_idx = int(np.argmax(probs))
            top_prob = float(probs[top_idx])

            pred_crop = le_label.inverse_transform([top_idx])[0].strip().lower()
            crop_confidence = top_prob

            # Log all probabilities for debugging
            print("🔎 Class probabilities:")
            for idx, prob in enumerate(probs):
                crop_name = le_label.inverse_transform([idx])[0]
                print(f"  - {crop_name}: {prob:.2%}")

            print("🌾 Top 3 predictions:")
            top3_indices = np.argsort(probs)[-3:][::-1]
            for i, idx in enumerate(top3_indices, 1):
                crop_name = le_label.inverse_transform([idx])[0]
                print(f"  {i}. {crop_name}: {probs[idx]:.2%}")

            print(
                f"Final recommended crop: {pred_crop} "
                f"(confidence: {crop_confidence:.2%})"
            )
            print(f"Companions: {companion_crops.get(pred_crop, [])}")
            print(f"Avoids: {avoid_crops.get(pred_crop, [])}")

            # Final result
            recommended_crop = pred_crop
            companions = companion_crops.get(pred_crop, [])
            avoids = avoid_crops.get(pred_crop, [])

        except Exception as e:
            print("❌ XGBoost error:", e)
            traceback.print_exc()
            recommended_crop = "no_crop"
            companions = []
            avoids = []
            crop_confidence = None

    # ===============================
    # Insert into Supabase: soil_results
    # ===============================
    try:
        try:
            image_name = req.image_name or Path(req.imageUrl).name or "unknown"
        except Exception:
            image_name = "unknown"

        row = {
            "user_id": user_id,
            "pot_name": req.pot_name,
            "image_name": image_name,
            "image_url": req.imageUrl,
            "prediction": soil_texture,
            "recommended_crop": recommended_crop,
            "crop_confidence": crop_confidence,
            # store RAW values here so HistoryScreen shows 17/20/44 and 4.9
            "n": req.N,
            "p": req.P,
            "k": req.K,
            "ph_level": req.ph,
            "companions": companions,
            "avoids": avoids,
            "created_at": datetime.utcnow().isoformat(),
        }

        print("📝 Inserting row into soil_results:", row)
        insert_res = supabase.table("soil_results").insert(row).execute()
        if getattr(insert_res, "error", None):
            print("⚠️ Supabase insert error:", insert_res.error)
        else:
            print("✅ Supabase insert success:", insert_res.data)

    except Exception as e:
        print("❌ Failed to insert into soil_results:", e)
        traceback.print_exc()

    print(
        f"Returning response: prediction={soil_texture}, "
        f"recommended_crop={recommended_crop}, companions={companions}, "
        f"avoids={avoids}, confidence={crop_confidence}"
    )
    return {
        "prediction": soil_texture,  # For frontend compatibility
        "soil_texture": soil_texture,
        "recommended_crop": recommended_crop,
        "companions": companions,
        "avoid": avoids,
        "confidence": crop_confidence,
        "converted_values": {"N": N, "P": P, "K": K, "ph": req.ph},
    }

# ===============================
# REALTIME LISTENER
# ===============================
async def soil_results_listener():
    channel = supabase.realtime.channel("public:soil_results")
    channel.on(
        "postgres_changes",
        {"event": "INSERT", "schema": "public", "table": "soil_results"},
        lambda payload: print("🟢 New prediction inserted:", payload["new"]),
    ).subscribe()
    while True:
        await asyncio.sleep(1)


@app.on_event("startup")
async def startup_event():
    asyncio.create_task(soil_results_listener())
    print("✅ Supabase Realtime listener for 'soil_results' enabled")
