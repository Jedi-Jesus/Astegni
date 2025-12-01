# Achievement & Experience Certificate Upload Feature Added

## Summary
Added **required** certificate upload fields to both the Achievement Modal and Experience Modal in `tutor-profile.html`.

## Changes Made

### 1. Achievement Modal (`achievementModal`)
**Location:** [tutor-profile.html:6079-6085](profile-pages/tutor-profile.html#L6079-L6085)

**Added Field:**
```html
<div>
    <label class="block text-gray-700 font-semibold mb-2">Upload Certificate/Proof *</label>
    <input type="file" id="ach-certificate" name="certificate_file" required
        accept="image/*,.pdf"
        class="w-full p-3 border-2 rounded-lg">
    <p class="text-sm text-gray-500 mt-1">Accepted formats: JPG, PNG, PDF (Max 5MB)</p>
</div>
```

**Details:**
- Field ID: `ach-certificate`
- Field Name: `certificate_file`
- Required: ✅ Yes (`required` attribute)
- Accepted Formats: JPG, PNG, PDF
- Max Size: 5MB (as per helper text)
- Position: Added between "Description" field and "Feature this achievement" checkbox

### 2. Experience Modal (`experienceModal`)
**Location:** [tutor-profile.html:6188-6194](profile-pages/tutor-profile.html#L6188-L6194)

**Added Field:**
```html
<div>
    <label class="block text-gray-700 font-semibold mb-2">Upload Certificate/Letter of Employment *</label>
    <input type="file" id="exp-certificate" name="certificate_file" required
        accept="image/*,.pdf"
        class="w-full p-3 border-2 rounded-lg">
    <p class="text-sm text-gray-500 mt-1">Accepted formats: JPG, PNG, PDF (Max 5MB)</p>
</div>
```

**Details:**
- Field ID: `exp-certificate`
- Field Name: `certificate_file`
- Required: ✅ Yes (`required` attribute)
- Accepted Formats: JPG, PNG, PDF
- Max Size: 5MB (as per helper text)
- Position: Added after "Achievements" textarea field

## Implementation Notes

### Consistency with Existing Patterns
Both new fields follow the existing certificate upload pattern already used in the Certification Modal (line 5973):
- Same `accept` attribute format: `accept="image/*,.pdf"`
- Same helper text: "Accepted formats: JPG, PNG, PDF (Max 5MB)"
- Same CSS classes: `w-full p-3 border-2 rounded-lg`
- Same label styling: `block text-gray-700 font-semibold mb-2`

### Required Validation
Both fields include the `required` attribute, meaning:
- ✅ Form submission will be blocked if no file is selected
- ✅ Browser will show native validation message
- ✅ Asterisk (*) in label indicates required field to users

### Form Field Names
Both use `certificate_file` as the name attribute:
- Achievement Modal: `name="certificate_file"`
- Experience Modal: `name="certificate_file"`

**Note:** Backend JavaScript handlers will need to be updated to:
1. Handle file uploads from both modals
2. Validate file size (5MB max)
3. Upload to Backblaze B2 storage using user-separated paths
4. Store file URLs in database

## Next Steps (Backend Integration Required)

### 1. Update JavaScript Handlers
You'll need to modify the form submission handlers in the tutor-profile page JavaScript:

**For Achievement Modal:**
```javascript
// Find the achievementForm submit handler
document.getElementById('achievementForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData();
    // ... existing fields ...

    // Add certificate file
    const certificateFile = document.getElementById('ach-certificate').files[0];
    if (certificateFile) {
        // Validate file size (5MB = 5 * 1024 * 1024 bytes)
        if (certificateFile.size > 5 * 1024 * 1024) {
            alert('Certificate file must be less than 5MB');
            return;
        }
        formData.append('certificate_file', certificateFile);
    }

    // Upload to backend...
});
```

**For Experience Modal:**
```javascript
// Find the experienceForm submit handler
document.getElementById('experienceForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData();
    // ... existing fields ...

    // Add certificate file
    const certificateFile = document.getElementById('exp-certificate').files[0];
    if (certificateFile) {
        // Validate file size (5MB = 5 * 1024 * 1024 bytes)
        if (certificateFile.size > 5 * 1024 * 1024) {
            alert('Certificate file must be less than 5MB');
            return;
        }
        formData.append('certificate_file', certificateFile);
    }

    // Upload to backend...
});
```

### 2. Update Backend Endpoints
Update the backend API endpoints in `astegni-backend/tutor_profile_extensions_endpoints.py`:

**For Achievements:**
```python
@router.post("/api/tutor/achievements")
async def add_achievement(
    title: str = Form(...),
    category: str = Form(...),
    # ... other fields ...
    certificate_file: UploadFile = File(...)  # Now required
):
    # Validate file type
    if not certificate_file.content_type in ['image/jpeg', 'image/png', 'application/pdf']:
        raise HTTPException(400, "Invalid file type")

    # Upload to Backblaze B2
    file_url = await backblaze_service.upload_file(
        await certificate_file.read(),
        certificate_file.filename,
        'documents',
        user_id
    )

    # Store in database with file_url
    # ...
```

**For Experience:**
```python
@router.post("/api/tutor/experiences")
async def add_experience(
    job_title: str = Form(...),
    institution: str = Form(...),
    # ... other fields ...
    certificate_file: UploadFile = File(...)  # Now required
):
    # Validate file type
    if not certificate_file.content_type in ['image/jpeg', 'image/png', 'application/pdf']:
        raise HTTPException(400, "Invalid file type")

    # Upload to Backblaze B2
    file_url = await backblaze_service.upload_file(
        await certificate_file.read(),
        certificate_file.filename,
        'documents',
        user_id
    )

    # Store in database with file_url
    # ...
```

### 3. Update Database Schema
Add a `certificate_url` column to the relevant tables:

**For tutor_achievements table:**
```python
# In migrate_create_tutor_extended_tables.py or new migration
python migrate_add_achievement_certificates.py
```

```python
# Migration content
ALTER TABLE tutor_achievements ADD COLUMN certificate_url VARCHAR(500);
```

**For tutor_experiences table:**
```python
ALTER TABLE tutor_experiences ADD COLUMN certificate_url VARCHAR(500);
```

### 4. File Storage Path
Files should be stored in Backblaze B2 following the user-separated pattern:
```
documents/certificates/user_{user_id}/achievement_{timestamp}.{ext}
documents/certificates/user_{user_id}/experience_{timestamp}.{ext}
```

## Testing Checklist

- [ ] Open tutor-profile.html in browser
- [ ] Click "Add Achievement" button
- [ ] Verify "Upload Certificate/Proof *" field is visible
- [ ] Try submitting form without selecting a file → Should show validation error
- [ ] Select a PDF file → Should accept
- [ ] Select a JPG file → Should accept
- [ ] Select a PNG file → Should accept
- [ ] Select a .txt file → Should reject (browser validation)
- [ ] Click "Add Experience" button
- [ ] Verify "Upload Certificate/Letter of Employment *" field is visible
- [ ] Repeat file upload tests
- [ ] Submit both forms with valid files → Should upload to B2 and save to database

## File Locations

### Frontend
- **HTML:** `profile-pages/tutor-profile.html`
  - Achievement Modal: Lines 5991-6103
  - Experience Modal: Lines 6098-6205

### Backend (Needs Updates)
- **Endpoints:** `astegni-backend/tutor_profile_extensions_endpoints.py`
- **Backblaze Service:** `astegni-backend/backblaze_service.py`
- **Models:** `astegni-backend/models.py` (add certificate_url fields)

## Visual Appearance

Both modals now include:
```
┌────────────────────────────────────────────┐
│  Upload Certificate/Proof *                │
│  ┌──────────────────────────────────────┐ │
│  │ Choose File    No file chosen        │ │
│  └──────────────────────────────────────┘ │
│  Accepted formats: JPG, PNG, PDF (Max 5MB) │
└────────────────────────────────────────────┘
```

## Summary of Changes
✅ Achievement Modal: Certificate upload field added (required)
✅ Experience Modal: Certificate upload field added (required)
✅ Consistent with existing certificate upload pattern
✅ Native browser validation enabled
✅ File type restrictions in place (images + PDF)
✅ Helper text for user guidance

**Status:** Frontend implementation complete. Backend integration required for full functionality.
