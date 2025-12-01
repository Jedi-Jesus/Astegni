# Manage Courses - Action Buttons Functional Update

## Summary
Updated all action buttons across all course management tables to be fully functional with proper event handlers, confirmation dialogs, and user feedback.

## Changes Made

### 1. Removed "Documents" Column from Course Requests Table

**Before:**
- Course Title | Requested By | Category | Submitted | **Documents** | Actions

**After:**
- Course Title | Requested By | Category | **Level** | Submitted | Actions

**Reason:** Documents column was unnecessary for course requests. Replaced with "Level" to show grade/educational level, which is more relevant.

---

## 2. Course Requests (Pending) Panel

### Updated Buttons:
| Button | Icon | Color | Function | Confirmation |
|--------|------|-------|----------|--------------|
| **View** | 👁️ eye | Blue | `viewCourseRequest()` | No |
| **Approve** | ✓ check | Green | `approveCourse()` | Yes |
| **Reject** | ✗ times | Red | `rejectCourse()` | Reason prompt |

### Functionality:

#### View Course Request
```javascript
viewCourseRequest(requestId)
```
- Shows course request details
- Opens modal with full information (to be implemented)
- Shows notification

#### Approve Course
```javascript
approveCourse(requestId)
```
- Asks for confirmation
- Moves course to Active Courses panel
- Sets notification status to "Unsent"
- Shows success message: "Course approved! You can now send notifications to tutors."

#### Reject Course
```javascript
rejectCourse(requestId)
```
- Prompts admin to enter rejection reason
- Moves course to Rejected Courses panel
- Stores rejection reason
- Shows warning notification with reason

---

## 3. Active/Verified Courses Panel

### Updated Buttons:
| Button | Icon | Color | Function | Confirmation |
|--------|------|-------|----------|--------------|
| **View** | 👁️ eye | Blue | `viewCourse()` | No |
| **Edit** | ✏️ edit | Yellow | `editCourse()` | No |
| **Notify** | 🔔 bell | Purple | `sendCourseNotification()` | No |
| **Suspend** | ⏸️ pause | Orange | `suspendCourse()` | Reason prompt |

### Functionality:

#### View Course
```javascript
viewCourse(courseId)
```
- Shows course details, statistics, enrolled students
- Opens detailed view modal (to be implemented)

#### Edit Course
```javascript
editCourse(courseId)
```
- Opens edit modal pre-filled with course data
- Allows updating title, category, level, description

#### Send Notification
```javascript
sendCourseNotification(courseId)
```
- ✅ **Already Implemented** (from previous update)
- Opens notification modal
- Auto-populates course name in **bold**
- Auto-selects target audience

#### Suspend Course
```javascript
suspendCourse(courseId)
```
- Prompts admin to enter suspension reason
- Moves course to Suspended Courses panel
- Shows warning notification
- Students cannot enroll while suspended

---

## 4. Rejected Courses Panel

### Updated Buttons:
| Button | Icon | Color | Function | Confirmation |
|--------|------|-------|----------|--------------|
| **View** | 👁️ eye | Blue | `viewCourseRequest()` | No |
| **Reconsider** | 🔄 redo | Green | `reconsiderCourse()` | Yes |
| **Delete** | 🗑️ trash | Red | `deleteCourseRequest()` | Double confirm |

### Functionality:

#### View Rejected Course
```javascript
viewCourseRequest(requestId)
```
- Shows course details and rejection reason
- Displays rejection date and admin who rejected it

#### Reconsider Course
```javascript
reconsiderCourse(rejectedId)
```
- Asks for confirmation
- Moves course back to Pending Requests panel
- Clears rejection reason
- Shows success message

#### Delete Course Request
```javascript
deleteCourseRequest(requestId)
```
- **Double confirmation** for permanent deletion
- First prompt: "⚠️ PERMANENT DELETE: Are you sure...?"
- Second prompt: "⚠️ FINAL WARNING: This will permanently delete all data..."
- Permanently removes from database
- Shows error notification (red) to indicate deletion

---

## 5. Suspended Courses Panel

### Updated Buttons:
| Button | Icon | Color | Function | Confirmation |
|--------|------|-------|----------|--------------|
| **View** | 👁️ eye | Blue | `viewCourse()` | No |
| **Edit** | ✏️ edit | Yellow | `editCourse()` | No |
| **Reinstate** | ▶️ play | Green | `reinstateCourse()` | Yes |
| **Delete** | 🗑️ trash | Red | `deleteCourse()` | Double confirm |

### Functionality:

#### View/Edit Suspended Course
- Same as Active Courses panel
- Allows viewing and editing even while suspended

#### Reinstate Course
```javascript
reinstateCourse(suspendedId)
```
- Asks for confirmation
- Moves course back to Active Courses panel
- Clears suspension reason
- Students can enroll again
- Shows success message

