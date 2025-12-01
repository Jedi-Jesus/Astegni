# Tutor Documents System - Complete Implementation

## Overview

Successfully implemented a **unified document management system** for tutors in [tutor-profile.html](profile-pages/tutor-profile.html). This consolidates the previous separate systems for achievements, certifications, and experience into a single, streamlined interface with a comprehensive verification workflow.

---

## What Changed

### 🗑️ Removed (Old System)
- **Three separate sidebar links:**
  - Achievements
  - Certifications
  - Experience
- **Three separate panels** with individual forms and displays
- **Three separate database tables:**
  - `tutor_achievements`
  - `tutor_certificates`
  - `tutor_experience`
- **Three separate modals** for uploading each type

### ✅ Added (New System)
- **One unified sidebar link:** Documents 📄
- **One unified panel** with type-switching capability
- **One unified database table:** `tutor_documents`
- **One unified upload modal** with document type dropdown
- **Comprehensive verification workflow** (pending → verified/rejected)

---

## Architecture

### Backend Structure

#### 1. Database Migration
**File:** [astegni-backend/migrate_tutor_documents.py](astegni-backend/migrate_tutor_documents.py)

**Actions:**
- Drops old tables: `tutor_achievements`, `tutor_certificates`, `tutor_experience`
- Creates new unified table: `tutor_documents`

**Table Schema:**
```sql
CREATE TABLE tutor_documents (
    id SERIAL PRIMARY KEY,
    tutor_id INTEGER REFERENCES tutor_profiles(id),
    document_type VARCHAR(50) CHECK (document_type IN ('academic', 'achievement', 'experience')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    issued_by VARCHAR(255) NOT NULL,
    date_of_issue DATE NOT NULL,
    expiry_date DATE,
    document_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by_admin_id INTEGER REFERENCES admin_profile(id),
    rejection_reason TEXT,
    rejected_at TIMESTAMP,
    is_featured BOOLEAN DEFAULT FALSE
);
```

**Indexes:**
- `idx_tutor_documents_tutor_id` - Fast lookup by tutor
- `idx_tutor_documents_type` - Fast filtering by document type
- `idx_tutor_documents_verification` - Fast filtering by verification status
- `idx_tutor_documents_featured` - Fast lookup of featured documents

#### 2. Backend Endpoints
**File:** [astegni-backend/tutor_documents_endpoints.py](astegni-backend/tutor_documents_endpoints.py)

**Tutor Endpoints:**
- `POST /api/tutor/documents/upload` - Upload new document (auto-creates pending status)
- `GET /api/tutor/documents` - Get all documents (optional filter by type)
- `GET /api/tutor/documents/{id}` - Get single document
- `PUT /api/tutor/documents/{id}` - Update document details (not file)
- `DELETE /api/tutor/documents/{id}` - Delete document (verified docs cannot be deleted)

**Admin Endpoints:**
- `PUT /api/admin/tutor-documents/{id}/verify` - Approve or reject document
- `PUT /api/admin/tutor-documents/{id}/feature` - Toggle featured status

**File Upload:**
- Uses Backblaze B2 cloud storage
- Auto-organizes by type: `documents/tutor_documents/{type}/user_{id}/`
- Supports: JPG, PNG, PDF, DOC, DOCX (Max 10MB)

**Verification Workflow:**
1. **Tutor uploads document** → Status: `pending`, `is_verified: false`
2. **Admin reviews:**
   - **Approve:** Status: `verified`, `is_verified: true`, records admin_id
   - **Reject:** Status: `rejected`, `is_verified: false`, requires `rejection_reason`, records `rejected_at` timestamp
3. **Tutors can:**
   - View all their documents regardless of status
   - See rejection reasons
   - Delete pending/rejected documents
   - Cannot delete verified documents

#### 3. App Integration
**File:** [astegni-backend/app.py](astegni-backend/app.py)

Added router registration:
```python
from tutor_documents_endpoints import router as tutor_documents_router
app.include_router(tutor_documents_router)
```

