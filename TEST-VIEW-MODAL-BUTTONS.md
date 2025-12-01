# Testing View Course Modal Buttons

## Issue
The action buttons in the view course modal are not showing up when clicking "View Details" on courses.

## Expected Behavior

### Requested Panel (Pending Courses)
When clicking "View Details" on a pending course in the requested panel:
- Modal should open
- Should show: **Edit, Approve, Reject** buttons

### Verified Panel (Active Courses)
When clicking "View Details" on an active course in the verified panel:
- Modal should open
- Should show: **Edit, Suspend, Reject** buttons

### Rejected Panel
When clicking "View Details" on a rejected course:
- Modal should open
- Should show: **Reconsider** button

### Suspended Panel
When clicking "View Details" on a suspended course:
- Modal should open
- Should show: **Reinstate, Reject** buttons

## Test Steps

### 1. Start Backend Server
```bash
cd astegni-backend
python app.py
```

### 2. Start Frontend Server
```bash
cd ..
python -m http.server 8080
```

### 3. Test Each Panel

#### Test Requested Panel
1. Open http://localhost:8080/admin-pages/manage-courses.html
2. Navigate to "Course Requests" panel
3. Click "View Details" on any pending course
4. **Expected**: Modal opens with Edit, Approve, Reject buttons
5. **Check**: Open browser console (F12) and look for any errors
6. **Check**: Inspect the `#view-course-actions` div to see if buttons were added

#### Test Verified Panel
1. Navigate to "Active Courses" panel
2. Click "View Details" on any active course
3. **Expected**: Modal opens with Edit, Suspend, Reject buttons
4. **Check**: Browser console for errors
5. **Check**: Inspect the `#view-course-actions` div

#### Test Rejected Panel
1. Navigate to "Rejected Courses" panel
2. Click "View Details" on any rejected course
3. **Expected**: Modal opens with Reconsider button

#### Test Suspended Panel
1. Navigate to "Suspended Courses" panel
2. Click "View Details" on any suspended course
3. **Expected**: Modal opens with Reinstate, Reject buttons

## Debug Console Commands

Open browser console (F12) and run these commands to check:

```javascript
// Check if functions exist
console.log('viewCourseRequest:', typeof viewCourseRequest);
console.log('viewCourse:', typeof viewCourse);
console.log('editCourseRequest:', typeof editCourseRequest);
console.log('editCourse:', typeof editCourse);
console.log('rejectCourse:', typeof rejectCourse);

// Check if modal elements exist
console.log('Modal:', document.getElementById('view-course-modal'));
console.log('Actions container:', document.getElementById('view-course-actions'));

// After clicking View Details, check if buttons were added
console.log('Actions HTML:', document.getElementById('view-course-actions').innerHTML);
```

## Common Issues & Solutions

### Issue 1: Functions Not Defined
**Symptom**: Console shows "ReferenceError: viewCourseRequest is not defined"
**Solution**: Check that manage-courses-standalone.js is loaded correctly

### Issue 2: Actions Container is Empty
**Symptom**: `view-course-actions` innerHTML is empty
**Solution**:
- Check if the course status is being set correctly
- Verify the condition in viewCourseRequest/viewCourse functions
- Add console.log to track the flow

### Issue 3: Buttons Added But Not Visible
**Symptom**: innerHTML shows buttons but they're not visible
**Solution**: Check CSS z-index and display properties

### Issue 4: Wrong Buttons Showing
**Symptom**: Buttons for different panel showing
**Solution**: Check which function is being called (viewCourseRequest vs viewCourse)

## Quick Debug Addition

Add this to the JavaScript to debug button visibility:

```javascript
// In viewCourseRequest function, after setting actionsContainer.innerHTML:
console.log('===== DEBUG: Requested Panel Buttons =====');
console.log('Course status:', course.status);
console.log('Actions HTML:', actionsContainer.innerHTML);
console.log('Actions container visible:', actionsContainer.offsetParent !== null);

// In viewCourse function, after setting actionsContainer.innerHTML:
console.log('===== DEBUG: Verified Panel Buttons =====');
console.log('Course status:', course.status);
console.log('Actions HTML:', actionsContainer.innerHTML);
console.log('Actions container visible:', actionsContainer.offsetParent !== null);
```

## Backend Check

Verify the backend is returning the correct course status:

```bash
# Check course requests
curl http://localhost:8000/api/course-management/requests

# Check active courses
curl http://localhost:8000/api/course-management/active

# Check rejected courses
curl http://localhost:8000/api/course-management/rejected

# Check suspended courses
curl http://localhost:8000/api/course-management/suspended
```

## Expected API Response Structure

### Course Request Response
```json
{
  "courses": [
    {
      "request_id": "REQ-CRS-001",
      "title": "Advanced Mathematics",
      "category": "Mathematics",
      "level": "Grade 11-12",
      "status": "pending",  // <- Important!
      ...
    }
  ]
}
```

### Active Course Response
```json
{
  "courses": [
    {
      "course_id": "CRS-001",
      "title": "Introduction to Python",
      "category": "Technology",
      "status": "active",  // <- Important!
      ...
    }
  ]
}
```

## Manual Test

If buttons still don't show, manually test by opening browser console and running:

```javascript
// Test requested panel buttons
const actionsContainer = document.getElementById('view-course-actions');
actionsContainer.innerHTML = `
    <button onclick="editCourseRequest('REQ-CRS-001')"
        class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
        <i class="fas fa-edit"></i> Edit
    </button>
    <button onclick="approveCourseRequest('REQ-CRS-001')"
        class="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
        <i class="fas fa-check"></i> Approve
    </button>
    <button onclick="rejectCourseRequest('REQ-CRS-001')"
        class="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
        <i class="fas fa-times"></i> Reject
    </button>
`;

// Open the modal to see if buttons appear
document.getElementById('view-course-modal').classList.remove('hidden');
document.getElementById('view-course-modal').classList.add('flex');
```

If buttons appear with this manual test, the issue is in the viewCourseRequest/viewCourse functions logic.
