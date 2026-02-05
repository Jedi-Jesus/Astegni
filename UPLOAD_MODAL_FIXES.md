# Upload Document Modal Fixes

## Issues Fixed

### Issue A: Documents Uploading Twice (Duplicate Submissions)
**Problem**: When uploading a document from student-profile.html, the same document was being uploaded twice to the database.

**Root Cause**: Multiple event listeners were being attached to the form's submit event:
1. Once on script load (line 1521-1524)
2. Once in `initializeCredentialManager()` (line 85)
3. Once when opening the modal (line 790)

Each time the user clicked submit, all 3 handlers would fire, causing 3 API calls (though typically only 2 would complete before the modal closed).

**Fix**: Added duplicate handler prevention in `setupCredentialFormHandler()`:
```javascript
// Check if handler already attached to prevent duplicate submissions
if (form.dataset.handlerAttached === 'true') {
    console.log('⚠️ Form handler already attached, skipping...');
    return;
}

// Mark as attached
form.dataset.handlerAttached = 'true';
console.log('✅ Attaching form submit handler...');
```

**File**: `js/common-modals/credential-manager.js` (line 866-884)

---

### Issue B: Button Stuck on "Uploading..." After Success
**Problem**: After successfully uploading a document, the submit button remained disabled with "Uploading..." text, even though the upload was complete.

**Root Cause**: Button reset logic was executing AFTER the modal was closed:
```javascript
// Close modal
closeUploadDocumentModal();  // Modal closes, button no longer visible

// Reset button (too late - modal is already closed!)
submitButton.disabled = false;
submitButton.innerHTML = originalText;
```

**Fix**: Reset the button BEFORE closing the modal, with a small delay to show success state:
```javascript
// Reset button BEFORE closing modal (so it's visible when reset)
submitButton.disabled = false;
submitButton.innerHTML = originalText;

// Close modal after a short delay to show success state
setTimeout(() => {
    closeUploadDocumentModal();
}, 100);
```

**File**: `js/common-modals/credential-manager.js` (line 978-987)

---

## Changes Summary

### 1. Duplicate Handler Prevention
**Location**: `js/common-modals/credential-manager.js` line 877-884

**Before**:
```javascript
function setupCredentialFormHandler() {
    const form = document.getElementById('uploadDocumentForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        // Handler code...
    });
}
```

**After**:
```javascript
function setupCredentialFormHandler() {
    const form = document.getElementById('uploadDocumentForm');
    if (!form) return;

    // Check if handler already attached to prevent duplicate submissions
    if (form.dataset.handlerAttached === 'true') {
        console.log('⚠️ Form handler already attached, skipping...');
        return;
    }

    // Mark as attached
    form.dataset.handlerAttached = 'true';
    console.log('✅ Attaching form submit handler...');

    form.addEventListener('submit', async (e) => {
        // Handler code...
    });
}
```

### 2. Button Reset Before Modal Close
**Location**: `js/common-modals/credential-manager.js` line 978-987

**Before**:
```javascript
// Update UI
updateCredentialCounts();
displayCredentials(currentCredentialType);

// Close modal
closeUploadDocumentModal();

// Reset button (AFTER modal closed - not visible!)
submitButton.disabled = false;
submitButton.innerHTML = originalText;
```

**After**:
```javascript
// Update UI
updateCredentialCounts();
displayCredentials(currentCredentialType);

// Reset button BEFORE closing modal (so it's visible when reset)
submitButton.disabled = false;
submitButton.innerHTML = originalText;

// Close modal after a short delay to show success state
setTimeout(() => {
    closeUploadDocumentModal();
}, 100);
```

### 3. Simplified Handler Attachment in Modal Open
**Location**: `js/common-modals/credential-manager.js` line 793-797

**Before**:
```javascript
if (!form.dataset.handlerAttached) {
    setupCredentialFormHandler();
    form.dataset.handlerAttached = 'true';  // Redundant with internal check
}
```

**After**:
```javascript
// Set up form handler if not already done (modal loaded dynamically)
setupCredentialFormHandler();  // Internal check handles duplicates
```

### 4. Cache-Busting Version Update
**Location**: `profile-pages/student-profile.html` line 6019

**Updated to**: `v=20260131-uploadfix`

---

## How It Works Now

### Upload Flow (Single Submission)
1. User clicks "Upload Credential" button
2. Modal opens, form handler is attached (if not already attached)
3. User fills form and clicks "Upload Document"
4. **ONE** submit event fires → **ONE** API call
5. Loading state: Button shows "Uploading...", panel shows progress
6. Success: Button resets to "Upload Document"
7. Modal closes after 100ms delay
8. Credential appears in the grid

