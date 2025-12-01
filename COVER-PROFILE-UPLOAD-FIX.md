# Cover & Profile Upload Modal Fix

## Issue
When clicking the cover upload or profile upload buttons in tutor-profile.html, the modals were not appearing.

## Root Cause
The modals were being loaded into the DOM correctly by `modal-loader.js`, but they weren't becoming visible because:

1. **CSS Issue**: The modals start with `opacity: 0` and `visibility: hidden` (defined in `css/tutor-profile/tutor-profile.css`)
2. **JavaScript Issue**: The `openModal()` function in `js/tutor-profile/global-functions.js` was only setting `display: flex`, but NOT setting `opacity: 1` and `visibility: visible`
3. **CSS Dependency**: The CSS selector `.upload-cover-modal[style*="display: flex"]` was supposed to trigger visibility, but it wasn't working reliably

## Changes Made

### 1. Fixed `openModal()` function
**File**: `js/tutor-profile/global-functions.js` (lines 14-49)

**Before**:
```javascript
modal.style.display = 'flex';
modal.classList.remove('hidden');
```

**After**:
```javascript
// Set all necessary styles for visibility
modal.style.display = 'flex';
modal.style.opacity = '1';
modal.style.visibility = 'visible';
modal.classList.remove('hidden');
document.body.style.overflow = 'hidden';
```

**Why**: Now explicitly sets all three required CSS properties to make the modal fully visible.

### 2. Fixed `closeCoverUploadModal()` function
**File**: `js/tutor-profile/global-functions.js` (lines 377-394)

**Before**:
```javascript
modal.classList.add('hidden');
modal.classList.remove('show');
modal.style.display = 'none';
document.body.style.overflow = '';
```

**After**:
```javascript
modal.style.opacity = '0';
modal.style.visibility = 'hidden';
// Wait for transition to complete before setting display: none
setTimeout(() => {
    modal.style.display = 'none';
}, 300);
modal.classList.add('hidden');
modal.classList.remove('show');
document.body.style.overflow = '';
```

**Why**: Now properly animates the close transition (0.3s) before hiding the modal.

### 3. Fixed `closeProfileUploadModal()` function
**File**: `js/tutor-profile/global-functions.js` (lines 396-413)

**Same changes as closeCoverUploadModal()**.

## How It Works Now

1. **User clicks cover/profile upload button** → `onclick="openModal('coverUploadModal')"`
2. **openModal() is called** → Checks if modal exists in DOM
3. **If modal exists**:
   - Sets `display: flex` (shows the element)
   - Sets `opacity: 1` (makes it visible)
   - Sets `visibility: visible` (makes it interactive)
   - Removes 'hidden' class
   - Locks body scroll with `overflow: hidden`
4. **If modal doesn't exist**:
   - Calls `ModalLoader.load(modalId)` to fetch from `modals/common-modals/`
   - Waits for load to complete (Promise)
   - Then performs same visibility steps
5. **User closes modal** → `onclick="closeCoverUploadModal()"`
   - Sets `opacity: 0` (fade out animation)
   - Sets `visibility: hidden` (prevents interaction)
   - Waits 300ms for CSS transition
   - Sets `display: none` (removes from layout)
   - Restores body scroll

## Files Modified
- ✅ `js/tutor-profile/global-functions.js` (3 functions updated)

## Files Involved (Not Modified)
- `modals/common-modals/cover-upload-modal.html` (modal HTML - correct)
- `modals/common-modals/profile-upload-modal.html` (modal HTML - correct)
- `modals/tutor-profile/modal-loader.js` (modal loading system - working)
- `css/tutor-profile/tutor-profile.css` (modal styles - correct)

## Testing Checklist
- [ ] Click cover upload button → Modal opens
- [ ] Click X button → Modal closes with animation
- [ ] Click outside modal → Modal closes (if enabled)
- [ ] Press ESC → Modal closes (handled by modal-manager.js)
- [ ] Click profile upload button → Modal opens
- [ ] Select image file → Preview shows
- [ ] Upload button → Calls upload API (verify separately)
- [ ] Body scroll locks when modal is open
- [ ] Body scroll restores when modal is closed

## Related Systems
- **Modal Loader**: `modals/tutor-profile/modal-loader.js` - Dynamically loads modal HTML from separate files
- **Modal Manager**: `js/tutor-profile/modal-manager.js` - Alternative modal management system (not used for upload modals)
- **Upload Handler**: `js/tutor-profile/upload-handler.js` - Handles file selection and upload (separate concern)

## Future Improvements
- Consider consolidating all modal open/close logic into TutorModalManager
- Add click-outside-to-close functionality
- Add loading spinner while modal is being fetched
- Improve error handling if modal fails to load

## Status
✅ **FIXED** - Ready for testing
