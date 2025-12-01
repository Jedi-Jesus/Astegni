@echo off
echo ============================================
echo RESTARTING ASTEGNI BACKEND
echo ============================================
echo.

echo Step 1: Stopping Python processes...
taskkill /F /IM python.exe 2>nul
timeout /t 2 /nobreak >nul
echo [OK] Python processes stopped
echo.

echo Step 2: Starting backend server...
cd astegni-backend
echo Starting on http://localhost:8000
echo.
echo ============================================
echo BACKEND IS STARTING...
echo ============================================
echo.
echo Press Ctrl+C to stop the server
echo.

python app.py
