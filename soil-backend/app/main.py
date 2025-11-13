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

        results = yolo_model.predict(tmp_path)
        result = results[0]
        if result.probs is None or result.probs.top1conf < 0.1:
            raise HTTPException(status_code=400, detail="Soil texture undetected.")
        top_idx = int(result.probs.top1)
        raw_label = result.names[top_idx]
        soil_texture = raw_label.replace("_Trained", "").capitalize()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"YOLO prediction failed: {e}")

    # Convert NPK
    try:
        N, P, K = convert_mgkg_to_kgha(req.N, req.P, req.K, soil_texture)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"NPK conversion failed: {e}")

    # XGBoost prediction
    try:
        input_features = np.array([[N, P, K, req.ph]])
        pred_encoded = xgb_model.predict(input_features)[0]
        recommended_crop = le_label.inverse_transform([int(pred_encoded)])[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"XGBoost prediction failed: {e}")

    companions = companion_crops.get(recommended_crop.lower(), [])
    avoids = avoid_crops.get(recommended_crop.lower(), [])

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