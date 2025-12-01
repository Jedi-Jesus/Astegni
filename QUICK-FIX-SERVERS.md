# 🚀 Quick Server Fix Guide

## If Navigation Breaks Again

### Symptoms
- ERR_EMPTY_RESPONSE when clicking profile links
- Pages not loading from navigation
- "localhost didn't send any data"

### Quick Fix (Copy-Paste These Commands)

#### Step 1: Check for Port Conflicts
```bash
netstat -ano | findstr :8080
```

#### Step 2: Kill All Processes on Port 8080
```bash
# Replace <PID> with actual process IDs from Step 1
taskkill //F //PID <PID>
```

Or kill all at once (replace PIDs with actual ones):
```bash
taskkill //F //PID 12345 && taskkill //F //PID 67890
```

#### Step 3: Start Fresh Servers

**Frontend (Terminal 1):**
```bash
cd "c:\Users\zenna\Downloads\Astegni"
python -m http.server 8080
```

**Backend (Terminal 2):**
```bash
cd "c:\Users\zenna\Downloads\Astegni\astegni-backend"
python app.py
```

## Alternative: Use the Batch File

You can use the existing batch file (if configured properly):
```bash
start-astegni.bat
```

## Verify Everything Works

### Quick Check
```bash
# Frontend
curl -I http://localhost:8080/index.html

# Backend
curl -I http://localhost:8000/docs
```

### Browser Check
1. Open: http://localhost:8080
2. Login
3. Click profile dropdown
4. Navigate to profile pages
5. ✅ Should load without errors

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| ERR_EMPTY_RESPONSE | Multiple servers on 8080 | Kill all processes, restart |
| Connection Refused | Server not running | Start server |
| 404 Not Found | Wrong URL/path | Check relative paths |
| CORS errors | Backend not running | Start backend on port 8000 |

## Pro Tips

1. **Always check before starting:**
   ```bash
   netstat -ano | findstr :8080
   netstat -ano | findstr :8000
   ```

2. **One server per port:**
   - Port 8080 = Frontend only
   - Port 8000 = Backend only

3. **If in doubt, restart both:**
   - Kill all processes
   - Start fresh

4. **Test page:**
   - http://localhost:8080/test-navigation.html

---

**Last Updated:** November 19, 2025
**Status:** ✅ Servers running correctly
