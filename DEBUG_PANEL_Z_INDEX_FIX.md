# Debug Panel Z-Index Fix & Index.html Integration

## Changes Made

### 1. Debug Panel Positioning

**File:** [js/utils/role-switch-debugger.js](js/utils/role-switch-debugger.js:43-59)

**Changed:**
- **Position**: Now starts below navbar (top: 60px)
- **Height**: Adjusted to `calc(100vh - 60px)` to fit below navbar
- **Z-index**: Set to 9999 (below profile dropdown)

```javascript
panel.style.cssText = `
    position: fixed;
    top: 60px;                          // Below navbar (was: top: 0)
    right: -450px;
    width: 450px;
    height: calc(100vh - 60px);         // Adjusted height (was: 100vh)
    z-index: 9999;                      // Below profile dropdown (was: 999999)
    ...
`;
```

### 2. Profile Container Z-Index (Fixed Layering)

**File:** [css/root/profile-dropdown.css](css/root/profile-dropdown.css:5-9)

**Added z-index to profile container:**
```css
.profile-dropdown-container {
    position: relative;
    display: inline-flex;
    z-index: 10000; /* Above debug panel (9999) */
}
```

### 3. Profile Dropdown Menu Z-Index

**File:** [css/root/profile-dropdown.css](css/root/profile-dropdown.css:71)

**Updated dropdown menu z-index:**
```css
#profile-dropdown-menu {
    z-index: 10001; /* Above debug panel and profile container */
}
```

### 4. Added Debug Panel to Index.html

**File:** [index.html](index.html:76-77)

**Added script before closing `</head>` tag:**
```html
<!-- Role Switch Debugger (DEVELOPMENT ONLY - Press Ctrl+Shift+D to toggle) -->
<script src="js/utils/role-switch-debugger.js"></script>
```

## Z-Index Hierarchy

Now the layering is correct:

```
Layer 10001: Profile Dropdown Menu (highest - when open)
    ↓
Layer 10000: Profile Container (clickable area)
    ↓
Layer 9999:  Debug Panel
    ↓
Layer 1:     Page content
```

## Visual Layout

```
┌─────────────────────────────────────────────────┐
│  NAVBAR (includes profile container)           │ <- z-index: 10000
│  ┌──────────────────────┐                      │
│  │ Profile Dropdown    │  <- z-index: 10001   │
│  │ (when open)         │                       │
│  └──────────────────────┘                      │
├─────────────────────────────────────────────────┤
│                                                 │
│  Page Content                    ┌─────────────┤
│                                  │   Debug     │ <- z-index: 9999
│                                  │   Panel     │    top: 60px
│                                  │             │
│                                  │   [Stats]   │
│                                  │             │
│                                  │   [Logs]    │
│                                  │             │
│                                  └─────────────┘
```

## Testing

1. **Hard refresh** (Ctrl+Shift+R) to load changes

2. **Test z-index layering:**
   - Press Ctrl+Shift+D to open debug panel
   - Click profile container (your name/pic in navbar)
   - Profile dropdown should appear **above** the debug panel ✅

3. **Test positioning:**
   - Debug panel should start just below the navbar ✅
   - Debug panel should not cover the navbar ✅

4. **Test on index.html:**
   - Navigate to `http://localhost:8081/index.html`
   - Press Ctrl+Shift+D
   - Debug panel should work on homepage too ✅

## Files Modified

1. ✅ [js/utils/role-switch-debugger.js](js/utils/role-switch-debugger.js) - Panel positioning and z-index
2. ✅ [css/root/profile-dropdown.css](css/root/profile-dropdown.css) - Profile container z-index
3. ✅ [index.html](index.html) - Added debug script

## Persistence Feature

The debug panel now **remembers its open/closed state** across page navigation:

- If you open the panel (Ctrl+Shift+D) on one page
- Navigate to another page (e.g., Student → Tutor profile)
- The panel will **automatically re-open** on the new page ✅

**How it works:**
- Uses `sessionStorage.getItem('debugPanelOpen')`
- Persists only for the current browser session
- Closes if you close the browser tab

## Benefits

✅ **Navbar always accessible** - Debug panel doesn't cover navigation
✅ **Profile dropdown works** - Can switch roles with debug panel open
✅ **Works on all pages** - Including index.html homepage
✅ **Clean layering** - Proper z-index hierarchy
✅ **Persistent across navigation** - Stays open when switching pages

---

**Status:** ✅ Complete
**Date:** 2026-01-25
**Ready for testing:** Yes
