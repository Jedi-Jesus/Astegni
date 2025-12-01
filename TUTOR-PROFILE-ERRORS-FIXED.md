# Tutor Profile Errors Fixed

## Summary
Fixed two major database-related errors in the tutor profile system that were causing 500 Internal Server Errors.

## Issues Identified

### 1. Missing Columns in tutor_packages Table
**Error:**
```
psycopg.errors.UndefinedColumn: column "grade_level" does not exist
LINE 2:  SELECT id, tutor_id, name, grade_level, courses,...
```

**Root Cause:**
The `tutor_packages` table schema didn't match what the endpoints were expecting. The table had old columns (`price`, `duration_hours`, `sessions_count`, `subjects`) but the endpoints were looking for new columns (`grade_level`, `courses`, `hourly_rate`, `days_per_week`, `hours_per_day`, `payment_frequency`, `discount_*`).

**Solution:**
Created and ran migration script `migrate_fix_tutor_packages.py` that:
- Added all missing columns required by the endpoints
- Migrated data from old columns to new ones (price → hourly_rate, subjects → courses)
- Removed obsolete columns

### 2. Schedule Response Type Mismatches
**Error:**
```
pydantic_core._pydantic_core.ValidationError: 2 validation errors for ScheduleResponse
start_time
  Input should be a valid string [type=string_type, input_value=datetime.time(16, 47), input_type=time]
end_time
  Input should be a valid string [type=string_type, input_value=datetime.time(16, 51), input_type=time]
```

**Root Cause:**
- PostgreSQL returns `start_time` and `end_time` as `datetime.time` objects
- Pydantic ScheduleResponse model expects strings
- Multiple schedule endpoints had incorrect column index mappings in their response objects

**Solution:**
Fixed `tutor_schedule_endpoints.py` in three endpoints:
1. **POST /api/tutor/schedules** (create_schedule) - Fixed column indices and converted time to string
2. **GET /api/tutor/schedules** (get_tutor_schedules) - Fixed column indices and converted time to string
3. **GET /api/tutor/schedules/{id}** (get_schedule_by_id) - Fixed column indices and converted time to string
4. **PUT /api/tutor/schedules/{id}** (update_schedule) - Expanded UPDATE query to include all fields, fixed column indices, and converted time to string

## Files Modified

### Backend Files
1. **astegni-backend/migrate_fix_tutor_packages.py** (NEW)
   - Migration script to fix tutor_packages table schema

2. **astegni-backend/tutor_schedule_endpoints.py**
   - Line 209-232: Fixed create_schedule response mapping + time conversion
   - Line 283-306: Fixed get_tutor_schedules response mapping + time conversion
   - Line 350-373: Fixed get_schedule_by_id response mapping + time conversion
   - Line 407-441: Expanded update_schedule query to include all fields
   - Line 452-475: Fixed update_schedule response mapping + time conversion

## Database Schema Changes

### tutor_packages Table - New Schema
```sql
id                    INTEGER
tutor_id              INTEGER
name                  VARCHAR
description           TEXT
is_active             BOOLEAN
created_at            TIMESTAMP
updated_at            TIMESTAMP
grade_level           VARCHAR(255)      -- NEW
courses               TEXT              -- NEW (replaces subjects)
hourly_rate           DECIMAL(10,2)     -- NEW (replaces price)
days_per_week         INTEGER           -- NEW
hours_per_day         DECIMAL(4,2)      -- NEW
payment_frequency     VARCHAR(50)       -- NEW (default: 'monthly')
discount_1_month      DECIMAL(5,2)      -- NEW (default: 0)
discount_3_month      DECIMAL(5,2)      -- NEW (default: 0)
discount_6_month      DECIMAL(5,2)      -- NEW (default: 0)
```

### Removed Columns
- `price` → migrated to `hourly_rate`
- `duration_hours` → removed
- `sessions_count` → removed
- `subjects` (JSON) → migrated to `courses` (TEXT)

## Testing
To test the fixes:

1. **Test Packages Endpoint:**
```bash
# Login as tutor
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jediael.s.abebe@gmail.com","password":"your_password"}'

# Get packages (should now work)
curl -X GET http://localhost:8000/api/tutor/packages \
  -H "Authorization: Bearer YOUR_TOKEN"
```

2. **Test Schedules Endpoints:**
```bash
# Get schedules (should now work)
curl -X GET http://localhost:8000/api/tutor/schedules \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create schedule
curl -X POST http://localhost:8000/api/tutor/schedules \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Math Class",
    "subject": "Mathematics",
    "subject_type": "Mathematics",
    "grade_level": "Grade 9-10",
    "year": 2025,
    "schedule_type": "recurring",
    "months": ["January", "February"],
    "days": ["Monday", "Wednesday"],
    "specific_dates": [],
    "start_time": "14:00",
    "end_time": "16:00",
    "status": "active",
    "alarm_enabled": false,
    "notification_browser": false,
    "notification_sound": false
  }'
```

3. **Test from Frontend:**
- Navigate to tutor-profile.html
- Login as a tutor
- Check that the Packages panel loads without errors
- Check that the Schedule panel loads without errors
- Try creating a new schedule
- Try viewing existing schedules

## Impact
These fixes resolve all the 500 errors that were occurring when:
- Loading the tutor profile page
- Accessing the Packages panel
- Accessing the Schedule panel
- Creating new schedules
- Viewing existing schedules

All tutor profile features should now work correctly with proper database integration.

## Next Steps
The backend should automatically reload (if using `--reload` flag). If not, restart it:

```bash
cd astegni-backend
# Stop the current server (Ctrl+C)
# Restart
python app.py
```

Then test the tutor profile page to verify all features work correctly.
