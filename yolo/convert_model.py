# Step 1: Install dependencies first
# pip install ultralytics torch torchvision

# Step 2: Load your model
from ultralytics import YOLO

model = YOLO("best.pt")  # <-- Step 2

# Step 3: Export to TorchScript
model.export(format="torchscript")  # creates best.torchscript.pt
print("Model exported successfully!")
