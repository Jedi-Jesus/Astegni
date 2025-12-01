# Backend Authorization Header Fix

## The Real Problem

The issue wasn't just about token expiry - the **backend endpoint wasn't properly receiving the Authorization header** from the frontend!

## Root Cause

In [course_school_request_endpoints.py:66](astegni-backend/course_school_request_endpoints.py#L66), the `get_current_user` dependency function had:

```python
async def get_current_user(authorization: Optional[str] = None):
```

This **doesn't work** in FastAPI because:
- The parameter `authorization` has no way to know it should come from the HTTP headers
- FastAPI needs explicit declaration using `Header()` to extract header values
- Without this, the `authorization` parameter was always `None`, causing instant 401 errors

## The Fix

Changed to:

```python
from fastapi import Header  # ← Import Header

async def get_current_user(authorization: Optional[str] = Header(None)):
                                                        # ↑ Properly extract from headers
```

Now FastAPI knows to:
1. Look for the `Authorization` header in the HTTP request
2. Pass its value to the `authorization` parameter
3. Validate the JWT token properly

## Why You Were Getting 401

**Before the fix:**
```
Frontend → Sends: Authorization: Bearer abc123...
Backend → Receives: authorization = None  ❌
Backend → Returns: 401 Unauthorized (no header)
```

**After the fix:**
```
Frontend → Sends: Authorization: Bearer abc123...
Backend → Receives: authorization = "Bearer abc123..."  ✅
Backend → Validates token → Returns: 200 OK
```

## Files Modified

### Backend:
- **`astegni-backend/course_school_request_endpoints.py`**
  - Line 5: Added `Header` to imports
  - Line 66: Changed `= None` to `= Header(None)`
  - Line 74: Improved error message
  - Line 85: Added debug logging for token errors

### Frontend:
- **`js/root/auth.js`**
  - Added `refreshAccessToken()` method (lines 328-370)
  - Fixed `verifyToken()` to return false on 401 (line 314)
  - Added debug logging throughout

- **`js/find-tutors/request-modals.js`**
  - Updated `handleCourseSubmit()` to verify/refresh tokens (lines 130-184)
  - Updated `handleSchoolSubmit()` to verify/refresh tokens (lines 277-313)
  - Added comprehensive debug logging

## How to Test

### 1. Restart the Backend Server
```bash
cd astegni-backend
# Press Ctrl+C to stop the server
python app.py
```

**IMPORTANT:** The backend MUST be restarted to load the new code!

### 2. Clear Browser Cache and Hard Refresh
- Press `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)
- Or clear cache via DevTools

### 3. Test the Flow
1. Login to the application
2. Navigate to `branch/find-tutors.html`
3. Click "Request a Course"
4. Fill out the form and submit
5. Watch the backend logs for:
   ```
   POST /api/course-requests HTTP/1.1" 200 OK  ✅
   ```

## Expected Backend Logs

### Success (After Fix):
```
INFO:     127.0.0.1:xxxxx - "OPTIONS /api/course-requests HTTP/1.1" 200 OK
INFO:     127.0.0.1:xxxxx - "POST /api/course-requests HTTP/1.1" 200 OK
```

### Failure (Before Fix):
```
INFO:     127.0.0.1:xxxxx - "OPTIONS /api/course-requests HTTP/1.1" 200 OK
INFO:     127.0.0.1:xxxxx - "POST /api/course-requests HTTP/1.1" 401 Unauthorized
```

## Debug Information

If you still get 401 after restarting the backend, check the backend console for:

```
[course_school_request_endpoints] Token validation error: ...
```

This will tell you exactly what's wrong with the token.

## Common Issues

### Issue 1: Still Getting 401
**Solution:** Make sure you **restarted the backend server**

### Issue 2: "No authorization header" Error
**Solution:**
- Clear browser cache (Ctrl + Shift + R)
- Check DevTools → Network tab → Request Headers
- Should see: `Authorization: Bearer eyJ...`

### Issue 3: Token Validation Errors
**Solution:**
- Check if your JWT secret keys match in `.env`
- Verify token hasn't expired (default: 30min)
- Try logging in again to get a fresh token

## Production Recommendations

1. **Remove Debug Logs** - The console.log statements should be removed for production
2. **Rate Limiting** - Add rate limiting to prevent abuse
3. **Token Rotation** - Implement refresh token rotation for better security
4. **HTTPS Only** - Ensure tokens are only sent over HTTPS
5. **CORS** - Verify CORS settings are properly configured

## Related Endpoints

This same authentication pattern is used in:
- `POST /api/school-requests` - Also fixed
- All other authenticated endpoints should use the same `Header()` pattern

## Testing Token Refresh

To specifically test the token refresh mechanism:

1. Login to get fresh tokens
2. Wait 31 minutes (or manually edit localStorage token to invalid value)
3. Try to request a course
4. Should see in console:
   ```
   [AuthManager] Token refreshed successfully
   [RequestModals] Successfully refreshed token
   ```
5. Backend should receive the NEW refreshed token and return 200 OK

## Summary

Two fixes were needed:

1. **Backend Fix (Critical):** Use `Header()` to properly extract Authorization header
2. **Frontend Fix (Enhancement):** Add automatic token refresh when expired

Both fixes are now complete! 🎉
