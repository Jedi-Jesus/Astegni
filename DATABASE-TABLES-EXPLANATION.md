# Database Tables Explanation

## Session-Related Tables in Astegni Database

You asked about 4 different tables. Here's what each one does:

---

## 1️⃣ `session_requests` (The Simple One)

**Purpose:** Track tutoring session requests from students/parents to tutors

**Status:** ✅ **Active** (6 rows) - This is what you've been looking at!

**Schema:**
```sql
CREATE TABLE session_requests (
    id SERIAL PRIMARY KEY,
    tutor_id INTEGER,              -- tutor_profiles.id
    requester_id INTEGER,          -- student_profiles.id OR parent_profiles.id
    requester_type VARCHAR(20),    -- 'student' OR 'parent'
    package_name VARCHAR(255),
    status VARCHAR(20),            -- 'pending', 'accepted', 'rejected'
    student_name VARCHAR(255),
    student_grade VARCHAR(50),
    message TEXT,
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    created_at TIMESTAMP,
    responded_at TIMESTAMP
);
```

**Workflow:**
```
Student/Parent → Request Session → status = 'pending'
Tutor → Accepts → status = 'accepted' (shows in "My Students")
Tutor → Rejects → status = 'rejected' (archived)
```

**Used By:**
- Frontend: [js/tutor-profile/session-request-manager.js](js/tutor-profile/session-request-manager.js)
- Backend: [session_request_endpoints.py](astegni-backend/session_request_endpoints.py)
- Panels: "Requested Sessions" (pending), "My Students" (accepted)

---

## 2️⃣ `tutor_student_bookings` (The Whiteboard Connection)

**Purpose:** Long-term student enrollment with a tutor (for whiteboard sessions)

**Status:** ✅ **Active** (3 rows) - Used by Digital Whiteboard system

**Schema:**
```sql
CREATE TABLE tutor_student_bookings (
    id SERIAL PRIMARY KEY,
    tutor_id INTEGER,              -- users.id (⚠️ needs FK fix to tutor_profiles.id)
    student_id INTEGER,            -- users.id (⚠️ needs FK fix to student_profiles.id)
    subject VARCHAR(200),          -- "Mathematics", "Physics"
    grade_level VARCHAR(100),      -- "Grade 9", "Grade 10"
    session_type VARCHAR(50),      -- 'online', 'in-person', 'hybrid'
    sessions_per_week INTEGER,     -- e.g., 3
    session_duration INTEGER,      -- minutes (e.g., 60)
    start_date DATE,
    end_date DATE,
    status VARCHAR(50),            -- 'active', 'paused', 'completed', 'cancelled'
    price_per_session DECIMAL(10,2),
    currency VARCHAR(10),          -- 'ETB'
    notes TEXT,
    created_at TIMESTAMP
);
```

**Relationship:**
```
tutor_student_bookings (1)
       ↓ has many
whiteboard_sessions (N)
       ↓ has many
whiteboard_pages (N)
       ↓ has many
whiteboard_canvas_data (N)
```

**Workflow:**
```
1. Student enrolls with tutor for subject (e.g., "Math, Grade 9")
   → Creates booking in tutor_student_bookings

2. Tutor creates individual whiteboard sessions for this booking
   → Creates records in whiteboard_sessions (linked via booking_id)

3. During session, tutor and student use digital whiteboard
   → Canvas data stored in whiteboard_canvas_data
```

**Used By:**
- Frontend: [js/tutor-profile/whiteboard-manager.js](js/tutor-profile/whiteboard-manager.js)
- Backend: [whiteboard_endpoints.py](astegni-backend/whiteboard_endpoints.py)
- Feature: Digital Whiteboard (test-whiteboard.html)

**Example Data:**
```
Booking #1:
- Tutor: Kush (user_id 115)
- Student: Jediael (user_id 112)
- Subject: Mathematics
- Grade: Grade 9
- Status: active
- Sessions/week: 3
- Duration: 60 minutes

Has 3 whiteboard_sessions:
  - Session #1: Completed (Aug 15, 2024)
  - Session #2: In Progress (Today)
  - Session #3: Scheduled (Tomorrow)
```

---

## 3️⃣ `tutor_schedules` (The Calendar)

