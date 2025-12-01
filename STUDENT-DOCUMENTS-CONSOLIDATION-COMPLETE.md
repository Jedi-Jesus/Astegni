# Student Documents Table Consolidation - Complete ✅

## Summary

Successfully consolidated three separate tables (`student_achievements`, `student_certifications`, `student_extracurricular_activities`) into a single unified `student_documents` table with `document_type` field filtering.

---

## What Changed

### 1. Database Migration ✅

**Dropped Tables:**
- `student_achievements`
- `student_certifications`
- `student_extracurricular_activities`

**Updated Table: `student_documents`**

**Complete Schema (20 columns):**
```sql
CREATE TABLE student_documents (
    -- Core fields
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('achievement', 'academics', 'extracurricular')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    issued_by VARCHAR(255),

    -- Date fields
    date_of_issue DATE,
    expiry_date DATE,

    -- File fields
    document_url TEXT,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Verification fields (for admin review)
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by_admin_id INTEGER REFERENCES admin_profile(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    rejected_at TIMESTAMP,

    -- Featured flag
    is_featured BOOLEAN DEFAULT FALSE
);

-- Indexes
CREATE INDEX idx_student_documents_student_id ON student_documents(student_id);
CREATE INDEX idx_student_documents_type ON student_documents(document_type);
CREATE INDEX idx_student_documents_status ON student_documents(verification_status);
CREATE INDEX idx_student_documents_featured ON student_documents(is_featured);
```

**Migration Scripts:**
- `astegni-backend/migrate_consolidate_student_documents.py` - Initial drop and create
- `astegni-backend/update_student_documents_schema.py` - Add verification/featured fields

---

### 2. Backend Changes ✅

**File:** `astegni-backend/student_documents_endpoints.py`

**Updated Document Types:**
- ~~`academic_certificate`~~ → **`academics`**
- `achievement` → **`achievement`**
- `extracurricular` → **`extracurricular`**

**Updated Pydantic Model (DocumentResponse):**
```python
class DocumentResponse(BaseModel):
    id: int
    student_id: int
    document_type: str  # 'achievement', 'academics', 'extracurricular'
    title: str
    description: Optional[str] = None
    issued_by: Optional[str] = None
    date_of_issue: Optional[date] = None  # Changed from document_date
    expiry_date: Optional[date] = None    # NEW
    document_url: Optional[str] = None    # Changed from file_url
    file_name: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    verification_status: Optional[str] = 'pending'  # NEW
    is_verified: Optional[bool] = False              # NEW
    verified_by_admin_id: Optional[int] = None       # NEW
    rejection_reason: Optional[str] = None           # NEW
    rejected_at: Optional[datetime] = None           # NEW
    is_featured: Optional[bool] = False              # NEW
```

**Updated Stats Model:**
```python
class DocumentStats(BaseModel):
    total_achievements: int
    total_academics: int        # Changed from total_certificates
    total_extracurricular: int
    total_documents: int
```

**API Endpoints (No changes to URLs):**
- `POST /api/student/documents/upload` - Upload document
- `GET /api/student/documents?document_type={type}` - Get documents (filtered by type)
- `GET /api/student/documents/stats` - Get document counts
- `GET /api/student/documents/{document_id}` - Get specific document
- `DELETE /api/student/documents/{document_id}` - Delete document

---

### 3. Frontend Changes ✅

**File:** `profile-pages/student-profile.html`

**Upload Modal Form Updates:**
1. **Document Type Dropdown:**
   ```html
   <select id="documentType" name="documentType">
       <option value="achievement">Achievement</option>
       <option value="academics">Academic Certificate</option>  <!-- Changed from academic_certificate -->
       <option value="extracurricular">Extracurricular Activity</option>
   </select>
   ```

2. **Added Expiry Date Field:**
   ```html
   <div class="form-group">
       <label for="expiryDate" class="form-label">Expiry Date (Optional)</label>
       <input type="date" id="expiryDate" name="expiryDate" class="form-input">
   </div>
   ```

3. **Date of Issue (renamed from Document Date):**
   ```html
   <label for="documentDate" class="form-label">Date of Issue</label>
   <input type="date" id="documentDate" name="documentDate" class="form-input">
   ```

**Updated JavaScript Functions:**

