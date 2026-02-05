# Color Palette Override Issue - SOLUTION

## Problem Confirmed

The diagnostic revealed:
```
✅ data-palette attribute: emerald-gold-charcoal
✅ CSS file loaded: color-palettes.css
✅ CSS rule exists: --primary-color: #00a676
❌ Computed value: --primary-color: #F59E0B (wrong!)
```

**Root Cause:** `theme.css` is overriding the palette colors.

## CSS Specificity Issue

Both files target `<html>`:

**theme.css (line 7):**
```css
:root {
    --primary-color: #F59E0B;  /* Amber */
}
```

**color-palettes.css (line 186):**
```css
[data-palette="emerald-gold-charcoal"] {
    --primary-color: #00a676;  /* Emerald */
}
```

**CSS Specificity:**
- `:root` = (0,0,1,0) - pseudo-class
- `[data-palette="..."]` = (0,0,1,0) - attribute selector

**SAME SPECIFICITY!** So load order determines winner.

## Current Load Order (root.css)

```css
@import url('root/theme.css');           /* 1st */
@import url('root/color-palettes.css');  /* 2nd */
```

This SHOULD work (palettes load last = higher priority)...

## THE REAL PROBLEM

The issue must be that ANOTHER CSS file loaded AFTER `root.css` is re-defining `:root` variables!

Let me check tutor-profile.html CSS load order...

Looking at tutor-profile.html:
```html
Line 26: <link rel="stylesheet" href="../css/root.css">
Line 33: <link rel="stylesheet" href="../css/tutor-profile/tutor-profile.css">
```

**tutor-profile.css** might be redefining the colors!

## Solution: Increase Palette Specificity

Change color-palettes.css to use HIGHER specificity:

**BEFORE:**
```css
[data-palette="emerald-gold-charcoal"] {
    --primary-color: #00a676;
}
```

**AFTER:**
```css
:root[data-palette="emerald-gold-charcoal"],
html[data-palette="emerald-gold-charcoal"] {
    --primary-color: #00a676;
}
```

This gives specificity: (0,0,2,0) which beats plain `:root` at (0,0,1,0)

OR simpler: Add `!important`:

```css
[data-palette="emerald-gold-charcoal"] {
    --primary-color: #00a676 !important;
}
```

## Let Me Check Which File is Overriding

Need to find where `--primary-color: #F59E0B` is defined AFTER color-palettes.css loads.

