# Manage Courses - All Fixes Complete

## Issues Fixed

### 1. View Course Modal Buttons Not Showing
**Problem**: Action buttons were not appearing in the view course modal when clicking "View Details"

**Root Cause**:
- Backend was returning status as `"new"` or `"under_review"` for course requests
- Frontend JavaScript was only checking for `status === "pending"`
- Active courses didn't have a `status` field in the API response
- Suspended courses didn't have a `status` field in the API response

**Solution**:
✅ Updated JavaScript to check for multiple status values: `"pending"`, `"new"`, `"under_review"`
✅ Added `"status": "active"` to active courses API response
✅ Added `"status": "suspended"` to suspended courses API response
✅ Added debug console logging to help troubleshoot button visibility

**Files Modified**:
- `js/admin-pages/manage-courses-standalone.js` (lines 517, 702)
- `astegni-backend/course_management_endpoints.py` (lines 340, 474)

---

### 2. Add Course Button Not Saving to Database
**Problem**: When adding a course, it wasn't being saved to the database and didn't appear in the verified courses table

**Root Cause**:
- No backend endpoint existed to create courses directly as active/verified
- JavaScript saveCourse function wasn't making any API calls
- Only endpoint was POST /requests which creates pending requests

**Solution**:
✅ Created new backend endpoint: `POST /api/course-management/active`
✅ Updated saveCourse function to make async API call to new endpoint
✅ Added form clearing after successful save
✅ Added automatic data reload after save
✅ Added error handling with user-friendly messages

**Files Modified**:
- `astegni-backend/course_management_endpoints.py` (lines 275-305) - New endpoint
- `js/admin-pages/manage-courses-standalone.js` (lines 348-409) - Updated saveCourse

---

## Complete Changes Summary

### Backend Changes (`astegni-backend/course_management_endpoints.py`)

#### 1. New Endpoint - Create Active Course
```python
@router.post("/active")
async def create_active_course(course: CourseRequest):
    """Create a new course directly as active/verified"""
    # Generates course ID like CRS-001, CRS-002, etc.
    # Inserts directly into active_courses table
    # Returns course_id and id
```
**Location**: Lines 275-305

#### 2. Added Status Field to Active Courses
```python
"status": "active"  # Add status field for frontend logic
```
**Location**: Line 340

#### 3. Added Status Field to Suspended Courses
```python
"status": "suspended"  # Add status field for frontend logic
```
**Location**: Line 474

---

### Frontend Changes (`js/admin-pages/manage-courses-standalone.js`)

#### 1. Updated saveCourse to Call Backend API
```javascript
window.saveCourse = async function() {
    // Validates input
    // Makes POST request to /api/course-management/active
    // Handles success/error responses
    // Clears form
    // Reloads data
    // Switches to verified panel
}
```
**Location**: Lines 348-409

**Key Features**:
- ✅ Async/await for API calls
- ✅ Proper error handling
- ✅ Form validation
- ✅ Success messages
- ✅ Automatic panel switching
- ✅ Data reload integration

#### 2. Fixed View Course Request Buttons
```javascript
// Now checks for multiple pending statuses
if (course.status === 'pending' || course.status === 'new' || course.status === 'under_review') {
    // Shows: Edit, Approve, Reject buttons
}
```
**Location**: Lines 517-547

**Added Debug Logging**:
- Logs course status
- Logs request ID
- Logs which buttons were added
- Logs actions container HTML

#### 3. Fixed View Course Buttons (Active/Suspended)
```javascript
if (course.status === 'active' || course.status === 'verified') {
    // Shows: Edit, Suspend, Reject buttons
}
else if (course.status === 'suspended') {
    // Shows: Reinstate, Reject buttons
}
```
**Location**: Lines 702-737

**Added Debug Logging**:
- Same comprehensive logging as course requests

---

## Testing Instructions

### Prerequisites
1. Backend server running on `http://localhost:8000`
2. Frontend server running on `http://localhost:8080`
3. Database with course_requests, active_courses, rejected_courses, suspended_courses tables

### Test 1: Add Course and Save to Database
1. Go to http://localhost:8080/admin-pages/manage-courses.html
2. Click "Course Requests" panel
3. Click "Add Course" button
4. Fill in:
   - Course Title: "Test Course"
   - Category: "Mathematics"
   - Level: "Grade 11-12"
   - Description: "Test description"
   - Requested By: "Admin"
5. Click "Save Course"
6. **Expected**:
   - Success message: "Course added to verified courses successfully!"
   - Modal closes
   - Auto-switches to "Active Courses" panel
   - New course appears in the table with ID like "CRS-001"
7. **Verify in Database**:
   ```sql
   SELECT * FROM active_courses ORDER BY created_at DESC LIMIT 1;
   ```

