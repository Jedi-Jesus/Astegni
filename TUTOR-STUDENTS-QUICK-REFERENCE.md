# Tutor Students Table - Quick Reference Guide

## New Table Structure

### tutor_students Table
```sql
CREATE TABLE tutor_students (
    id SERIAL PRIMARY KEY,
    tutor_id INTEGER NOT NULL REFERENCES users(id),
    requester_id INTEGER,
    requester_type VARCHAR(20),  -- 'student' or 'parent'
    student_id INTEGER NOT NULL REFERENCES users(id),
    package_name VARCHAR(255),
    session_request_id INTEGER,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Quick Setup (One-Time)

```bash
# 1. Navigate to backend directory
cd astegni-backend

# 2. Run migrations
python migrate_refactor_tutor_students.py
python migrate_drop_student_tutors.py

# 3. Seed sample data
python seed_tutor_students.py

# Done! ✅
```

## Common Database Queries

### Get all students for a tutor
```sql
SELECT
    ts.id,
    ts.student_id,
    CONCAT(u.first_name, ' ', u.father_name, ' ', u.grandfather_name) as student_name,
    sp.grade_level,
    sp.profile_picture,
    ts.package_name,
    ts.enrolled_at
FROM tutor_students ts
INNER JOIN users u ON ts.student_id = u.id
LEFT JOIN student_profiles sp ON u.id = sp.user_id
WHERE ts.tutor_id = ?
ORDER BY ts.enrolled_at DESC;
```

### Get all tutors for a student
```sql
SELECT
    ts.id,
    ts.tutor_id,
    CONCAT(u.first_name, ' ', u.father_name, ' ', u.grandfather_name) as tutor_name,
    tp.profile_picture,
    ts.package_name,
    ts.enrolled_at
FROM tutor_students ts
INNER JOIN users u ON ts.tutor_id = u.id
LEFT JOIN tutor_profiles tp ON u.id = tp.user_id
WHERE ts.student_id = ?
ORDER BY ts.enrolled_at DESC;
```

### Count students per tutor
```sql
SELECT
    tutor_id,
    COUNT(*) as student_count
FROM tutor_students
GROUP BY tutor_id;
```

### Find students enrolled in specific package
```sql
SELECT
    ts.*,
    u.first_name,
    u.father_name
FROM tutor_students ts
INNER JOIN users u ON ts.student_id = u.id
WHERE ts.package_name = 'Mathematics Mastery';
```

## API Endpoints

### Get My Students (Tutor)
```http
GET /api/session-requests/tutor/my-students
Authorization: Bearer {tutor_token}

Response:
[
  {
    "id": 1,
    "student_id": 28,
    "student_name": "Jabez Jediael Mekonnen",
    "student_grade": "Grade 10",
    "profile_picture": "/uploads/...",
    "package_name": "Biology Deep Dive",
    "contact_phone": "+251911234567",
    "contact_email": "student@example.com",
    "accepted_at": "2025-11-22T10:30:00",
    "requester_type": "student"
  }
]
```

## Adding a New Enrollment (Python)

```python
from datetime import datetime
import psycopg

conn = psycopg.connect(DATABASE_URL)
cur = conn.cursor()

cur.execute("""
    INSERT INTO tutor_students (
        tutor_id,
        requester_id,
        requester_type,
        student_id,
        package_name,
        session_request_id,
        enrolled_at
    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
""", (
    tutor_user_id,      # e.g., 77
    requester_user_id,  # e.g., 28 (student) or parent's user_id
    'student',          # or 'parent'
    student_user_id,    # e.g., 28
    'Mathematics 101',
    123,                # session_request_id (or None)
    datetime.now()
))

conn.commit()
```

## Frontend Usage

The frontend already works with this structure! Just ensure:
1. Backend is running: `python app.py`
2. Frontend is running: `python -m http.server 8080`
3. Login as tutor
4. Navigate to "My Students" panel

Student cards will automatically display using the API data.

## Field Descriptions

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | INTEGER | Primary key | 1 |
| `tutor_id` | INTEGER | User ID of the tutor (references users.id) | 77 |
| `requester_id` | INTEGER | User ID who made the enrollment request | 28 |
| `requester_type` | VARCHAR(20) | Type of requester | "student" or "parent" |
| `student_id` | INTEGER | User ID of the student (references users.id) | 28 |
| `package_name` | VARCHAR(255) | Name of enrolled package | "Biology Deep Dive" |
| `session_request_id` | INTEGER | Reference to original session request | 123 |
| `enrolled_at` | TIMESTAMP | When enrollment was created | "2025-11-22 10:30:00" |
| `created_at` | TIMESTAMP | Record creation time | "2025-11-22 10:30:00" |
| `updated_at` | TIMESTAMP | Last update time | "2025-11-22 10:30:00" |

## Relationship Between IDs

```
Student requests session → Parent approves → Tutor accepts
    ↓                          ↓                  ↓
requester_id = student_id  requester_id = parent_id  Enrollment created
requester_type = "student" requester_type = "parent" in tutor_students
student_id = student_id    student_id = child's ID
```

## Migration Files Reference

| File | Purpose | Run Order |
|------|---------|-----------|
| `migrate_refactor_tutor_students.py` | Updates tutor_students table structure | 1st |
| `migrate_drop_student_tutors.py` | Removes redundant student_tutors table | 2nd |
| `seed_tutor_students.py` | Adds sample enrollment data | 3rd |

## Backup Tables

After migration, these backup tables exist:
- `tutor_students_backup` - Old tutor_students data
- `student_tutors_backup` - Old student_tutors data

To drop backups (once you're confident):
```sql
DROP TABLE tutor_students_backup;
DROP TABLE student_tutors_backup;
```

## Testing Checklist

- [ ] Backend starts without errors: `python app.py`
- [ ] API docs accessible: http://localhost:8000/docs
- [ ] Login as tutor works
- [ ] My Students panel loads
- [ ] Student cards display correctly with photos, names, grades
- [ ] Package names appear correctly
- [ ] Enrollment dates show correctly
- [ ] Action buttons work (View Details, Message)

## Troubleshooting

### No students showing up?
1. Check if tutor has students: `SELECT * FROM tutor_students WHERE tutor_id = ?;`
2. Run seed script: `python seed_tutor_students.py`
3. Check backend logs for SQL errors

### Student name showing as "Unknown Student"?
1. Verify users table has the student: `SELECT * FROM users WHERE id = ?;`
2. Check JOIN is working: Run the SQL query from "Get all students for a tutor" section

### Profile picture not displaying?
1. Check student_profiles table: `SELECT profile_picture FROM student_profiles WHERE user_id = ?;`
2. Verify file path exists or use default fallback

---

**Quick Access Links:**
- Full Documentation: [TUTOR-STUDENTS-REFACTORING-SUMMARY.md](TUTOR-STUDENTS-REFACTORING-SUMMARY.md)
- Backend Code: [session_request_endpoints.py](astegni-backend/session_request_endpoints.py)
- Frontend Code: [session-request-manager.js](js/tutor-profile/session-request-manager.js)
- Database Models: [models.py](astegni-backend/app.py modules/models.py)
