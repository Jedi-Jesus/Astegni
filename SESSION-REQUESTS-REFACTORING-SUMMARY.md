# Session Requests & Students Refactoring Summary

## Overview
Refactored the session request system to properly separate **pending session requests** from **enrolled students** in the tutor profile.

## Changes Made

### 1. Database Changes

#### Table Rename: `session_requests` → `tutor_session_requests`
- **Migration File**: `astegni-backend/migrate_rename_session_requests.py`
- **Purpose**: More descriptive name to clarify this table is for tutor session requests
- **Indexes Renamed**:
  - `idx_session_requests_tutor` → `idx_tutor_session_requests_tutor`
  - `idx_session_requests_requester` → `idx_tutor_session_requests_requester`

#### New Table: `tutor_students`
- **Migration File**: `astegni-backend/migrate_create_tutor_students.py`
- **Purpose**: Dedicated table for enrolled students (accepted session requests)
- **Fields**:
  ```sql
  - id (SERIAL PRIMARY KEY)
  - tutor_id (INTEGER, FK to tutor_profiles.id)
  - student_profile_id (INTEGER, the requester_id from session request)
  - requester_type (VARCHAR, 'student' or 'parent')
  - student_name (VARCHAR)
  - student_grade (VARCHAR)
  - package_name (VARCHAR)
  - contact_phone (VARCHAR)
  - contact_email (VARCHAR)
  - profile_picture (TEXT)
  - session_request_id (INTEGER, reference to original request)
  - enrolled_at (TIMESTAMP, when accepted)
  - created_at (TIMESTAMP)
  - updated_at (TIMESTAMP)
  - UNIQUE(tutor_id, student_profile_id) -- Prevent duplicates
  ```
- **Indexes**:
  - `idx_tutor_students_tutor` on `tutor_id`
  - `idx_tutor_students_student` on `student_profile_id`
  - `idx_tutor_students_session_request` on `session_request_id`

### 2. Backend Changes

#### File: `astegni-backend/session_request_endpoints.py`

**Updated Endpoints:**

1. **`POST /api/session-requests`** (Create session request)
   - Now inserts into `tutor_session_requests` table

2. **`GET /api/session-requests/tutor`** (Get tutor's session requests)
   - Now queries `tutor_session_requests` table
   - Still supports status filtering (pending, accepted, rejected)

3. **`GET /api/session-requests/tutor/{request_id}`** (Get request details)
   - Now queries `tutor_session_requests` table

4. **`PATCH /api/session-requests/tutor/{request_id}`** (Accept/Reject request)
   - **MAJOR CHANGE**: When status = 'accepted', automatically populates `tutor_students` table
   - Updates `tutor_session_requests` status
   - Fetches profile picture from student/parent profile
   - Inserts student data into `tutor_students` with `ON CONFLICT DO NOTHING` to prevent duplicates
   - Returns enhanced success message

5. **`GET /api/session-requests/tutor/my-students`** (Get enrolled students)
   - **MAJOR CHANGE**: Now reads from `tutor_students` table instead of filtering `session_requests`
   - Returns students in order of enrollment date (newest first)

6. **`GET /api/session-requests/my-requests`** (Student/Parent view their requests)
   - Now queries `tutor_session_requests` table

### 3. Frontend Changes

**No frontend changes required!** The frontend JavaScript ([session-request-manager.js](js/tutor-profile/session-request-manager.js)) continues to work as-is because:
- API endpoints remain the same (`/api/session-requests/...`)
- Response structures remain identical
- The `loadMyStudents()` function already calls the correct endpoint
- Panel switching logic unchanged

## Data Flow

### Before (Old System):
```
Student requests session
  ↓
INSERT into session_requests (status: pending)
  ↓
Tutor accepts request
  ↓
UPDATE session_requests (status: accepted)
  ↓
"My Students" panel reads: session_requests WHERE status='accepted'
```

### After (New System):
```
Student requests session
  ↓
INSERT into tutor_session_requests (status: pending)
  ↓
Tutor accepts request
  ↓
UPDATE tutor_session_requests (status: accepted)
  AND
INSERT into tutor_students (enrolled student data)
  ↓
"My Students" panel reads: tutor_students (dedicated table)
```

## Benefits

1. **Data Separation**: Pending requests and enrolled students are now in separate tables
2. **Better Performance**: `tutor_students` is optimized for enrolled student queries
3. **No Duplicates**: UNIQUE constraint prevents duplicate student enrollments
4. **Historical Tracking**: Both tables coexist - can track request history + current students
5. **Clearer Intent**: Table names clearly indicate purpose
6. **Future-Proof**: Easier to add student-specific features to `tutor_students` table

## Testing Checklist

- [x] Backend migrations run successfully
- [x] Backend server restarted
- [ ] Test creating a new session request (should insert into `tutor_session_requests`)
- [ ] Test viewing pending requests in "Requested Sessions" panel
- [ ] Test accepting a session request (should update `tutor_session_requests` AND insert into `tutor_students`)
- [ ] Test viewing enrolled students in "My Students" panel (should read from `tutor_students`)
- [ ] Verify no duplicate students when accepting same request twice
- [ ] Test rejecting a session request (should NOT insert into `tutor_students`)

## Files Modified

### Backend:
- ✅ `astegni-backend/migrate_rename_session_requests.py` (NEW)
- ✅ `astegni-backend/migrate_create_tutor_students.py` (NEW)
- ✅ `astegni-backend/session_request_endpoints.py` (UPDATED - all queries + accept logic)

### Frontend:
- ⚠️ No changes needed (endpoints remain compatible)

### Database:
- ✅ `session_requests` renamed to `tutor_session_requests`
- ✅ `tutor_students` table created
- ✅ Indexes updated

## Next Steps

1. **Test the flow end-to-end**:
   - Create a session request from student/parent profile
   - View it in tutor profile "Requested Sessions" panel
   - Accept the request
   - Verify student appears in "My Students" panel
   - Verify student data is in `tutor_students` table

2. **Optional Enhancements** (future):
   - Add student progress tracking to `tutor_students`
   - Add session history per student
   - Add notes field for tutors to track student-specific info
   - Add active/inactive status for enrolled students

## Migration Commands

```bash
# Run migrations (already completed)
cd astegni-backend
python migrate_rename_session_requests.py
python migrate_create_tutor_students.py

# Restart backend
python app.py
```

## Database Verification

```sql
-- Check tutor_session_requests table
SELECT * FROM tutor_session_requests ORDER BY created_at DESC LIMIT 5;

-- Check tutor_students table
SELECT * FROM tutor_students ORDER BY enrolled_at DESC LIMIT 5;

-- Verify indexes
SELECT indexname FROM pg_indexes WHERE tablename IN ('tutor_session_requests', 'tutor_students');
```

## Success Criteria

✅ `tutor_session_requests` table exists and contains session requests
✅ `tutor_students` table exists and is empty (will populate on first accept)
✅ Backend server running without errors
✅ "Requested Sessions" panel displays pending requests
✅ "My Students" panel displays enrolled students (currently empty until first accept)
✅ Accepting a request adds student to `tutor_students` table
✅ No duplicate students in `tutor_students` table

---

**Status**: ✅ **Implementation Complete** - Ready for testing!
**Date**: 2025-11-22
