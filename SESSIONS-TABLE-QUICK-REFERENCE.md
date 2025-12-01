# Sessions Table - Quick Reference Guide

**New Table Name:** `sessions` (previously `tutor_sessions`)
**Total Fields:** 27

---

## Essential Fields (Must-Have)

```sql
id                        -- Primary key (auto-increment)
course_enrollment_id      -- Links to enrolled_students table
session_date              -- Date (REQUIRED)
start_time                -- Time (REQUIRED)
end_time                  -- Time (REQUIRED)
duration                  -- Integer (minutes)
session_mode              -- 'online', 'in-person', 'hybrid'
status                    -- 'scheduled', 'in-progress', 'completed', 'cancelled'
```

---

## Topic Tracking

```sql
topics                    -- JSON array ['Math', 'Algebra', 'Quadratic Equations']
topics_covered            -- JSON array ['Math', 'Algebra'] (what was actually taught)
```

**Example:**
```json
{
  "topics": ["Introduction to Calculus", "Derivatives", "Limits"],
  "topics_covered": ["Introduction to Calculus", "Derivatives"]
}
```

---

## Attendance Tracking

```sql
tutor_attendance_status   -- 'present', 'absent', 'late'
student_attendance_status -- 'present', 'absent', 'late'
```

**Changed from boolean to status strings for more granularity.**

---

## Integration References

```sql
whiteboard_id             -- Links to whiteboard_sessions table
student_review_id         -- Links to student review
tutor_review_id           -- Links to tutor's review of student
parent_review_id          -- Links to parent review
```

---

## Recurring Sessions

```sql
is_recurring              -- Boolean (true/false)
session_frequency         -- 'one-time', 'weekly', 'bi-weekly', 'monthly'
recurring_pattern         -- JSON: {"days": ["Monday"], "months": [], "specific_dates": []}
```

**Examples:**

**One-time session:**
```json
{
  "is_recurring": false,
  "session_frequency": "one-time",
  "recurring_pattern": null
}
```

**Weekly every Monday and Wednesday:**
```json
{
  "is_recurring": true,
  "session_frequency": "weekly",
  "recurring_pattern": {
    "days": ["Monday", "Wednesday"],
    "months": null,
    "specific_dates": null
  }
}
```

**Monthly on specific dates:**
```json
{
  "is_recurring": true,
  "session_frequency": "monthly",
  "recurring_pattern": {
    "days": null,
    "months": null,
    "specific_dates": ["2025-01-15", "2025-02-15", "2025-03-15"]
  }
}
```

---

## Notifications & Alarms

```sql
notification_enabled      -- Boolean (default: false)
alarm_enabled             -- Boolean (default: false)
alarm_before_minutes      -- Integer (default: 15)
```

---

## Priority & Featured

```sql
priority_level            -- 'low', 'medium', 'high', 'urgent' (default: 'medium')
is_featured               -- Boolean (default: false)
```

---

## Location

```sql
location                  -- VARCHAR(255) - Physical address if in-person or hybrid
```

---

## Common Queries

### Get all sessions for a tutor
```sql
SELECT s.*
FROM sessions s
JOIN enrolled_students e ON s.course_enrollment_id = e.id
WHERE e.tutor_id = 123
ORDER BY s.session_date DESC;
```

### Get all sessions for a student
```sql
SELECT s.*
FROM sessions s
JOIN enrolled_students e ON s.course_enrollment_id = e.id
WHERE e.student_id = 456
ORDER BY s.session_date DESC;
```

### Get upcoming sessions
```sql
SELECT * FROM sessions
WHERE status = 'scheduled'
AND session_date >= CURRENT_DATE
ORDER BY session_date ASC, start_time ASC;
```

### Get recurring sessions
```sql
SELECT * FROM sessions
WHERE is_recurring = true
AND session_frequency = 'weekly'
ORDER BY session_date DESC;
```

### Get featured sessions
```sql
SELECT * FROM sessions
WHERE is_featured = true
AND status IN ('scheduled', 'in-progress')
ORDER BY priority_level DESC, session_date ASC;
```

### Get sessions by priority
```sql
SELECT * FROM sessions
WHERE priority_level = 'urgent'
AND status = 'scheduled'
ORDER BY session_date ASC;
```

### Get sessions with whiteboard
```sql
SELECT s.*, ws.session_name as whiteboard_name
FROM sessions s
JOIN whiteboard_sessions ws ON s.whiteboard_id = ws.id
WHERE s.whiteboard_id IS NOT NULL;
```

