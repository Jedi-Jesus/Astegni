# Tutor Tables Quick Start Guide

## What Was Created

Three new database tables for the tutor profile system:

| Table | Purpose | Records |
|-------|---------|---------|
| **tutor_students** | Track tutor's students (current/alumni) | 51 |
| **tutor_analysis** | Tutor analytics & performance metrics | 10 |
| **tutor_resources** | Tutor resources with file uploads | 115 |

---

## Quick Setup

### 1. Create Tables (One-Time)
```bash
cd astegni-backend
python migrate_create_tutor_tables.py
```

### 2. Seed Sample Data (One-Time)
```bash
python seed_tutor_tables_data.py
```

### 3. Verify Everything Works
```bash
python verify_tutor_tables.py
```

**Expected Output:**
```
Tutor Tables Data Summary:
============================================================
  tutor_students: 51 records
  tutor_analysis: 10 records
  tutor_resources: 115 records
============================================================
```

---

## Table Schemas

### tutor_students
```python
{
    "id": int,
    "tutor_id": int,              # FK to users
    "student_id": int,            # FK to users
    "student_type": str,          # 'current' or 'alumni'
    "courses": [str],             # ["Mathematics", "Physics"]
    "enrollment_date": datetime,
    "completion_date": datetime,  # null for current students
    "total_sessions": int,
    "status": str,                # 'active', 'inactive', 'completed'
    "notes": str                  # Tutor's private notes
}
```

### tutor_analysis
```python
{
    "id": int,
    "tutor_id": int,                      # FK to users (unique)

    # Profile visits
    "total_profile_visits": int,
    "unique_visitors": int,
    "visits_this_month": int,
    "visits_this_week": int,

    # Performance
    "success_rate": float,                # 0-100 percentage
    "average_response_time": float,       # hours
    "total_sessions_completed": int,
    "total_sessions_cancelled": int,

    # 4-Factor Rating System
    "average_rating": float,              # 1-5
    "total_reviews": int,
    "subject_matter_rating": float,       # 1-5
    "communication_rating": float,        # 1-5
    "discipline_rating": float,           # 1-5
    "punctuality_rating": float,          # 1-5

    # Engagement
    "total_students": int,
    "current_students": int,
    "alumni_students": int,
    "total_bookings": int,

    # Revenue (ETB)
    "total_earnings": float,
    "earnings_this_month": float,

    # Flexible analytics
    "analytics_data": dict,               # JSON field
    "last_visit_update": datetime
}
```

### tutor_resources
```python
{
    "id": int,
    "tutor_id": int,                      # FK to users

    # Resource details
    "title": str,
    "description": str,
    "resource_type": str,                 # 'document', 'video', 'image', 'audio'
    "category": str,                      # 'lecture', 'worksheet', etc.

    # File (Backblaze B2)
    "file_url": str,                      # Full B2 URL
    "file_name": str,
    "file_size": int,                     # bytes
    "file_type": str,                     # MIME type

    # Metadata
    "subject": str,                       # "Mathematics", "Physics", etc.
    "grade_level": str,                   # "Grade 9-10", "University"
    "tags": [str],                        # ["exam", "practice", "theory"]

    # Access control
    "visibility": str,                    # 'private', 'students_only', 'public'
    "download_count": int,
    "view_count": int,
    "status": str                         # 'active', 'archived', 'deleted'
}
```

---

## Sample API Endpoints (To Be Created)

### Students
```
GET    /api/tutor/students?type=current     # List current students
GET    /api/tutor/students?type=alumni      # List alumni
POST   /api/tutor/students                  # Add student
PUT    /api/tutor/students/{id}             # Update student info
DELETE /api/tutor/students/{id}             # Remove student
```

### Analytics
```
GET    /api/tutor/analysis                  # Get own analytics
GET    /api/tutor/{id}/analysis             # Get tutor's public analytics
POST   /api/tutor/analysis/visit            # Increment visit counter
```

### Resources
```
GET    /api/tutor/resources                 # Get own resources
GET    /api/tutor/{id}/resources            # Get tutor's public resources
POST   /api/tutor/resources                 # Upload resource (with file)
PUT    /api/tutor/resources/{id}            # Update resource
DELETE /api/tutor/resources/{id}            # Delete resource
POST   /api/tutor/resources/{id}/download   # Track download
POST   /api/tutor/resources/{id}/view       # Track view
```

---

## Frontend Integration Points

### 1. Students Panel (tutor-profile.html)
**Current Students Tab:**
- Display active students with course list
- Show total sessions per student
- Display enrollment date
- Allow tutors to add/edit notes

**Alumni Tab:**
- Show past students
- Display completion date
- Show total sessions completed

**Actions:**
- Add new student button
- Edit student info modal
- Mark student as alumni
- Remove student relationship

