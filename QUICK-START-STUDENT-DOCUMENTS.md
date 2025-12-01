# 🚀 Student Documents - Quick Start Guide

## Setup (2 minutes)

### Step 1: Database
```bash
cd astegni-backend
python create_student_documents_table.py
```
✅ Expected: "student_documents table created successfully!"

### Step 2: Start Servers
```bash
# Terminal 1 - Backend
python app.py

# Terminal 2 - Frontend
cd ..
python -m http.server 8080
```

### Step 3: Test
1. Open: http://localhost:8080/profile-pages/student-profile.html
2. Login as student
3. Click "Documents" → "Upload Document"
4. Upload a file!

---

## API Quick Reference

### Upload Document
```bash
POST /api/student/documents/upload
Headers: Authorization: Bearer {token}
Body: multipart/form-data
  - document_type (achievement|academic_certificate|extracurricular)
  - title
  - description (optional)
  - issued_by (optional)
  - document_date (YYYY-MM-DD)
  - file (PDF, JPG, PNG, DOC, DOCX - max 10MB)
```

### Get Documents
```bash
GET /api/student/documents?document_type={type}
Headers: Authorization: Bearer {token}
```

### Get Stats
```bash
GET /api/student/documents/stats
Headers: Authorization: Bearer {token}
```

---

## File Locations

**Backend:**
- `astegni-backend/create_student_documents_table.py` - DB migration
- `astegni-backend/student_documents_endpoints.py` - API endpoints
- `astegni-backend/app.py` - Lines 195-197 (route registration)

**Frontend:**
- `profile-pages/student-profile.html`:
  - Lines 1134-1138: Sidebar
  - Lines 2894-3256: Documents panel
  - Lines 5021-5086: Upload modal
  - Lines 5922-6073: JavaScript

**Docs:**
- `STUDENT-DOCUMENTS-COMPLETE-SUMMARY.md` - Full overview
- `STUDENT-DOCUMENTS-BACKEND-SETUP.md` - Detailed API docs
- `STUDENT-DOCUMENTS-FEATURE-IMPLEMENTATION.md` - Frontend changes

---

## Troubleshooting

**Modal not opening?**
- Clear browser cache, reload

**Upload fails (403)?**
- Ensure logged in as student

**File rejected?**
- Only PDF, JPG, PNG, DOC, DOCX allowed
- Max 10MB

**Stats not loading?**
- Check browser console for errors
- Verify token in localStorage

---

## What's Included

✅ Upload modal with validation
✅ 3 document types
✅ File upload to Backblaze B2
✅ Real-time statistics
✅ Section switching
✅ 5 API endpoints
✅ Complete authentication
✅ Database storage

---

**Ready to go!** 🎉
