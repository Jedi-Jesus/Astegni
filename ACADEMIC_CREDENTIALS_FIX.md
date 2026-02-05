# Academic Credentials Fix - View Student Page

## Problem
Academic credentials were not showing on the view-student.html page in the credentials panel.

## Root Cause
**Document Type Naming Mismatch:**
- **Database**: Uses `document_type = 'academic'`
- **API & Frontend**: Were expecting `document_type = 'academic_certificate'`

The endpoint `/api/view-student/{student_profile_id}/credentials` was filtering for `'academic_certificate'` but the database contained `'academic'`, resulting in 0 results.

## Solution
Changed all references from `'academic_certificate'` to `'academic'` to match the database convention.

### Files Modified

#### 1. Backend API - `astegni-backend/student_credentials_endpoints.py`
**Lines changed: 110, 398, 647**

Changed validation from:
```python
valid_types = ['achievement', 'academic_certificate']
```

To:
```python
valid_types = ['achievement', 'academic']
```

#### 2. Frontend JavaScript - `js/view-student/view-student-credentials.js`
**Line changed: 283**

Changed type mapping from:
```javascript
const typeMap = {
    'achievements': 'achievement',
    'certifications': 'academic_certificate'
};
```

To:
```javascript
const typeMap = {
    'achievements': 'achievement',
    'certifications': 'academic'
};
```

#### 3. Admin Page - `admin-pages/js/admin-pages/manage-credentials-standalone.js`
**Lines changed: 1287, 1299**

Updated type labels and icons:
```javascript
// Before
'academic_certificate': 'Academic Certificate',
'academic_certificate': 'fa-scroll',

// After
'academic': 'Academic',
'academic': 'fa-scroll',
```

## Verification
Tested with database query confirming credentials are now properly retrieved:
- Student Profile ID: 1 → User ID: 2
- Academic credentials found: 1 ("Academics credentials")
- Achievements found: 1 ("test kush achievements")

## Database Schema
The `credentials` table uses these document types for students:
- `'achievement'` - Awards and achievements
- `'academic'` - Academic certificates and credentials

Both types require:
- `uploader_role = 'student'`
- `is_featured = TRUE` (for public view pages)
- `is_verified = TRUE` (for public view pages)

## Next Steps
Backend restart required for API changes to take effect:
```bash
cd astegni-backend
# Stop the running backend (Ctrl+C)
python app.py
```

Frontend will automatically pick up the changes on page refresh (no build process needed).

## Date
2026-02-02
