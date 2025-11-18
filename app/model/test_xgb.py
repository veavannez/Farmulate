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
import pickle
import numpy as np
from pathlib import Path

# Load model and encoders
base_dir = Path(__file__).resolve().parent

with open(base_dir / "model.pkl", "rb") as f:
    xgb_model = pickle.load(f)
with open(base_dir / "label_encoder.pkl", "rb") as f:
    le_label = pickle.load(f)

# Example input (adjust values as needed)
N_raw = 17
P_raw = 20
Optimizing tool selection...

If you used the exact same inputs in your app and in test_xgb.py but did not get a crop recommendation from the app, here are the most likely causes:

YOLO Soil Detection:

The API uses YOLO to detect soil texture from the image. If YOLO fails to detect soil or returns "no soil," the API will not run XGBoost and will return "no_crop".
The test script does not use YOLO; it uses a hardcoded soil texture.
Input Path:

In the API, the soil texture for NPK conversion comes 
K_raw = 44
ph = 4.9
soil_texture = "Clay"  # must match encoder training

# Convert NPK to kg/ha using soil texture
N, P, K = convert_mgkg_to_kgha(N_raw, P_raw, K_raw, soil_texture)
print(f"Converted NPK values: N={N}, P={P}, K={K}, pH={ph}")

# Combine features (only 4 features)
input_features = np.array([N, P, K, ph])
print("Input features:", input_features)

# Predict
probs = xgb_model.predict_proba([input_features])[0]
top_idx = int(np.argmax(probs))
top_prob = float(probs[top_idx])
pred_crop = le_label.inverse_transform([top_idx])[0].strip().lower()

print(f"Predicted crop: {pred_crop}")
print(f"Confidence: {top_prob:.2%}")
print("All class probabilities:")
for idx, prob in enumerate(probs):
    crop_name = le_label.inverse_transform([idx])[0]
    print(f"  - {crop_name}: {prob:.2%}")
