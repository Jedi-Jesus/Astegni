# Student Documents Backend Setup Guide

## Overview
Complete backend implementation for student documents feature including achievements, academic certificates, and extracurricular activities with Backblaze B2 cloud storage integration.

---

## 📋 Quick Setup (3 Steps)

### Step 1: Create Database Table
```bash
cd astegni-backend
python create_student_documents_table.py
```

**Expected Output:**
```
✅ student_documents table created successfully!
✅ Indexes created successfully!
```

### Step 2: Start Backend Server
```bash
python app.py
```

**Expected Output:**
```
INFO:     Started server process
INFO:     Uvicorn running on http://localhost:8000
```

### Step 3: Test the Feature
1. Open `http://localhost:8080/profile-pages/student-profile.html`
2. Log in as a student
3. Click "Documents" in sidebar
4. Click "Upload Document" button
5. Fill the form and upload a file

---

## 🗄️ Database Schema

### Table: `student_documents`

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| student_id | INTEGER | Foreign key to users table |
| document_type | VARCHAR(50) | 'achievement', 'academic_certificate', 'extracurricular' |
| title | VARCHAR(255) | Document title |
| description | TEXT | Optional description |
| issued_by | VARCHAR(255) | Organization/issuer name |
| document_date | DATE | Date of achievement/certificate |
| file_url | TEXT | Backblaze B2 URL |
| file_name | VARCHAR(255) | Original filename |
| file_type | VARCHAR(50) | MIME type |
| file_size | INTEGER | File size in bytes |
| created_at | TIMESTAMP | Auto-generated |
| updated_at | TIMESTAMP | Auto-generated |

**Indexes:**
- `idx_student_documents_student_id` - For fast student lookups
- `idx_student_documents_type` - For filtered queries by type

**Constraints:**
- Document type must be: 'achievement', 'academic_certificate', or 'extracurricular'
- Foreign key cascade delete: deleting a user deletes their documents

---

## 🔌 API Endpoints

### 1. Upload Document
**POST** `/api/student/documents/upload`

**Authentication:** Required (Bearer token)

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `document_type` (required): 'achievement' | 'academic_certificate' | 'extracurricular'
- `title` (required): Document title
- `description` (optional): Description text
- `issued_by` (optional): Organization name
- `document_date` (required): Date in YYYY-MM-DD format
- `file` (required): File upload (PDF, JPG, PNG, DOC, DOCX - max 10MB)

**Response:** `200 OK`
```json
{
  "id": 1,
  "student_id": 28,
  "document_type": "achievement",
  "title": "Honor Roll Certificate",
  "description": "Achieved GPA above 3.8",
  "issued_by": "Addis Ababa University",
  "document_date": "2024-01-15",
  "file_url": "https://s3.eu-central-003.backblazeb2.com/astegni-media/documents/student_achievements/user_28/certificate_20240115.pdf",
  "file_name": "certificate.pdf",
  "file_type": "application/pdf",
  "file_size": 245678,
  "created_at": "2024-01-15T10:30:00",
  "updated_at": "2024-01-15T10:30:00"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid file type or size
- `403 Forbidden` - User is not a student
- `500 Internal Server Error` - Upload failed

---

### 2. Get All Documents (with optional filter)
**GET** `/api/student/documents?document_type={type}`

**Authentication:** Required (Bearer token)

**Query Parameters:**
- `document_type` (optional): Filter by 'achievement', 'academic_certificate', or 'extracurricular'

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "student_id": 28,
    "document_type": "achievement",
    "title": "Honor Roll Certificate",
    ...
  },
  {
    "id": 2,
    "student_id": 28,
    "document_type": "academic_certificate",
    "title": "Python Programming Certificate",
    ...
  }
]
```

---

### 3. Get Document Statistics
**GET** `/api/student/documents/stats`

**Authentication:** Required (Bearer token)

**Response:** `200 OK`
```json
{
  "total_achievements": 5,
  "total_certificates": 3,
  "total_extracurricular": 2,
  "total_documents": 10
}
```

---

### 4. Get Single Document
**GET** `/api/student/documents/{document_id}`

**Authentication:** Required (Bearer token)

**Response:** `200 OK`
```json
{
  "id": 1,
  "student_id": 28,
  "document_type": "achievement",
  "title": "Honor Roll Certificate",
  ...
}
```

**Error Responses:**
- `404 Not Found` - Document doesn't exist or doesn't belong to user

---

### 5. Delete Document
**DELETE** `/api/student/documents/{document_id}`

**Authentication:** Required (Bearer token)

**Response:** `200 OK`
```json
{
  "message": "Document deleted successfully"
}
```

**Error Responses:**
- `404 Not Found` - Document doesn't exist or doesn't belong to user

---

## 📁 File Storage (Backblaze B2)

### Storage Structure
```
astegni-media/
└── documents/
    ├── student_achievements/
    │   └── user_{student_id}/
    │       ├── honor_roll_20240115_143022.pdf
    │       └── math_olympiad_20231120_091234.jpg
    ├── student_academic_certificates/
    │   └── user_{student_id}/
    │       ├── python_cert_20240110_102045.pdf
    │       └── toefl_cert_20231215_150332.pdf
    └── student_extracurriculars/
        └── user_{student_id}/
            ├── soccer_team_20220901_083015.jpg
            └── drama_club_20230115_141122.pdf
```

### File Validation
- **Allowed formats:** PDF, JPG, JPEG, PNG, DOC, DOCX
- **Max size:** 10MB
- **Naming:** `{original_name}_{timestamp}.{ext}`

