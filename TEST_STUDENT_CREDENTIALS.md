# Test Guide: Student Credentials Panel

## Quick Test Steps

### 1. Start Servers
```bash
# Terminal 1 - Backend
cd astegni-backend
python app.py

# Terminal 2 - Frontend
python dev-server.py
```

### 2. Access Student Profile
1. Open browser: http://localhost:8081/profile-pages/student-profile.html
2. Login as a student user
3. Click on "Credentials" tab in the left sidebar

### 3. Test Achievement Card
1. Click on the "Awards and Honors" card (🏆)
2. **Expected Results**:
   - Achievement section becomes visible
   - Academic section becomes hidden
   - Browser console shows:
     ```
     🔄 Switching to achievement credentials
     ✅ Showing section: cred-section-achievement
     ❌ Hiding section: cred-section-academic
     📊 Displaying X achievement credentials
     ```
   - Achievements grid loads with student's achievement credentials
   - Empty state shows if no achievements: "No awards yet"

### 4. Test Academic Credentials Card
1. Click on the "Academic Credentials" card (🎓)
2. **Expected Results**:
   - Academic section becomes visible
   - Achievement section becomes hidden
   - Browser console shows:
     ```
     🔄 Switching to academic credentials
     ❌ Hiding section: cred-section-achievement
     ✅ Showing section: cred-section-academic
     📊 Displaying X academic credentials
     ```
   - Academic grid loads with student's academic credentials
   - Empty state shows if no credentials: "No academic credentials yet"

### 5. Test Upload Achievement
1. Click "Upload Credential" button
2. Fill form:
   - Document Type: "Achievement"
   - Title: "Test Achievement"
   - Issued By: "Test Organization"
   - Date of Issue: (any date)
   - Upload File: (select a PDF/image)
3. Click "Upload Document"
4. **Expected Results**:
   - Success message appears
   - Modal closes
   - "Awards and Honors" card count increases by 1
   - New achievement appears in achievements grid

### 6. Test Upload Academic Credential
1. Click "Upload Credential" button
2. Fill form:
   - Document Type: "Academic Certificate"
   - Title: "Test Degree"
   - Issued By: "Test University"
   - Date of Issue: (any date)
   - Upload File: (select a PDF/image)
3. Click "Upload Document"
4. **Expected Results**:
   - Success message appears
   - Modal closes
   - "Academic Credentials" card count increases by 1
   - New credential appears in academic grid

### 7. Test Card Switching with Data
1. Click "Awards and Honors" card → Should see achievements
2. Click "Academic Credentials" card → Should see academic credentials
3. Click "Awards and Honors" card again → Should see achievements again
4. **Expected**: Smooth switching between sections, no data loss

## Browser Console Checks

### Initial Load
```
🚀 Initializing Credential Manager for student...
[CredentialManager] Current role: student
✅ Loaded X student credentials
📊 Credential counts - Achievements: X, Academic: Y, Experience: 0
✅ Credential Manager initialized
```

### When Clicking Achievement Card
```
🔄 Switching to achievement credentials
✅ Showing section: cred-section-achievement
❌ Hiding section: cred-section-academic
📊 Displaying X achievement credentials
```

### When Clicking Academic Card
```
🔄 Switching to academic credentials
❌ Hiding section: cred-section-achievement
✅ Showing section: cred-section-academic
📊 Displaying X academic credentials
```

### When Uploading Credential
```
📤 Uploading new document...
📤 FormData contents:
  document_type: achievement
  title: Test Achievement
  issued_by: Test Organization
  ...
✅ Credential uploaded successfully
📊 Credential counts - Achievements: X+1, Academic: Y, Experience: 0
```

## Network Tab Checks

### On Panel Load
- **Request**: `GET /api/documents?uploader_role=student`
- **Response**: Array of credentials
- **Status**: 200 OK

### On Upload
- **Request**: `POST /api/documents/upload`
- **Payload**: FormData with credential fields + file
- **Response**: Newly created credential object
- **Status**: 200 OK

## Troubleshooting

### Cards don't switch sections
- **Check**: Browser console for errors
- **Fix**: Hard refresh (Ctrl+Shift+R) to clear cache
- **Verify**: credential-manager.js version is `v=20260131-sectionfix`

### Credentials don't load
- **Check**: Network tab for `/api/documents` request
- **Verify**: User has student role (`localStorage.getItem('activeRole')` should be 'student')
- **Check**: Backend logs for errors

### Counts show 0 but credentials exist
- **Check**: Console logs for "Credential counts"
- **Verify**: Credentials have correct `document_type` field
- **Check**: IDs `stat-achievement-count` and `stat-academic-count` exist in HTML

### Upload fails
- **Check**: Network tab for error response
- **Verify**: File size < 10MB
- **Verify**: File type is allowed (.pdf, .jpg, .png, .doc, .docx)
- **Check**: Backend logs for detailed error

## API Endpoint Reference

### GET /api/documents
```
Query Parameters:
  - uploader_role: 'student' (required)
  - document_type: 'achievement' | 'academic' | 'experience' (optional)

Response:
[
  {
    id: 1,
    uploader_id: 5,
    uploader_role: 'student',
    document_type: 'achievement',
    title: 'Math Competition Winner',
    verification_status: 'pending',
    ...
  }
]
```

### POST /api/documents/upload
```
Body (FormData):
  - document_type: 'achievement' | 'academic' | 'experience'
  - title: string
  - issued_by: string
  - date_of_issue: YYYY-MM-DD
  - description: string (optional)
  - expiry_date: YYYY-MM-DD (optional)
  - is_featured: boolean (optional)
  - uploader_role: 'student'
  - file: File

Response:
{
  id: 2,
  uploader_id: 5,
  uploader_role: 'student',
  document_type: 'achievement',
  title: 'New Achievement',
  verification_status: 'pending',
  ...
}
```

## Success Criteria

✅ Clicking "Awards and Honors" card shows achievement section and hides academic section
✅ Clicking "Academic Credentials" card shows academic section and hides achievement section
✅ Both sections load data from the credentials table filtered by uploader_role='student'
✅ Credential counts update correctly on both cards
✅ Upload workflow works for both achievement and academic types
✅ View/Edit/Delete functions work on both types
✅ No console errors
✅ Smooth section transitions
✅ Data persists when switching between sections
