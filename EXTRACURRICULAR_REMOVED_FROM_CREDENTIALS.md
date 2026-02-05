# Extracurricular Removed from Student Credentials System

## Summary
Removed support for 'extracurricular' document type from the student credentials system. The credentials panel now only supports **Achievements** and **Academic Certificates**.

## Changes Made

### Backend: `astegni-backend/student_credentials_endpoints.py`

#### 1. **Updated Docstrings**
- Changed from: "Handles achievements, academic certificates, and extracurricular activities"
- Changed to: "Handles achievements and academic certificates"

#### 2. **Updated DocumentStats Model**
```python
class DocumentStats(BaseModel):
    total_achievements: int
    total_academics: int
    # REMOVED: total_extracurricular: int
    total_documents: int
```

#### 3. **Upload Endpoint (`POST /api/student/documents/upload`)**
- Changed valid_types from: `['achievement', 'academic_certificate', 'extracurricular']`
- Changed valid_types to: `['achievement', 'academic_certificate']`
- Updated docstring to remove extracurricular mention

#### 4. **Get Documents Endpoint (`GET /api/student/documents`)**
- Changed valid_types from: `['achievement', 'academic_certificate', 'extracurricular']`
- Changed valid_types to: `['achievement', 'academic_certificate']`

#### 5. **View Student Credentials Endpoint (`GET /api/view-student/{student_profile_id}/credentials`)**
- Changed valid_types from: `['achievement', 'academic_certificate', 'certification']`
- Changed valid_types to: `['achievement', 'academic_certificate']`
- Removed backwards compatibility mapping for 'certification' type
- Updated docstring to remove extracurricular mention

#### 6. **Document Stats Endpoint (`GET /api/student/documents/stats`)**
- Removed extracurricular count from SQL query:
```sql
-- REMOVED: COUNT(*) FILTER (WHERE document_type = 'extracurricular') as total_extracurricular
```

## Current State

### Frontend (Already Aligned)
- **view-student.html** only displays 2 credential sections:
  1. 🏆 Achievements (awards & recognition)
  2. 🎓 Academic Credentials (certificates & qualifications)

- **view-student-credentials.js** only handles these 2 types
- No UI elements for extracurricular

### Backend (Now Aligned)
- All endpoints reject 'extracurricular' document_type
- Stats endpoint no longer counts extracurricular
- API documentation updated

### Database
- The `credentials` table still allows extracurricular in the schema
- Existing extracurricular records are NOT deleted
- They simply won't be accessible via student credential endpoints
- Extracurricular activities are now handled via:
  - Clubs panel (clubs/events system)
  - Events panel (clubs/events system)

## Valid Document Types (Post-Change)

### Student Credentials
- ✅ `achievement` - Awards, honors, competitions
- ✅ `academic_certificate` - Degrees, certifications, diplomas
- ❌ `extracurricular` - **REMOVED** (use clubs/events instead)

### Tutor Credentials (Unchanged)
The general `/api/documents` endpoint in `credentials_endpoints.py` still supports all types for tutors:
- `academic` - Academic credentials
- `experience` - Work experience
- (Other tutor-specific types remain unchanged)

## Migration Notes

### No Database Migration Required
- Existing extracurricular records remain in the database
- No data loss
- Records are simply inaccessible via student credential endpoints

### Alternative for Extracurricular Activities
Students should now use:
- **Clubs Panel** - For club memberships and activities
- **Events Panel** - For event participation
- These are separate systems with their own dedicated UI and endpoints

## Testing Required

1. ✅ Verify upload endpoint rejects extracurricular type
2. ✅ Verify view-student page only shows achievements and academic certificates
3. ✅ Verify stats endpoint returns correct counts without extracurricular
4. ✅ Verify existing credentials still display correctly
5. ⚠️ Test that trying to upload extracurricular returns proper error message

## Error Messages

When attempting to upload extracurricular type:
```
HTTP 400 Bad Request
"Invalid document type. Must be one of: achievement, academic_certificate"
```

## Related Files

### Modified
- ✅ `astegni-backend/student_credentials_endpoints.py`

### Unchanged (Already Aligned)
- `view-profiles/view-student.html`
- `js/view-student/view-student-credentials.js`
- `js/view-student/view-student-loader.js`

### Not Modified (Migration Files)
- `astegni-backend/migrate_create_unified_documents.py`
- `astegni-backend/migrate_student_documents.py`
- `astegni-backend/migrate_consolidate_student_documents.py`
- `astegni-backend/create_student_documents_table.py`
(These are historical migration files, safe to leave as-is)

## Next Steps

1. **Restart Backend** to apply changes:
   ```bash
   cd astegni-backend
   python app.py
   ```

2. **Test Upload Rejection**:
   ```bash
   curl -X POST "http://localhost:8000/api/student/documents/upload" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -F "document_type=extracurricular" \
     -F "title=Test" \
     -F "file=@test.pdf"
   # Should return: 400 Bad Request
   ```

3. **Verify View Student Page** works correctly with only 2 credential types

4. **Update Documentation** if needed to reflect that extracurricular is no longer a valid credential type

## Completed
✅ All extracurricular references removed from student credentials endpoints
✅ Frontend already aligned (no changes needed)
✅ Backend validation updated
✅ Error messages will now properly reject extracurricular type
