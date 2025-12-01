# Tutor Documents Edit Button Feature

## Overview
Added Edit buttons to all document cards in the tutor profile's Documents Panel. Users can now edit documents, including updating metadata and optionally replacing the file.

## Changes Made

### 1. Frontend - document-manager.js

#### Document Card UI (Line ~320-323)
Added Edit button between View and Delete buttons:
```javascript
<button onclick="editDocument(${document.id})"
    class="px-3 py-2 bg-white border-2 border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 font-semibold text-sm transition-all">
    ✏️
</button>
```

#### New `editDocument` Function (Line ~473-542)
```javascript
function editDocument(documentId) {
    // Finds document in cache
    // Opens upload modal in edit mode
    // Populates form with existing data
    // Makes file input optional
    // Updates modal title and button text
}
```

**Key Features:**
- Populates all form fields with existing document data
- Converts dates to YYYY-MM-DD format for date inputs
- Triggers is_featured toggle change event to update status text
- Makes file upload optional (not required in edit mode)
- Updates modal title to "✏️ Edit Document"
- Updates submit button to "💾 Update Document"
- Stores edit mode and document ID in form attributes

#### Updated `closeUploadDocumentModal` (Line ~373-405)
Enhanced to reset form completely:
```javascript
function closeUploadDocumentModal() {
    // Resets form
    // Removes edit mode attributes
    // Resets modal title and button text
    // Makes file input required again
    // Hides modal
}
```

#### Updated Form Submission Handler (Line ~417-493)
Now supports both create and update modes:
```javascript
form.addEventListener('submit', async (e) => {
    // Checks if in edit mode
    // Calls updateDocument() or uploadDocument() accordingly
    // Updates cache differently for each mode
    // Shows appropriate success messages
});
```

**Dual Mode Logic:**
- **Create Mode**: Calls `uploadDocument()`, pushes to cache
- **Edit Mode**: Calls `updateDocument()`, updates existing item in cache

#### New `updateDocument` API Function (Line ~120-150)
```javascript
async function updateDocument(documentId, formData) {
    // PUT request to /api/tutor/documents/{documentId}
    // Sends FormData with updated fields
    // Returns updated document
}
```

#### Exposed Functions (Line ~644)
```javascript
window.editDocument = editDocument;
```

### 2. Backend - tutor_documents_endpoints.py

#### Updated PUT Endpoint (Line ~368-387)
Changed from JSON (Pydantic model) to FormData to support file uploads:

**Old:**
```python
async def update_tutor_document(
    document_id: int,
    updates: TutorDocumentUpdate,  # JSON only
    current_user: dict = Depends(get_current_user)
)
```

**New:**
```python
async def update_tutor_document(
    document_id: int,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    issued_by: Optional[str] = Form(None),
    date_of_issue: Optional[str] = Form(None),
    expiry_date: Optional[str] = Form(None),
    is_featured: Optional[bool] = Form(None),  # NEW!
    file: Optional[UploadFile] = File(None),  # NEW!
    current_user: dict = Depends(get_current_user)
)
```

#### Enhanced Update Logic (Line ~407-474)
- **All fields optional** - only updates provided fields
- **Date parsing** - Converts YYYY-MM-DD strings to date objects
- **is_featured support** - Toggles featured status
- **Optional file upload:**
  - Validates file type (.pdf, .jpg, .jpeg, .png, .doc, .docx)
  - Validates file size (10MB max)
  - Uploads to Backblaze B2
  - Updates document_url in database
- **Dynamic query building** - Only includes fields that are being updated
- **Auto-updates updated_at timestamp**

## How It Works

### User Flow

1. **View Documents**: User navigates to Documents Panel
2. **Click Edit**: User clicks ✏️ Edit button on a document card
3. **Modal Opens**: Upload modal opens with:
   - Pre-filled form data from existing document
   - "✏️ Edit Document" title
   - "💾 Update Document" button
   - Optional file upload field
4. **Make Changes**: User modifies any fields
5. **Toggle Featured**: User can toggle is_featured on/off
6. **Optional File Replace**: User can upload new file or keep existing
7. **Submit**: Form submits as FormData
8. **Backend Updates**: Only changed fields are updated in database
9. **UI Refreshes**: Document card updates with new data

