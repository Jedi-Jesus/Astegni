# TEST NOW - Verification Workflow

## Changes Made
1. **Removed duplicate event listeners** from `profile-controller.js`
2. **Added extensive debugging** to `openVerificationFeeModal()` function
3. Event listeners now **only** attached in `global-functions.js` when modals open

## Test Steps

### 1. Refresh the Page
Clear cache and refresh: `Ctrl + Shift + R`

### 2. Open Console
Press `F12` → Go to Console tab

### 3. Test Certification Flow
1. Click "Upload Certification" button
2. **Expected console output:**
   ```
   ✅ Attaching verification listener to certificationForm
   ```

3. Fill in ANY required fields (just put random data)
4. Click "Upload Certification" submit button
5. **Expected console output:**
   ```
   📤 Certification form submitted!
   💾 Stored pending certification data
   🚪 Opening verification fee modal...
   🔔 openVerificationFeeModal() called
   🔍 Found modal: YES ✅
   📊 Modal current state: {display: "", hasHidden: true, hasShow: false}
   📊 Modal new state: {display: "flex", hasHidden: false, hasShow: true}
   ✅ Verification fee modal should now be visible
   ```

6. **Expected result:** Verification fee modal appears with "50 ETB" message

## Troubleshooting

### If you see duplicate output
```
📤 Certification form submitted!  (appears TWICE)
```
**Problem:** Listeners still being attached twice
**Solution:** Hard refresh the browser (Ctrl + Shift + R)

### If modal still doesn't appear
Check console for:
```
🔍 Found modal: NO ❌
```
**Problem:** Modal HTML not in DOM
**Solution:** Check if `verificationFeeModal` exists in tutor-profile.html

### If you see this:
```
📊 Modal new state: {display: "flex", hasHidden: false, hasShow: true}
```
But modal still not visible...

**Check CSS:** The modal might be hidden by CSS z-index or other styles.

Run in console:
```javascript
const modal = document.getElementById('verificationFeeModal');
console.log('Modal computed styles:', window.getComputedStyle(modal).display);
console.log('Modal visibility:', window.getComputedStyle(modal).visibility);
console.log('Modal z-index:', window.getComputedStyle(modal).zIndex);
```

## Quick Manual Test

Open console and run:
```javascript
// Test function exists
console.log(typeof openVerificationFeeModal); // Should be "function"

// Test modal exists
console.log(document.getElementById('verificationFeeModal')); // Should show HTML element

// Test opening modal directly
openVerificationFeeModal();
```

If this works, the issue is with the event listener.
If this doesn't work, the issue is with the modal HTML/CSS.

## Expected Working Flow

```
1. Click "Upload Certification"
   ↓
2. Modal opens, form visible
   ↓
3. Event listener attached (console shows ✅)
   ↓
4. Fill form (any random data)
   ↓
5. Click submit button
   ↓
6. Console shows:
   - Form submitted
   - Data stored
   - Opening fee modal
   - Modal found
   - Modal state changed
   ↓
7. Fee modal appears on screen ✅
```

## If Still Not Working

Check these files were saved:
- ✅ `js/tutor-profile/profile-controller.js` (lines 614-617 removed duplicate)
- ✅ `js/tutor-profile/global-functions.js` (lines 348-448 with event listeners)
- ✅ `js/tutor-profile/global-functions.js` (lines 4893-4920 with debug logs)

## Browser Cache
Clear browser cache completely:
1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"

## Test All Three Forms
- [ ] Achievement form → Fee modal opens
- [ ] Certification form → Fee modal opens
- [ ] Experience form → Fee modal opens

## Success Criteria
✅ Only ONE set of console logs per submit (not duplicate)
✅ Modal found in DOM
✅ Modal display changes to "flex"
✅ Modal visible on screen
✅ Can click "Confirm & Pay" button
