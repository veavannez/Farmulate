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

# Copy requirements first (better caching)
COPY requirements.txt /app/requirements.txt

# Upgrade pip
RUN pip install --upgrade pip

# Install CPU torch (CPU-only build)
RUN pip install torch torchvision --extra-index-url https://download.pytorch.org/whl/cpu

# Copy and install requirements
COPY requirements.txt /app/requirements.txt
RUN pip install -r /app/requirements.txt

# Copy app code
COPY app/ /app/

# Expose port (Render provides $PORT at runtime; 10000 by default)
EXPOSE 10000

# Start uvicorn binding to $PORT (fallback 8000 for local runs)
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
