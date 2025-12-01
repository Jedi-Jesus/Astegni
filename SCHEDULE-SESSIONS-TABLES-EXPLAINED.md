# Schedule Panel Data Architecture - Complete Guide

## Overview

The schedule panel in `tutor-profile.html` reads from **TWO DISTINCT tables** that serve different purposes:

### 1. `tutor_teaching_schedules` - Tutor Availability
**Purpose:** Defines WHEN the tutor is AVAILABLE to teach (recurring patterns, time slots)

**Use Case:** "I teach Math every Monday, Wednesday, Friday from 2-4 PM"

**Table Structure:**
```sql
CREATE TABLE tutor_teaching_schedules (
    id SERIAL PRIMARY KEY,
    tutor_id INTEGER REFERENCES users(id),
    title VARCHAR(255),              -- "Grade 10 Mathematics Sessions"
    description TEXT,
    subject VARCHAR(100),             -- "Mathematics"
    subject_type VARCHAR(100),        -- "Academic"
    grade_level VARCHAR(50),          -- "Grade 10"
    year INTEGER,                     -- 2025
    schedule_type VARCHAR(20),        -- 'recurring' or 'specific'
    months TEXT[],                    -- ['January', 'February', ...]
    days TEXT[],                      -- ['Monday', 'Wednesday', 'Friday']
    specific_dates TEXT[],            -- ['2025-01-15', '2025-01-20'] for specific dates
    start_time TIME,                  -- '14:00:00'
    end_time TIME,                    -- '16:00:00'
    notes TEXT,
    status VARCHAR(20),               -- 'active' or 'draft'
    alarm_enabled BOOLEAN,
    alarm_before_minutes INTEGER,
    notification_browser BOOLEAN,
    notification_sound BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### 2. `tutoring_sessions` - Actual Tutoring Sessions
**Purpose:** Records ACTUAL tutoring sessions that happened or will happen with SPECIFIC STUDENTS

**Use Case:** "I taught John Smith on Jan 15, 2025 from 2-4 PM - he attended, I got paid 500 ETB"

**Table Structure:**
```sql
CREATE TABLE tutoring_sessions (
    id SERIAL PRIMARY KEY,
    enrollment_id INTEGER,            -- Link to enrollment if part of a package
    tutor_id INTEGER REFERENCES users(id),
    student_id INTEGER REFERENCES users(id),
    subject VARCHAR(100),             -- "Mathematics"
    topic VARCHAR(255),               -- "Quadratic Equations"
    session_date DATE,                -- '2025-01-15'
    start_time TIME,                  -- '14:00:00'
    end_time TIME,                    -- '16:00:00'
    duration INTEGER,                 -- 120 minutes
    mode VARCHAR(50),                 -- 'online', 'in-person', 'hybrid'
    location VARCHAR(255),            -- "Tutor's Office" or NULL for online
    meeting_link VARCHAR(500),        -- Zoom/Google Meet link
    objectives TEXT,                  -- "Master solving quadratic equations"
    topics_covered JSON,              -- ["Factoring", "Quadratic formula", "Graphing"]
    materials_used JSON,              -- ["Textbook Ch. 5", "Practice worksheets"]
    homework_assigned TEXT,
    status VARCHAR(50),               -- 'scheduled', 'in-progress', 'completed', 'cancelled'
    student_attended BOOLEAN,
    tutor_attended BOOLEAN,
    tutor_notes TEXT,
    student_feedback TEXT,
    student_rating FLOAT,             -- 1.0 to 5.0
    amount FLOAT,                     -- 500 ETB
    payment_status VARCHAR(50),       -- 'pending', 'paid', 'refunded'

    -- NEW SCHEDULING FIELDS (Added via migration)
    session_frequency VARCHAR(50),    -- 'one-time', 'weekly', 'bi-weekly', 'monthly'
    is_recurring BOOLEAN,             -- TRUE if part of recurring schedule
    recurring_pattern JSON,           -- {days: ['Monday', 'Wednesday'], months: ['January']}
    package_duration INTEGER,         -- 8 weeks if part of a package
    grade_level VARCHAR(50),          -- "Grade 10"

    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

---

## Key Differences

| Aspect | `tutor_teaching_schedules` | `tutoring_sessions` |
|--------|---------------------------|---------------------|
| **Purpose** | Tutor's **availability** | **Actual** sessions with students |
| **Student Link** | ❌ No student (just availability) | ✅ Linked to specific `student_id` |
| **Enrollment Link** | ❌ No enrollment | ✅ Optional `enrollment_id` |
| **Attendance** | ❌ N/A | ✅ `student_attended`, `tutor_attended` |
| **Payment** | ❌ N/A | ✅ `amount`, `payment_status` |
| **Rating** | ❌ N/A | ✅ `student_rating` |
| **Topics** | ❌ General subject only | ✅ Specific `topic`, `topics_covered` |
| **Status** | `active` / `draft` | `scheduled` / `in-progress` / `completed` / `cancelled` |

---

## Current Implementation

### Schedule Panel (Currently)
The schedule panel in `tutor-profile.html` **currently reads from `tutor_teaching_schedules`** only.

**Frontend Code:** `js/tutor-profile/global-functions.js` - `loadSchedules()` function

```javascript
// Line 4461 in global-functions.js
const response = await fetch('http://localhost:8000/api/tutor/schedules', {
    headers: {
        'Authorization': `Bearer ${token}`
    }
});
```

**Backend Endpoint:** `astegni-backend/tutor_schedule_endpoints.py`

```python
@router.get("/api/tutor/schedules", response_model=List[ScheduleResponse])
async def get_tutor_schedules(current_user = Depends(get_current_user)):
    # Fetches from tutor_teaching_schedules table
    cur.execute("""
        SELECT id, tutor_id, title, description, subject, subject_type, grade_level, year,
               schedule_type, months, days, specific_dates, start_time, end_time,
               notes, status, alarm_enabled, alarm_before_minutes,
               notification_browser, notification_sound, created_at, updated_at
        FROM tutor_teaching_schedules
        WHERE tutor_id = %s
        ORDER BY created_at DESC
    """, (current_user['id'],))
```

---

## New Sessions Endpoint (Available Now!)

We've created a **NEW endpoint** to fetch actual tutoring sessions from `tutoring_sessions` table.

**Backend Endpoint:** `astegni-backend/tutor_sessions_endpoints.py`

### Available Endpoints:

#### 1. Get All Sessions
```http
GET /api/tutor/sessions
Authorization: Bearer <token>
```

**Query Parameters:**
- `status_filter` - Filter by status (`scheduled`, `in-progress`, `completed`, `cancelled`)
- `date_from` - Filter from date (YYYY-MM-DD)
- `date_to` - Filter to date (YYYY-MM-DD)

**Example:**
```bash
# Get all completed sessions
curl -H "Authorization: Bearer <token>" \
  "http://localhost:8000/api/tutor/sessions?status_filter=completed"

# Get sessions in January 2025
curl -H "Authorization: Bearer <token>" \
  "http://localhost:8000/api/tutor/sessions?date_from=2025-01-01&date_to=2025-01-31"
```

#### 2. Get Single Session
```http
GET /api/tutor/sessions/{session_id}
Authorization: Bearer <token>
```

#### 3. Get Session Statistics
```http
GET /api/tutor/sessions/stats/summary
Authorization: Bearer <token>
```

**Returns:**
```json
{
  "total_sessions": 45,
  "completed_sessions": 38,
  "scheduled_sessions": 5,
  "cancelled_sessions": 2,
  "total_hours": 90.5,
  "total_earnings": 45000.0,
  "average_rating": 4.7
}
```

---

## How They Work Together

### Workflow Example:

1. **Tutor Creates Schedule** (`tutor_teaching_schedules`)
   ```
   "I teach Grade 10 Math every Monday & Wednesday, 2-4 PM"
   ```

2. **Student Books Session** (Creates entry in `tutoring_sessions`)
   ```
   John Smith books Monday Jan 15, 2025, 2-4 PM
   Links to: student_id=28, tutor_id=85, session_date='2025-01-15'
   ```

3. **Session Happens**
   ```
   Status changes: scheduled → in-progress → completed
   Tutor updates: tutor_notes, topics_covered
   ```

4. **Student Rates**
   ```
   student_rating = 5.0
   student_feedback = "Great session! I finally understand quadratic equations!"
   ```

5. **Payment Processed**
   ```
   payment_status: pending → paid
   amount: 500 ETB
   ```

---

## Migration Summary

### What Was Added to `tutoring_sessions`:

The migration `run_session_migration.py` added 5 new columns:

1. **`session_frequency`** (VARCHAR(50))
   - Values: `'one-time'`, `'weekly'`, `'bi-weekly'`, `'monthly'`
   - Indicates if this is a one-time session or recurring

2. **`is_recurring`** (BOOLEAN)
   - `TRUE` if part of a recurring schedule
   - `FALSE` for one-time sessions

3. **`recurring_pattern`** (JSON)
   - Stores pattern: `{days: ['Monday', 'Wednesday'], months: ['January'], specific_dates: []}`
   - Matches format from `tutor_teaching_schedules`

4. **`package_duration`** (INTEGER)
   - Duration in weeks/months if part of an enrollment package
   - Example: 8 weeks, 3 months

5. **`grade_level`** (VARCHAR(50))
   - Grade level of the student for this session
   - Example: "Grade 10", "University Level"

---

## Usage in Schedule Panel

### Option 1: Keep Current Behavior (Schedules Only)
No changes needed - panel continues to show tutor's availability from `tutor_teaching_schedules`.

### Option 2: Show Both (Recommended)
Update the schedule panel to have **TWO TABS**:

**Tab 1: My Teaching Schedule** (from `tutor_teaching_schedules`)
- Shows when tutor is available
- Recurring patterns, time slots
- Create/Edit/Delete schedules

**Tab 2: My Sessions** (from `tutoring_sessions`)
- Shows actual booked sessions with students
- Filter by status, date range
- View session details, student feedback, ratings
- Track earnings

### Frontend Implementation Example:

```javascript
// Load teaching schedules (availability)
async function loadTeachingSchedules() {
    const response = await fetch('http://localhost:8000/api/tutor/schedules', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const schedules = await response.json();
    // Display in "My Teaching Schedule" tab
}

// Load tutoring sessions (actual sessions)
async function loadTutoringSessions() {
    const response = await fetch('http://localhost:8000/api/tutor/sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const sessions = await response.json();
    // Display in "My Sessions" tab
}

// Load session stats
async function loadSessionStats() {
    const response = await fetch('http://localhost:8000/api/tutor/sessions/stats/summary', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const stats = await response.json();
    // Display earnings, ratings, total hours
}
```

---

## Database Relationships

```
users (tutors)
    ↓
    ├─→ tutor_teaching_schedules (When tutor is AVAILABLE)
    │       - Recurring patterns
    │       - Time slots
    │       - No students
    │
    └─→ tutoring_sessions (ACTUAL sessions with students)
            ↓
            ├─→ students (via student_id)
            └─→ enrollments (via enrollment_id - if part of package)
```

---

## Testing

### 1. Test Migration
```bash
cd astegni-backend
python run_session_migration.py
```

**Expected Output:**
```
Step 1: Adding session_frequency column...
  Done
Step 2: Adding is_recurring column...
  Done
...
SUCCESS: All columns added to tutoring_sessions table
```

### 2. Test Backend Endpoints
```bash
# Start backend
cd astegni-backend
python app.py

# In another terminal:
# Get all sessions (replace <token> with real JWT)
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/tutor/sessions

# Get session stats
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/tutor/sessions/stats/summary
```

### 3. Test in Browser
Open: http://localhost:8000/docs

Try endpoints:
- `GET /api/tutor/sessions`
- `GET /api/tutor/sessions/stats/summary`

---

## Files Modified/Created

### Created:
1. `astegni-backend/run_session_migration.py` - Migration script
2. `astegni-backend/add_session_fields.sql` - SQL migration (alternative)
3. `astegni-backend/tutor_sessions_endpoints.py` - New API endpoints
4. `SCHEDULE-SESSIONS-TABLES-EXPLAINED.md` - This documentation

### Modified:
1. `astegni-backend/app.py` - Added `tutor_sessions_router` import

### Database:
1. `tutoring_sessions` table - Added 5 new columns

---

## Next Steps

### Recommended Frontend Updates:

1. **Add Sessions Tab to Schedule Panel**
   - Create new tab in schedule panel
   - Load sessions from `/api/tutor/sessions`
   - Display student name, subject, date, status, payment, rating

2. **Session Details Modal**
   - Click on session to view full details
   - Show topics covered, materials used, student feedback
   - Display student rating and earnings

3. **Session Statistics Widget**
   - Show total earnings, hours taught, average rating
   - Add to profile header or schedule panel

4. **Session Filtering**
   - Filter by status (scheduled, completed, cancelled)
   - Filter by date range
   - Filter by student, subject, or payment status

---

## Summary

**Currently:**
- Schedule panel reads from `tutor_teaching_schedules` (tutor availability)
- No link to actual sessions with students

**After Migration:**
- `tutoring_sessions` table has scheduling fields
- New `/api/tutor/sessions` endpoints available
- Can now track actual sessions, earnings, ratings, attendance

**Frontend Decision:**
- Keep current behavior (schedules only) ✅ Works as-is
- Add sessions tab (recommended) ⭐ Better user experience
- Replace schedules with sessions ❌ Loses availability tracking

**Recommendation:** Add a **second tab** to show actual sessions alongside the teaching schedule.

---

## Quick Reference

| What You Want | Table | Endpoint |
|--------------|-------|----------|
| When am I available? | `tutor_teaching_schedules` | `GET /api/tutor/schedules` |
| What sessions did I teach? | `tutoring_sessions` | `GET /api/tutor/sessions` |
| How much did I earn? | `tutoring_sessions` | `GET /api/tutor/sessions/stats/summary` |
| What's my average rating? | `tutoring_sessions` | `GET /api/tutor/sessions/stats/summary` |

---

**Migration Date:** 2025-01-16
**Status:** ✅ Complete and Ready to Use
