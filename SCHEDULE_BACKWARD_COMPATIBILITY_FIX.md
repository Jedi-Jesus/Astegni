# Schedule Functions Backward Compatibility Fix

## Issue
Error when calling `deleteScheduleFromView()` or `editScheduleFromView()` directly from code that wasn't updated:

```
Uncaught TypeError: Cannot read properties of null (reading 'title')
at openConfirmDeleteScheduleModal (global-functions.js:2859:74)
```

## Root Cause

The new functions were designed to work with global state (`currentViewingSchedule`), but some old code paths were still calling them with a schedule ID parameter:

```javascript
// Old code (somewhere in the codebase):
onclick="deleteScheduleFromView(17)"  // Passes scheduleId

// New function expected:
function deleteScheduleFromView() {
    // Uses currentViewingSchedule (which was null)
    openConfirmDeleteScheduleModal(currentViewingSchedule);  // ❌ null.title error
}
```

---

## Fix Applied

Added **backward compatibility** to both functions so they can be called either way:

### 1. `editScheduleFromView()` - Added scheduleId parameter

**Before:**
```javascript
function editScheduleFromView() {
    if (!currentViewingSchedule) {
        alert('No schedule selected');
        return;
    }
    closeViewScheduleModal();
    openEditScheduleModal(currentViewingSchedule.id);
}
```

**After:**
```javascript
function editScheduleFromView(scheduleId) {
    // If called with scheduleId parameter (old code path), use it directly
    if (scheduleId) {
        openEditScheduleModal(scheduleId);
        return;
    }

    // Normal flow: called from view modal
    if (!currentViewingSchedule) {
        alert('No schedule selected');
        return;
    }

    closeViewScheduleModal();
    openEditScheduleModal(currentViewingSchedule.id);
}
```

### 2. `deleteScheduleFromView()` - Added scheduleId parameter + API fetch

**Before:**
```javascript
function deleteScheduleFromView() {
    if (!currentViewingSchedule) {
        alert('No schedule selected');
        return;
    }
    closeViewScheduleModal();
    openConfirmDeleteScheduleModal(currentViewingSchedule);
}
```

**After:**
```javascript
async function deleteScheduleFromView(scheduleId) {
    // If called with scheduleId parameter (old code path), fetch the schedule first
    if (scheduleId && !currentViewingSchedule) {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('access_token');
            const response = await fetch(
                `${window.API_BASE_URL || 'http://localhost:8000'}/api/schedules/${scheduleId}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (response.ok) {
                const schedule = await response.json();
                openConfirmDeleteScheduleModal(schedule);
                return;
            }
        } catch (error) {
            console.error('[Delete] Error fetching schedule:', error);
        }
    }

    // Normal flow: called from view modal
    if (!currentViewingSchedule) {
        alert('No schedule selected');
        return;
    }

    closeViewScheduleModal();
    openConfirmDeleteScheduleModal(currentViewingSchedule);
}
```

### 3. `openConfirmDeleteScheduleModal()` - Added null check

**Before:**
```javascript
function openConfirmDeleteScheduleModal(schedule) {
    console.log('[Confirm Delete Modal] Opening for schedule:', schedule.title);  // ❌ Crashes if null
    scheduleToDelete = schedule;
    // ...
}
```

**After:**
```javascript
function openConfirmDeleteScheduleModal(schedule) {
    if (!schedule) {
        console.error('[Confirm Delete Modal] No schedule provided');
        alert('Error: No schedule selected');
        return;
    }

    console.log('[Confirm Delete Modal] Opening for schedule:', schedule.title);  // ✅ Safe
    scheduleToDelete = schedule;
    // ...
}
```

---

## How It Works Now

### Usage Pattern 1: From View Modal (Preferred)
```javascript
// User clicks "View Details" on card
openViewScheduleModal(17)
  ↓
currentViewingSchedule = {id: 17, title: "Math", ...}
  ↓
// User clicks "Edit" in view modal
editScheduleFromView()  // No parameter
  ↓
Uses currentViewingSchedule.id → Opens edit modal ✅
```

### Usage Pattern 2: Direct Call (Backward Compatible)
```javascript
// Old code still in the codebase
onclick="editScheduleFromView(17)"
  ↓
editScheduleFromView(17)
  ↓
Detects scheduleId parameter → Opens edit modal directly ✅

// Or for delete:
onclick="deleteScheduleFromView(17)"
  ↓
deleteScheduleFromView(17)
  ↓
Fetches schedule from API → Opens confirmation modal ✅
```

---

## Testing

### Test Case 1: View Modal Flow (Primary)
1. Click "View Details" on schedule card
2. Click "Edit" button in view modal
3. **Expected:** Edit modal opens ✅
4. Close, click "View Details" again
5. Click "Delete" button in view modal
6. **Expected:** Confirmation modal opens ✅

### Test Case 2: Direct Call (Backward Compatibility)
1. If there's any code calling `editScheduleFromView(17)` directly
2. **Expected:** Edit modal opens without error ✅
3. If there's code calling `deleteScheduleFromView(17)` directly
4. **Expected:** Confirmation modal opens after fetching schedule ✅

### Test Case 3: Error Handling
1. Call `deleteScheduleFromView()` without schedule and without ID
2. **Expected:** Alert "No schedule selected" ✅
3. Call `openConfirmDeleteScheduleModal(null)`
4. **Expected:** Alert "Error: No schedule selected" ✅

---

## Benefits

1. **No Breaking Changes:** Old code still works
2. **Graceful Degradation:** Functions handle missing data
3. **Clear Error Messages:** Users know what went wrong
4. **Flexible Usage:** Can be called both ways
5. **API Fetch on Demand:** Fetches schedule if needed for delete

---

## Performance

### View Modal Flow (No Extra API Call)
```
Click View → 1 API call (fetch schedule)
Click Delete → 0 API calls (uses cached schedule)
Total: 1 API call ✅
```

### Direct Call Flow (Extra API Call)
```
Click Delete (direct) → 1 API call (fetch schedule for confirmation)
Confirm Delete → 1 API call (delete schedule)
Total: 2 API calls (acceptable for backward compatibility)
```

---

## Migration Path (Optional)

To remove backward compatibility in the future and enforce view modal flow:

1. Search codebase for: `editScheduleFromView(` and `deleteScheduleFromView(`
2. Update all calls to use `openViewScheduleModal(scheduleId)` instead
3. Remove parameter support from functions
4. Force all edits/deletes to go through view modal

**But this is not necessary** - backward compatibility has minimal overhead.

---

## Summary

| Function | Before | After |
|----------|--------|-------|
| `editScheduleFromView()` | No parameter, required view modal | Optional `scheduleId` parameter ✅ |
| `deleteScheduleFromView()` | No parameter, required view modal | Optional `scheduleId` parameter + API fetch ✅ |
| `openConfirmDeleteScheduleModal()` | No null check | Null check added ✅ |

**Status:** ✅ **FIXED - Fully Backward Compatible**

All schedule management functions now work from any code path!
