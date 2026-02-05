# This Week Widget Implementation

## Summary
Implemented the "This Week" widget in the student profile right sidebar to dynamically display weekly statistics calculated from the sessions data. Shows total classes, completion rate, study hours, and attendance rate for the current week.

## Changes Made

### 1. HTML Updates (student-profile.html)

**Location:** Line ~4945

**Before:**
- Static hardcoded statistics (assignments, study hours, attendance, weekly goal)
- No dynamic data loading

**After:**
```html
<div id="this-week-widget-container" class="space-y-3">
    <!-- Will be populated by JavaScript -->
    <div class="text-center py-8 text-gray-500">
        <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
        <p class="text-sm">Loading weekly stats...</p>
    </div>
</div>
```

### 2. JavaScript Implementation (sessions-panel-manager.js)

Added two main functions:

#### A. `updateThisWeekWidget()`
**Purpose:** Calculates and displays statistics for the current week (Monday-Sunday)

**Week Calculation:**
- Determines current week range (Monday 00:00 to Sunday 23:59)
- Handles Sunday correctly (goes back to previous Monday)

**Statistics Calculated:**

1. **Total Classes:** Count of all sessions this week
2. **Completed:** Count and percentage of completed sessions
3. **Study Hours:** Sum of actual session durations (from duration field or calculated from start/end times)
4. **Attendance Rate:** Percentage of attended vs total attendable sessions (completed / (completed + cancelled))

**Features:**
- Progress bars with dynamic widths based on percentages
- Color-coded attendance rate:
  - Green (≥80%): Excellent attendance
  - Orange (50-79%): Moderate attendance
  - Red (<50%): Poor attendance
- Shows upcoming scheduled sessions count
- Displays week date range (e.g., "Week of Jan 27 - Feb 2")
- Empty state when no sessions this week

#### B. `initializeThisWeekWidget()`
**Purpose:** Initialize widget on page load

**Features:**
- Reuses already-loaded session data if available
- Fetches from API only if needed
- Handles authentication state
- Error handling with appropriate messages

### 3. Event Integration

**Added to sessionsLoaded event:**
```javascript
window.addEventListener('sessionsLoaded', () => {
    updateThisWeekWidget();
});
```

**Added to loadSessionsByRole:**
```javascript
updateThisWeekWidget();
```

## How It Works

### Data Flow:
1. **Page Load:** `initializeThisWeekWidget()` runs automatically
2. **Week Range:** Calculate Monday-Sunday of current week
3. **Filter:** Get sessions where `session_date` is within this week
4. **Calculate:** Compute totals, completion rate, hours, attendance
5. **Display:** Show statistics with progress bars
6. **Update:** Widget updates whenever sessions are loaded

### Week Range Logic:
```javascript
// Get Monday of current week
const dayOfWeek = today.getDay(); // 0=Sunday, 1=Monday
const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
const monday = new Date(today);
monday.setDate(today.getDate() + mondayOffset);

// Get Sunday (6 days after Monday)
const sunday = new Date(monday);
sunday.setDate(monday.getDate() + 6);
```

### Statistics Formulas:

**Total Classes:**
```javascript
totalSessions = thisWeekSessions.length
```

**Completed:**
```javascript
completedSessions = sessions.filter(s => s.status === 'completed').length
completionRate = (completedSessions / totalSessions) * 100
```

**Study Hours:**
```javascript
totalHours = sessions
    .filter(s => s.status === 'completed')
    .reduce((sum, s) => {
        // Use duration field (in minutes) if available
        if (s.duration) return sum + s.duration / 60;

        // Calculate from start/end times
        if (s.start_time && s.end_time) {
            const duration = calculateDuration(s.start_time, s.end_time);
            return sum + duration;
        }

        // Default to 1 hour per session
        return sum + 1;
    }, 0)
```

**Attendance Rate:**
```javascript
attendedSessions = completedSessions
totalAttendableSessions = completedSessions + cancelledSessions
attendanceRate = (attendedSessions / totalAttendableSessions) * 100
```

### Widget States:

**Loading:**
```
🔄 Loading weekly stats...
```

**No Sessions:**
```
📅 No sessions this week
   Start scheduling classes!
```

**With Statistics:**
```
Total Classes          5
[████████████████████] 100%

Completed             3/5
[████████████        ] 60%

Study Hours           4.5h
[█████████           ]

Attendance Rate       100%
[████████████████████] 100%

⏰ Upcoming           2 classes

Week of Jan 27 - Feb 2
```

