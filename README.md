# PDF to Video Converter

A web application that converts PDF slides into engaging videos with transition effects.

## Architecture

- **Frontend**: React (Vite)
- **Backend**: Python (FastAPI, MoviePy)

## How to Run Locally

1. **Backend**:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Deployment Guide

Since this application requires a Python backend for video processing, it **cannot** be hosted entirely on GitHub Pages. You need to deploy the Backend and Frontend separately (or together on a container platform).

### Option 1: Render / Railway (Recommended)

1. **Push this code to GitHub**.
2. **Backend**:
   - Connect your GitHub repo to **Render** (Web Service).
   - Root Directory: `backend`
   - Runtime: Python 3
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - *Note*: Ensure you install system dependencies (ffmpeg) if not using Docker. If using Docker, select "Docker" as the runtime.

3. **Frontend**:
   - Connect your GitHub repo to **Vercel** or **Netlify**.
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - **Important**: You must update the API URL in `App.jsx` to point to your deployed Backend URL (instead of `localhost:8000`).

### Option 2: Docker
Use the included `backend/Dockerfile` to build and deploy the backend container to any cloud provider (AWS, Google Cloud, DigitalOcean).
