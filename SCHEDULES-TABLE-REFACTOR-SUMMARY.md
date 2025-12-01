# Schedules Table Refactor Summary

## Overview
The `tutor_schedules` table has been refactored to a universal `schedules` table that supports ALL user roles (tutor, student, parent, advertiser, etc.).

## Changes Made

### 1. Table Rename
- **Old**: `tutor_schedules`
- **New**: `schedules`

### 2. Field Changes

#### Renamed Fields
| Old Field Name | New Field Name | Type | Description |
|---------------|----------------|------|-------------|
| `tutor_id` | `scheduler_id` | `INTEGER` | References `users.id` (CASCADE on delete) |

#### Added Fields
| Field Name | Type | Default | Description |
|-----------|------|---------|-------------|
| `scheduler_role` | `VARCHAR(50)` | - | Role of the scheduler ('tutor', 'student', 'parent', etc.) |
| `priority_level` | `VARCHAR(20)` | `'medium'` | Priority level: 'low', 'medium', 'high', 'urgent' |

#### Removed Fields
| Field Name | Reason for Removal |
|-----------|-------------------|
| `subject` | No longer needed - schedules are now role-agnostic |
| `grade_level` | No longer needed - replaced by `priority_level` |

### 3. Database Schema

#### New Table Structure
```sql
CREATE TABLE schedules (
    id SERIAL PRIMARY KEY,
    scheduler_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scheduler_role VARCHAR(50) NOT NULL,

    -- Schedule Details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    year INTEGER NOT NULL,

    -- Schedule Type: 'recurring' or 'specific'
    schedule_type VARCHAR(20) DEFAULT 'recurring',

    -- For recurring schedules
    months TEXT[],
    days TEXT[],

    -- For specific date schedules
    specific_dates TEXT[],

    -- Time
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    notes TEXT,

    -- Priority Level (NEW)
    priority_level VARCHAR(20) DEFAULT 'medium',

    -- Status
    status VARCHAR(20) DEFAULT 'active',

    -- Alarm/Notification settings
    alarm_enabled BOOLEAN DEFAULT FALSE,
    alarm_before_minutes INTEGER,
    notification_browser BOOLEAN DEFAULT FALSE,
    notification_sound BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_schedules_scheduler_id ON schedules(scheduler_id);
CREATE INDEX idx_schedules_scheduler_role ON schedules(scheduler_role);
CREATE INDEX idx_schedules_status ON schedules(status);
CREATE INDEX idx_schedules_created_at ON schedules(created_at);
```

### 4. Migration Process

#### Migration Script
- **File**: `astegni-backend/migrate_refactor_schedules_table.py`
- **Purpose**: Safely migrate from `tutor_schedules` to `schedules`

#### Migration Steps
1. Check if `tutor_schedules` exists
2. Create new `schedules` table with updated schema
3. Migrate all data from `tutor_schedules` to `schedules`
   - Set `scheduler_id = tutor_id`
   - Set `scheduler_role = 'tutor'` for all existing records
   - Set `priority_level = 'medium'` (default)
4. Verify data integrity (count check)
5. Drop old `tutor_schedules` table

#### Run Migration
```bash
cd astegni-backend
python migrate_refactor_schedules_table.py
```

### 5. Updated Files

#### Backend Files
1. **`app.py modules/models.py`**
   - Updated `TutorSchedule` model → `Schedule` model
   - Added `scheduler_role` field
   - Added `priority_level` field
   - Removed `subject` and `grade_level` fields
   - Updated Pydantic schemas: `ScheduleCreate`, `ScheduleResponse`
   - Added legacy aliases: `TutorScheduleCreate`, `TutorScheduleResponse`

2. **`schedule_endpoints.py`** (NEW)
   - Universal schedule endpoints for ALL roles
   - Auto-determines `scheduler_role` from user's `active_role`
   - Endpoints:
     - `POST /api/schedules` - Create schedule
     - `GET /api/schedules` - Get user's schedules (with optional role filter)
     - `GET /api/schedules/{id}` - Get specific schedule
     - `PUT /api/schedules/{id}` - Update schedule
     - `DELETE /api/schedules/{id}` - Delete schedule
     - `PATCH /api/schedules/{id}/toggle-notification` - Toggle notification
     - `PATCH /api/schedules/{id}/toggle-alarm` - Toggle alarm

3. **`migrate_refactor_schedules_table.py`** (NEW)
   - Migration script to refactor table

#### Legacy File (Keep for backward compatibility)
- **`tutor_schedule_endpoints.py`**
  - Keep this file temporarily for backward compatibility
  - Will be deprecated in future versions
  - Recommend updating frontend to use new `/api/schedules` endpoints

### 6. API Endpoint Changes

