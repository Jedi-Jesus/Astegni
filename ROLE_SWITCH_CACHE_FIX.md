# Role Switch Cache Fix

## The Problem

The `/api/switch-role` endpoint is NOT being called by the browser, even though the frontend shows a successful API response. This is evidenced by:

1. **Frontend debug shows**: `📥 API RESPONSE: http://localhost:8000/api/switch-role returned active_role="tutor"`
2. **Backend terminal shows**: ZERO `[switch-role]` logs
3. **Database shows**: `active_role="student"` (unchanged)
4. **JWT token shows**: `role="tutor"` (from a previous switch attempt)

**Conclusion**: The browser is returning a **CACHED RESPONSE** without actually making the network request to the backend.

## Root Cause

Modern browsers aggressively cache successful POST requests if:
1. The response doesn't have proper `Cache-Control` headers
2. The request doesn't have cache-busting headers
3. The browser thinks the request is "safe" to cache

Even though POST requests are not supposed to be cached, browsers sometimes do cache them for performance.

## The Fix

### 1. Add Cache-Busting Headers to Frontend Fetch Calls

**File**: [js/root/profile-system.js:1540-1551](js/root/profile-system.js#L1540-L1551)

**Changed**:
```javascript
const response = await fetch(`${API_BASE_URL}/api/switch-role`, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${getStoredAuthToken()}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',  // NEW
        'Pragma': 'no-cache',                                      // NEW
        'Expires': '0'                                             // NEW
    },
    body: JSON.stringify({ role: newRole }),
    cache: 'no-cache'  // NEW
});
```

These headers tell the browser:
- `Cache-Control: no-cache, no-store, must-revalidate` - Don't cache this request
- `Pragma: no-cache` - Backwards compatibility for HTTP/1.0
- `Expires: 0` - Expire immediately
- `cache: 'no-cache'` - Fetch API option to bypass cache

### 2. Test with Diagnostic Tool

**File**: [test-role-switch-network.html](test-role-switch-network.html)

A comprehensive diagnostic tool that:
1. Tests backend connectivity
2. Makes role switch requests with cache-busting headers
3. Shows response headers and timing
4. Compares browser logs vs backend logs

**How to use**:
1. Make sure backend is running (`cd astegni-backend && python app.py`)
2. Login at http://localhost:8081
3. Open http://localhost:8081/test-role-switch-network.html
4. Click "Run Full Diagnostic"
5. **WATCH THE BACKEND TERMINAL** for `[switch-role]` logs
6. Compare what appears in the diagnostic tool vs backend terminal

**Expected Outcome**:
- If backend logs appear → Fix is working
- If backend logs DON'T appear → Still a cache/network issue

### 3. Check for Multiple Backend Processes

**File**: [check-multiple-backends.bat](check-multiple-backends.bat)

Run this script to check if there are multiple Python processes running. If you see multiple `python.exe app.py` processes, some might be old backend servers listening on different ports.

**How to use**:
```bash
check-multiple-backends.bat
```

**If multiple processes found**:
1. Close all Python processes: Task Manager → End all python.exe
2. Restart backend: `cd astegni-backend && python app.py`
3. Try role switching again

## Testing the Fix

### Test 1: Use Diagnostic Tool
1. Open http://localhost:8081/test-role-switch-network.html
2. Click "Run Full Diagnostic"
3. Watch both:
   - Browser diagnostic log
   - Backend terminal
4. Verify `[switch-role]` logs appear in backend terminal

### Test 2: Use Browser DevTools
1. Open http://localhost:8081
2. Login with your account
3. Open DevTools (F12) → Network tab
4. Switch roles in the UI
5. Look for POST request to `/api/switch-role`
6. Check if it says "(from cache)" or "(from disk cache)"
7. Verify status is 200 and response is fresh

### Test 3: Clear Browser Cache
1. Open DevTools (F12)
2. Right-click Refresh button → "Empty Cache and Hard Reload"
3. OR: Settings → Privacy → Clear browsing data → Cached images and files
4. Try role switching again

### Test 4: Test in Incognito Mode
1. Open browser in Incognito/Private mode
2. Go to http://localhost:8081
3. Login
4. Switch roles
5. If it works in Incognito but not regular browser → Cache issue confirmed

## What Should Happen Now

### Expected Backend Logs (when fix is working):
```
[switch-role] BEFORE update: user 1 active_role = student
[switch-role] AFTER update (before commit): user 1 active_role = tutor
[switch-role] ✅ COMMIT SUCCESSFUL
[switch-role] VERIFIED from DB (fresh query): user 1 active_role = tutor
```

### Expected Frontend Behavior:
1. User clicks "Switch to Tutor"
2. Frontend makes POST to `/api/switch-role` with cache-busting headers
3. Backend receives request and updates database
4. Backend returns response with new token
5. Frontend updates localStorage and redirects to tutor profile
6. User sees tutor profile page
7. Role persists across page reloads

## If Fix Still Doesn't Work

### Scenario A: Backend logs appear, but role still reverts
**Diagnosis**: Database or frontend issue, NOT a cache issue.

**Next steps**:
1. Check if database is actually being updated
2. Run `python astegni-backend/diagnose_role_issue.py` to see database state
3. Check if `/api/me` is overwriting the role

### Scenario B: Backend logs still don't appear
**Diagnosis**: Request still not reaching backend.

**Possible causes**:
1. **Browser extension intercepting requests** → Test in Incognito
2. **Multiple backend servers** → Run `check-multiple-backends.bat`
3. **Network proxy** → Check proxy settings
4. **CORS issue** → Check browser console for CORS errors
5. **Wrong API base URL** → Verify `window.API_BASE_URL` in browser console

## Additional Cache-Busting Options

If the fix still doesn't work, try these:

### Option 1: Add Timestamp to URL
```javascript
const timestamp = Date.now();
const response = await fetch(`${API_BASE_URL}/api/switch-role?_=${timestamp}`, {
    // ... rest of the code
});
```

### Option 2: Add Backend Cache-Control Headers
In `astegni-backend/app.py modules/routes.py`, add to `/api/switch-role` response:
```python
return JSONResponse(
    content={
        "message": f"Successfully switched to {actual_active_role} role",
        "active_role": actual_active_role,
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    },
    headers={
        "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0"
    }
)
```

### Option 3: Disable Browser Cache Globally (Development Only)
1. Open DevTools (F12)
2. Network tab → Check "Disable cache"
3. Keep DevTools open while testing

## Files Modified

1. ✅ [js/root/profile-system.js](js/root/profile-system.js) - Added cache-busting headers
2. ✅ [test-role-switch-network.html](test-role-switch-network.html) - New diagnostic tool
3. ✅ [check-multiple-backends.bat](check-multiple-backends.bat) - Check for multiple backend processes

## Next Steps

1. **Clear browser cache** completely
2. **Run diagnostic tool** at http://localhost:8081/test-role-switch-network.html
3. **Watch backend terminal** for `[switch-role]` logs
4. **Test role switching** in the actual UI
5. **Report back** whether backend logs appear

If backend logs appear after these changes, the cache issue is fixed and role switching should work permanently.
