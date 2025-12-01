# Schedule Panel Database Fix - Complete ✅

## Issue Summary

The schedule panel in [tutor-profile.html](profile-pages/tutor-profile.html) was reading from the database correctly, but was **not loading any data** for the logged-in user (jediael.s.abebe@gmail.com).

## Root Cause

The backend endpoints were using the **wrong ID** to query the database:

- **Users Table**: User ID = 115 (from `users` table)
- **Tutor Profiles Table**: Tutor Profile ID = 85 (from `tutor_profiles` table)
- **Problem**: Endpoints were using `current_user['id']` (115) instead of the tutor_profile ID (85)

### Database Structure

```
users (id: 115)
  └─> tutor_profiles (id: 85, user_id: 115)
        └─> tutor_schedules (tutor_id: 85) ← 15 schedules
        └─> tutor_sessions (tutor_id: 85) ← 25 sessions
```

The endpoints were querying:
```sql
-- WRONG (before fix)
SELECT * FROM tutor_schedules WHERE tutor_id = 115  -- Returns 0 rows

-- CORRECT (after fix)
SELECT * FROM tutor_schedules WHERE tutor_id = 85   -- Returns 15 rows
```

## Files Fixed

### 1. [tutor_schedule_endpoints.py](astegni-backend/tutor_schedule_endpoints.py)

**Endpoint**: `GET /api/tutor/schedules`

**Before (Line 277)**:
```python
cur.execute("""
    SELECT ... FROM tutor_schedules
    WHERE tutor_id = %s
    ORDER BY created_at DESC
""", (current_user['id'],))  # ❌ Using user_id (115)
```

**After (Lines 269-292)**:
```python
# First, get the tutor_profile ID for this user
cur.execute("""
    SELECT id FROM tutor_profiles WHERE user_id = %s
""", (current_user['id'],))

tutor_row = cur.fetchone()
if not tutor_row:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Tutor profile not found for this user"
    )

tutor_profile_id = tutor_row[0]  # ✅ Get tutor_profile id (85)

# Now get schedules for this tutor_profile
cur.execute("""
    SELECT ... FROM tutor_schedules
    WHERE tutor_id = %s
    ORDER BY created_at DESC
""", (tutor_profile_id,))  # ✅ Using tutor_profile_id (85)
```

### 2. [tutor_sessions_endpoints.py](astegni-backend/tutor_sessions_endpoints.py)

**Endpoint**: `GET /api/tutor/sessions`

**Before (Line 175)**:
```python
params = [current_user['id']]  # ❌ Using user_id (115)
```

**After (Lines 162-189)**:
```python
# First, get the tutor_profile ID for this user
cur.execute("""
    SELECT id FROM tutor_profiles WHERE user_id = %s
""", (current_user['id'],))

tutor_row = cur.fetchone()
if not tutor_row:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Tutor profile not found for this user"
    )

tutor_profile_id = tutor_row[0]  # ✅ Get tutor_profile id (85)

# Build query with optional filters
query = """
    SELECT ... FROM tutor_sessions
    WHERE tutor_id = %s
"""
params = [tutor_profile_id]  # ✅ Using tutor_profile_id (85)
```

**Endpoint**: `GET /api/tutor/sessions/stats/summary`

**Before (Line 374)**:
```python
cur.execute("""
    SELECT ... FROM tutor_sessions
    WHERE tutor_id = %s
""", (current_user['id'],))  # ❌ Using user_id (115)
```

**After (Lines 363-388)**:
```python
# First, get the tutor_profile ID for this user
cur.execute("""
    SELECT id FROM tutor_profiles WHERE user_id = %s
""", (current_user['id'],))

tutor_row = cur.fetchone()
if not tutor_row:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Tutor profile not found for this user"
    )

tutor_profile_id = tutor_row[0]  # ✅ Get tutor_profile id (85)

cur.execute("""
    SELECT ... FROM tutor_sessions
    WHERE tutor_id = %s
""", (tutor_profile_id,))  # ✅ Using tutor_profile_id (85)
```

