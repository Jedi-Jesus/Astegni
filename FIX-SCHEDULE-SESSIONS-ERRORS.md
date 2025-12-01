# Fix Schedule & Sessions Errors

## Problem Summary
You're getting:
1. **401 Unauthorized** for `/api/tutor/schedules`
2. **500 Internal Server Error** + CORS blocked for `/api/tutor/sessions`

## Root Cause
The backend server likely crashed or has stale state after we deleted the `tutoring_sessions` table. The endpoints are correctly using `tutor_sessions` table, but the server needs to be restarted.

## Quick Fix (3 Steps)

### Step 1: Stop the Backend Server
```bash
# Press Ctrl+C in the terminal where the backend is running
# OR find and kill the process:
taskkill /F /IM python.exe
```

### Step 2: Restart the Backend
```bash
cd astegni-backend
python app.py
```

### Step 3: Test the Endpoints
Refresh your browser and try clicking the Schedule and Sessions tabs again.

---

## If That Doesn't Work

### Check 1: Verify Token in Browser Console
```javascript
// Open browser console (F12) and run:
localStorage.getItem('token')

// If it's null or expired, log out and log back in
```

### Check 2: Check Backend Terminal for Errors
Look for Python traceback errors in the terminal where you ran `python app.py`.

### Check 3: Test Endpoints Manually

**Test Schedules:**
```bash
# Get your token from browser console first
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:8000/api/tutor/schedules
```

**Test Sessions:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:8000/api/tutor/sessions
```

---

## Understanding the Errors

### 401 Unauthorized
**Means**: Your authentication token is either:
- Expired (tokens expire after 30 minutes)
- Not being sent correctly
- Invalid

**Fix**: Log out and log back in to get a fresh token.

### 500 Internal Server Error + CORS
**Means**: The backend server crashed or encountered a Python error.

**Why CORS appears**: When the server crashes (500 error), it doesn't send proper CORS headers, so the browser blocks the request.

**Fix**: Check the backend terminal for the actual Python error, then restart the server.

---

## Verification Checklist

After restarting the backend, verify:

- [ ] Backend is running (check terminal for "Application startup complete")
- [ ] You can access http://localhost:8000/docs
- [ ] You're logged in to the frontend
- [ ] Token exists in localStorage
- [ ] Click "Schedules" tab - should load without 401 error
- [ ] Click "Sessions" tab - should load without 500 error

---

## Still Not Working?

If the errors persist after restarting:

1. **Check database connection**:
   ```bash
   cd astegni-backend
   python test_connection.py
   ```

2. **Verify tables exist**:
   ```bash
   python -c "
   from sqlalchemy import create_engine, inspect
   from dotenv import load_dotenv
   import os
   load_dotenv()
   engine = create_engine(os.getenv('DATABASE_URL'))
   inspector = inspect(engine)
   tables = inspector.get_table_names()
   print('tutor_schedules' in tables, 'tutor_sessions' in tables)
   "
   ```
   Should print: `True True`

3. **Check if endpoints are registered**:
   Open http://localhost:8000/docs and look for:
   - `GET /api/tutor/schedules`
   - `GET /api/tutor/sessions`
   - `GET /api/tutor/sessions/stats/summary`

---

## Common Issues

### Issue: "Token is null"
**Solution**: You need to log in first. Go to login page and sign in.

### Issue: "Token expired" or 401 persists
**Solution**:
1. Clear localStorage: `localStorage.clear()`
2. Log out and log back in
3. Check backend logs for authentication errors

### Issue: 500 error persists
**Solution**: There's a Python error. Check the backend terminal output for the full traceback.

### Issue: CORS error only (no 500)
**Solution**: The endpoint might not exist. Check http://localhost:8000/docs to see if the endpoint is listed.

---

## Expected Backend Terminal Output

When the server starts successfully, you should see:
```
INFO:     Started server process [XXXX]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

When you click Schedules/Sessions tabs, you should see:
```
INFO:     127.0.0.1:XXXXX - "GET /api/tutor/schedules HTTP/1.1" 200 OK
INFO:     127.0.0.1:XXXXX - "GET /api/tutor/sessions HTTP/1.1" 200 OK
INFO:     127.0.0.1:XXXXX - "GET /api/tutor/sessions/stats/summary HTTP/1.1" 200 OK
```

If you see `401` or `500` instead of `200 OK`, there's still an issue.

---

## Quick Restart Command

```bash
# Kill backend
taskkill /F /IM python.exe

# Restart backend
cd astegni-backend && python app.py
```

Then refresh your browser and test the tabs again.