**Purpose:** Tutor's teaching calendar/schedule (like Google Calendar)

**Status:** ✅ **Active** (603 rows)

**Schema:**
```sql
CREATE TABLE tutor_schedules (
    id SERIAL PRIMARY KEY,
    tutor_id INTEGER,              -- tutor_profiles.id (⚠️ some migrations use users.id)
    schedule_date DATE,            -- When
    start_time TIME,               -- e.g., '14:00'
    end_time TIME,                 -- e.g., '15:00'
    subject VARCHAR(100),          -- What
    grade_level VARCHAR(50),       -- For whom
    session_format VARCHAR(50),    -- 'online', 'in-person', 'hybrid'
    student_id INTEGER,            -- IF booked by a student
    student_name VARCHAR(255),
    meeting_link VARCHAR(500),     -- Zoom/Meet link
    location VARCHAR(255),         -- Physical location
    status VARCHAR(50),            -- 'scheduled', 'completed', 'cancelled', 'in_progress'
    is_recurring BOOLEAN,
    recurrence_pattern VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP
);
```

**Two Types of Schedules:**

### A. Available Time Slots (Empty Schedule)
```sql
tutor_id: 85
schedule_date: 2025-01-30
start_time: '14:00'
end_time: '15:00'
student_id: NULL               -- ✅ Available slot
status: 'scheduled'
```

### B. Booked Sessions (With Student)
```sql
tutor_id: 85
schedule_date: 2025-01-30
start_time: '14:00'
end_time: '15:00'
student_id: 27                 -- ✅ Booked by student
student_name: 'John Doe'
status: 'scheduled'
```

**Used By:**
- Frontend: [js/tutor-profile/schedule-manager.js](js/tutor-profile/schedule-manager.js)
- Backend: [tutor_schedule_endpoints.py](astegni-backend/tutor_schedule_endpoints.py)
- Panel: "Schedule" in tutor profile

**Features:**
- Create recurring schedules (every Monday, Wednesday, Friday)
- Create specific date schedules
- Set alarms/notifications
- Track session status (scheduled → in_progress → completed)

---

## 4️⃣ `tutor_student_enrollments` (The Alternative/Unused)

**Purpose:** Alternative enrollment tracking (similar to tutor_student_bookings)

**Status:** ⚠️ **UNUSED** (0 rows) - Empty table, likely legacy/experimental

**Schema:**
```sql
CREATE TABLE tutor_student_enrollments (
    id SERIAL PRIMARY KEY,
    tutor_id INTEGER,              -- tutor_profiles.id
    student_id INTEGER,            -- student_profiles.id
    subjects JSON,                 -- ["Math", "Physics"]
    start_date DATE,
    end_date DATE,
    session_frequency VARCHAR,     -- "3 times per week"
    session_duration INTEGER,      -- 60 minutes
    total_sessions_planned INTEGER,
    sessions_completed INTEGER,
    hourly_rate FLOAT,
    payment_status VARCHAR,        -- 'pending', 'paid', 'overdue'
    total_paid FLOAT,
    status VARCHAR,                -- 'active', 'paused', 'completed'
    is_active BOOLEAN,
    created_at TIMESTAMP
);
```

**Why Not Used?**
- Duplicate functionality with `tutor_student_bookings`
- Likely created during development but never integrated
- `tutor_student_bookings` was chosen for the whiteboard system instead

---

## 5️⃣ `whiteboard_session_recordings` (The Video Archive)

**Purpose:** Store whiteboard session recordings

**Status:** ✅ **Active** (6 rows) - Phase 2 feature (not fully implemented yet)

**Schema:**
```sql
CREATE TABLE whiteboard_session_recordings (
    id SERIAL PRIMARY KEY,
    session_id INTEGER,            -- whiteboard_sessions.id
    recording_title VARCHAR(255),
    recording_type VARCHAR(50),    -- 'video', 'screen', 'board'
    file_url TEXT,                 -- Backblaze B2 URL
    file_size_bytes BIGINT,
    duration_seconds INTEGER,
    thumbnail_url TEXT,
    board_snapshot JSONB,          -- Canvas state at time of recording
    recording_metadata JSONB,      -- Resolution, codec, etc.
    recording_date TIMESTAMP,
    is_processing BOOLEAN,
    is_available BOOLEAN,
    created_at TIMESTAMP
);
```