**Not Logged In:**
```
🔒 Please log in to view weekly stats
```

**Error:**
```
⚠️ Unable to load weekly stats
```

## Visual Design

### Progress Bars:
- **Blue** - Total classes (always 100% width)
- **Green** - Completed sessions
- **Purple** - Study hours
- **Dynamic** - Attendance rate (green/orange/red based on percentage)

### Color Thresholds:
```javascript
attendance >= 80%  → Green (Excellent)
attendance >= 50%  → Orange (Moderate)
attendance < 50%   → Red (Poor)
```

## Session Data Requirements

The widget uses the following session fields:
```javascript
{
    session_date: "YYYY-MM-DD",
    status: "completed" | "scheduled" | "cancelled",
    duration: number,           // in minutes (optional)
    start_time: "HH:MM:SS",    // used if duration not available
    end_time: "HH:MM:SS",      // used if duration not available
    viewAs: "student"
}
```

## Benefits

✅ **Week-Based Analysis:** Shows current week (Monday-Sunday) progress
✅ **Real Data:** Calculates from actual session records
✅ **Smart Calculations:** Uses duration field or calculates from times
✅ **Color-Coded Feedback:** Visual indicators for attendance performance
✅ **Responsive Updates:** Refreshes when sessions are loaded
✅ **Multiple Metrics:** Shows completion, hours, and attendance in one view
✅ **User-Friendly:** Clear visual progress bars and labels

## Metrics Explained

### Total Classes
Count of all sessions scheduled this week (regardless of status)

### Completed
Shows both count and percentage of completed sessions
- Helps track weekly learning progress
- Percentage useful for goal tracking

### Study Hours
Actual time spent in completed classes
- Calculated from session duration or start/end times
- Only counts completed sessions
- Progress bar scales to 25 hours max (assumes 5 sessions × 5 hours)

### Attendance Rate
Percentage of classes attended vs total attendable
- Excludes scheduled (future) sessions
- Formula: completed / (completed + cancelled)
- Color-coded for quick visual feedback

### Upcoming
Shows count of scheduled (future) sessions this week
- Quick reference for remaining weekly commitments
- Only shown if there are upcoming sessions

## Testing Checklist

- [ ] Widget loads on page load
- [ ] Shows loading state initially
- [ ] Displays correct week range (Monday-Sunday)
- [ ] Total classes count is accurate
- [ ] Completed sessions and percentage are correct
- [ ] Study hours calculated correctly from duration or times
- [ ] Attendance rate formula works correctly
- [ ] Color coding for attendance rate works (green/orange/red)
- [ ] Upcoming sessions count is accurate
- [ ] Week date range displays correctly
- [ ] Empty state shows when no sessions this week
- [ ] Updates when sessions panel loads new data
- [ ] Handles unauthenticated state
- [ ] Error state displays when API fails
- [ ] Progress bar widths match percentages
- [ ] Only counts student perspective sessions

## Future Enhancements

1. **Weekly Goal Setting:** Allow students to set weekly study hour goals
2. **Week Comparison:** Show comparison with previous week (+/- percentage)
3. **Streak Counter:** Track consecutive weeks with 100% attendance
4. **Subject Breakdown:** Show hours per subject this week
5. **Best Day:** Highlight most productive day of the week
6. **Weekly Report:** Generate downloadable weekly progress report
7. **Notifications:** Alert when close to missing weekly goals
8. **Calendar View:** Click to see weekly schedule in calendar format
9. **Custom Week Start:** Allow users to change week start day
10. **Monthly Average:** Show how this week compares to monthly average

## Integration Notes

- Uses same session data as Today's Classes widget
- Both widgets update together when sessions are loaded
- Shares `allSessionsData` array from sessions panel manager
- Week calculation starts on Monday (international standard)
- Handles edge cases (Sunday correctly goes to previous Monday)

## Performance Considerations

- Lightweight filtering of in-memory data
- No additional API calls (reuses sessions data)
- Efficient date range comparison using ISO strings
- Minimal DOM updates (innerHTML only when data changes)

## Files Modified

1. `profile-pages/student-profile.html` - Updated This Week widget HTML
2. `js/student-profile/sessions-panel-manager.js` - Added widget logic and initialization

## Notes

- Week starts Monday and ends Sunday (ISO 8601 standard)
- Attendance rate only includes completed and cancelled (not future scheduled)
- Study hours default to 1 hour per session if no duration data
- Progress bar for study hours assumes 25-hour max for visual scaling
- Widget updates alongside Today's Classes widget
- Empty state encourages students to schedule classes
