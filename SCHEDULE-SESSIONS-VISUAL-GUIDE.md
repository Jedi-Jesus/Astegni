# Schedule & Sessions - Visual Architecture Guide

## Database Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          USERS TABLE                            │
│  (Tutors, Students, Parents, Admins, Advertisers)              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ user_id (tutor)
                           │
           ┌───────────────┴────────────────┐
           │                                │
           ▼                                ▼
┌──────────────────────────┐   ┌──────────────────────────────┐
│ TUTOR_TEACHING_SCHEDULES │   │    TUTORING_SESSIONS         │
│ (Availability Patterns)  │   │   (Actual Sessions)          │
├──────────────────────────┤   ├──────────────────────────────┤
│ • tutor_id               │   │ • tutor_id                   │
│ • title                  │   │ • student_id ← Links Student │
│ • schedule_type          │   │ • enrollment_id (optional)   │
│ • months[]               │   │ • session_date               │
│ • days[]                 │   │ • amount                     │
│ • specific_dates[]       │   │ • payment_status             │
│ • start_time             │   │ • student_rating             │
│ • end_time               │   │ • student_attended           │
│ • status (active/draft)  │   │ • tutor_attended             │
│                          │   │ • session_frequency ✨ NEW   │
│ NO STUDENTS              │   │ • is_recurring ✨ NEW        │
│ NO PAYMENT               │   │ • recurring_pattern ✨ NEW   │
│ NO RATINGS               │   │ • package_duration ✨ NEW    │
│                          │   │ • grade_level ✨ NEW         │
└──────────────────────────┘   └──────────────────────────────┘
          │                                 │
          │                                 │
          ▼                                 ▼
   "I teach Math               "I taught John Smith
    Mon/Wed/Fri                 on Jan 15, 2025
    2-4 PM"                     Got paid 500 ETB
                                He gave me 5 stars"
```

---

## Current Schedule Panel Flow

```
┌─────────────────────────────────────────────────────────────┐
│          TUTOR PROFILE PAGE (tutor-profile.html)            │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ User clicks "Schedule" tab
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    SCHEDULE PANEL                           │
│  Location: js/tutor-profile/global-functions.js:4437        │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ loadSchedules() called
                           ▼
┌─────────────────────────────────────────────────────────────┐
│          API CALL: GET /api/tutor/schedules                 │
│          Headers: Authorization: Bearer <token>             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│     BACKEND: tutor_schedule_endpoints.py                    │
│     Query: SELECT * FROM tutor_teaching_schedules           │
│            WHERE tutor_id = <current_user_id>               │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Returns array of schedules
                           ▼
┌─────────────────────────────────────────────────────────────┐
│           DISPLAY IN TABLE                                  │
│  ┌────────┬──────┬──────┬────────┬──────────┬────────┐    │
│  │ Title  │ Date │ Time │ Alarm  │ Notif.   │ Action │    │
│  ├────────┼──────┼──────┼────────┼──────────┼────────┤    │
│  │ Grade  │ Mon  │ 2-4  │   🔔   │    ✓     │  View  │    │
│  │ 10 Math│ Wed  │  PM  │        │          │        │    │
│  └────────┴──────┴──────┴────────┴──────────┴────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## New Sessions Endpoints Flow (Available Now!)

```
┌─────────────────────────────────────────────────────────────┐
│          FRONTEND (Can be added to tutor-profile)           │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ New function: loadTutoringSessions()
                           ▼
┌─────────────────────────────────────────────────────────────┐
│          API CALL: GET /api/tutor/sessions                  │
│          Headers: Authorization: Bearer <token>             │
│          Query Params:                                      │
│            - status_filter=completed                        │
│            - date_from=2025-01-01                          │
│            - date_to=2025-01-31                            │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│     BACKEND: tutor_sessions_endpoints.py ✨ NEW             │
│     Query: SELECT * FROM tutoring_sessions                  │
│            WHERE tutor_id = <current_user_id>               │
│            AND status = 'completed'                         │
│            AND session_date BETWEEN '2025-01-01'            │
│                                 AND '2025-01-31'            │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Returns array of sessions
                           ▼
┌─────────────────────────────────────────────────────────────┐
│         DISPLAY ACTUAL SESSIONS (Example)                   │
│  ┌─────────┬─────────┬──────┬────────┬─────────┬────────┐ │
│  │ Student │ Subject │ Date │ Status │ Payment │ Rating │ │
│  ├─────────┼─────────┼──────┼────────┼─────────┼────────┤ │
│  │ John S. │ Math    │ 1/15 │   ✓    │ 500 ETB │  ⭐⭐⭐⭐⭐│ │
│  │ Sarah K.│ Physics │ 1/18 │   ✓    │ 600 ETB │  ⭐⭐⭐⭐  │ │
│  │ Mike A. │ Math    │ 1/20 │   ✓    │ 500 ETB │  ⭐⭐⭐⭐⭐│ │
│  └─────────┴─────────┴──────┴────────┴─────────┴────────┘ │
│                                                             │
│  📊 Total: 3 sessions | 1,600 ETB earned | 4.7 avg rating │
└─────────────────────────────────────────────────────────────┘
```

