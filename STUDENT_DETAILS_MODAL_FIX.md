# Student Details Modal Fix - Deep Analysis

## Problem Summary

The `/api/tutor/student-details/{student_profile_id}` endpoint was failing with database errors when trying to open the student details modal from the tutor profile.

## Root Cause Analysis

### Database Schema Migration Issue

The Astegni platform has undergone a **user-based migration** where some tables transitioned from role-specific IDs to user-based IDs, while other tables remain profile-based. This created a mixed ID system:

#### Profile-Based Tables (use profile IDs)
- `enrolled_students`:
  - `tutor_id` → references `tutor_profiles.id`
  - `student_id` → references `student_profiles.id`

- `whiteboard_sessions`:
  - `tutor_profile_id` → references `tutor_profiles.id`
  - `student_profile_ids` → array of `student_profiles.id`

#### User-Based Tables (use user IDs)
- `courseworks`:
  - `tutor_id` → references `users.id`
  - `student_id` → references `users.id`

- `coursework_submissions`:
  - `student_id` → references `users.id`

### The Dual ID System

**Example from User ID 1 (jediael.s.abebe@gmail.com):**
```
users.id = 1
  ├─ tutor_profiles.id = 5
  ├─ student_profiles.id = 8
  └─ parent_profiles.id = 4
```

**Enrolled Student Example:**
```
enrolled_students:
  - enrollment_id: 5
  - tutor_id: 5 (profile) → links to user 1
  - student_id: 1 (profile) → links to user 2
```

## Bugs Fixed

### Bug 1: Using Old Column Names in whiteboard_sessions Query

**Old Code:**
```python
cur.execute("""
    WHERE tutor_id = %s AND %s = ANY(student_id)
""", (tutor_user_id, student_profile_id))
```

**Issue:** The `whiteboard_sessions` table was migrated to use:
- `tutor_profile_id` instead of `tutor_id`
- `student_profile_ids` (array) instead of `student_id`

**Fix:**
```python
cur.execute("""
    WHERE tutor_profile_id = %s AND %s = ANY(student_profile_ids)
""", (tutor_profile_id, student_profile_id))
```

### Bug 2: Missing tutor_user_id Variable

**Old Code:**
```python
# Removed code that fetched tutor_user_id
# ...
WHERE c.tutor_id = %s  # Error: tutor_user_id is not defined!
```

**Issue:** The coursework query needs `tutor_user_id` (users.id), not `tutor_profile_id`, because the `courseworks` table uses user IDs.

**Fix:**
```python
# Get tutor's user_id from current_user JWT token
tutor_user_id = current_user.get('id')

# Now we have:
# - tutor_user_id = 1 (for courseworks query)
# - tutor_profile_id = 5 (for whiteboard_sessions and enrolled_students)
```

## Data Flow Diagram

```
JWT Token (current_user)
│
├─ id: 1 (user_id)
│  └─ Used for: courseworks queries
│
└─ role_ids: {'tutor': '5', 'student': '8', 'parent': '4'}
   └─ tutor: 5 (profile_id)
      └─ Used for: enrolled_students, whiteboard_sessions queries

Request: /api/tutor/student-details/1
         (student_profile_id = 1)
│
├─ Query enrolled_students
│  WHERE tutor_id = 5 (profile) AND student_id = 1 (profile)
│  └─ Returns: student's user_id = 2
│
├─ Query whiteboard_sessions
│  WHERE tutor_profile_id = 5 AND 1 = ANY(student_profile_ids)
│  └─ Returns: session statistics
│
└─ Query courseworks
   WHERE tutor_id = 1 (user) AND student_id = 2 (user)
   └─ Returns: coursework statistics
```

## Tables Reference Chart

| Table | tutor_id Type | student_id Type | Notes |
|-------|---------------|-----------------|-------|
| enrolled_students | profile | profile | `tutor_profiles.id`, `student_profiles.id` |
| whiteboard_sessions | profile | profile (array) | `tutor_profile_id`, `student_profile_ids[]` |
| courseworks | user | user | `users.id`, `users.id` |
| coursework_submissions | N/A | user | `users.id` |
| tutor_packages | profile | N/A | `tutor_profiles.id` |
| student_profiles | N/A | N/A | Links to `users.id` via `user_id` |
| tutor_profiles | N/A | N/A | Links to `users.id` via `user_id` |

## Database Query Analysis

