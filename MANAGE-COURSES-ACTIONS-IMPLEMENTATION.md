# Manage Courses - Action Functionalities Implementation

## Overview

This document describes the implementation of **approve**, **reject**, **suspend**, **reconsider**, and **reinstate** functionalities for the `manage-courses.html` admin page.

All functionalities are **fully integrated with the backend API** and include proper error handling, notifications, and automatic panel switching.

---

## Implemented Functionalities

### 1. **Approve Course Request** ✅

**Function**: `approveCourseRequest(requestId)`

**Workflow**:
1. Admin clicks "Approve" button on a pending course request
2. Confirmation dialog appears
3. On confirm, sends `POST` request to `/api/course-management/{requestId}/approve`
4. Backend moves course from `course_requests` table to `active_courses` table
5. Backend sends notification to course requester
6. Success message shows new Course ID
7. Page reloads data and switches to "Active Courses" panel

**API Endpoint**: `POST /api/course-management/{request_id}/approve`

**Response**:
```json
{
  "message": "Course approved successfully",
  "course_id": "CRS-003",
  "status": "active",
  "notification_sent": true
}
```

**Available in panels**: Course Requests (Requested)

---

### 2. **Reject Course/Request** ✅

**Functions**:
- `rejectCourseRequest(requestId)` - For pending requests
- `rejectCourse(courseId)` - For active/suspended courses

**Workflow**:
1. Admin clicks "Reject" button
2. **Modal opens** asking for rejection reason (required)
3. Admin enters reason and clicks "Confirm Rejection"
4. Sends `POST` request to appropriate endpoint
5. Backend moves course to `rejected_courses` table
6. Backend sends notification to course creator with reason
7. Success message shows Rejection ID
8. Page reloads data and switches to "Rejected Courses" panel

**API Endpoints**:
- `POST /api/course-management/{request_id}/reject` (for requests)
- `POST /api/course-management/{course_id}/reject-active` (for active)
- `POST /api/course-management/{suspended_id}/reject-suspended` (for suspended)

**Request Body**:
```json
{
  "reason": "Content does not meet quality standards"
}
```

**Response**:
```json
{
  "message": "Course rejected successfully",
  "rejected_id": "REJ-CRS-003",
  "reason": "Content does not meet quality standards",
  "status": "rejected",
  "notification_sent": true
}
```

**Available in panels**:
- Course Requests (for pending requests)
- Active Courses (for active courses)
- Suspended Courses (for suspended courses)

---

### 3. **Suspend Active Course** ✅

**Function**: `suspendCourse(courseId)`

**Workflow**:
1. Admin clicks "Suspend" button on an active course
2. **Modal opens** asking for suspension reason (required)
3. Admin enters reason and clicks "Confirm Suspension"
4. Sends `POST` request to `/api/course-management/{courseId}/suspend`
5. Backend moves course from `active_courses` to `suspended_courses` table
6. Backend preserves enrolled students, ratings, etc.
7. Backend sends notification to course creator
8. Success message shows Suspension ID
9. Page reloads data and switches to "Suspended Courses" panel

**API Endpoint**: `POST /api/course-management/{course_id}/suspend`

**Request Body**:
```json
{
  "reason": "Quality issues reported by students"
}
```

**Response**:
```json
{
  "message": "Course suspended successfully",
  "suspended_id": "SUS-CRS-003",
  "reason": "Quality issues reported by students",
  "status": "suspended",
  "notification_sent": true
}
```

**Available in panels**: Active Courses (Verified)

---

### 4. **Reconsider Rejected Course** ✅

**Function**: `reconsiderCourseRequest(rejectedId)`

**Workflow**:
1. Admin clicks "Reconsider" button on a rejected course
2. Confirmation dialog appears
3. On confirm, sends `POST` request to `/api/course-management/{rejectedId}/reconsider`
4. Backend moves course from `rejected_courses` back to `course_requests` table
5. Generates new request ID
6. Success message shows new Request ID
7. Page reloads data and switches to "Course Requests" panel

**API Endpoint**: `POST /api/course-management/{rejected_id}/reconsider`

**Response**:
```json
{
  "message": "Course reconsidered and moved back to pending requests",
  "request_id": "REQ-CRS-015",
  "status": "pending"
}
```

**Available in panels**: Rejected Courses

---

### 5. **Reinstate Suspended Course** ✅

**Function**: `reinstateCourse(suspendedId)`

**Workflow**:
1. Admin clicks "Reinstate" button on a suspended course
2. Confirmation dialog appears
3. On confirm, sends `POST` request to `/api/course-management/{suspendedId}/reinstate`
4. Backend moves course from `suspended_courses` back to `active_courses` table
5. Preserves all course data (students, ratings, etc.)
6. Generates new course ID
7. Success message shows new Course ID
8. Page reloads data and switches to "Active Courses" panel

