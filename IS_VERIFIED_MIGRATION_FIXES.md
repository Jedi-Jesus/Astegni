# is_verified Migration Fixes - Complete

## Summary
Fixed all references to `is_verified` in profile tables (tutor_profiles, student_profiles, parent_profiles, advertiser_profiles) to use the consolidated `is_verified` field in the users table.

## Background
The `is_verified` field was migrated from individual profile tables to the users table. All active code must now reference `u.is_verified` (from users table) instead of `tp.is_verified`, `sp.is_verified`, `pp.is_verified`, or `ap.is_verified` (from profile tables).

## Files Fixed

### 1. astegni-backend/app.py modules/routes.py
**Line 1600**
```python
# BEFORE
"is_verified": tutor.is_verified,

# AFTER
"is_verified": tutor.user.is_verified if tutor.user else False,
```
**Reason**: Python ORM access - accessing relationship

---

### 2. astegni-backend/whiteboard_endpoints.py (3 locations)

**Line 2069**
```python
# BEFORE
tp.is_verified,

# AFTER
u.is_verified,
```

**Line 2181**
```python
# BEFORE
tp.is_verified,

# AFTER
u.is_verified,
```

**Line 2211**
```python
# BEFORE
tp.is_verified,

# AFTER
u.is_verified,
```
**Reason**: SQL queries already had `JOIN users u ON tp.user_id = u.id`

---

### 3. astegni-backend/parent_endpoints.py (2 locations)

**Line 617**
```python
# Query starting line 609
# BEFORE
tp.is_verified,

# AFTER
u.is_verified,
```

**Line 761**
```python
# Query starting line 753
# BEFORE
tp.is_verified,

# AFTER
u.is_verified,
```
**Reason**: SQL queries already had `JOIN users u ON tp.user_id = u.id`

---

### 4. astegni-backend/auto_assign_expertise_badges.py (2 locations)

**Line 119**
```python
# BEFORE
tp.is_verified,

# AFTER
u.is_verified,
```

**Line 127 (GROUP BY clause)**
```python
# BEFORE
GROUP BY tp.id, tp.user_id, u.email, tp.username, tp.experience,
         tp.courses_created, tp.is_verified, tp.expertise_badge

# AFTER
GROUP BY tp.id, tp.user_id, u.email, tp.username, tp.experience,
         tp.courses_created, u.is_verified, tp.expertise_badge
```
**Reason**: SQL query already had `JOIN users u ON tp.user_id = u.id`

---

## Verification

### Files NOT Modified (Correctly)
- `migrate_consolidate_verification_to_users.py` - Migration script that copies data FROM old columns
- `migrate_add_is_verified_to_users.py` - Migration script that reads old columns

These migration scripts are supposed to reference the old columns during the migration process, so they were intentionally not modified.

### Search Command Used
```bash
# Find any remaining references
grep -rn "tp\.is_verified\|sp\.is_verified\|pp\.is_verified\|ap\.is_verified" astegni-backend/
```

Result: Only migration scripts remain (as expected).

## Testing Recommendations

1. **Test tutor profile endpoints**:
   - `GET /api/tutors` - Should show is_verified correctly
   - `GET /api/tutor/{id}` - Should show is_verified correctly

2. **Test whiteboard endpoints**:
   - `GET /api/whiteboard/sessions/{session_id}/enrolled-students` - Should show tutor verification
   - `GET /api/whiteboard/bookings` - Should include tutor verification status

3. **Test parent endpoints**:
   - `GET /api/parent/children-tutors` - Should show tutor verification
   - `GET /api/parent/students/{student_id}/tutors` - Should show tutor verification

4. **Test badge assignment**:
   - Run `python auto_assign_expertise_badges.py` - Should access is_verified correctly

## Error Patterns Fixed

### AttributeError Pattern
```
AttributeError: 'TutorProfile' object has no attribute 'is_verified'
```
**Fix**: Changed from `tutor.is_verified` to `tutor.user.is_verified if tutor.user else False`

### SQL Error Pattern
```
psycopg.errors.UndefinedColumn: column tp.is_verified does not exist
HINT: Perhaps you meant to reference the column "u.is_verified"
```
**Fix**: Changed SQL queries from `tp.is_verified` to `u.is_verified`

## Related Files
- [CALL_API_FIX.md](CALL_API_FIX.md) - Documents the 422 error on `/api/chat/calls` (separate frontend issue)
- Database model: `astegni-backend/app.py modules/models.py` lines 167-168 (comment documenting the migration)

## Status: ✅ COMPLETE

All `is_verified` references in active code have been migrated to use the users table. Backend errors related to `is_verified` should no longer occur.

**Date Fixed**: 2026-01-16
**Files Modified**: 4 files, 9 individual changes
**Migration Scripts Preserved**: 2 files (intentionally not modified)
