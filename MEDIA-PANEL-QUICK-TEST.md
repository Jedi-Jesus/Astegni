# Media Panel Quick Test Guide

## Prerequisites

1. **Backend running**: `cd astegni-backend && python app.py`
2. **Frontend server running**: `python -m http.server 8080`
3. **Logged in as admin**
4. **Database tables exist**: Run migrations if needed

## Quick Test Checklist

### 1. Load Media Panel (5 seconds)

```
✓ Navigate to: http://localhost:8080/admin-pages/manage-system-settings.html?panel=media
✓ Verify tier settings load (check form fields have values)
✓ Verify "Uploaded System Images" section appears
✓ Verify "Uploaded System Videos" section appears
```

### 2. Test Media Settings Save (30 seconds)

```
✓ Change "Free Tier - Single Image Max Size" from current value to 3
✓ Change "Basic Tier - Single Video Max Size" from current value to 150
✓ Click "Save Media Settings" button
✓ Verify success alert appears
✓ Reload page
✓ Verify values persisted (should show 3 and 150)
```

### 3. Test Image Upload (1 minute)

```
✓ Click "Upload Image" button
✓ Select "What is this image for?" → "Profile Picture"
✓ Select "Which profile/entity?" → "Tutors"
✓ Enter title (optional): "Default Tutor Profile"
✓ Choose an image file from your computer
✓ Preview should appear
✓ Click "Upload Image"
✓ Verify success alert with URL
✓ Check "Uploaded System Images" section
✓ Verify your image appears in the grid
```

### 4. Test Video Upload (2 minutes)

```
✓ Click "Upload Video" button
✓ Select "Video Type" → "Advertisement"
✓ Select "Ad Classification" → "Tutorial"
✓ Check target checkboxes (e.g., "Tutor Profile", "Student Profile")
✓ Enter "Video Title": "Sample Tutorial Ad"
✓ Enter "Description" (optional): "Test video"
✓ Choose a video file (MP4 recommended)
✓ Choose a thumbnail image
✓ Video preview should appear
✓ Thumbnail preview should appear
✓ Click "Upload Video"
✓ Watch progress bar fill (0% → 100%)
✓ Verify success alert
✓ Check "Uploaded System Videos" section
✓ Verify your video appears with thumbnail
```

### 5. Test Delete (30 seconds)

```
✓ Hover over the image/video you just uploaded
✓ Red delete button should appear in top-right corner
✓ Click delete button
✓ Confirm deletion in dialog
✓ Verify item removed from grid
✓ Check browser console - no errors
```

## Expected Results

### ✅ Success Indicators

- No JavaScript errors in browser console
- Data loads without "Loading..." stuck on screen
- Forms populate with database values
- Upload modals open/close smoothly
- Progress bar works for video uploads
- Items appear in grid after upload
- Items disappear after deletion
- Success alerts show for all operations

### ❌ Failure Indicators

- Console errors (red text)
- "Loading..." stuck on screen
- Form fields empty on page load
- Upload button disabled/stuck
- No items in grid after upload
- Deletion doesn't remove item
- Alert shows "Failed to..."

## Database Verification (Optional)

If you want to verify data is actually in the database:

```bash
cd astegni-backend
python
```

```python
from models import SessionLocal, SystemMedia, SystemMediaSettings
from sqlalchemy import text

db = SessionLocal()

# Check media settings
settings = db.execute(text("SELECT * FROM system_media_settings")).fetchall()
print("Media Settings:", settings)

# Check uploaded media
media = db.execute(text("SELECT id, media_type, title, file_type FROM system_media")).fetchall()
print("Uploaded Media:", media)

db.close()
```

## Troubleshooting

### Issue: Form fields empty on load
**Solution**: Check browser console for 401 error → Re-login

### Issue: Upload fails with network error
**Solution**: Verify backend is running on port 8000

### Issue: "Failed to save settings"
**Solution**: Check if `system_media_settings` table exists → Run migration

### Issue: Image/video doesn't appear after upload
**Solution**: Check browser console → Verify `loadUploadedMedia()` was called

### Issue: Delete doesn't work
**Solution**: Check if DELETE endpoint exists in backend routes.py

## Quick Backend Check

```bash
# Verify backend is running
curl http://localhost:8000/api/admin/system/media-settings

# Should return JSON with tier data
```

## Success!

If all tests pass:
✅ Media panel is fully integrated with database
✅ All CRUD operations work
✅ Frontend ↔ Backend communication successful
✅ Data persists across page reloads

## Time Required

- **Quick smoke test**: 2 minutes (just load and verify display)
- **Basic functionality test**: 5 minutes (upload + delete one item)
- **Complete test suite**: 10 minutes (all operations + verification)
