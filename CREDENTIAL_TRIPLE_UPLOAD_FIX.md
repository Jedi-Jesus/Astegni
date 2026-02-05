# Credential Triple Upload Bug Fix

## Problem
When uploading credentials in the tutor-profile credentials panel, the upload was happening **three times** instead of once. This caused:
- 3 identical credential records in the database
- 3 API calls to the backend
- Wasted bandwidth and server resources
- Confusing user experience

## Root Cause
The `setupCredentialFormHandler()` function was being called **multiple times** without any guard to prevent duplicate event listener attachment:

1. **Call #1**: Line 43 - `initializeCredentialManager()` calls it
2. **Call #2**: Line 481 - `_openUploadCredentialModalInternal()` calls it when modal opens
3. **Call #3**: Line 1105 - `DOMContentLoaded` event calls it

Each call added a **new submit event listener** to the same form. When the form was submitted, all 3 listeners fired independently, each triggering a separate upload.

## The Fix

### 1. Added Guard in `setupCredentialFormHandler()` (Line 558-575)
```javascript
function setupCredentialFormHandler() {
    const form = document.getElementById('uploadDocumentForm');
    if (!form) {
        return;
    }

    // GUARD: Prevent attaching multiple event listeners
    if (form.dataset.handlerAttached === 'true') {
        console.log('⚠️ Form handler already attached, skipping...');
        return;
    }

    // Mark form as having handler attached
    form.dataset.handlerAttached = 'true';

    form.addEventListener('submit', async (e) => {
        // ... rest of handler
    });
}
```

### 2. Removed Redundant Check in `_openUploadCredentialModalInternal()` (Line 481)
Before:
```javascript
if (!form.dataset.handlerAttached) {
    setupCredentialFormHandler();
    form.dataset.handlerAttached = 'true';
}
```

After:
```javascript
setupCredentialFormHandler(); // Guard inside function handles duplicate prevention
```

## How It Works Now
1. The first call to `setupCredentialFormHandler()` attaches the event listener and sets `form.dataset.handlerAttached = 'true'`
2. Subsequent calls check the flag and return early without adding duplicate listeners
3. Only **one** upload happens when the form is submitted

## Testing
1. Open tutor-profile.html and switch to Credentials panel
2. Click "Upload Credential"
3. Fill in the form and submit
4. Check the Network tab - should see **only 1 POST** request to `/api/tutor/documents/upload`
5. Check the credentials grid - should see **only 1** new credential card
6. Check the backend logs/database - should see **only 1** new record

## Files Changed
- `js/tutor-profile/credential-manager.js` (Lines 558-575, 481)

## Status
✅ **Fixed** - Upload now happens exactly once per form submission
