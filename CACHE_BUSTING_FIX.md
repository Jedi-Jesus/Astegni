# Cache Busting Fix for Schedule View Modal

## Issue
```
Uncaught ReferenceError: openViewScheduleModal is not defined
```

## Root Cause

**Browser cache** was serving the old version of `global-functions.js` that didn't have the new schedule view modal functions.

Even though the functions were added to the file and exported to `window`, the browser was using a cached version from before.

---

## Fix Applied

### Updated Version Parameter

**File:** `profile-pages/student-profile.html` (line 6056)

**Before:**
```html
<script src="../js/student-profile/global-functions.js?v=20251230"></script>
```

**After:**
```html
<script src="../js/student-profile/global-functions.js?v=20260129-viewmodal"></script>
```

### Why This Works

The query parameter `?v=20260129-viewmodal` tells the browser this is a different file than before, forcing it to:
1. **Ignore cache** - Don't use the old cached version
2. **Download fresh** - Fetch the latest file from server
3. **Execute new code** - Use the updated functions

---

## Cache Busting Strategy

### When to Update Version Parameter

Update the version parameter whenever you:
1. Add new functions
2. Fix bugs in existing functions
3. Change function behavior
4. Modify exports to `window`

### Version Naming Convention

Use this format:
```
?v=YYYYMMDD-description
```

**Examples:**
- `?v=20260129-viewmodal` - Added view modal functions
- `?v=20260129-fix` - General bug fix
- `?v=20260130-editflow` - Updated edit flow

### Alternative: User Action

Instead of changing version in code, users can also:
1. **Hard refresh:** Ctrl+Shift+R (Chrome/Firefox) or Ctrl+F5 (all browsers)
2. **Clear cache:** Ctrl+Shift+Delete → Clear browser cache
3. **Disable cache:** DevTools → Network tab → "Disable cache" checkbox

But updating the version parameter forces all users to get the new version automatically.

---

## Files with Version Parameters

These files in student-profile.html have version parameters:

```html
Line 11:   <script src="../js/config.js?v=20251217"></script>
Line 6002: <script src="../js/root/auth.js?v=20260124"></script>
Line 6005: <script src="../js/common-modals/access-restricted-modal.js?v=20251229"></script>
Line 6007: <script src="../js/root/profile-completion-guard.js?v=20251224"></script>
Line 6013: <script src="../js/root/profile-system.js?v=20260124"></script>
Line 6056: <script src="../js/student-profile/global-functions.js?v=20260129-viewmodal"></script>
Line 6059: <script src="../js/student-profile/sessions-panel-manager.js?v=20260128"></script>
Line 6058: <script src="../js/student-profile/session-requests-manager.js?v=20251218"></script>
Line 6065: <script src="../js/student-profile/profile-edit-manager.js?v=20251230a"></script>
Line 6082: <script src="../js/common-modals/tfa-manager.js?v=20251227"></script>
Line 6082: <script src="../js/common-modals/role-manager.js?v=20260126"></script>
Line 6127: <script src="../js/student-profile/schedule-manager.js?v=20260129"></script>
Line 6691: <script src="../js/common-modals/leave-astegni-modal.js?v=20260127"></script>
Line 6693: <script src="../js/common-modals/appearance-manager.js?v=20260128-fix"></script>
```

**Best Practice:** Always add version parameter to JavaScript files that are actively being developed.

---

## Testing

### Verify Cache Refresh Works

1. Open student-profile.html
2. Open DevTools (F12)
3. Go to **Network** tab
4. Check "Disable cache" (for testing)
5. Reload page (Ctrl+F5)
6. Look for: `global-functions.js?v=20260129-viewmodal` in network requests
7. Check **Status**: Should be `200` (not `304 Not Modified`)
8. Open **Console**
9. Type: `typeof openViewScheduleModal`
10. **Expected:** `"function"` ✅

### Verify Functions Work

1. Navigate to Schedule panel
2. Click "View Details" on any schedule
3. **Expected:** View modal opens ✅
4. No console errors ✅

---

## Production Deployment

### After Deploying to Production

If auto-deployment is configured:
1. Git push triggers deployment
2. Files are copied to server
3. **But:** Users still have old cached version!

### Solution: Update Version in Git Commit

```bash
git add profile-pages/student-profile.html
git commit -m "Update global-functions.js version for cache busting"
git push origin main
```

Now all users will automatically get the new version on next page load.

---

## Summary

| Issue | Solution |
|-------|----------|
| **Problem** | Browser cached old JavaScript file |
| **Symptom** | `openViewScheduleModal is not defined` |
| **Root Cause** | No cache busting on file update |
| **Fix** | Updated version parameter to `?v=20260129-viewmodal` |
| **Result** | Browser loads fresh file with new functions ✅ |

**Status:** ✅ **FIXED**

Browser will now load the updated JavaScript file with all schedule view modal functions!
