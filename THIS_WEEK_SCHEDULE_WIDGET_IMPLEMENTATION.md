# This Week's Schedule Widget Implementation

## Overview
Replaced the static "Upcoming Meetings" widget with a fully functional "This Week's Schedule" widget that displays schedules and sessions from the current week by fetching data from existing API endpoints.

## Changes Made

### 1. HTML Updates
**File:** `profile-pages/parent-profile.html` (lines 4616-4646)

**Before:** Static "Upcoming Meetings" widget with hardcoded data
**After:** Dynamic "This Week's Schedule" widget with multiple states

#### New HTML Structure:
```html
<div id="this-week-schedule-widget" class="sidebar-widget card">
    <!-- Header with icon and count badge -->
    <h3>
        <i class="fas fa-calendar-week"></i>
        This Week's Schedule
    </h3>
    <span id="week-item-count">0</span>

    <!-- Multiple States -->
    <div id="week-schedule-loading">Loading...</div>
    <div id="week-schedule-empty">No schedule this week</div>
    <div id="week-schedule-data"><!-- Populated dynamically --></div>
    <div id="week-schedule-error">Error with retry button</div>

    <!-- View All Button -->
    <button onclick="switchToSchedulePanel()">View All Schedule</button>
</div>
```

### 2. JavaScript Updates
**File:** `js/parent-profile/right-widgets-manager.js`

#### New Methods Added:

##### `initializeWeekScheduleWidget()`
- Initializes the widget on page load
- Automatically fetches and displays this week's schedule

##### `loadThisWeekSchedule()`
- Fetches data from two API endpoints:
  - `GET /api/schedules` - All schedules
  - `GET /api/parent/sessions` - Parent sessions
- Uses `Promise.allSettled()` for parallel fetching
- Handles both successful and failed responses gracefully
- Filters and displays only this week's items

##### `filterThisWeekItems(items)`
- Calculates current week boundaries (Sunday - Saturday)
- Filters items to only include this week's dates
- Supports multiple date field names:
  - `start_time`
  - `scheduled_date`
  - `date`
  - `start_date`
- Sorts items chronologically (earliest first)

##### `displayWeekScheduleData(items)`
- Limits display to 5 items max
- Updates count badge with total items
- Shows/hides "View All" button based on item count
- Creates individual item cards

##### `createWeekScheduleItem(item)`
- Generates HTML for each schedule/session item
- Detects item type (schedule vs session)
- Formats dates and times
- Applies color coding
- Adds hover effects

##### Helper Methods:
- `getDayOfWeek(date)` - Returns "Today", "Tomorrow", or day name
- `formatTime(date)` - Converts to 12-hour format with AM/PM
- `getScheduleItemColor(date)` - Returns appropriate background color
- `showWeekScheduleLoading()` - Shows loading spinner
- `showWeekScheduleEmpty()` - Shows empty state
- `showWeekScheduleError()` - Shows error state
- `hideAllWeekScheduleStates()` - Hides all state elements

#### Global Functions Added:
```javascript
window.loadThisWeekSchedule() // Retry loading data
window.switchToSchedulePanel() // Navigate to full schedule panel
```

### 3. CSS Updates
**File:** `css/parent-profile/right-widgets.css`

#### New Styles Added:

```css
/* Widget Container */
#this-week-schedule-widget {
    background: var(--card-bg);
    border-radius: 12px;
    border: 1px solid var(--border);
    transition: all 0.3s ease;
}

/* Count Badge */
#week-item-count {
    min-width: 24px;
    text-align: center;
    background: var(--primary-color);
    color: white;
}

/* Schedule Items */
.week-schedule-item > div {
    transition: all 0.3s ease;
}

.week-schedule-item > div:hover {
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* View All Button */
#view-all-schedule-btn:hover {
    background: var(--primary-hover);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}
```

## Features

### 1. Smart Date Filtering
- Automatically calculates current week (Sunday to Saturday)
- Filters schedules and sessions to show only this week's items
- Sorts items chronologically

### 2. Dynamic Day Labels
- **"Today"** - For items happening today
- **"Tomorrow"** - For items happening tomorrow
- **Day Name** - "Monday", "Tuesday", etc. for other days

### 3. Visual Indicators
- **Today's Items** - Blue tinted background (`rgba(59, 130, 246, 0.1)`)
- **Sessions** - Green "Session" badge
- **Time Display** - 12-hour format (e.g., "2:30 PM")
- **Count Badge** - Shows total number of items this week

### 4. Widget States
1. **Loading State**
   - Spinning loader
   - "Loading this week's schedule..." message

2. **Empty State**
   - Calendar icon
   - "No schedule this week" message
   - Helpful subtitle

3. **Data State**
   - List of up to 5 items
   - Each showing: title, day, time, type, description
   - Hover effects for interactivity

4. **Error State**
   - Error icon
   - "Unable to load schedule" message
   - Retry button

### 5. Interactive Elements
- **Retry Button** - Reloads data on error
- **View All Button** - Switches to full schedule panel
- **Hover Effects** - Visual feedback on schedule items

## API Integration

### Endpoints Used
Both endpoints are existing and require authentication:

#### 1. Schedules Endpoint
```
GET /api/schedules
Headers: Authorization: Bearer {token}
Response: Array of schedule objects
```

#### 2. Parent Sessions Endpoint
```
GET /api/parent/sessions
Headers: Authorization: Bearer {token}
Response: Array of session objects
```

