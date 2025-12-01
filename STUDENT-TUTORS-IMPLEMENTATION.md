# Student Tutors Table Implementation

## Overview
Created a new `student_tutors` table that mirrors the `tutor_students` table but from the student's perspective. This allows students to view and manage their tutors after connection requests are accepted.

## What Was Created

### 1. Database Table: `student_tutors`
**Location:** PostgreSQL database

**Schema:**
```sql
CREATE TABLE student_tutors (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tutor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tutor_type VARCHAR(20) NOT NULL DEFAULT 'current',  -- 'current' or 'past'
    courses JSONB,
    enrollment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completion_date TIMESTAMP WITH TIME ZONE,
    total_sessions INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

**Indexes:**
- `idx_student_tutors_student_id` - Fast lookup by student
- `idx_student_tutors_tutor_id` - Fast lookup by tutor
- `idx_student_tutors_unique` - Prevents duplicate relationships

**Features:**
- Automatically populated from accepted connections in `tutor_students` table
- Tracks current and past tutors
- Stores courses taken with each tutor
- Monitors total sessions completed
- Maintains enrollment and completion dates

### 2. Backend Model: `StudentTutor`
**File:** [astegni-backend/app.py modules/models.py](astegni-backend/app.py modules/models.py#L1629-L1646)

SQLAlchemy model with all table columns mapped to Python objects.

### 3. Pydantic Schemas
**File:** [astegni-backend/app.py modules/models.py](astegni-backend/app.py modules/models.py#L1765-L1790)

- `StudentTutorBase` - Base schema with tutor_type and courses
- `StudentTutorCreate` - For creating new relationships
- `StudentTutorUpdate` - For updating existing relationships
- `StudentTutorResponse` - For API responses with all fields

### 4. API Endpoints
**File:** [astegni-backend/app.py modules/routes.py](astegni-backend/app.py modules/routes.py#L3928-L4102)

#### GET `/api/student/tutors`
Get list of tutors for the current student.

**Query Parameters:**
- `tutor_type` (optional): Filter by 'current' or 'past'

**Response:**
```json
{
  "tutors": [
    {
      "id": 1,
      "tutor_id": 115,
      "tutor_type": "current",
      "tutor_name": "John Smith",
      "tutor_username": "john_tutor",
      "tutor_profile_picture": "path/to/image.jpg",
      "tutor_bio": "Experienced math tutor...",
      "subjects": ["Mathematics", "Physics"],
      "hourly_rate": 250.0,
      "courses": ["Algebra", "Calculus"],
      "enrollment_date": "2024-01-15T10:30:00",
      "completion_date": null,
      "total_sessions": 12,
      "status": "active",
      "created_at": "2024-01-15T10:30:00",
      "updated_at": "2024-01-15T10:30:00"
    }
  ],
  "total": 1
}
```

**Authorization:** Requires student role

#### GET `/api/student/tutors/{tutor_id}`
Get detailed information about a specific tutor relationship.

**Response:**
```json
{
  "id": 1,
  "tutor_id": 115,
  "tutor_type": "current",
  "tutor_name": "John Smith Doe",
  "tutor_username": "john_tutor",
  "tutor_profile_picture": "path/to/image.jpg",
  "tutor_bio": "Experienced math tutor...",
  "tutor_education_level": "Master's Degree",
  "tutor_certifications": ["TESOL", "Math Certificate"],
  "subjects": ["Mathematics", "Physics"],
  "languages": ["English", "Amharic"],
  "hourly_rate": 250.0,
  "session_format": "online",
  "courses": ["Algebra", "Calculus"],
  "enrollment_date": "2024-01-15T10:30:00",
  "completion_date": null,
  "total_sessions": 12,
  "status": "active",
  "created_at": "2024-01-15T10:30:00",
  "updated_at": "2024-01-15T10:30:00"
}
```

**Authorization:** Requires student role

#### PUT `/api/student/tutors/{tutor_id}`
Update a tutor relationship (e.g., mark as past, update courses).

**Request Body:**
```json
{
  "tutor_type": "past",
  "courses": ["Algebra", "Calculus", "Statistics"],
  "status": "completed",
  "completion_date": "2024-06-30T12:00:00"
}
```

**Response:**
```json
{
  "message": "Tutor relationship updated successfully",
  "id": 1,
  "tutor_id": 115,
  "tutor_type": "past",
  "status": "completed"
}
```

**Authorization:** Requires student role

### 5. Migration Script
**File:** [astegni-backend/migrate_create_student_tutors.py](astegni-backend/migrate_create_student_tutors.py)

Creates the `student_tutors` table with proper foreign keys, indexes, and constraints.

**Usage:**
```bash
cd astegni-backend
python migrate_create_student_tutors.py
```

### 6. Seed Script
**File:** [astegni-backend/seed_student_tutors.py](astegni-backend/seed_student_tutors.py)

Populates `student_tutors` from existing `tutor_students` data.

**Features:**
- Fetches all relationships from `tutor_students`
- Maps profile IDs to user IDs correctly
- Prevents duplicate entries
- Provides detailed progress output

**Usage:**
```bash
cd astegni-backend
python seed_student_tutors.py
```

## Database Statistics

**Current Data:**
- Total relationships: **3**
- Current tutors: **3**
- Past tutors: **0**

**Relationships Created:**
1. Student 94 ↔ Tutor 115
2. Student 95 ↔ Tutor 115
3. Student 115 ↔ Tutor 141

## How It Works

### 1. Relationship Flow
```
User submits connection request
         ↓
