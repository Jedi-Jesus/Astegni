# Quick Start: View/Edit/Delete Modals

## What Was Implemented

✅ **View Button** replaces Delete button on all achievement/certificate/experience cards
✅ **Status Badges** show pending/verified/rejected status on cards
✅ **View Modals** display full details with:
- Profile picture/icon
- All field details
- File preview (image or PDF)
- "View Full File" button for fullscreen preview

✅ **Edit Mode** in view modals with:
- Toggle between view and edit
- All fields editable
- Optional file replacement

✅ **Update Functionality** with:
- Form validation
- Optional file upload
- Old file deletion from Backblaze
- Database update

✅ **Delete Functionality** with:
- Confirmation dialog
- Backblaze file cleanup
- Database deletion

## Files Modified

### Frontend
1. **`profile-pages/tutor-profile.html`**
   - Added 3 new view modals (achievement, certification, experience)
   - Each modal has view/edit modes
   - Includes fullscreen file preview support

2. **`js/tutor-profile/profile-extensions-manager.js`**
   - Updated card rendering functions (added status badges, View buttons)
   - Added view modal functions
   - Added edit mode toggle
   - Added update functions
   - Added delete functions with Backblaze cleanup

### Backend
3. **`astegni-backend/tutor_profile_extensions_endpoints.py`**
   - ⚠️ **NEEDS UPDATE**: Add code from `PROFILE_EXTENSIONS_ENDPOINTS_ADDITIONS.py`
   - New GET endpoints for individual items
   - New PUT endpoints for updates
   - Updated DELETE endpoints with Backblaze cleanup

## Installation Steps

### 1. Backend Setup (REQUIRED)

Open `astegni-backend/tutor_profile_extensions_endpoints.py` and add the code from `PROFILE_EXTENSIONS_ENDPOINTS_ADDITIONS.py`:

```bash
# The file contains these new endpoints:
- GET /api/tutor/certifications/{id}
- PUT /api/tutor/certifications/{id}
- DELETE /api/tutor/certifications/{id} (UPDATED)

- GET /api/tutor/achievements/{id}
- PUT /api/tutor/achievements/{id}
- DELETE /api/tutor/achievements/{id} (UPDATED)

- GET /api/tutor/experience/{id}
- PUT /api/tutor/experience/{id}
- DELETE /api/tutor/experience/{id} (UPDATED)
```

**Important:** The DELETE endpoints now handle Backblaze file cleanup automatically.

### 2. Restart Backend

```bash
cd astegni-backend
python app.py
```

### 3. Test Frontend

```bash
# Start frontend server (from project root)
python -m http.server 8080
```

Navigate to: `http://localhost:8080/profile-pages/tutor-profile.html`

## Testing Guide

### Step 1: Check Card Updates
1. Go to Achievements/Certifications/Experience panel
2. Verify each card shows:
   - Status badge (yellow/green/red)
   - **View** button (no Delete button)

### Step 2: Test View Modal
1. Click "View" on any card
2. Modal should open showing:
   - All details formatted nicely
   - Status badge
   - File preview (if file exists)
   - "View Full File" button
3. Click "View Full File"
   - Image: Opens fullscreen with zoom
   - PDF: Opens in iframe
4. Press ESC to close fullscreen

### Step 3: Test Edit Mode
1. In view modal, click "Edit"
2. Verify:
   - View content disappears
   - Edit form appears with current data
   - All fields populated correctly
3. Modify a field (e.g., change title)
4. Click "Cancel" → Should return to view mode without saving
5. Click "Edit" again
6. Modify a field
7. Click "Update"
8. Verify:
   - Success message
   - Modal closes
   - List refreshes with new data

### Step 4: Test File Replacement
1. Open view modal
2. Click "Edit"
3. Select a new file in file input
4. Click "Update"
5. Verify:
   - Old file deleted from Backblaze
   - New file uploaded
   - New file appears in next view

### Step 5: Test Delete
1. Open view modal
2. Click "Delete"
3. Confirm deletion
4. Verify:
   - Item removed from list
   - File deleted from Backblaze
   - Success message shown

## Status Badge Reference

| Status | Badge Color | Icon |
|--------|-------------|------|
| pending | Yellow (bg-yellow-100) | ⏳ Pending |
| verified | Green (bg-green-100) | ✓ Verified |
| rejected | Red (bg-red-100) | ✗ Rejected |

