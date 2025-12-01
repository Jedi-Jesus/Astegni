@echo off
echo ========================================
echo   ASTEGNI SERVER RESTART SCRIPT
echo ========================================
echo.

echo [Step 1/5] Checking for existing servers...
netstat -ano | findstr ":8000 :8081"
echo.

echo [Step 2/5] Killing ALL Python processes (frontend and backend)...
taskkill /F /IM python.exe 2>nul
if %errorlevel% equ 0 (
    echo Successfully killed Python processes
) else (
    echo No Python processes found or already stopped
)
echo.

echo [Step 3/5] Waiting for ports to release...
timeout /t 3 /nobreak >nul
echo Ports released!
echo.

echo [Step 4/5] Verifying ports are clear...
netstat -ano | findstr ":8000 :8081"
if %errorlevel% equ 0 (
    echo WARNING: Some processes still running! You may need to close terminal windows manually.
) else (
    echo SUCCESS: All ports are clear!
)
echo.

echo [Step 5/5] Starting fresh servers...
echo.

echo Starting Backend Server on port 8000...
start "Astegni Backend - DO NOT CLOSE" cmd /k "cd /d "%~dp0astegni-backend" && echo Backend Server Started && echo ================================ && python app.py"
timeout /t 4 /nobreak >nul
echo Backend started!
echo.

echo Starting Frontend Server on port 8081 (cache-free)...
start "Astegni Frontend - DO NOT CLOSE" cmd /k "cd /d "%~dp0" && echo Frontend Server Started (Cache-Free) && echo ================================ && python dev-server.py"
timeout /t 2 /nobreak >nul
echo Frontend started!
echo.

echo ========================================
echo   SERVER STATUS
echo ========================================
netstat -ano | findstr ":8000 :8081"
echo.

echo ========================================
echo   SERVERS READY!
echo ========================================
echo.
echo Frontend:  http://localhost:8081  (Cache-Free Development Server)
echo Backend:   http://localhost:8000
echo API Docs:  http://localhost:8000/docs
echo.
echo Two new windows opened:
echo - "Astegni Backend - DO NOT CLOSE"
echo - "Astegni Frontend - DO NOT CLOSE"
echo.
echo NOTE: Frontend now uses port 8081 with cache disabled
echo       This ensures you always see the latest file changes
echo.
echo Keep those windows open while working!
echo Press Ctrl+C in those windows to stop servers.
echo.
echo Press any key to close this window...
pause >nul