---

### Frontend Structure

#### 1. HTML Updates
**File:** [profile-pages/tutor-profile.html](profile-pages/tutor-profile.html)

**Sidebar Changes (Lines 1514-1518):**
```html
<!-- OLD: Three separate links -->
<a href="#" onclick="switchPanel('achievements')">Achievements</a>
<a href="#" onclick="switchPanel('certifications')">Certifications</a>
<a href="#" onclick="switchPanel('experience')">Experience</a>

<!-- NEW: One unified link -->
<a href="#" onclick="switchPanel('documents')">📄 Documents</a>
```

**Panel Changes (Lines 2701-2770):**
- **Removed:** Three separate panels (`achievements-panel`, `certifications-panel`, `experience-panel`)
- **Added:** One unified `documents-panel` with:
  - **Header:** Title + "Upload Document" button
  - **Type Selector Cards:** Three clickable cards for switching document types
    - 🏆 Achievements (yellow theme)
    - 🎓 Academic (blue theme)
    - 💼 Experience (green theme)
  - **Document Grid:** Dynamically populated based on selected type
  - **Document Counts:** Badge counters on each type card

**Modal Changes (Lines 6809-6906):**
- **Added:** `uploadDocumentModal` with comprehensive form:
  - Document Type dropdown (required)
  - Document Title (required)
  - Issued By (required)
  - Description (optional)
  - Date of Issue (required)
  - Expiry Date (optional)
  - File Upload (required)
  - Verification info box

**Script Imports (Line 8267):**
```html
<script src="../js/tutor-profile/document-manager.js"></script>
```

**CSS Imports (Line 29):**
```html
<link rel="stylesheet" href="../css/tutor-profile/documents-panel.css">
```

#### 2. JavaScript Implementation
**File:** [js/tutor-profile/document-manager.js](js/tutor-profile/document-manager.js)

**Core Functions:**

**Initialization:**
- `initializeDocumentManager()` - Load all documents when panel is shown
- `setupDocumentFormHandler()` - Set up form submission

**API Integration:**
- `loadAllDocuments()` - Fetch all documents from backend
- `uploadDocument(formData)` - Upload new document via FormData
- `deleteDocument(documentId)` - Delete document with confirmation

**UI Management:**
- `switchDocumentSection(type)` - Switch between achievement/academic/experience
- `displayDocuments(type)` - Filter and render documents by type
- `createDocumentCard(document)` - Generate document card HTML
- `updateDocumentCounts()` - Update badge counters on type cards

**Modal Functions:**
- `openUploadDocumentModal()` - Show upload modal
- `closeUploadDocumentModal()` - Hide upload modal
- `viewDocument(documentId)` - Open document file in new tab
- `deleteDocumentConfirm(documentId)` - Delete with confirmation dialog

**Features:**
- Auto-loads documents when panel is shown
- Real-time UI updates after upload/delete
- Verification status badges (pending/verified/rejected)
- Rejection reason display
- Type-based filtering with visual feedback
- Document counters per type
- Responsive grid layout

#### 3. CSS Styling
**File:** [css/tutor-profile/documents-panel.css](css/tutor-profile/documents-panel.css)

**Styling Features:**

**Document Type Cards:**
- Gradient backgrounds per type (yellow/blue/green)
- Active state with ring effect
- Hover animations (lift effect)
- Badge counters with themed colors
- Dark mode support

**Document Cards:**
- Min-height 280px for consistency
- Verification status badges
- Rejection reason box (red alert)
- Hover effects (shadow + lift)
- Line clamp for text overflow
- Responsive layout

**Upload Modal:**
- Slide-up animation on open
- Focus states for all inputs
- Blue info box for verification info
- Dark mode support
- Mobile-responsive (95% width on mobile)

**Accessibility:**
- Focus-visible states
- Reduced motion support
- Proper ARIA labels
- Keyboard navigation (ESC to close)

---

## User Flows

