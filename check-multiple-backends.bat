@echo off
echo ================================================
echo Checking for Multiple Python Backend Processes
echo ================================================
echo.

echo Looking for python.exe processes...
echo.
tasklist /FI "IMAGENAME eq python.exe" /FO TABLE

echo.
echo ================================================
echo Looking for processes with 'app.py' in command line...
echo.
wmic process where "name='python.exe'" get ProcessId,CommandLine /FORMAT:LIST | findstr /I "app.py"

echo.
echo ================================================
echo Summary:
echo ================================================
echo.
echo If you see multiple python.exe processes, some might be old backend servers.
echo Kill all python processes and restart the backend server with:
echo   cd astegni-backend
echo   python app.py
echo.
pause