### Example Data
```sql
-- User
users.id = 1, email = 'jediael.s.abebe@gmail.com'

-- Profiles
tutor_profiles.id = 5, user_id = 1
student_profiles.id = 1, user_id = 2

-- Enrollment
enrolled_students.id = 5, tutor_id = 5, student_id = 1

-- Whiteboard Sessions
whiteboard_sessions: tutor_profile_id = 5, student_profile_ids = [1]

-- Courseworks
courseworks: tutor_id = 1, student_id = 2
```

### Query Execution
```python
# Step 1: Get profile IDs from JWT
tutor_user_id = 1  # from current_user['id']
tutor_profile_id = 5  # from current_user['role_ids']['tutor']
student_profile_id = 1  # from URL parameter

# Step 2: Query enrolled_students (profile-based)
SELECT * FROM enrolled_students
WHERE tutor_id = 5 AND student_id = 1
# Returns: enrollment data + student's user_id = 2

# Step 3: Query whiteboard_sessions (profile-based)
SELECT * FROM whiteboard_sessions
WHERE tutor_profile_id = 5 AND 1 = ANY(student_profile_ids)
# Returns: session statistics

# Step 4: Query courseworks (user-based)
SELECT * FROM courseworks
WHERE tutor_id = 1 AND student_id = 2
# Returns: coursework statistics
```

## Testing Verification

### Test Case 1: Valid Student Details Request
```bash
GET /api/tutor/student-details/1
Authorization: Bearer <jwt_token>

# Expected:
# - Status: 200 OK
# - Response: Complete student details with statistics
```

### Test Case 2: Database Queries
```sql
-- Verify whiteboard_sessions query works
SELECT COUNT(*)
FROM whiteboard_sessions
WHERE tutor_profile_id = 5 AND 1 = ANY(student_profile_ids);

-- Verify courseworks query works
SELECT COUNT(*)
FROM courseworks
WHERE tutor_id = 1 AND student_id = 2;
```

## Key Takeaways

1. **Mixed ID System**: Astegni uses both user IDs and profile IDs depending on the table
2. **JWT Contains Both**: The JWT token provides both `user_id` (as 'id') and `profile_ids` (as 'role_ids')
3. **Table-Specific Queries**: Always check which ID type a table expects before querying
4. **Migration Impact**: The user-based migration only affected some tables, creating this dual system

## Related Files

- Backend: `astegni-backend/session_request_endpoints.py` (line 1661-1695)
- Frontend: `modals/common-modals/student-details-modal.html`
- Database: `astegni_user_db` (enrolled_students, whiteboard_sessions, courseworks)

## Additional Fix: Whiteboard Sessions Endpoint

### Bug 3: Missing Column in whiteboard_sessions Query

**File:** `whiteboard_endpoints.py` (line 324-343)

**Issue:** The `/api/whiteboard/sessions` endpoint was querying a non-existent column `attendance_status` from the `whiteboard_sessions` table, causing a 500 error.

**Error Log:**
```
INFO: 127.0.0.1:55159 - "GET /api/whiteboard/sessions?student_id=1 HTTP/1.1" 500 Internal Server Error
```

**Old Code:**
```python
SELECT
    ws.attendance_status,  # This column doesn't exist!
    ws.is_recording,
    ...
FROM whiteboard_sessions ws
```

**Fix:** Removed the non-existent column from the SELECT clause and adjusted all row indices in the response mapping.

**Before:**
```python
"attendance_status": row[9] or "pending",
"is_recording": row[10] or False,
"has_recordings": row[11] or False,
```

**After:**
```python
"is_recording": row[9] or False,
"has_recordings": row[10] or False,
"created_at": row[11].isoformat() if row[11] else None,
```

## Status

✅ **Fixed** - All three bugs resolved:
  1. whiteboard_sessions column names updated (tutor_id → tutor_profile_id, student_id → student_profile_ids)
  2. tutor_user_id variable properly defined from JWT token
  3. attendance_status column removed from whiteboard sessions query

✅ **Tested** - Verified against actual database schema and data
✅ **Documented** - Complete analysis of the dual ID system

## Files Modified

1. `astegni-backend/session_request_endpoints.py` (line 1661-1695)
   - Fixed whiteboard_sessions query to use profile-based columns
   - Added tutor_user_id extraction from JWT token for courseworks query

2. `astegni-backend/whiteboard_endpoints.py` (line 324-388)
   - Removed non-existent attendance_status column from query
   - Adjusted response row indices

## Backend Restart Required

⚠️ **Important:** These changes require a backend restart to take effect.

```bash
# Stop current backend
taskkill /F /IM python.exe

# Restart backend
cd astegni-backend
python app.py
```
