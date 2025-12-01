# Session Request System - Complete Guide

## Overview

The Session Request System allows students and parents to request tutoring sessions from tutors. Tutors can review requests, accept or reject them, and manage their students from their profile dashboard.

## Table of Contents

1. [Features](#features)
2. [Database Schema](#database-schema)
3. [Backend API](#backend-api)
4. [Frontend Components](#frontend-components)
5. [User Workflows](#user-workflows)
6. [Setup Instructions](#setup-instructions)
7. [Testing Guide](#testing-guide)

---

## Features

### For Students/Parents
- ✅ Request tutoring sessions from any tutor's profile
- ✅ Select specific packages
- ✅ Provide student details and contact information
- ✅ Specify preferred schedule and add custom message
- ✅ Track request status (pending, accepted, rejected)

### For Tutors
- ✅ View all session requests in a tabular format
- ✅ See requester details (name, type, profile picture)
- ✅ Review request details in a modal
- ✅ Accept or reject requests
- ✅ View accepted students in "My Students" panel
- ✅ Link to requester profiles (view-student or view-parent)

### Phase 1 (Complete)
- ✅ Database table and migrations
- ✅ Backend API endpoints
- ✅ Frontend UI (table + modal + cards)
- ✅ Request submission from view-tutor page
- ✅ Accept/Reject functionality

### Phase 2 (Coming Soon)
- ❌ Messaging between tutor and requester
- ❌ Email/SMS notifications for new requests
- ❌ Request status change notifications
- ❌ Filter requests by date, status, package
- ❌ Batch actions (accept/reject multiple)

---

## Database Schema

### Table: `session_requests`

```sql
CREATE TABLE session_requests (
    id SERIAL PRIMARY KEY,
    tutor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requester_type VARCHAR(20) NOT NULL CHECK (requester_type IN ('student', 'parent')),
    package_id INTEGER REFERENCES tutor_packages(id) ON DELETE SET NULL,
    package_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    message TEXT,
    student_name VARCHAR(255),
    student_grade VARCHAR(50),
    preferred_schedule TEXT,
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_session_requests_tutor ON session_requests(tutor_id, status);
CREATE INDEX idx_session_requests_requester ON session_requests(requester_id);
```

### Fields Explanation

| Field | Type | Description |
|-------|------|-------------|
| `id` | INTEGER | Unique request ID |
| `tutor_id` | INTEGER | ID of the tutor receiving the request |
| `requester_id` | INTEGER | ID of the student/parent making the request |
| `requester_type` | VARCHAR | Either 'student' or 'parent' |
| `package_id` | INTEGER | Reference to tutor_packages table (optional) |
| `package_name` | VARCHAR | Name of requested package |
| `status` | VARCHAR | 'pending', 'accepted', or 'rejected' |
| `message` | TEXT | Optional message from requester |
| `student_name` | VARCHAR | Name of the student |
| `student_grade` | VARCHAR | Grade level (KG, Grade 1-12, University) |
| `preferred_schedule` | TEXT | Preferred days/times |
| `contact_phone` | VARCHAR | Contact phone number |
| `contact_email` | VARCHAR | Contact email address |
| `created_at` | TIMESTAMP | When request was created |
| `updated_at` | TIMESTAMP | Last update time |
| `responded_at` | TIMESTAMP | When tutor accepted/rejected |

---

## Backend API

### Endpoints

All endpoints are in `astegni-backend/session_request_endpoints.py`

#### 1. Create Session Request
```
POST /api/session-requests
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "tutor_id": 123,
  "package_id": 45,
  "package_name": "Basic Math Package",
  "student_name": "Abebe Kebede",
  "student_grade": "Grade 10",
  "contact_phone": "+251911234567",
  "contact_email": "abebe@example.com",
  "preferred_schedule": "Weekday afternoons",
  "message": "I need help with algebra and geometry"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Session request sent successfully",
  "request_id": 789,
  "created_at": "2025-10-22T10:30:00"
}
```

#### 2. Get Tutor's Session Requests
```
GET /api/tutor/session-requests?status=pending
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` (optional): Filter by 'pending', 'accepted', or 'rejected'

**Response:**
```json
[
  {
    "id": 789,
    "tutor_id": 123,
    "requester_id": 456,
    "requester_type": "student",
    "requester_name": "Abebe Kebede",
    "requester_profile_picture": "/uploads/profile.jpg",
    "package_id": 45,
    "package_name": "Basic Math Package",
    "status": "pending",
    "message": "I need help with algebra",
    "student_name": "Abebe Kebede",
    "student_grade": "Grade 10",
    "preferred_schedule": "Weekday afternoons",
    "contact_phone": "+251911234567",
    "contact_email": "abebe@example.com",
    "created_at": "2025-10-22T10:30:00",
    "updated_at": "2025-10-22T10:30:00",
    "responded_at": null
  }
]
```

#### 3. Get Request Details
```
GET /api/tutor/session-requests/{request_id}
Authorization: Bearer <token>
```

Returns single request object (same format as above).

#### 4. Accept/Reject Request
```
PATCH /api/tutor/session-requests/{request_id}
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "status": "accepted"  // or "rejected"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Session request accepted",
  "request_id": 789,
  "status": "accepted",
  "responded_at": "2025-10-22T11:00:00"
}
```

#### 5. Get My Students (Accepted Requests)
```
GET /api/tutor/my-students
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": 789,
    "student_id": 456,
    "student_name": "Abebe Kebede",
    "student_grade": "Grade 10",
    "profile_picture": "/uploads/profile.jpg",
    "package_name": "Basic Math Package",
    "contact_phone": "+251911234567",
    "contact_email": "abebe@example.com",
    "accepted_at": "2025-10-22T11:00:00",
    "requester_type": "student"
  }
]
```

#### 6. Get My Requests (Student/Parent View)
```
GET /api/my-session-requests
Authorization: Bearer <token>
```

Returns all requests made by the current user (student/parent).

---

## Frontend Components

### 1. Tutor Profile - Requested Sessions Panel

**Location:** `profile-pages/tutor-profile.html`

**Features:**
- Table view with requester info, type, package, student details
- Clickable requester names (links to view-student or view-parent)
- "View" button to see request details
- Auto-loads when panel is switched
- Refresh button to reload requests

**Panel ID:** `#requested-sessions-panel`

**JavaScript Manager:** `js/tutor-profile/session-request-manager.js`

**Key Functions:**
- `SessionRequestManager.loadRequests(status)` - Load requests table
- `SessionRequestManager.viewRequest(requestId)` - Open request modal
- `refreshRequests()` - Refresh the table

### 2. View Request Modal

**Modal ID:** `#viewRequestModal`

**Features:**
- Shows requester profile picture and name
- Displays package, student info, contact details
- Shows preferred schedule and message
- Accept/Reject buttons (only for pending requests)
- Message button (Phase 2 - disabled with tooltip)
- Close button

**Actions:**
- `SessionRequestManager.acceptRequest()` - Accept the request
- `SessionRequestManager.rejectRequest()` - Reject the request
- `SessionRequestManager.messageRequester(id)` - Phase 2 feature
- `SessionRequestManager.closeModal()` - Close the modal

### 3. My Students Panel

**Location:** `profile-pages/tutor-profile.html`

**Features:**
- Card grid layout (3 columns on desktop)
- Student profile picture and name
- Package and start date
- "View Profile" button (opens in new tab)
- Message button (Phase 2 - disabled)

**Panel ID:** `#my-students-panel`

**Key Functions:**
- `SessionRequestManager.loadMyStudents()` - Load accepted students
- `SessionRequestManager.renderStudentCard(student)` - Render student card

### 4. View Tutor - Request Session Modal

**Location:** `view-profiles/view-tutor.html`

**Features:**
- Package selection dropdown
- Student name input
- Grade level selector
- Contact phone and email
- Preferred schedule text input
- Optional message textarea
- Submit and Cancel buttons

**Modal ID:** `#requestSessionModal`

**JavaScript Handler:** `js/view-tutor/session-request-handler.js`

**Key Functions:**
- `openRequestModal(packageName)` - Open modal (pre-select package)
- `closeRequestModal()` - Close modal and reset form
- `submitSessionRequest(event)` - Submit the request
- `prefillUserInfo()` - Auto-fill user data

### 5. Request Session Button

**Location:** Package cards in `view-tutor.html`

```html
<button onclick="openRequestModal('Basic Package'); return false;">
    Request Session
</button>
```

---

## User Workflows

### Student/Parent Flow

1. **Browse Tutors**
   - Navigate to find-tutors page
   - Browse or search for tutors

2. **View Tutor Profile**
   - Click on a tutor to view their profile (view-tutor.html)

3. **Request Session**
   - Navigate to "Packages & Schedule" panel
   - Click "Request Session" button on desired package
   - **Authentication Check:** Must be logged in as student/parent
   - Fill out the request form:
     - Package is pre-selected
     - Enter student name
     - Select grade level
     - Add contact phone/email
     - Specify preferred schedule
     - Add optional message
   - Click "Send Request"

4. **Track Status**
   - View requests in student/parent profile (Phase 2)
   - Receive notification when tutor responds (Phase 2)

### Tutor Flow

1. **Check Requests**
   - Log in to tutor profile
   - Navigate to "Requested Sessions" panel
   - View table of all pending requests

2. **Review Request**
   - Click "View" button on any request
   - Modal opens showing:
     - Requester profile and type (student/parent)
     - Package requested
     - Student details (name, grade)
     - Contact information
     - Preferred schedule
     - Message from requester

3. **Take Action**
   - **Accept:** Click "Accept Request"
     - Confirmation dialog appears
     - Request status changes to 'accepted'
     - Student added to "My Students" panel
     - Success message shown
   - **Reject:** Click "Reject Request"
     - Confirmation dialog appears
     - Request status changes to 'rejected'
     - Success message shown
   - **Message:** Click "Message" (Phase 2)

4. **Manage Students**
   - Navigate to "My Students" panel
   - View all accepted students in card layout
   - Click "View Profile" to see student details
   - Message students (Phase 2)

---

## Setup Instructions

### 1. Database Setup

```bash
cd astegni-backend

# Run migration to create table
python migrate_create_session_requests.py

# Seed sample data (optional, for testing)
python seed_session_requests.py
```

**Expected Output:**
```
Dropped existing session_requests table if it existed
✅ session_requests table created successfully!

📋 Table structure:
  - id: integer
  - tutor_id: integer
  - requester_id: integer
  ...

✅ Successfully seeded 6 session requests!

📊 Session Requests Summary:
  - pending: 4
  - accepted: 2
```

### 2. Backend Integration

The endpoints are already integrated in `app.py`:

```python
# Include session request routes
from session_request_endpoints import router as session_request_router
app.include_router(session_request_router)
```

### 3. Frontend Integration

**Tutor Profile:**
- Modal already added to `tutor-profile.html`
- Script already included: `session-request-manager.js`
- Panel switching handles auto-loading

**View Tutor:**
- Modal already added to `view-tutor.html`
- Script already included: `session-request-handler.js`
- Request button updated on package cards

### 4. Restart Backend

```bash
cd astegni-backend
python app.py
```

**Verify endpoints at:** http://localhost:8000/docs

---

## Testing Guide

### Test 1: Create Session Request

1. Start both servers:
   ```bash
   # Terminal 1 - Backend
   cd astegni-backend
   python app.py

   # Terminal 2 - Frontend
   cd ..
   python -m http.server 8080
   ```

2. Log in as a student or parent
3. Navigate to a tutor's profile: `http://localhost:8080/view-profiles/view-tutor.html?id=1`
4. Go to "Packages & Schedule" panel
5. Click "Request Session" on any package
6. Fill out and submit the form
7. Verify success message appears

### Test 2: View Requests (Tutor)

1. Log in as a tutor (must have received requests)
2. Navigate to tutor profile: `http://localhost:8080/profile-pages/tutor-profile.html`
3. Click "Requested Sessions" in sidebar
4. Verify table loads with pending requests
5. Check requester links work (open view-student or view-parent)

### Test 3: View Request Details

1. From Requested Sessions panel
2. Click "View" on any request
3. Verify modal opens with all request details
4. Check Accept/Reject buttons are visible for pending requests
5. Check Message button shows tooltip

### Test 4: Accept Request

1. Open a pending request
2. Click "Accept Request"
3. Confirm in dialog
4. Verify success message
5. Navigate to "My Students" panel
6. Verify student appears in card grid

### Test 5: Reject Request

1. Open another pending request
2. Click "Reject Request"
3. Confirm in dialog
4. Verify success message
5. Check request no longer appears in pending list

### Test 6: My Students Panel

1. Navigate to "My Students" panel
2. Verify accepted students appear as cards
3. Click "View Profile" - should open in new tab
4. Verify package name and acceptance date shown

### API Testing (Postman/curl)

**Get Requests:**
```bash
curl -H "Authorization: Bearer <token>" \
     http://localhost:8000/api/tutor/session-requests?status=pending
```

**Accept Request:**
```bash
curl -X PATCH \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"status": "accepted"}' \
     http://localhost:8000/api/tutor/session-requests/1
```

---

## File Reference

### Backend Files
- `astegni-backend/migrate_create_session_requests.py` - Database migration
- `astegni-backend/seed_session_requests.py` - Sample data seeder
- `astegni-backend/session_request_endpoints.py` - API endpoints (15 endpoints)
- `astegni-backend/app.py` - Router registration

### Frontend Files
- `profile-pages/tutor-profile.html` - Tutor dashboard with panels and modal
- `js/tutor-profile/session-request-manager.js` - Session request manager (650+ lines)
- `view-profiles/view-tutor.html` - Tutor public profile with request modal
- `js/view-tutor/session-request-handler.js` - Request submission handler (200+ lines)

### CSS
- Uses existing CSS from `css/tutor-profile/` and inline styles
- Table styling matches schedule panel
- Modal styling consistent with tutor profile modals
- Card layout in My Students panel

---

## Troubleshooting

### Requests Not Loading

**Symptoms:** Empty table or loading spinner stuck

**Fixes:**
1. Check browser console for errors
2. Verify token is valid: `localStorage.getItem('token')`
3. Check API endpoint: `http://localhost:8000/api/tutor/session-requests`
4. Ensure user has tutor role: `localStorage.getItem('userRoles')`

### Cannot Submit Request

**Symptoms:** Modal doesn't open or form doesn't submit

**Fixes:**
1. Ensure logged in as student or parent
2. Check console for JavaScript errors
3. Verify tutor ID in URL: `?id=123`
4. Check network tab for API response

### Accept/Reject Not Working

**Symptoms:** Button clicks don't change status

**Fixes:**
1. Verify token is valid
2. Check request is in 'pending' status
3. Look for 404 (request not found) or 403 (not authorized)
4. Ensure tutor owns the request

### My Students Empty

**Symptoms:** No students shown after accepting requests

**Fixes:**
1. Check database: `SELECT * FROM session_requests WHERE status = 'accepted'`
2. Verify API response: `GET /api/tutor/my-students`
3. Check browser console for errors
4. Refresh panel manually

---

## Future Enhancements (Phase 2)

### Messaging System
- Real-time messaging between tutor and requester
- Message history in request modal
- Notification badges for new messages

### Notifications
- Email notifications for new requests
- SMS notifications (optional)
- In-app notification badges
- Browser push notifications

### Advanced Filters
- Filter by date range
- Filter by package
- Search by student name
- Sort by newest/oldest

### Batch Actions
- Select multiple requests
- Accept/reject multiple at once
- Export requests to CSV

### Analytics
- Request acceptance rate
- Average response time
- Popular packages
- Student demographics

---

## Support

For issues or questions:
1. Check this documentation
2. Review console errors
3. Test API endpoints in `/docs`
4. Check database records directly
5. Review related files in troubleshooting section

---

**Status:** ✅ Phase 1 Complete - Ready for Production

**Last Updated:** October 22, 2025
