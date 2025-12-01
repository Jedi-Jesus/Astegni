# Session Requests Schema Fix - Complete ✅

## Problem

The `session_requests` table had incorrect foreign key references:
- `tutor_id` referenced `users.id` but stored `tutor_profiles.id` values
- `requester_id` referenced `users.id` but stored `student_profiles.id` or `parent_profiles.id` values
- Existing data used `users.id` values and needed migration to role-specific profile IDs

## Solution

### Migration: `migrate_fix_session_requests_fk.py`

**What it does:**
1. Drops existing foreign key constraints
2. Migrates existing data:
   - `tutor_id`: `users.id` → `tutor_profiles.id`
   - `requester_id` (students): `users.id` → `student_profiles.id`
   - `requester_id` (parents): `users.id` → `parent_profiles.id`
3. Adds correct foreign key constraints
4. Validates data integrity

### Execution Results

```
✅ Dropped 3 existing foreign key constraints
✅ Migrated 6 tutor_id values (users.id → tutor_profiles.id)
✅ Migrated 5 student requester_id values (users.id → student_profiles.id)
✅ Migrated 1 parent requester_id values (users.id → parent_profiles.id)
✅ Added foreign key: tutor_id → tutor_profiles.id
✅ Added foreign key: package_id → tutor_packages.id
✅ All data validated successfully
```

## Updated Schema

### Table: `session_requests`

```sql
CREATE TABLE session_requests (
    id SERIAL PRIMARY KEY,
    tutor_id INTEGER NOT NULL,           -- NOW: tutor_profiles.id ✅
    requester_id INTEGER NOT NULL,       -- NOW: student_profiles.id OR parent_profiles.id ✅
    requester_type VARCHAR(20) NOT NULL CHECK (requester_type IN ('student', 'parent')),
    package_id INTEGER,
    package_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    message TEXT,
    student_name VARCHAR(255),
    student_grade VARCHAR(50),
    preferred_schedule TEXT,
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP,

    -- Foreign Keys
    CONSTRAINT fk_session_requests_tutor
        FOREIGN KEY (tutor_id)
        REFERENCES tutor_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_session_requests_package
        FOREIGN KEY (package_id)
        REFERENCES tutor_packages(id)
        ON DELETE SET NULL
);

-- Note: requester_id has NO foreign key constraint
-- Reason: It can reference either student_profiles.id OR parent_profiles.id
-- Solution: Application-level integrity checking (already implemented)
```

### Indexes

```sql
CREATE INDEX idx_session_requests_tutor ON session_requests(tutor_id, status);
CREATE INDEX idx_session_requests_requester ON session_requests(requester_id);
```

## Architecture Flow

### 1. Creating a Session Request

**Frontend:** [js/tutor-profile/session-request-manager.js](js/tutor-profile/session-request-manager.js)

