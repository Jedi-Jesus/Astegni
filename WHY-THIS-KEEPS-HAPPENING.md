# 🔄 Why Your Servers Keep Conflicting

## The Root Problem

You're accidentally starting **multiple instances** of the frontend server on port 8080. Here's what's happening:

### Scenario 1: Multiple Terminal Windows
```
Terminal 1: python -m http.server 8080  ← Started earlier
Terminal 2: python -m http.server 8080  ← Started again (by accident)
Result: Port conflict → ERR_EMPTY_RESPONSE
```

### Scenario 2: Background Processes
- You close the terminal window, but the Python process keeps running in background
- Later, you start a new server
- Now you have 2+ servers conflicting

### Scenario 3: Using Multiple Methods
```
Method 1: start-astegni.bat         ← Starts servers
Method 2: python -m http.server 8080 ← Manually started
Result: Duplicate servers
```

## How to Prevent This

### ✅ Method 1: Always Check First (Recommended)

**Before starting servers, ALWAYS check if they're already running:**

```bash
# Check for existing servers
netstat -ano | findstr ":8080 :8000"

# If you see output, servers are already running!
# Don't start new ones.

# If port 8080 is busy, kill the processes:
taskkill /F /IM python.exe /FI "WINDOWTITLE eq *http.server*"
```

### ✅ Method 2: Use the New Restart Script

I created a script that handles everything automatically:

```bash
# From Astegni folder, just run:
restart-servers.bat
```

This script:
1. Kills old servers
2. Starts backend on port 8000
3. Starts frontend on port 8080
4. Opens separate windows for each
5. Shows you the status

### ✅ Method 3: Keep Terminal Windows Open

Instead of closing terminals, **keep them open and visible**:
- Terminal 1: Backend (you'll see FastAPI logs)
- Terminal 2: Frontend (you'll see HTTP requests)

This way you always know what's running.

## Quick Fix When It Breaks

### One-Line Fix (Copy-Paste)

```bash
# Kill all Python HTTP servers and restart
taskkill /F /IM python.exe & timeout /t 2 & cd "c:\Users\zenna\Downloads\Astegni" & start cmd /k "cd astegni-backend && python app.py" & timeout /t 2 & start cmd /k "python -m http.server 8080"
```

### Manual Fix (Step by Step)

```bash
# 1. Check what's running
netstat -ano | findstr :8080

# 2. Kill the Python processes (replace PID with actual numbers)
taskkill /F /PID <PID>

# 3. Restart servers
cd "c:\Users\zenna\Downloads\Astegni"

# Backend (Terminal 1)
cd astegni-backend
python app.py

# Frontend (Terminal 2 - open new window)
cd "c:\Users\zenna\Downloads\Astegni"
python -m http.server 8080
```

## Why Multiple Processes Don't Get Killed

Some Python processes run with elevated privileges or as system services. When you see:

```
ERROR: The process with PID 47180 could not be terminated.
Reason: Access is denied.
```

**Solution:** Close the terminal window that started that process, or run Command Prompt as Administrator.

## Long-Term Solution

### Option A: Use the Batch File

Edit the existing `start-astegni.bat` to include cleanup:

```batch
@echo off
REM Kill old servers first
taskkill /F /IM python.exe 2>nul

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Start backend
start "Backend" cmd /k "cd astegni-backend && python app.py"

REM Wait for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend
start "Frontend" cmd /k "python -m http.server 8080"

echo Servers started!
echo Frontend: http://localhost:8080
echo Backend: http://localhost:8000
pause
```

### Option B: Use a Process Manager

Install PM2 for Python or Supervisor to manage server processes:

```bash
# Install PM2 (requires Node.js)
npm install -g pm2

# Or use Supervisor (Python-based)
pip install supervisor
```

## Daily Workflow

### Starting Work
```bash
# Option 1: Use the restart script
restart-servers.bat

# Option 2: Manual start (check first!)
netstat -ano | findstr :8080
# If clear, then start servers
```

### During Work
- Keep terminal windows open and visible
- Don't start servers multiple times
- If errors occur, check for conflicts first

### Ending Work
```bash
# Close terminal windows (Ctrl+C in each)
# Or kill processes:
taskkill /F /IM python.exe
```

## Quick Reference

| Problem | Cause | Solution |
|---------|-------|----------|
| ERR_EMPTY_RESPONSE | Multiple servers on port 8080 | Kill processes, restart |
| "Port already in use" | Server already running | Check netstat, don't start again |
| Can't kill process | Running with elevated privileges | Close terminal or use Admin CMD |
| Servers stop randomly | Python crash or manual stop | Check terminal output for errors |

## Files Created

- [restart-servers.bat](restart-servers.bat) - Automated restart script
- [QUICK-FIX-SERVERS.md](QUICK-FIX-SERVERS.md) - Quick reference guide
- [FOLDER-RENAME-FIX-COMPLETE.md](FOLDER-RENAME-FIX-COMPLETE.md) - Initial fix documentation

---

**Key Takeaway:** Always check `netstat -ano | findstr :8080` before starting servers!

**Last Updated:** November 19, 2025
