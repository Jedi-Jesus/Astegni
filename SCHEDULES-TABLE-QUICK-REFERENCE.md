# Schedules Table - Quick Reference Guide

## Migration Status: ✅ COMPLETE

**Date**: 2025-11-26
**Records Migrated**: 16 schedules
**Migration Script**: `astegni-backend/migrate_refactor_schedules_table.py`

---

## What Changed?

### Table Rename
- **OLD**: `tutor_schedules`
- **NEW**: `schedules`

### Field Changes

| Change Type | Old Name | New Name | Type | Description |
|------------|----------|----------|------|-------------|
| **RENAMED** | `tutor_id` | `scheduler_id` | INTEGER | References users.id |
| **ADDED** | - | `scheduler_role` | VARCHAR(50) | 'tutor', 'student', 'parent', etc. |
| **REMOVED** | `subject` | - | - | No longer needed |
| **REMOVED** | `grade_level` | - | - | No longer needed |
| **ADDED** | - | `priority_level` | VARCHAR(20) | 'low', 'medium', 'high', 'urgent' |

---

## Updated API Endpoints

### New Universal Endpoints (Use These!)

```bash
# Create schedule (auto-detects scheduler_role from user's active_role)
POST /api/schedules

# Get all schedules for current user
GET /api/schedules

# Get schedules filtered by role
GET /api/schedules?role_filter=tutor

# Get specific schedule
GET /api/schedules/{id}

# Update schedule
PUT /api/schedules/{id}

# Delete schedule
DELETE /api/schedules/{id}

# Toggle notification
PATCH /api/schedules/{id}/toggle-notification

# Toggle alarm
PATCH /api/schedules/{id}/toggle-alarm
```

### Old Endpoints (Deprecated)

```bash
# ⚠️ These still work but will be removed in future versions
POST   /api/tutor/schedules
GET    /api/tutor/schedules
GET    /api/tutor/schedules/{id}
PUT    /api/tutor/schedules/{id}
DELETE /api/tutor/schedules/{id}
```

---

## Request/Response Examples

### Create Schedule Request (NEW)

```json
{
  "title": "Weekly Math Review",
  "description": "Advanced mathematics review sessions",
  "year": 2025,
  "schedule_type": "recurring",
  "months": ["January", "February", "March"],
  "days": ["Monday", "Wednesday"],
  "start_time": "14:00",
  "end_time": "16:00",
  "priority_level": "high",
  "status": "active",
  "alarm_enabled": true,
  "alarm_before_minutes": 30,
  "notification_browser": true,
  "notification_sound": false
}
```

### Schedule Response (NEW)

```json
{
  "id": 17,
  "scheduler_id": 85,
  "scheduler_role": "tutor",
  "title": "Weekly Math Review",
  "description": "Advanced mathematics review sessions",
  "year": 2025,
  "schedule_type": "recurring",
  "months": ["January", "February", "March"],
  "days": ["Monday", "Wednesday"],
  "specific_dates": null,
  "start_time": "14:00:00",
  "end_time": "16:00:00",
  "notes": null,
  "priority_level": "high",
  "status": "active",
  "alarm_enabled": true,
  "alarm_before_minutes": 30,
  "notification_browser": true,
  "notification_sound": false,
  "created_at": "2025-11-26T02:35:00",
  "updated_at": null
}
```

---

## Priority Levels

| Level | Color Coding | Use Case |
|-------|--------------|----------|
| `low` | Gray/Light | Optional activities, flexible tasks |
| `medium` | Blue | Regular scheduled sessions (default) |
| `high` | Orange | Important commitments, exams |
| `urgent` | Red | Critical/time-sensitive tasks |

---

## Frontend Updates Needed

### 1. Update API Calls

**OLD:**
```javascript
// ❌ Don't use this anymore
fetch('/api/tutor/schedules', {
  method: 'POST',
  body: JSON.stringify({
    subject: 'Math',        // REMOVED
    grade_level: 'Grade 10' // REMOVED
  })
});
```