**API Endpoint**: `POST /api/course-management/{suspended_id}/reinstate`

**Response**:
```json
{
  "message": "Course reinstated successfully",
  "course_id": "CRS-018",
  "status": "active"
}
```

**Available in panels**: Suspended Courses

---

## New Modal Components

### 1. Reject Course Modal

**ID**: `reject-course-modal`

**Features**:
- Red theme indicating rejection action
- Required textarea for rejection reason
- Warning message about notifying course creator
- Placeholder suggestions for common rejection reasons
- Cancel and Confirm buttons
- Closes on ESC key

**Functions**:
- `closeRejectModal()` - Close the modal
- `confirmReject()` - Process the rejection

---

### 2. Suspend Course Modal

**ID**: `suspend-course-modal`

**Features**:
- Orange theme indicating suspension action
- Required textarea for suspension reason
- Info message about temporary suspension
- Placeholder suggestions for common suspension reasons
- Cancel and Confirm buttons
- Closes on ESC key

**Functions**:
- `closeSuspendModal()` - Close the modal
- `confirmSuspend()` - Process the suspension

---

## Action Buttons in View Modal

The "View Course Details" modal (`view-course-modal`) dynamically shows different action buttons based on course status:

### For Pending Requests (`status: 'pending'` / `'new'` / `'under_review'`)
```html
[Edit] [Approve] [Reject]
```

### For Active Courses (`status: 'active'` / `'verified'`)
```html
[Edit] [Suspend] [Reject]
```

### For Rejected Courses (`status: 'rejected'`)
```html
[Reconsider]
```

### For Suspended Courses (`status: 'suspended'`)
```html
[Reinstate] [Reject]
```

---

## Data Flow Diagram

```
Course Request (pending)
    ├── Approve → Active Course
    └── Reject → Rejected Course
              └── Reconsider → Course Request (pending)

Active Course
    ├── Suspend → Suspended Course
    │           ├── Reinstate → Active Course
    │           └── Reject → Rejected Course
    └── Reject → Rejected Course
```

---

## Success Messages

All actions provide user-friendly success messages:

- **Approve**: `✅ Course approved successfully! Course ID: CRS-003`
- **Reject**: `✅ Course rejected successfully! Rejection ID: REJ-CRS-003`
- **Suspend**: `⚠️ Course suspended successfully! Suspension ID: SUS-CRS-003`
- **Reconsider**: `✅ Course moved back to pending for reconsideration! New Request ID: REQ-CRS-015`
- **Reinstate**: `✅ Course reinstated successfully! New Course ID: CRS-018`

---

## Error Handling

All functions include comprehensive error handling:

```javascript
try {
    // API call
} catch (error) {
    console.error('Error:', error);
    alert('❌ Failed to [action]: ' + error.message);
}
```

Common error scenarios:
- Network failure
- Backend validation errors
- Course not found (404)
- Missing reason for reject/suspend
- Database errors

---

## Testing Guide

### Prerequisites
1. Backend server running: `cd astegni-backend && python app.py`
2. Frontend server running: `python -m http.server 8080`
3. Database initialized with course data
4. Navigate to: `http://localhost:8080/admin-pages/manage-courses.html`

### Test Case 1: Approve Course Request
1. Go to "Course Requests" panel
2. Click "View" on any pending request
3. Click "Approve" button
4. Confirm the action
5. **Expected**: Success message, switches to Active Courses panel, course appears there

### Test Case 2: Reject Course Request
1. Go to "Course Requests" panel
2. Click "View" on any pending request
3. Click "Reject" button
4. Enter rejection reason: "Insufficient course content"
5. Click "Confirm Rejection"
6. **Expected**: Success message, switches to Rejected Courses panel, course appears there

### Test Case 3: Suspend Active Course
1. Go to "Active Courses" panel
2. Click "View" on any active course
3. Click "Suspend" button
4. Enter suspension reason: "Quality issues reported"
5. Click "Confirm Suspension"
6. **Expected**: Success message, switches to Suspended Courses panel, course appears there

### Test Case 4: Reconsider Rejected Course
1. Go to "Rejected Courses" panel
2. Click "View" on any rejected course
3. Click "Reconsider" button
4. Confirm the action
5. **Expected**: Success message, switches to Course Requests panel, course appears there

### Test Case 5: Reinstate Suspended Course
1. Go to "Suspended Courses" panel
2. Click "View" on any suspended course
3. Click "Reinstate" button
4. Confirm the action
5. **Expected**: Success message, switches to Active Courses panel, course appears there

### Test Case 6: Reject Active Course
1. Go to "Active Courses" panel
2. Click "View" on any active course
3. Click "Reject" button
4. Enter rejection reason: "Policy violation"
5. Click "Confirm Rejection"
6. **Expected**: Success message, switches to Rejected Courses panel, course appears there

