# Test Upload Modals - Quick Guide

## Issue Fixed
✅ Cover upload and profile upload buttons were not opening modals → **NOW FIXED**

## How to Test

### Step 1: Start Servers
```bash
# Terminal 1 - Backend
cd astegni-backend
python app.py

# Terminal 2 - Frontend
cd ..
python -m http.server 8080
```

### Step 2: Open Tutor Profile
1. Open browser: http://localhost:8080/profile-pages/tutor-profile.html
2. Login with tutor credentials (if required)

### Step 3: Test Cover Upload Modal
1. **Locate**: Cover photo area (top of profile page)
2. **Click**: Camera icon button on cover photo
3. **Expected**: Modal should appear with fade-in animation
4. **Check**:
   - Modal is centered on screen
   - Background is dark/blurred
   - Title says "Upload Cover Photo"
   - Upload area is visible with camera emoji
   - Body scroll is locked (can't scroll page behind modal)

### Step 4: Test Profile Upload Modal
1. **Locate**: Profile picture (circular avatar below cover photo)
2. **Click**: Camera icon button on profile picture
3. **Expected**: Modal should appear with fade-in animation
4. **Check**:
   - Modal is centered on screen
   - Background is dark/blurred
   - Title says "Upload Profile Picture"
   - Upload area is visible with person emoji
   - Body scroll is locked

### Step 5: Test Modal Closing
Try all three close methods for each modal:

1. **X button**: Click the × in top-right corner
   - Expected: Modal fades out (300ms transition) then closes

2. **ESC key**: Press Escape on keyboard
   - Expected: Modal closes immediately

3. **Click outside** (if enabled): Click on dark background
   - Expected: Modal closes

4. **Verify**: Body scroll is restored after closing

### Step 6: Test File Upload (Optional)
1. Open cover or profile upload modal
2. Click upload area or click to select file
3. Choose an image file (JPG, PNG, GIF)
4. Expected:
   - File preview appears
   - File name shown
   - File size shown
   - Dimensions shown
5. Click "Upload Cover" or "Upload Profile" button
6. Expected:
   - Upload progress shown
   - Success notification (if backend is running)
   - Modal closes
   - Profile page updates with new image

## What Was Changed

### Files Modified:
- `js/tutor-profile/global-functions.js`:
  - `openModal()` - Now sets opacity, visibility, and display
  - `closeCoverUploadModal()` - Now animates close transition
  - `closeProfileUploadModal()` - Now animates close transition

### Technical Details:
The modals start with CSS: `opacity: 0; visibility: hidden; display: none;`

Opening now sets:
- `display: flex` (shows element in layout)
- `opacity: 1` (makes it visible)
- `visibility: visible` (makes it interactive)
- `overflow: hidden` on body (locks scroll)

Closing now:
- Sets `opacity: 0` (fade out)
- Sets `visibility: hidden` (prevents interaction)
- Waits 300ms for transition
- Sets `display: none` (removes from layout)
- Restores body scroll

## Console Logs to Watch

When testing, open browser DevTools (F12) and check Console for:

### When Opening:
```
openModal called with: coverUploadModal
✅ Opened upload modal: coverUploadModal
```

OR if modal needs to be loaded first:
```
openModal called with: coverUploadModal
⏳ Modal not in DOM yet, loading: coverUploadModal
[ModalLoader] Loading from cache: cover-upload-modal.html
✅ Opened upload modal (after loading): coverUploadModal
```

### When Closing:
```
closeCoverUploadModal called
Cover upload modal closed
```

### Error Cases (Should NOT see these):
```
❌ Modal not found: coverUploadModal
❌ Modal still not found after loading: coverUploadModal
```

## Diagnostic Tool

If modals still don't work, use the diagnostic tool:

```bash
# Open in browser
http://localhost:8080/test-upload-modals.html
```

Click the buttons in order:
1. "Load Modal System" - Initializes ModalLoader
2. "Check Modals" - Verifies modals are in DOM
3. "Check Functions" - Verifies all functions exist
4. "Open Cover Modal" - Tests manual open
5. "Open Profile Modal" - Tests manual open

## Troubleshooting

### Modal doesn't appear:
- Check Console for errors
- Verify modal-loader.js is loaded (check Network tab)
- Verify global-functions.js is loaded
- Try diagnostic tool (test-upload-modals.html)

### Modal appears but is invisible:
- Check if opacity is being set (Inspect Element → Computed styles)
- Verify tutor-profile.css is loaded
- Check for CSS conflicts

### Modal doesn't close:
- Check Console for close function errors
- Verify close button is calling correct function
- Try ESC key (handled by modal-manager.js)

### File upload doesn't work:
- Check if backend is running (http://localhost:8000/docs)
- Verify upload-handler.js is loaded
- Check Network tab for API calls
- This is a separate issue from modal visibility

## Success Criteria

✅ Cover upload button opens modal with animation
✅ Profile upload button opens modal with animation
✅ X button closes modal with fade-out
✅ ESC key closes modal
✅ Body scroll locks when modal open
✅ Body scroll restores when modal closed
✅ No console errors
✅ File selection shows preview
✅ Upload button triggers API call (if backend running)

## Status
**READY FOR TESTING** - All code changes complete