### Edit vs Create Mode

| Feature | Create Mode | Edit Mode |
|---------|-------------|-----------|
| Modal Title | 📤 Upload Document | ✏️ Edit Document |
| Button Text | 📤 Upload Document | 💾 Update Document |
| File Required | Yes ✅ | No ❌ (optional) |
| Form Attributes | None | `data-edit-mode="true"`<br>`data-document-id="123"` |
| API Endpoint | POST `/api/tutor/documents/upload` | PUT `/api/tutor/documents/{id}` |
| Success Message | "submitted for verification" | "has been updated" |
| Cache Update | Push new document | Update existing document |

### Backend Validation

- **Ownership check**: Only document owner can edit
- **Verification check**: Cannot edit verified documents
- **Field validation**: Dates must be YYYY-MM-DD format
- **File validation**: Type and size checks
- **Dynamic updates**: Only provided fields are updated

## Files Modified

### Frontend
- **[js/tutor-profile/document-manager.js](js/tutor-profile/document-manager.js)**
  - Line 320-323: Added Edit button to card
  - Line 120-150: Added `updateDocument()` function
  - Line 373-405: Enhanced `closeUploadDocumentModal()`
  - Line 417-493: Enhanced form submission handler
  - Line 473-542: Added `editDocument()` function
  - Line 644: Exposed `editDocument` to window

### Backend
- **[astegni-backend/tutor_documents_endpoints.py](astegni-backend/tutor_documents_endpoints.py)**
  - Line 368-387: Changed endpoint signature to FormData
  - Line 407-474: Enhanced update logic with file upload support
  - Added is_featured field support
  - Added optional file replacement

## Testing

### Quick Test Steps

1. **Start servers** (if not running):
   ```bash
   cd astegni-backend && python app.py  # Backend
   python -m http.server 8080            # Frontend
   ```

2. **Login as tutor** and navigate to Documents Panel

3. **Upload a document** first (if none exist)

4. **Click ✏️ Edit button** on any document card

5. **Verify modal opens** with:
   - Pre-filled form data ✓
   - "✏️ Edit Document" title ✓
   - "💾 Update Document" button ✓
   - File upload says "Optional" ✓

6. **Test editing scenarios**:
   - Edit title only (no file) → Should update
   - Toggle is_featured → Should update
   - Change dates → Should update
   - Upload new file → Should replace file
   - Try editing verified document → Should fail with error

7. **Verify updates**:
   - Document card refreshes with new data
   - Featured status shows correctly
   - View button opens correct file (if replaced)

### Database Verification
```sql
SELECT id, title, is_featured, document_url, updated_at
FROM tutor_documents
WHERE id = <document_id>;
```

## Features

### ✅ Implemented
- Edit button on all document cards
- Modal opens in edit mode with pre-filled data
- All fields editable (title, description, issued_by, dates, is_featured)
- Optional file replacement
- Form validation
- Loading states
- Success/error messages
- Cache updates
- UI refresh after update

### 🎯 Benefits
- **No need to re-upload** documents just to fix typos
- **Update metadata** without changing files
- **Toggle featured status** easily
- **Replace files** when needed
- **Consistent UI** - same modal for create/edit
- **Type-safe** - backend validates all inputs

## Technical Notes

- Edit mode stores `data-edit-mode` and `data-document-id` attributes on form
- File upload becomes optional in edit mode (`fileInput.required = false`)
- Backend uses dynamic query building for efficient updates
- Only modified fields are included in UPDATE query
- `updated_at` timestamp auto-updates on any change
- Cannot edit verified documents (backend validation)
- FormData supports both metadata updates and file uploads in single request

## Error Handling

- **No token**: "No auth token found"
- **Not owner**: "Not authorized to update this document"
- **Already verified**: "Cannot update verified documents"
- **Invalid file type**: "Invalid file type"
- **File too large**: "File size exceeds 10MB limit"
- **Invalid date format**: "Invalid date format. Use YYYY-MM-DD"
- **Network error**: Shows error message with retry suggestion

## Future Enhancements

- Version history for document edits
- Audit trail showing what changed and when
- Batch edit multiple documents
- Drag-and-drop file replacement
- Image preview before upload
- Progress bar for large file uploads
- Undo/revert changes
