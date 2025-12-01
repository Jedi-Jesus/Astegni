# Column Name Fix - instructor_name → requested_by

## Problem
When saving edited courses, the error occurred:
```
Failed to update course: column "instructor_name" does not exist
```

## Root Cause
The backend update endpoints were using `instructor_name` as the column name, but the actual database tables use `requested_by`.

## Database Column Names (Verified)

### active_courses table:
```
- id
- course_id
- title
- category
- level
- description
- requested_by  ← Correct column name
- requester_user_id
- enrolled_students
- rating
- rating_count
- notification_sent
- ...
```

### suspended_courses table:
```
- id
- suspended_id
- original_course_id
- title
- category
- level
- description
- requested_by  ← Correct column name
- requester_user_id
- enrolled_students
- rating
- rating_count
- suspension_reason
- ...
```

### course_requests table:
```
- requested_by  ← Correct column name
```

### rejected_courses table:
```
- requested_by  ← Correct column name
```

**ALL tables use `requested_by`, NOT `instructor_name`**

## Fix Applied

### File: `astegni-backend/course_management_endpoints.py`

**Changed in `update_active_course()` function (lines 1176-1178):**
```python
# BEFORE (Wrong):
if update_data.requested_by is not None:
    update_fields.append("instructor_name = %s")  # ❌ Wrong column
    params.append(update_data.requested_by)

# AFTER (Correct):
if update_data.requested_by is not None:
    update_fields.append("requested_by = %s")  # ✅ Correct column
    params.append(update_data.requested_by)
```

**Changed in RETURNING clause (line 1191):**
```python
# BEFORE (Wrong):
RETURNING id, course_id, title, category, level, description, instructor_name

# AFTER (Correct):
RETURNING id, course_id, title, category, level, description, requested_by
```

**Changed in response (line 1214):**
```python
# BEFORE (Wrong):
"instructor_name": result[6]

# AFTER (Correct):
"requested_by": result[6]
```

**Same changes applied to `update_suspended_course()` function:**
- Line 1248: `instructor_name` → `requested_by` in UPDATE field
- Line 1262: `instructor_name` → `requested_by` in RETURNING clause
- Line 1285: `instructor_name` → `requested_by` in response

## Next Steps

**⚠️ IMPORTANT: You MUST restart the backend server for these changes to take effect**

### How to Restart

**Option 1: If server is running in a terminal:**
1. Go to the terminal running the backend
2. Press `Ctrl+C` to stop
3. Run: `python app.py`

**Option 2: If you need to find and kill the process:**
```bash
# Find process on port 8000
netstat -ano | findstr ":8000"

# Kill the process (replace PID with actual number)
taskkill //F //PID <PID>

# Start server
cd astegni-backend
python app.py
```

### Testing After Restart

1. Refresh your browser page
2. Click "Edit" on any course (especially active/suspended courses)
3. Make changes
4. Click "Save Changes"
5. ✅ Should save successfully now!

## Files Modified
- ✅ `astegni-backend/course_management_endpoints.py` (lines 1176-1178, 1191, 1214, 1248, 1262, 1285)

---

**Status:** ✅ Fixed - Awaiting backend restart
**Issue:** Column name mismatch
**Solution:** Changed `instructor_name` to `requested_by` everywhere
**Date:** 2025-10-18
