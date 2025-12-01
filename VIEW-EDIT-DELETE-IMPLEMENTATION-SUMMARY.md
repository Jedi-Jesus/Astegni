# View/Edit/Delete Implementation for Achievement, Certificate & Experience

## Summary
Implemented a comprehensive view modal system for achievements, certifications, and experiences with:
- ✅ **View button and status badges** in all cards
- ✅ **Full-detail view modals** with profile pictures and file previews
- ✅ **Edit mode toggle** that transforms view → edit seamlessly
- ✅ **Update functionality** with optional file replacement
- ✅ **Delete functionality** with Backblaze file cleanup
- ✅ **Full-screen file preview** for images and PDFs

## Changes Made

### 1. Frontend - JavaScript (profile-extensions-manager.js)

#### A. Card Rendering Updates
- **Added `getStatusBadge()` function** - Returns status badge HTML for pending/verified/rejected
- **Updated `renderAchievements()`**:
  - Added status badge display
  - Replaced Delete button with View button
  - Added line-clamp for long descriptions
- **Updated `renderCertifications()`**:
  - Added status badge display
  - Replaced Delete button with View button
  - Improved image preview with fixed height
- **Updated `renderExperience()`**:
  - Added status badge display
  - Replaced Delete button with View button
  - Added line-clamp for descriptions

#### B. View Modal Functions
- **`viewAchievement(achId)`** - Fetches and opens achievement view modal
- **`viewCertification(certId)`** - Fetches and opens certification view modal
- **`viewExperience(expId)`** - Fetches and opens experience view modal
- **`openViewAchievementModal(data)`** - Populates and shows achievement modal
- **`openViewCertificationModal(data)`** - Populates and shows certification modal
- **`openViewExperienceModal(data)`** - Populates and shows experience modal

#### C. Mode Switching
- **`setViewModalMode(type, mode)`** - Toggles between 'view' and 'edit' modes
  - Shows/hides appropriate content sections
  - Populates edit form when switching to edit mode

#### D. Form Population
- **`populateEditForm(type, data)`** - Fills edit form fields with current data
  - Handles all field types (text, select, date, checkbox, textarea)
  - Preserves existing data for optional file fields

#### E. Update Functions
- **`updateAchievement()`** - Sends PUT request with form data + optional file
- **`updateCertification()`** - Sends PUT request with form data + optional file
- **`updateExperience()`** - Sends PUT request with form data + optional file

#### F. Delete Functions
- **`deleteAchievementFromView()`** - Deletes achievement + Backblaze file
- **`deleteCertificationFromView()`** - Deletes certification + Backblaze file
- **`deleteExperienceFromView()`** - Deletes experience + Backblaze file

#### G. File Preview
- **`viewFullFile(fileUrl)`** - Opens fullscreen modal with image/PDF
- **`closeFullscreenFile()`** - Closes fullscreen modal
- **Automatic file detection** - Handles both images and PDFs appropriately

### 2. Frontend - HTML (tutor-profile.html)

#### Added Three View Modals:

**A. View Achievement Modal (`viewAchievementModal`)**
- Left column: Large icon + status badge
- Right column: All achievement details
- Certificate preview with "View Full File" button
- Edit/Update/Cancel/Delete/Close buttons
- Edit form with all fields + file upload

**B. View Certification Modal (`viewCertificationModal`)**
- Left column: Certificate image preview + status badge
- Right column: All certification details
- Full date formatting (long format)
- Credential ID display (monospace font)
- Edit form with all fields + file upload

**C. View Experience Modal (`viewExperienceModal`)**
- Header section: Job title, institution, location
- Three-column grid: Employment type, start date, end date
- Separate sections for: Description, Responsibilities, Achievements
- Certificate preview at bottom
- Edit form with all fields including "currently work here" checkbox

**Common Modal Features:**
- Responsive design (mobile/tablet/desktop)
- Tailwind CSS styling
- Hidden by default (.hidden class)
- Max width: 4xl (56rem)
- Smooth transitions

### 3. Backend - Python (tutor_profile_extensions_endpoints.py)

**NOTE:** Add the code from `PROFILE_EXTENSIONS_ENDPOINTS_ADDITIONS.py` to your backend file.

#### A. Individual GET Endpoints (NEW)
```python
GET /api/tutor/achievements/{achievement_id}
GET /api/tutor/certifications/{certification_id}
GET /api/tutor/experience/{experience_id}
```
- Fetches single item by ID
- Verifies ownership (tutor_id match)
- Returns complete item data including verification_status
- Returns 404 if not found or unauthorized