### Test Case 7: Reject Suspended Course
1. Go to "Suspended Courses" panel
2. Click "View" on any suspended course
3. Click "Reject" button
4. Enter rejection reason: "Cannot be fixed"
5. Click "Confirm Rejection"
6. **Expected**: Success message, switches to Rejected Courses panel, course appears there

### Test Case 8: Modal ESC Key
1. Click any "Reject" or "Suspend" button to open modal
2. Press ESC key
3. **Expected**: Modal closes without taking action

### Test Case 9: Modal Cancel Button
1. Click any "Reject" or "Suspend" button to open modal
2. Click "Cancel" button
3. **Expected**: Modal closes without taking action

### Test Case 10: Empty Rejection Reason
1. Click "Reject" on any course
2. Leave reason field empty
3. Click "Confirm Rejection"
4. **Expected**: Alert "Please provide a reason for rejection"

---

## Backend Database Changes

All actions result in database changes:

### Approve
- **Deletes** row from `course_requests`
- **Inserts** row into `active_courses`
- **Inserts** notification into `notifications`

### Reject
- **Deletes** row from source table (`course_requests`, `active_courses`, or `suspended_courses`)
- **Inserts** row into `rejected_courses` with `rejection_reason`
- **Inserts** notification into `notifications`

### Suspend
- **Deletes** row from `active_courses`
- **Inserts** row into `suspended_courses` with `suspension_reason`
- **Preserves** all course data (students, ratings)
- **Inserts** notification into `notifications`

### Reconsider
- **Deletes** row from `rejected_courses`
- **Inserts** row into `course_requests`

### Reinstate
- **Deletes** row from `suspended_courses`
- **Inserts** row into `active_courses`
- **Preserves** all course data (students, ratings)

---

## Files Modified

### 1. `admin-pages/manage-courses.html`
- Added `reject-course-modal` HTML
- Added `suspend-course-modal` HTML

### 2. `js/admin-pages/manage-courses-standalone.js`
- Added `approveCourseRequest()` with full API integration
- Added `rejectCourseRequest()` with modal handling
- Added `rejectCourse()` for active/suspended courses
- Added `confirmReject()` with API calls
- Added `closeRejectModal()` for modal management
- Added `suspendCourse()` with modal handling
- Added `confirmSuspend()` with API call
- Added `closeSuspendModal()` for modal management
- Added `reinstateCourse()` with API call
- Added `reconsiderCourseRequest()` with API call
- Updated `ModalManager` to include new modals
- Added `currentCourseActionId` and `currentCourseActionType` state variables

### 3. Backend (already existed)
- `astegni-backend/course_management_endpoints.py` - All endpoints already implemented

---

## API Configuration

The API base URL is configured in the JavaScript:

```javascript
const API_BASE_URL = 'http://localhost:8000';
```

For production, update this to your production backend URL.

---

## Features Summary

✅ **Full Backend Integration** - All actions call real backend API endpoints
✅ **Modal-based UX** - Professional modals for reject/suspend with reason fields
✅ **Automatic Panel Switching** - After each action, switches to relevant panel
✅ **Success/Error Handling** - Clear messages with emojis for visual feedback
✅ **Data Reloading** - Automatically reloads course data after actions
✅ **Notifications** - Backend sends notifications to course creators
✅ **Database Integrity** - Courses move between tables correctly
✅ **ESC Key Support** - All modals close with ESC key
✅ **Input Validation** - Rejection/suspension reasons are required
✅ **Confirmation Dialogs** - Approve/reconsider/reinstate require confirmation

---

## Next Steps

1. **Test all functionalities** using the test cases above
2. **Verify database changes** in PostgreSQL after each action
3. **Check notifications** in the `notifications` table
4. **Review backend logs** for any errors
5. **Test with real user scenarios** for UX validation

---

## Troubleshooting

### Issue: "Failed to approve course: Network error"
**Solution**: Ensure backend server is running on `http://localhost:8000`

### Issue: "Failed to reject course: 404 Not Found"
**Solution**: Course may have been already moved. Refresh the page and try again.

### Issue: Modal doesn't close with ESC
**Solution**: Check browser console for JavaScript errors. Ensure `ModalManager.init()` ran successfully.

### Issue: Course doesn't appear in target panel after action
**Solution**:
1. Check if `window.CourseDBLoader` is available
2. Refresh the page manually
3. Check backend logs for database errors

---

## Conclusion

All five core functionalities (approve, reject, suspend, reconsider, reinstate) are **fully implemented** with:
- ✅ Complete backend API integration
- ✅ Professional modal-based UI
- ✅ Comprehensive error handling
- ✅ Automatic data reloading
- ✅ Panel switching
- ✅ User notifications

The implementation follows the existing codebase patterns and integrates seamlessly with the manage-courses page architecture.