#### Old Endpoints (Deprecated - still work but will be removed)
```
POST   /api/tutor/schedules
GET    /api/tutor/schedules
GET    /api/tutor/schedules/{id}
PUT    /api/tutor/schedules/{id}
DELETE /api/tutor/schedules/{id}
```

#### New Endpoints (Universal - works for ALL roles)
```
POST   /api/schedules
GET    /api/schedules?role_filter=tutor  (optional filter)
GET    /api/schedules/{id}
PUT    /api/schedules/{id}
DELETE /api/schedules/{id}
PATCH  /api/schedules/{id}/toggle-notification
PATCH  /api/schedules/{id}/toggle-alarm
```

### 7. Frontend Updates Required

#### Update API Calls
```javascript
// OLD (tutor-specific)
const response = await fetch('/api/tutor/schedules', {
    method: 'POST',
    body: JSON.stringify({
        title: 'Math Class',
        subject: 'Mathematics',  // REMOVED
        grade_level: 'Grade 10', // REMOVED
        year: 2025,
        // ... other fields
    })
});

// NEW (universal for all roles)
const response = await fetch('/api/schedules', {
    method: 'POST',
    body: JSON.stringify({
        title: 'Math Class',
        priority_level: 'high',  // NEW
        year: 2025,
        // ... other fields
        // scheduler_role is auto-determined from user's active_role
    })
});
```

#### Update Schedule Display
```javascript
// Response now includes scheduler_role
{
    id: 1,
    scheduler_id: 42,
    scheduler_role: 'tutor',  // NEW
    title: 'Math Class',
    priority_level: 'high',   // NEW (instead of subject/grade_level)
    year: 2025,
    // ... other fields
}
```

### 8. Benefits of This Refactor

1. **Universal Schedule System**: Any role can create schedules (not just tutors)
2. **Simpler Data Model**: Removed subject/grade_level which were too specific
3. **Priority-Based**: `priority_level` is more flexible than subject-based scheduling
4. **Multi-Role Support**: Users can create schedules for different roles
5. **Better Performance**: Added indexes on `scheduler_role` for efficient filtering
6. **Future-Proof**: Easily supports new roles (advertiser, admin, etc.)

### 9. Data Migration Safety

#### Backward Compatibility
- All existing `tutor_schedules` data is migrated to `schedules`
- `tutor_id` → `scheduler_id`
- `scheduler_role` set to `'tutor'` for all migrated records
- `priority_level` set to `'medium'` (default)

#### No Data Loss
- Migration script includes verification step
- Checks that record count matches before dropping old table
- Rollback on any error

### 10. Next Steps

1. **Run Migration**
   ```bash
   cd astegni-backend
   python migrate_refactor_schedules_table.py
   ```

2. **Update Backend Routes** (if using FastAPI main app)
   - Import `schedule_endpoints` router
   - Add to main app: `app.include_router(schedule_endpoints.router)`

3. **Update Frontend**
   - Replace `/api/tutor/schedules` with `/api/schedules`
   - Remove `subject` and `grade_level` fields
   - Add `priority_level` field
   - Update schedule display to show `scheduler_role` and `priority_level`

4. **Test**
   - Create schedules as tutor
   - Create schedules as student
   - Create schedules as parent
   - Verify role filtering works: `GET /api/schedules?role_filter=tutor`

5. **Deprecate Old Endpoints**
   - After frontend migration is complete
   - Remove `tutor_schedule_endpoints.py`
   - Remove legacy routes from main app

## Example Usage

### Create Schedule (Auto-detects role)
```bash
curl -X POST http://localhost:8000/api/schedules \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Weekly Math Review",
    "description": "Review sessions for advanced mathematics",
    "year": 2025,
    "schedule_type": "recurring",
    "months": ["January", "February", "March"],
    "days": ["Monday", "Wednesday"],
    "start_time": "14:00",
    "end_time": "16:00",
    "priority_level": "high",
    "status": "active"
  }'
```

### Get Schedules (All roles)
```bash
curl -X GET http://localhost:8000/api/schedules \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Schedules (Filter by role)
```bash
curl -X GET "http://localhost:8000/api/schedules?role_filter=tutor" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Priority Levels

| Level | Use Case | Example |
|-------|----------|---------|
| `low` | Optional, flexible tasks | Optional study group |
| `medium` | Regular scheduled items | Weekly tutoring session |
| `high` | Important commitments | Exam preparation |
| `urgent` | Critical/time-sensitive | Last-minute test prep |

## Questions or Issues?

If you encounter any issues during migration:
1. Check migration script output for errors
2. Verify database connection in `.env`
3. Ensure `tutor_schedules` table exists before migration
4. Check PostgreSQL logs for detailed error messages
