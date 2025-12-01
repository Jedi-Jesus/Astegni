# Tutor Tables Updates - Schema Changes

## Overview
The tutor-related tables have been updated with the following schema changes:

---

## Changes Made

### 1. tutor_students Table

**REMOVED:**
- ❌ `notes` field (Text) - Tutor's notes about students

**Current Schema:**
```sql
tutor_students:
  - id (Integer, Primary Key)
  - tutor_id (Integer, Foreign Key -> users.id)
  - student_id (Integer, Foreign Key -> users.id)
  - student_type (String) - 'current' or 'alumni'
  - courses (JSON) - Array of course names
  - enrollment_date (DateTime)
  - completion_date (DateTime, nullable)
  - total_sessions (Integer)
  - status (String) - 'active', 'inactive', 'completed'
  - created_at (DateTime)
  - updated_at (DateTime)
```

---

### 2. tutor_analysis Table

**RENAMED FIELDS:**

| Old Name | New Name | Type | Description |
|----------|----------|------|-------------|
| `subject_matter_rating` | `avg_subject_understanding_rating` | Float | Avg rating for subject understanding (1-5) |
| `communication_rating` | `avg_communication_rating` | Float | Avg rating for communication skills (1-5) |
| `discipline_rating` | `avg_discipline_rating` | Float | Avg rating for discipline/professionalism (1-5) |
| `punctuality_rating` | `avg_punctuality_rating` | Float | Avg rating for punctuality (1-5) |
| `total_bookings` | `total_requests` | Integer | Total booking requests received |

**ADDED FIELDS:**
- ✅ `improvement_rate` (Float) - Percentage showing student improvement rate (0-100)

**Updated Schema:**
```sql
tutor_analysis:
  # ID & Reference
  - id (Integer, Primary Key)
  - tutor_id (Integer, Foreign Key -> users.id, Unique)

  # Profile Visit Metrics
  - total_profile_visits (Integer)
  - unique_visitors (Integer)
  - visits_this_month (Integer)
  - visits_this_week (Integer)

  # Performance Metrics
  - success_rate (Float, 0-100)
  - average_response_time (Float, hours)
  - total_sessions_completed (Integer)
  - total_sessions_cancelled (Integer)

  # Rating Metrics (4-Factor System)
  - average_rating (Float, 1-5)
  - total_reviews (Integer)
  - avg_subject_understanding_rating (Float, 1-5) ✨ RENAMED
  - avg_communication_rating (Float, 1-5) ✨ RENAMED
  - avg_discipline_rating (Float, 1-5) ✨ RENAMED
  - avg_punctuality_rating (Float, 1-5) ✨ RENAMED

  # Engagement Metrics
  - total_students (Integer)
  - current_students (Integer)
  - alumni_students (Integer)
  - total_requests (Integer) ✨ RENAMED
  - improvement_rate (Float, 0-100) ✨ NEW

  # Revenue Metrics (ETB)
  - total_earnings (Float)
  - earnings_this_month (Float)

  # Additional
  - analytics_data (JSON)
  - last_visit_update (DateTime)
  - created_at (DateTime)
  - updated_at (DateTime)
```

---

### 3. tutor_resources Table

**NO CHANGES** - Schema remains the same.

**What is `resource_type`?**

The `resource_type` field categorizes uploaded files:

| Value | Description | Example File Types |
|-------|-------------|-------------------|
| `document` | Text-based educational materials | PDF, Word docs, worksheets, study guides |
| `video` | Video content | MP4, AVI, recorded lectures, tutorials |
| `image` | Image files | JPG, PNG, diagrams, infographics, charts |
| `audio` | Audio files | MP3, WAV, podcasts, audio lectures |
| `other` | Other file types | Any files not fitting above categories |

**Usage:**
- Frontend filtering: "Show only videos" or "Show only documents"
- File upload validation: Ensure correct MIME type matches resource_type
- Storage organization: Different handling for different file types

**Current Schema:**
```sql
tutor_resources:
  - id (Integer, Primary Key)
  - tutor_id (Integer, Foreign Key -> users.id)

  # Resource Details
  - title (String, max 255)
  - description (Text)
  - resource_type (String) - 'document', 'video', 'image', 'audio', 'other'
  - category (String) - 'lecture', 'worksheet', 'assignment', etc.

  # File Details (Backblaze B2)
  - file_url (String, max 500)
  - file_name (String, max 255)
  - file_size (Integer, bytes)
  - file_type (String) - MIME type (e.g., 'application/pdf')

  # Metadata
  - subject (String)
  - grade_level (String)
  - tags (JSON) - Array of tags

  # Access Control
  - visibility (String) - 'private', 'students_only', 'public'
  - download_count (Integer)
  - view_count (Integer)
  - status (String) - 'active', 'archived', 'deleted'

  # Timestamps
  - created_at (DateTime)
  - updated_at (DateTime)
```

---

## Migration Applied

**File:** `migrate_update_tutor_tables.py`

