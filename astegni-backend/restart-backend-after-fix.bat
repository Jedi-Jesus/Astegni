@echo off
echo.
echo ========================================
echo  SESSION REQUEST BUGS FIXED
echo ========================================
echo.
echo Two bugs have been fixed in session_request_endpoints.py:
echo.
echo Bug #1 (Line 971):
echo   - Changed session_request.get() to default value of 1
echo.
echo Bug #2 (Line 983):
echo   - Added investment_date column to user_investments INSERT
echo   - This was causing "null value violates not-null constraint"
echo.
echo ========================================
echo  RESTARTING BACKEND...
echo ========================================
echo.

REM Kill any existing Python processes running app.py
for /f "tokens=2" %%i in ('tasklist /FI "IMAGENAME eq python.exe" /NH') do (
    taskkill /PID %%i /F 2>nul
)

timeout /t 2 >nul

REM Start the backend
python app.py

pause
