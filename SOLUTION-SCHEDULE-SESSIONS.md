# Solution: Schedule & Sessions Tabs Errors

## Good News!
The backend server is **already running** on port 8000. The endpoints are properly configured.

## The Actual Problem
Your authentication token has likely **expired** (tokens expire after 30 minutes of inactivity).

## Quick Fix (2 Steps)

### Step 1: Clear Your Session
Open browser console (press F12) and run:
```javascript
localStorage.clear()
```

### Step 2: Log Out and Log Back In
1. Click logout in your profile
2. Log back in with your credentials
3. Go to the Schedule panel
4. Try clicking the "Schedules" and "Sessions" tabs again

---

## Why This Happens

### The 401 Error (Schedules):
- Your JWT access token expired
- Tokens are valid for 30 minutes
- After that, the backend rejects requests with 401 Unauthorized

### The 500 Error (Sessions):
- When one endpoint fails (401), it can cause cascading errors
- OR the backend encountered an error due to stale state
- The CORS error is a side-effect of the 500 error

---

## Alternative: Refresh Your Token

If you don't want to log out/in, you can refresh your token:

```javascript
// In browser console (F12):
const refreshToken = localStorage.getItem('refreshToken');

fetch('http://localhost:8000/api/refresh', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ refresh_token: refreshToken })
})
.then(res => res.json())
.then(data => {
    localStorage.setItem('token', data.access_token);
    console.log('✅ Token refreshed!');
    // Now reload the page
    location.reload();
})
.catch(err => {
    console.error('❌ Token refresh failed:', err);
    console.log('Please log out and log back in');
});
```

---

## Verification

After logging back in, you should see:
1. **Schedules tab** loads without 401 error
2. **Sessions tab** loads without 500 error
3. Both tabs display data or "No data yet" messages

---

## Backend Status: ✅ RUNNING

The backend is running on http://localhost:8000 and ready to serve requests.

**Test it**:
```bash
curl http://localhost:8000/docs
```
You should see the FastAPI documentation page.

---

## If Still Not Working

### Check Your Login Status
```javascript
// In browser console:
console.log('Token:', localStorage.getItem('token'));
console.log('User:', localStorage.getItem('user'));
console.log('Active Role:', localStorage.getItem('userRole'));
```

If any of these are `null`, you're not logged in.

### Check Backend Logs
The backend is running in a background process. To see live logs, stop it and restart in a visible terminal:

```bash
# Stop background process
taskkill /F /IM python.exe

# Start in foreground
cd astegni-backend
python app.py
```

Then watch the terminal when you click the tabs. You'll see the requests and any errors.

---

## Summary

✅ **Backend is running** (confirmed)
✅ **Endpoints are registered** (confirmed)
✅ **CORS is configured** (confirmed)
❌ **Your session expired** (likely cause)

**Solution**: Log out and log back in to get a fresh token.

---

## Still Getting Errors After Fresh Login?

If you still get errors after logging in with a fresh token, there might be a backend code issue. In that case:

1. Check the backend terminal for Python errors
2. Run the diagnostics:
   ```bash
   cd astegni-backend
   python -c "
   from sqlalchemy import create_engine, inspect
   from dotenv import load_dotenv
   import os
   load_dotenv()
   engine = create_engine(os.getenv('DATABASE_URL'))
   inspector = inspect(engine)
   tables = inspector.get_table_names()
   print('tutor_schedules exists:', 'tutor_schedules' in tables)
   print('tutor_sessions exists:', 'tutor_sessions' in tables)
   "
   ```

3. Share the backend terminal output so we can see the actual Python error.
