# Whiteboard Legacy Columns Cleanup Guide

## Overview

The `whiteboard_sessions` table has legacy columns that need to be removed:
- `tutor_id` (INTEGER) - Old user_id based system
- `student_id` (INTEGER[]) - Old user_id based array

These have been replaced by:
- `host_profile_id` (INTEGER) - Profile ID of session host (tutor or student)
- `host_profile_type` (VARCHAR) - Type: 'tutor' or 'student'
- `participant_profile_ids` (INTEGER[]) - Array of participant profile IDs
- `participant_profile_types` (VARCHAR[]) - Array of participant types

## Migration Steps

### Phase 1: Update Backend Queries ✅ PARTIALLY DONE

#### Already Fixed (Host-Only Operations):
1. ✅ `/pages/create` - Uses `host_profile_id` comparison
2. ✅ `/sessions/{id}/permissions` - Uses `host_profile_id` comparison
3. ✅ `/sessions/{id}/start` - Uses `host_profile_id` comparison
4. ✅ `/sessions/{id}/end` - Uses `host_profile_id` comparison
5. ✅ `/recordings/start` - Uses `host_profile_id` comparison
6. ✅ `/recordings/stop` - Uses `host_profile_id` comparison

#### Still Need Fixing:

**File: `whiteboard_endpoints.py`**

**1. GET /sessions (Line 297-391)**
```python
# Current: Uses tutor_id and student_id array
WHERE ws.tutor_id = %s
AND %s = ANY(ws.student_id)

# Should use:
WHERE ws.host_profile_id = %s AND ws.host_profile_type = %s
AND %s = ANY(ws.participant_profile_ids)
```

**2. POST /sessions (Line 417-503)**
```python
# Current: Inserts both old and new columns
INSERT INTO whiteboard_sessions (
    booking_id, tutor_id, student_id,
    host_profile_id, host_profile_type,
    participant_profile_ids, participant_profile_types,
    ...
)

# Should only insert new columns:
INSERT INTO whiteboard_sessions (
    booking_id,
    host_profile_id, host_profile_type,
    participant_profile_ids, participant_profile_types,
    ...
)
```

**3. GET /sessions/{id} (Line 610-760)**
```python
# Current: Uses COALESCE fallback to legacy columns
COALESCE(s.host_profile_id, s.tutor_id) as tutor_id,
COALESCE(s.participant_profile_ids[1], s.student_id[1]) as student_id,

# JOIN conditions check both old and new
LEFT JOIN users u1 ON (
    s.tutor_id = u1.id OR
    (s.host_profile_type = 'tutor' AND s.host_profile_id = u1.id)
)

# Should use only new columns:
s.host_profile_id,
s.host_profile_type,
s.participant_profile_ids,
s.participant_profile_types

# Join based on profile type lookup
```

**4. GET /sessions/history/{user_type}/{user_id} (Line 772-843)**
```python
# Current: Uses tutor_id/student_id fields directly
field = 'tutor_id' if user_type == 'tutor' else 'student_id'
WHERE s.{field} = %s

# Should check host and participants:
WHERE (ws.host_profile_id = %s AND ws.host_profile_type = %s)
   OR (%s = ANY(ws.participant_profile_ids))
```

**5. POST /chat/send (Line 1100-1130)**
```python
# Current: Checks tutor_id and student_id
SELECT tutor_id, student_id FROM whiteboard_sessions WHERE id = %s
if current_user.get('id') not in session:

# Should check host and participants with profile IDs
```

**6. GET /chat/messages (Line 1138-1177)**
```python
# Current: Similar to above
SELECT tutor_id, student_id FROM whiteboard_sessions WHERE id = %s

# Should use profile-based access check
```

**7. POST /recordings (Line 1418-1530)**
```python
# Current: Checks session access with old columns
SELECT tutor_id, student_id FROM whiteboard_sessions WHERE id = %s

# Creates recording with student_id array
student_ids = [student_id] if student_id else []
INSERT INTO whiteboard_session_recordings (
    session_id, student_id, ...
)

# Should use participant_profile_ids
```

**8. GET /recordings/{session_id} (Line 1540-1615)**
```python
# Current: Access check with old columns
SELECT tutor_id, student_id FROM whiteboard_sessions WHERE id = %s

# Should use profile-based access check
```

**9. DELETE /recordings/{id} (Line 1617-1674)**
```python
# Current: Checks tutor ownership
SELECT r.session_id, s.tutor_id
FROM whiteboard_session_recordings r
JOIN whiteboard_sessions s ON r.session_id = s.id
WHERE r.id = %s

if result[1] != current_user.get('id'):
    raise HTTPException(status_code=403)

# Should check host_profile_id
```

**10. WebSocket /participants (Line 2337-2415)**
```python
# Current: Uses tutor_id and student_id
SELECT ws.tutor_id, ws.student_id, ws.status FROM whiteboard_sessions

# Should use host and participant profile IDs
```

### Phase 2: Update Frontend

The frontend (`whiteboard-manager.js`) already uses profile-based WebSocket routing:
- Connection keys: `tutor_{profile_id}`, `student_{profile_id}`
- Message routing uses `profile_id` and `profile_type`

**No frontend changes needed** ✅

### Phase 3: Drop Legacy Columns

Once all backend queries are updated:

```bash
cd astegni-backend
python migrate_drop_legacy_whiteboard_columns.py
```

The migration will:
1. Verify all sessions have profile-based columns populated
2. Create a backup table with old column data
3. Drop `tutor_id` and `student_id` columns
4. Verify the drop was successful

## Rollback Plan

If something breaks after dropping columns:

```sql
-- Restore columns from backup
ALTER TABLE whiteboard_sessions ADD COLUMN tutor_id INTEGER;
ALTER TABLE whiteboard_sessions ADD COLUMN student_id INTEGER[];

UPDATE whiteboard_sessions ws SET
  tutor_id = b.tutor_id,
  student_id = b.student_id
FROM whiteboard_sessions_legacy_backup_YYYYMMDD_HHMMSS b
WHERE ws.id = b.id;
```

## Testing Checklist

Before running migration:

- [ ] Test creating whiteboard session as tutor host
- [ ] Test creating whiteboard session as student host
- [ ] Test adding pages as host
- [ ] Test updating permissions as host
- [ ] Test starting/ending session as host
- [ ] Test recording as host
- [ ] Test loading session as participant
- [ ] Test chat messages
- [ ] Test accessing recordings
- [ ] Test session history for both tutor and student
- [ ] Test WebSocket participant tracking

## Current Status

- ✅ Frontend fully profile-based
- ✅ Host-only operations (6 endpoints) fixed
- ⏳ General session queries (10 endpoints) need updating
- ⏳ Migration script ready but not run yet

## Next Steps

1. Update the remaining 10 endpoints to use profile-based queries
2. Test all whiteboard functionality thoroughly
3. Run the migration script to drop legacy columns
4. Monitor for any issues
5. Delete backup table after 1 week of stable operation
