# Share Profile Modal Layout Fix - Tutor Profile

## Problem
When opening the Share Profile modal from **tutor-profile.html**, the modal header layout was wrong - elements appeared on the left instead of properly spaced with flexbox.

## Root Cause
The file `css/tutor-profile/package-modal-unified.css` had **global `.modal-header` styles** (lines 79-88) that were affecting ALL modals, not just the package management modal.

```css
/* WRONG - Affects ALL modals */
.modal-header {
    position: relative;
    padding: 2rem 2.5rem;
    background: linear-gradient(135deg, var(--primary-color, #F59E0B) 0%, var(--primary-dark, #D97706) 100%);
    /* ... */
}
```

This gradient background and other styles were being applied to the Share Profile modal, breaking its layout.

## Fix Applied

### 1. Scoped Modal Header Styles
Changed global `.modal-header` to be scoped to `#package-management-modal` only:

```css
/* CORRECT - Only affects package modal */
#package-management-modal .modal-header {
    position: relative;
    padding: 2rem 2.5rem;
    background: linear-gradient(135deg, var(--primary-color, #F59E0B) 0%, var(--primary-dark, #D97706) 100%);
    /* ... */
}
```

### 2. Fixed Mobile Responsive Styles
Also scoped the responsive `.modal-header` styles in the `@media (max-width: 768px)` query.

### 3. Added Cache-Busting
Updated tutor-profile.html to load the CSS with version `v=20260204k`.

## Files Modified

1. **css/tutor-profile/package-modal-unified.css**
   - Line 79: Changed `.modal-header` → `#package-management-modal .modal-header`
   - Line 90: Changed `.modal-header::before` → `#package-management-modal .modal-header::before`
   - Line 1178: Changed `.modal-header` → `#package-management-modal .modal-header` (mobile)
   - Line 1182: Changed `.modal-title` → `#package-management-modal .modal-title` (mobile)

2. **profile-pages/tutor-profile.html**
   - Line 60: Added `?v=20260204k` to CSS file reference

## Testing

1. **Clear browser cache**: `Ctrl+Shift+Delete` → "All time"
2. **Hard refresh**: `Ctrl+Shift+F5`
3. **Open tutor-profile.html**
4. **Click "Share Profile" button**
5. **Expected**: Modal header should display correctly with:
   - Title + icon on the left
   - Close button (X) on the right
   - No gradient background
   - Proper spacing

## Why This Happened

The package-modal-unified.css file was created to consolidate package modal styles, but used overly broad selectors (`.modal-header` instead of `#package-management-modal .modal-header`). This is a common CSS specificity issue.

## Prevention

**Rule**: Modal-specific CSS should ALWAYS use ID selectors to avoid affecting other modals.

✅ **CORRECT**: `#my-modal .modal-header`
❌ **WRONG**: `.modal-header` (too global)

## Status

✅ **FIXED** - Share Profile modal now displays correctly on tutor-profile.html

---
**Date Fixed**: 2026-02-04
**Issue**: Modal header layout broken on tutor-profile
**Cause**: Global CSS selectors in package-modal-unified.css
**Resolution**: Scoped CSS to package modal only
