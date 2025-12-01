# Grid Layout & Cursor Fix

## Summary
Fixed two UX issues in connection and request cards:
1. **Request cards now display 3 per row** (matching connections layout)
2. **Hand cursor only appears on names** (not on entire card)

## Changes Made

### 1. Request Cards Grid Layout
**File**: [profile-pages/tutor-profile.html](profile-pages/tutor-profile.html)

**Problem**: Request cards were stacked vertically (1 card per row) using `space-y-3` class.

**Before** (Lines 2662, 2698):
```html
<div id="sent-requests-list" class="space-y-3 max-h-96 overflow-y-auto min-h-[300px]">
<div id="received-requests-list" class="space-y-3 max-h-96 overflow-y-auto min-h-[300px]">
```

**After**:
```html
<div id="sent-requests-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto min-h-[300px]">
<div id="received-requests-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto min-h-[300px]">
```

**Result**:
- ✅ **Mobile** (< 768px): 1 card per row
- ✅ **Tablet** (768px - 1024px): 2 cards per row
- ✅ **Desktop** (> 1024px): 3 cards per row
- ✅ Matches connections tab layout exactly

### 2. Cursor Behavior Fix

**Problem**: Hand cursor (pointer) appeared when hovering anywhere on the card, which was confusing since only the name is clickable.

#### Community Panel
**File**: [js/tutor-profile/community-panel-manager.js](js/tutor-profile/community-panel-manager.js)

**Connection Cards** (Line 285):
```javascript
// Card container - cursor: default
style="background: var(--card-bg); border-radius: 12px; padding: 1rem; border: 1px solid rgba(var(--border-rgb), 0.1); transition: all 0.2s ease; cursor: default;"

// Avatar - cursor: default
style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; cursor: default;"

// Name only - cursor: pointer
style="font-weight: 600; color: var(--heading); font-size: 0.95rem; margin: 0; cursor: pointer; transition: color 0.2s; user-select: none;"
```

**Request Cards** (Line 550):
- Same cursor fix applied
- Card: `cursor: default`
- Avatar: `cursor: default`
- Name: `cursor: pointer; user-select: none`

#### Community Modal
**File**: [js/page-structure/communityManager.js](js/page-structure/communityManager.js)

**Both Connection & Request Cards**:
- Applied the same cursor fixes
- `replace_all: true` updated both sections simultaneously

### Additional Improvement: `user-select: none`

Added `user-select: none` to clickable names to prevent text selection when clicking:
- Prevents accidental text highlighting when clicking name
- Improves UX - clicking name feels like clicking a button
- Works across all browsers

## Visual Changes

### Request Cards Layout

**Before**:
```
┌──────────────────────────────────────┐
│  Card 1 (full width)                 │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│  Card 2 (full width)                 │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│  Card 3 (full width)                 │
└──────────────────────────────────────┘
```

**After** (Desktop):
```
┌───────────┐  ┌───────────┐  ┌───────────┐
│  Card 1   │  │  Card 2   │  │  Card 3   │
└───────────┘  └───────────┘  └───────────┘

┌───────────┐  ┌───────────┐  ┌───────────┐
│  Card 4   │  │  Card 5   │  │  Card 6   │
└───────────┘  └───────────┘  └───────────┘
```

### Cursor Behavior

**Before**:
- Hover anywhere on card → Hand cursor (confusing!)
- Click card body → Nothing happens
- Click name → Navigate to profile

**After**:
- Hover on card → Default cursor
- Hover on avatar → Default cursor
- Hover on name → Hand cursor (pointer) ✅
- Click name → Navigate to profile ✅

## Technical Details

### Grid Classes Breakdown
```css
grid grid-cols-1          /* Base: 1 column (mobile) */
md:grid-cols-2            /* Medium screens: 2 columns */
lg:grid-cols-3            /* Large screens: 3 columns */
gap-4                     /* 1rem gap between cards */
max-h-96                  /* Max height: 24rem */
overflow-y-auto           /* Scrollable if content exceeds height */
min-h-[300px]             /* Min height: 300px */
```

### Cursor Styles
```css
cursor: default           /* Default arrow cursor */
cursor: pointer           /* Hand cursor (clickable) */
user-select: none         /* Prevent text selection */
```

## Files Modified

1. **[profile-pages/tutor-profile.html](profile-pages/tutor-profile.html)**:
   - Line 2662: `sent-requests-list` grid layout
   - Line 2698: `received-requests-list` grid layout

2. **[js/tutor-profile/community-panel-manager.js](js/tutor-profile/community-panel-manager.js)**:
   - Line 285: Connection cards cursor fix
   - Line 550: Request cards cursor fix

3. **[js/page-structure/communityManager.js](js/page-structure/communityManager.js)**:
   - Connection cards cursor fix (both instances)
   - Request cards cursor fix (both instances)

## Testing

### Grid Layout Test
1. Open Community Panel → Requests tab
2. Click "Sent Requests" or "Received Requests"
3. **Desktop**: Verify 3 cards per row
4. **Tablet** (resize browser): Verify 2 cards per row
5. **Mobile** (resize browser): Verify 1 card per row

### Cursor Test
1. Hover over card background → Should show default cursor
2. Hover over avatar → Should show default cursor
3. Hover over name → Should show hand cursor (pointer)
4. Click name → Should navigate to user profile
5. Try to select name text → Should NOT select (user-select: none)

## Benefits

✅ **Consistent Layout**: Requests match connections (3 per row)
✅ **Better Space Utilization**: More cards visible without scrolling
✅ **Clear Affordance**: Hand cursor only on clickable elements
✅ **Better UX**: No confusion about what's clickable
✅ **Responsive**: Adapts to screen size (1/2/3 columns)
✅ **No Text Selection**: Clicking name feels like button click

## Related Documentation

- [CLICKABLE-NAMES-UPDATE.md](CLICKABLE-NAMES-UPDATE.md) - Clickable names implementation
- [COMMUNITY-PANEL-STYLING-UPDATE.md](COMMUNITY-PANEL-STYLING-UPDATE.md) - Card styling updates
- [TUTOR-COMMUNITY-PANEL-CARDS-FIX.md](TUTOR-COMMUNITY-PANEL-CARDS-FIX.md) - Connection cards fix
