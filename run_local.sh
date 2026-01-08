#!/bin/bash

# Function to kill background processes on exit
cleanup() {
    echo "Stopping servers..."
    kill $(jobs -p) 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

echo "Starting Backend..."
# Check if .venv exists, if not create it
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi
source .venv/bin/activate
pip install -r backend/requirements.txt > /dev/null 2>&1
uvicorn main:app --app-dir backend --reload --port 8000 &
BACKEND_PID=$!

echo "Starting Frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
fi
npm run dev -- --open

wait $BACKEND_PID
