$ErrorActionPreference = "Stop"

# Navigate to backend
cd f:\dev\harmonice\FR-kko\src\backend

# Setup venv if it doesn't exist
if (-not (Test-Path "venv")) {
    Write-Host "Creating Python virtual environment..."
    python -m venv venv
}

Write-Host "Activating Python environment and installing dependencies..."
$env:PYTHONUTF8="1"
.\venv\Scripts\python -m pip install -r requirements.txt -q

Write-Host "Starting backend server..."
Start-Process -FilePath ".\venv\Scripts\python.exe" -ArgumentList "app.py" -WindowStyle Hidden -PassThru

# Navigate to frontend
cd f:\dev\harmonice\FR-kko\src\frontend

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies..."
    npm install -q
}

Write-Host "Starting frontend server..."
Start-Process -FilePath "npm.cmd" -ArgumentList "start" -WindowStyle Hidden -PassThru

Write-Host "Both servers started in the background."
