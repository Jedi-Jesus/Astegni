# Tutor Data Source - Complete Documentation

## Summary
The **Tutor Requests** panel and all tutor-related panels read data from the PostgreSQL database, specifically from the `tutor_profiles` table.

## Database Table: `tutor_profiles`

### Table Structure:
```sql
CREATE TABLE tutor_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    verification_status VARCHAR,  -- 'pending', 'verified', 'rejected', 'suspended'
    courses JSON,                 -- Array of subjects
    location VARCHAR,
    teaches_at VARCHAR,
    experience INTEGER,
    education_level VARCHAR,
    profile_picture VARCHAR,
    id_document_url VARCHAR,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    -- ... other fields
);
```

## Data Flow for Each Panel

### 1. **Tutor Registration Requests Panel** (Pending)
```
Frontend: loadPendingTutors()
    ↓
API: GET /api/admin/tutors/pending
    ↓
Database: SELECT * FROM tutor_profiles WHERE verification_status = 'pending'
    ↓
Returns: List of pending tutors with user info joined
```

### 2. **Verified Tutors Panel**
```
Frontend: loadVerifiedTutors()
    ↓
API: GET /api/admin/tutors/verified
    ↓
Database: SELECT * FROM tutor_profiles WHERE verification_status = 'verified'
```

### 3. **Rejected Tutors Panel**
```
Frontend: loadRejectedTutors()
    ↓
API: GET /api/admin/tutors/rejected
    ↓
Database: SELECT * FROM tutor_profiles WHERE verification_status = 'rejected'
```

### 4. **Suspended Tutors Panel**
```
Frontend: loadSuspendedTutors()
    ↓
API: GET /api/admin/tutors/suspended
    ↓
Database: SELECT * FROM tutor_profiles WHERE verification_status = 'suspended'
```

### 5. **Dashboard Statistics**
```
Frontend: loadDashboardStats()
    ↓
API: GET /api/admin/tutors/statistics
    ↓
Database: COUNT queries on tutor_profiles grouped by verification_status
```

### 6. **Live Tutor Requests Widget**
```
Frontend: loadLiveTutorRequests()
    ↓
API: GET /api/admin/tutors/recent-activity
    ↓
Database: SELECT * FROM tutor_profiles ORDER BY updated_at DESC LIMIT 10
```

## Fixed Issues

### Model Mismatch (FIXED)
- **Problem**: Code was referencing non-existent `Tutor` model
- **Solution**: Changed all references from `Tutor` to `TutorProfile`
- **Files Fixed**:
  - `app.py modules/routes.py` lines 3806-3925
  - Statistics endpoint now correctly queries `TutorProfile`
  - Recent activity endpoint now correctly queries `TutorProfile`

## Sample Data Structure

### Database Record:
```json
{
  "id": 1,
  "user_id": 123,
  "verification_status": "pending",
  "courses": ["Mathematics", "Physics"],
  "location": "Addis Ababa",
  "teaches_at": "AAU",
  "experience": 5,
  "education_level": "Master's Degree",
  "profile_picture": "url_to_picture",
  "id_document_url": "url_to_document",
  "created_at": "2024-01-15T10:30:00",
  "updated_at": "2024-01-15T10:30:00"
}
```

### API Response:
```json
{
  "tutors": [
    {
      "id": 1,
      "name": "Abebe Tadesse",  // Joined from users table
      "email": "abebe@email.com", // From users table
      "phone": "+251911234567", // From users table
      "courses": ["Mathematics", "Physics"],
      "location": "Addis Ababa",
      "verification_status": "pending",
      "created_at": "2024-01-15T10:30:00"
    }
  ],
  "total": 8,
  "page": 1,
  "limit": 15
}
```

## How to Add Test Data

### Option 1: Run Seed Script
```bash
cd astegni-backend
python seed_tutor_data.py
```

### Option 2: Direct SQL Insert
```sql
-- First create a user
INSERT INTO users (username, email, first_name, father_name, roles)
VALUES ('tutor1', 'tutor1@test.com', 'Abebe', 'Tadesse', '["tutor"]');

-- Then create tutor profile
INSERT INTO tutor_profiles (
    user_id,
    verification_status,
    courses,
    location,
    teaches_at,
    experience,
    education_level
) VALUES (
    (SELECT id FROM users WHERE username = 'tutor1'),
    'pending',
    '["Mathematics", "Physics"]',
    'Addis Ababa',
    'AAU',
    5,
    'Master''s Degree'
);
```

## Testing

Run the test script:
```bash
cd astegni-backend
python test_manage_tutors_complete.py
```

This will verify:
✓ Statistics endpoint returns correct counts
✓ Recent activity returns latest tutors
✓ Each panel loads correct filtered data
✓ All data comes from database

## Key Points

1. **Single Source of Truth**: All tutor data comes from `tutor_profiles` table
2. **No Hardcoded Data**: Everything is dynamically loaded from database
3. **Real-time Updates**: Stats refresh every 60 seconds, live widget every 30 seconds
4. **Joined Data**: Tutor profiles are joined with users table to get names and contact info
5. **Status-based Filtering**: Each panel filters by `verification_status` field

The system is now fully integrated with the database!