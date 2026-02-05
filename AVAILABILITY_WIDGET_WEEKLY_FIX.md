# Availability Widget Weekly Fix

## Problem
The "This Week" availability widget in view-tutor.html was NOT actually filtering by the current week. It was showing ALL featured schedules and sessions regardless of dates.

## Root Cause
The `/api/view-tutor/{tutor_id}/availability/featured` endpoint had two major issues:

1. **No weekly filtering**: It fetched all featured items without date range constraints
2. **Wrong table structure**: It was querying `sessions.tutor_id` which doesn't exist (should use `enrolled_courses.tutor_id` via JOIN)

## Solution Applied

### Backend Fix (view_tutor_endpoints.py)

Updated the endpoint to:

1. **Calculate current week range** (Monday to Sunday)
2. **Filter recurring schedules**: Only include schedules where `days` array matches weekdays in current week
3. **Filter specific date schedules**: Only include schedules where `specific_dates` fall within current week
4. **Filter sessions**: Only include sessions where `session_date` is between week_start and week_end
5. **Use correct table structure**: JOIN `sessions` with `enrolled_courses` to get tutor_id

### Key Changes

#### Schedules Filtering:
```python
# Calculate current week
today = datetime.now()
week_start = today - timedelta(days=today.weekday())  # Monday
week_end = week_start + timedelta(days=6)  # Sunday

# Get weekdays for this week
weekdays_in_week = [(week_start + timedelta(days=i)).strftime('%A') for i in range(7)]

# Filter recurring schedules
if days and len(days) > 0:
    matching_days = [d for d in days if d in weekdays_in_week]
    if matching_days:
        is_relevant = True

# Filter specific date schedules
if specific_dates and len(specific_dates) > 0:
    matching_dates = [
        d for d in specific_dates
        if week_start.date() <= datetime.strptime(d, '%Y-%m-%d').date() <= week_end.date()
    ]
    if matching_dates:
        is_relevant = True
```

#### Sessions Filtering:
```sql
SELECT s.id, s.enrolled_courses_id, s.session_date, s.start_time, s.end_time,
       s.status, s.created_at, s.is_featured, s.topics
FROM sessions s
JOIN enrolled_courses ec ON s.enrolled_courses_id = ec.id
WHERE ec.tutor_id = %s
  AND s.is_featured = TRUE
  AND s.status IN ('scheduled', 'ongoing')
  AND s.session_date >= %s  -- week_start
  AND s.session_date <= %s  -- week_end
ORDER BY s.session_date ASC, s.start_time ASC
```

### Response Format

Now includes:
```json
{
  "schedules": [
    {
      "id": 30,
      "title": "Test schedule tutor specific",
      "days": [],
      "specific_dates": ["2026-02-01", "2026-02-02", ...],
      "relevant_days": [],
      "relevant_dates": ["2026-02-01"],  // Only dates in current week
      "start_time": "16:00:00",
      "end_time": "22:00:00",
      "is_featured": true
    },
    {
      "id": 29,
      "title": "Test schedule tutor recurring",
      "days": ["Wednesday", "Thursday"],
      "specific_dates": [],
      "relevant_days": ["Wednesday", "Thursday"],  // Weekdays matching this week
      "relevant_dates": [],
      "start_time": "04:57:00",
      "end_time": "09:57:00",
      "is_featured": true
    }
  ],
  "sessions": [],  // Sessions scheduled for current week only
  "total_count": 2,
  "week_start": "2026-01-26",  // Monday
  "week_end": "2026-02-01"     // Sunday
}
```

## Testing

### 1. Restart Backend
```bash
cd astegni-backend
# Stop current backend (Ctrl+C or kill process)
python app.py
```

### 2. Test API
```bash
# Test with user_id=1 (jediael)
curl "http://localhost:8000/api/view-tutor/1/availability/featured?by_user_id=true"
```

### 3. Expected Results for Jediael (Week of 2026-01-26 to 2026-02-01)

**Should show:**
- Schedule #30 (specific dates) - because it has date 2026-02-01 in this week
- Schedule #29 (recurring) - because it has Wednesday/Thursday which are in this week

**Should NOT show:**
- Any schedules with specific_dates outside current week
- Any schedules with days not matching this week's weekdays
- Any sessions outside current week date range

### 4. Verify Frontend
Visit: http://localhost:8081/view-profiles/view-tutor.html?user_id=1

Check the "📅 This Week" widget shows only items relevant to current week.

## Database Test Data

Jediael (user_id=1) currently has:

1. **Schedule #29**: Recurring on Wednesday, Thursday (4:57-9:57) - Featured ✓
2. **Schedule #30**: Specific dates Feb 1-7, 2026 (16:00-22:00) - Featured ✓

Current week: Jan 26 (Mon) - Feb 1 (Sun)
- Schedule #29: Shows because Wed/Thu are in this week
- Schedule #30: Shows because Feb 1 is in this week

## Files Changed
- `astegni-backend/view_tutor_endpoints.py` (lines 713-835)

## Status
✅ Backend code updated
⏳ Requires backend restart to take effect
⏳ Frontend may need updates to display new fields (relevant_days, relevant_dates, week_start, week_end)