1. **`handleDocumentUpload()`** - Updated FormData to use correct field names:
   ```javascript
   formData.append('document_type', document.getElementById('documentType').value);
   formData.append('title', document.getElementById('documentTitle').value);
   formData.append('description', document.getElementById('documentDescription').value || '');
   formData.append('issued_by', document.getElementById('issuedBy').value || '');
   formData.append('date_of_issue', document.getElementById('documentDate').value || '');
   formData.append('expiry_date', document.getElementById('expiryDate').value || '');  // NEW
   formData.append('file', document.getElementById('documentFile').files[0]);
   ```

2. **Panel Card Updates:**
   - Achievement card: `onclick="switchDocumentSection('achievement')"` → `id="doc-card-achievement"`
   - Academics card: `onclick="switchDocumentSection('academics')"` → `id="doc-card-academics"`
   - Extracurricular card: `onclick="switchDocumentSection('extracurricular')"` → `id="doc-card-extracurricular"`

3. **Section IDs Updated:**
   - `doc-section-achievement` (was `doc-section-achievements`)
   - `doc-section-academics` (was `doc-section-certificates`)
   - `doc-section-extracurricular` (unchanged)

4. **Updated `switchDocumentSection()`:**
   ```javascript
   function switchDocumentSection(section) {
       // ... existing code ...

       // Load documents for this type from database
       loadDocumentsByType(section);  // NEW: Fetches from API
   }
   ```

5. **Updated `updateDocumentCardStats()`:**
   ```javascript
   function updateDocumentCardStats(stats) {
       document.getElementById('stat-achievement-count').textContent = stats.total_achievements || 0;
       document.getElementById('stat-academics-count').textContent = stats.total_academics || 0;
       document.getElementById('stat-extracurricular-count').textContent = stats.total_extracurricular || 0;
   }
   ```

---

## How It Works Now

### Document Upload Flow

1. Student clicks **"Upload Document"** button
2. Modal opens with form fields:
   - Document Type: `achievement`, `academics`, or `extracurricular`
   - Title, Description, Issued By
   - Date of Issue, Expiry Date (optional)
   - File upload (PDF, JPG, PNG, DOC, DOCX - max 10MB)
3. Student submits form
4. JavaScript sends FormData to `POST /api/student/documents/upload`
5. Backend:
   - Validates file type and size
   - Uploads file to Backblaze B2: `documents/student_{document_type}s/user_{id}/{filename}`
   - Saves record to `student_documents` table with `document_type` field
6. Frontend:
   - Closes modal
   - Reloads documents for current section
   - Reloads stats (updates card counts)

### Panel Filtering Flow

1. Student clicks on a panel card (Achievements, Academic Certificates, or Extracurricular)
2. `switchDocumentSection(documentType)` is called
3. Function:
   - Hides all sections
   - Shows section matching `document_type`
   - Highlights active card
   - **Calls `loadDocumentsByType(documentType)`**
4. `loadDocumentsByType()` fetches from API:
   ```javascript
   GET /api/student/documents?document_type=achievement
   GET /api/student/documents?document_type=academics
   GET /api/student/documents?document_type=extracurricular
   ```
5. Documents are rendered in the appropriate section

### Stats Display

On page load and after upload:
- `loadDocumentStats()` fetches `GET /api/student/documents/stats`
- Response: `{ total_achievements: 5, total_academics: 3, total_extracurricular: 2, total_documents: 10 }`
- Updates card counts dynamically

---

## Testing Instructions

### 1. Run Database Migrations

```bash
cd astegni-backend
python update_student_documents_schema.py
```

Expected output:
```
============================================================
UPDATING STUDENT_DOCUMENTS SCHEMA
============================================================
...
Final schema (20 columns):
  - id, student_id, document_type, title, description
  - issued_by, date_of_issue, expiry_date, document_url
  - file_name, file_type, file_size
  - created_at, updated_at
  - verification_status, is_verified, verified_by_admin_id
  - rejection_reason, rejected_at, is_featured
============================================================
SCHEMA UPDATE COMPLETED!
============================================================
```

### 2. Start Backend Server

```bash
cd astegni-backend
python app.py
```

Backend should start on: `http://localhost:8000`

### 3. Start Frontend Server

```bash
# From project root
python -m http.server 8080
```

Frontend available at: `http://localhost:8080`

### 4. Test Document Upload

1. Open browser: `http://localhost:8080/profile-pages/student-profile.html`
2. Login as a student
3. Navigate to **Documents** panel
4. Click **"Upload Document"** button
5. Fill in form:
   - Document Type: **Achievement**
   - Title: "Honor Roll Certificate"
   - Description: "Achieved honor roll for Q1 2024"
   - Issued By: "Addis Ababa University"
   - Date of Issue: Select a date
   - Expiry Date: Leave blank or select future date
   - Upload a PDF/image file
