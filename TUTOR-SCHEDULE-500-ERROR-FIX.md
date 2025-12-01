# Tutor Schedule 500 Error - FIXED

## The Problem

When accessing the tutor profile page, the backend was throwing a **500 Internal Server Error** when trying to fetch the tutor's schedule:

```
ERROR: column tutor_schedules.subject_type does not exist
LINE 1: ...tor_schedules.subject AS tutor_schedules_subject, tutor_sche...
```

**API Endpoint:** `GET /api/tutor/85/schedule`

**Error Type:** `psycopg.errors.UndefinedColumn`

## Root Cause

The `TutorSchedule` SQLAlchemy model in `app.py modules/models.py` defined a `subject_type` column (line 840):

```python
class TutorSchedule(Base):
    __tablename__ = "tutor_schedules"

    # ... other fields ...
    subject = Column(String(255), nullable=False)
    subject_type = Column(String(100), nullable=False)  # ← This column was missing in DB!
    grade_level = Column(String(100), nullable=False)
    # ... other fields ...
```

However, this column **did not exist in the actual PostgreSQL database table**. This happened because:

1. The model was updated to include `subject_type` in code
2. The database migration was **never run** to add the column to the table
3. When SQLAlchemy tried to query the table, it expected a column that didn't exist

## The Solution

Created and ran a database migration to add the missing `subject_type` column:

**Migration File:** `astegni-backend/migrate_add_subject_type_column.py`

**What it does:**
1. Checks if `subject_type` column already exists
2. Adds `subject_type` column as `VARCHAR(100)`
3. Sets default values for existing records (copies from `subject` field)
4. Makes the column `NOT NULL` to match the model definition

**Running the migration:**
```bash
cd astegni-backend
python migrate_add_subject_type_column.py
```

**Output:**
```
[CHECK] Checking if subject_type column exists...
[ADD] Adding subject_type column to tutor_schedules table...
[UPDATE] Setting default values for existing records...
[ALTER] Making subject_type NOT NULL...
[SUCCESS] Migration completed successfully!
   - Added subject_type column (VARCHAR(100), NOT NULL)
   - Set default values from subject column for existing records
```

## Result

✅ **FIXED!** The tutor schedule endpoint now works correctly:

```bash
GET /api/tutor/85/schedule
Response: [] (empty array, no schedules yet)
Status: 200 OK
```

No more 500 errors when loading the tutor profile page!

## What is subject_type?

The `subject_type` field stores the **original subject selection** before it's processed. For example:

- User selects: "Mathematics (Grade 10)"
- `subject_type` = "Mathematics (Grade 10)" ← Original selection
- `subject` = "Mathematics" ← Processed/cleaned subject name
- `grade_level` = "Grade 10" ← Extracted grade level

This allows the system to:
- Display the exact subject the tutor selected
- Parse and filter by subject name and grade level separately
- Maintain data integrity and traceability

## Files Changed

1. **Created:** `astegni-backend/migrate_add_subject_type_column.py` - Migration script
2. **Created:** `TUTOR-SCHEDULE-500-ERROR-FIX.md` - This documentation

## Testing

Test the fix by:
1. Opening tutor profile: http://localhost:8080/profile-pages/tutor-profile.html
2. No more 500 errors in the browser console
3. Schedule panel loads correctly (even if empty)
4. Backend logs show: `GET /api/tutor/85/schedule HTTP/1.1" 200 OK`

## Prevention

To avoid this in the future:

1. **Always run migrations** when SQLAlchemy models are updated
2. **Check database schema** matches model definitions before deploying
3. **Test endpoints** after model changes to catch missing columns early
4. **Document migrations** so the team knows what changes were made

## Related Files

- Model definition: `astegni-backend/app.py modules/models.py` (line 830-876)
- Migration script: `astegni-backend/migrate_add_subject_type_column.py`
- API endpoint: `astegni-backend/app.py modules/routes.py` (get_tutor_schedule function)

---

**Status:** ✅ RESOLVED
**Date Fixed:** 2025-11-18
**Migration:** migrate_add_subject_type_column.py