**Backend:** [session_request_endpoints.py:151-215](astegni-backend/session_request_endpoints.py#L151-L215)

```python
POST /api/session-requests
{
    "tutor_id": 85,              # tutor_profiles.id (NOT users.id)
    "package_name": "Premium Math",
    "student_name": "John Doe",
    "student_grade": "Grade 9"
}

# Backend extracts role-specific IDs from JWT:
role_ids = current_user.get('role_ids', {})  # {student: 27, tutor: 85}
requester_id = role_ids.get('student')        # 27 (student_profiles.id)

# Inserts with role-specific IDs:
INSERT INTO session_requests (tutor_id, requester_id, requester_type, ...)
VALUES (85, 27, 'student', ...)
```

### 2. Reading Session Requests (Tutor)

**Frontend:** [js/tutor-profile/session-request-manager.js:11-95](js/tutor-profile/session-request-manager.js#L11-L95)

**Backend:** [session_request_endpoints.py:218-320](astegni-backend/session_request_endpoints.py#L218-L320)

```python
GET /api/session-requests/tutor?status=pending
Authorization: Bearer {JWT with role_ids: {tutor: 85}}

# Backend extracts tutor_id from JWT:
tutor_id = role_ids.get('tutor')  # 85 (tutor_profiles.id)

# Query with role-specific ID:
SELECT * FROM session_requests sr
WHERE sr.tutor_id = 85  -- tutor_profiles.id ✅
```

### 3. Complex JOIN for Requester Details

```sql
SELECT sr.*,
    CASE
        WHEN sr.requester_type = 'student' THEN
            (SELECT CONCAT(u.first_name, ' ', u.father_name)
             FROM student_profiles sp
             JOIN users u ON sp.user_id = u.id
             WHERE sp.id = sr.requester_id)  -- ✅ sp.id = student_profiles.id
        WHEN sr.requester_type = 'parent' THEN
            (SELECT CONCAT(u.first_name, ' ', u.father_name)
             FROM parent_profiles pp
             JOIN users u ON pp.user_id = u.id
             WHERE pp.id = sr.requester_id)  -- ✅ pp.id = parent_profiles.id
    END as requester_name
FROM session_requests sr
WHERE sr.tutor_id = 85;
```

## Data Before vs After Migration

### Before Migration (Wrong - using users.id)

```
ID | tutor_id | requester_id | type    | status
------------------------------------------------
 1 |      115 |          112 | student | pending  ❌ 115 = users.id
 2 |      115 |           98 | student | pending  ❌ 115 = users.id
 3 |      115 |           93 | student | pending  ❌ 115 = users.id
```

### After Migration (Correct - using profile IDs)

```
ID | tutor_id | requester_id | type    | status
------------------------------------------------
 1 |       85 |           27 | student | pending  ✅ 85 = tutor_profiles.id
 2 |       85 |           26 | student | pending  ✅ 26 = student_profiles.id
 3 |       85 |           21 | student | pending  ✅ 21 = student_profiles.id
 4 |       85 |            1 | parent  | pending  ✅ 1 = parent_profiles.id
```

## Key Benefits

1. ✅ **Referential Integrity**: Foreign key on `tutor_id` prevents orphaned records
2. ✅ **Correct Data Types**: All IDs now reference the correct profile tables
3. ✅ **Consistent Architecture**: Matches the rest of the codebase (connections, packages, etc.)
4. ✅ **Backward Compatible**: Existing API endpoints work without changes
5. ✅ **Data Migration**: All existing records successfully migrated

## Important Notes

### Why no Foreign Key on `requester_id`?

PostgreSQL doesn't support conditional foreign keys. Since `requester_id` can reference either:
- `student_profiles.id` (when `requester_type = 'student'`)
- `parent_profiles.id` (when `requester_type = 'parent'`)

We rely on **application-level integrity checking** which is already implemented in the backend endpoints.

### Data Validation

The migration includes validation checks to ensure:
- All `tutor_id` values exist in `tutor_profiles`
- All student `requester_id` values exist in `student_profiles`
- All parent `requester_id` values exist in `parent_profiles`
- Invalid records are automatically deleted

## Testing

To verify the fix is working:

1. **Create a new session request:**
   - Login as a student
   - Visit a tutor's profile
   - Request a session
   - Check database: `tutor_id` should be `tutor_profiles.id`

2. **View session requests as tutor:**
   - Login as a tutor
   - Go to "Requested Sessions" panel
   - Should see all pending requests
   - Backend uses `tutor_profiles.id` for filtering

3. **Database validation:**
   ```bash
   cd astegni-backend
   python migrate_fix_session_requests_fk.py  # Re-run to validate
   ```

## Files Modified

1. **Migration Script (NEW):**
   - `astegni-backend/migrate_fix_session_requests_fk.py` ✅

2. **No Changes Required:**
   - `astegni-backend/session_request_endpoints.py` (already uses role-specific IDs)
   - `js/tutor-profile/session-request-manager.js` (already uses correct API)

## Summary

✅ **Schema Fixed**: Foreign keys now reference correct profile tables
✅ **Data Migrated**: All 6 existing records updated successfully
✅ **Validation Passed**: All data integrity checks passed
✅ **Architecture Consistent**: Matches role-specific ID pattern used throughout app
✅ **No Breaking Changes**: All existing endpoints work without modification

**Result:** The `session_requests` table now correctly uses `tutor_profiles.id` for tutor relationships, with proper foreign key constraints and migrated data. 🎯
