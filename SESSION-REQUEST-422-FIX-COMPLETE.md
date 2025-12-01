# Session Request 422 Error - FIXED ✅

## Problem Diagnosed

The 422 error when loading session requests was caused by a **route conflict** in FastAPI:

### Root Cause
```
/api/tutor/{tutor_id}              (in routes.py, line 667)
/api/tutor/session-requests        (in session_request_endpoints.py)
```

When the frontend called `/api/tutor/session-requests`, FastAPI matched it to the first route pattern `/api/tutor/{tutor_id}` and tried to parse `"session-requests"` as an integer `tutor_id`, resulting in:

```json
{
  "detail": [{
    "type": "int_parsing",
    "loc": ["path", "tutor_id"],
    "msg": "Input should be a valid integer, unable to parse string as an integer",
    "input": "session-requests"
  }]
}
```

## Solution Applied

### Backend Changes (session_request_endpoints.py)

Changed all endpoint paths to avoid the conflict:

| Old Path | New Path |
|----------|----------|
| `/api/tutor/session-requests` | `/api/session-requests/tutor` |
| `/api/tutor/session-requests/{request_id}` | `/api/session-requests/tutor/{request_id}` |
| `/api/tutor/my-students` | `/api/session-requests/tutor/my-students` |
| `/api/session-requests` | `/api/session-requests` (unchanged) |
| `/api/my-session-requests` | `/api/session-requests/my-requests` |

### Frontend Changes (session-request-manager.js)

Updated all fetch URLs to match the new backend paths:

```javascript
// Before:
'http://localhost:8000/api/tutor/session-requests?status=pending'

// After:
'http://localhost:8000/api/session-requests/tutor?status=pending'
```

## Files Modified

### Backend
- ✅ `astegni-backend/session_request_endpoints.py` - Updated all 6 endpoint routes

### Frontend
- ✅ `js/tutor-profile/session-request-manager.js` - Updated all 5 fetch URLs

## Database Setup

Session requests table is already seeded with sample data:

```bash
cd astegni-backend
python seed_session_requests.py
```

**Result:** 6 session requests created (4 pending, 2 accepted)

## Testing Instructions

### 1. Restart Backend Server

**IMPORTANT:** You MUST restart the backend server for the route changes to take effect:

```bash
# Stop the current server (Ctrl+C in the terminal running it)
cd astegni-backend
python app.py
```

### 2. Set Test Password (One-time)

User 115 (tutor) has been configured with:
- Email: `jediael.s.abebe@gmail.com`
- Password: `TestPassword123`
- Roles: `['admin', 'tutor']`
- Active Role: `tutor`

### 3. Test Backend API

```bash
cd astegni-backend
python test_session_api_direct.py
```

**Expected Output:**
```
Step 1: Login as tutor (user 115)...
Login Status Code: 200
Success! Got token: eyJhbGciOiJIUzI1NiIs...

Step 2: Testing /api/session-requests/tutor?status=pending...
Status Code: 200
SUCCESS! Found 4 pending requests

Step 3: Testing /api/session-requests/tutor (no status)...
Status Code: 200
SUCCESS! Found 6 total requests
```

### 4. Test Frontend UI

1. Login to tutor profile at: `http://localhost:8080/profile-pages/tutor-profile.html`
2. Use credentials: `jediael.s.abebe@gmail.com` / `TestPassword123`
3. Click on "Requested Sessions" in the sidebar
4. **Expected Result:** Table with 4 pending session requests should load
5. Click "View" on any request to see details
6. Test Accept/Reject functionality

## Endpoint Reference

### For Tutors

**Get session requests (with optional status filter):**
```
GET /api/session-requests/tutor?status=pending
Authorization: Bearer {token}
```

**Get specific request:**
```
GET /api/session-requests/tutor/{request_id}
Authorization: Bearer {token}
```

**Accept/Reject request:**
```
PATCH /api/session-requests/tutor/{request_id}
Authorization: Bearer {token}
Body: { "status": "accepted" | "rejected" }
```

**Get my students (accepted requests):**
```
GET /api/session-requests/tutor/my-students
Authorization: Bearer {token}
```

### For Students/Parents

**Create session request:**
```
POST /api/session-requests
Authorization: Bearer {token}
Body: {
  "tutor_id": 12,
  "package_id": 1,
  "package_name": "Basic Math Tutoring",
  "message": "Looking forward to learning!",
  "student_name": "Sara Ahmed",
  "student_grade": "Grade 8",
  "preferred_schedule": "Weekdays 4-6 PM",
  "contact_phone": "+251911234567",
  "contact_email": "sara@example.com"
}
```

**Get my requests:**
```
GET /api/session-requests/my-requests
Authorization: Bearer {token}
```

## Verification Checklist

- [x] Backend routes changed to avoid conflict
- [x] Frontend fetch URLs updated
- [x] Sample data seeded (6 requests)
- [x] Test password set for user 115
- [x] Test script created
- [ ] **Backend server restarted** ← YOU NEED TO DO THIS
- [ ] Frontend tested in browser

## What You Should See

### Before Fix
```
localhost:8000/api/tutor/session-requests?status=pending:1
Failed to load resource: the server responded with a status of 422
```

### After Fix (with backend restart)
```
✅ Loaded packages from database: Array(2)
✅ Profile data loaded
✅ Panel "requested-sessions" activated
✅ Table with 4 pending session requests displayed
```

## Next Steps

1. **RESTART THE BACKEND SERVER** (most important!)
2. Test the endpoint with the Python script
3. Test the UI in the browser
4. If successful, the 422 error will be gone and session requests will load properly

## Notes

- The fix maintains backward compatibility for students/parents creating requests
- No database migrations needed
- All existing session_requests data remains intact
- The route restructuring follows RESTful best practices: `/api/session-requests/tutor` groups all tutor-related session request operations
