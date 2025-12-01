# Edit Course - Backend Update Endpoints Added

## Problem Fixed
The edit course functionality was failing with **404 Not Found** error because the backend didn't have PUT endpoints for updating course data.

## Solution
Added 4 new PUT endpoints to the backend for updating courses in different states.

## Changes Made

### Backend - `astegni-backend/course_management_endpoints.py`

**Added New Model** (line 1074):
```python
class CourseUpdateRequest(BaseModel):
    """Model for updating course data"""
    title: Optional[str] = None
    category: Optional[str] = None
    level: Optional[str] = None
    description: Optional[str] = None
    requested_by: Optional[str] = None
```

**Added 4 New PUT Endpoints:**

1. **`PUT /api/course-management/requests/{request_id}`** (lines 1082-1151)
   - Update a course request
   - Updates fields in `course_requests` table
   - Returns updated course data

2. **`PUT /api/course-management/active/{course_id}`** (lines 1153-1222)
   - Update an active/verified course
   - Updates fields in `active_courses` table
   - Note: Uses `instructor_name` field (not `requested_by`)
   - Returns updated course data

3. **`PUT /api/course-management/suspended/{suspended_id}`** (lines 1224-1293)
   - Update a suspended course
   - Updates fields in `suspended_courses` table
   - Note: Uses `instructor_name` field
   - Returns updated course data

4. **`PUT /api/course-management/rejected/{rejected_id}`** (lines 1295-1364)
   - Update a rejected course
   - Updates fields in `rejected_courses` table
   - Returns updated course data

### Frontend - `js/admin-pages/manage-courses-standalone.js`

**Updated Endpoint URLs** (lines 1336-1343):
```javascript
// OLD (Wrong - these endpoints didn't exist):
if (courseId.startsWith('REQ-')) {
    endpoint = `/api/course-management/${courseId}/update-request`;
}

// NEW (Correct - matches backend endpoints):
if (courseId.startsWith('REQ-')) {
    endpoint = `/api/course-management/requests/${courseId}`;
} else if (courseId.startsWith('REJ-')) {
    endpoint = `/api/course-management/rejected/${courseId}`;
} else if (courseId.startsWith('CRS-')) {
    endpoint = `/api/course-management/active/${courseId}`;
} else if (courseId.startsWith('SUS-')) {
    endpoint = `/api/course-management/suspended/${courseId}`;
}
```

## Endpoint Mapping

| Course ID Prefix | Table | Endpoint |
|-----------------|-------|----------|
| `REQ-*` | `course_requests` | `PUT /api/course-management/requests/{request_id}` |
| `REJ-*` | `rejected_courses` | `PUT /api/course-management/rejected/{rejected_id}` |
| `CRS-*` | `active_courses` | `PUT /api/course-management/active/{course_id}` |
| `SUS-*` | `suspended_courses` | `PUT /api/course-management/suspended/{suspended_id}` |

## Request/Response Format

**Request:**
```json
{
    "title": "Advanced Mathematics",
    "category": "Mathematics",
    "level": "Grade 11-12",
    "description": "Updated description",
    "requested_by": "Dr. Alemayehu"
}
```

**Response (Success):**
```json
{
    "message": "Course request updated successfully",
    "request_id": "REQ-CRS-001",
    "updated_data": {
        "title": "Advanced Mathematics",
        "category": "Mathematics",
        "level": "Grade 11-12",
        "description": "Updated description",
        "requested_by": "Dr. Alemayehu"
    }
}
```

**Response (Error - 404):**
```json
{
    "detail": "Course request REQ-CRS-999 not found"
}
```

**Response (Error - 400):**
```json
{
    "detail": "No fields to update"
}
```

## Features

✅ **Partial Updates** - Only send the fields you want to update
✅ **Validation** - Returns 400 if no fields provided
✅ **Not Found Handling** - Returns 404 if course doesn't exist
✅ **Database Fields** - Correctly handles different field names across tables:
  - `course_requests` and `rejected_courses` use `requested_by`
  - `active_courses` and `suspended_courses` use `instructor_name`

## Testing

### From Frontend
1. Refresh your page to load updated JavaScript
2. Navigate to any course panel
3. Click "Edit" on any course
4. Make changes in the edit modal
5. Click "Save Changes"
6. ✅ Should save successfully now!

### Using API Directly

**Test with curl (after restarting backend):**
```bash
# Update a course request
curl -X PUT http://localhost:8000/api/course-management/requests/REQ-CRS-001 \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title", "category": "Science"}'

# Update an active course
curl -X PUT http://localhost:8000/api/course-management/active/CRS-016 \
  -H "Content-Type: application/json" \
  -d '{"description": "Updated description"}'
```

## IMPORTANT: Restart Backend Server

**You MUST restart the backend server for these changes to take effect:**

```bash
# Stop the current backend (Ctrl+C in the terminal, or kill the process)

# Start the backend again
cd astegni-backend
python app.py
```

The server should start successfully and the new endpoints will be available.

## Verification

After restarting the backend, verify the endpoints exist:

1. Open http://localhost:8000/docs
2. Look for the new PUT endpoints under "course-management" section:
   - PUT /api/course-management/requests/{request_id}
   - PUT /api/course-management/active/{course_id}
   - PUT /api/course-management/suspended/{suspended_id}
   - PUT /api/course-management/rejected/{rejected_id}

## Next Steps

1. ✅ Backend endpoints added
2. ✅ Frontend updated to use correct URLs
3. ⏳ **RESTART BACKEND SERVER** ← You are here
4. ⏳ Test edit functionality
5. ⏳ Verify all course types can be edited

---

**Status:** ✅ Code Complete - Awaiting backend restart
**Files Modified:**
- `astegni-backend/course_management_endpoints.py`
- `js/admin-pages/manage-courses-standalone.js`
**Date:** 2025-10-18
