# Session Tables Quick Reference

## TL;DR - The 4 Tables You Asked About

```
┌─────────────────────────────────────────────────────────────────┐
│                    SESSION-RELATED TABLES                        │
└─────────────────────────────────────────────────────────────────┘

1. session_requests (6 rows) ✅ ACTIVE
   └─ Purpose: Request → Accept/Reject workflow
   └─ Shows in: "Requested Sessions" & "My Students" panels
   └─ Filter: WHERE status = 'accepted' → My Students

2. tutor_student_bookings (3 rows) ✅ ACTIVE
   └─ Purpose: Long-term enrollment for whiteboard sessions
   └─ Shows in: Digital Whiteboard feature
   └─ Links to: whiteboard_sessions

3. tutor_schedules (603 rows) ✅ ACTIVE
   └─ Purpose: Tutor's teaching calendar
   └─ Shows in: Schedule management panel
   └─ Types: Available slots + Booked sessions

4. whiteboard_session_recordings (6 rows) ⚠️ PHASE 2
   └─ Purpose: Video recordings of whiteboard sessions
   └─ Shows in: Not implemented yet (database ready)
   └─ Links to: whiteboard_sessions

5. tutor_student_enrollments (0 rows) ❌ UNUSED
   └─ Purpose: Alternative enrollment (legacy/unused)
   └─ Shows in: Nothing (empty table)
```

---

## Data Flow Diagram

```
┌──────────────────┐
│  Student/Parent  │
└────────┬─────────┘
         │ Sends request
         ↓
┌──────────────────────────┐
│   session_requests       │  ← Current focus (you asked about this)
│  - status: pending       │
└────────┬─────────────────┘
         │ Tutor accepts
         ↓
┌──────────────────────────┐
│   session_requests       │
│  - status: accepted      │  ← Shows in "My Students"
└────────┬─────────────────┘
         │ (Optional) Create long-term enrollment
         ↓
┌──────────────────────────┐
│ tutor_student_bookings   │  ← For ongoing tutoring
│  - subject: Math         │
│  - sessions_per_week: 3  │
└────────┬─────────────────┘
         │ Create individual sessions
         ↓
┌──────────────────────────┐
│   whiteboard_sessions    │  ← Individual class sessions
│  - booking_id: 1         │
│  - status: scheduled     │
└────────┬─────────────────┘
         │ During session
         ↓
┌──────────────────────────┐
│ whiteboard_canvas_data   │  ← Drawing strokes
└──────────────────────────┘
         │ Record session (Phase 2)
         ↓
┌──────────────────────────┐
│ whiteboard_session_      │  ← Video files
│   recordings             │
└──────────────────────────┘
```

---

## Parallel: Schedule Management

```
┌──────────────────┐
│      Tutor       │
└────────┬─────────┘
         │ Creates calendar slots
         ↓
┌──────────────────────────┐
│   tutor_schedules        │  ← Teaching calendar
│  - student_id: NULL      │  ← Available slot
│  - status: scheduled     │
└────────┬─────────────────┘
         │ Student books slot
         ↓
┌──────────────────────────┐
│   tutor_schedules        │
│  - student_id: 27        │  ← Booked slot
│  - status: scheduled     │
└──────────────────────────┘
```

---

## Quick Comparison

| Feature | session_requests | tutor_student_bookings |
|---------|-----------------|------------------------|
| **Purpose** | Request workflow | Long-term enrollment |
| **Duration** | One-time | Ongoing |
| **Status Field** | pending/accepted/rejected | active/paused/completed |
| **Creates** | Nothing (end of flow) | whiteboard_sessions |
| **Like** | Friend request | Friend relationship |
| **Use Case** | Initial contact | Ongoing classes |

---

## FK Architecture Issues (Need Fixing)

### ✅ FIXED
```sql
session_requests:
  tutor_id → tutor_profiles.id (FK ✅)
  requester_id → (no FK - conditional reference)
```

### ⚠️ NEEDS FIXING
```sql
tutor_student_bookings:
  tutor_id → users.id (FK ❌ should be tutor_profiles.id)
  student_id → users.id (FK ❌ should be student_profiles.id)

tutor_schedules:
  tutor_id → users.id OR tutor_profiles.id (FK ❌ inconsistent)
  student_id → users.id (FK ❌ should be student_profiles.id)
```

---

## Summary for Database Designer

**You have 3 different "student enrollment" concepts:**

1. **Level 1: Request** (`session_requests`)
   - Student says: "I want to learn from you"
   - Tutor says: "Yes" or "No"
   - Like: LinkedIn connection request

2. **Level 2: Enrollment** (`tutor_student_bookings`)
   - Ongoing relationship: "I'm your student for Math"
   - Has schedule: "3 sessions per week"
   - Like: Enrolled in a course

3. **Level 3: Calendar** (`tutor_schedules`)
   - Specific time slots: "Monday 2PM, Wednesday 2PM, Friday 2PM"
   - Can be booked or available
   - Like: Individual calendar events

**Question:** Do you need all 3, or can you consolidate?

**Current Usage:**
- ✅ `session_requests` → Used for initial request/accept flow
- ✅ `tutor_student_bookings` → Used for whiteboard system
- ✅ `tutor_schedules` → Used for calendar management
- ❌ `tutor_student_enrollments` → Not used (delete?)

---

## Answer to Your Question

> "Oh so it just reads from session_requests where status = 'accepted'"

**YES!** That's exactly right for the "My Students" panel.

**But...**

There are **3 other tables** that track student-tutor relationships:

1. **`tutor_student_bookings`** - For long-term enrollments (whiteboard sessions)
2. **`tutor_schedules`** - For calendar/schedule management
3. **`tutor_student_enrollments`** - Unused (legacy)

So you have **multiple ways** to track students:
- Simple: `session_requests` (status = 'accepted')
- Complex: `tutor_student_bookings` (for whiteboard)
- Calendar: `tutor_schedules` (for scheduling)

They serve **different purposes** and are **not duplicates**! 🎯
