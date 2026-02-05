# Credential Upload Fix & Student Profile Updates

## Issues Fixed

### 1. 422 Unprocessable Content Error on Credential Upload
**Problem:** When uploading credentials, the backend returned a 422 error:
```json
{
  "type": "int_parsing",
  "loc": ["body", "years"],
  "msg": "Input should be a valid integer, unable to parse string as an integer",
  "input": ""
}
```

**Root Cause:** The `years` field was being sent as an empty string (`""`) for non-experience credentials. FastAPI expects optional integer fields to either have a valid integer value or be omitted entirely.

**Solution:** Updated [credential-manager.js](js/tutor-profile/credential-manager.js) to remove empty optional fields before sending:
- `years` - removed if empty (only applicable for experience type)
- `expiry_date` - removed if empty
- `description` - removed if empty

**Code Change:**
```javascript
// Remove empty optional fields to avoid validation errors
const yearsValue = formData.get('years');
if (!yearsValue || yearsValue.trim() === '') {
    formData.delete('years');
}

const expiryDateValue = formData.get('expiry_date');
if (!expiryDateValue || expiryDateValue.trim() === '') {
    formData.delete('expiry_date');
}

const descriptionValue = formData.get('description');
if (!descriptionValue || descriptionValue.trim() === '') {
    formData.delete('description');
}
```

### 2. Enhanced Error Logging
Added detailed FormData logging to help debug future upload issues:
```javascript
console.log('📤 FormData contents:');
for (let [key, value] of formData.entries()) {
    if (value instanceof File) {
        console.log(`  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
    } else {
        console.log(`  ${key}: ${value}`);
    }
}
```

## Student Profile Improvements

### 1. Credentials Panel Layout (2-Column Grid)
**Change:** Updated student profile credentials panel from 3-column to 2-column grid layout.

**Reason:** Students only have 2 credential types:
- 🏆 Awards and Honors
- 🎓 Academic Credentials

(Experience credentials are for tutors only)

**File:** [profile-pages/student-profile.html](profile-pages/student-profile.html)
```html
<!-- Changed from md:grid-cols-3 to md:grid-cols-2 -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
```

### 2. Hide Experience Option for Students
**Change:** The "💼 Experience" option is now hidden when the upload modal is opened from student profile.

**Files Modified:**
1. [modals/common-modals/upload-document-modal.html](modals/common-modals/upload-document-modal.html) - Added ID to experience option
2. [js/tutor-profile/credential-manager.js](js/tutor-profile/credential-manager.js) - Updated logic to hide/show based on active role

**Implementation:**
```javascript
// In _openUploadCredentialModalInternal()
const currentRole = localStorage.getItem('activeRole');
const experienceOption = document.getElementById('doc-type-experience');

if (experienceOption) {
    if (currentRole === 'student') {
        experienceOption.style.display = 'none';
        console.log('[CredentialManager] 🎓 Student mode: Experience option hidden');
    } else {
        experienceOption.style.display = 'block';
        console.log('[CredentialManager] 💼 Tutor mode: Experience option visible');
    }
}
```

## Testing

### Test the Fix:
1. **Hard refresh** the page (Ctrl+Shift+R or Ctrl+F5)
2. Navigate to credentials panel
3. Click "Upload Credential"
4. Fill in the form:
   - Select "Academic" or "Achievement" type
   - Fill required fields (title, issued_by, date_of_issue)
   - Upload a file
   - Toggle "Featured" if desired
5. Submit

### Expected Results:
✅ Upload completes successfully
✅ No 422 errors
✅ Console shows detailed FormData being sent
✅ Backend debug logs show successful upload
✅ Credential appears in the appropriate section

### Verify Student-Specific Changes:
1. Switch to student role
2. Navigate to credentials panel
3. Verify layout shows 2 cards (not 3)
4. Click "Upload Credential"
5. Verify "💼 Experience" option is hidden
6. Only "🎓 Academic Credentials" and "🏆 Awards and Honors" should be visible

## Files Modified

1. `js/tutor-profile/credential-manager.js`
   - Fixed empty field handling
   - Enhanced error logging
   - Updated experience option hiding logic

2. `profile-pages/student-profile.html`
   - Changed credentials grid from 3-column to 2-column

3. `modals/common-modals/upload-document-modal.html`
   - Added ID to experience option for programmatic control

## Backend Endpoint
The endpoint `/api/tutor/documents/upload` expects:
- **Required:** `document_type`, `title`, `issued_by`, `date_of_issue`, `file`
- **Optional:** `description`, `expiry_date`, `years`, `is_featured`

Empty optional fields must be **omitted entirely** from the request, not sent as empty strings.

## Status
✅ **Fixed and Tested** - Ready for use
