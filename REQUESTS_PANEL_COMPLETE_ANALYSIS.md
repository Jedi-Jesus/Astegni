# Requests Panel - Complete User-Based Analysis

## Overview
This document analyzes whether course and school request endpoints are user-based (✅) or role-based (❌) across all profile pages.

---

## Tutor Profile Page

### Location
- **HTML**: `profile-pages/tutor-profile.html` (requests-panel)
- **JS**: `js/tutor-profile/global-functions.js` (loadTutorRequests)

### Course Requests
**Endpoint**: `GET /api/tutor/packages/course-requests`
**File**: `astegni-backend/tutor_packages_endpoints.py` (line 706-748)
**Status**: ✅ **USER-BASED** (Already correct)

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

### School Requests
**Endpoint**: `GET /api/tutor/schools`
**File**: `astegni-backend/tutor_packages_endpoints.py` (line 937-1050)
**Status**: ✅ **USER-BASED** (Fixed in this session)

```python
# BEFORE (WRONG - showed ALL schools):
cur.execute("""
    SELECT id, name, type, level, location, email, phone,
           rating, student_count, established_year, principal,
           status, status_reason, status_at, created_at, updated_at
    FROM schools
    WHERE status = %s  # ❌ No user filter!
    ORDER BY created_at DESC
""", (status,))

# AFTER (FIXED - shows only user's schools):
cur.execute("""
    SELECT id, name, type, level, location, email, phone,
           rating, student_count, established_year, principal,
           status, status_reason, status_at, created_at, updated_at
    FROM schools
    WHERE requester_id = %s AND status = %s  # ✅ Filters by user ID
    ORDER BY created_at DESC
""", (current_user['id'], status))
```

---

## Student Profile Page

### Location
- **HTML**: `profile-pages/student-profile.html` (my-requests-panel)
- **JS**: `js/student-profile/global-functions.js` (loadStudentCourseRequests, loadStudentSchoolRequests)

### Course Requests
**Endpoint**: `GET /api/student/my-course-requests`
**File**: `astegni-backend/student_requests_endpoints.py` (line 128-191)
**Status**: ✅ **USER-BASED** (Already correct)

```python
if status and status != 'all':
    cur.execute("""
        SELECT id, course_name, course_category, course_description,
               course_level, thumbnail, status, status_reason,
               status_at, created_at, updated_at
        FROM courses
        WHERE uploader_id = %s AND status = %s  # ✅ Filters by user ID
        ORDER BY created_at DESC
    """, (current_user['id'], status))
else:
    cur.execute("""
        SELECT id, course_name, course_category, course_description,
               course_level, thumbnail, status, status_reason,
               status_at, created_at, updated_at
        FROM courses
        WHERE uploader_id = %s  # ✅ Filters by user ID
        ORDER BY created_at DESC
    """, (current_user['id'],))
```

### School Requests
**Endpoint**: `GET /api/student/my-school-requests`
**File**: `astegni-backend/student_requests_endpoints.py` (line 197-256)
**Status**: ✅ **USER-BASED** (Already correct)

```python
if status and status != 'all':
    cur.execute("""
        SELECT id, name, type, level, location, status,
               status_reason, status_at, created_at, updated_at
        FROM schools
        WHERE requester_id = %s AND status = %s  # ✅ Filters by user ID
        ORDER BY created_at DESC
    """, (current_user['id'], status))
else:
    cur.execute("""
        SELECT id, name, type, level, location, status,
               status_reason, status_at, created_at, updated_at
        FROM schools
        WHERE requester_id = %s  # ✅ Filters by user ID
        ORDER BY created_at DESC
    """, (current_user['id'],))
```

---

## Database Schema

### Courses Table
```
Column: uploader_id
Type: INTEGER
References: users.id
Purpose: Tracks which user uploaded/requested the course
```

### Schools Table
```
Column: requester_id
Type: INTEGER
References: users.id
Purpose: Tracks which user requested the school to be added
```

---

## Parent Profile Page

### Location
- **HTML**: `profile-pages/parent-profile.html` (my-requests-panel)
- **JS**: `js/parent-profile/session-requests-manager.js` (loadCourses, loadSchools)

### Course Requests
**Endpoint**: `GET /api/parent/my-courses`
**File**: `astegni-backend/parent_endpoints.py` (line 1523-1578)
**Status**: ✅ **USER-BASED** (Fixed in this session)

```python
# BEFORE (WRONG - filtered by profile_id):
courses = db.execute(text("""
    SELECT ...
    FROM courses c
    WHERE c.uploader_id = :profile_id  # ❌ Used parent_profile.id
    ORDER BY c.created_at DESC
"""), {"profile_id": parent_profile.id}).fetchall()

# AFTER (FIXED - filters by user_id):
courses = db.execute(text("""
    SELECT ...
    FROM courses c
    WHERE c.uploader_id = :user_id  # ✅ Uses current_user.id
    ORDER BY c.created_at DESC
"""), {"user_id": current_user.id}).fetchall()
```

### School Requests
**Endpoint**: `GET /api/parent/my-schools`
**File**: `astegni-backend/parent_endpoints.py` (line 1581-1612)
**Status**: ✅ **USER-BASED** (Fixed in this session)

```python
# BEFORE (WRONG - filtered by profile_id):
schools = db.execute(text("""
    SELECT ...
    FROM schools s
    WHERE s.requester_id = :profile_id  # ❌ Used parent_profile.id
    ORDER BY s.created_at DESC
"""), {"profile_id": parent_profile.id}).fetchall()

# AFTER (FIXED - filters by user_id):
schools = db.execute(text("""
    SELECT ...
    FROM schools s
    WHERE s.requester_id = :user_id  # ✅ Uses current_user.id
    ORDER BY s.created_at DESC
"""), {"user_id": current_user.id}).fetchall()
```

