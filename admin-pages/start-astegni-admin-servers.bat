@echo off
echo ========================================
echo   ASTEGNI ADMIN SERVER RESTART SCRIPT
echo ========================================
echo.

echo [Step 1/5] Checking for existing admin servers...
netstat -ano | findstr ":8001 :8082"
echo.

echo [Step 2/5] Note: This script starts SEPARATE servers for admin
echo            User servers (8000/8081) will NOT be affected
echo.

echo [Step 3/5] Waiting for any port conflicts to clear...
timeout /t 2 /nobreak >nul
echo Ready!
echo.

echo [Step 4/5] Verifying admin ports are clear...
netstat -ano | findstr ":8001 :8082"
if %errorlevel% equ 0 (
    echo WARNING: Admin ports may be in use! You may need to close existing admin servers.
) else (
    echo SUCCESS: Admin ports are clear!
)
echo.

echo [Step 5/5] Starting fresh admin servers...
echo.

echo Starting Admin Backend Server on port 8001...
start "Astegni Admin Backend - DO NOT CLOSE" cmd /k "cd /d "%~dp0..\astegni-backend" && echo Admin Backend Server Started on PORT 8001 && echo ================================ && set ADMIN_PORT=8001 && python -c "import app; import uvicorn; uvicorn.run(app.app, host='0.0.0.0', port=8001)"
timeout /t 4 /nobreak >nul
echo Admin Backend started!
echo.

echo Starting Admin Frontend Server on port 8082...
start "Astegni Admin Frontend - DO NOT CLOSE" cmd /k "cd /d "%~dp0" && echo Admin Frontend Server Started on PORT 8082 && echo ================================ && python -m http.server 8082"
timeout /t 2 /nobreak >nul
echo Admin Frontend started!
echo.

echo ========================================
echo   ADMIN SERVER STATUS
echo ========================================
netstat -ano | findstr ":8001 :8082"
echo.

echo ========================================
echo   ADMIN SERVERS READY!
echo ========================================
echo.
echo Admin Login:     http://localhost:8082/index.html
echo Admin Frontend:  http://localhost:8082/
echo Admin Backend:   http://localhost:8001
echo Admin API Docs:  http://localhost:8001/docs
echo.
echo ----------------------------------------
echo   USER SERVERS (if running separately)
echo ----------------------------------------
echo User Frontend:   http://localhost:8081
echo User Backend:    http://localhost:8000
echo.
echo Two new windows opened:
echo - "Astegni Admin Backend - DO NOT CLOSE"
echo - "Astegni Admin Frontend - DO NOT CLOSE"
echo.
echo NOTE: Admin uses ports 8001/8082, User uses ports 8000/8081
echo       This allows simultaneous admin and user login!
echo.
echo Keep those windows open while working!
echo Press Ctrl+C in those windows to stop servers.
echo.
echo Press any key to close this window...
pause >nul