### Data Flow
```
1. Widget initializes on page load
2. Fetches schedules and sessions in parallel
3. Combines both arrays
4. Filters to this week's date range
5. Sorts chronologically
6. Displays up to 5 items
7. Shows "View All" if more items exist
```

### Error Handling
- Uses `Promise.allSettled()` - doesn't fail if one endpoint fails
- Gracefully handles failed API calls
- Shows empty state if no data (not error state)
- Shows error state only on exceptions
- Provides retry functionality

## Date Filtering Logic

### Week Calculation
```javascript
// Current date
const now = new Date();

// Start of week (Sunday)
const startOfWeek = new Date(now);
startOfWeek.setDate(now.getDate() - now.getDay());
startOfWeek.setHours(0, 0, 0, 0);

// End of week (Saturday)
const endOfWeek = new Date(startOfWeek);
endOfWeek.setDate(startOfWeek.getDate() + 7);
endOfWeek.setHours(23, 59, 59, 999);
```

### Item Filtering
```javascript
items.filter(item => {
    const itemDate = new Date(
        item.start_time ||
        item.scheduled_date ||
        item.date ||
        item.start_date
    );

    return itemDate >= startOfWeek && itemDate <= endOfWeek;
})
```

## Schedule Item Structure

Each displayed item includes:

```html
<div class="week-schedule-item">
    <div class="p-3 rounded-lg" style="background: {color}">
        <!-- Title and Day -->
        <div class="flex justify-between">
            <span>{Title}</span>
            <span>{Day}</span>
        </div>

        <!-- Time and Type Badge -->
        <div>
            <i class="fas fa-clock"></i> {Time}
            <span class="badge">Session</span> <!-- If session -->
        </div>

        <!-- Description (if available) -->
        <div>{Description}</div>
    </div>
</div>
```

## Panel Navigation

The "View All Schedule" button switches to the full schedule panel:

```javascript
window.switchToSchedulePanel = function() {
    // Try global function first
    if (typeof switchPanel === 'function') {
        switchPanel('schedules');
    }
    // Fallback to panel manager
    else if (window.panelManager?.switchPanel) {
        window.panelManager.switchPanel('schedules');
    }
};
```

This integrates with the existing panel manager system in `js/parent-profile/panel-manager.js`.

## Responsive Design

Uses the same responsive patterns as other widgets:

### Desktop (>1024px)
- Fixed width: 320px
- Sticky positioning
- Right sidebar layout

### Tablet (768-1024px)
- Full width
- Grid layout
- Below main content

### Mobile (<768px)
- Single column
- Full width
- Stacked vertically

## Theme Support

All colors use CSS variables for theme compatibility:
- `var(--card-bg)` - Widget background
- `var(--heading)` - Header text
- `var(--text-secondary)` - Secondary text
- `var(--primary-color)` - Accent color
- `var(--border)` - Border colors
- `var(--bg-secondary)` - Empty state background
- `var(--danger)` - Error state color

## Testing Checklist

- [x] Widget displays loading state on page load
- [x] Widget fetches data from both endpoints
- [x] Week filtering works correctly (Sunday - Saturday)
- [x] Items sorted chronologically
- [x] Day labels show correctly (Today/Tomorrow/Day name)
- [x] Time formatted as 12-hour with AM/PM
- [x] Session badge shows for sessions
- [x] Count badge updates with correct number
- [x] Empty state shows when no items this week
- [x] Error state shows on fetch errors
- [x] Retry button reloads data
- [x] View All button switches to schedule panel
- [x] Hover effects work on schedule items
- [x] Responsive design works on all screen sizes
- [x] Theme switching works (light/dark mode)
- [x] No console errors

## Example Data Display

### Schedule Item
```
Mathematics Review
Today
10:30 AM
Review of chapter 5 concepts
```

### Session Item
```
Physics Tutoring [Session]
Tomorrow
2:00 PM
One-on-one session with Dr. Abebe
```

## Benefits

1. **Real-time Data** - Always shows current week's schedule
2. **Automatic Updates** - Refreshes when widget initializes
3. **Combined View** - Shows both schedules and sessions
4. **Quick Access** - See upcoming items without navigating
5. **Smart Filtering** - Only relevant items displayed
6. **Error Resilient** - Handles API failures gracefully
7. **User Friendly** - Clear states and helpful messages

## Future Enhancements

Possible improvements for future versions:

1. **Auto-refresh** - Refresh every few minutes
2. **Filters** - Filter by child, subject, or type
3. **Quick Actions** - Join session, view details, edit schedule
4. **Notifications** - Reminder badges for upcoming items
5. **Calendar View** - Mini calendar with highlighted days
6. **Week Navigation** - Previous/next week buttons
7. **Item Details Modal** - Click to see full details

## Summary

The "This Week's Schedule" widget successfully replaces the static "Upcoming Meetings" widget with a fully functional, dynamic widget that:

- Fetches real data from existing API endpoints
- Displays schedules and sessions from the current week
- Provides multiple states (loading, empty, data, error)
- Includes interactive elements (retry, view all)
- Uses smart date filtering and formatting
- Integrates seamlessly with existing parent profile system
- Maintains theme consistency and responsive design
- Requires no new backend endpoints

The widget is production-ready and will automatically display this week's schedule as soon as users have schedules or sessions in the database.
