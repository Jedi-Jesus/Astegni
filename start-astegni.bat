@echo off
echo ========================================
echo    Starting Astegni Platform
echo ========================================
echo.

REM Kill existing Python processes
echo Cleaning up old processes...
taskkill /F /IM python.exe >nul 2>&1

echo.
echo [1/3] Starting Backend Server...
start "Astegni Backend" cmd /k "cd astegni-backend && python app.py"

timeout /t 5 /nobreak >nul

echo [2/3] Starting Frontend Server...
start "Astegni Frontend" cmd /k "python -m http.server 8080"

timeout /t 3 /nobreak >nul

echo [3/3] Opening Test Page...
start http://localhost:8080/test-tutor-profile-access.html

echo.
echo ========================================
echo    Astegni Platform Started!
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:8080
echo Test:     http://localhost:8080/test-tutor-profile-access.html
echo.
echo KEEP BOTH TERMINAL WINDOWS OPEN!
echo Press any key to close this launcher...
pause >nul
