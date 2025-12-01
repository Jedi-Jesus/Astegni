# Student Documents Upload Fix - Files Folder Implementation

## Summary
Fixed student document uploads to use the correct student profile ID and save to a new dedicated `files/` folder instead of `documents/resources/`.

## Changes Made

### 1. Backend Endpoint Update
**File:** `astegni-backend/student_documents_endpoints.py`

**Line 145-151:** Changed upload folder from `documents` to `files`
```python
# Before:
file_type_folder = "documents"  # All student documents go in documents folder
file_upload_result = b2_service.upload_file(
    file_data=file_content,
    file_name=file.filename,
    file_type=file_type_folder,
    user_id=current_user.id  # ❌ Wrong: Used user table ID
)

# After:
file_type_folder = "files"  # All student documents go in files folder
file_upload_result = b2_service.upload_file(
    file_data=file_content,
    file_name=file.filename,
    file_type=file_type_folder,
    user_id=student_id  # ✅ Correct: Use student profile ID
)
```

### 2. Backblaze Service Update
**File:** `astegni-backend/backblaze_service.py`

**Lines 65-67:** Added new folder mappings for student files
```python
# Student files (achievements, certificates, extracurricular)
'files': 'files/',
'student_files': 'files/'
```

### 3. Documentation Updates
**File:** `astegni-backend/B2_FOLDER_STRUCTURE.md`

- Added new `Files` section in folder structure (lines 35-36)
- Added file type mappings for student files (lines 120-121)
- Added complete example for student file uploads (lines 137-149)

## File Organization Structure

### Before (❌ Incorrect)
```
documents/
  └── resources/
      └── user_{user_table_id}/
          └── achievement_certificate.pdf
```

### After (✅ Correct)
```
files/
  └── user_{student_profile_id}/
      └── achievement_certificate.pdf
      └── academic_certificate.pdf
      └── extracurricular_activity.pdf
```

## Why These Changes Matter

### 1. **Correct ID Usage**
- **Before:** Used `user_id` from `users` table (e.g., user ID 1)
- **After:** Uses `student_id` from `student_profiles` table (e.g., student profile ID 28)
- **Impact:** Files are now properly organized by student profile, not by generic user account

### 2. **Dedicated Folder**
- **Before:** Student documents mixed with educational resources in `documents/resources/`
- **After:** Student personal files separated in dedicated `files/` folder
- **Impact:** Better organization, clearer separation of concerns

### 3. **Scalability**
- Each student profile has their own folder: `files/user_28/`
- Files are timestamped to prevent conflicts: `achievement_20240115_143022.pdf`
- Easy to implement per-user storage quotas and file management

## File Path Examples

When student with profile ID 28 uploads documents:

| Document Type | Example Filename | Storage Path |
|--------------|------------------|--------------|
| Achievement | `award_certificate.pdf` | `files/user_28/award_certificate_20240115_143022.pdf` |
| Academic Certificate | `diploma.pdf` | `files/user_28/diploma_20240115_143530.pdf` |
| Extracurricular | `sports_medal.jpg` | `files/user_28/sports_medal_20240115_144001.jpg` |

## Testing Instructions

1. **Restart Backend Server:**
   ```bash
   cd astegni-backend
   python app.py
   ```

2. **Test Document Upload:**
   - Open: `http://localhost:8080/profile-pages/student-profile.html`
   - Login as a student
   - Go to "Documents" panel
   - Click "Upload Document"
   - Fill in details and upload a file
   - Verify it uploads successfully

3. **Verify File Location:**
   - Check Backblaze B2 bucket
   - Look for path: `files/user_{student_profile_id}/filename.pdf`
   - Confirm it's NOT in `documents/resources/`

## API Endpoint

**POST** `/api/student/documents/upload`

**Request:**
```
Content-Type: multipart/form-data
Authorization: Bearer {token}

Body:
- document_type: "achievement" | "academic_certificate" | "extracurricular"
- title: string
- description: string (optional)
- issued_by: string (optional)
- date_of_issue: YYYY-MM-DD (optional)
- expiry_date: YYYY-MM-DD (optional)
- file: File
```

**Storage Result:**
- Folder: `files/user_{student_profile_id}/`
- Filename: `{original_name}_{timestamp}.{ext}`
- Example: `files/user_28/certificate_20240115_143022.pdf`

## Related Files Modified

1. ✅ `astegni-backend/student_documents_endpoints.py` - Changed folder and ID
2. ✅ `astegni-backend/backblaze_service.py` - Added 'files' mapping
3. ✅ `astegni-backend/B2_FOLDER_STRUCTURE.md` - Updated documentation

## Backblaze Folder Setup

### Files Folder Created ✅
The `files/` folder has been successfully created in Backblaze B2:

```bash
cd astegni-backend
python setup_b2_folders.py
```

**Result:**
```
[OK] Created folder: files/
```

**Verification:**
```
Current bucket structure:
  [FOLDER] files/  ← ✅ Ready for uploads
```

## Status
✅ **COMPLETE** - Ready for production use

**Date:** 2025-01-15
**Issue:** Student documents using wrong ID and folder
**Resolution:** Use student profile ID, save to `files/` folder
**Backblaze:** Files folder created and verified