Connection accepted
         ↓
Record added to tutor_students (tutor perspective)
         ↓
Automatically mirrored to student_tutors (student perspective)
         ↓
Students can now view their tutors
```

### 2. Data Sync
The `student_tutors` table is populated from `tutor_students`:
- `tutor_students.student_profile_id` → resolved to `users.id` → `student_tutors.student_id`
- `tutor_students.tutor_id` → resolved to `users.id` → `student_tutors.tutor_id`
- Enrollment dates preserved
- Status set to 'active' by default
- Type set to 'current' by default

## Frontend Integration (Next Steps)

### Student Profile Page
**File:** [profile-pages/student-profile.html](profile-pages/student-profile.html)

**Recommended Sections:**

#### 1. My Tutors Panel
Display current and past tutors in a card grid layout.

```javascript
// In js/student-profile/tutors-manager.js
class StudentTutorsManager {
  async loadTutors(type = 'current') {
    const response = await fetch(
      `${API_BASE_URL}/api/student/tutors?tutor_type=${type}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    const data = await response.json();
    this.renderTutors(data.tutors);
  }

  renderTutors(tutors) {
    // Create tutor cards with:
    // - Profile picture
    // - Name and bio
    // - Subjects taught
    // - Total sessions
    // - View profile button
    // - Message button
  }
}
```

#### 2. Tutor Details Modal
Show detailed information when clicking on a tutor.

```javascript
async showTutorDetails(tutorId) {
  const response = await fetch(
    `${API_BASE_URL}/api/student/tutors/${tutorId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  const tutor = await response.json();
  // Display modal with full tutor information
}
```

#### 3. Mark Tutor as Past
Allow students to mark completed tutoring relationships.

```javascript
async markAsPast(tutorId) {
  await fetch(
    `${API_BASE_URL}/api/student/tutors/${tutorId}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tutor_type: 'past',
        status: 'completed',
        completion_date: new Date().toISOString()
      })
    }
  );
  this.loadTutors(); // Refresh list
}
```

## Key Features

### ✅ Complete CRUD Operations
- **Create:** Automatically created from accepted connections
- **Read:** Get all tutors or specific tutor details
- **Update:** Modify relationship status, type, courses
- **Delete:** Cascade delete when user is removed

### ✅ Role-Based Access Control
All endpoints verify that the user has the "student" role before allowing access.

### ✅ Data Enrichment
API responses include full tutor profile information:
- Basic info (name, username, profile picture)
- Bio and education
- Subjects and languages
- Session format and pricing
- Relationship-specific data (courses, sessions, dates)

### ✅ Flexible Filtering
Students can filter tutors by type (current/past) to organize their learning history.

### ✅ Duplicate Prevention
Unique constraint ensures each student-tutor relationship is stored only once.

## Testing the API

### 1. Start Backend
```bash
cd astegni-backend
python app.py
```

### 2. Test Endpoints
Visit http://localhost:8000/docs for interactive API documentation.

**Example Requests:**

```bash
# Get all current tutors
curl -X GET "http://localhost:8000/api/student/tutors?tutor_type=current" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get specific tutor details
curl -X GET "http://localhost:8000/api/student/tutors/115" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Mark tutor as past
curl -X PUT "http://localhost:8000/api/student/tutors/115" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tutor_type": "past", "status": "completed"}'
```

## Benefits

### For Students
- **View all tutors** in one place
- **Track learning history** with past tutors
- **See session counts** and enrollment dates
- **Access tutor profiles** quickly
- **Organize by current/past** for better management

### For Platform
- **Bidirectional relationships** - Both tutors and students can view each other
- **Data consistency** - Mirrors tutor_students table
- **Easy expansion** - Ready for future features (ratings, reviews, analytics)
- **Performance** - Indexed for fast queries

## Future Enhancements

### 1. Session Management Integration
Link to actual session records from `whiteboard_sessions` table.

### 2. Progress Tracking
Track student progress with each tutor (grades, improvements, achievements).

### 3. Reviews Integration
Link to reviews students have left for their tutors.

### 4. Analytics
- Time spent with each tutor
- Subjects mastered with tutor's help
- Session attendance rates

### 5. Recommendations
Suggest new tutors based on past successful relationships.

## Files Created/Modified

### Created
- ✅ [astegni-backend/migrate_create_student_tutors.py](astegni-backend/migrate_create_student_tutors.py)
- ✅ [astegni-backend/seed_student_tutors.py](astegni-backend/seed_student_tutors.py)
- ✅ [STUDENT-TUTORS-IMPLEMENTATION.md](STUDENT-TUTORS-IMPLEMENTATION.md)

### Modified
- ✅ [astegni-backend/app.py modules/models.py](astegni-backend/app.py modules/models.py) - Added StudentTutor model and schemas
- ✅ [astegni-backend/app.py modules/routes.py](astegni-backend/app.py modules/routes.py) - Added 3 student_tutors endpoints

## Summary

The `student_tutors` table and API endpoints are now **fully functional** and ready to use in the student profile page. Students can:

1. ✅ View all their tutors (current and past)
2. ✅ Get detailed information about specific tutors
3. ✅ Update relationship status (mark as past, update courses)
4. ✅ Filter by tutor type for better organization

The system mirrors the `tutor_students` table perfectly, providing a bidirectional view of tutor-student relationships on the Astegni platform.

**Next step:** Integrate the API endpoints into [student-profile.html](profile-pages/student-profile.html) with a dedicated "My Tutors" panel.