### Get sessions with reviews
```sql
SELECT s.*,
  sr.rating as student_rating,
  tr.rating as tutor_rating
FROM sessions s
LEFT JOIN student_reviews sr ON s.student_review_id = sr.id
LEFT JOIN tutor_reviews tr ON s.tutor_review_id = tr.id
WHERE s.student_review_id IS NOT NULL OR s.tutor_review_id IS NOT NULL;
```

---

## Field Migration Map

| Old Field | New Field | Notes |
|-----------|-----------|-------|
| `tutor_id` | `course_enrollment_id` | Join with enrolled_students to get tutor |
| `student_id` | `course_enrollment_id` | Join with enrolled_students to get student |
| `subject` | `topics[0]` | First item in topics array |
| `topic` | `topics[1]` | Second item in topics array |
| `mode` | `session_mode` | Renamed for clarity |
| `student_attended` | `student_attendance_status` | Boolean → varchar ('present'/'absent') |
| `tutor_attended` | `tutor_attendance_status` | Boolean → varchar ('present'/'absent') |
| `student_feedback` | `student_review_id` | Reference to review table |
| `student_rating` | `student_review_id` | Reference to review table |

---

## Default Values

```sql
topics                    = '[]'::json
topics_covered            = '[]'::json
session_mode              = 'online'
tutor_attendance_status   = 'present'
student_attendance_status = 'present'
priority_level            = 'medium'
is_recurring              = false
session_frequency         = 'one-time'
notification_enabled      = false
alarm_enabled             = false
alarm_before_minutes      = 15
is_featured               = false
status                    = 'scheduled'
```

---

## Indexes (For Fast Queries)

```
idx_sessions_enrollment   -- ON course_enrollment_id
idx_sessions_date         -- ON session_date
idx_sessions_status       -- ON status
idx_sessions_featured     -- ON is_featured
idx_sessions_recurring    -- ON is_recurring
```

---

## Example INSERT

```sql
INSERT INTO sessions (
  course_enrollment_id,
  topics,
  session_date,
  start_time,
  end_time,
  duration,
  session_mode,
  priority_level,
  is_recurring,
  session_frequency,
  recurring_pattern,
  status
) VALUES (
  123,
  '["Mathematics", "Algebra", "Quadratic Equations"]'::json,
  '2025-12-01',
  '14:00:00',
  '15:30:00',
  90,
  'online',
  'high',
  true,
  'weekly',
  '{"days": ["Monday", "Wednesday"], "months": null, "specific_dates": null}'::json,
  'scheduled'
);
```

---

## Example UPDATE

```sql
-- Update attendance after session
UPDATE sessions
SET student_attendance_status = 'present',
    tutor_attendance_status = 'present',
    topics_covered = '["Mathematics", "Algebra"]'::json,
    status = 'completed',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 456;
```

---

## Status Values

- `scheduled` - Session is planned but not yet started
- `in-progress` - Session is currently happening
- `completed` - Session finished successfully
- `cancelled` - Session was cancelled
- `missed` - Session was missed (no-show)

---

## Session Mode Values

- `online` - Virtual session (Zoom, Teams, Whiteboard)
- `in-person` - Physical face-to-face session
- `hybrid` - Combination of online and in-person

---

## Priority Level Values

- `low` - Regular, non-urgent session
- `medium` - Standard priority (default)
- `high` - Important session (e.g., before exam)
- `urgent` - Immediate attention needed

---

## Quick Tips

1. **Always join with `enrolled_students`** to get tutor/student info
2. **Use JSON arrays for topics** - not comma-separated strings
3. **Set `is_recurring = true`** when using recurring patterns
4. **Update `topics_covered`** after session completion
5. **Link to `whiteboard_id`** if using Digital Whiteboard
6. **Link to review IDs** after students/tutors submit reviews
7. **Use `priority_level`** to help tutors prioritize their schedule
8. **Always set `updated_at`** when making changes

---

## Common Mistakes to Avoid

❌ Don't store tutor_id/student_id directly - use course_enrollment_id
❌ Don't store subject as string - use topics array
❌ Don't use boolean for attendance - use status strings
❌ Don't forget to update topics_covered after session
❌ Don't create recurring sessions without recurring_pattern

✅ Do use course_enrollment_id for relationships
✅ Do use JSON arrays for topics
✅ Do use varchar status for attendance
✅ Do update topics_covered after teaching
✅ Do provide complete recurring_pattern when is_recurring = true
