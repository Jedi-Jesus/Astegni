# Schedule Panel Data Sources

## Overview
The Schedule Panel in `tutor-profile.html` has two tabs: **Schedules** and **Sessions**. Here's where each tab reads its data from.

---

## Tab: Schedules (tab-schedules)

### API Endpoint
```
GET http://localhost:8000/api/tutor/schedules
```

### Database Table
**`tutor_schedules`** (or similar schedule-related table)

### What it shows
- **Teaching schedules** (when the tutor is AVAILABLE to teach)
- Recurring patterns and time slots
- Schedule types: recurring or specific dates
- Fields displayed:
  - Schedule Title
  - Subject
  - Priority Level (stored in `grade_level` field)
  - Date & Time (recurring patterns or specific dates)
  - Notification settings
  - Alarm settings

### Key Files
- **Frontend**: `js/tutor-profile/global-functions.js` (line 4716)
- **Function**: `loadSchedules(page = 1)`
- **Tab Manager**: `js/tutor-profile/schedule-tab-manager.js` (line 56)

### Data Flow
```
User clicks "Schedules" tab
  ↓
switchScheduleTab('schedules') called
  ↓
loadTabData('schedules') called
  ↓
loadSchedules() called
  ↓
Fetches: GET /api/tutor/schedules
  ↓
Displays teaching schedules in table
```

---

## Tab: Sessions (tab-sessions)

### API Endpoint
```
GET http://localhost:8000/api/tutor/sessions
```

Optional status filter:
```
GET http://localhost:8000/api/tutor/sessions?status_filter=scheduled
```

### Database Table
**`tutor_sessions`**

### What it shows
- **ACTUAL tutoring sessions** with specific students
- Booked sessions (not just availability)
- Fields displayed:
  - Student Name & ID
  - Subject & Topic
  - Session Date & Time
  - Notification status (browser notifications)
  - Alarm status (alarm before session)
  - Actions (View session details)

### Statistics Endpoint
```
GET http://localhost:8000/api/tutor/sessions/stats/summary
```

Shows:
- Total sessions
- Completed sessions
- Total hours taught
- Total earnings (in ETB)
- Average rating

### Key Files
- **Frontend**: `js/tutor-profile/schedule-tab-manager.js` (line 136)
- **Function**: `loadSessions(statusFilter = null, page = 1)`
- **Backend**: `astegni-backend/tutor_sessions_endpoints.py`

### Data Flow
```
User clicks "Sessions" tab
  ↓
switchScheduleTab('sessions') called
  ↓
loadTabData('sessions') called
  ↓
loadSessions() + loadSessionStats() called
  ↓
Fetches: GET /api/tutor/sessions
Fetches: GET /api/tutor/sessions/stats/summary
  ↓
Displays actual sessions in table with stats
```

---

## Key Differences

| Aspect | **Schedules** | **Sessions** |
|--------|---------------|--------------|
| **Purpose** | Teaching availability | Actual booked sessions |
| **Database Table** | `tutor_schedules` | `tutor_sessions` |
| **API Endpoint** | `/api/tutor/schedules` | `/api/tutor/sessions` |
| **Shows** | When tutor is available | Who booked and when |
| **Filters** | Priority level | Status (scheduled, in-progress, completed, etc.) |
| **Includes Students** | No | Yes (student name & ID) |
| **Has Stats** | No | Yes (earnings, hours, rating) |

---

## Backend Endpoints

### Schedules API
**File**: Likely in `astegni-backend/app.py` or a separate schedules endpoint file
**Route**: `GET /api/tutor/schedules`
**Authentication**: Requires Bearer token
**Returns**: Array of schedule objects

### Sessions API
**File**: `astegni-backend/tutor_sessions_endpoints.py`
**Routes**:
- `GET /api/tutor/sessions` - List all sessions
- `GET /api/tutor/sessions?status_filter={status}` - Filter by status
- `GET /api/tutor/sessions/stats/summary` - Get statistics
- `PATCH /api/tutor/sessions/{id}/toggle-notification` - Toggle notifications
- `PATCH /api/tutor/sessions/{id}/toggle-alarm` - Toggle alarm
- `PATCH /api/tutor/sessions/{id}/toggle-featured` - Toggle featured status

**Authentication**: Requires Bearer token
**Returns**: Array of session objects with student details

---

## Session Features

### Pagination
- **Sessions**: 10 items per page
- **Schedules**: Uses `scheduleItemsPerPage` variable

### Filtering
- **Sessions**: Filter by status (all, scheduled, in-progress, completed, cancelled, missed)
- **Schedules**: Filter by priority level (all, Highly Critical, Very Important, Important, Low Priority)

### Search
- **Sessions**: Search by student name, subject, topic, grade level, status, mode, student ID
- **Schedules**: Search by title, subject, grade level, schedule type, status, description

### Sorting
- **Sessions**: Sort by student_name, subject, session_date
- **Schedules**: Sort by various columns

---

## Quick Reference

### To fetch Schedules data:
```javascript
const token = localStorage.getItem('token');
const response = await fetch('http://localhost:8000/api/tutor/schedules', {
    headers: { 'Authorization': `Bearer ${token}` }
});
const schedules = await response.json();
```

### To fetch Sessions data:
```javascript
const token = localStorage.getItem('token');
const response = await fetch('http://localhost:8000/api/tutor/sessions', {
    headers: { 'Authorization': `Bearer ${token}` }
});
const sessions = await response.json();
```

### To fetch Session Stats:
```javascript
const token = localStorage.getItem('token');
const response = await fetch('http://localhost:8000/api/tutor/sessions/stats/summary', {
    headers: { 'Authorization': `Bearer ${token}` }
});
const stats = await response.json();
// stats = { total_sessions, completed_sessions, total_hours, total_earnings, average_rating }
```

---

## Summary

- **tab-schedules** reads from **`tutor_schedules`** table via **`GET /api/tutor/schedules`**
- **tab-sessions** reads from **`tutor_sessions`** table via **`GET /api/tutor/sessions`**

These are TWO DIFFERENT concepts:
1. **Schedules** = When you're available to teach (your teaching times)
2. **Sessions** = Actual booked sessions with students (who booked you)
