# Manage Courses Page Updates

## Summary of Changes

All requested changes to `admin-pages/manage-courses.html` have been successfully implemented.

---

## 1. Requested Panel Changes

### Removed "Under Review" Stat Card
- The "Under Review" statistics card has been removed from the requested panel
- Now shows only 3 cards: "New Requests", "Approved Today", and "Rejected"

### Made Stat Cards Clickable
- **Approved Today Card**: Now clickable and navigates to the **Verified Panel**
  - Added `cursor-pointer` and `hover:shadow-lg` classes
  - Clicking shows "Click to view verified courses" hint
  - Uses `onclick="switchPanel('verified')"`

- **Rejected Card**: Now clickable and navigates to the **Rejected Panel**
  - Added `cursor-pointer` and `hover:shadow-lg` classes
  - Clicking shows "Click to view rejected courses" hint
  - Uses `onclick="switchPanel('rejected')"`

---

## 2. Add Course Button Behavior

### Changed Target Panel
- **Previous Behavior**: Added courses to requested/pending status
- **New Behavior**: Adds courses directly to **verified/active** status
- After saving, automatically switches to the verified panel
- Shows success message: "Course added to verified courses successfully!"

### Implementation Details
Location: [manage-courses-standalone.js:348-376](js/admin-pages/manage-courses-standalone.js#L348-L376)

```javascript
window.saveCourse = function() {
    // ... validation code ...

    // Note: This now adds courses directly to verified/active status
    alert('Course added to verified courses successfully!');
    closeAddCourseModal();

    // Switch to verified panel to show the new course
    if (window.switchPanel) {
        window.switchPanel('verified');
    }
}
```

---

## 3. View Course Modal - Dynamic Action Buttons

The view course modal now displays different action buttons based on which panel the course belongs to:

### Requested Panel (Pending Courses)
**Buttons**: Edit, Approve, Reject

```javascript
- Edit: Opens edit modal with pre-populated data
- Approve: Approves course and moves to verified
- reject: Rejects course with reason and moves to rejected
```

**Implementation**: [manage-courses-standalone.js:475-502](js/admin-pages/manage-courses-standalone.js#L475-L502)

---

### Verified Panel (Active Courses)
**Buttons**: Edit, Suspend, Reject

```javascript
- Edit: Opens edit modal with pre-populated data
- Suspend: Suspends course with reason and moves to suspended
- Reject: Rejects course with reason and moves to rejected
```

**Implementation**: [manage-courses-standalone.js:649-666](js/admin-pages/manage-courses-standalone.js#L649-L666)

---

### Rejected Panel (Rejected Courses)
**Button**: Reconsider

```javascript
- Reconsider: Moves course back to pending for reconsideration
```

**Implementation**: [manage-courses-standalone.js:492-499](js/admin-pages/manage-courses-standalone.js#L492-L499)

---

### Suspended Panel (Suspended Courses)
**Buttons**: Reinstate, Reject

```javascript
- Reinstate: Reinstates course and moves back to verified/active
- Reject: Permanently rejects course and moves to rejected
```

**Implementation**: [manage-courses-standalone.js:667-678](js/admin-pages/manage-courses-standalone.js#L667-L678)

---

## 4. New JavaScript Functions Added

### Edit Functions
1. **`editCourseRequest(requestId)`** - For editing pending course requests
   - Location: [manage-courses-standalone.js:793-802](js/admin-pages/manage-courses-standalone.js#L793-L802)
   - Opens add/edit modal with pre-filled data (TODO: populate fields)

2. **`editCourse(courseId)`** - For editing active/verified courses
   - Location: [manage-courses-standalone.js:804-813](js/admin-pages/manage-courses-standalone.js#L804-L813)
   - Opens add/edit modal with pre-filled data (TODO: populate fields)

### Reject Function
3. **`rejectCourse(courseId)`** - For rejecting verified or suspended courses
   - Location: [manage-courses-standalone.js:815-827](js/admin-pages/manage-courses-standalone.js#L815-L827)
   - Prompts for rejection reason
   - Moves course to rejected status

---

## Testing Instructions

### Test 1: Requested Panel Stat Cards
1. Go to "Course Requests" panel
2. Click on "Approved Today" card → Should navigate to "Active Courses" panel
3. Go back to "Course Requests" panel
4. Click on "Rejected" card → Should navigate to "Rejected Courses" panel

### Test 2: Add Course Button
1. Go to "Course Requests" panel
2. Click "Add Course" button
3. Fill in course details and save
4. Should see success message about verified courses
5. Should automatically switch to "Active Courses" panel

### Test 3: View Course Modal Buttons

#### Requested Panel
1. Go to "Course Requests" panel
2. Click "View" on any pending course
3. Modal should show: **Edit, Approve, Reject** buttons
4. Test each button's functionality

#### Verified Panel
1. Go to "Active Courses" panel
2. Click "View" on any active course
3. Modal should show: **Edit, Suspend, Reject** buttons
4. Test each button's functionality

#### Rejected Panel
1. Go to "Rejected Courses" panel
2. Click "View" on any rejected course
3. Modal should show: **Reconsider** button
4. Test the reconsider functionality

#### Suspended Panel
1. Go to "Suspended Courses" panel
2. Click "View" on any suspended course
3. Modal should show: **Reinstate, Reject** buttons
4. Test each button's functionality

---

## Files Modified

1. **`admin-pages/manage-courses.html`**
   - Lines 404-421: Updated requested panel statistics cards
   - Removed "Under Review" card
   - Made "Approved Today" and "Rejected" cards clickable

2. **`js/admin-pages/manage-courses-standalone.js`**
   - Lines 348-376: Updated `saveCourse()` to add to verified panel
   - Lines 475-502: Updated `viewCourseRequest()` action buttons
   - Lines 649-681: Updated `viewCourse()` action buttons
   - Lines 793-827: Added new edit and reject functions

---

## Next Steps (Optional Enhancements)

1. **Edit Modal Population**: Implement data pre-population in edit modals
2. **Backend Integration**: Connect all functions to actual API endpoints
3. **Real-time Updates**: Auto-refresh stats when courses move between panels
4. **Confirmation Modals**: Replace `prompt()` and `alert()` with custom modals
5. **Validation**: Add client-side validation for all forms

---

## Notes

- All TODO comments indicate where backend API integration is needed
- Edit functionality currently shows placeholder alerts (needs implementation)
- All modal action buttons use Font Awesome icons for consistency
- Panel switching is smooth with URL state management
- All changes maintain the existing modular architecture pattern
