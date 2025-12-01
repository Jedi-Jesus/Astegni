# Universal Upload Modal - COMPLETE ✅

## Solution
Replaced the broken separate cover/profile upload modals with ONE universal upload modal based on the working story modal.

## Changes Made

### 1. Modified Story Modal to be Universal
**File**: `modals/tutor-profile/story-upload-modal.html`

**Added dropdown selector**:
```html
<select id="uploadType" onchange="handleUploadTypeChange()">
    <option value="story">📱 Story (Image/Video)</option>
    <option value="cover">🖼️ Cover Image</option>
    <option value="profile">👤 Profile Picture</option>
    <option value="image">🎨 General Image</option>
</select>
```

### 2. Updated JavaScript Functions
**File**: `js/tutor-profile/global-functions.js`

**Modified `openUploadStoryModal()`** to accept upload type:
```javascript
function openUploadStoryModal(uploadType = 'story') {
    // Opens modal and sets dropdown to the specified type
    uploadTypeSelect.value = uploadType;
    handleUploadTypeChange(); // Updates UI based on type
}
```

**Added `handleUploadTypeChange()`**:
- Updates modal title based on selection
- Changes icon (📱/🖼️/👤/🎨)
- Adjusts file size limits and hints
- Hides caption for non-story uploads

**Added `uploadFile()`**:
- Routes to correct upload function based on dropdown

**Added upload functions**:
- `uploadCoverImage()` - For cover photos
- `uploadProfileImage()` - For profile pictures
- `uploadGeneralImage()` - For general images
- Existing `uploadStory()` - For stories

### 3. Updated HTML Buttons
**File**: `profile-pages/tutor-profile.html`

**Cover button** (line 352):
```html
<!-- Before -->
<button onclick="openModal('coverUploadModal')">

<!-- After -->
<button onclick="openUploadStoryModal('cover')">
```

**Profile button** (line 383):
```html
<!-- Before -->
<button onclick="openModal('profileUploadModal')">

<!-- After -->
<button onclick="openUploadStoryModal('profile')">
```

## How It Works Now

1. **User clicks cover upload button** → `openUploadStoryModal('cover')`
2. **Modal opens** with dropdown pre-selected to "🖼️ Cover Image"
3. **Modal updates**: Title = "Upload Cover Image", Hint = "Recommended: 1920x400px"
4. **User selects image** → Preview shows
5. **User clicks "Upload Cover"** → `uploadCoverImage()` is called
6. **Success** → Modal closes with confirmation

Same flow for:
- Profile picture → `openUploadStoryModal('profile')`
- Story → `openUploadStoryModal('story')` or `openUploadStoryModal()`
- General image → `openUploadStoryModal('image')`

## Why This Works

✅ **Uses the working story modal architecture** - No CSS or visibility issues
✅ **One modal for all uploads** - Simpler, more maintainable
✅ **Dropdown provides flexibility** - User can change upload type
✅ **Dynamic UI updates** - Modal adapts to each upload type
✅ **No broken modals** - Removed coverUploadModal and profileUploadModal entirely

## Files Modified
1. ✅ `modals/tutor-profile/story-upload-modal.html` - Added dropdown and dynamic elements
2. ✅ `js/tutor-profile/global-functions.js` - Added universal upload functions
3. ✅ `profile-pages/tutor-profile.html` - Updated button onclick handlers

## Files Removed/Deprecated
- ❌ `modals/common-modals/cover-upload-modal.html` - NO LONGER USED
- ❌ `modals/common-modals/profile-upload-modal.html` - NO LONGER USED

## Testing

**Test Cover Upload**:
1. Click camera icon on cover photo
2. Modal opens with "Upload Cover Image" title
3. Dropdown shows "🖼️ Cover Image"
4. Select an image → Preview appears
5. Click "Upload Cover" → Success message

**Test Profile Upload**:
1. Click camera icon on profile picture
2. Modal opens with "Upload Profile Picture" title
3. Dropdown shows "👤 Profile Picture"
4. Select an image → Preview appears
5. Click "Upload Profile" → Success message

**Test Story Upload** (should still work):
1. Click "+ Add New Story" button
2. Modal opens with "Upload Story" title
3. Can upload image or video
4. Caption field is visible

**Test Dropdown Switching**:
1. Open modal for cover
2. Change dropdown to "Profile Picture"
3. UI updates (title, icon, hints change)
4. Upload button text changes

## Status
✅ **COMPLETE** - Ready to test!

**Refresh the page (Ctrl+F5) and test the upload buttons now!**
