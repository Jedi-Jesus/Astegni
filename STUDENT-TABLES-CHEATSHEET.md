# Student Enhancement Tables - Quick Cheatsheet

## Tables Overview

| Table | Records | Verified | Purpose |
|-------|---------|----------|---------|
| student_achievements | 20 | 18 (90%) | Awards, honors, competitions |
| student_certifications | 19 | 13 (68%) | Certificates, credentials |
| student_extracurricular_activities | 23 | 15 (65%) | Clubs, sports, volunteering |

**Total:** 62 records | 46 verified (74%)

---

## Common Fields (All Tables)

```sql
id                      SERIAL PRIMARY KEY
student_id              INTEGER FK → users(id)
is_verified             BOOLEAN (TRUE/FALSE)
verified_by_admin_id    INTEGER FK → users(id)
rejection_reason        TEXT
verified_at             TIMESTAMP
document_url            TEXT (Backblaze B2)
is_featured             BOOLEAN
display_order           INTEGER
created_at              TIMESTAMP
updated_at              TIMESTAMP
```

---

## Quick Queries

### Get Verified Items (Public)
```sql
SELECT * FROM student_achievements
WHERE student_id = 123 AND is_verified = TRUE
ORDER BY display_order;
```

### Get Pending Items (Admin)
```sql
SELECT * FROM student_achievements
WHERE is_verified = FALSE AND verified_at IS NULL;
```

### Get Rejected Items (Student)
```sql
SELECT * FROM student_achievements
WHERE student_id = 123
  AND is_verified = FALSE
  AND verified_at IS NOT NULL;
```

### Verify Item (Admin)
```sql
UPDATE student_achievements
SET is_verified = TRUE,
    verified_by_admin_id = 789,
    verified_at = NOW()
WHERE id = 456;
```

### Reject Item (Admin)
```sql
UPDATE student_achievements
SET is_verified = FALSE,
    verified_by_admin_id = 789,
    verified_at = NOW(),
    rejection_reason = 'Document not clear'
WHERE id = 456;
```

---

## Unique Fields

### student_achievements
- `achievement_type` - 'academic', 'competition', 'honor', 'award', 'other'
- `issuing_organization`
- `date_received`

### student_certifications
- `issue_date`, `expiration_date`
- `credential_id`, `credential_url`
- `skills` - TEXT[] array

### student_extracurricular_activities
- `activity_type` - 'club', 'sport', 'volunteer', 'leadership', 'arts', 'music', 'drama', 'debate'
- `role_position`
- `start_date`, `end_date`
- `is_currently_active`
- `hours_per_week`
- `achievements`, `skills_gained` - TEXT[] arrays

---

## Setup Commands

```bash
cd astegni-backend

# One-time setup
python migrate_create_student_enhancement_tables.py
python seed_student_enhancements.py
python migrate_update_verification_fields.py

# Verify
python verify_student_tables.py
```

---

## API Endpoints (To Create)

### Student (CRUD)
```
GET    /api/student/achievements
POST   /api/student/achievements
PUT    /api/student/achievements/{id}
DELETE /api/student/achievements/{id}
```

### Admin (Verification)
```
GET /api/admin/achievements/pending
PUT /api/admin/achievements/{id}/verify
```

### Public (View)
```
GET /api/student/{id}/achievements
```

_(Same pattern for certifications and extracurricular)_

---

## Verification States

| is_verified | verified_at | Status |
|-------------|-------------|---------|
| FALSE | NULL | Pending (never reviewed) |
| TRUE | NOT NULL | Verified (approved) |
| FALSE | NOT NULL | Rejected |

---

## Files Reference

| File | Purpose |
|------|---------|
| migrate_create_student_enhancement_tables.py | Create tables |
| seed_student_enhancements.py | Seed sample data |
| migrate_update_verification_fields.py | Update verification fields |
| verify_student_tables.py | Verify setup |
| STUDENT-TABLES-FINAL-STATUS.md | Complete documentation |
| STUDENT-TABLES-CHEATSHEET.md | This cheatsheet |

---

## Frontend Logic

```javascript
// Check verification status
if (item.is_verified === true) {
    // Show verified badge
} else if (item.verified_at === null) {
    // Show "Pending" badge
} else {
    // Show "Rejected" badge + rejection_reason
}

// Display rejection reason
if (item.rejection_reason) {
    showRejectionNotice(item.rejection_reason);
}

// Show admin who verified
if (item.verified_by_admin_id) {
    fetchAdminName(item.verified_by_admin_id);
}
```

---

## Sample Data Examples

### Achievement
```json
{
  "id": 1,
  "student_id": 93,
  "title": "National Mathematics Olympiad - First Place",
  "achievement_type": "competition",
  "issuing_organization": "Ethiopian Mathematics Society",
  "date_received": "2024-06-15",
  "is_verified": true,
  "verified_by_admin_id": 5,
  "verified_at": "2024-06-20T10:30:00",
  "document_url": "https://s3.backblaze.com/...",
  "is_featured": true
}
```

### Certification
```json
{
  "id": 1,
  "student_id": 93,
  "certification_name": "Python Programming Certificate",
  "issuing_organization": "Coursera",
  "issue_date": "2024-06-01",
  "credential_id": "CERT-PY-2024-8475",
  "skills": ["Python", "Algorithms", "Data Structures"],
  "is_verified": true,
  "verified_at": "2024-06-05T14:00:00"
}
```

### Extracurricular
```json
{
  "id": 1,
  "student_id": 93,
  "activity_name": "Student Government Association",
  "activity_type": "leadership",
  "role_position": "Vice President",
  "start_date": "2023-01-15",
  "end_date": "2024-06-30",
  "is_currently_active": false,
  "hours_per_week": 8.0,
  "achievements": ["Organized 5 events", "Increased participation by 40%"],
  "skills_gained": ["Leadership", "Public Speaking", "Event Management"],
  "is_verified": true
}
```

---

## Indexes (19 total)

```sql
-- Achievements (6)
idx_achievements_student_id
idx_achievements_type
idx_achievements_featured
idx_achievements_verified
idx_achievements_admin

-- Certifications (6)
idx_certifications_student_id
idx_certifications_featured
idx_certifications_expiration
idx_certifications_verified
idx_certifications_admin

-- Extracurricular (7)
idx_extracurricular_student_id
idx_extracurricular_type
idx_extracurricular_active
idx_extracurricular_featured
idx_extracurricular_verified
idx_extracurricular_admin
```

---

## Status

✓ Tables created
✓ Verification enhanced
✓ Sample data seeded
✓ Indexes optimized
✓ Documentation complete

**Ready for integration!**
