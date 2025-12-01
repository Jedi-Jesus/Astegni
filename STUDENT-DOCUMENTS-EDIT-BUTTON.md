# Student Documents Edit Button Feature

## Overview
Added Edit buttons to all document cards in the student profile's Documents Panel (Achievements, Academic Certificates, and Extracurricular Activities sections). Students can now edit document metadata and optionally replace files.

## Changes Made

### 1. Frontend - student-profile.html

#### Document Card Updates (Achievement & Academic Cards)
**Location:** Line ~6075-6107

Added Edit button alongside Delete button:
```html
<div class="flex gap-2">
    <button onclick="editStudentDocument(${doc.id}, '${type}')"
            class="text-blue-500 hover:text-blue-700 transition-colors"
            title="Edit document">
        <i class="fas fa-edit"></i>
    </button>
    <button onclick="deleteDocument(${doc.id}, '${type}')"
            class="text-red-500 hover:text-red-700 transition-colors"
            title="Delete document">
        <i class="fas fa-trash"></i>
    </button>
</div>
```

#### Extracurricular List Item Updates
**Location:** Line ~6146-6157

Added Edit button with same functionality:
```html
<div class="flex gap-2 ml-4">
    <button onclick="editStudentDocument(${doc.id}, 'extracurricular')"
            class="text-blue-500 hover:text-blue-700 transition-colors"
            title="Edit activity">
        <i class="fas fa-edit"></i>
    </button>
    <button onclick="deleteDocument(${doc.id}, 'extracurricular')"
            class="text-red-500 hover:text-red-700 transition-colors"
            title="Delete activity">
        <i class="fas fa-trash"></i>
    </button>
</div>
```

#### New `editStudentDocument` Function
**Location:** Line ~6164-6261

```javascript
async function editStudentDocument(documentId, type) {
    // Fetch document details from API
    // Populate form with existing data
    // Set edit mode attributes
    // Make file input optional
    // Update modal title to "✏️ Edit Document"
    // Show modal
}
```

**Key Features:**
- Fetches document from database
- Populates all form fields with current values
- Converts dates to YYYY-MM-DD format
- Triggers is_featured toggle change event
- Makes file upload optional (not required)
- Updates modal UI for edit mode

#### Enhanced `closeUploadDocumentModal` Function
**Location:** Line ~5765-5797

Now properly resets the form:
```javascript
function closeUploadDocumentModal() {
    // Reset form
    // Remove edit mode attributes
    // Reset modal title to "📤 Upload Document"
    // Make file input required again
    // Hide modal
}
```

#### Updated `handleDocumentUpload` Function
**Location:** Line ~5800-5890

Supports both create and update modes:
```javascript
async function handleDocumentUpload(event) {
    // Check if in edit mode
    const isEditMode = form.getAttribute('data-edit-mode') === 'true';
    const documentId = form.getAttribute('data-document-id');

    // File is optional in edit mode
    if (fileInput.files.length > 0) {
        formData.append('file', fileInput.files[0]);
    }

    // Call appropriate endpoint
    if (isEditMode && documentId) {
        // PUT /api/student/documents/{id}
    } else {
        // POST /api/student/documents/upload
    }
}
```

### 2. Backend - student_documents_endpoints.py

#### New PUT Endpoint
**Location:** Line ~491-638

```python
@router.put("/api/student/documents/{document_id}", response_model=DocumentResponse)
async def update_student_document(
    document_id: int,
    document_type: Optional[str] = Form(None),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    issued_by: Optional[str] = Form(None),
    date_of_issue: Optional[str] = Form(None),
    expiry_date: Optional[str] = Form(None),
    is_featured: Optional[bool] = Form(None),  # NEW!
    file: Optional[UploadFile] = File(None),   # NEW!
    current_user = Depends(get_current_user)
):
```

**Features:**
- All parameters optional (FormData)
- is_featured toggle support
- Optional file upload
- Date parsing (YYYY-MM-DD → date)
- File validation (type, size)
- Backblaze B2 upload
- Ownership verification
- Dynamic SQL query building
- Auto-updates `updated_at` timestamp

## How It Works

### User Flow

1. **View Documents**: Navigate to Documents Panel
2. **Click Edit**: Click ✏️ icon on any document card
3. **Modal Opens**: Upload modal opens with pre-filled data
4. **Make Changes**:
   - Edit title, description, issued_by, dates
   - Toggle is_featured status
   - Optionally upload new file
5. **Submit**: Form sends PUT request to backend
6. **Backend Updates**: Only changed fields are updated
7. **UI Refreshes**: Document list reloads with updated data

### Edit Mode vs Create Mode

