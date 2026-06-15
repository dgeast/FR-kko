@echo off
echo ====================================
echo Facial Recognition MVP - Quick Start
echo ====================================
echo.

REM 백엔드 설정
echo [1/4] Setting up backend...
cd src\backend

if not exist venv (
    echo Creating Python virtual environment...
    python -m venv venv
)

echo Activating Python environment...
call venv\Scripts\activate.bat

echo Installing backend dependencies...
pip install -r requirements.txt -q

echo.
echo [2/4] Starting backend server...
echo Backend will run on http://127.0.0.1:8000
echo API Docs: http://127.0.0.1:8000/docs
start /B python app.py

timeout /t 3 /nobreak

REM 프론트엔드 설정
echo.
echo [3/4] Setting up frontend...
cd ..\frontend

if not exist node_modules (
    echo Installing frontend dependencies...
    call npm install -q
)

echo.
echo [4/4] Starting frontend server...
echo Frontend will run on http://localhost:3000
echo.
echo ====================================
echo Servers starting...
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://localhost:3000
echo ====================================
echo.

call npm start

pause
