# Schedule Function Conflict Fix

## Issue
When clicking view/edit/delete from schedule cards, the system was calling old placeholder functions from `schedule-manager.js` instead of the new complete implementations in `global-functions.js`.

**Error:**
```
Failed to load resource: the server responded with a status of 422 (Unprocessable Content)
/api/schedules/undefined

Error: Failed to delete schedule
```

## Root Cause

### Duplicate Function Definitions

**In `schedule-manager.js` (lines 242-296):**
```javascript
function viewSchedule(scheduleId) { ... }           // Old placeholder
function editScheduleFromView(scheduleId) { ... }   // Old placeholder
function deleteScheduleFromView(scheduleId) { ... } // Old placeholder with direct delete
```

**In `global-functions.js` (lines 2600+):**
```javascript
function openViewScheduleModal(scheduleId) { ... }  // New complete implementation
function editScheduleFromView() { ... }             // New - uses currentViewingSchedule
function deleteScheduleFromView() { ... }           // New - uses currentViewingSchedule
```

### The Problem

1. **Schedule card** calls `openViewScheduleModal(scheduleId)` ✅ Works
2. **View modal** calls `editScheduleFromView()` - but schedule-manager.js version expects `scheduleId` parameter
3. **View modal** calls `deleteScheduleFromView()` - but schedule-manager.js version expects `scheduleId` parameter
4. Since no ID is passed, it becomes `undefined` → 422 error

### Why This Happened

The schedule-manager.js was loaded **AFTER** global-functions.js (line 6127 vs 6052), so its function definitions overwrote the global-functions.js versions.

---

## Fix Applied

### File: `js/student-profile/schedule-manager.js`

**Removed old placeholder functions (lines 242-296):**
```javascript
// DELETED:
function viewSchedule(scheduleId) { ... }
function editScheduleFromView(scheduleId) { ... }
function deleteScheduleFromView(scheduleId) { ... }
```

**Replaced with comment:**
```javascript
// Note: The following functions are now defined in global-functions.js:
// - openViewScheduleModal(scheduleId)
// - editScheduleFromView() (no parameter - uses currentViewingSchedule)
// - deleteScheduleFromView() (no parameter - uses currentViewingSchedule)
// - openCreateScheduleModal()
// These are all exported to window and available globally.
```

---

## How It Works Now

### Complete Flow:

```javascript
// 1. Schedule Card → View Modal
onclick="openViewScheduleModal(17)"
  ↓
global-functions.js: openViewScheduleModal(17)
  ↓
Fetches schedule from API
Stores in: currentViewingSchedule = {id: 17, title: "...", ...}
Opens view modal

// 2. View Modal → Edit
onclick="editScheduleFromView()"  // No parameter!
  ↓
global-functions.js: editScheduleFromView()
  ↓
Uses: currentViewingSchedule.id
Calls: openEditScheduleModal(17)

// 3. View Modal → Delete
onclick="deleteScheduleFromView()"  // No parameter!
  ↓
global-functions.js: deleteScheduleFromView()
  ↓
Uses: currentViewingSchedule object
Opens confirmation modal with schedule data
```

### Key Design Pattern

**Global state variable in global-functions.js:**
```javascript
let currentViewingSchedule = null;

function openViewScheduleModal(scheduleId) {
    // Fetch schedule
    const schedule = await fetch(...);

    // Store globally
    currentViewingSchedule = schedule;  // ← Key line

    // Show modal
    modal.style.display = 'flex';
}

function editScheduleFromView() {
    // Use stored schedule
    openEditScheduleModal(currentViewingSchedule.id);
}

function deleteScheduleFromView() {
    // Use stored schedule
    openConfirmDeleteScheduleModal(currentViewingSchedule);
}
```

This eliminates parameter passing and ensures consistency.

---

## Testing

### Before Fix:
```
1. Click "View Details" → ✅ Works
2. In view modal, click "Edit" → ❌ Error: scheduleId undefined
3. In view modal, click "Delete" → ❌ 422 error: /api/schedules/undefined
```

### After Fix:
```
1. Click "View Details" → ✅ Works
2. In view modal, click "Edit" → ✅ Opens edit modal with data
3. In view modal, click "Delete" → ✅ Opens confirmation, deletes successfully
```

### Test Steps:
1. Clear cache (Ctrl+Shift+Delete)
2. Reload page (Ctrl+F5)
3. Navigate to Schedule panel
4. Click "View Details" on any schedule
5. Click "Edit" → Should open edit modal ✅
6. Close edit modal
7. Click "View Details" again
8. Click "Delete" → Should show confirmation ✅
9. Confirm deletion → Should delete successfully ✅

---

## Script Loading Order

**Current order in student-profile.html:**
```html
Line 6052: <script src="../js/student-profile/global-functions.js">
              ↓ Defines: openViewScheduleModal(), editScheduleFromView(), deleteScheduleFromView()

Line 6127: <script src="../js/student-profile/schedule-manager.js">
              ↓ No longer redefines these functions
```

**Result:** Functions from global-functions.js are used ✅

---

## Why Use Global State?

### Alternative Approaches:

**Option 1: Pass ID everywhere (rejected)**
```javascript
// Would require:
onclick="editScheduleFromView(17)"
onclick="deleteScheduleFromView(17)"

// Problem: HTML must know schedule ID, leads to coupling
```

**Option 2: Store in data attribute (rejected)**
```javascript
<button data-schedule-id="17" onclick="editScheduleFromView()">
// Problem: Must query DOM to get ID, less clean
```

**Option 3: Global state (chosen) ✅**
```javascript
let currentViewingSchedule = null;
// Advantages:
// - Clean separation of concerns
// - No DOM queries needed
// - Single source of truth
// - Easy to reset (set to null)
```

---

## Summary

| Aspect | Before Fix | After Fix |
|--------|------------|-----------|
| **Function Definitions** | Duplicate in 2 files | Only in global-functions.js |
| **Parameter Passing** | Required scheduleId | Uses global state |
| **Edit Button** | ❌ undefined error | ✅ Works |
| **Delete Button** | ❌ 422 API error | ✅ Works |
| **Code Clarity** | Confusing duplicates | Clear single source |

---

**Status:** ✅ **FIXED**

All schedule view, edit, and delete functionality now works correctly!
