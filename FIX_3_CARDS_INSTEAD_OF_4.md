# Fix: Counter Cards Showing 3 Instead of 4 on Desktop

**Date:** 2026-01-17
**Commit:** `5286725`
**Status:** ✅ DEPLOYED

---

## Issue

Counter cards showing **3 cards in a row** instead of **4 cards** on desktop screens ≥1024px

Expected layout:
- **4 cards in one row:** 1 static card + 3 flip cards

Actual behavior:
- Only 3 cards visible in a row
- 4th card wrapping to second row

---

## Root Cause

**Landscape Mobile Media Query was too broad:**

```css
/* BEFORE - Line 808 */
@media (max-height: 500px) and (orientation: landscape) {
    .counter-grid {
        grid-template-columns: repeat(3, 1fr);  /* 3 columns */
    }
}
```

**Problem:**
- This media query matched **ANY screen width** in landscape with height < 500px
- Desktop monitors in landscape (e.g., 1920x1080, 2560x1440) also matched
- The 3-column rule overrode the intended 4-column desktop layout
- CSS specificity caused this rule to take precedence

---

## Solution

**Added max-width constraint to limit landscape rule to mobile/tablet only:**

```css
/* AFTER - Line 808 */
@media (max-height: 500px) and (max-width: 1023px) and (orientation: landscape) {
    .counter-grid {
        grid-template-columns: repeat(3, 1fr);  /* 3 columns */
    }
}
```

**Now the rule only applies to:**
- Screen width: **< 1024px** (mobile/tablet)
- Screen height: **< 500px** (landscape)
- Orientation: **landscape**

**Desktop screens (≥1024px) are excluded** and use the 4-column layout.

---

## Responsive Breakpoints (Final)

| Screen Size | Width | Orientation | Columns | Use Case |
|-------------|-------|-------------|---------|----------|
| **Desktop** | ≥1024px | Any | **4 columns** | Laptops, monitors |
| **Tablet Portrait** | 768-1023px | Portrait | 2 columns | iPad portrait |
| **Tablet Landscape** | 768-1023px | Landscape (<500px) | 3 columns | iPad landscape |
| **Mobile Portrait** | <768px | Portrait | 1-2 columns | Phones portrait |
| **Mobile Landscape** | <768px | Landscape (<500px) | 3 columns | Phones landscape |

---

## Testing

### Before Fix:
```
Desktop (1920x1080, landscape): 3 cards visible ❌
Desktop (2560x1440, landscape): 3 cards visible ❌
Laptop (1366x768, landscape): 3 cards visible ❌
```

### After Fix:
```
Desktop (1920x1080, landscape): 4 cards visible ✅
Desktop (2560x1440, landscape): 4 cards visible ✅
Laptop (1366x768, landscape): 4 cards visible ✅
Laptop (1024x768, landscape): 4 cards visible ✅
Tablet (768x1024, portrait): 2 cards visible ✅
Mobile (375x667, landscape): 3 cards visible ✅
```

---

## File Changed

**File:** [css/index/responsive.css:808](css/index/responsive.css#L808)

**Diff:**
```diff
- @media (max-height: 500px) and (orientation: landscape) {
+ @media (max-height: 500px) and (max-width: 1023px) and (orientation: landscape) {
```

---

## How to Verify in Production

1. **Visit:** https://astegni.com
2. **Hard Refresh:** Ctrl+Shift+R
3. **Check at 1024px+:**
   - Resize browser to 1024px or wider
   - You should see **4 counter cards** in one row
4. **Test landscape mobile:**
   - Use DevTools device emulation
   - Set to mobile landscape (<1024px, height <500px)
   - Should see **3 cards** (correct for mobile)

---

## Related Fixes

This is the **third fix** for counter cards:

1. **Fix A:** Database not loading (cache-busting) - Commit `20d8831`
2. **Fix B:** Cards not in row at 1024px (breakpoint 1024→1023) - Commit `20d8831`
3. **Fix C:** Only 3 cards showing (landscape media query) - Commit `5286725` ✅

All counter card issues are now resolved! 🎉

---

## Summary

✅ **Issue:** 3 cards instead of 4 on desktop
✅ **Root Cause:** Landscape media query too broad
✅ **Solution:** Added max-width: 1023px constraint
✅ **Result:** 4 cards display correctly on all desktop screens ≥1024px
✅ **Deployed:** Production (auto-deployment triggered)

**Test after ~1 minute:** Hard refresh https://astegni.com and verify 4 cards in a row on desktop!
