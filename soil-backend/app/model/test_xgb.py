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
N = 90
P = 42
K = 43
ph = 6.5

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
