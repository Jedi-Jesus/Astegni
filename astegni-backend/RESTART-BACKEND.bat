@echo off
echo Stopping all Python processes on port 8000...
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') DO (
    echo Killing process %%P
    taskkill //F //PID %%P 2>nul
)

timeout /t 3 /nobreak

echo Starting backend server...
cd /d "%~dp0"
start "Astegni Backend" python app.py

echo Backend server started!
echo Check the new window for server logs.
pause
