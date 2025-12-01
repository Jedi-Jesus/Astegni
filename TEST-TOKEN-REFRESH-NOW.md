# Test Token Refresh Fix - IMPORTANT!

## The Issue
Your browser has cached the old JavaScript files. You need to **force a hard refresh** to load the new code.

## How to Test (Step by Step)

### Step 1: Clear Browser Cache
**Windows/Linux:**
- Press `Ctrl + Shift + Delete`
- Select "Cached images and files"
- Click "Clear data"

**OR do a Hard Refresh:**
- Press `Ctrl + F5` (Windows/Linux)
- Or `Ctrl + Shift + R` (Windows/Linux)
- Or `Cmd + Shift + R` (Mac)

### Step 2: Test the Fix
1. Login to the application
2. Open browser DevTools (F12)
3. Go to the **Console** tab
4. Navigate to `branch/find-tutors.html`
5. Click "Request a Course" button
6. Fill out the form and submit

### Step 3: Watch the Console
You should see debug messages like:
```
[RequestModals] Course submit started
[RequestModals] authManager found, verifying token...
[AuthManager.verifyToken] Starting token verification
[AuthManager.verifyToken] Response status: 200  (or 401 if expired)
[AuthManager.verifyToken] Token is valid  (or "Token expired or invalid (401)")
```

## Expected Behavior

### If Token is Valid:
```
[RequestModals] Course submit started
[RequestModals] authManager found, verifying token...
[AuthManager.verifyToken] Starting token verification
[AuthManager.verifyToken] Response status: 200
[AuthManager.verifyToken] Token is valid
[RequestModals] Using existing valid token
[RequestModals] Proceeding with course request submission
```
**Result:** ✅ Request submitted successfully

### If Token is Expired (This is the fix!):
```
[RequestModals] Course submit started
[RequestModals] authManager found, verifying token...
[AuthManager.verifyToken] Starting token verification
[AuthManager.verifyToken] Response status: 401
[AuthManager.verifyToken] Token expired or invalid (401)
[RequestModals] Token invalid, attempting refresh...
[AuthManager] Token refreshed successfully
[RequestModals] Refresh result: true
[RequestModals] Successfully refreshed token
[RequestModals] Proceeding with course request submission
```
**Result:** ✅ Token automatically refreshed, request submitted successfully

### If Refresh Token Also Expired:
```
[RequestModals] Token invalid, attempting refresh...
[AuthManager] Failed to refresh token: 401
[RequestModals] Refresh result: false
[RequestModals] Failed to refresh token
[RequestModals] No token available, redirecting to login
```
**Result:** ⚠️ Redirected to login page (expected after 7 days)

## How to Simulate Token Expiry

To test the refresh mechanism without waiting 30 minutes:

1. Open DevTools → Application → Local Storage
2. Find the `token` key
3. Change its value to: `expired_token_test`
4. Now try to request a course
5. You should see the refresh logic kick in

## Backend Logs to Watch

In your backend terminal, you should see:
```
POST /api/course-requests HTTP/1.1" 200 OK  ✅ (not 401!)
```

Instead of:
```
POST /api/course-requests HTTP/1.1" 401 Unauthorized  ❌ (old behavior)
```

## If It Still Doesn't Work

1. **Check the Console** - Look for the debug messages
2. **Verify you did a hard refresh** - The timestamps on the JS files should be recent
3. **Check localStorage** - Make sure you have both `token` and `refresh_token`
4. **Try incognito mode** - This forces a clean slate

## Manual Verification

Open DevTools Console and run:
```javascript
// Check if authManager is loaded
console.log('authManager available:', typeof authManager !== 'undefined');

// Check if refresh method exists
console.log('refreshAccessToken exists:', typeof authManager?.refreshAccessToken === 'function');

// Check tokens
console.log('Access token:', localStorage.getItem('token')?.substring(0, 20) + '...');
console.log('Refresh token:', localStorage.getItem('refresh_token')?.substring(0, 20) + '...');

// Test refresh manually
authManager.refreshAccessToken().then(result => {
    console.log('Manual refresh test result:', result);
});
```

## What Changed in the Code

1. **auth.js** - Added `refreshAccessToken()` method
2. **auth.js** - Fixed `verifyToken()` to return false on 401
3. **request-modals.js** - Added token verification before API calls
4. **Added debug logging** - To help troubleshoot

## Remove Debug Logs Later

Once confirmed working, you can remove the console.log statements for production.