**NEW:**
```javascript
// ✅ Use this instead
fetch('/api/schedules', {
  method: 'POST',
  body: JSON.stringify({
    priority_level: 'high'  // NEW - replaces subject/grade_level
  })
});
```

### 2. Update Schedule Display

**OLD:**
```javascript
// ❌ Old fields
<div>{schedule.subject} - {schedule.grade_level}</div>
```

**NEW:**
```javascript
// ✅ New fields
<div>
  <span className={`priority-${schedule.priority_level}`}>
    {schedule.priority_level.toUpperCase()}
  </span>
  <span className="role-badge">{schedule.scheduler_role}</span>
</div>
```

### 3. Add CSS for Priority Levels

```css
.priority-low {
  color: #6c757d;
  background: #f8f9fa;
}

.priority-medium {
  color: #0d6efd;
  background: #cfe2ff;
}

.priority-high {
  color: #fd7e14;
  background: #ffe5d0;
}

.priority-urgent {
  color: #dc3545;
  background: #f8d7da;
}

.role-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background: #e9ecef;
}
```

---

## Database Schema

```sql
CREATE TABLE schedules (
    id SERIAL PRIMARY KEY,
    scheduler_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scheduler_role VARCHAR(50) NOT NULL,

    title VARCHAR(255) NOT NULL,
    description TEXT,
    year INTEGER NOT NULL,

    schedule_type VARCHAR(20) DEFAULT 'recurring',
    months TEXT[],
    days TEXT[],
    specific_dates TEXT[],

    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    notes TEXT,

    priority_level VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'active',

    alarm_enabled BOOLEAN DEFAULT FALSE,
    alarm_before_minutes INTEGER,
    notification_browser BOOLEAN DEFAULT FALSE,
    notification_sound BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_schedules_scheduler_id ON schedules(scheduler_id);
CREATE INDEX idx_schedules_scheduler_role ON schedules(scheduler_role);
CREATE INDEX idx_schedules_status ON schedules(status);
CREATE INDEX idx_schedules_created_at ON schedules(created_at);
```

---

## Files Updated

### Backend Files
1. ✅ `app.py modules/models.py` - Updated `Schedule` model and Pydantic schemas
2. ✅ `schedule_endpoints.py` - New universal endpoints (replaces `tutor_schedule_endpoints.py`)
3. ✅ `migrate_refactor_schedules_table.py` - Migration script (already run)
4. ✅ `verify_schedules_table.py` - Verification script

### Frontend Files (TO DO)
- [ ] Update schedule creation forms
- [ ] Update schedule display components
- [ ] Add priority level selector
- [ ] Add role badge display
- [ ] Update API calls to use `/api/schedules`
- [ ] Remove subject/grade_level fields

---

## Testing Checklist

- [x] Migration completed successfully
- [x] 16 records migrated from tutor_schedules to schedules
- [x] Table structure verified
- [x] Indexes created
- [ ] Test new API endpoints
- [ ] Test schedule creation as tutor
- [ ] Test schedule creation as student
- [ ] Test schedule creation as parent
- [ ] Test role filtering
- [ ] Update frontend components
- [ ] Remove old tutor_schedule_endpoints.py

---

## Rollback Plan (If Needed)

If something goes wrong, you can rollback by:

1. Stop the backend server
2. Restore from database backup (if available)
3. Or manually recreate tutor_schedules table:

```sql
-- This won't restore data, only table structure
CREATE TABLE tutor_schedules (
    id SERIAL PRIMARY KEY,
    tutor_id INTEGER NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    grade_level VARCHAR(100) NOT NULL,
    -- ... rest of fields
);
```

---

## Support

For questions or issues:
1. Check migration logs in terminal output
2. Run `python verify_schedules_table.py` to check table structure
3. Check PostgreSQL logs for errors
4. Review `SCHEDULES-TABLE-REFACTOR-SUMMARY.md` for detailed documentation