**Planned Workflow (Phase 2):**
```
1. Whiteboard session starts
2. Tutor clicks "Record" button
3. System records:
   - Video feed (WebRTC)
   - Screen share
   - Whiteboard canvas strokes
4. Recording saved to Backblaze B2
5. Entry created in whiteboard_session_recordings
6. Students can replay session later
```

**Used By:**
- Backend: [whiteboard_endpoints.py](astegni-backend/whiteboard_endpoints.py) (lines 1034-1105)
- Frontend: Not implemented yet (Phase 2)

---

## 📊 Visual Comparison

| Table | Purpose | Status | Rows | Related To |
|-------|---------|--------|------|------------|
| **session_requests** | Session request workflow | ✅ Active | 6 | Tutor profile panels |
| **tutor_student_bookings** | Long-term enrollments | ✅ Active | 3 | Digital whiteboard |
| **tutor_schedules** | Teaching calendar | ✅ Active | 603 | Schedule management |
| **whiteboard_session_recordings** | Video recordings | ⚠️ Phase 2 | 6 | Whiteboard sessions |
| **tutor_student_enrollments** | Alternative enrollment | ❌ Unused | 0 | Nothing (legacy) |

---

## 🔄 How They Work Together

### Scenario: Student wants to learn Math from a Tutor

#### **Step 1: Initial Request** (`session_requests`)
```
Student → Finds tutor → Requests session
Creates: session_requests (status = 'pending')
```

#### **Step 2: Tutor Accepts** (`session_requests`)
```
Tutor → Reviews request → Clicks "Accept"
Updates: session_requests (status = 'accepted')
Shows in: "My Students" panel
```

#### **Step 3: Create Long-term Enrollment** (`tutor_student_bookings`)
```
Tutor → Creates booking for student
Creates: tutor_student_bookings
  - Subject: Mathematics
  - Sessions/week: 3
  - Duration: 60 min
  - Status: active
```

#### **Step 4: Schedule Individual Sessions** (`tutor_schedules`)
```
Tutor → Adds sessions to calendar
Creates: tutor_schedules (multiple)
  - Monday 2PM-3PM: Math with John
  - Wednesday 2PM-3PM: Math with John
  - Friday 2PM-3PM: Math with John
```

#### **Step 5: Conduct Whiteboard Sessions** (`whiteboard_sessions`)
```
Monday arrives → Tutor launches whiteboard
Creates: whiteboard_sessions
  - Links to booking_id from tutor_student_bookings
  - Status: in_progress
  - Canvas data stored in whiteboard_canvas_data
```

#### **Step 6: Record Session (Phase 2)** (`whiteboard_session_recordings`)
```
During session → Tutor clicks "Record"
Creates: whiteboard_session_recordings
  - Links to session_id from whiteboard_sessions
  - Stores video URL in Backblaze B2
  - Available for playback later
```

---

## 🎯 Summary

**In the database:**

1. **`session_requests`** = Simple request/acceptance workflow (like "Add Friend" request)
   - Used by: Requested Sessions & My Students panels
   - Status: Fully functional ✅

2. **`tutor_student_bookings`** = Long-term student enrollment (like "Friend" relationship)
   - Used by: Digital Whiteboard system
   - Status: Fully functional ✅

3. **`tutor_schedules`** = Tutor's teaching calendar (like Google Calendar)
   - Used by: Schedule management panel
   - Status: Fully functional ✅

4. **`whiteboard_session_recordings`** = Video recordings of sessions (like Zoom recordings)
   - Used by: Whiteboard system (Phase 2)
   - Status: Database ready, UI not implemented yet ⚠️

5. **`tutor_student_enrollments`** = Alternative enrollment system (unused)
   - Used by: Nothing
   - Status: Legacy/unused table ❌

**Key Difference:**
- **`session_requests`**: Short-term (one-time request → accept/reject)
- **`tutor_student_bookings`**: Long-term (ongoing tutoring relationship)
- **`tutor_schedules`**: Calendar management (time slots & appointments)
- **`whiteboard_session_recordings`**: Archive (recorded session videos)

Hope this clarifies everything! 🎯
