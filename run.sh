#!/bin/bash

echo "===================================="
echo "Facial Recognition MVP - Quick Start"
echo "===================================="
echo ""

# 백엔드 설정
echo "[1/4] Setting up backend..."
cd src/backend

if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

echo "Activating Python environment..."
source venv/bin/activate

echo "Installing backend dependencies..."
pip install -r requirements.txt -q

echo ""
echo "[2/4] Starting backend server..."
echo "Backend will run on http://127.0.0.1:8000"
echo "API Docs: http://127.0.0.1:8000/docs"

python app.py &
BACKEND_PID=$!

sleep 3

# 프론트엔드 설정
echo ""
echo "[3/4] Setting up frontend..."
cd ../frontend

if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install -q
fi

echo ""
echo "[4/4] Starting frontend server..."
echo "Frontend will run on http://localhost:3000"
echo ""
echo "===================================="
echo "Servers starting..."
echo "Backend:  http://127.0.0.1:8000"
echo "Frontend: http://localhost:3000"
echo "===================================="
echo ""

npm start

# Kill background process on exit
trap "kill $BACKEND_PID" EXIT
