# Token Refresh Fix - Course/School Request 401 Error

## Problem Summary

When users tried to request a course or school in `find-tutors.html`, they received a "session expired" error and were kicked out to the login page, even though they were logged in.

### Root Cause

The issue occurred because:

1. **JWT access tokens expire after 30 minutes** (backend setting)
2. **No automatic token refresh mechanism** - The frontend had no way to refresh expired tokens
3. **Token verification always returned true** - Even when tokens expired, the `verifyToken()` method returned true, masking the problem
4. **Missing `refreshAccessToken()` method** - The auth system stored refresh tokens but never used them

### What Was Happening

```
User logs in → Gets access token (30min) + refresh token (7 days)
      ↓
User browses site for > 30 minutes
      ↓
User clicks "Request Course" button
      ↓
Backend receives expired access token → Returns 401 Unauthorized
      ↓
Frontend shows "session expired" → Redirects to login page
```

## Solution Implemented

### 1. Added Token Refresh Method (`auth.js`)

Created the missing `refreshAccessToken()` method at [auth.js:328-370](js/root/auth.js#L328-L370):

```javascript
async refreshAccessToken() {
    const refreshToken = localStorage.getItem('refresh_token');

    if (!refreshToken) {
        console.error('No refresh token available');
        return false;
    }

    try {
        const response = await fetch(`${this.API_BASE_URL}/api/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                refresh_token: refreshToken
            })
        });

        if (response.ok) {
            const data = await response.json();

            // Update tokens
            this.token = data.access_token;
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('access_token', data.access_token);

            console.log('[AuthManager] Token refreshed successfully');
            return true;
        } else {
            console.error('[AuthManager] Failed to refresh token:', response.status);
            // If refresh fails with 401, the refresh token is also expired
            if (response.status === 401) {
                // Clear all tokens and redirect to login
                this.logout(true);
            }
            return false;
        }
    } catch (error) {
        console.error('[AuthManager] Error refreshing token:', error);
        return false;
    }
}
```

### 2. Fixed `verifyToken()` to Return False on 401

Updated [auth.js:312-314](js/root/auth.js#L312-L314) to properly return false when token is expired:

**Before:**
```javascript
} else if (response.status === 401) {
    // Token expired or invalid - DO NOT LOGOUT, just return true to keep session
    // User can continue using the app with stored credentials
    return true;  // ❌ WRONG!
}
```

**After:**
```javascript
} else if (response.status === 401) {
    // Token expired or invalid - return false so caller can refresh
    return false;  // ✅ CORRECT!
}
```

### 3. Updated Request Modal Handlers

Modified both `handleCourseSubmit()` and `handleSchoolSubmit()` in [request-modals.js](js/find-tutors/request-modals.js) to verify and refresh tokens before making API calls:

**Before:**
```javascript
// Check if user is authenticated using authManager if available
let token = localStorage.getItem('token');

// Try to get fresh token from authManager if available
if (typeof authManager !== 'undefined' && authManager.isAuthenticated()) {
    token = authManager.getToken();  // ❌ Might be expired!
}

if (!token) {
    // Show error and redirect
}
```

**After:**
```javascript
// Check if user is authenticated and get valid token
let token = null;

// Try to get and verify token from authManager if available
if (typeof authManager !== 'undefined' && authManager.isAuthenticated()) {
    // Verify token is still valid before using it
    try {
        const isValid = await authManager.verifyToken();
        if (isValid) {
            token = authManager.getToken();
        } else {
            // Token expired, try to refresh
            const refreshed = await authManager.refreshAccessToken();
            if (refreshed) {
                token = authManager.getToken();
            }
        }
    } catch (error) {
        console.error('Error verifying token:', error);
    }
}

// Fallback to localStorage token if authManager not available
if (!token) {
    token = localStorage.getItem('token');
}

if (!token) {
    // Show error and redirect
}
```

### 4. Enhanced Logout Method

Updated [auth.js:372-395](js/root/auth.js#L372-L395) to:
- Clear refresh tokens on logout
- Fixed redirect path to `../index.html`

## How It Works Now

```
User logs in → Gets access token (30min) + refresh token (7 days)
      ↓
User browses site for > 30 minutes
      ↓
User clicks "Request Course" button
      ↓
Frontend: verifyToken() → Returns false (token expired)
      ↓
Frontend: refreshAccessToken() → Gets new 30min access token
      ↓
Frontend: Makes course request with fresh token
      ↓
Backend: Accepts request → Returns 200 OK ✅
```

## Files Modified

1. **`js/root/auth.js`** - Added refresh method, fixed verify method, updated logout
2. **`js/find-tutors/request-modals.js`** - Updated token handling in submit handlers

## Testing Instructions

1. Clear browser cache and localStorage
2. Login to the application
3. Open browser DevTools → Application → Local Storage
4. Verify you have both `token` and `refresh_token` stored
5. Wait 2-3 minutes OR manually change the `token` to an invalid value
6. Navigate to `branch/find-tutors.html`
7. Click "Request a Course" or "Request a School"
8. Fill out the form and submit
9. **Expected Result:** ✅ Request should succeed with automatic token refresh
10. Check DevTools Console for `[AuthManager] Token refreshed successfully`

## Token Lifecycle

| Token Type | Lifespan | Storage | Purpose |
|------------|----------|---------|---------|
| Access Token | 30 minutes | `localStorage.token` | API authentication |
| Refresh Token | 7 days | `localStorage.refresh_token` | Get new access tokens |

## Benefits

✅ **Seamless user experience** - No more unexpected logouts
✅ **Automatic token refresh** - Happens transparently in background
✅ **Secure** - Short-lived access tokens with long-lived refresh tokens
✅ **Fallback handling** - If refresh fails, user is properly logged out
✅ **Better error messages** - Users know exactly what's happening

## Related Backend Endpoints

- `POST /api/login` - Returns both access_token and refresh_token
- `POST /api/refresh` - Exchanges refresh_token for new access_token
- `GET /api/verify-token` - Verifies if current access_token is valid

## Additional Notes

- The refresh token lasts 7 days, so users will need to login again after 7 days of inactivity
- If both tokens expire, the user is automatically redirected to login page
- Token refresh is transparent to the user - they won't notice any interruption
- This fix applies to ALL authenticated API calls that use the authManager pattern

## Future Enhancements

Consider implementing:
1. **Automatic token refresh on 401** - Intercept all 401 responses globally
2. **Refresh token rotation** - Issue new refresh token on each refresh for better security
3. **Token expiry countdown** - Show users when their session will expire
4. **Remember me option** - Extend refresh token lifetime to 30 days
