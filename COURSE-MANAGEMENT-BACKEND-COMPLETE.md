# Course Management Backend - Database & API Implementation

## ✅ Completed Tasks

### 1. Database Schema Created

Created four dedicated tables for course lifecycle management:

#### **course_requests** (Pending Courses)
- `id` - Serial primary key
- `request_id` - Unique identifier (REQ-CRS-001, REQ-CRS-002, etc.)
- `title` - Course title
- `category` - Subject category (Mathematics, Science, etc.)
- `level` - Educational level (Grade 9-10, University, etc.)
- `description` - Course description
- `requested_by` - Name of requester
- `requester_user_id` - FK to users table
- `created_at`, `updated_at` - Timestamps

#### **active_courses** (Verified/Approved Courses)
- `id` - Serial primary key
- `course_id` - Unique identifier (CRS-001, CRS-002, etc.)
- All fields from course_requests +
- `enrolled_students` - Student count (default 0)
- `rating` - Course rating (decimal 2,1)
- `rating_count` - Number of ratings
- `notification_sent` - Boolean flag
- `notification_sent_at` - When notification was sent
- `notification_target_audience` - Who received notification
- `approved_at`, `approved_by` - Approval tracking

#### **rejected_courses** (Rejected Requests)
- `id` - Serial primary key
- `rejected_id` - Unique identifier (REJ-CRS-001, etc.)
- `original_request_id` - Original request ID for tracking
- All course fields +
- `rejection_reason` - Why it was rejected (required)
- `rejected_at`, `rejected_by` - Rejection tracking

#### **suspended_courses** (Temporarily Suspended)
- `id` - Serial primary key
- `suspended_id` - Unique identifier (SUS-CRS-001, etc.)
- `original_course_id` - Original active course ID
- All active course fields +
- `suspension_reason` - Why it was suspended (required)
- `suspended_at`, `suspended_by` - Suspension tracking

#### **course_notifications** (Notification History)
- `id` - Serial primary key
- `course_id` - Which course
- `message` - Notification text
- `target_audience` - Who received it
- `sent_at`, `sent_by` - Tracking
- `delivery_methods` - JSON (inApp, email, sms)

**Migration File:** `astegni-backend/migrate_course_tables.py`

---

### 2. Sample Data Seeded

Populated database with Ethiopian educational context:

- **4 Course Requests** (Pending)
  - Python for Beginners (Technology)
  - Amharic Literature (Languages)
  - Advanced Calculus (Mathematics)
  - Organic Chemistry (Science)

- **3 Active Courses** (Verified)
  - Web Development Fundamentals
  - Business Ethics
  - Digital Art & Design

- **2 Rejected Courses**
  - Physics for Grade 12
  - Data Science with R

- **1 Suspended Course**
  - English Literature

**Seed File:** `astegni-backend/seed_course_data.py`

---

### 3. Complete REST API Endpoints Created

File: `astegni-backend/course_management_endpoints.py`

#### **Course Requests (Pending)**

```
GET  /api/courses/requests              - List all pending requests
GET  /api/courses/requests/{id}         - Get specific request
POST /api/courses/requests              - Create new request
```

**Response Example:**
```json
{
  "courses": [
    {
      "id": 1,
      "request_id": "REQ-CRS-001",
      "title": "Python for Beginners",
      "category": "Technology",
      "level": "Grade 11-12",
      "description": "Introduction to programming with Python",
      "requested_by": "Sara Tadesse",
      "created_at": "2025-10-01T10:00:00Z"
    }
  ],
  "count": 4
}
```

#### **Active Courses (Verified)**

```
GET /api/courses/active                 - List all active courses
GET /api/courses/active/{id}            - Get specific active course
```

**Response Example:**
```json
{
  "courses": [
    {
      "id": 1,
      "course_id": "CRS-001",
      "title": "Web Development Fundamentals",
      "category": "Technology",
      "level": "Professional",
      "enrolled_students": 234,
      "rating": 4.7,
      "rating_count": 45,
      "notification_sent": true,
      "notification_target_audience": "Technology Tutors",
      "approved_at": "2025-09-15T14:30:00Z"
    }
  ],
  "count": 3
}
```

#### **Rejected Courses**

```
GET /api/courses/rejected               - List all rejected courses
```

#### **Suspended Courses**

```
GET /api/courses/suspended              - List all suspended courses
```

#### **Status Change Actions**

```
POST /api/courses/{request_id}/approve
  Body: none
  Returns: { course_id: "CRS-005", status: "active" }

POST /api/courses/{request_id}/reject
  Body: { reason: "Quality issues" }
  Returns: { rejected_id: "REJ-CRS-003", status: "rejected" }

POST /api/courses/{course_id}/suspend
  Body: { reason: "Content review needed" }
  Returns: { suspended_id: "SUS-CRS-002", status: "suspended" }

POST /api/courses/{rejected_id}/reconsider
  Body: none
  Returns: { request_id: "REQ-CRS-007", status: "pending" }

POST /api/courses/{suspended_id}/reinstate
  Body: none
  Returns: { course_id: "CRS-008", status: "active" }
```

#### **Notifications**

```
POST /api/courses/{course_id}/notify
  Body: {
    "message": "We've identified market need for **Advanced Mathematics**...",
    "target_audience": "Mathematics Tutors"
  }
  Returns: { message: "Notification sent successfully" }
```

