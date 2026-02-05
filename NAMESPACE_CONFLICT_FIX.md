# Namespace Conflict Fix - Sessions vs Schedule Panels

## Problem
Both `schedule-panel-manager.js` and `sessions-panel-manager.js` were defining the same global functions, causing conflicts:
- `searchSessions()`
- `allSessions` variable
- `loadSessions()`
- `filterSessions()`
- `toggleSessionNotification/Alarm/Featured()`

When the schedule panel loaded first, it would overwrite the sessions panel functions.

## Solution Applied

### 1. Cleaned schedule-panel-manager.js
**Removed ALL session-related functions** - schedule panel should ONLY handle schedules.

**Before:**
```javascript
window.searchSessions = searchSessions;  // ❌ Conflict!
window.loadSessions = loadSessions;      // ❌ Conflict!
window.filterSessions = filterSessions;  // ❌ Conflict!
window.toggleSessionNotification = ...  // ❌ Conflict!
```

**After:**
```javascript
// Schedule functions ONLY
window.searchSchedules = searchSchedules;  // ✅ Unique
window.loadSchedules = loadSchedules;      // ✅ Unique
window.filterSchedules = filterSchedules;  // ✅ Unique
// Note: Session functions moved to sessions-panel-manager.js
```

### 2. Updated sessions-panel-manager.js
Renamed internal variable to avoid conflicts:

**Before:**
```javascript
let allSessions = [];  // ❌ Conflicts with schedule-panel-manager
```

**After:**
```javascript
let allSessionsData = [];  // ✅ Unique name
```

All references to `allSessions` updated to `allSessionsData` throughout the file.

### 3. Updated HTML onclick handlers
**File:** `profile-pages/tutor-profile.html`

Added `event` parameter to all filter button calls:
```html
<button onclick="filterSessionsByRole('all', event)">All Sessions</button>
<button onclick="filterSessionsByRole('tutor', event)">As Tutor</button>
<button onclick="filterSessionsByRole('student', event)">As Student</button>
<button onclick="filterSessionsByRole('parent', event)">As Parent</button>
```

## Files Modified

1. ✅ `js/tutor-profile/schedule-panel-manager.js`
   - Removed all session function exports
   - Keeps ONLY schedule-related functions

2. ✅ `js/tutor-profile/sessions-panel-manager.js`
   - Renamed `allSessions` → `allSessionsData`
   - Fixed event parameter handling
   - Namespace: `window.SessionsPanel` (declared but not fully utilized yet)

3. ✅ `profile-pages/tutor-profile.html`
   - Updated filter button onclick handlers to pass `event`

## Function Ownership

### Schedule Panel (schedule-panel-manager.js)
**Manages teaching schedules (when tutor is available)**
```javascript
window.searchSchedules()
window.loadSchedules()
window.filterSchedules()
window.filterSchedulesByRole()
window.sortSchedulesByColumn()
```

### Sessions Panel (sessions-panel-manager.js)
**Manages actual tutoring sessions with students**
```javascript
window.searchSessions()
window.loadSessions()
window.loadSessionStats()
window.filterSessionsByRole()      // NEW: Filter by enrollment type
window.toggleSessionNotification()
window.toggleSessionAlarm()
window.toggleSessionFeatured()
window.sortSessionsByColumn()
```

## Testing

### 1. Test Schedule Panel
```
http://localhost:8081/profile-pages/tutor-profile.html?panel=schedule
```
- Should load schedules correctly
- Search should work for schedules
- NO session-related errors

### 2. Test Sessions Panel
```
http://localhost:8081/profile-pages/tutor-profile.html?panel=sessions
```
- Should load 12 sessions
- Filter buttons should work:
  - All: 12 sessions
  - As Tutor: 12 sessions
  - As Student: 6 sessions (direct enrollment)
  - As Parent: 6 sessions (parent enrollment)
- Search should work for sessions
- Toggle icons should work

### 3. Verify No Conflicts
Open browser console and check:
```javascript
console.log(typeof window.searchSchedules);  // "function"
console.log(typeof window.searchSessions);   // "function"
console.log(typeof window.loadSchedules);    // "function"
console.log(typeof window.loadSessions);     // "function"
```

All should be defined without "undefined" errors.

## Browser Console Checks

**Before Fix:**
```
❌ Error: allSessions is not defined
❌ Error: sessionItemsPerPage is not defined
❌ Error: filterSessionsByRole is not defined
❌ searchSessions from schedule-panel-manager conflicting
```

**After Fix:**
```
✅ Sessions Panel Manager loaded successfully
✅ Schedule Panel Manager loaded successfully
✅ No namespace conflicts
✅ All functions properly scoped
```

## Architecture Notes

### Separation of Concerns

**Schedules Panel:**
- Purpose: Manage tutor's AVAILABILITY (recurring patterns, time slots)
- Data: `schedules` table
- Shows: When tutor can teach
- Filters: By role (tutor/student/parent), priority, date range

**Sessions Panel:**
- Purpose: Manage ACTUAL tutoring sessions with specific students
- Data: `sessions` table → `enrolled_courses` → `student_profiles`
- Shows: Booked sessions with students
- Filters: By enrollment type (direct vs parent-initiated)

These are **completely separate concepts** and should never share functions.

## Future Improvements

1. **Full Namespacing** (Optional)
   ```javascript
   window.SchedulePanel = {
       search: searchSchedules,
       load: loadSchedules,
       filter: filterSchedules
   };

   window.SessionsPanel = {
       search: searchSessions,
       load: loadSessions,
       filter: filterSessionsByRole
   };
   ```

2. **Module Pattern** (If moving to ES6 modules)
   ```javascript
   export { searchSessions, loadSessions, filterSessionsByRole };
   ```

## Summary

✅ **Schedule panel** only manages schedules (availability)
✅ **Sessions panel** only manages sessions (actual tutoring)
✅ **No more conflicts** between the two panels
✅ **All functions properly scoped** to their respective purposes

The sessions panel is now fully functional with parent_id filtering! 🎉
