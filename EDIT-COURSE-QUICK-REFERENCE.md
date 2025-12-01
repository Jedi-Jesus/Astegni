# Edit Course - Quick Reference Guide

## How to Use the New Edit Modal

### From the Table
1. Click the **Edit** button (pencil icon) on any course row
2. Edit modal opens with the course data pre-filled
3. Make your changes
4. Click **Save Changes** to save or **Cancel** to discard

### From the View Modal
1. View a course by clicking the **View** button
2. Click **Edit** in the view modal footer
3. View modal closes, edit modal opens
4. Make your changes
5. Click **Save Changes** to save or **Cancel** to discard

## Modal IDs and Elements

### Edit Modal Structure
```html
<div id="edit-course-modal">
    <form id="editCourseForm" onsubmit="handleCourseUpdate(event)">
        <input type="hidden" id="editCourseRequestId">  <!-- Course ID -->
        <input type="text" id="editCourseTitle">        <!-- Title -->
        <select id="editCourseCategory">                <!-- Category -->
        <select id="editCourseLevel">                   <!-- Level -->
        <input type="text" id="editCourseRequester">    <!-- Requester -->
        <textarea id="editCourseDescription">           <!-- Description -->
        <input type="text" id="editCourseStatus" disabled> <!-- Status (read-only) -->
    </form>
</div>
```

## JavaScript Functions

### Main Functions
```javascript
// Open edit modal for a course request (REQ-*, REJ-*)
window.editCourseRequest(requestId)

// Open edit modal for an active/suspended course (CRS-*, SUS-*)
window.editCourse(courseId)

// Close the edit modal
window.closeEditCourseModal()

// Handle form submission (called automatically on submit)
window.handleCourseUpdate(event)
```

### Usage Examples
```javascript
// Edit a course request
editCourseRequest('REQ-CRS-001');

// Edit an active course
editCourse('CRS-004');

// Edit a suspended course
editCourse('SUS-002');

// Close without saving
closeEditCourseModal();
```

## API Endpoints Used

The edit modal automatically determines which endpoint to use:

| Course ID Prefix | Endpoint | Method |
|-----------------|----------|--------|
| `REQ-*` | `/api/course-management/{id}/update-request` | PUT |
| `REJ-*` | `/api/course-management/{id}/update-request` | PUT |
| `CRS-*` | `/api/course-management/{id}/update` | PUT |
| `SUS-*` | `/api/course-management/{id}/update-suspended` | PUT |

## Form Data Structure

```javascript
{
    "title": "Course Title",
    "category": "Mathematics",
    "level": "Grade 11-12",
    "requested_by": "Dr. Alemayehu",
    "description": "Course description text"
}
```

## Field Validation

All fields with `*` are required:
- ✅ Course Title *
- ✅ Category *
- ✅ Level *
- ✅ Requested By *
- ✅ Description *
- ℹ️ Status (read-only, informational)

## Common Tasks

### Programmatically Open Edit Modal
```javascript
// Get course ID from anywhere
const courseId = 'REQ-CRS-001';

// Open edit modal
editCourseRequest(courseId);
```

### Pre-fill Edit Modal with Custom Data
```javascript
document.getElementById('editCourseRequestId').value = 'REQ-CRS-001';
document.getElementById('editCourseTitle').value = 'New Title';
document.getElementById('editCourseCategory').value = 'Mathematics';
document.getElementById('editCourseLevel').value = 'University';
document.getElementById('editCourseRequester').value = 'Prof. Tigist';
document.getElementById('editCourseDescription').value = 'Description here';

// Open modal
const modal = document.getElementById('edit-course-modal');
modal.classList.remove('hidden');
modal.classList.add('flex');
```

### Listen for Save Success
```javascript
// The handleCourseUpdate function shows an alert
// After saving, it calls:
// - closeEditCourseModal()
// - window.CourseDBLoader.loadAll()

// To add custom behavior, modify handleCourseUpdate in manage-courses-standalone.js
```

## Keyboard Shortcuts

- **ESC** - Close edit modal (standard modal behavior)
- **Enter** (in text fields) - Submit form (standard form behavior)

## Troubleshooting

### Edit Modal Won't Open
```javascript
// Check if modal element exists
const modal = document.getElementById('edit-course-modal');
console.log('Modal exists:', !!modal);

// Check if course ID is valid
console.log('Course ID:', requestId);
```

### Form Won't Submit
```javascript
// Check form validation
const form = document.getElementById('editCourseForm');
console.log('Form is valid:', form.checkValidity());

// Check required fields
const title = document.getElementById('editCourseTitle').value;
console.log('Title filled:', !!title);
```

### Save Fails
```javascript
// Check API response in browser console
// Look for error messages in the alert

// Verify course ID format
console.log('Course ID starts with REQ, REJ, CRS, or SUS:',
    /^(REQ|REJ|CRS|SUS)-/.test(courseId));
```

## Styling Classes

The modal uses Tailwind CSS classes:
- `hidden` / `flex` - Show/hide modal
- `modal-content` - Modal styling
- Form inputs use standard Tailwind form classes

## Related Files

- **HTML:** `admin-pages/manage-courses.html` (lines 893-977)
- **JavaScript:** `js/admin-pages/manage-courses-standalone.js` (lines 1164-1377)
- **Pattern Source:** `admin-pages/manage-schools.html` and `js/admin-pages/manage-schools.js`

## Comparison with Old Approach

| Feature | Old (In-Place) | New (Separate Modal) |
|---------|---------------|---------------------|
| Edit button behavior | Converts view modal | Opens new modal |
| View while editing | ❌ Crashes | ✅ Works |
| Code complexity | High | Low |
| Form validation | Manual | HTML5 native |
| Cancel behavior | Reload view | Close modal |

---

**Quick Start:** Just call `editCourseRequest(id)` or `editCourse(id)` - everything else is handled automatically!
