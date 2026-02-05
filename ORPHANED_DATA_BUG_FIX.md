# Orphaned Student IDs Bug - Root Cause & Fix

## Issue Summary

User `kushstudios16@gmail.com` was seeing 8 sessions when clicking "As Parent" in the student-profile sessions panel, even though they don't have any children.

## Root Cause

**Orphaned database references** - Student profile ID `2` was deleted or never existed, but was still referenced in:

1. `parent_profiles.children_ids = [2]` for kushstudios16@gmail.com
2. `enrolled_courses.students_id` arrays in multiple enrollment records

### Investigation Results

```
User ID: 2 (kushstudios16@gmail.com)
Parent Profile ID: 2
children_ids: [2]  ← Orphaned reference

Valid student profile IDs in database: [1, 3, 4, 5, 6, 8]
Student Profile ID 2: NOT FOUND (orphaned!)
```

### How the Bug Manifested

1. User clicks "As Parent" → frontend calls `/api/parent/sessions`
2. Backend query:
   ```sql
   WHERE ec.students_id && CAST([2] AS integer[])
   ```
3. Query matched 8 sessions that had student_id=2 in their `students_id` arrays
4. These were sessions for a non-existent student, but the query still matched
5. Frontend displayed these 8 orphaned sessions

## Fix Applied

### Database Cleanup Script

**File**: `astegni-backend/auto_fix_orphaned_student_ids.py`

**Actions Taken**:
1. Identified all valid student profile IDs: `[1, 3, 4, 5, 6, 8]`
2. Cleaned up `parent_profiles.children_ids`:
   - Parent ID 2: `[2]` → `NULL` (removed orphaned student ID 2)
3. Cleaned up `enrolled_courses.students_id`:
   - Enrollment ID 2: **DELETED** (only had orphaned student ID 2)
   - Enrollment ID 3: `[2, 8]` → `[8]` (removed orphaned ID, kept valid ID)

### Results

**Before Fix**:
```
Parent Profile ID 2:
  children_ids: [2]
  → Backend returns 8 sessions
  → Frontend displays 8 sessions ❌
```

**After Fix**:
```
Parent Profile ID 2:
  children_ids: NULL
  → Backend returns [] (empty array)
  → Frontend displays "No sessions found as parent" ✅
```

## Technical Details

### Backend Query (parent_endpoints.py)

```python
# Line 466-467: Correct early return for users without children
if not parent_profile.children_ids or len(parent_profile.children_ids) == 0:
    return []

# Line 504: Query that was matching orphaned IDs
WHERE ec.students_id && CAST(:children_ids AS integer[])
```

The backend code was **correct**. The issue was **bad data** in the database.

### Why Did This Happen?

Likely scenarios for orphaned data:
1. **Manual database deletion** - Student profile deleted without cleaning up references
2. **Incomplete cascade delete** - Foreign key constraints not properly set
3. **Migration error** - Data migration script didn't maintain referential integrity
4. **Bug in deletion flow** - Parent/student deletion code doesn't clean up arrays

## Prevention Measures

### 1. Add Database Constraints

```sql
-- Prevent insertion of invalid student IDs in enrolled_courses
ALTER TABLE enrolled_courses
ADD CONSTRAINT check_valid_students
CHECK (
    students_id IS NULL OR
    (SELECT COUNT(*) FROM unnest(students_id) AS sid
     WHERE NOT EXISTS (SELECT 1 FROM student_profiles WHERE id = sid)) = 0
);

-- Prevent insertion of invalid children IDs in parent_profiles
ALTER TABLE parent_profiles
ADD CONSTRAINT check_valid_children
CHECK (
    children_ids IS NULL OR
    (SELECT COUNT(*) FROM unnest(children_ids) AS cid
     WHERE NOT EXISTS (SELECT 1 FROM student_profiles WHERE id = cid)) = 0
);
```

### 2. Create Cleanup Cron Job

Run `auto_fix_orphaned_student_ids.py` periodically (e.g., daily) to catch orphaned data early.

### 3. Improve Deletion Flows

When deleting a student_profile:
```python
# Remove from parent_profiles.children_ids
UPDATE parent_profiles
SET children_ids = array_remove(children_ids, {student_id})
WHERE {student_id} = ANY(children_ids);

# Remove from enrolled_courses.students_id
UPDATE enrolled_courses
SET students_id = array_remove(students_id, {student_id})
WHERE {student_id} = ANY(students_id);

# Delete enrollments with no students left
DELETE FROM enrolled_courses
WHERE students_id IS NULL OR array_length(students_id, 1) = 0;

# Finally delete the student profile
DELETE FROM student_profiles WHERE id = {student_id};
```

### 4. Add Referential Integrity Checks to Tests

Create a test suite that runs nightly:
```python
def test_no_orphaned_student_ids():
    valid_student_ids = get_all_student_profile_ids()

    # Check parent_profiles
    orphaned_in_parents = find_orphaned_ids_in_parent_profiles(valid_student_ids)
    assert len(orphaned_in_parents) == 0

    # Check enrolled_courses
    orphaned_in_enrollments = find_orphaned_ids_in_enrollments(valid_student_ids)
    assert len(orphaned_in_enrollments) == 0
```

## Files Created

1. ✅ `debug_parent_sessions.py` - Full investigation script
2. ✅ `debug_parent_sessions_simple.py` - Simplified debug script
3. ✅ `fix_orphaned_student_ids.py` - Interactive fix script
4. ✅ `auto_fix_orphaned_student_ids.py` - Automated cleanup script

## Testing Instructions

### Verify Fix

1. **Login as kushstudios16@gmail.com**
2. **Go to student-profile → My Sessions panel**
3. **Click "As Parent"**
4. **Expected Result**: "No sessions found as parent" + "You don't have any children added to your account"
5. **Not Expected**: List of 8 sessions

### Console Verification

In browser console, you should see:
```
[Sessions Panel] Fetching sessions for role: parent, URL: http://localhost:8000/api/parent/sessions
[Sessions Panel] Fetched 0 sessions for role: parent
[Sessions Panel] No sessions found for role: parent
```

### Backend Verification

```bash
cd astegni-backend
python debug_parent_sessions_simple.py
```

Expected output:
```
Parent Profile ID: 2
Children IDs: None
```

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| **children_ids** | `[2]` (orphaned) | `NULL` |
| **Sessions returned** | 8 (orphaned data) | 0 (correct) |
| **User experience** | Confusing (wrong data) | Clear (empty state) |
| **Root cause** | Orphaned student ID | Fixed |

---

**Issue**: Orphaned database references causing wrong data display
**Root Cause**: Student profile ID 2 deleted but still referenced
**Solution**: Database cleanup script to remove orphaned IDs
**Prevention**: Add constraints, improve deletion flow, add tests

**Status**: ✅ **FIXED**
**Date**: January 30, 2026