---

## Summary

| Profile Page | Request Type | Endpoint | Status | Filter Column |
|-------------|--------------|----------|--------|---------------|
| **Tutor** | Course | `/api/tutor/packages/course-requests` | ✅ USER-BASED | `uploader_id` |
| **Tutor** | School | `/api/tutor/schools` | ✅ USER-BASED (FIXED) | `requester_id` |
| **Student** | Course | `/api/student/my-course-requests` | ✅ USER-BASED | `uploader_id` |
| **Student** | School | `/api/student/my-school-requests` | ✅ USER-BASED | `requester_id` |
| **Parent** | Course | `/api/parent/my-courses` | ✅ USER-BASED (FIXED) | `uploader_id` |
| **Parent** | School | `/api/parent/my-schools` | ✅ USER-BASED (FIXED) | `requester_id` |

---

## How User-Based Filtering Works

1. **JWT Token**: Contains `user_id` in the `sub` claim
2. **get_current_user()**: Extracts `user_id` from token
3. **Query Filter**: Uses `WHERE uploader_id = %s` or `WHERE requester_id = %s`
4. **Result**: Only requests created by that specific user appear

### Role Independence

A user with multiple roles (e.g., student + tutor + parent) will see:
- **Same requests** regardless of active role
- **All their requests** across all roles
- **No duplicate requests** (each request belongs to the user, not a role)

### Example

```
User ID: 123
Roles: ['student', 'tutor', 'parent']
Active Role: student

Course Requests:
- Course A (uploaded as student) ✅ Visible
- Course B (uploaded as tutor) ✅ Visible
- Course C (uploaded as parent) ✅ Visible

School Requests:
- School X (requested as student) ✅ Visible
- School Y (requested as tutor) ✅ Visible

The user sees ALL their requests, not just requests made while in student role.
```

---

## Changes Made

### Before This Session
- **Tutor School Requests**: Showed ALL schools in database ❌
- **Parent Course Requests**: Filtered by parent_profile.id instead of user.id ❌
- **Parent School Requests**: Filtered by parent_profile.id instead of user.id ❌
- **Security Issue**: Users could see other users' school requests (tutor) ❌
- **Logic Issue**: Parent requests filtered by wrong ID (profile instead of user) ❌

### After This Session
- **Tutor School Requests**: Shows only current user's schools ✅
- **Parent Course Requests**: Shows only current user's courses ✅
- **Parent School Requests**: Shows only current user's schools ✅
- **Security**: Users can only see their own requests ✅
- **Data Isolation**: Fixed potential data leak ✅
- **Consistency**: All endpoints now use user.id correctly ✅

---

## Files Modified

1. **astegni-backend/tutor_packages_endpoints.py** (line 937-967)
   - Added `WHERE requester_id = %s` filter to schools endpoint
   - Applied to both status-filtered and all-schools queries
   - Changed from no user filter to `current_user['id']`

2. **astegni-backend/parent_endpoints.py** (line 1523-1578, 1581-1612)
   - **Course requests**: Changed from `parent_profile.id` to `current_user.id`
   - **School requests**: Changed from `parent_profile.id` to `current_user.id`
   - Removed unnecessary parent_profile lookup
   - Fixed docstrings to reflect user-based filtering

---

## Testing

### Test Script
Run the test to verify user-based filtering:

```bash
cd astegni-backend
python test_user_based_requests.py
```

### Expected Output
```
======================================================================
TESTING USER-BASED REQUEST FILTERING
======================================================================

Test User:
   ID: 2
   Email: kushstudios16@gmail.com
   Roles: ['student', 'tutor', 'parent', 'advertiser']
   Active Role: student

TEST 1: Course Requests (should filter by uploader_id)
----------------------------------------------------------------------
   Total courses in database: 17
   Courses uploaded by user 2: 0
   [!] User 2 has no course requests

TEST 2: School Requests (should filter by requester_id)
----------------------------------------------------------------------
   Total schools in database: 15
   Schools requested by user 2: 1
   [OK] Sample school: ID=9, Name='Bole Community Academy', Status=verified

TEST 3: Role Independence (results should be same for all roles)
----------------------------------------------------------------------
   User has 4 roles: ['student', 'tutor', 'parent', 'advertiser']
   [OK] Active role 'student' doesn't affect filtering
   [OK] All 0 courses and 1 schools
      will appear regardless of active role

TEST 4: Data Leak Prevention
----------------------------------------------------------------------
   Other user: contact@astegni.com (ID: 3)
   Their courses: 0
   Their schools: 2
   [OK] User 2 should NOT see these requests

======================================================================
SUMMARY
======================================================================
[OK] Course requests endpoint: Filters by uploader_id = 2
[OK] School requests endpoint: Filters by requester_id = 2
[OK] User-based filtering: WORKING CORRECTLY
[OK] Role independence: Active role doesn't affect results
[OK] Data isolation: Users only see their own requests
======================================================================
```

---

## Conclusion

✅ **All requests panels are now user-based (3 profiles fixed)**
✅ **No role-based or profile-based filtering**
✅ **Users see all their requests across all roles**
✅ **Data isolation is enforced**
✅ **Security issues fixed (3 endpoints)**
✅ **Consistency across all profile types**

The requests panels correctly display user-specific data, ensuring that users with multiple roles see all their requests regardless of their currently active role.

### Issues Fixed:
1. **Tutor schools**: Was showing ALL schools → Now shows only user's schools
2. **Parent courses**: Was filtering by profile_id → Now filters by user_id
3. **Parent schools**: Was filtering by profile_id → Now filters by user_id

All three profile pages (tutor, student, parent) now consistently use `current_user.id` to filter course and school requests.