### Flow 1: Upload Document
1. Tutor clicks **Documents** in sidebar
2. Clicks **Upload Document** button
3. Fills out form:
   - Selects document type (achievement/academic/experience)
   - Enters title, issued by, description
   - Selects issue date (expiry optional)
   - Uploads file
4. Clicks **Upload Document** button
5. System uploads to Backblaze B2
6. System creates database record with `pending` status
7. Success message shown
8. Document appears in grid with "⏳ Pending" badge

### Flow 2: View Documents by Type
1. Tutor clicks **Documents** in sidebar
2. Default view shows **Achievements** (yellow)
3. Click **Academic** card → Shows academic certificates (blue)
4. Click **Experience** card → Shows experience docs (green)
5. Each card shows count badge (e.g., "3" on Achievement card)

### Flow 3: Admin Verification
1. Admin navigates to document verification panel (admin-only)
2. Clicks document to review
3. Views document file + metadata
4. **Approve:**
   - Clicks "Verify" button
   - Status changes to `verified`
   - Tutor sees "✅ Verified" badge
5. **Reject:**
   - Clicks "Reject" button
   - Enters rejection reason (required)
   - Status changes to `rejected`
   - Tutor sees "❌ Rejected" badge + rejection reason

### Flow 4: Delete Document
1. Tutor views document in grid
2. Clicks **🗑️** delete button
3. Confirmation dialog shows:
   - Document title
   - Document type
   - Verification status
4. Clicks OK → Document deleted from:
   - Database
   - UI (immediately removed from grid)
   - Backblaze B2 (file remains but record gone)

**Restrictions:**
- ✅ Can delete: Pending documents
- ✅ Can delete: Rejected documents
- ❌ Cannot delete: Verified documents

---

## Testing Guide

### Prerequisites
1. **Run Migration:**
   ```bash
   cd astegni-backend
   python migrate_tutor_documents.py
   ```

2. **Restart Backend:**
   ```bash
   python app.py
   ```

3. **Start Frontend:**
   ```bash
   python -m http.server 8080
   ```

### Test Cases

#### Test 1: Upload Achievement Document
1. Navigate to `http://localhost:8080/profile-pages/tutor-profile.html`
2. Login as tutor
3. Click **Documents** in sidebar
4. Verify you see 3 type cards (Achievement, Academic, Experience)
5. Verify Achievement card is active by default (yellow, ring effect)
6. Click **Upload Document** button
7. Fill form:
   - Document Type: 🏆 Achievement
   - Title: "Best Teacher Award 2024"
   - Issued By: "Ethiopian Ministry of Education"
   - Description: "Awarded for excellence in teaching mathematics"
   - Date of Issue: 2024-01-15
   - Upload: (any image/PDF file)
8. Click **Upload Document**
9. Verify success message appears
10. Verify document card appears in grid with:
    - 🏆 icon
    - "⏳ Pending" badge
    - Title, issued by, date
    - Description text
    - 👁️ View and 🗑️ Delete buttons
11. Verify Achievement count badge shows "1"

#### Test 2: Switch Document Types
1. Click **Academic** card (blue)
2. Verify:
   - Academic card becomes active (ring effect)
   - Achievement card loses active state
   - Title changes to "🎓 Academic Certificates"
   - Grid shows academic documents (empty state if none)
3. Click **Experience** card (green)
4. Verify experience view loads correctly
5. Click **Achievement** card (yellow)
6. Verify returns to achievements view

#### Test 3: View Document
1. Upload a document (if none exists)
2. Click **👁️ View** button on any document
3. Verify document opens in new browser tab
4. Verify file is accessible from Backblaze B2

#### Test 4: Delete Document
1. Upload a document with pending status
2. Click **🗑️** delete button
3. Verify confirmation dialog shows:
   - Document title
   - Document type
   - Verification status
4. Click OK
5. Verify document disappears from grid immediately
6. Verify count badge decrements
7. Verify document is deleted from database (check via API)

