# Dockerfile
FROM python:3.10-slim

ENV PYTHONUNBUFFERED=1
WORKDIR /app

# system deps for pillow, ffmpeg for any video ops, etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# copy app
COPY app/ /app/

# Upgrade pip
RUN pip install --upgrade pip

# Install CPU torch (choose correct index for CPU builds)
RUN pip install torch torchvision --extra-index-url https://download.pytorch.org/whl/cpu

# Install remaining python deps
RUN pip install -r requirements.txt

# Expose port (Render sets $PORT at runtime; we default 8000)
EXPOSE 8000

# Start uvicorn
CMD ["uvicorn", "main:APP", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