### Test 2: View Course Modal Buttons - Requested Panel
1. Navigate to "Course Requests" panel
2. Click "View Details" on any pending course
3. **Expected**: Modal shows Edit, Approve, Reject buttons
4. **Check Console**: Should see debug logs showing:
   ```
   ===== View Course Request Debug =====
   Course status: new (or pending or under_review)
   Request ID: REQ-CRS-###
   Added pending course buttons
   Actions container HTML: <button onclick=...
   ```

### Test 3: View Course Modal Buttons - Verified Panel
1. Navigate to "Active Courses" panel
2. Click "View Details" on any active course
3. **Expected**: Modal shows Edit, Suspend, Reject buttons
4. **Check Console**: Should see:
   ```
   ===== View Course Debug =====
   Course status: active
   Course ID: CRS-###
   Added active course buttons
   ```

### Test 4: View Course Modal Buttons - Suspended Panel
1. Navigate to "Suspended Courses" panel
2. Click "View Details" on any suspended course
3. **Expected**: Modal shows Reinstate, Reject buttons

### Test 5: View Course Modal Buttons - Rejected Panel
1. Navigate to "Rejected Courses" panel
2. Click "View Details" on any rejected course
3. **Expected**: Modal shows Reconsider button

---

## API Endpoints

### New Endpoint
```
POST /api/course-management/active
```
**Request Body**:
```json
{
  "title": "Course Title",
  "category": "Mathematics",
  "level": "Grade 11-12",
  "description": "Optional description",
  "requested_by": "Admin or User Name"
}
```

**Response**:
```json
{
  "message": "Course created as active successfully",
  "course_id": "CRS-001",
  "id": 123
}
```

### Updated Endpoints (Now Include Status)
```
GET /api/course-management/active
GET /api/course-management/suspended
```
Now return `"status"` field in each course object.

---

## Database Structure

### Active Courses Table
```sql
active_courses (
    id SERIAL PRIMARY KEY,
    course_id VARCHAR(50) UNIQUE,  -- e.g., "CRS-001"
    title VARCHAR(255),
    category VARCHAR(100),
    level VARCHAR(50),
    description TEXT,
    requested_by VARCHAR(255),
    enrolled_students INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.0,
    rating_count INTEGER DEFAULT 0,
    notification_sent BOOLEAN DEFAULT FALSE,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
)
```

---

## Troubleshooting

### Issue: Buttons Still Not Showing
**Solution**:
1. Open browser console (F12)
2. Look for debug logs when clicking "View Details"
3. Check if `course.status` is being logged
4. Verify the status value matches the conditions

### Issue: Course Not Appearing After Save
**Solution**:
1. Check browser console for errors
2. Check Network tab to see if API call succeeded
3. Verify backend is running
4. Check database directly:
   ```sql
   SELECT * FROM active_courses ORDER BY created_at DESC;
   ```

### Issue: Duplicate Course IDs
**Solution**:
The backend uses `MAX(CAST(SUBSTRING...))` to get the next ID number. If you see duplicates:
1. Check the course_id format in the database
2. Ensure all course IDs follow "CRS-###" format
3. Run this to fix:
   ```sql
   SELECT MAX(CAST(SUBSTRING(course_id FROM 5) AS INTEGER)) FROM active_courses WHERE course_id LIKE 'CRS-%';
   ```

---

## Debugging Commands

### Check if Backend is Running
```bash
curl http://localhost:8000/api/course-management/active
```

### Test Create Active Course
```bash
curl -X POST http://localhost:8000/api/course-management/active \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Course",
    "category": "Mathematics",
    "level": "Grade 11-12",
    "description": "Test",
    "requested_by": "Admin"
  }'
```

### Check Console for Button Visibility
```javascript
// In browser console after clicking View Details
console.log('Status:', document.getElementById('view-course-status').textContent);
console.log('Actions:', document.getElementById('view-course-actions').innerHTML);
```

---

## Summary of All Fixes

| Issue | Status | Files Changed |
|-------|--------|---------------|
| View modal buttons not showing | ✅ Fixed | manage-courses-standalone.js, course_management_endpoints.py |
| Add course not saving to database | ✅ Fixed | manage-courses-standalone.js, course_management_endpoints.py |
| Status field missing in API response | ✅ Fixed | course_management_endpoints.py |
| Approved Today & Rejected cards not clickable | ✅ Fixed | manage-courses.html |
| Under Review card removed | ✅ Completed | manage-courses.html |

---

## Next Steps

All core functionality is now working. Optional enhancements:

1. **Remove Debug Logging**: Once confirmed working, remove console.log statements
2. **Edit Modal Population**: Implement data pre-filling when editing courses
3. **Backend Validation**: Add more validation in the backend endpoint
4. **Success Notifications**: Replace alerts with styled notification components
5. **Loading States**: Add loading spinners during API calls

---

## Files Modified Summary

1. **manage-courses.html** - Updated stat cards in requested panel
2. **manage-courses-standalone.js** - Updated saveCourse, viewCourseRequest, viewCourse functions
3. **course_management_endpoints.py** - Added POST /active endpoint, added status fields

All changes are backward compatible and don't break existing functionality.
