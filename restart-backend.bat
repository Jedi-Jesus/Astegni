@echo off
echo Stopping backend server...
taskkill /F /PID 2016 2>nul
timeout /t 2 /nobreak >nul

echo Starting backend server...
cd astegni-backend
start "Astegni Backend" cmd /k "python app.py"

echo Backend restarted on port 8000
echo.
echo NEXT STEPS:
echo 1. Wait 5 seconds for backend to fully start
echo 2. In your browser, press Ctrl+Shift+R to hard refresh
echo 3. Or clear browser cache: Ctrl+Shift+Delete
echo.
pause
