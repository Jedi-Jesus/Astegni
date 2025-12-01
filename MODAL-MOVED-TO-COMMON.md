# Universal Upload Modal - Moved to Common Modals ✅

## Change Summary
Moved the universal upload modal from `tutor-profile` folder to `common-modals` folder since it's now shared across all profile types.

## Files Moved

### From:
`modals/tutor-profile/story-upload-modal.html`

### To:
`modals/common-modals/universal-upload-modal.html`

## Why This Move?

The modal was originally a "story upload" modal specific to tutor profiles. But now it's a **universal upload modal** that handles:
- 📱 Story uploads
- 🖼️ Cover image uploads
- 👤 Profile picture uploads
- 🎨 General image uploads

Since it's used by **all profile types** (tutor, student, parent, advertiser), it belongs in the `common-modals` folder.

## Updated Files

### 1. Modal Loader Configuration
**File**: `modals/tutor-profile/modal-loader.js`

**Changes**:
- Removed `story-upload-modal.html` from `TUTOR_PROFILE_MODALS` array
- Added `universal-upload-modal.html` to `COMMON_MODALS` array
- Updated `MODAL_ID_MAP` to point to new location:
  ```javascript
  'storyUploadModal': { file: 'universal-upload-modal.html', path: 'common-modals' }
  ```

### 2. Modal File
**File**: `modals/common-modals/universal-upload-modal.html`

**Updated header comment**:
```html
<!--
  Modal: Universal Upload Modal
  Location: common-modals (shared across all profile types)
  Purpose: Universal upload modal for Story, Cover Image, Profile Image, and General Images
-->
```

## How It Works

The modal loader automatically handles the new location:

1. **ModalLoader.load('storyUploadModal')** is called
2. Checks `MODAL_ID_MAP` → finds `{ file: 'universal-upload-modal.html', path: 'common-modals' }`
3. Loads from `../common-modals/universal-upload-modal.html`
4. Injects into DOM with ID `storyUploadModal`

## No Code Changes Needed

All existing JavaScript continues to work:
- `openUploadStoryModal('cover')` ✅ Still works
- `openUploadStoryModal('profile')` ✅ Still works
- `openUploadStoryModal('story')` ✅ Still works
- `closeStoryUploadModal()` ✅ Still works

The modal ID (`storyUploadModal`) remains the same, so all functions that reference it continue to work without modification.

## Benefits

✅ **Better organization** - Shared modals in common folder
✅ **Reusable across profiles** - Can be used in student-profile, parent-profile, etc.
✅ **Single source of truth** - One modal file for all upload types
✅ **Easier maintenance** - Update once, affects all profiles

## Testing

1. **Refresh page** (Ctrl+F5)
2. **Click cover upload** → Modal loads from common-modals
3. **Click profile upload** → Same modal, different type
4. **Click story upload** → Same modal, story mode

All should work exactly the same as before!

## Status
✅ **COMPLETE** - Modal successfully moved to common-modals folder
