# Request Modals Implementation

Complete implementation of Request Course and Request School modals for the find-tutors.html page.

## Overview

This feature allows users to request new courses or schools that are not currently available in the system. Requests are stored in the database and can be reviewed by administrators.

## Features

✅ **Request Course Modal**
- Course title, category, level (required)
- Optional description field
- Dropdown selects for category and level

✅ **Request School Modal**
- School name, type, level (required)
- Optional: location, email, phone
- Dropdown selects for type and level

✅ **User Experience**
- Beautiful gradient buttons in sidebar
- Form validation
- Loading states during submission
- Success/error messages
- Auto-close on success
- ESC key to close
- Click outside to close
- Dark mode support
- Fully responsive

## Files Created/Modified

### Database Migration
- **File**: `astegni-backend/migrate_create_course_school_requests.py`
- **Purpose**: Creates `course_requests` and `requested_schools` tables
- **Tables Created**:
  - `course_requests`: id, user_id, course_title, category, level, description, status, timestamps
  - `requested_schools`: id, user_id, school_name, school_type, level, location, school_email, school_phone, status, timestamps

### Backend Endpoints
- **File**: `astegni-backend/course_school_request_endpoints.py`
- **Endpoints**:
  - `POST /api/course-requests` - Create course request
  - `GET /api/course-requests` - Get user's course requests
  - `GET /api/course-requests/{id}` - Get specific course request
  - `POST /api/school-requests` - Create school request
  - `GET /api/school-requests` - Get user's school requests
  - `GET /api/school-requests/{id}` - Get specific school request

### Frontend Files
- **CSS**: `css/find-tutors/request-modals.css` - Complete styling for modals and buttons
- **JavaScript**: `js/find-tutors/request-modals.js` - Modal functionality and API integration
- **HTML**: Modified `branch/find-tutors.html` - Added modals and trigger buttons
- **Test Page**: `test-request-modals.html` - Standalone test page

## Database Schema

### course_requests Table
```sql
CREATE TABLE course_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    level VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### requested_schools Table
```sql
CREATE TABLE requested_schools (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    school_name VARCHAR(255) NOT NULL,
    school_type VARCHAR(100) NOT NULL,
    level VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    school_email VARCHAR(255),
    school_phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Setup Instructions

### 1. Run Database Migration
```bash
cd astegni-backend
python migrate_create_course_school_requests.py
```

### 2. Verify Backend Registration
The endpoints are automatically registered in `astegni-backend/app.py`:
```python
from course_school_request_endpoints import router as course_school_request_router
app.include_router(course_school_request_router)
```

### 3. Start Backend Server
```bash
cd astegni-backend
python app.py
```

### 4. Test the Feature
Open `http://localhost:8080/branch/find-tutors.html` or use the test page:
```
http://localhost:8080/test-request-modals.html
```

## Usage

### In find-tutors.html

1. **Open Sidebar**: Click the hamburger menu
2. **Scroll to Bottom**: Find "Can't Find What You're Looking For?" section
3. **Request Course**: Click blue "Request a Course" button
4. **Request School**: Click green "Request a School" button

### Form Fields

**Request Course:**
- Course Title* (required)
- Category* (Academic, Professional, Technical, Arts, Language, Science, Other)
- Level* (KG, Elementary, Junior Secondary, Secondary, Preparatory, University, Professional)
- Description (optional)

**Request School:**
- School Name* (required)
- School Type* (Academic, Polytechnic, Culinary, Technical, Vocational, Arts, Other)
- Level* (Kindergarten, Elementary, High School, College, University)
- Location (optional)
- School Email (optional)
- School Phone (optional)

## API Examples

### Create Course Request
```bash
curl -X POST http://localhost:8000/api/course-requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "course_title": "Advanced Python Programming",
    "category": "Technical",
    "level": "University",
    "description": "Looking for advanced Python course covering async, decorators, and metaprogramming"
  }'
```

### Create School Request
```bash
curl -X POST http://localhost:8000/api/school-requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "school_name": "Excellence Tech Academy",
    "school_type": "Technical",
    "level": "College",
    "location": "Addis Ababa, Ethiopia",
    "school_email": "info@excellencetech.edu.et",
    "school_phone": "+251 11 555 1234"
  }'
```

### Get User's Requests
```bash
# Course requests
curl -X GET http://localhost:8000/api/course-requests \
  -H "Authorization: Bearer YOUR_TOKEN"

# School requests
curl -X GET http://localhost:8000/api/school-requests \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Authentication

- ✅ All endpoints require authentication (JWT token)
- ✅ Users can only access their own requests
- ✅ Automatic redirect to login if not authenticated

## Status Field

Both tables include a `status` field with default value `'pending'`:
- `pending` - Initial state when request is created
- `approved` - Admin approved the request
- `rejected` - Admin rejected the request
- `in_progress` - Request is being processed

## Future Enhancements

Potential additions for admin dashboard:
1. View all course/school requests
2. Approve/reject requests
3. Filter by status
4. Search and sort requests
5. Send notifications to users
6. Export requests to CSV
7. Analytics dashboard

## Troubleshooting

**Modal doesn't open:**
- Check browser console for JavaScript errors
- Ensure `js/find-tutors/request-modals.js` is loaded
- Verify DOM elements exist

**Submit fails with 401:**
- User is not logged in
- Token is expired
- Check localStorage for valid token

**Submit fails with 500:**
- Backend server is not running
- Database connection issue
- Check backend logs

**Styling issues:**
- Ensure `css/find-tutors/request-modals.css` is loaded
- Check for CSS conflicts
- Verify theme variables are defined

## Testing Checklist

- [x] Database tables created successfully
- [x] Backend endpoints registered
- [x] Course modal opens and closes
- [x] School modal opens and closes
- [x] Form validation works
- [x] Submit shows loading state
- [x] Success message displays
- [x] Error message displays
- [x] Data saves to database
- [x] ESC key closes modals
- [x] Click outside closes modals
- [x] Dark mode works
- [x] Responsive on mobile

## File Locations

```
astegni-v-1.1/
├── astegni-backend/
│   ├── migrate_create_course_school_requests.py  (migration)
│   ├── course_school_request_endpoints.py         (API endpoints)
│   └── app.py                                     (router registration)
├── branch/
│   └── find-tutors.html                           (updated with modals)
├── css/
│   └── find-tutors/
│       └── request-modals.css                     (styling)
├── js/
│   └── find-tutors/
│       └── request-modals.js                      (functionality)
└── test-request-modals.html                       (test page)
```

## Summary

This implementation provides a complete, production-ready solution for allowing users to request new courses and schools. The feature includes:

- ✅ Beautiful, responsive UI
- ✅ Complete backend API
- ✅ Database persistence
- ✅ Authentication & authorization
- ✅ Error handling
- ✅ Loading states
- ✅ Dark mode support
- ✅ Comprehensive documentation

The modals are now live in the find-tutors page sidebar and ready for production use!