#### B. PUT (Update) Endpoints (NEW)
```python
PUT /api/tutor/achievements/{achievement_id}
PUT /api/tutor/certifications/{certification_id}
PUT /api/tutor/experience/{experience_id}
```
- Updates all fields for an item
- Handles optional file upload
- **Deletes old file from Backblaze** if new file uploaded
- Uploads new file to Backblaze with user separation
- Returns success message

#### C. DELETE Endpoints (UPDATED)
```python
DELETE /api/tutor/achievements/{achievement_id}
DELETE /api/tutor/certifications/{certification_id}
DELETE /api/tutor/experience/{experience_id}
```
- **Now includes Backblaze file cleanup**
- Fetches file URL before deletion
- Deletes file from Backblaze (with error handling)
- Deletes database record
- Returns success message

### 4. Status Badge System

**Status Values:**
- `pending` - Yellow badge with ⏳ icon
- `verified` - Green badge with ✓ icon
- `rejected` - Red badge with ✗ icon

**Badge Styling:**
- Tailwind utility classes: `bg-{color}-100 text-{color}-700`
- Rounded-full, small text, padding
- Responsive positioning

## File Structure

```
profile-pages/
  └── tutor-profile.html (MODIFIED - Added 3 view modals)

js/tutor-profile/
  └── profile-extensions-manager.js (MODIFIED - Added view/edit/delete functions)

astegni-backend/
  ├── tutor_profile_extensions_endpoints.py (NEEDS UPDATE - See additions file)
  └── PROFILE_EXTENSIONS_ENDPOINTS_ADDITIONS.py (NEW - Code to add)
```

## How It Works

### View Workflow:
1. User clicks "View" button on achievement/cert/exp card
2. JavaScript calls `viewAchievement(id)`, `viewCertification(id)`, or `viewExperience(id)`
3. Function fetches data from `GET /api/tutor/{type}/{id}`
4. Opens modal in "view" mode with all details populated
5. Displays certificate/file preview if available
6. "View Full File" button opens fullscreen preview

### Edit Workflow:
1. User clicks "Edit" button in view modal
2. Calls `setViewModalMode(type, 'edit')`
3. Hides view content, shows edit form
4. Calls `populateEditForm(type, data)` to fill fields
5. Shows "Update" and "Cancel" buttons
6. User can select new file (optional - keeps existing if not selected)

### Update Workflow:
1. User clicks "Update" button
2. Calls `updateAchievement()`, `updateCertification()`, or `updateExperience()`
3. Creates FormData from edit form
4. Adds file if selected
5. Sends PUT request to `/api/tutor/{type}/{id}`
6. Backend:
   - Verifies ownership
   - Deletes old file from Backblaze (if new file provided)
   - Uploads new file to Backblaze
   - Updates database record
7. Shows success message, closes modal, reloads list

### Delete Workflow:
1. User clicks "Delete" button in view modal
2. Shows confirmation dialog
3. Calls `delete{Type}FromView()`
4. Sends DELETE request to `/api/tutor/{type}/{id}`
5. Backend:
   - Fetches file URL
   - Deletes file from Backblaze
   - Deletes database record
6. Shows success message, closes modal, reloads list

## API Endpoints Summary

| Method | Endpoint | Description | Backblaze |
|--------|----------|-------------|-----------|
| GET | `/api/tutor/achievements` | List all achievements | N/A |
| GET | `/api/tutor/achievements/{id}` | Get single achievement | N/A |
| POST | `/api/tutor/achievements` | Create achievement | Upload file |
| PUT | `/api/tutor/achievements/{id}` | Update achievement | Delete old, upload new |
| DELETE | `/api/tutor/achievements/{id}` | Delete achievement | Delete file |
| GET | `/api/tutor/certifications` | List all certifications | N/A |
| GET | `/api/tutor/certifications/{id}` | Get single certification | N/A |
| POST | `/api/tutor/certifications` | Create certification | Upload file |
| PUT | `/api/tutor/certifications/{id}` | Update certification | Delete old, upload new |
| DELETE | `/api/tutor/certifications/{id}` | Delete certification | Delete file |
| GET | `/api/tutor/experience` | List all experience | N/A |
| GET | `/api/tutor/experience/{id}` | Get single experience | N/A |
| POST | `/api/tutor/experience` | Create experience | Upload file |
| PUT | `/api/tutor/experience/{id}` | Update experience | Delete old, upload new |
| DELETE | `/api/tutor/experience/{id}` | Delete experience | Delete file |

