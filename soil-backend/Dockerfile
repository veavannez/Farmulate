# Dockerfile
FROM python:3.10-slim

ENV PYTHONUNBUFFERED=1
WORKDIR /app

# System deps for pillow, ffmpeg, etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy app
COPY app/ /app/

# Upgrade pip
RUN pip install --upgrade pip

# Install CPU torch (CPU-only build)
RUN pip install torch torchvision --extra-index-url https://download.pytorch.org/whl/cpu

# Install remaining Python deps from correct path
RUN pip install -r /app/model/requirements.txt

# Expose port
EXPOSE 8000

# Start uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
