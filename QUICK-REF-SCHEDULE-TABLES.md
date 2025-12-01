# Quick Reference: Schedule Tables

## Table Overview

| Table | Purpose | Row Count | Status |
|-------|---------|-----------|--------|
| `tutor_schedules` | Complex recurring schedule templates | 0 | ✅ Empty, ready |
| `tutor_teaching_schedules` | Actual session bookings with students | 0 | ✅ Empty, ready |

---

## 1. `tutor_schedules` (Schedule Templates)

**Use Case**: Create recurring teaching schedules

**Example**: "I teach Math every Monday and Wednesday in January, February, March from 2 PM to 4 PM"

### Key Fields
- `title` - Schedule name (e.g., "Grade 10 Math Class")
- `months[]` - Array: `['January', 'February', 'March']`
- `days[]` - Array: `['Monday', 'Wednesday']`
- `specific_dates[]` - Array: `['2025-01-15', '2025-02-20']` (for non-recurring)
- `schedule_type` - `'recurring'` or `'specific'`
- `start_time`, `end_time` - Daily time range

### When to Use
- Setting up your regular teaching schedule
- Defining availability patterns
- Creating course schedules

---

## 2. `tutor_teaching_schedules` (Session Bookings)

**Use Case**: Actual booked sessions with specific students

**Example**: "Student John Doe has a Math session on January 15, 2025 at 2 PM"

### Key Fields
- `schedule_date` - Specific date: `2025-01-15`
- `student_id` - Which student booked
- `student_name` - Student's name
- `meeting_link` - Online meeting URL
- `location` - Physical address (for in-person)
- `status` - `'scheduled'`, `'in_progress'`, `'completed'`, `'cancelled'`

### When to Use
- When a student books a session
- Tracking actual teaching appointments
- Managing session history

---

## How They Work Together

1. **Tutor creates availability** → Adds entries to `tutor_schedules`
   - "I'm available Mon/Wed/Fri in January-March, 2-4 PM"

2. **Student books a session** → Creates entry in `tutor_teaching_schedules`
   - "John books Monday, Jan 15, 2025, 2-4 PM"

3. **Session happens** → Status updates in `tutor_teaching_schedules`
   - Status: `scheduled` → `in_progress` → `completed`

---

## API Endpoints (Expected)

### `tutor_schedules`
- `POST /api/tutor/schedules` - Create recurring schedule
- `GET /api/tutor/schedules` - Get tutor's schedules
- `PUT /api/tutor/schedules/{id}` - Update schedule
- `DELETE /api/tutor/schedules/{id}` - Delete schedule

### `tutor_teaching_schedules`
- `POST /api/tutor/teaching-schedules` - Book a session
- `GET /api/tutor/teaching-schedules` - Get tutor's sessions
- `GET /api/student/teaching-schedules` - Get student's sessions
- `PUT /api/tutor/teaching-schedules/{id}` - Update session
- `DELETE /api/tutor/teaching-schedules/{id}` - Cancel session

---

## Data Recovery

**Both tables are currently empty** because:
- 13 rows (complex schedules) were lost from original `tutor_teaching_schedules`
- 603 rows (session bookings) were deleted from original `tutor_schedules`

**To restore**, you need:
1. Database backup, OR
2. Recreate the data manually through the application, OR
3. Create seed scripts if you have the original data

---

## Migration Summary

✅ **Final state achieved on November 2, 2025**

| Original Table | → | Final Table | Data |
|----------------|---|-------------|------|
| `tutor_teaching_schedules` (13 rows) | → | `tutor_schedules` | Lost |
| `tutor_schedules` (603 rows) | → | `tutor_teaching_schedules` | Deleted |

See [SCHEDULE-TABLES-FINAL-CORRECTION.md](./SCHEDULE-TABLES-FINAL-CORRECTION.md) for full details.