## Modal Structure

### Achievement Modal
```
┌─────────────────────────────────────────┐
│ 🏆 Achievement Details            [×]   │
├─────────────────────────────────────────┤
│ [Icon]     │ Title:                     │
│   🏆       │ Category:                  │
│ [Badge]    │ Year:                      │
│            │ Issuer:                    │
│            │ Description:               │
│            │ Certificate: [Preview]     │
│            │   [View Full File]         │
├─────────────────────────────────────────┤
│ [Edit] [Delete] [Close]                 │
└─────────────────────────────────────────┘
```

### Certification Modal
```
┌─────────────────────────────────────────┐
│ 📜 Certification Details          [×]   │
├─────────────────────────────────────────┤
│ [Cert Image]   │ Name:                  │
│                │ Organization:          │
│ [View Full]    │ Field:                 │
│                │ Issue Date:            │
│ [Badge]        │ Expiry Date:           │
│                │ Credential ID:         │
│                │ Description:           │
├─────────────────────────────────────────┤
│ [Edit] [Delete] [Close]                 │
└─────────────────────────────────────────┘
```

### Experience Modal
```
┌─────────────────────────────────────────┐
│ 💼 Experience Details             [×]   │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ Senior Math Teacher                 │ │
│ │ Addis Ababa University   [Badge]    │ │
│ │ Addis Ababa, Ethiopia               │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Type: Full-time  Start: Jan 2020       │
│ End: Present                            │
│                                         │
│ Description: [Full text]                │
│ Responsibilities: [Full text]           │
│ Achievements: [Full text]               │
│ Certificate: [Preview] [View Full]      │
├─────────────────────────────────────────┤
│ [Edit] [Delete] [Close]                 │
└─────────────────────────────────────────┘
```

## Keyboard Shortcuts

- **ESC** - Close fullscreen file preview
- **ESC** - Close view modal (when not in edit mode)

## API Endpoints Used

```javascript
// View
GET /api/tutor/achievements/{id}
GET /api/tutor/certifications/{id}
GET /api/tutor/experience/{id}

// Update
PUT /api/tutor/achievements/{id}
PUT /api/tutor/certifications/{id}
PUT /api/tutor/experience/{id}

// Delete
DELETE /api/tutor/achievements/{id}
DELETE /api/tutor/certifications/{id}
DELETE /api/tutor/experience/{id}
```

## Troubleshooting

### Modal doesn't open
```bash
# Check browser console for errors
# Verify these functions exist:
console.log(typeof window.viewAchievement);  // should be "function"
console.log(typeof window.viewCertification);  // should be "function"
console.log(typeof window.viewExperience);  // should be "function"
```

### Backend errors
```bash
# Check if backend endpoints were added
# Restart backend after adding endpoints
cd astegni-backend
python app.py

# Check logs for errors
```

### File preview not working
```bash
# Check Backblaze URL is accessible
# Verify file extension is supported (jpg, png, pdf)
# Check browser console for CORS errors
```

### Update not saving
```bash
# Check form field names match backend
# Verify FormData is created correctly
# Check backend logs for validation errors
# Ensure user has tutor role
```

## Common Issues

**Q: Status badge not showing**
A: Check database `verification_status` column exists and has valid values (pending/verified/rejected)

**Q: Old file not deleted from Backblaze**
A: Verify `backblaze_service.delete_file()` method exists and has proper permissions

**Q: Can't edit after viewing**
A: Check that edit form IDs match the ones in `populateEditForm()` function

**Q: Delete button deletes but file remains**
A: Updated DELETE endpoints include Backblaze cleanup - make sure you added the new endpoints

## Next Steps

After implementation, consider:
1. Test all three types (achievement, certification, experience)
2. Test with different file types (jpg, png, pdf)
3. Test with no files uploaded
4. Test edit without changing file
5. Test edit with new file
6. Verify Backblaze cleanup by checking B2 console
7. Test with multiple users to verify ownership checks

## Support

For issues or questions, refer to:
- `VIEW-EDIT-DELETE-IMPLEMENTATION-SUMMARY.md` - Complete technical documentation
- `PROFILE_EXTENSIONS_ENDPOINTS_ADDITIONS.py` - Backend code to add
- `VIEW-MODALS-INSERT.html` - Already inserted into tutor-profile.html
