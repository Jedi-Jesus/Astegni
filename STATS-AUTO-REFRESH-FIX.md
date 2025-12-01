# Stats Auto-Refresh Fix

## Problem
When clicking "View Details" on a course request in the Requested Courses panel, the stats weren't updating even though the backend was changing the status from `'new'` to `'under_review'`.

## Root Cause
The `viewCourseRequest()` function was only reading data from the DOM (the table row) and displaying it in a modal. It **wasn't calling the backend API**, so:
1. The backend status update wasn't triggered
2. The stats weren't refreshed after viewing

## Solution Implemented

### 1. Updated `viewCourseRequest()` to Fetch from API
**File:** `js/admin-pages/manage-courses.js`

Changed from DOM-based to API-based:
```javascript
// OLD: Read from DOM row
window.viewCourseRequest = function(requestId) {
    const row = findCourseRow(requestId);
    const courseData = extractCourseData(row, requestId);
    // ... show in modal
}

// NEW: Fetch from API
window.viewCourseRequest = async function(requestId) {
    const response = await fetch(`${API_BASE_URL}/api/course-management/requests/${requestId}`);
    const courseData = await response.json();
    // ... show in modal

    // IMPORTANT: Refresh stats after 500ms
    setTimeout(() => {
        window.DashboardLoader.loadPanelStats('requested');
    }, 500);
}
```

### 2. Added Auto-Refresh on Modal Close
```javascript
window.closeViewCourseModal = function() {
    modal.classList.add('hidden');

    // Refresh stats when closing (in case status changed)
    if (window.DashboardLoader && typeof window.DashboardLoader.loadPanelStats === 'function') {
        window.DashboardLoader.loadPanelStats('requested');
    }
};
```

### 3. Created Missing Function
Added `approveCourseFromModal()` which was called but didn't exist:
```javascript
window.approveCourseFromModal = async function(requestId) {
    closeViewCourseModal();
    await approveCourse(requestId);
};
```

### 4. Added Status Badge Helper
```javascript
function getStatusBadge(status) {
    const badges = {
        'new': '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">New</span>',
        'under_review': '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Under Review</span>',
        'pending': '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">Pending</span>'
    };
    return badges[status] || badges['pending'];
}
```

## How It Works Now

### Workflow
```
1. Admin clicks "View Details" on course request
   ↓
2. Frontend calls: GET /api/course-management/requests/REQ-CRS-001
   ↓
3. Backend auto-updates: status 'new' → 'under_review'
   ↓
4. Frontend receives updated course data with new status
   ↓
5. Modal displays course with "Under Review" badge
   ↓
6. After 500ms, stats refresh automatically
   ↓
7. Stats update: "New Requests" decreases, "Under Review" increases
   ↓
8. When modal closes, stats refresh again (safety net)
```

### What Gets Refreshed
When `DashboardLoader.loadPanelStats('requested')` is called:
1. Fetches from `/api/course-management/requests/stats/by-status`
2. Updates all 4 stat cards:
   - **New Requests** (yellow)
   - **Under Review** (blue)
   - **Approved Today** (green)
   - **Rejected** (red)

## Benefits

✅ **Automatic Status Update** - Status changes from 'new' to 'under_review' when admin views
✅ **Real-Time Stats** - Stats update immediately after viewing a request
✅ **Dual Refresh Points** - Refreshes both when opening (after 500ms) and closing modal
✅ **Proper API Integration** - Uses backend data instead of DOM scraping
✅ **Status Badge Display** - Modal shows current status with proper styling

## Testing

### Test Scenario 1: View New Request
1. Go to Requested Courses panel
2. Note "New Requests" count (e.g., 5)
3. Click "View Details" on any request with "New" status
4. Wait 1 second
5. ✅ "New Requests" should decrease (5 → 4)
6. ✅ "Under Review" should increase (2 → 3)

### Test Scenario 2: View Already Under Review
1. Click "View Details" on request with "Under Review" status
2. Wait 1 second
3. ✅ Stats should remain the same (no change)

### Test Scenario 3: Approve from Modal
1. Click "View Details" on any request
2. Click "Approve Course" button
3. ✅ Modal closes
4. ✅ Stats refresh automatically
5. ✅ "Under Review" decreases
6. ✅ "Approved Today" increases

### Test Scenario 4: Reject from Modal
1. Click "View Details" on any request
2. Click "Reject Course" button
3. Enter rejection reason
4. ✅ Modal closes
5. ✅ Stats refresh automatically
6. ✅ "Under Review" decreases
7. ✅ "Rejected" increases

## Files Modified
- ✅ `js/admin-pages/manage-courses.js`
  - Updated `viewCourseRequest()` to be async and fetch from API
  - Added status badge display
  - Added auto-refresh after viewing (500ms delay)
  - Added auto-refresh on modal close
  - Created `approveCourseFromModal()` function
  - Created `getStatusBadge()` helper

## Notes
- The 500ms delay allows the backend to finish updating before stats refresh
- The modal close refresh is a safety net in case the 500ms refresh fails
- Existing approve/reject functions already call `refreshPanelStats()` so no changes needed there

## Verification
To verify the fix is working:
1. Open browser console (F12)
2. Click "View Details" on a course request
3. Look for console logs:
   ```
   Viewing course request: REQ-CRS-001
   Fetched course data: {status: 'under_review', ...}
   Requested panel stats loaded with status tracking: {new: 4, under_review: 3, ...}
   ```
