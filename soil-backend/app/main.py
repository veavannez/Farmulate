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
import pickle, os, tempfile, requests
from jose import jwt
import asyncio
import cv2
import cv2

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
    "user_id", "image_name", "image_url", "prediction",
    "recommended_crop", "N", "P", "K", "ph_level",
    "companions", "avoids", "created_at"
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

data = pd.read_csv(base_dir / "reccocrop.csv")
from sklearn.preprocessing import LabelEncoder
le_label = LabelEncoder()
le_label.fit(data["label"].str.strip())

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
SOIL_CONF_THRESHOLD = 0.5  # Raised from 0.5 for stricter detection
CROP_CONF_THRESHOLD = 0.5  # legacy threshold (kept for reference)
CROP_TOP_PROB_THRESHOLD = 0.7  # require >= 0.70 top class probability

# Reasonable NPK/pH ranges for agriculture (converted kg/ha for NPK)
NPK_MIN = 0
NPK_MAX = 500  # kg/ha
PH_MIN = 3.5
PH_MAX = 9.5

# ===============================
# Pre-filter: Check if image looks like soil
# ===============================
def is_likely_soil(image_path: str) -> tuple[bool, str]:
    """
    Pre-filter to reject obvious non-soil images before YOLO.
    Returns (is_soil: bool, reason: str)
    """
    try:
        img = cv2.imread(image_path)
        if img is None:
            return False, "Could not read image"
        
        # Convert to HSV for better color analysis
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        h, s, v = cv2.split(hsv)
        
        # Check 1: Color range (soil is typically brown/tan/reddish)
        # Hue: 0-30 (red-orange-brown) acceptable for soil
        brown_pixels = np.sum((h >= 0) & (h <= 30))
        total_pixels = h.size
        brown_ratio = brown_pixels / total_pixels
        
        if brown_ratio < 0.15:  # Less than 15% brown-ish pixels
            return False, f"Insufficient brown tones ({brown_ratio*100:.1f}%)"
        
        # Check 2: Saturation (soil has moderate saturation, not too vivid)
        avg_saturation = np.mean(s)
        if avg_saturation > 150:  # Too saturated (bright colors, not soil)
            return False, f"Too saturated ({avg_saturation:.0f})"
        
        # Check 3: Texture variance (soil has grainy texture)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        texture_variance = np.var(laplacian)
        
        if texture_variance < 50:  # Too smooth (like ceramic/plastic)
            return False, f"Too smooth ({texture_variance:.0f})"
        
        # Check 4: Edge density (manufactured objects have sharp edges)
        edges = cv2.Canny(gray, 50, 150)
        edge_ratio = np.sum(edges > 0) / total_pixels
        
        if edge_ratio > 0.3:  # Too many sharp edges
            return False, f"Too many edges ({edge_ratio*100:.1f}%)"
        
        # Passed all checks
        return True, "Passed pre-filter"
        
    except Exception as e:
        print(f"⚠️ Pre-filter error: {e}")
        return True, "Pre-filter error, allowing YOLO check"  # Fail-safe: let YOLO decide

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
        response = requests.get(req.imageUrl, timeout=15)
        response.raise_for_status()
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp.write(response.content)
            tmp_path = tmp.name

        # Pre-filter: Check if image looks like soil
        is_soil, reason = is_likely_soil(tmp_path)
        print(f"🔍 Pre-filter: {reason}")
        
        if not is_soil:
            # Failed pre-filter, return "No Soil Detected"
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
                    "prediction": f"{soil_texture} ({reason})",
                    "recommended_crop": recommended_crop,
                    "n": req.N,
                    "p": req.P,
                    "k": req.K,
                    "ph_level": req.ph,
                    "companions": companions,
                    "avoids": avoids,
                    "created_at": datetime.utcnow().isoformat()
                }).execute()
            except Exception as e:
                print("⚠️ Supabase insert (pre-filter reject) failed:", e)

            return {
                "soil_texture": soil_texture,
                "recommended_crop": recommended_crop,
                "companions": companions,
                "avoid": avoids,
                "confidence": None,
                "converted_values": {"N": req.N, "P": req.P, "K": req.K, "ph": req.ph}
            }

        results = yolo_model.predict(tmp_path)
        result = results[0]
        
        # Extract confidence for logging
        yolo_confidence = float(getattr(result.probs, "top1conf", 0.0)) if getattr(result, "probs", None) else 0.0
        print(f"🔍 YOLO Confidence: {yolo_confidence:.3f} (threshold: {SOIL_CONF_THRESHOLD})")
        
        # If model is unsure (no class above threshold), short-circuit with "No Soil Detected"
        if (getattr(result, "probs", None) is None) or (yolo_confidence < SOIL_CONF_THRESHOLD):
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
        raise HTTPException(status_code=500, detail=f"YOLO prediction failed: {e}")

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
        # XGBoost prediction with probability check
        try:
            input_features = np.array([[N, P, K, req.ph]])
            
            # Get prediction and probabilities
            pred_encoded = xgb_model.predict(input_features)[0]
            
            # Try to get prediction probabilities (if model supports it)
            try:
                pred_proba = xgb_model.predict_proba(input_features)[0]
                # probability for the predicted class index
                try:
                    classes = list(getattr(xgb_model, "classes_", []))
                    class_pos = classes.index(pred_encoded) if classes else int(pred_encoded)
                except ValueError:
                    class_pos = int(pred_encoded)
                max_proba = float(pred_proba[class_pos])
                crop_confidence = max_proba

                decoded_label = le_label.inverse_transform([int(pred_encoded)])[0]
                # Gate by top probability threshold or explicit no_crop label
                if (max_proba < CROP_TOP_PROB_THRESHOLD) or (decoded_label.strip().lower() == "no_crop"):
                    recommended_crop = "no_crop"
                    companions = []
                    avoids = []
                else:
                    recommended_crop = decoded_label
                    companions = companion_crops.get(recommended_crop.lower(), [])
                    avoids = avoid_crops.get(recommended_crop.lower(), [])
            except AttributeError:
                # Model doesn't support predict_proba, use prediction as-is
                decoded_label = le_label.inverse_transform([int(pred_encoded)])[0]
                # Without proba support, be conservative: treat unknown as no_crop
                if decoded_label.strip().lower() == "no_crop":
                    recommended_crop = "no_crop"
                    companions = []
                    avoids = []
                    crop_confidence = None
                else:
                    recommended_crop = decoded_label
                    companions = companion_crops.get(recommended_crop.lower(), [])
                    avoids = avoid_crops.get(recommended_crop.lower(), [])
                    crop_confidence = None
                
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"XGBoost prediction failed: {e}")

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