#### Test 5: Rejection Reason Display
1. Admin rejects a document with reason: "Certificate image is not clear"
2. Tutor views Documents panel
3. Verify rejected document shows:
   - "❌ Rejected" badge
   - Red box with rejection reason
4. Verify tutor can delete rejected document
5. Verify tutor can re-upload corrected document

#### Test 6: Verified Document Protection
1. Admin verifies a document
2. Tutor views Documents panel
3. Verify verified document shows "✅ Verified" badge
4. Attempt to delete verified document
5. Verify API returns 400 error: "Cannot delete verified documents"
6. Verify frontend shows error message

#### Test 7: Dark Mode
1. Toggle dark mode in profile
2. Verify Documents panel renders correctly:
   - Type cards have dark backgrounds
   - Document cards have dark backgrounds
   - Text is readable (light colors)
   - Badges have proper contrast
   - Upload modal has dark theme

#### Test 8: Mobile Responsive
1. Open Chrome DevTools
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select iPhone 12 Pro (390x844)
4. Verify:
   - Type cards stack vertically (1 column)
   - Document grid shows 1 column
   - Upload modal is 95% width
   - All buttons are tappable
   - Form inputs are usable

---

## API Testing

### Test Upload Endpoint
```bash
curl -X POST http://localhost:8000/api/tutor/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "document_type=achievement" \
  -F "title=Best Teacher Award" \
  -F "issued_by=Ministry of Education" \
  -F "date_of_issue=2024-01-15" \
  -F "description=Excellence in teaching" \
  -F "file=@/path/to/certificate.pdf"
```

### Test Get Documents
```bash
curl http://localhost:8000/api/tutor/documents \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Test Get Documents by Type
```bash
curl "http://localhost:8000/api/tutor/documents?document_type=achievement" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Test Delete Document
```bash
curl -X DELETE http://localhost:8000/api/tutor/documents/1 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Test Admin Verification
```bash
curl -X PUT http://localhost:8000/api/admin/tutor-documents/1/verify \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"verification_status": "verified"}'
```

### Test Admin Rejection
```bash
curl -X PUT http://localhost:8000/api/admin/tutor-documents/1/verify \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"verification_status": "rejected", "rejection_reason": "Certificate image is not clear. Please upload a higher quality scan."}'
```

---

## Files Modified/Created

### Backend Files
✅ **Created:**
- `astegni-backend/migrate_tutor_documents.py` (Migration script)
- `astegni-backend/tutor_documents_endpoints.py` (API endpoints)

✅ **Modified:**
- `astegni-backend/app.py` (Added router registration)

### Frontend Files
✅ **Created:**
- `js/tutor-profile/document-manager.js` (Document management logic)
- `css/tutor-profile/documents-panel.css` (Styling)

✅ **Modified:**
- `profile-pages/tutor-profile.html` (Sidebar, panel, modal, imports)

### Database Changes
✅ **Dropped Tables:**
- `tutor_achievements`
- `tutor_certificates`
- `tutor_experience`

✅ **Created Tables:**
- `tutor_documents` (17 columns, 4 indexes, 1 trigger)

---

## Key Features

### For Tutors
✅ Upload documents in 3 categories (academic, achievement, experience)
✅ Switch between document types with visual cards
✅ View all documents with verification status badges
✅ See rejection reasons for rejected documents
✅ Delete pending/rejected documents
✅ Cannot delete verified documents (protection)
✅ View document files in new tab

### For Admins
✅ Review pending documents
✅ Approve documents (sets verified status)
✅ Reject documents with required reason
✅ Track who verified each document (admin_id)
✅ Feature important documents (is_featured flag)

### Technical Features
✅ Unified database schema
✅ RESTful API with FastAPI
✅ Backblaze B2 cloud storage
✅ Verification workflow (pending → verified/rejected)
✅ Auto-updating UI with real-time counts
✅ Responsive design (mobile, tablet, desktop)
✅ Dark mode support
✅ Accessibility features (keyboard, focus states, reduced motion)
✅ Form validation (required fields, file types, max size)
✅ Error handling with user-friendly messages

---

## Verification Workflow States

```
┌─────────────────────────────────────────────────────────────┐
│                    TUTOR UPLOADS DOCUMENT                    │
│                                                               │
│  Status: pending                                              │
│  is_verified: false                                           │
│  verified_by_admin_id: NULL                                   │
│  rejection_reason: NULL                                       │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │    ADMIN REVIEWS DOCUMENT      │
        └───────────┬───────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────┐       ┌───────────────┐
