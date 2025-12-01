# Tutor Requests Data Flow - Complete Documentation

## Data Source Overview

The **Tutor Registration Requests** panel reads its data from the PostgreSQL database, specifically from the `tutor_profiles` table.

## Database Architecture

### Primary Table: `tutor_profiles`
- **Location**: PostgreSQL database
- **Model**: `TutorProfile` class in `app.py modules/models.py`
- **Relationship**: Linked to `users` table via `user_id` foreign key

### Key Fields:
```sql
tutor_profiles
├── id (Primary Key)
├── user_id (Foreign Key to users.id)
├── verification_status (pending/verified/rejected/suspended)
├── name (from joined users table)
├── courses (JSON array)
├── location
├── teaches_at
├── experience
├── education_level
├── profile_picture
├── id_document_url
├── created_at
└── updated_at
```

## Data Flow Path

### 1. Frontend Request (manage-tutors.html)
```javascript
// js/admin-pages/manage-tutors-data.js
loadPendingTutors()
  ↓
fetch(`${API_BASE_URL}/api/admin/tutors/pending?page=${page}&limit=15`)
```

### 2. Backend API Endpoint
```python
# app.py modules/routes.py (Line 3479)
@router.get("/api/admin/tutors/pending")
def get_pending_tutors():
    # Queries TutorProfile table
    query = db.query(TutorProfile).join(User).filter(
        TutorProfile.verification_status == "pending"
    )
```

### 3. Database Query
```sql
SELECT * FROM tutor_profiles
JOIN users ON tutor_profiles.user_id = users.id
WHERE verification_status = 'pending'
ORDER BY created_at DESC
LIMIT 15 OFFSET 0;
```

### 4. Data Processing & Response
The backend returns:
```json
{
  "tutors": [
    {
      "id": 1,
      "user_id": 123,
      "name": "Abebe Tadesse",
      "courses": ["Mathematics", "Physics"],
      "location": "Addis Ababa",
      "teaches_at": "AAU",
      "experience": 5,
      "education_level": "Master's",
      "verification_status": "pending",
      "id_document_url": "url_to_document",
      "created_at": "2024-01-15T10:30:00"
    }
  ],
  "total": 8,
  "page": 1,
  "limit": 15,
  "total_pages": 1
}
```

### 5. Frontend Display
```javascript
// js/admin-pages/manage-tutors-data.js
renderPendingTutors(data.tutors)
  ↓
// Updates table in requested-panel with tutor data
```

## All Data Sources by Panel

### 1. **Dashboard Panel**
- **Statistics**: `/api/admin/tutors/statistics`
- **Live Widget**: `/api/admin/tutors/recent-activity`
- **Tables**: Aggregated from all endpoints

### 2. **Pending Requests Panel** (Tutor Requests)
- **Endpoint**: `/api/admin/tutors/pending`
- **Table**: `tutor_profiles` WHERE `verification_status = 'pending'`

### 3. **Verified Tutors Panel**
- **Endpoint**: `/api/admin/tutors/verified`
- **Table**: `tutor_profiles` WHERE `verification_status = 'verified'`

### 4. **Rejected Tutors Panel**
- **Endpoint**: `/api/admin/tutors/rejected`
- **Table**: `tutor_profiles` WHERE `verification_status = 'rejected'`

### 5. **Suspended Tutors Panel**
- **Endpoint**: `/api/admin/tutors/suspended`
- **Table**: `tutor_profiles` WHERE `verification_status = 'suspended'`

## Issue Found: Model Mismatch

### Problem
The statistics endpoints incorrectly reference `Tutor` model instead of `TutorProfile`:

```python
# INCORRECT (in routes.py lines 3806-3841)
total_tutors = db.query(Tutor).count()  # ❌ Tutor doesn't exist

# SHOULD BE
total_tutors = db.query(TutorProfile).count()  # ✓ Correct
```

### Fix Required
Replace all instances of `db.query(Tutor)` with `db.query(TutorProfile)` in:
- `/api/admin/tutors/statistics` endpoint
- `/api/admin/tutors/recent-activity` endpoint

## Data Population

### To Add Test Data:
```bash
cd astegni-backend
python seed_tutor_data.py
```

This creates tutor profiles with various statuses in the `tutor_profiles` table.

### Direct Database Insert:
```sql
INSERT INTO tutor_profiles (
    user_id,
    verification_status,
    courses,
    location,
    created_at
) VALUES (
    1,
    'pending',
    '["Mathematics", "Physics"]',
    'Addis Ababa',
    NOW()
);
```

## Summary

**Tutor Requests reads from:**
1. **Database Table**: `tutor_profiles`
2. **API Endpoint**: `/api/admin/tutors/pending`
3. **Filter**: `verification_status = 'pending'`
4. **Join**: With `users` table to get name and contact info
5. **Frontend**: Renders in `requested-panel` table

The data is 100% dynamic from the PostgreSQL database with no hardcoded values.