---

### 4. Backend Flow Implementation

#### **Approve Course Flow:**
1. Frontend: `POST /api/courses/REQ-CRS-005/approve`
2. Backend:
   - Reads course from `course_requests`
   - Generates new ID: `CRS-005`
   - Inserts into `active_courses` with default values (0 students, 0.0 rating, unsent notification)
   - Deletes from `course_requests`
   - Returns `{ course_id: "CRS-005", status: "active" }`
3. Frontend: Removes row from Pending table, adds to Active table

#### **Reject Course Flow:**
1. Frontend: `POST /api/courses/REQ-CRS-005/reject` with `{ reason: "..." }`
2. Backend:
   - Reads course from `course_requests`
   - Generates new ID: `REJ-CRS-003`
   - Inserts into `rejected_courses` with reason
   - Deletes from `course_requests`
   - Returns `{ rejected_id: "REJ-CRS-003", status: "rejected" }`
3. Frontend: Removes row from Pending table, adds to Rejected table

#### **Suspend Course Flow:**
1. Frontend: `POST /api/courses/CRS-001/suspend` with `{ reason: "..." }`
2. Backend:
   - Reads course from `active_courses`
   - Generates new ID: `SUS-CRS-002`
   - Inserts into `suspended_courses` with all data preserved
   - Deletes from `active_courses`
   - Returns `{ suspended_id: "SUS-CRS-002", status: "suspended" }`
3. Frontend: Removes row from Active table, adds to Suspended table

#### **Reconsider/Reinstate Flows:**
- Similar pattern: moves data between tables with ID transformation

---

## 📋 Next Steps

### Fix Backend Server Integration
The endpoints are created but need to be integrated properly with the main app.

**Issue:** `routes.py` has a reference to `app` that doesn't exist in that file.

**Fix:** The endpoints in `course_management_endpoints.py` are ready. They need to be loaded into `app.py` (already added).

### Update Frontend to Use Backend APIs

Update `js/admin-pages/manage-courses.js` to call real APIs instead of just moving DOM elements:

```javascript
// Current (DOM only):
window.approveCourse = function(requestId) {
  // ... creates new row manually ...
  // ... removes old row ...
}

// Updated (with API call):
window.approveCourse = async function(requestId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/courses/${requestId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    // Then update DOM with response data
    // ... creates new row with data.course_id ...
  } catch (error) {
    showNotification(`Failed to approve course: ${error}`, 'error');
  }
}
```

### Load All Tables from Database on Page Load

Add these functions to fetch data on page load:

```javascript
async function loadCourseRequests() {
  const response = await fetch(`${API_BASE_URL}/api/courses/requests`);
  const data = await response.json();
  // Populate pending requests table
}

async function loadActiveCourses() {
  const response = await fetch(`${API_BASE_URL}/api/courses/active`);
  const data = await response.json();
  // Populate active courses table
}

async function loadRejectedCourses() {
  const response = await fetch(`${API_BASE_URL}/api/courses/rejected`);
  const data = await response.json();
  // Populate rejected courses table
}

async function loadSuspendedCourses() {
  const response = await fetch(`${API_BASE_URL}/api/courses/suspended`);
  const data = await response.json();
  // Populate suspended courses table
}

// Call on page load
document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([
    loadCourseRequests(),
    loadActiveCourses(),
    loadRejectedCourses(),
    loadSuspendedCourses()
  ]);
});
```

---

## 🗂️ Files Created/Modified

### Created:
1. `astegni-backend/migrate_course_tables.py` - Database migration
2. `astegni-backend/seed_course_data.py` - Sample data seeder
3. `astegni-backend/course_management_endpoints.py` - Complete API

### Modified:
1. `astegni-backend/app.py` - Added course router import

### To Modify:
1. `js/admin-pages/manage-courses.js` - Add API integration
2. `astegni-backend/app.py modules/routes.py` - Fix app reference error

---

## 🔄 Database Operations Performed

```bash
# Create tables
python migrate_course_tables.py
# Output: ✅ 5 tables created with indexes

# Seed data
python seed_course_data.py
# Output: ✅ 10 sample courses added across 4 tables
```

---

## 📊 Current Database State

```sql
SELECT COUNT(*) FROM course_requests;     -- 4 records
SELECT COUNT(*) FROM active_courses;      -- 3 records
SELECT COUNT(*) FROM rejected_courses;    -- 2 records
SELECT COUNT(*) FROM suspended_courses;   -- 1 record
SELECT COUNT(*) FROM course_notifications; -- 0 records
```

---

## 🚀 Benefits of This Implementation

1. **Data Persistence** - All course actions saved to database
2. **Audit Trail** - Complete history of approvals, rejections, suspensions
3. **Scalability** - Proper relational structure with indexes
4. **ID Tracking** - Original IDs preserved (original_request_id, original_course_id)
5. **Notification History** - Separate table tracks all notifications sent
6. **Ethiopian Context** - Sample data uses Ethiopian names, schools, subjects
7. **RESTful API** - Standard HTTP methods for all operations
8. **Type Safety** - Pydantic models for request/response validation

---

**Date:** October 8, 2025
**Status:** Database ✅ | API Endpoints ✅ | Server Integration ⏳ | Frontend Integration ⏳