---

## Two-Tab Recommended Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                   SCHEDULE PANEL (Enhanced)                    │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────┬──────────────────────┐             │
│  │ 📅 Teaching Schedule │ 📊 My Sessions       │  ← TABS     │
│  └──────────────────────┴──────────────────────┘             │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  TAB 1 CONTENT (Current)                                │ │
│  │                                                          │ │
│  │  Data: tutor_teaching_schedules                         │ │
│  │  Endpoint: GET /api/tutor/schedules                     │ │
│  │                                                          │ │
│  │  Shows:                                                  │ │
│  │  • When I'm available to teach                          │ │
│  │  • Recurring patterns (Mon/Wed/Fri)                     │ │
│  │  • Time slots (2-4 PM)                                  │ │
│  │  • Alarm settings                                       │ │
│  │                                                          │ │
│  │  [Create Schedule] button                               │ │
│  │  Table: Title | Date | Time | Alarm | Action            │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  TAB 2 CONTENT (New - Recommended) ✨                   │ │
│  │                                                          │ │
│  │  Data: tutoring_sessions                                │ │
│  │  Endpoint: GET /api/tutor/sessions                      │ │
│  │                                                          │ │
│  │  Shows:                                                  │ │
│  │  • Actual sessions I taught                             │ │
│  │  • Student names                                        │ │
│  │  • Earnings & payment status                            │ │
│  │  • Student ratings & feedback                           │ │
│  │                                                          │ │
│  │  Filters: [Status ▼] [Date Range] [Search]             │ │
│  │                                                          │ │
│  │  Stats: 📊 45 sessions | 💰 45,000 ETB | ⭐ 4.7/5.0     │ │
│  │                                                          │ │
│  │  Table: Student | Subject | Date | Status | $ | Rating  │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

### Creating Teaching Schedule (Current - Works)
```
Tutor clicks
"Create Schedule"
      │
      ▼
Fill form:
- Subject: Math
- Days: Mon/Wed
- Time: 2-4 PM
      │
      ▼
POST /api/tutor/schedules
      │
      ▼
INSERT INTO
tutor_teaching_schedules
      │
      ▼
Schedule created ✓
Tutor now available
on Mon/Wed 2-4 PM
```

### Booking & Completing Session (Actual Tutoring)
```
Student finds tutor
in Find Tutors page
      │
      ▼
Student books session
for Jan 15, 2-4 PM
      │
      ▼
INSERT INTO
tutoring_sessions
(status: 'scheduled')
      │
      ▼
Session happens
      │
      ▼
UPDATE tutoring_sessions
SET status = 'completed'
    tutor_attended = TRUE
    student_attended = TRUE
    tutor_notes = '...'
      │
      ▼
Student rates tutor
      │
      ▼
UPDATE tutoring_sessions
SET student_rating = 5.0
    student_feedback = '...'
      │
      ▼
Payment processed
      │
      ▼
UPDATE tutoring_sessions
SET payment_status = 'paid'
    amount = 500
      │
      ▼
Session complete! ✓
Tutor earned 500 ETB
Got 5-star rating
```

---

## API Endpoints Comparison

