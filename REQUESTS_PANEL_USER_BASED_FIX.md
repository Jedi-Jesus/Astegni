# Requests Panel - User-Based Fix Summary

## Issue
The requests panel in `tutor-profile.html` should fetch requests based on **user** (not role). Each user can have multiple roles (tutor, student, parent, advertiser), and all their requests should appear in the requests panel regardless of which role they used when submitting.

## Findings

### 1. Course Requests Endpoint ✅ ALREADY USER-BASED
**Endpoint:** `GET /api/tutor/packages/course-requests`
**File:** `astegni-backend/tutor_packages_endpoints.py` (line 706-748)

**Status:** Already correct - uses `uploader_id` to filter by user.

```python
cur.execute("""
    SELECT id, course_name, course_category, course_level, course_description,
           thumbnail, duration, lessons, lesson_title, language, status,
           status_reason, status_at, created_at, updated_at
    FROM courses
    WHERE uploader_id = %s  # ✅ Filters by user ID
    ORDER BY created_at DESC
""", (current_user['id'],))
```

### 2. School Requests Endpoint ❌ WAS NOT USER-BASED (FIXED)
**Endpoint:** `GET /api/tutor/schools`
**File:** `astegni-backend/tutor_packages_endpoints.py` (line 937-1050)

**Status:** **FIXED** - Now filters by `requester_id` to show only the current user's school requests.

#### Before (Wrong - showed ALL schools):
```python
cur.execute("""
    SELECT id, name, type, level, location, email, phone,
           rating, student_count, established_year, principal,
           status, status_reason, status_at, created_at, updated_at
    FROM schools
    WHERE status = %s  # ❌ No user filter!
    ORDER BY created_at DESC
""", (status,))
```

#### After (Fixed - shows only user's schools):
```python
cur.execute("""
    SELECT id, name, type, level, location, email, phone,
           rating, student_count, established_year, principal,
           status, status_reason, status_at, created_at, updated_at
    FROM schools
    WHERE requester_id = %s AND status = %s  # ✅ Filters by user ID
    ORDER BY created_at DESC
""", (current_user['id'], status))
```

## Database Schema Verification

### Courses Table
- **User Column:** `uploader_id` (INTEGER) - Links to `users.id`
- **Purpose:** Tracks which user uploaded/requested the course
- **Already correct in endpoint**

### Schools Table
- **User Column:** `requester_id` (INTEGER) - Links to `users.id`
- **Purpose:** Tracks which user requested the school to be added
- **Now fixed in endpoint**

## How It Works Now

1. **JWT Token:** Contains `user_id` in the `sub` claim
2. **get_current_user():** Extracts `user_id` from token and returns user object
3. **Endpoints:**
   - Course requests: Filter by `uploader_id = current_user['id']`
   - School requests: Filter by `requester_id = current_user['id']`
4. **Result:** Only requests created by the current user appear, regardless of their active role

## Testing

### Test Course Requests:
```bash
# Login and get token
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Get course requests
curl http://localhost:8000/api/tutor/packages/course-requests \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test School Requests:
```bash
# Get all school requests for user
curl http://localhost:8000/api/tutor/schools \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get pending school requests for user
curl http://localhost:8000/api/tutor/schools?status=pending \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Files Modified

1. **astegni-backend/tutor_packages_endpoints.py** (line 937-967)
   - Added `requester_id = %s` filter to schools endpoint
   - Both with and without status filtering

## Next Steps

1. ✅ Restart backend server to apply changes
2. ✅ Test the endpoints with different users
3. ✅ Verify that users only see their own requests
4. ✅ Verify that switching roles doesn't affect which requests appear

## Impact

- **Before:** School requests showed ALL schools in the database to every user
- **After:** School requests show only the schools requested by the logged-in user
- **Security:** Fixed potential data leak where users could see other users' school requests
- **User Experience:** Users now see only their own requests across all their roles