### 2. Analytics Panel (tutor-profile.html)
**Overview Cards:**
- Profile visits (today, week, month, all-time)
- Success rate percentage
- Average response time
- Total students (current vs alumni)

**Performance Metrics:**
- Sessions completed vs cancelled
- Average rating with 4-factor breakdown:
  - Subject Matter Expertise
  - Communication Skills
  - Discipline
  - Punctuality

**Revenue Metrics (ETB):**
- Total earnings
- This month's earnings
- Earnings trend graph (future)

### 3. Resources Panel (tutor-profile.html)
**Resource List:**
- Grid/list view of resources
- Filter by type (document, video, image)
- Filter by subject, grade level
- Search by title/tags

**Upload Resource:**
- File upload (connect to Backblaze B2)
- Title, description, category
- Subject, grade level, tags
- Visibility setting (private/students only/public)

**Resource Actions:**
- Edit resource details
- Download resource
- Delete resource
- View download/view counts

---

## File Upload (Backblaze B2)

**URL Format:**
```
https://s3.eu-central-003.backblazeb2.com/astegni-media/documents/resources/user_{tutor_id}/{filename}
```

**Example:**
```
user_86/mathematics_quick_reference_sheet.pdf
user_86/exam_preparation_guide_physics.pdf
user_87/chemistry_practice_problems.pdf
```

**Integration:**
Use existing `backblaze_service.py` upload methods:
```python
from backblaze_service import upload_file

file_url = upload_file(
    file_data=uploaded_file,
    file_name="resource.pdf",
    file_type="document",
    user_id=tutor_id
)
```

---

## Database Queries (Examples)

### Get Current Students for a Tutor
```python
from models import TutorStudent

students = db.query(TutorStudent).filter(
    TutorStudent.tutor_id == tutor_id,
    TutorStudent.student_type == 'current',
    TutorStudent.status == 'active'
).all()
```

### Get Tutor Analytics
```python
from models import TutorAnalysis

analytics = db.query(TutorAnalysis).filter(
    TutorAnalysis.tutor_id == tutor_id
).first()
```

### Get Public Resources for a Tutor
```python
from models import TutorResource

resources = db.query(TutorResource).filter(
    TutorResource.tutor_id == tutor_id,
    TutorResource.visibility == 'public',
    TutorResource.status == 'active'
).all()
```

### Increment Profile Visit
```python
from models import TutorAnalysis
from sqlalchemy import update

db.execute(
    update(TutorAnalysis)
    .where(TutorAnalysis.tutor_id == tutor_id)
    .values(
        total_profile_visits=TutorAnalysis.total_profile_visits + 1,
        visits_this_week=TutorAnalysis.visits_this_week + 1,
        visits_this_month=TutorAnalysis.visits_this_month + 1
    )
)
db.commit()
```

---

## Testing

### Test Data Available
- 10 tutors with complete analytics
- 51 tutor-student relationships
- 115 resources across different types

### Test Tutor IDs
From `verify_tutor_tables.py` output:
- Tutor ID: 86 (has students and resources)
- Tutor ID: 87 (has students and resources)
- Tutor ID: 107 (has students and resources)

### Manual Testing
```python
# In Python console or test script
import sys
sys.path.insert(0, 'app.py modules')
from models import get_db, TutorStudent, TutorAnalysis, TutorResource

db = next(get_db())

# Get tutor's students
students = db.query(TutorStudent).filter(TutorStudent.tutor_id == 86).all()
print(f"Tutor 86 has {len(students)} students")

# Get tutor's analytics
analytics = db.query(TutorAnalysis).filter(TutorAnalysis.tutor_id == 86).first()
print(f"Tutor 86 success rate: {analytics.success_rate}%")

# Get tutor's resources
resources = db.query(TutorResource).filter(TutorResource.tutor_id == 86).all()
print(f"Tutor 86 has {len(resources)} resources")
```

---

## Next Steps

1. **Create API Endpoints** - Add routes in `app.py modules/routes.py`
2. **Frontend UI** - Update `tutor-profile.html` with new panels
3. **File Upload** - Integrate Backblaze B2 for resource uploads
4. **Analytics Tracking** - Auto-update metrics when events occur
5. **Testing** - Test all CRUD operations

---

## Files Reference

**Migration & Seeding:**
- `astegni-backend/migrate_create_tutor_tables.py`
- `astegni-backend/seed_tutor_tables_data.py`
- `astegni-backend/verify_tutor_tables.py`

**Models:**
- `astegni-backend/app.py modules/models.py` (lines 1711-1938)

**Documentation:**
- `TUTOR-TABLES-IMPLEMENTATION.md` (detailed guide)
- `TUTOR-TABLES-QUICKSTART.md` (this file)

---

## Summary

✅ 3 tables created
✅ 176 sample records
✅ Pydantic schemas ready
✅ Backblaze B2 integration ready
✅ Foreign keys & indexes configured
✅ Ready for API development

**Total Setup Time:** ~2 minutes
