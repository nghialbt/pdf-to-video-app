FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for MoviePy and ImageMagick
# libgl1-mesa-glx is often needed for opencv/moviepy
RUN apt-get update && apt-get install -y \
    imagemagick \
    ffmpeg \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

# Fix ImageMagick policy
RUN sed -i 's/none/read,write/g' /etc/ImageMagick-6/policy.xml

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

# Create necessary directories
RUN mkdir -p uploads processed_images output_videos

CMD sh -c "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"
