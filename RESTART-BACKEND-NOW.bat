@echo off
echo Killing all Python processes...
taskkill /F /IM python.exe 2>nul

echo Waiting 2 seconds...
timeout /t 2 /nobreak >nul

echo Starting backend server...
cd astegni-backend
start cmd /k "python app.py"

echo Backend restarted! Check the new window for logs.
pause
