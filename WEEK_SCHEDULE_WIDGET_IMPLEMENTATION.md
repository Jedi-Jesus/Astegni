# This Week's Schedule Widget Implementation

## Summary

Implemented a dynamic "This Week's Schedule" widget in tutor-profile.html that displays the entire week's schedule organized by day, reading from both the `schedules` and `sessions` tables using existing API endpoints.

## Files Created/Modified

### 1. Created: `js/tutor-profile/week-schedule-widget.js`
- **Purpose**: Fetches and displays this week's schedule items organized by day
- **Features**:
  - Fetches from `/api/tutor/schedules` and `/api/tutor/sessions` endpoints
  - Calculates current week (Monday to Sunday)
  - Filters schedules for each day of the week
  - Displays items grouped by day with day headers
  - Shows up to 3 items per day, with "+X more" indicator
  - Highlights today's date
  - Shows total count for the entire week
  - Auto-refreshes every 10 minutes
  - Scrollable container for long lists

### 2. Modified: `profile-pages/tutor-profile.html`
- **Line 3437-3456**: Replaced hardcoded "This Week" stats widget with dynamic schedule widget
- **Line 123**: Added script tag to load `week-schedule-widget.js`

### 3. Created: `test-week-schedule-widget.html`
- **Purpose**: Standalone test page showing both today and week widgets side-by-side
- **Usage**: Open in browser to test both widgets together

## How It Works

### Data Flow

```
1. Widget loads on page load (DOMContentLoaded)
2. Calculate week boundaries (Monday to Sunday)
3. Fetch data from two endpoints in parallel:
   - GET /api/tutor/schedules (all active schedules)
   - GET /api/tutor/sessions?date_from=MONDAY&date_to=SUNDAY
4. Filter schedules for each day of the week:
   - Recurring: Check if day name matches any in schedule.days
   - Specific: Check if date matches any in schedule.specific_dates
5. Organize items by day
6. Sort items within each day by start_time
7. Display days with items, skip empty days
8. Show up to 3 items per day in widget view
```

### Week Calculation

```javascript
// Week boundaries (Monday to Sunday)
Today: Thursday, Feb 5, 2026
Monday: Feb 2, 2026 (week start)
Sunday: Feb 8, 2026 (week end)
```

### Display Logic

**Day Section:**
- Border: Blue for today, gray for other days
- Header: Day name (short) + day number
- Item count shown per day
- Today marker: "• Thu 5" vs "Fri 6"

**Schedule Items (per day):**
- Icon: 🔥 (urgent/high), 📅 (normal schedule)
- Title: schedule.title
- Time: Formatted start_time

**Session Items (per day):**
- Icon: 💻 (online), 👥 (in-person)
- Title: course_name
- Time: Formatted start_time

**Summary Section:**
- Total items count for entire week
- "View Full Schedule" button

## UI Examples

### Week View (with items)

```
┌─────────────────────────────────┐
│ 📅 This Week's Schedule         │
├─────────────────────────────────┤
│ │ • Mon 2              8 items  │
│ │ 📅 Debug Test Schedule  9:00 AM
│ │ 📅 Test schedule...     4:04 AM
│ │ 📅 Test schedule...     4:57 AM
│ │     +5 more                   │
│                                 │
│ │ Tue 3                3 items  │
│ │ 📅 Test schedule...     4:59 AM
│ │ 📅 test schedule...    21:35 PM
│ │ 📅 specific tutor...   20:50 PM
│                                 │
│ │ • Thu 5 (TODAY)      4 items  │
│ │ 📅 Test schedule...     4:59 AM
│ │ 📅 test schedule...    21:35 PM
│ │ 📅 specific tutor...   20:50 PM
│ │     +1 more                   │
│                                 │
│ Total this week: 39 items       │
│ [ View Full Schedule ]          │
└─────────────────────────────────┘
```

### Empty State

```
┌─────────────────────────────────┐
│ 📅 This Week's Schedule         │
├─────────────────────────────────┤
│                                 │
│        📅                        │
│   No schedule for this week     │
│   Time to plan ahead!           │
│                                 │
└─────────────────────────────────┘
```

## API Endpoints Used

### `/api/tutor/schedules`
- **Method**: GET
- **Auth**: Bearer token required
- **Response**: Array of ALL active schedules
- **Widget Filtering**: Client-side filtering for the current week

### `/api/tutor/sessions`
- **Method**: GET
- **Auth**: Bearer token required
- **Query Params**:
  - `date_from`: Monday of current week (YYYY-MM-DD)
  - `date_to`: Sunday of current week (YYYY-MM-DD)
- **Response**: Array of sessions within the date range

## Week Calculation Algorithm

```javascript
function getWeekBoundaries() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sunday, 1=Monday, etc.

    // Calculate Monday
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);

    // Calculate Sunday
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    // Return all 7 days with metadata
    return { weekStart, weekEnd, weekDates: [7 days] };
}
```

## Test Results (Week of Feb 2-8, 2026)

