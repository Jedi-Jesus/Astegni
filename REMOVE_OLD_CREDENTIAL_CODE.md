# Quick Guide: Remove Old Inline Credential Code

## What to Delete

Open `profile-pages/student-profile.html` and find line **~6343**

Look for this comment:
```javascript
// ============================================
//   CREDENTIAL UPLOAD MODAL FUNCTIONS
// ============================================
```

Delete everything from that line down to (but NOT including) this line at **~7147**:
```javascript
// ============================================
//   DOCUMENTS PANEL - FUNCTIONS
// ============================================
```

## What to Replace It With

Replace all that deleted code with this simple comment:

```javascript
        // ============================================
        //   CREDENTIAL FUNCTIONS - NOW UNIFIED
        // ============================================
        // NOTE: Credential management is now handled by js/tutor-profile/credential-manager.js
        // This manager is shared across tutor and student profiles for consistency.
        // All credential functions (upload, edit, delete, render) are automatically
        // exported by credential-manager.js and available globally.
        // ============================================

        // ============================================
        //   DOCUMENTS PANEL - FUNCTIONS
        // ============================================
```

## Why Delete This Code?

The deleted code (~800 lines) is **completely replaced** by `credential-manager.js` which you already included in the script tags.

**Functions being removed (all duplicates):**
- `openUploadCredentialModal()`
- `closeUploadCredentialModal()`
- `handleCredentialUpload()`
- `loadCredentialsByType()`
- `renderCredentials()`
- `createCredentialCard()`
- `createExtracurricularListItem()`
- `editStudentCredential()`
- `deleteCredential()`
- `switchCredentialSection()`
- `initializeCredentialsPanel()`
- And ~20 more helper functions

**All are now provided by credential-manager.js** ✅

## Visual Guide

```
BEFORE (student-profile.html):
---------------------------------
Line 6341:  });
Line 6342:
Line 6343:  // ============================================
Line 6344:  //   CREDENTIAL UPLOAD MODAL FUNCTIONS
Line 6345:  // ============================================
...
[~800 lines of inline credential code]
...
Line 7146:  });
Line 7147:  // ============================================
Line 7148:  //   DOCUMENTS PANEL - FUNCTIONS
Line 7149:  // ============================================


AFTER (student-profile.html):
---------------------------------
Line 6341:  });
Line 6342:
Line 6343:  // ============================================
Line 6344:  //   CREDENTIAL FUNCTIONS - NOW UNIFIED
Line 6345:  // ============================================
Line 6346:  // NOTE: Credential management is handled by...
Line 6347:  // ============================================
Line 6348:
Line 6349:  // ============================================
Line 6350:  //   DOCUMENTS PANEL - FUNCTIONS
Line 6351:  // ============================================
```

## Verification

After deletion, verify these lines exist in student-profile.html:

✅ Line ~6128: `<script src="../modals/tutor-profile/modal-loader.js"></script>`
✅ Line ~6131: `<script src="../js/tutor-profile/credential-manager.js"></script>` (NEW)
✅ Line ~5371: Comment about modal loaded dynamically (not inline HTML)

## Done!

File should be ~800 lines smaller and credentials will work identically (but now unified with tutor profile).