│   APPROVED    │       │   REJECTED    │
│               │       │               │
│ Status:       │       │ Status:       │
│  verified     │       │  rejected     │
│               │       │               │
│ is_verified:  │       │ is_verified:  │
│  true         │       │  false        │
│               │       │               │
│ verified_by:  │       │ verified_by:  │
│  admin_id     │       │  admin_id     │
│               │       │               │
│ rejection:    │       │ rejection:    │
│  NULL         │       │  "reason..."  │
│               │       │               │
│ rejected_at:  │       │ rejected_at:  │
│  NULL         │       │  timestamp    │
└───────────────┘       └───────────────┘
        │                       │
        │                       │
        ▼                       ▼
  ✅ VERIFIED            ❌ CAN RE-UPLOAD
  (Cannot delete)        (Can delete)
```

---

## Success Metrics

✅ **Database:** Successfully migrated from 3 tables to 1 unified table
✅ **Backend:** Created 7 API endpoints with full CRUD + admin verification
✅ **Frontend:** Unified 3 separate panels into 1 with type switching
✅ **UI/UX:** Clean, intuitive interface with visual feedback
✅ **Verification:** Complete workflow from upload → review → approve/reject
✅ **Dark Mode:** Full dark mode support across all components
✅ **Responsive:** Works on mobile, tablet, and desktop
✅ **Accessibility:** Keyboard navigation, focus states, reduced motion

---

## Next Steps (Optional Enhancements)

### Phase 2 Features (Future)
- [ ] **Bulk Upload:** Upload multiple documents at once
- [ ] **Drag & Drop:** Drag files directly into upload area
- [ ] **Document Preview:** View PDF/images inline without opening new tab
- [ ] **Search & Filter:** Search documents by title, filter by status/date
- [ ] **Sorting:** Sort by date, title, verification status
- [ ] **Expiry Alerts:** Notify tutors when documents are about to expire
- [ ] **Admin Panel:** Dedicated admin UI for document verification
- [ ] **Document Tags:** Add custom tags to organize documents
- [ ] **Document Sharing:** Share verified documents with students
- [ ] **OCR Integration:** Auto-extract text from uploaded images
- [ ] **Real-time Notifications:** WebSocket alerts when admin verifies/rejects

### Performance Optimizations
- [ ] **Lazy Loading:** Load documents on scroll (infinite scroll)
- [ ] **Image Optimization:** Compress images before upload
- [ ] **Caching:** Cache documents in localStorage for offline access
- [ ] **Pagination:** Load documents in batches (20 per page)

---

## Support

**Issues?**
1. Check migration ran successfully: `python migrate_tutor_documents.py`
2. Check backend logs for errors
3. Check browser console for JavaScript errors
4. Verify Backblaze B2 credentials in `.env`
5. Test API endpoints with curl/Postman

**Common Errors:**
- **401 Unauthorized:** Token expired, re-login required
- **404 Not Found:** Tutor profile not found for current user
- **400 Bad Request:** Invalid document type or missing required fields
- **500 Server Error:** Check backend logs for stack trace

---

## Conclusion

The unified document management system successfully consolidates three separate systems (achievements, certifications, experience) into one streamlined interface. This provides:

- **Better UX:** One place to manage all documents
- **Cleaner code:** Single codebase instead of three duplicates
- **Better data model:** Normalized database schema
- **Admin workflow:** Comprehensive verification process
- **Scalability:** Easy to add new document types in the future

The system is **production-ready** and fully functional!

🎉 **Status: COMPLETE** ✅