## Testing Instructions

### 1. Test View Functionality
```bash
1. Navigate to tutor profile page
2. Go to Achievements/Certifications/Experience panel
3. Click "View" button on any card
4. Verify:
   - Modal opens with all details
   - Status badge displays correctly
   - File preview shows if available
   - "View Full File" button works
   - Fullscreen preview opens correctly (ESC to close)
```

### 2. Test Edit Functionality
```bash
1. Open a view modal (as above)
2. Click "Edit" button
3. Verify:
   - View content hides
   - Edit form appears with current data populated
   - All fields are editable
   - File input shows "Leave empty to keep existing"
4. Modify some fields
5. Select a new file (optional)
6. Click "Update"
7. Verify:
   - Success message appears
   - Modal closes
   - List refreshes with updated data
   - New file appears in next view
```

### 3. Test Delete Functionality
```bash
1. Open a view modal
2. Click "Delete" button
3. Verify confirmation dialog appears
4. Click "OK"
5. Verify:
   - Success message appears
   - Modal closes
   - Item removed from list
   - File deleted from Backblaze (check B2 console)
```

### 4. Test Cancel Edit
```bash
1. Open a view modal
2. Click "Edit"
3. Make some changes
4. Click "Cancel"
5. Verify:
   - Edit form hides
   - View content reappears
   - No changes were saved
```

### 5. Test Status Badges
```bash
1. Check database for items with different verification statuses:
   - pending
   - verified
   - rejected
2. Verify correct badge appears for each status
3. Badge colors:
   - Pending: Yellow
   - Verified: Green
   - Rejected: Red
```

## Backblaze Integration Notes

### File Organization
```
bucketname/
├── achievements/
│   └── user_{user_id}/
│       └── filename_{timestamp}.ext
├── certifications/
│   └── user_{user_id}/
│       └── filename_{timestamp}.ext
└── experience_certificates/
    └── user_{user_id}/
        └── filename_{timestamp}.ext
```

### File Lifecycle
1. **Upload** - New file uploaded to user-specific folder
2. **Update** - Old file deleted, new file uploaded
3. **Delete** - File removed from Backblaze permanently

### Error Handling
- Backblaze errors are caught and logged
- Database operations continue even if Backblaze fails
- User sees warning messages for partial failures

## Known Limitations

1. **No real-time updates** - Changes not reflected for other users until page reload
2. **Single file per item** - Can't attach multiple files
3. **No file versioning** - Old files permanently deleted on update
4. **No undo** - Delete is permanent (consider soft delete in production)

## Future Enhancements

- [ ] Add file version history
- [ ] Support multiple files per item
- [ ] Add image cropping/editing before upload
- [ ] Implement drag-and-drop file upload
- [ ] Add file size optimization
- [ ] WebSocket for real-time status updates
- [ ] Batch operations (bulk delete, export)
- [ ] Print/PDF export of profiles

## Production Considerations

1. **Change DELETE to soft delete** - Set `is_active = FALSE` instead of permanent deletion
2. **Add rate limiting** - Prevent abuse of file upload/delete
3. **Implement file scanning** - Virus/malware detection for uploads
4. **Add audit logging** - Track all edit/delete operations
5. **Backup strategy** - Regular Backblaze backups
6. **CDN integration** - Serve files through CDN for better performance
7. **Image optimization** - Resize/compress uploaded images
8. **Access control** - Admin review for sensitive changes

## Troubleshooting

### Modal doesn't open
- Check browser console for JavaScript errors
- Verify modal HTML exists in tutor-profile.html
- Check that `viewAchievement()` etc. are defined globally

### File preview not showing
- Check if `certificate_url` field exists in database
- Verify Backblaze URL is accessible
- Check file extension detection logic

### Update fails
- Check backend logs for Python errors
- Verify Backblaze credentials in .env
- Check form field names match backend expectations
- Verify user has tutor role

### Delete doesn't remove file
- Check `backblaze_service.delete_file()` method
- Verify file URL format matches expected pattern
- Check Backblaze permissions (delete capability)

## Support Files

- `VIEW-MODALS-INSERT.html` - Complete HTML for all 3 modals
- `PROFILE_EXTENSIONS_ENDPOINTS_ADDITIONS.py` - Backend code to add
- This document - Complete implementation guide
