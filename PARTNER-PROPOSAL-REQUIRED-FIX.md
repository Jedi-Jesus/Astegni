# Partner Proposal File Required - Implementation

## Summary
Made the proposal file upload field required for all partnership requests. Updated HTML, JavaScript validation, and backend API to enforce this requirement.

## Changes Made

### 1. ✅ HTML - Added Required Attribute

**File:** `index.html` (line 1275-1276)

**Before:**
```html
<label>Upload Proposal (PDF, DOC, DOCX - Max 10MB)</label>
<input type="file" id="partner-proposal" accept=".pdf,.doc,.docx" style="...">
```

**After:**
```html
<label>Upload Proposal (PDF, DOC, DOCX - Max 10MB) *</label>
<input type="file" id="partner-proposal" accept=".pdf,.doc,.docx" required style="...">
```

**Changes:**
- Added asterisk (*) to label indicating required field
- Added `required` attribute to file input

### 2. ✅ JavaScript - Added Validation

**File:** `js/index/partner.js` (lines 222-226, 231-235)

**Added validation check:**
```javascript
// Validate proposal file is uploaded
if (!proposalFile) {
    alert('Please upload a proposal file');
    return;
}

// Check file size (10MB max) before submission
if (proposalFile.size > 10 * 1024 * 1024) {
    alert('Proposal file size must be less than 10MB');
    return;
}
```

**Removed conditional:**
```javascript
// Before: if (proposalFile) { formData.append(...) }
// After: Always appends (file is required)
formData.append('proposal', proposalFile);
```

### 3. ✅ Backend - Updated Parameter & Validation

**File:** `astegni-backend/partner_request_endpoints.py`

#### Parameter Definition (line 39):

**Before:**
```python
proposal: Optional[UploadFile] = File(None)
```

**After:**
```python
proposal: UploadFile = File(...)
```

#### Docstring Update (line 52):

**Before:**
```python
- proposal: Optional proposal file (PDF, DOC, DOCX)
```

**After:**
```python
- proposal: Required proposal file (PDF, DOC, DOCX)
```

#### Validation Logic (lines 85-116):

**Before:**
```python
# Handle file upload if provided
proposal_file_path = None
if proposal:
    # Check file extension
    file_ext = Path(proposal.filename).suffix.lower()
    ...
```

**After:**
```python
# Validate proposal file is provided
if not proposal:
    raise HTTPException(status_code=400, detail="Proposal file is required")

# Handle file upload (now required)
# Check file extension
file_ext = Path(proposal.filename).suffix.lower()
...
```

**Key Changes:**
- Removed `Optional` type hint
- Changed `File(None)` to `File(...)` (required)
- Added explicit validation check
- Removed `if proposal:` conditional (file is always present)
- Removed `proposal_file_path = None` initialization

## Validation Flow

### Frontend Validation:
1. **HTML5 validation**: Browser prevents form submission if no file selected
2. **JavaScript validation**: Checks if file exists before API call
3. **File size check**: Validates file is under 10MB

### Backend Validation:
1. **FastAPI validation**: Returns 422 if file not provided
2. **Explicit check**: Returns 400 with clear error message
3. **File type validation**: Only allows PDF, DOC, DOCX
4. **File size validation**: Rejects files over 10MB

## Required Fields Summary

All fields in the partner modal are now required:

| Field | Required | Validation |
|-------|----------|------------|
| Company/Institution Name | ✅ | HTML `required` + JS validation |
| Contact Person | ✅ | HTML `required` + JS validation |
| Business Email(s) | ✅ | At least one required |
| Phone Number(s) | ✅ | At least one required |
| Partnership Type | ✅ | HTML `required` + JS validation |
| Other Partnership Type | ✅ | Dynamic (when "Other" selected) |
| Company Description | ✅ | HTML `required` + JS validation |
| Proposal File Upload | ✅ | **NEW - Now required** |

## User Experience

### Attempting to Submit Without File:

**Before:**
- Form would submit successfully without file
- Database would store `null` in `proposal_file_path`

**After:**
- HTML5 validation stops submission with browser message
- If bypassed, JavaScript shows: "Please upload a proposal file"
- If bypassed, backend returns: "Proposal file is required"

### File Size Validation:

**Client-side (immediate feedback):**
```
Alert: "Proposal file size must be less than 10MB"
```

**Server-side (backup validation):**
```
HTTP 400: "File size exceeds 10MB limit"
```

### File Type Validation:

**Client-side (HTML accept attribute):**
- File picker only shows PDF, DOC, DOCX files

**Server-side (explicit validation):**
```
HTTP 400: "Invalid file type. Allowed: .pdf, .doc, .docx"
```

## Testing Instructions

### Test 1: Submit Without File
1. Open partner modal
2. Fill all fields EXCEPT file upload
3. Click "Submit Partnership Request"
4. **Expected:** Browser shows validation message "Please select a file"

### Test 2: Submit With File > 10MB
1. Open partner modal
2. Fill all fields
3. Select a file larger than 10MB
4. Click submit
5. **Expected:** Alert "Proposal file size must be less than 10MB"

### Test 3: Submit With Invalid File Type
1. Fill all fields
2. Try to select .txt or .jpg file
3. **Expected:** File picker doesn't show invalid file types
4. If manually typed/bypassed: Backend returns 400 error

### Test 4: Successful Submission
1. Fill all fields correctly
2. Upload valid PDF/DOC/DOCX under 10MB
3. Click submit
4. **Expected:**
   - Success modal appears
   - File saved to `uploads/partner_proposals/`
   - Database record created with file path

## Database Impact

**No schema changes needed.** The `proposal_file_path` column already exists as:
```sql
proposal_file_path VARCHAR(500)
```

**Before:**
- Could be NULL (optional)
- Some records without files

**After:**
- Always populated (required)
- Every partnership request has a proposal file

## API Response Changes

### Success Response (No Change):
```json
{
  "success": true,
  "message": "Partnership request submitted successfully",
  "request_id": 1,
  "created_at": "2025-11-13T02:00:00",
  "company_name": "Test Company",
  "emails": ["test@company.com"],
  "phones": ["+251 912 345 678"]
}
```

### Error Responses (New):

**Missing file (422 or 400):**
```json
{
  "detail": "Proposal file is required"
}
```

**Invalid file type:**
```json
{
  "detail": "Invalid file type. Allowed: .pdf, .doc, .docx"
}
```

**File too large:**
```json
{
  "detail": "File size exceeds 10MB limit"
}
```

## Benefits

1. **Data Completeness**: Every partnership request now has a proposal document
2. **Better Review Process**: Admins can review actual proposals, not just text descriptions
3. **Professionalism**: Encourages serious partnership inquiries with documented proposals
4. **Clear Requirements**: Users know upfront that a proposal document is mandatory

## Migration Notes

**Existing Data:**
- Old records in database may have `proposal_file_path = NULL`
- New submissions will always have a file path
- No retroactive changes needed for old records

**API Compatibility:**
- Breaking change: API now requires file upload
- Any external integrations must be updated
- Frontend form already handles this correctly

## Success Criteria ✅

- ✅ HTML input has `required` attribute
- ✅ Label shows asterisk (*) indicating required field
- ✅ JavaScript validates file existence before submission
- ✅ JavaScript validates file size (10MB limit)
- ✅ Backend parameter is no longer Optional
- ✅ Backend validates file is provided
- ✅ Backend validates file type and size
- ✅ Form cannot be submitted without file
- ✅ Clear error messages for missing/invalid files
- ✅ All required fields now enforced
