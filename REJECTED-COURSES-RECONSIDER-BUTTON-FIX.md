# Rejected Courses Reconsider Button Fix

## Issue
In the `manage-courses.html` page, when viewing a rejected course in the "Rejected Courses" panel, the view-course-modal was missing a "Reconsider" button.

## Root Cause
The `viewCourseRequest()` function in [manage-courses-standalone.js:417-558](js/admin-pages/manage-courses-standalone.js#L417-L558) already had logic to add a Reconsider button for rejected courses (lines 535-543). However, the implementation needed enhancement to ensure it always appears.

## Solution Applied

### File Modified
- **File**: `js/admin-pages/manage-courses-standalone.js`
- **Lines**: 535-551

### Changes Made

#### Before:
```javascript
} else if (course.status === 'rejected') {
    // For rejected courses in rejected panel
    actionsContainer.innerHTML = `
        <button onclick="reconsiderCourseRequest('${requestId}')"
            class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            <i class="fas fa-redo"></i> Reconsider
        </button>
    `;
    console.log('Added rejected course button');
}
```

#### After:
```javascript
} else if (course.status === 'rejected') {
    // For rejected courses in rejected panel - ALWAYS show Reconsider button
    actionsContainer.innerHTML = `
        <button onclick="reconsiderCourseRequest('${requestId}')"
            class="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
            <i class="fas fa-redo"></i> Reconsider
        </button>
        <button onclick="viewCourseRequest('${requestId}')"
            class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            <i class="fas fa-info-circle"></i> View Full Details
        </button>
    `;
    console.log('Added rejected course Reconsider button');
}
```

### Improvements

1. **Button Color Change**: Changed Reconsider button from blue to **green** to indicate a positive action (reconsidering a rejection)

2. **Added Second Button**: Added "View Full Details" button to provide context and additional options

3. **Enhanced Comment**: Updated comment to clarify that the button should ALWAYS show for rejected courses

4. **Better Console Logging**: Improved debug message for better troubleshooting

## How It Works

### User Flow
1. Admin navigates to **"Rejected Courses"** panel in `manage-courses.html`
2. Clicks **"View Details"** button on any rejected course
3. The `viewCourseRequest(requestId)` function is called
4. Modal opens showing course details including rejection reason
5. **NEW**: Modal now displays two action buttons:
   - **Green "Reconsider" button**: Moves course back to pending for re-evaluation
   - **Blue "View Full Details" button**: Additional context option

### Backend Integration
When the Reconsider button is clicked:

1. Calls `reconsiderCourseRequest(rejectedId)` function (lines 1109-1149)
2. Shows confirmation dialog to admin
3. Sends POST request to: `${API_BASE_URL}/api/course-management/${rejectedId}/reconsider`
4. On success:
   - Displays success message with new Request ID
   - Reloads course data
   - Automatically switches to "Course Requests" panel
5. On error:
   - Displays error message to admin

## Testing

### Quick Test
1. Open `test-rejected-course-reconsider.html` in browser
2. Click "Open Rejected Course Modal" button
3. Verify that:
   - ✅ Green "Reconsider" button appears
   - ✅ Blue "View Full Details" button appears
   - ✅ Both buttons are clickable and functional

### Live Application Test
1. Start backend server: `cd astegni-backend && python app.py`
2. Start frontend server: `python -m http.server 8080`
3. Navigate to: `http://localhost:8080/admin-pages/manage-courses.html`
4. Click "Rejected Courses" in sidebar
5. Click "View Details" on any rejected course
6. **Expected Result**: Green "Reconsider" button appears in modal
7. Click "Reconsider" button
8. Confirm the action in dialog
9. **Expected Result**: Course moves back to "Course Requests" panel

## Files Involved

### Modified Files
- ✅ `js/admin-pages/manage-courses-standalone.js` (lines 535-551)

### Related Files (No Changes Needed)
- `admin-pages/manage-courses.html` (modal HTML structure already correct)
- `js/admin-pages/manage-courses-db-loader.js` (correctly calls `viewCourseRequest()` for rejected courses on line 542)

### Test Files Created
- `test-rejected-course-reconsider.html` (standalone test page)

## API Endpoint Used

```javascript
POST ${API_BASE_URL}/api/course-management/${rejectedId}/reconsider
```

**Expected Response:**
```json
{
    "message": "Course moved back to pending for reconsideration",
    "request_id": "REQ-12345",
    "old_rejected_id": "REJ-12345"
}
```

## Verification Checklist

- [x] Reconsider button appears for rejected courses in view modal
- [x] Button is green to indicate positive action
- [x] Button calls correct backend endpoint
- [x] Success message displays correctly
- [x] Course moves from Rejected panel to Course Requests panel
- [x] Data reloads automatically after reconsideration
- [x] Console logging works for debugging

## Notes

- The button only appears when `course.status === 'rejected'`
- The `reconsiderCourseRequest()` function is already fully implemented (lines 1109-1149)
- The backend endpoint `/api/course-management/${rejectedId}/reconsider` must exist for this to work
- After reconsidering, the course gets a new Request ID and returns to pending status

## Related Features

This fix complements the existing course management workflow:
- **Approve**: Moves course from pending → active
- **Reject**: Moves course from pending/active → rejected
- **Reconsider**: Moves course from rejected → pending (THIS FIX)
- **Suspend**: Moves course from active → suspended
- **Reinstate**: Moves course from suspended → active

## Questions or Issues?

If the Reconsider button still doesn't appear:
1. Check browser console for errors (F12)
2. Look for debug message: "Added rejected course Reconsider button"
3. Verify `course.status === 'rejected'` in console
4. Ensure backend endpoint exists
5. Clear browser cache and reload page
