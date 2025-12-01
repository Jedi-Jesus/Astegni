# Console Errors Explained

## Critical Errors (Must Fix)

### 1. **401 Unauthorized - Schedules Endpoint**
```
GET http://localhost:8000/api/tutor/schedules 401 (Unauthorized)
```

**What it means**: The JWT token is not being sent correctly or is invalid when fetching schedules.

**Root Cause**: The `loadSchedules()` function is fetching with `localStorage.getItem('token')` but the token might be expired or not set properly.

**How to fix**:
1. Check browser console: `localStorage.getItem('token')`
2. The token needs to be refreshed
3. Check `tutor_schedule_endpoints.py` authentication middleware

---

### 2. **500 Internal Server Error + CORS - Sessions Endpoint**
```
GET http://localhost:8000/api/tutor/sessions net::ERR_FAILED 500 (Internal Server Error)
Access to fetch blocked by CORS policy: No 'Access-Control-Allow-Origin' header
```

**What it means**: The backend is CRASHING when you try to fetch sessions.

**Root Cause**: There's likely a Python error in `tutor_sessions_endpoints.py` that's causing the server to crash. The CORS error is a side effect - when the server crashes, it doesn't send CORS headers.

**How to fix**:
1. **Check backend terminal** for Python traceback errors
2. The `/api/tutor/sessions` endpoint is likely trying to query the `tutoring_sessions` table that we just deleted!
3. Need to update the endpoint to use `tutor_sessions` table instead

**Likely Issue**: The endpoint file still references the deleted `tutoring_sessions` table.

---

### 3. **Missing Profile Pictures (404 errors)**
```
GET http://localhost:8080/uploads/system_images/system_profile_pictures/Dad-profile.jpg 404
GET http://localhost:8080/uploads/system_images/system_profile_pictures/student-college-boy.jpg 404
GET http://localhost:8080/uploads/system_images/system_profile_pictures/Mom-profile.jpg 404
GET http://localhost:8080/uploads/system_images/system_profile_pictures/boy-user-image.jpg 404
GET http://localhost:8080/uploads/system_images/system_profile_pictures/student-college-girl.jpg 404
GET http://localhost:8080/uploads/system_images/system_profile_pictures/student-teenage-boy.jpg 404
GET http://localhost:8080/uploads/system_images/system_profile_pictures/student-teenage-girl.jpg 404
GET http://localhost:8080/uploads/system_images/system_profile_pictures/tutor-.jpg 404
```

**What it means**: These image files don't exist in the uploads folder.

**How to fix**: Create placeholder images or update the code to use a default avatar.

---

## Non-Critical Warnings

### 4. **Missing Badge Elements**
```
⚠ all-count badge element not found
⚠ requests-badge element not found
⚠ connections-badge element not found
```

**What it means**: The HTML elements with IDs `all-count`, `requests-badge`, and `connections-badge` don't exist in the DOM.

**Impact**: Low - These are just count badges that failed to update.

**How to fix**: Either add these elements to the HTML or remove the code trying to update them.

---

### 5. **Missing Modal Functions**
```
[ModalOpenFix] Function not found: openCustomFilterModal
[ModalOpenFix] Function not found: openQuizMainModal
[ModalOpenFix] Function not found: openQuizGiveModal
... (10+ missing functions)
```

**What it means**: The modal wrapper is trying to wrap functions that don't exist yet.

**Impact**: Low - These modals just won't have the wrapper functionality.

**How to fix**: Either create these functions or remove them from the wrapper list.

---

### 6. **Upload Document Form Not Found**
```
Upload document form not found
```

**What it means**: The document upload form element is missing from the page.

**Impact**: Low - Document upload feature won't work.

---

### 7. **Testimonials Container Not Found**
```
Container #testimonials not found
```

**What it means**: The testimonials widget can't find its container element.

**Impact**: Low - Testimonials won't display.

---

## The Main Issues to Fix

### Priority 1: Fix Sessions Endpoint (500 Error)

**The endpoint is likely still querying the deleted `tutoring_sessions` table.**

Check `astegni-backend/tutor_sessions_endpoints.py` for references to `tutoring_sessions` and change them to `tutor_sessions`.

### Priority 2: Fix Schedules Authentication (401 Error)

The token is either:
1. Expired
2. Not being sent correctly
3. The endpoint requires different authentication

### Priority 3: Add Missing Images

Create or add these placeholder images to:
```
uploads/system_images/system_profile_pictures/
```

---

## Quick Diagnostic Commands

### Check if backend is running:
```bash
curl http://localhost:8000/api/me
```

### Check token in browser console:
```javascript
localStorage.getItem('token')
```

### Test sessions endpoint manually:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" http://localhost:8000/api/tutor/sessions
```

---

## Expected Fix Order

1. **Restart the backend** to see the actual Python error for `/api/tutor/sessions`
2. **Fix the tutor_sessions_endpoints.py** file to use correct table name
3. **Fix authentication** for schedules endpoint
4. **Add placeholder images** for missing profiles
5. **Remove or add missing modal functions** (optional - low priority)