### Teaching Schedules (Availability)
```http
GET    /api/tutor/schedules              # List all schedules
POST   /api/tutor/schedules              # Create new schedule
GET    /api/tutor/schedules/{id}         # Get one schedule
PUT    /api/tutor/schedules/{id}         # Update schedule
DELETE /api/tutor/schedules/{id}         # Delete schedule

Response Example:
{
  "id": 1,
  "tutor_id": 85,
  "title": "Grade 10 Mathematics Sessions",
  "schedule_type": "recurring",
  "days": ["Monday", "Wednesday", "Friday"],
  "start_time": "14:00:00",
  "end_time": "16:00:00",
  "status": "active"
}
```

### Tutoring Sessions (Actual Work) ✨ NEW
```http
GET /api/tutor/sessions                  # List all sessions
    ?status_filter=completed             # Filter by status
    &date_from=2025-01-01               # Date range
    &date_to=2025-01-31

GET /api/tutor/sessions/{id}             # Get one session

GET /api/tutor/sessions/stats/summary    # Get statistics

Response Example (sessions):
{
  "id": 1,
  "tutor_id": 85,
  "student_id": 28,
  "subject": "Mathematics",
  "session_date": "2025-01-15",
  "status": "completed",
  "amount": 500.0,
  "payment_status": "paid",
  "student_rating": 5.0,
  "session_frequency": "weekly",    # ✨ NEW
  "is_recurring": true,              # ✨ NEW
  "recurring_pattern": {...},        # ✨ NEW
  "package_duration": 8,             # ✨ NEW
  "grade_level": "Grade 10"          # ✨ NEW
}

Response Example (stats):
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

## Field Mapping - New Fields

### How Sessions Link to Schedules

| Schedule Field | Session Field | Purpose |
|---------------|---------------|---------|
| `schedule_type` | `session_frequency` | 'recurring' → 'weekly' |
| `days[]` | `recurring_pattern.days[]` | Copy pattern |
| `months[]` | `recurring_pattern.months[]` | Copy pattern |
| `specific_dates[]` | `recurring_pattern.specific_dates[]` | Copy dates |
| `grade_level` | `grade_level` | Direct copy |
| N/A | `enrollment_id` | Link to package enrollment |
| N/A | `is_recurring` | TRUE if from schedule |
| N/A | `package_duration` | Weeks/months of enrollment |

---

## Example Scenarios

### Scenario 1: One-Time Session
```
Teaching Schedule: N/A (student contacted tutor directly)

Tutoring Session:
  session_frequency: "one-time"
  is_recurring: FALSE
  recurring_pattern: NULL
  package_duration: NULL
  amount: 500 ETB
```

### Scenario 2: Weekly Recurring Sessions (Package)
```
Teaching Schedule:
  schedule_type: "recurring"
  days: ["Monday", "Wednesday"]
  months: ["January", "February"]

Tutoring Session (created from booking):
  session_frequency: "weekly"
  is_recurring: TRUE
  recurring_pattern: {
    "days": ["Monday", "Wednesday"],
    "months": ["January", "February"]
  }
  package_duration: 8  (8 weeks)
  enrollment_id: 5
```

### Scenario 3: Specific Dates Session
```
Teaching Schedule:
  schedule_type: "specific"
  specific_dates: ["2025-01-15", "2025-01-20", "2025-01-25"]

Tutoring Session:
  session_frequency: "one-time"
  is_recurring: FALSE
  recurring_pattern: {
    "specific_dates": ["2025-01-15", "2025-01-20", "2025-01-25"]
  }
  package_duration: NULL
```

---

## Summary Diagram

```
┌─────────────────────────────────────────────────────────┐
│             TUTOR PROFILE - SCHEDULE PANEL               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  CURRENT STATE (Still Works):                           │
│  ✓ Shows teaching availability                          │
│  ✓ Reads from tutor_teaching_schedules                 │
│  ✓ No changes needed                                    │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  NEW CAPABILITIES (Available Now):                       │
│  ✓ tutoring_sessions has scheduling fields              │
│  ✓ New endpoints: /api/tutor/sessions                  │
│  ✓ Can fetch actual sessions with students              │
│  ✓ Can track earnings, ratings, attendance              │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  RECOMMENDED ENHANCEMENT (Optional):                     │
│  📋 Add "My Sessions" tab                               │
│  📋 Display actual tutoring sessions                    │
│  📋 Show earnings, ratings, student feedback            │
│  📋 Add session statistics widget                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

**Visual Guide Version:** 1.0
**Created:** January 16, 2025
**Status:** Complete