---

## 🧪 Testing Guide

### Test 1: Upload Achievement
```bash
curl -X POST http://localhost:8000/api/student/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "document_type=achievement" \
  -F "title=Honor Roll Student" \
  -F "description=GPA above 3.8" \
  -F "issued_by=Addis Ababa University" \
  -F "document_date=2024-01-15" \
  -F "file=@/path/to/certificate.pdf"
```

### Test 2: Get All Achievements
```bash
curl http://localhost:8000/api/student/documents?document_type=achievement \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Test 3: Get Statistics
```bash
curl http://localhost:8000/api/student/documents/stats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Test 4: Frontend Testing
1. **Login as Student:**
   - Go to `http://localhost:8080`
   - Login with student credentials

2. **Navigate to Documents:**
   - Click "Student Profile" (or navigate to student-profile.html)
   - Click "Documents" in sidebar

3. **Upload Document:**
   - Click "Upload Document" button
   - Select document type
   - Fill in required fields
   - Upload file (PDF, JPG, PNG, etc.)
   - Submit

4. **Verify Upload:**
   - Check document appears in correct section
   - Verify stats update on cards
   - Check browser console for any errors

---

## 🔐 Security Features

### Authentication
- JWT Bearer token required for all endpoints
- Only students can upload/view/delete documents
- Users can only access their own documents

### File Validation
- File type whitelist (no executables)
- File size limit (10MB)
- MIME type validation

### Database Security
- SQL injection prevention (parameterized queries)
- Foreign key constraints with cascade delete
- Input sanitization

---

## 🐛 Troubleshooting

### Issue: "Upload document modal not found"
**Solution:** Clear browser cache and reload page

### Issue: "Failed to upload document: 403"
**Solution:** Ensure user is logged in as a student, not tutor/parent

### Issue: "Invalid file type"
**Solution:** Only PDF, JPG, PNG, DOC, DOCX are allowed

### Issue: "File size exceeds 10MB"
**Solution:** Compress file or split into multiple documents

### Issue: Database table doesn't exist
**Solution:** Run `python create_student_documents_table.py`

### Issue: Backblaze upload fails
**Solution:** Check `.env` file has correct B2 credentials:
```
BACKBLAZE_KEY_ID=your_key_id
BACKBLAZE_APPLICATION_KEY=your_application_key
BACKBLAZE_BUCKET_NAME=astegni-media
BACKBLAZE_ENDPOINT=https://s3.eu-central-003.backblazeb2.com
```

---

## 📊 Frontend Integration

### Key Functions

**Upload Document:**
```javascript
async function handleDocumentUpload(event) {
    const formData = new FormData(event.target);
    const token = localStorage.getItem('token');

    const response = await fetch('http://localhost:8000/api/student/documents/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    });
}
```

**Load Statistics:**
```javascript
async function loadDocumentStats() {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:8000/api/student/documents/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const stats = await response.json();
    updateDocumentCardStats(stats);
}
```

**Load Documents by Type:**
```javascript
async function loadDocumentsByType(type) {
    const token = localStorage.getItem('token');
    const response = await fetch(
        `http://localhost:8000/api/student/documents?document_type=${type}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const documents = await response.json();
    renderDocuments(type, documents);
}
```

---

## 🚀 Future Enhancements

1. **Dynamic Document Rendering**
   - Replace hardcoded HTML with API-fetched data
   - Add pagination for large document lists

2. **Document Preview**
   - PDF viewer integration
   - Image preview modal

3. **Document Sharing**
   - Share documents with tutors/parents
   - Generate public shareable links

4. **Document Verification**
   - Add verification status field
   - Admin approval workflow

5. **Document Expiration**
   - Track expiration dates for time-sensitive documents
   - Automated expiration notifications

6. **Bulk Upload**
   - Upload multiple documents at once
   - CSV import for bulk data entry

7. **Document Categories/Tags**
   - Add custom tags to documents
   - Search and filter by tags

---

## 📝 Files Created

1. **Backend:**
   - `astegni-backend/create_student_documents_table.py` - Database migration
   - `astegni-backend/student_documents_endpoints.py` - API endpoints

2. **Frontend:**
   - Updated `profile-pages/student-profile.html` with:
     - Upload modal
     - API integration functions
     - Stats loading on page load

3. **Configuration:**
   - Updated `astegni-backend/app.py` - Registered new routes

---

## ✅ Verification Checklist

- [ ] Database table created successfully
- [ ] Backend server running without errors
- [ ] Upload modal opens when clicking button
- [ ] Document type dropdown has 3 options
- [ ] "Issued By" field visible for all types
- [ ] File upload accepts PDF, JPG, PNG, DOC, DOCX
- [ ] Upload shows loading spinner
- [ ] Success message after upload
- [ ] Document stats update after upload
- [ ] Stats load from database on page load
- [ ] Only students can upload documents
- [ ] Files stored in correct B2 folder structure

---

## 📞 Support

If you encounter issues:
1. Check backend logs for errors
2. Check browser console for frontend errors
3. Verify database table exists
4. Ensure B2 credentials are correct
5. Test API endpoints with curl/Postman

---

**Implementation Complete!** 🎉

The student documents feature is now fully integrated with:
- ✅ Database storage
- ✅ Backblaze B2 cloud storage
- ✅ File upload validation
- ✅ Real-time statistics
- ✅ Secure authentication
- ✅ Complete API endpoints