## Test Results ✅

Tested with credentials: **jediael.s.abebe@gmail.com** / **@JesusJediael1234**

### Before Fix
```
GET /api/tutor/schedules → 200 OK, 0 schedules ❌
GET /api/tutor/sessions → 200 OK, 0 sessions ❌
GET /api/tutor/sessions/stats/summary → 200 OK, 0 total sessions ❌
```

### After Fix
```
GET /api/tutor/schedules → 200 OK, 15 schedules ✅
GET /api/tutor/sessions → 200 OK, 25 sessions ✅
GET /api/tutor/sessions/stats/summary → 200 OK
  - Total sessions: 25 ✅
  - Completed: 11 ✅
  - Total hours: 38.5 ✅
  - Total earnings: 2523.27 ETB ✅
```

## What Now Shows in the Schedule Panel

### All Tab
- **15 Teaching Schedules** (Mathematics, Physics, Chemistry, Biology, etc.)
- **25 Recent Sessions** (completed, in-progress, scheduled, cancelled)
- **Stats Cards**:
  - Total Schedules: 15
  - Active Sessions: 14 (scheduled)
  - Total Earnings: 2523.27 ETB
  - Average Rating: (calculated from sessions)

### Schedules Tab
- 15 schedules with:
  - Title, Subject, Grade Level
  - Schedule Type (recurring/one-time)
  - Time slots
  - Status (active/inactive)

### Sessions Tab
- 25 sessions with:
  - Subject, Topic, Date & Time
  - Status (completed/in-progress/scheduled/cancelled)
  - Duration, Payment Status
  - Student Ratings

## How to Verify

1. **Login** to [tutor-profile.html](http://localhost:8080/profile-pages/tutor-profile.html)
   - Email: jediael.s.abebe@gmail.com
   - Password: @JesusJediael1234

2. **Click "Schedule" panel** in the sidebar

3. **You should now see**:
   - Default "All" tab showing both schedules and sessions
   - Tabs to switch between All/Schedules/Sessions
   - Search functionality working
   - Stats cards showing real data

## Technical Notes

### Why This Happened

The Astegni platform uses a **multi-role system** where:
- One `users` record can have multiple roles: `["admin", "tutor", "student", "parent"]`
- Each role has a corresponding profile table:
  - `tutor_profiles` (tutor-specific data)
  - `student_profiles` (student-specific data)
  - `parent_profiles` (parent-specific data)
  - etc.

The foreign key relationship is:
```
tutor_schedules.tutor_id → tutor_profiles.id (NOT users.id)
tutor_sessions.tutor_id → tutor_profiles.id (NOT users.id)
```

### Pattern for Future Endpoints

When creating endpoints for tutor-specific data, always follow this pattern:

```python
# Step 1: Verify user has tutor role
if 'tutor' not in current_user.get('roles', []):
    raise HTTPException(status_code=403, detail="Only tutors can access this")

# Step 2: Get tutor_profile ID
cur.execute("SELECT id FROM tutor_profiles WHERE user_id = %s", (current_user['id'],))
tutor_row = cur.fetchone()

if not tutor_row:
    raise HTTPException(status_code=404, detail="Tutor profile not found")

tutor_profile_id = tutor_row[0]

# Step 3: Query with tutor_profile_id
cur.execute("SELECT ... WHERE tutor_id = %s", (tutor_profile_id,))
```

The same pattern applies to:
- `student_profiles` → `student_courses`, `student_documents`, etc.
- `parent_profiles` → `child_profiles`, etc.

## Status

✅ **FIXED** - Schedule panel now loads all 15 schedules and 25 sessions from database
✅ **TESTED** - Verified with user jediael.s.abebe@gmail.com
✅ **BACKEND RESTARTED** - Changes are live

---

**Fixed by**: Claude Code
**Date**: 2025-11-16
**Files Modified**: 2
**Lines Changed**: ~60 lines
**Impact**: High - Fixes critical data loading bug for all tutor users