```
Monday Feb 2:     8 schedules
Tuesday Feb 3:    3 schedules
Wednesday Feb 4:  7 schedules
Thursday Feb 5:   4 schedules (TODAY)
Friday Feb 6:     6 schedules
Saturday Feb 7:   6 schedules
Sunday Feb 8:     5 schedules

Total: 39 schedule items + 0 sessions = 39 items
```

## Features Comparison: Today vs Week Widget

| Feature | Today's Schedule | This Week's Schedule |
|---------|------------------|---------------------|
| Time Range | Current day only | Monday-Sunday |
| Items Shown | Up to 3 total | Up to 3 per day |
| Organization | Flat list by time | Grouped by day |
| Today Highlight | All items are today | Today's section highlighted |
| Auto-refresh | Every 5 minutes | Every 10 minutes |
| Max Height | No scroll | 400px scrollable |
| Empty Message | "Enjoy your free time!" | "Time to plan ahead!" |

## Configuration

### Auto-refresh Interval
Default: 10 minutes
Location: Line 342 in `week-schedule-widget.js`

```javascript
setInterval(() => {
    loadWeekSchedule();
}, 10 * 60 * 1000); // Change this value
```

### Items Per Day
Default: 3 items max per day
Location: Line 219 in `week-schedule-widget.js`

```javascript
const displayItems = day.items.slice(0, 3); // Change limit
```

### Max Height (Scrollable)
Default: 400px
Location: Line 196 in `week-schedule-widget.js`

```javascript
style="max-height: 400px; overflow-y: auto;"
```

## Browser Console Logs

```
📅 This Week's Schedule Widget Loading...
DOM loaded, initializing This Week's Schedule widget
Loading week schedule from 2026-02-02 to 2026-02-08
Fetching schedules and sessions...
Found 39 schedules for this week
Found 0 sessions for this week
Organizing by day...
Displaying week schedule with 7 days
✅ This Week's Schedule Widget Loaded
```

## Styling Features

1. **Today Highlighting**:
   - Blue left border for today's section
   - Bold font for today's day name
   - Bullet point (•) before today's day

2. **Day Sections**:
   - Left border (3px)
   - Collapsible visual hierarchy
   - Item count badge

3. **Hover Effects**:
   - Items become slightly transparent on hover
   - Smooth transitions

4. **Responsive Design**:
   - Scrollable for long lists
   - Works on mobile and desktop
   - Uses CSS variables for theming

## Known Limitations

1. **Tutor-only**: Currently only works for tutors
2. **Fixed Week**: Always shows current week (Mon-Sun)
3. **No Navigation**: Can't browse previous/next weeks
4. **Read-only**: No inline editing
5. **Limited Items**: Shows only 3 items per day in widget

## Future Enhancements

- [ ] Add week navigation (previous/next week arrows)
- [ ] Show previous/next week preview
- [ ] Drag-and-drop to reschedule
- [ ] Inline quick edit
- [ ] Multi-role support (student, parent)
- [ ] Custom week start day (Sunday vs Monday)
- [ ] Export week to PDF/calendar
- [ ] Week summary stats (total hours, etc.)
- [ ] Filter by priority level
- [ ] Color coding by subject/category

## Integration with Existing Panels

Both widgets integrate seamlessly with the existing schedule and sessions panels:

- **Clicking any item**: Opens full schedule panel
- **"View Full Schedule" button**: Opens schedule panel
- **Data source**: Same API endpoints as panels
- **Consistency**: Same data, same filtering logic

## Comparison with Panel Views

| Feature | Widget View | Panel View |
|---------|------------|-----------|
| Purpose | Quick overview | Full management |
| Items Shown | Limited (3/day) | All items |
| Features | View only | CRUD operations |
| Location | Right sidebar | Main content area |
| Auto-refresh | Yes | Manual/on action |

## Deployment Notes

- **Cache Busting**: Script uses `?v=20260205` query parameter
- **No Build Step**: Pure JavaScript, no compilation needed
- **Theme Support**: Fully compatible with light/dark themes
- **Mobile Responsive**: Works on all screen sizes
- **Performance**: Efficient filtering (client-side)

## Related Files

- Today's schedule: `today-schedule-widget.js`
- Backend endpoints: `tutor_schedule_endpoints.py`, `tutor_sessions_endpoints.py`
- Panel managers: `schedule-panel-manager.js`, `sessions-panel-manager.js`
- Database models: `app.py modules/models.py`

## Test URLs

- **Tutor Profile**: `http://localhost:8081/profile-pages/tutor-profile.html`
- **Test Page**: `http://localhost:8081/test-week-schedule-widget.html`
- **Both Widgets**: Side-by-side comparison on test page

## Support

For issues or questions:
1. Check browser console for error messages
2. Verify backend is running on port 8000
3. Confirm user has tutor role
4. Check database has schedules for this week
5. Review `WEEK_SCHEDULE_WIDGET_IMPLEMENTATION.md` (this file)
