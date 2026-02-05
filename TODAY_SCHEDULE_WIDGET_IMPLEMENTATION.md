# Today's Schedule Widget Implementation

## Summary

Implemented a dynamic "Today's Schedule" widget in tutor-profile.html that reads from both the `schedules` and `sessions` tables using existing API endpoints.

## Files Created/Modified

### 1. Created: `js/tutor-profile/today-schedule-widget.js`
- **Purpose**: Fetches and displays today's schedule items
- **Features**:
  - Fetches from `/api/tutor/schedules` and `/api/tutor/sessions` endpoints
  - Filters schedules for today (recurring + specific dates)
  - Combines schedules and sessions, sorted by time
  - Displays up to 3 items in widget
  - Shows total count if more than 3 items
  - Auto-refreshes every 5 minutes
  - Clicking items opens the full schedule panel

### 2. Modified: `profile-pages/tutor-profile.html`
- **Line 3503-3533**: Replaced hardcoded schedule items with dynamic container
- **Line 120**: Added script tag to load `today-schedule-widget.js`

### 3. Created: `test-today-schedule-widget.html`
- **Purpose**: Standalone test page for the widget
- **Usage**: Open in browser to test the widget independently

## How It Works

### Data Flow

```
1. Widget loads on page load (DOMContentLoaded)
2. Fetches data from two endpoints in parallel:
   - GET /api/tutor/schedules
   - GET /api/tutor/sessions?date_from=TODAY&date_to=TODAY
3. Filters schedules for today:
   - Recurring: Check if today's day name is in schedule.days array
   - Specific: Check if today's date is in schedule.specific_dates array
4. Combines and sorts all items by start_time
5. Displays first 3 items with appropriate styling
6. Shows "View All X Items" button if more than 3 items
```

### Display Logic

**Schedule Items:**
- Icon: 🔥 (urgent/high priority) or 📅 (normal)
- Title: schedule.title
- Description: schedule.description
- Time: Formatted start_time (e.g., "10:00 AM")

**Session Items:**
- Icon: 💻 (online) or 👥 (in-person)
- Title: course_name or "Session"
- Description: student_name + session_mode
- Time: Formatted start_time

## API Endpoints Used

### `/api/tutor/schedules`
- **Method**: GET
- **Auth**: Bearer token required
- **Response**: Array of schedule objects
- **Fields Used**:
  - `schedule_type` (recurring/specific)
  - `days` (array of day names)
  - `specific_dates` (array of dates)
  - `start_time`, `end_time`
  - `title`, `description`
  - `priority_level`, `status`

### `/api/tutor/sessions`
- **Method**: GET
- **Auth**: Bearer token required
- **Query Params**: `date_from`, `date_to` (YYYY-MM-DD)
- **Response**: Array of session objects
- **Fields Used**:
  - `session_date`, `start_time`, `end_time`
  - `course_name`, `student_name`
  - `session_mode` (online/in-person)
  - `status`

## Database Tables

### `schedules` Table
```sql
-- Fields used by widget:
scheduler_id        -- User ID (matched via tutor_profiles.user_id)
scheduler_role      -- 'tutor', 'student', 'parent'
title               -- Display title
description         -- Additional info
schedule_type       -- 'recurring' or 'specific'
days                -- Array: ['Monday', 'Wednesday', ...]
specific_dates      -- Array: ['2026-02-05', '2026-02-06', ...]
start_time          -- time type
end_time            -- time type
status              -- 'active', 'cancelled', etc.
priority_level      -- 'low', 'medium', 'high', 'urgent'
```

### `sessions` Table (via enrolled_students)
```sql
-- Relationship:
sessions.enrolled_courses_id -> enrolled_students.id
enrolled_students.tutor_id -> tutor_profiles.id
tutor_profiles.user_id -> users.id

-- Fields used:
session_date        -- date type
start_time          -- time type
end_time            -- time type
session_mode        -- 'online' or 'in-person'
status              -- 'scheduled', 'in_progress', 'completed'
```

## Testing

### Quick Test (with existing data)
```bash
# 1. Start backend
cd astegni-backend
python app.py

# 2. Start frontend
python dev-server.py

# 3. Open test page
http://localhost:8081/test-today-schedule-widget.html

# 4. Or open tutor profile
http://localhost:8081/profile-pages/tutor-profile.html
```