**What it does:**
1. ✅ Removes `notes` column from `tutor_students`
2. ✅ Renames rating columns in `tutor_analysis` with `avg_` prefix
3. ✅ Renames `total_bookings` → `total_requests` in `tutor_analysis`
4. ✅ Adds `improvement_rate` column to `tutor_analysis`

**Run Command:**
```bash
cd astegni-backend
python migrate_update_tutor_tables.py
```

**Status:** ✅ Successfully applied

---

## Updated Pydantic Schemas

### TutorStudentBase
```python
class TutorStudentBase(BaseModel):
    student_type: str = 'current'
    courses: Optional[List[str]] = None
    # notes field removed ❌
```

### TutorAnalysisResponse
```python
class TutorAnalysisResponse(BaseModel):
    # ... other fields ...

    # Rating metrics (renamed)
    average_rating: float
    total_reviews: int
    avg_subject_understanding_rating: float  # ✨ renamed
    avg_communication_rating: float          # ✨ renamed
    avg_discipline_rating: float             # ✨ renamed
    avg_punctuality_rating: float            # ✨ renamed

    # Engagement metrics
    total_students: int
    current_students: int
    alumni_students: int
    total_requests: int                       # ✨ renamed
    improvement_rate: float                   # ✨ new
```

---

## Updated Seed Data

**File:** `seed_tutor_tables_data.py`

**Changes:**
1. ✅ Removed `notes` field when creating `TutorStudent` records
2. ✅ Updated field names for `TutorAnalysis` records:
   - Uses `avg_subject_understanding_rating` instead of `subject_matter_rating`
   - Uses `avg_communication_rating` instead of `communication_rating`
   - Uses `avg_discipline_rating` instead of `discipline_rating`
   - Uses `avg_punctuality_rating` instead of `punctuality_rating`
   - Uses `total_requests` instead of `total_bookings`
   - Generates `improvement_rate` values (5-25% range)

**Sample improvement_rate values:**
```python
improvement_rate=round(random.uniform(5.0, 25.0), 2)  # 5% - 25% improvement
```

---

## Verification

**Check Updated Columns:**
```bash
cd astegni-backend
python verify_tutor_tables.py
```

**Expected Output:**
```
tutor_students columns:
  - id
  - tutor_id
  - student_id
  - student_type
  - courses
  - enrollment_date
  - completion_date
  - total_sessions
  - status
  - created_at
  - updated_at
  (NO 'notes' field)

tutor_analysis columns (selected):
  - average_rating
  - avg_subject_understanding_rating  ✨
  - avg_communication_rating          ✨
  - avg_discipline_rating             ✨
  - avg_punctuality_rating            ✨
  - total_requests                    ✨
  - improvement_rate                  ✨
```

---

## Breaking Changes & Migration Notes

### For Existing Code

**If you have API endpoints that use these fields:**

1. **tutor_students endpoints:**
   - ❌ Remove any references to `notes` field
   - Update Pydantic schemas (already done in models.py)

2. **tutor_analysis endpoints:**
   - 🔄 Update field names in responses:
     ```javascript
     // OLD
     tutor.subject_matter_rating
     tutor.communication_rating
     tutor.discipline_rating
     tutor.punctuality_rating
     tutor.total_bookings

     // NEW
     tutor.avg_subject_understanding_rating
     tutor.avg_communication_rating
     tutor.avg_discipline_rating
     tutor.avg_punctuality_rating
     tutor.total_requests
     tutor.improvement_rate  // new field
     ```

3. **Frontend (tutor-profile.html):**
   - Update analytics display to use new field names
   - Add display for `improvement_rate` metric
   - Remove any UI for editing student notes

---

## Summary

| Table | Changes | Status |
|-------|---------|--------|
| `tutor_students` | Removed `notes` field | ✅ Complete |
| `tutor_analysis` | Renamed 5 fields, added 1 new field | ✅ Complete |
| `tutor_resources` | No changes | ✅ N/A |

**Total Fields Changed:** 6
**Total Fields Added:** 1
**Total Fields Removed:** 1

---

## Files Updated

1. ✅ `migrate_create_tutor_tables.py` - Migration script with new schema
2. ✅ `app.py modules/models.py` - SQLAlchemy models and Pydantic schemas
3. ✅ `seed_tutor_tables_data.py` - Sample data generation
4. ✅ `migrate_update_tutor_tables.py` - Migration to update existing tables

**Documentation:**
1. ✅ `TUTOR-TABLES-UPDATES.md` - This file
2. 📝 `TUTOR-TABLES-IMPLEMENTATION.md` - Main implementation guide (needs update)
3. 📝 `TUTOR-TABLES-QUICKSTART.md` - Quick reference (needs update)

---

## Next Steps

1. ✅ Database schema updated
2. ✅ Models and schemas updated
3. ✅ Seed data updated
4. ⏳ Update API endpoints (if any exist)
5. ⏳ Update frontend to use new field names
6. ⏳ Add UI for `improvement_rate` metric
7. ⏳ Update documentation files
