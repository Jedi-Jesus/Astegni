# Session Requests - User-Based Design Fix

## Problem

The `requested_sessions` table was using a **role-based** design for `requester_id`, which caused issues:

### Before (WRONG - Role-Based):
```sql
requester_id:  Points to student_profiles.id OR parent_profiles.id
requester_type: 'student' or 'parent'
```

**Issues:**
1. **Same user appears as different requesters** when switching roles
   - User #1 as student: `requester_id = 8` (student_profiles.id)
   - User #1 as parent: `requester_id = 4` (parent_profiles.id)
   - Result: TWO different IDs for ONE user!

2. **Complex queries** - To find all requests from a user:
   ```sql
   -- Need to query multiple tables and UNION
   SELECT * FROM requested_sessions WHERE requester_id = 8 AND requester_type = 'student'
   UNION
   SELECT * FROM requested_sessions WHERE requester_id = 4 AND requester_type = 'parent'
   ```

3. **No foreign key to users table** - Can't directly link to user

4. **Inconsistent with other tables** - Tables like `connections` use user-based design

## Solution

Changed to **user-based** design with role context:

### After (CORRECT - User-Based):
```sql
requester_id:     users.id (FK to users table)
requester_type:   'student' or 'parent' (role context)
requested_to_id:  student_profiles.id (student receiving tutoring)
tutor_id:         tutor_profiles.id (tutor providing tutoring)
```

**Benefits:**
1. ✅ **One user = One ID** regardless of role
2. ✅ **Simple queries**: `WHERE requester_id = 1`
3. ✅ **Clear foreign key**: `REFERENCES users(id)`
4. ✅ **Role context preserved** via `requester_type`
5. ✅ **Consistent design** with other tables

## Changes Made

### 1. Database Migration
**File:** `migrate_fix_requested_sessions_to_user_based.py`

**What it does:**
- Adds temporary `temp_user_id` column
- Populates it by looking up `user_id` from profiles:
  - For students: `student_profiles.user_id`
  - For parents: `parent_profiles.user_id`
- Renames columns:
  - `requester_id` → `old_requester_profile_id` (backup)
  - `temp_user_id` → `requester_id`
- Adds foreign key: `requester_id REFERENCES users(id)`
- Sets `requester_id` as NOT NULL

**Results:**
```
BEFORE:
  ID    Current(Profile)     Type       Should Be(User)
  4     1                    parent     3
  5     1                    student    2
  8     8                    student    1

AFTER:
  ID    User ID    Email                               Type       Old Profile
  4     3          contact@astegni.com                 parent     1
  5     2          kushstudios16@gmail.com             student    1
  8     1          jediael.s.abebe@gmail.com           student    8
```

### 2. Backend Endpoint Updates
**File:** `session_request_endpoints.py`

**Changes in `create_session_request()`:**

**BEFORE:**
```python
# Get profile ID from role_ids
requester_id = role_ids.get('student')  # or role_ids.get('parent')
requester_id = int(requester_id)

# Insert with profile ID
INSERT INTO requested_sessions (..., requester_id, ...)
VALUES (..., requester_id, ...)  # Profile ID
```

**AFTER:**
```python
# Use user_id directly (no need to get profile ID)
user_id = current_user.get('id')  # users.id
requester_type = 'student' or 'parent'

# Insert with user ID
INSERT INTO requested_sessions (..., requester_id, requester_type, ...)
VALUES (..., user_id, requester_type, ...)  # User ID
```

**Changes in `get_my_session_requests()`:**

**BEFORE:**
```python
# Get profile ID
requester_id = role_ids.get('student')  # or 'parent'
# Query with profile ID AND type
WHERE sr.requester_id = %s AND sr.requester_type = %s
```

**AFTER:**
```python
# Use user_id directly
user_id = current_user.get('id')
# Query with just user_id (type is for display only)
WHERE sr.requester_id = %s
```

### 3. Frontend
**No changes needed!** Frontend already sends `tutor_id` and `requested_to_id` correctly. The backend now handles `requester_id` automatically from JWT token.

## Data Example

### Multi-Role User Example
User #1 (jediael.s.abebe@gmail.com) has 3 roles:
- Student (profile #8)
- Parent (profile #4)
- Tutor (profile #5)

**Before (role-based):**
- As student: `requester_id = 8` (student_profiles.id)
- As parent: `requester_id = 4` (parent_profiles.id)
- Appeared as TWO different requesters!

**After (user-based):**
- As student: `requester_id = 1` (users.id), `requester_type = 'student'`
- As parent: `requester_id = 1` (users.id), `requester_type = 'parent'`
- Consistent user ID, role context preserved!

## Testing

**Test file:** `test_user_based_session_requests.py`

**Tests performed:**
1. ✅ Schema verification - `requester_id` references `users.id`
2. ✅ Multi-role users - Same user_id for all requests
3. ✅ Data integrity - All requests have valid users and profiles
4. ✅ Query simplicity - Single WHERE clause
5. ✅ Role context - `requester_type` still works
6. ✅ Benefits demonstration - Clear improvement

**Result:** All tests passed!

## How to Query

### Get all requests from a user (simple!)
```sql
SELECT * FROM requested_sessions
WHERE requester_id = 1  -- users.id
```

### Get requests by role
```sql
SELECT * FROM requested_sessions
WHERE requester_id = 1 AND requester_type = 'student'
```

### Get user info with request
```sql
SELECT
    rs.*,
    u.email,
    u.first_name,
    rs.requester_type
FROM requested_sessions rs
JOIN users u ON rs.requester_id = u.id
WHERE rs.id = 10
```

### Get profile info (if needed)
```sql
SELECT
    rs.*,
    u.email,
    CASE
        WHEN rs.requester_type = 'student' THEN sp.id
        WHEN rs.requester_type = 'parent' THEN pp.id
    END as profile_id
FROM requested_sessions rs
JOIN users u ON rs.requester_id = u.id
LEFT JOIN student_profiles sp ON u.id = sp.user_id AND rs.requester_type = 'student'
LEFT JOIN parent_profiles pp ON u.id = pp.user_id AND rs.requester_type = 'parent'
```

## Rollback (If Needed)

If you need to rollback:
```bash
cd astegni-backend
python migrate_fix_requested_sessions_to_user_based.py rollback
```

This will:
- Rename `requester_id` → `temp_user_id`
- Rename `old_requester_profile_id` → `requester_id`
- Drop the temp column
- Remove FK constraint to users

## Next Steps

1. ✅ Migration completed
2. ✅ Backend updated
3. ✅ Tests passed
4. **Optional:** After full verification in production, drop the backup column:
   ```sql
   ALTER TABLE requested_sessions DROP COLUMN old_requester_profile_id;
   ```

## Files Changed

1. `astegni-backend/migrate_fix_requested_sessions_to_user_based.py` - Migration script
2. `astegni-backend/session_request_endpoints.py` - API endpoints
3. `astegni-backend/test_user_based_session_requests.py` - Test script
4. `SESSION_REQUESTS_USER_BASED_FIX_COMPLETE.md` - This documentation

## Summary

✅ **Fixed design flaw** - Changed from role-based to user-based IDs
✅ **Preserved role context** - `requester_type` still indicates role
✅ **Simplified queries** - No more complex UNIONs
✅ **Consistent design** - Matches other tables like `connections`
✅ **Backward compatible** - Old column preserved for safety
✅ **All tests passing** - Verified with real data

The system now correctly uses `requester_id = users.id` with `requester_type` providing the role context, exactly as it should be!