6. Click **"Upload Document"**
7. Expected result: Success message, modal closes, stats update

### 5. Test Panel Filtering

1. After upload, click **Achievements** card
2. Should see documents with `document_type = 'achievement'`
3. Click **Academic Certificates** card
4. Should see documents with `document_type = 'academics'`
5. Click **Extracurricular** card
6. Should see documents with `document_type = 'extracurricular'`

### 6. Verify Stats

- Check card counts update after upload
- Achievements count: Shows `total_achievements`
- Academic Certificates count: Shows `total_academics`
- Extracurricular count: Shows `total_extracurricular`

---

## Database Queries for Verification

### Check Table Structure
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'student_documents'
ORDER BY ordinal_position;
```

### Count Documents by Type
```sql
SELECT
    document_type,
    COUNT(*) as count
FROM student_documents
GROUP BY document_type;
```

### Get All Documents for a Student
```sql
SELECT * FROM student_documents
WHERE student_id = 1
ORDER BY date_of_issue DESC NULLS LAST;
```

### Get Documents by Type
```sql
SELECT * FROM student_documents
WHERE student_id = 1 AND document_type = 'achievement'
ORDER BY date_of_issue DESC;
```

---

## API Testing with cURL

### Upload Document
```bash
curl -X POST http://localhost:8000/api/student/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "document_type=achievement" \
  -F "title=Test Achievement" \
  -F "description=Sample achievement" \
  -F "issued_by=Test Organization" \
  -F "date_of_issue=2024-01-15" \
  -F "expiry_date=2025-01-15" \
  -F "file=@sample.pdf"
```

### Get Documents (Filtered)
```bash
curl -X GET "http://localhost:8000/api/student/documents?document_type=achievement" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Stats
```bash
curl -X GET http://localhost:8000/api/student/documents/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## What's Next (Future Enhancements)

### Admin Verification Flow
- Admins can review uploaded documents
- Set `verification_status` to `verified` or `rejected`
- Add `rejection_reason` if rejected
- Track `verified_by_admin_id`

### Featured Documents
- Students can mark documents as featured
- Featured documents show prominently on profile
- Use `is_featured` flag

### Document Expiry Alerts
- System checks `expiry_date`
- Sends notifications before expiration
- Highlights expired documents in UI

### Advanced Filtering
- Filter by `verification_status`
- Filter by `is_verified`
- Filter by date range
- Search by title/description

---

## Files Modified

### Backend
- ✅ `astegni-backend/student_documents_endpoints.py` - Updated models and endpoints
- ✅ `astegni-backend/migrate_consolidate_student_documents.py` - Migration script
- ✅ `astegni-backend/update_student_documents_schema.py` - Schema update script

### Frontend
- ✅ `profile-pages/student-profile.html` - Upload modal, panel cards, JavaScript functions

### Documentation
- ✅ `STUDENT-DOCUMENTS-CONSOLIDATION-COMPLETE.md` - This file

---

## Troubleshooting

### Issue: Upload fails with "Invalid document type"
**Solution:** Check that `document_type` is one of: `achievement`, `academics`, `extracurricular`

### Issue: Stats not updating
**Solution:**
1. Check browser console for errors
2. Verify token in localStorage
3. Check backend logs for 401/403 errors

### Issue: Documents not loading
**Solution:**
1. Check `document_type` parameter in URL
2. Verify database has data: `SELECT * FROM student_documents`
3. Check browser Network tab for API response

### Issue: "Column does not exist" error
**Solution:** Run migration script again:
```bash
cd astegni-backend
python update_student_documents_schema.py
```

---

## Summary of Changes

| Component | Old Behavior | New Behavior |
|-----------|--------------|--------------|
| **Database** | 3 separate tables | 1 unified table with `document_type` field |
| **Document Types** | `academic_certificate` | `academics` |
| **Upload Modal** | Missing expiry date | Added `expiry_date` field |
| **Panel Cards** | Static hardcoded data | Dynamic data from database |
| **Stats** | Hardcoded numbers | Real-time counts from API |
| **Filtering** | No filtering | Filter by `document_type` on card click |
| **Verification** | Not supported | Added `verification_status`, `is_verified` fields |

---

**Status:** ✅ **COMPLETE AND READY FOR TESTING**

All database migrations, backend endpoints, and frontend UI updates are complete. The system is ready for testing!