### Console Logs
**First time opening modal**:
```
✅ Attaching form submit handler...
```

**Second time opening modal**:
```
⚠️ Form handler already attached, skipping...
```

**On upload**:
```
📤 Uploading new document...
📤 FormData contents: ...
✅ Credential uploaded successfully
📊 Credential counts - Achievements: X, Academic: Y, Experience: Z
```

### Network Tab
**Before Fix**:
- 2-3 simultaneous `POST /api/documents/upload` requests (duplicates!)

**After Fix**:
- 1 single `POST /api/documents/upload` request

---

## Testing Checklist

### Test Duplicate Upload Fix
1. ✅ Open student profile → Credentials panel
2. ✅ Click "Upload Credential"
3. ✅ Fill form with test data
4. ✅ Click "Upload Document"
5. ✅ Check Network tab → Should see **exactly 1** POST request
6. ✅ Check database → Should have **exactly 1** new credential
7. ✅ Repeat upload → Should still only create 1 credential per upload

### Test Button Reset Fix
1. ✅ Open upload modal
2. ✅ Fill form and submit
3. ✅ Watch button during upload:
   - Initially: "📤 Upload Document"
   - During upload: "⏳ Uploading..." (disabled)
   - After success: "📤 Upload Document" (enabled) ← Should reset BEFORE modal closes
4. ✅ Modal should close smoothly
5. ✅ Open modal again → Button should be in default state (not stuck on "Uploading...")

### Test Multiple Uploads
1. ✅ Upload achievement → Works
2. ✅ Upload academic credential → Works
3. ✅ Upload another achievement → Works
4. ✅ Each upload should create exactly 1 credential
5. ✅ Button should reset properly each time

### Browser Console
No duplicate handler warnings:
```
✅ Attaching form submit handler...  (first time only)
⚠️ Form handler already attached, skipping...  (subsequent times)
```

---

## Before vs After Comparison

### Before Fix

**Issue A - Duplicate Uploads**:
- User uploads 1 document
- Database receives 2-3 identical records
- Network tab shows 2-3 POST requests
- Confusion: "Why do I have duplicate credentials?"

**Issue B - Stuck Button**:
- User uploads document
- Modal closes
- Button still shows "Uploading..." (disabled)
- User reopens modal → Button still stuck
- User can't upload again without page refresh

### After Fix

**Issue A - Single Upload**:
- User uploads 1 document
- Database receives 1 record
- Network tab shows 1 POST request
- Clean: No duplicates

**Issue B - Proper Reset**:
- User uploads document
- Button resets to "Upload Document" (enabled)
- Modal closes smoothly
- User reopens modal → Button is ready
- User can upload again immediately

---

## Technical Details

### Handler Attachment Strategy
The form handler is now protected by a flag (`form.dataset.handlerAttached`) that prevents multiple attachments:

1. **First call** to `setupCredentialFormHandler()`:
   - Checks `form.dataset.handlerAttached` → undefined
   - Sets flag to `'true'`
   - Attaches event listener

2. **Second call** to `setupCredentialFormHandler()`:
   - Checks `form.dataset.handlerAttached` → `'true'`
   - Returns early without attaching

3. **Third call** to `setupCredentialFormHandler()`:
   - Same as second call → Returns early

**Result**: Only ONE submit handler attached, regardless of how many times the function is called.

### Button Reset Timing
```javascript
// Success flow:
1. API call completes
2. Update UI (counts, grid)
3. Reset button (while modal is still open)
4. Wait 100ms
5. Close modal

// Error flow:
1. API call fails
2. Show error panel
3. Reset button (modal stays open)
4. User can retry
```

The 100ms delay ensures:
- User sees the button reset (visual feedback)
- Success panel is visible briefly
- Smooth transition to closed state

---

## Files Modified

1. **js/common-modals/credential-manager.js**
   - Line 877-884: Added duplicate handler prevention
   - Line 978-987: Fixed button reset timing
   - Line 793-797: Simplified handler attachment

2. **profile-pages/student-profile.html**
   - Line 6019: Updated cache-busting version to `v=20260131-uploadfix`

---

## Compatibility

These fixes work for both:
- ✅ Student profile (`student-profile.html`)
- ✅ Tutor profile (`tutor-profile.html`)
- ✅ Any other profile using the unified credential manager

The handler attachment flag is form-specific, so if multiple forms exist on the same page (unlikely), each would have its own flag.
