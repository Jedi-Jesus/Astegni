# Share Button Debugging Guide

## Problem
Share Profile button not opening the share-profile-modal on some profile pages.

## What Was Fixed

### 1. Modal Loader Updates
Added `share-profile-modal.html` to both modal loaders:

**Files Updated:**
- `modals/tutor-profile/modal-loader.js` - Added to COMMON_MODALS array and MODAL_ID_MAP
- `modals/common-modals/common-modal-loader.js` - Added to COMMON_MODALS array and MODAL_ID_MAP

### 2. Cache-Busting Version Updates
Updated cache-busting versions to `?v=20260204g` on:
- `profile-pages/tutor-profile.html`
- `profile-pages/student-profile.html`
- `profile-pages/advertiser-profile.html`
- All view-profile pages (view-tutor, view-student, view-parent, view-advertiser)

## How to Debug

### Step 1: Clear Browser Cache
**CRITICAL:** You MUST clear your browser cache completely, or the old modal-loader.js files will still be cached.

**Chrome/Edge:**
1. Press `Ctrl + Shift + Delete`
2. Select "Cached images and files"
3. Select "All time"
4. Click "Clear data"

**Or use hard refresh:**
- Windows: `Ctrl + Shift + R` or `Ctrl + F5`
- Mac: `Cmd + Shift + R`

### Step 2: Test with Debug Script

#### Option A: Browser Console Test
1. Open any profile page (tutor-profile, student-profile, advertiser-profile)
2. Open browser console (`F12`)
3. Copy and paste the entire content of `debug-share-button.js` into the console
4. Press Enter
5. Review the output

#### Option B: Test Page
1. Open `test-share-button-simple.html` in your browser
2. Click the buttons in order:
   - "Check Authentication" - Verify you're logged in
   - "Load Modal Loader" - Should show ✓ Loaded
   - "Load Share Manager" - Should show ✓ Loaded
   - "Share Profile (TEST)" - Should open the modal

### Step 3: Manual Console Checks

Open browser console (`F12`) on any profile page and run these commands:

```javascript
// 1. Check if function exists
console.log('shareProfile exists:', typeof shareProfile !== 'undefined');

// 2. Check if modal is in DOM
console.log('Modal in DOM:', !!document.getElementById('shareProfileModal'));

// 3. Check modal loaders
console.log('ModalLoader:', typeof ModalLoader !== 'undefined');
console.log('CommonModalLoader:', typeof CommonModalLoader !== 'undefined');

// 4. Try to manually load the modal
if (typeof ModalLoader !== 'undefined') {
    ModalLoader.load('share-profile-modal.html')
        .then(() => console.log('✓ Modal loaded'))
        .catch(err => console.error('✗ Failed:', err));
} else if (typeof CommonModalLoader !== 'undefined') {
    CommonModalLoader.load('share-profile-modal.html')
        .then(() => console.log('✓ Modal loaded'))
        .catch(err => console.error('✗ Failed:', err));
}

// 5. Check if modal is preloaded
setTimeout(() => {
    const modal = document.getElementById('shareProfileModal');
    console.log('Modal after preload:', !!modal);
    if (modal) {
        console.log('Modal HTML:', modal.innerHTML.substring(0, 200));
    }
}, 2000);
```

### Step 4: Network Tab Check

1. Open browser DevTools (`F12`)
2. Go to "Network" tab
3. Filter by "JS"
4. Reload the page
5. Look for these files:
   - `modal-loader.js?v=20260204g` - Should load with 200 status
   - `share-profile-manager.js?v=20260204f` - Should load with 200 status
   - `share-profile-modal.html` - Should be fetched during modal preloading

### Step 5: Check Console Errors

Look for any red error messages in the console that might indicate:
- 404 errors (file not found)
- CORS errors
- JavaScript errors
- Modal loading failures

## Expected Behavior

### When Page Loads:
1. Modal loader initializes
2. Modal loader preloads all modals including `share-profile-modal.html`
3. Console should show: `[ModalLoader] Preloaded X modals...`
4. `shareProfileModal` should exist in DOM (hidden)

### When Button is Clicked:
1. `shareProfile()` function is called
2. Function checks authentication
3. Modal is shown with `display: block`
4. Referral data is loaded from API
5. Modal appears on screen

## Common Issues & Solutions

### Issue 1: Function Not Defined
**Error:** `shareProfile is not defined`

**Solution:**
- Check if `share-profile-manager.js` is loaded
- Look in Network tab for 404 errors
- Verify script tag exists in HTML

### Issue 2: Modal Not in DOM
**Error:** Modal element not found

**Solution:**
- Check if modal loader loaded the modal
- Run: `ModalLoader.load('share-profile-modal.html')`
- Check console for loading errors

### Issue 3: Modal Not Visible
**Symptom:** Modal exists but doesn't appear

**Solution:**
- Check modal z-index (should be 100000)
- Check modal display property
- Check for conflicting CSS
- Open modal and inspect in DevTools

### Issue 4: Old Cached Files
**Symptom:** Changes not taking effect

**Solution:**
- Clear browser cache completely
- Use hard refresh (Ctrl+Shift+R)
- Check Network tab - files should have `?v=20260204g`

### Issue 5: Wrong Modal Opens
**Symptom:** Different share modal appears

**Solution:**
- Check for duplicate modal HTML in page
- Search page source for "shareProfileModal"
- Ensure only one modal with that ID exists

## File Checklist

Ensure these files are present and up-to-date:

- [ ] `modals/common-modals/share-profile-modal.html` - The modal HTML
- [ ] `js/common-modals/share-profile-manager.js` - The modal logic
- [ ] `modals/tutor-profile/modal-loader.js` - Updated with share-profile-modal
- [ ] `modals/common-modals/common-modal-loader.js` - Updated with share-profile-modal

## Testing Checklist

Test on each profile type:

- [ ] Tutor Profile - Click share button → Modal opens
- [ ] Student Profile - Click share button → Modal opens
- [ ] Parent Profile - Click share button → Modal opens
- [ ] Advertiser Profile - Click share button → Modal opens
- [ ] View Tutor - Click share button → Modal opens
- [ ] View Student - Click share button → Modal opens
- [ ] View Parent - Click share button → Modal opens
- [ ] View Advertiser - Click share button → Modal opens

## API Requirements

The share modal requires these API endpoints:

- `GET /api/referrals/my-code?profile_type={role}` - Get referral code
- `GET /api/referrals/stats?profile_type={role}` - Get referral stats

Make sure backend is running and endpoints are working.

## Next Steps

1. **Clear browser cache** (CRITICAL!)
2. **Run debug script** - Use `debug-share-button.js` or `test-share-button-simple.html`
3. **Check console** - Look for errors or loading issues
4. **Test manually** - Click share button on each profile page
5. **Report results** - If still not working, provide console output

## Support Files Created

- `debug-share-button.js` - Comprehensive debug script for console
- `test-share-button-simple.html` - Visual testing page with step-by-step debugging
- `SHARE_BUTTON_DEBUG_GUIDE.md` - This guide

## Quick Fix Summary

**What changed:**
1. Added `share-profile-modal.html` to modal loader arrays
2. Added modal ID mappings for `shareProfileModal`
3. Updated cache-busting versions to force reload

**Why it failed before:**
- Modal loaders didn't know about `share-profile-modal.html`
- Modal was never preloaded into the DOM
- `shareProfile()` function tried to show a modal that didn't exist

**Why it works now:**
- Modal loaders now preload `share-profile-modal.html` on page load
- Modal exists in DOM when button is clicked
- `shareProfile()` function can find and show the modal
