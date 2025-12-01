# Session Tables Guide

## Quick Reference: Which Table to Use?

### For Student-Tutor Enrollments
**Table**: `tutor_students`
- Tracks which students are enrolled with which tutors
- Manages the relationship between tutors and students
- Use this for enrollment management

### For General Tutoring Sessions
**Table**: `tutor_sessions`
- General tutoring sessions (online, in-person, hybrid)
- Has 25 rows of active data
- Managed by `tutor_sessions_endpoints.py`
- Includes scheduling, notifications, recurring patterns

**Key Fields**:
- `tutor_id`, `student_id`
- `subject`, `topic`, `session_date`, `start_time`, `end_time`
- `mode` (online/in-person/hybrid)
- `status`, `session_frequency`, `is_recurring`
- `notification_enabled`, `alarm_enabled`

### For Digital Whiteboard Sessions
**Table**: `whiteboard_sessions`
- Sessions using the digital whiteboard
- Part of the IP-protected whiteboard system
- Managed by `whiteboard_endpoints.py`

**Key Fields**:
- `booking_id` (references `tutor_students`)
- `session_name`, `session_date`, `start_time`, `end_time`
- `status` (scheduled/in-progress/completed)
- `whiteboard_data_id` (references canvas data)

**Related Tables**:
- `whiteboard_pages` - Multi-page canvas support
- `whiteboard_canvas_data` - Drawing strokes and content
- `whiteboard_chat_messages` - Session chat

## DO NOT Use

### ❌ `tutoring_sessions` (REMOVED)
- This table was removed due to conflict with `whiteboard_sessions`
- It was empty and unused
- DO NOT recreate this table

### ❌ `tutor_student_enrollments` (REMOVED)
- This table was removed due to conflict with `tutor_students`
- It was empty and unused
- DO NOT recreate this table

## API Endpoints

### Tutor Sessions API
**File**: `astegni-backend/tutor_sessions_endpoints.py`
**Table**: `tutor_sessions`
**Routes**: Mounted on `/` (check the router for specific paths)

### Whiteboard API
**File**: `astegni-backend/whiteboard_endpoints.py`
**Tables**: `whiteboard_sessions`, `whiteboard_pages`, `whiteboard_canvas_data`, `whiteboard_chat_messages`
**Routes**: Mounted on `/api/whiteboard`

## Migration History
- **2025-11-21**: Removed `tutoring_sessions` and `tutor_student_enrollments` tables
- **Migration Script**: `migrate_drop_conflicting_tables.py`
- **Documentation**: See `CONFLICTING-TABLES-REMOVED.md`

## Example Usage

### Creating a General Tutoring Session
```python
# Use tutor_sessions table
INSERT INTO tutor_sessions (
    tutor_id, student_id, subject, session_date,
    start_time, mode, status
) VALUES (
    123, 456, 'Mathematics', '2025-01-15',
    '14:00:00', 'online', 'scheduled'
)
```

### Creating a Whiteboard Session
```python
# First ensure enrollment exists in tutor_students
# Then create whiteboard session
INSERT INTO whiteboard_sessions (
    booking_id, session_name, session_date,
    start_time, status
) VALUES (
    789, 'Algebra Lesson', '2025-01-15',
    '14:00:00', 'scheduled'
)
```

## Summary
- **Enrollments** → `tutor_students`
- **General Sessions** → `tutor_sessions`
- **Whiteboard Sessions** → `whiteboard_sessions`
- **AVOID** → `tutoring_sessions` and `tutor_student_enrollments` (removed)