### Verify Data
```python
# Check today's schedules
python -c "
import psycopg, os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
conn = psycopg.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

today = datetime.now()
day = today.strftime('%A')
date = today.date().isoformat()

cur.execute('''
    SELECT id, title, schedule_type, start_time
    FROM schedules
    WHERE scheduler_id = 3 AND scheduler_role = 'tutor'
    AND status = 'active'
    AND (
        (schedule_type = 'recurring' AND %s = ANY(days))
        OR (schedule_type = 'specific' AND %s = ANY(specific_dates))
    )
''', (day, date))

for row in cur.fetchall():
    print(row)
"
```

### Test Results (2026-02-05, Thursday)
```
Found 4 schedules for user_id=3 (tutor):
1. Test schedule tutor specific 3 (04:59-06:59)
2. specific tutor schedule small (20:50-22:50)
3. time (recurring) (21:12-23:12)
4. test schedule after tab clear specific dates (21:35-23:36)

Found 0 sessions for today
```

## Features

✅ **Real-time Data**: Fetches from actual database tables
✅ **Smart Filtering**: Handles both recurring and specific date schedules
✅ **Combined View**: Shows both schedules and sessions
✅ **Auto-refresh**: Updates every 5 minutes
✅ **Responsive Design**: Uses CSS variables for theming
✅ **Loading States**: Shows spinner while loading
✅ **Empty States**: Shows friendly message when no items
✅ **Click-through**: Opens full schedule panel when clicked
✅ **Time Formatting**: Converts 24h to 12h format (e.g., "14:00" → "2:00 PM")
✅ **Visual Icons**: Different icons for schedules, online sessions, in-person sessions

## UI States

### Loading
```
🔄 Loading today's schedule...
```

### Empty (No items for today)
```
📅 No schedule for today
   Enjoy your free time!
```

### With Items (1-3 items)
```
📚 Mathematics                    10:00 AM
   Grade 10 Student - online

💻 Physics                        2:00 PM
   Grade 11 Student - online

[View Full Schedule]
```

### With Items (More than 3)
```
📚 Mathematics                    10:00 AM
   Grade 10 Student - online

💻 Physics                        2:00 PM
   Grade 11 Student - online

📅 Chemistry                      4:30 PM
   Grade 12 Student - in-person

[View All 5 Items]
```

## Configuration

### Auto-refresh Interval
Default: 5 minutes
Location: Line 244 in `today-schedule-widget.js`

```javascript
setInterval(() => {
    loadTodaySchedule();
}, 5 * 60 * 1000); // Change this value
```

### Items Displayed
Default: 3 items max
Location: Line 136 in `today-schedule-widget.js`

```javascript
const displayItems = items.slice(0, 3); // Change limit here
```

## Browser Console Logs

Enable debug logging in console:
```
📅 Today's Schedule Widget Loading...
DOM loaded, initializing Today's Schedule widget
Fetching schedules from: http://localhost:8000/api/tutor/schedules
Fetching sessions from: http://localhost:8000/api/tutor/sessions?date_from=2026-02-05&date_to=2026-02-05
Found 4 schedules for today (Thursday)
Found 0 sessions for today
Displaying 3 of 4 total items
✅ Today's Schedule Widget Loaded
```

## Known Limitations

1. **Tutor-only**: Currently only works for tutors (can be extended to students/parents)
2. **Today-only**: Only shows current day (no week/month view)
3. **No Edit**: Widget is read-only (edit via schedule panel)
4. **No Conflicts**: Doesn't highlight time conflicts
5. **Fixed Colors**: Uses predefined color rotation

## Future Enhancements

- [ ] Add week view option
- [ ] Show time conflicts/overlaps
- [ ] Add quick actions (edit, delete, mark complete)
- [ ] Support student and parent roles
- [ ] Add calendar integration
- [ ] Show weather for outdoor sessions
- [ ] Add reminders/notifications
- [ ] Filter by priority level
- [ ] Export to calendar formats

## Related Files

- Backend endpoints: `tutor_schedule_endpoints.py`, `tutor_sessions_endpoints.py`
- Panel managers: `schedule-panel-manager.js`, `sessions-panel-manager.js`
- Database models: `app.py modules/models.py` (Schedule, EnrolledStudent, Session)

## Deployment Notes

- **Cache Busting**: Script uses `?v=20260205` query parameter
- **No Build Step**: Pure JavaScript, no compilation needed
- **Theme Support**: Fully compatible with light/dark themes
- **Mobile Responsive**: Works on all screen sizes

## Support

For issues or questions:
1. Check browser console for error messages
2. Verify backend is running on port 8000
3. Confirm user has tutor role
4. Check database has schedules/sessions for today
5. Review `TODAY_SCHEDULE_WIDGET_IMPLEMENTATION.md` (this file)
