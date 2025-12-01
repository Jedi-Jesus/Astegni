# Schedule & Sessions - Quick Start Guide

## What Was Done

### ✅ Database Migration
Added 5 new fields to `tutoring_sessions` table:
- `session_frequency` - 'one-time', 'weekly', 'bi-weekly', 'monthly'
- `is_recurring` - Boolean flag
- `recurring_pattern` - JSON pattern
- `package_duration` - Integer (weeks/months)
- `grade_level` - Student grade level

### ✅ New API Endpoints
Created `tutor_sessions_endpoints.py` with 3 endpoints:
1. `GET /api/tutor/sessions` - Get all sessions (with filters)
2. `GET /api/tutor/sessions/{session_id}` - Get single session
3. `GET /api/tutor/sessions/stats/summary` - Get statistics

### ✅ Backend Integration
Added router to `app.py` (line 87)

---

## Current Schedule Panel Behavior

**Location:** `profile-pages/tutor-profile.html` → Schedule Panel

**Data Source:** `tutor_teaching_schedules` table

**What It Shows:** Tutor's teaching availability (recurring patterns, time slots)

**API Endpoint:** `GET /api/tutor/schedules`

**Frontend Code:** `js/tutor-profile/global-functions.js` → `loadSchedules()` function (line 4437)

---

## The Two Tables Explained (Simple Version)

### 1️⃣ `tutor_teaching_schedules` - "When I'm Available"
**Example:** "I teach Math every Monday & Wednesday, 2-4 PM"
- No students involved
- Just availability patterns
- Used for: Creating recurring teaching slots

### 2️⃣ `tutoring_sessions` - "Actual Sessions I Taught"
**Example:** "I taught John Smith on Jan 15, 2025 - he paid 500 ETB, gave me 5 stars"
- Linked to specific student
- Has payment, rating, attendance
- Used for: Tracking completed work, earnings, reviews

---

## How to Use the New Endpoints

### Test in Browser
1. Start backend: `cd astegni-backend && python app.py`
2. Open: http://localhost:8000/docs
3. Find endpoints:
   - `/api/tutor/sessions` - Get all sessions
   - `/api/tutor/sessions/stats/summary` - Get stats

### Test with JavaScript (Frontend)
```javascript
// Get all sessions
const response = await fetch('http://localhost:8000/api/tutor/sessions', {
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
});
const sessions = await response.json();
console.log('My sessions:', sessions);

// Get statistics
const statsResponse = await fetch('http://localhost:8000/api/tutor/sessions/stats/summary', {
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
});
const stats = await statsResponse.json();
console.log('Total earnings:', stats.total_earnings);
console.log('Average rating:', stats.average_rating);
```

---

## Recommended Next Steps (Frontend)

### Option 1: Add a "My Sessions" Tab
Add a second tab to the schedule panel:

**Tab 1: Teaching Schedule** (current - keeps working)
- Shows availability from `tutor_teaching_schedules`

**Tab 2: My Sessions** (new)
- Shows actual sessions from `tutoring_sessions`
- Display student names, earnings, ratings

### Option 2: Dashboard Stats Widget
Add a widget showing:
- Total sessions taught
- Total earnings
- Average rating
- Hours taught

---

## Files Reference

### Backend Files
```
astegni-backend/
├── tutor_schedule_endpoints.py      - Teaching schedules (availability)
├── tutor_sessions_endpoints.py      - Actual sessions (NEW!)
├── run_session_migration.py         - Migration script
└── app.py                            - Main app (router added)
```

### Frontend Files
```
js/tutor-profile/
└── global-functions.js               - loadSchedules() function (line 4437)
                                      - Currently loads teaching schedules only
```

### Documentation
```
SCHEDULE-SESSIONS-TABLES-EXPLAINED.md - Complete guide
SCHEDULE-SESSIONS-QUICK-START.md      - This file
```

---

## Quick Test Commands

### Run Migration (if not done)
```bash
cd astegni-backend
python run_session_migration.py
```

### Start Backend
```bash
cd astegni-backend
python app.py
# Should see: "INFO:     Application startup complete."
```

### Test Endpoints
```bash
# Get sessions (replace TOKEN with real JWT)
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/api/tutor/sessions

# Get stats
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/api/tutor/sessions/stats/summary
```

---

## Summary

✅ **Database Updated** - `tutoring_sessions` has scheduling fields
✅ **Endpoints Ready** - `/api/tutor/sessions` endpoints available
✅ **Backend Integrated** - Router added to `app.py`
📋 **Frontend TODO** - Add sessions tab to schedule panel (optional)

**Current Status:** Everything works! Schedule panel continues to show teaching availability. New sessions endpoints are ready whenever you want to display actual tutoring sessions.

**No Breaking Changes:** Your current schedule panel still works exactly as before!
