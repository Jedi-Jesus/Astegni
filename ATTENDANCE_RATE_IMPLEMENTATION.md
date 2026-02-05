# Attendance Rate Implementation

## Overview

Added **Attendance Rate** tracking to the parent dashboard statistics, showing what percentage of sessions their children actually attended.

---

## 📊 What is Attendance Rate?

**Attendance Rate** = (Sessions where child was present / Total sessions with attendance marked) × 100

### Example Calculation
- Total sessions with attendance marked: 50
- Sessions where child was present: 47
- **Attendance Rate: 94%**

---

## 🎯 How It Works

### Data Source
- **Table**: `sessions`
- **Column**: `student_attendance_status`
- **Possible Values**: `'present'`, `'absent'`, `'late'`

### SQL Query
```sql
SELECT
    COUNT(*) FILTER (WHERE student_attendance_status = 'present') as present_count,
    COUNT(*) as total_sessions
FROM sessions s
JOIN enrolled_courses ec ON s.enrolled_courses_id = ec.id
WHERE ec.students_id && CAST(:children_ids AS integer[])
AND s.status IN ('completed', 'in-progress')
AND s.student_attendance_status IS NOT NULL
```

### Calculation
```python
if total_sessions > 0:
    attendance_rate = round((present_count / total_sessions) * 100, 1)
else:
    attendance_rate = 0.0
```

---

## 🔍 What Sessions Are Counted?

### ✅ Included
- Sessions with status: `'completed'` or `'in-progress'`
- Sessions where attendance has been marked (not NULL)
- Sessions linked to parent's children via `enrolled_courses`

### ❌ Excluded
- Sessions with status: `'scheduled'`, `'cancelled'`
- Sessions where attendance hasn't been marked yet
- Sessions from children not linked to this parent

---

## 📱 UI Display

### Dashboard Panel
```html
<div class="card p-4">
    <div class="flex items-center gap-3 mb-2">
        <span class="text-3xl">✅</span>
        <h3 class="text-lg font-semibold">Attendance Rate</h3>
    </div>
    <p class="text-2xl font-bold text-orange-600">
        <span id="stat-attendance">94</span>%
    </p>
    <span class="text-sm text-gray-500">Family average</span>
</div>
```

### Color Coding (Suggested)
- **90-100%**: Green (Excellent)
- **80-89%**: Blue (Good)
- **70-79%**: Orange (Fair)
- **Below 70%**: Red (Needs improvement)

---

## 🧪 Testing

### 1. Check Current Data
```sql
-- See attendance breakdown for a parent's children
SELECT
    s.student_attendance_status,
    COUNT(*) as count
FROM sessions s
JOIN enrolled_courses ec ON s.enrolled_courses_id = ec.id
WHERE ec.students_id && ARRAY[1, 2, 3]  -- Replace with actual student_profile IDs
AND s.status IN ('completed', 'in-progress')
AND s.student_attendance_status IS NOT NULL
GROUP BY s.student_attendance_status;
```

### 2. Test API Endpoint
```bash
cd astegni-backend
python test_dashboard_stats.py
```

Look for:
```
Attendance Rate:      94.5%
```

### 3. Manual Testing
1. Login as parent with children
2. View parent profile dashboard
3. Check the "Attendance Rate" card
4. Verify percentage is calculated correctly

---

## 📈 Use Cases

### For Parents
- **Monitor Attendance**: Track if children are attending their tutoring sessions
- **Identify Issues**: Low attendance might indicate scheduling problems or lack of engagement
- **Accountability**: Keep children accountable for showing up to sessions

### For Tutors
- Can see parent's overall attendance tracking
- Helps identify parents who value attendance

### For Platform
- Metric for engagement quality
- Can identify at-risk families (low attendance)
- Can reward high-attendance families

---

## 🔧 Implementation Details

### Backend Changes
**File**: `astegni-backend/parent_endpoints.py`

Added calculation in `/api/parent/dashboard-stats` endpoint:
```python
# 6. Attendance Rate (from sessions table)
attendance_rate = 0.0
if children_ids:
    result = db.execute(text("""
        SELECT
            COUNT(*) FILTER (WHERE s.student_attendance_status = 'present') as present_count,
            COUNT(*) as total_sessions
        FROM sessions s
        JOIN enrolled_courses ec ON s.enrolled_courses_id = ec.id
        WHERE ec.students_id && CAST(:children_ids AS integer[])
        AND s.status IN ('completed', 'in-progress')
        AND s.student_attendance_status IS NOT NULL
    """), {"children_ids": children_ids}).fetchone()

    if result and result[1] > 0:
        present_count = result[0] if result[0] else 0
        total_sessions = result[1]
        attendance_rate = round((present_count / total_sessions) * 100, 1)
```

### Frontend Changes
**File**: `js/parent-profile/parent-profile.js`

Added display logic in `loadDashboardStats()`:
```javascript
const statAttendanceEl = document.getElementById('stat-attendance');
if (statAttendanceEl) {
    statAttendanceEl.textContent = stats.attendance_rate !== undefined ? stats.attendance_rate : '0';
}
```

**HTML**: Already existed with ID `stat-attendance`

---

## 💡 Future Enhancements

### 1. Per-Child Breakdown
Show attendance rate for each child individually:
```
Child A: 96% (48/50 sessions)
Child B: 92% (46/50 sessions)
Child C: 95% (47/50 sessions)
```

### 2. Attendance Trends
Track attendance over time:
- This month: 94%
- Last month: 89%
- 3 months ago: 91%

### 3. Late vs Absent
Distinguish between late and absent:
- Present: 47 sessions (94%)
- Late: 2 sessions (4%)
- Absent: 1 session (2%)

### 4. Notifications
Alert parents when attendance drops below threshold:
- "⚠️ Attendance has dropped to 75% this month"

### 5. Attendance Rewards
Gamification for high attendance:
- 95%+ for 3 months → Badge earned
- Perfect attendance month → Special recognition

---

## 🐛 Edge Cases Handled

1. **No sessions yet**: Returns 0%
2. **No attendance marked**: Returns 0% (only counts marked attendance)
3. **Scheduled sessions**: Not counted (only completed/in-progress)
4. **NULL attendance**: Excluded from calculation
5. **Multiple children**: Aggregates across all children

---

## 📊 Database Schema

### sessions table
```sql
student_attendance_status VARCHAR(20) DEFAULT 'present'
-- Possible values: 'present', 'absent', 'late'
```

### Related columns
```sql
tutor_attendance_status VARCHAR(20)     -- Tutor's attendance
attendance_marked_by INTEGER            -- Who marked it
attendance_marked_at TIMESTAMP          -- When marked
attendance_source VARCHAR(50)           -- manual/automatic
attendance_notes TEXT                   -- Additional notes
```

---

## ✅ Completion Checklist

- [x] Backend endpoint updated
- [x] SQL query implemented
- [x] Frontend display added
- [x] Test script updated
- [x] Documentation created
- [x] Cache-busting applied
- [x] Edge cases handled
- [x] Ready for testing

---

## 📝 Notes

- Attendance is tracked at the **session** level, not enrollment level
- Only sessions with marked attendance are counted
- "Late" is currently NOT counted as present (can be changed if needed)
- Attendance rate is a **percentage** (0-100), not a decimal

---

**Status**: ✅ Complete and Ready for Testing
**Date**: 2026-02-05
**Version**: 1.0