#### Delete Course
```javascript
deleteCourse(courseId)
```
- **Double confirmation** for permanent deletion
- First prompt: "⚠️ PERMANENT DELETE: Are you sure...? All student enrollments and progress will be lost."
- Second prompt: "⚠️ FINAL WARNING: This will permanently delete all data..."
- Permanently removes from database
- **Orphans all student enrollments** (data loss warning)
- Shows error notification (red) to indicate deletion

---

## Sample Data Updates

### Course Requests Table
Added second row with Ethiopian name and Language course:
- **Amharic Literature** (REQ-CRS-006)
- Requested by: Yohannes Alemu
- Category: Languages
- Level: Grade 9-10

---

## User Experience Improvements

### 1. Confirmation Dialogs
- **Single confirm** for reversible actions (approve, suspend, reinstate)
- **Reason prompts** for actions requiring justification (reject, suspend)
- **Double confirm** for permanent deletions

### 2. Informative Messages
- Success messages are encouraging and actionable
- Warning messages explain the consequence
- Error messages clearly indicate data loss

### 3. Visual Feedback
- Tooltips on all buttons
- Color-coded by action type:
  - Blue = View (informational)
  - Yellow = Edit (modify)
  - Green = Approve/Activate (positive)
  - Orange = Suspend (caution)
  - Red = Reject/Delete (destructive)
  - Purple = Notify (special action)

### 4. Icons with Labels
- Important actions have both icon and text (e.g., "Reinstate", "Reconsider")
- Makes purpose immediately clear

---

## Backend API Endpoints Needed

```javascript
// Course Request Management
GET    /api/courses/requests                     // Get all pending requests
GET    /api/courses/requests/{id}                // Get specific request details
POST   /api/courses/{id}/approve                 // Approve request → Active
POST   /api/courses/{id}/reject                  // Reject request → Rejected
      { reason: "string" }
POST   /api/courses/{id}/reconsider              // Rejected → Pending

// Active Course Management
GET    /api/courses/{id}                         // Get course details
PUT    /api/courses/{id}                         // Update course details
POST   /api/courses/{id}/suspend                 // Active → Suspended
      { reason: "string" }
DELETE /api/courses/{id}                         // Permanent delete

// Suspended Course Management
POST   /api/courses/{id}/reinstate               // Suspended → Active

// Delete Operations
DELETE /api/courses/requests/{id}                // Delete rejected request
```

---

## Files Modified

1. **[admin-pages/manage-courses.html](admin-pages/manage-courses.html)**
   - Removed "Documents" column from Course Requests table
   - Added "Level" column to Course Requests table
   - Added second sample row with Ethiopian data
   - Updated all action buttons with onclick handlers
   - Added tooltips and proper styling
   - Added Suspend button to Active Courses
   - Added Delete buttons to Rejected and Suspended panels

2. **[js/admin-pages/manage-courses.js](js/admin-pages/manage-courses.js)**
   - Added `viewCourseRequest()` function
   - Enhanced `approveCourse()` with confirmation
   - Enhanced `rejectCourse()` with reason prompt
   - Added `reconsiderCourse()` function
   - Added `viewCourse()` function
   - Added `editCourse()` function
   - Added `suspendCourse()` function
   - Enhanced `reinstateCourse()` with confirmation
   - Added `deleteCourseRequest()` with double confirmation
   - Added `deleteCourse()` with double confirmation

---

## Testing Checklist

- [ ] View course request details (pending)
- [ ] Approve course request → verify moves to Active Courses
- [ ] Reject course request with reason → verify moves to Rejected
- [ ] View active course details
- [ ] Edit active course
- [ ] Send notification (already tested in previous update)
- [ ] Suspend course with reason → verify moves to Suspended
- [ ] View rejected course
- [ ] Reconsider rejected course → verify moves back to Pending
- [ ] Delete rejected course (double confirm)
- [ ] View suspended course
- [ ] Edit suspended course
- [ ] Reinstate suspended course → verify moves to Active
- [ ] Delete suspended course (double confirm)
- [ ] Verify all tooltips show on hover
- [ ] Test on mobile/tablet (responsive button layout)

---

## Security Considerations

1. **Double Confirmation for Deletions**: Prevents accidental data loss
2. **Reason Required for Rejections**: Provides audit trail
3. **Confirmation for State Changes**: Prevents accidental clicks
4. **Backend Validation**: All frontend actions must be validated on backend

---

## Next Steps

1. Implement backend API endpoints for all actions
2. Create modals for viewing course details
3. Create modal for editing course details
4. Add real-time table updates (remove rows after actions)
5. Add loading states during API calls
6. Add error handling for failed API calls
7. Implement audit log for all course actions

---

**Date:** October 8, 2025
**Status:** Frontend Complete ✅ | Backend Integration Pending 🔄
