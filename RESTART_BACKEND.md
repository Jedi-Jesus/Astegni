# Backend Restart Required

## Why You're Getting CORS Error

The CORS error you're seeing:
```
Access to fetch at 'http://localhost:8000/api/add-role' from origin 'http://localhost:8081'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

This is happening because:
1. ✅ The role WAS created successfully (backend processed the request)
2. ❌ The browser blocked the response (old backend code has issues)
3. 🔄 **Backend needs to be restarted** with the new code

## What Changed

We modified the backend in `astegni-backend/app.py modules/routes.py`:
- Lines 4232, 4242 (reactivation flow)
- Lines 4331, 4343 (new role flow)

The old code automatically switched `active_role`, which might be causing the response to be malformed or the backend to have issues.

## How to Fix

### Step 1: Stop the Current Backend
In the terminal running the backend, press:
```
Ctrl + C
```

### Step 2: Restart the Backend
```bash
cd astegni-backend
python app.py
```

### Step 3: Verify Backend is Running
You should see:
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Step 4: Test Again
1. Refresh your browser (Ctrl + F5 to clear cache)
2. Try adding a role again
3. This time it should work without CORS errors

## Expected Behavior After Restart

**Before clicking "Switch to Account":**
- `localStorage.getItem('userRole')` should still be your current role
- Profile dropdown should still show your current role
- Browser console should show: `[handleAddRoleSubmit] Updated access token (active_role unchanged)`

**After clicking "Switch to Account":**
- API call to `/api/switch-role` should be made
- You'll be redirected to the new role's profile page
- Profile dropdown will show the new role

**After clicking "Stay Here":**
- Modal closes
- You remain on your current profile page
- New role is available in role switcher dropdown

## Troubleshooting

### If CORS error persists after restart:
1. Make sure backend is running on port 8000
2. Make sure frontend is on port 8081 (`python dev-server.py`)
3. Clear browser cache completely
4. Check backend logs for any errors

### If role still auto-switches:
1. Verify backend code was saved correctly
2. Check backend logs to confirm new code is running
3. Look for this log line: `[handleAddRoleSubmit] Updated access token (active_role unchanged)`

### If backend won't start:
1. Check for Python errors in the output
2. Make sure all dependencies are installed: `pip install -r requirements.txt`
3. Check database is running and accessible
4. Verify `.env` file has correct settings

## Quick Debug Commands

Check if backend is running:
```bash
curl http://localhost:8000/health
```

Check CORS headers:
```bash
curl -i -X OPTIONS http://localhost:8000/api/add-role \
  -H "Origin: http://localhost:8081" \
  -H "Access-Control-Request-Method: POST"
```

Test add-role endpoint:
```bash
curl -X POST http://localhost:8000/api/add-role \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"otp": "123456", "new_role": "tutor", "password": "test"}'
```