| Feature | Create Mode | Edit Mode |
|---------|-------------|-----------|
| **Modal Title** | 📤 Upload Document | ✏️ Edit Document |
| **File Upload** | Required ✅ | Optional ❌ |
| **Form Data** | Empty | Pre-filled from DB |
| **Form Attributes** | None | `data-edit-mode="true"`<br>`data-document-id="123"` |
| **API Endpoint** | POST `/api/student/documents/upload` | PUT `/api/student/documents/{id}` |
| **Success Message** | "Document uploaded successfully!" | "Document updated successfully!" |

### Document Types Supported

All three document sections now have edit buttons:

1. **Achievements** (🏆)
   - Grid card layout
   - Edit + Delete buttons top-right

2. **Academic Certificates** (📜)
   - Grid card layout
   - Edit + Delete buttons top-right

3. **Extracurricular Activities** (🎯)
   - List layout
   - Edit + Delete buttons right side

## Files Modified

### Frontend
- **[student-profile.html](profile-pages/student-profile.html)**
  - Line 6075-6107: Added Edit button to achievement/academic cards
  - Line 6146-6157: Added Edit button to extracurricular list items
  - Line 6164-6261: Added `editStudentDocument()` function
  - Line 5765-5797: Enhanced `closeUploadDocumentModal()`
  - Line 5800-5890: Updated `handleDocumentUpload()` for dual mode

### Backend
- **[student_documents_endpoints.py](astegni-backend/student_documents_endpoints.py)**
  - Line 491-638: Added PUT endpoint for updating documents
  - Supports FormData with optional file upload
  - Dynamic query building for efficient updates

## Testing

### Quick Test Steps

1. **Start servers** (if not running):
   ```bash
   cd astegni-backend && python app.py  # Backend
   python -m http.server 8080            # Frontend
   ```

2. **Login as student**

3. **Navigate to Documents Panel**

4. **Upload a document** (if none exist)

5. **Click ✏️ Edit button** on any document

6. **Verify modal behavior**:
   - Pre-filled with existing data ✓
   - Title shows "✏️ Edit Document" ✓
   - File upload says "Optional" ✓
   - is_featured toggle matches current state ✓

7. **Test editing scenarios**:
   - Change title only → Should update
   - Toggle is_featured → Should update
   - Change dates → Should update
   - Upload new file → Should replace file
   - Leave file empty → Should keep existing file

8. **Verify updates**:
   - Document card refreshes with new data
   - Featured status shows correctly
   - Click document link to verify file (if replaced)

### Database Verification

```sql
SELECT id, title, document_type, is_featured, document_url, updated_at
FROM student_documents
WHERE student_id = <student_id>
ORDER BY updated_at DESC;
```

## Features Implemented

### ✅ Complete Features
- Edit button on all document cards (Achievements, Academic, Extracurricular)
- Modal opens in edit mode with pre-populated data
- All fields editable (document_type, title, description, issued_by, dates, is_featured)
- Optional file replacement
- Form validation
- Loading states ("Updating...")
- Success/error messages
- UI refresh after update
- Ownership verification (only own documents)

### 🎯 Benefits
- **No re-upload needed** to fix typos or update metadata
- **Easy file replacement** when needed
- **Toggle featured status** without re-uploading
- **Consistent UI** - same modal for create/edit
- **Type-safe** - backend validates all inputs
- **Efficient** - only updates changed fields

## Technical Details

### Frontend State Management
- Edit mode tracked via form attributes:
  - `data-edit-mode="true"`
  - `data-document-id="{id}"`
- File input becomes optional: `fileInput.required = false`
- Modal title updates dynamically
- Featured toggle triggers change event for UI update

### Backend Validation
- **Ownership**: Only document owner can edit
- **Field Validation**: Dates must be YYYY-MM-DD format
- **File Validation**: Type (.pdf, .jpg, .png, .doc, .docx) and size (10MB max)
- **Dynamic Updates**: Only provided fields included in SQL UPDATE query
- **Auto-timestamp**: `updated_at` always updated

### Security
- JWT authentication required
- Ownership verification before update
- File type and size validation
- SQL injection prevention (parameterized queries)
- Student role check

## Error Handling

- **No token**: "Please log in to upload documents"
- **Not owner**: "Document not found or access denied"
- **Invalid file type**: "Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX"
- **File too large**: "File size exceeds 10MB limit"
- **Invalid date**: "Invalid date format. Use YYYY-MM-DD"
- **Network error**: "An error occurred. Please try again."

## Future Enhancements

- Version history tracking
- Audit trail (who changed what when)
- Batch edit multiple documents
- Drag-and-drop file replacement
- Image preview before upload
- Progress bar for large files
- Undo/revert changes
- Document expiry notifications
