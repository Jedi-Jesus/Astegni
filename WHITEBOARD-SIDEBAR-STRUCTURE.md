# Whiteboard Sidebars Structure - Complete Breakdown

## Desktop (≥1024px)

### Left Sidebar (`whiteboard-sidebar`)
```
┌────────────────────────────┐
│ ┌──┬──────────────────┐   │
│ │ I│   Content Area    │   │
│ │ C│                   │   │
│ │ O│   - Students      │   │
│ │ N│   - Files         │   │
│ │  │   - Coursework    │   │
│ │ B│   - Digital Lab   │   │
│ │ A│   - History       │   │
│ │ R│   - Settings      │   │
│ │  │                   │   │
│ └──┴──────────────────┘   │
└────────────────────────────┘
```

**Structure:**
- Display: `flex` (horizontal: icon bar | content)
- Position: `static` (part of grid)
- Grid Column: `auto` (first column)
- Icon Bar: 50px width, vertical
- Content: 280px width
- Total Width: 330px

**Classes/States:**
- Default: Fully expanded
- `.collapsed`: Content hidden (50px icon bar only)

---

### Right Sidebar (`whiteboard-right-sidebar`)
```
┌────────────────────────────┐
│   ┌──────────────────┬──┐ │
│   │   Content Area   │ I│ │
│   │                  │ C│ │
│   │   - Live Video   │ O│ │
│   │   - Chat         │ N│ │
│   │   - AI Assistant │  │ │
│   │                  │ B│ │
│   │                  │ A│ │
│   │                  │ R│ │
│   │                  │  │ │
│   └──────────────────┴──┘ │
└────────────────────────────┘
```

**Structure:**
- Display: `flex` with `flex-direction: row-reverse` (content | icon bar)
- Position: `static` (part of grid)
- Grid Column: `auto` (third column)
- Content: 420px width
- Icon Bar: 50px width, vertical
- Total Width: 470px

**Classes/States:**
- Default: `.collapsed` class added by JavaScript (50px icon bar only)
- `.collapsed` removed: Content visible (420px content + 50px icon bar = 470px total)
- User clicks icon button: Expands to show content

---

### Grid Layout (Desktop ≥1024px)
```
.whiteboard-body {
    grid-template-columns: auto 1fr auto;
}

┌───────────────────────────────────────────┐
│ Left (330px) │ Canvas (flex) │ Right (470px) │
│     auto     │      1fr      │     auto      │
└───────────────────────────────────────────┘
```

---

## Tablet (769px - 1024px)

### Left Sidebar (`whiteboard-sidebar`)
```
┌─────────────────────┐
│ ┌──┬──────────┐     │
│ │ I│ Content  │     │
│ │ C│          │     │
│ │ O│ History  │     │
│ │ N│ Files    │     │
│ │  │ etc.     │     │
│ │ B│          │     │
│ │ A│          │     │
│ │ R│          │     │
│ └──┴──────────┘     │
└─────────────────────┘
```

**Structure:**
- Display: `flex` (horizontal: icon bar | content)
- Position: `static` (part of grid)
- Grid Column: `auto` (first column)
- Icon Bar: 50px width, vertical
- Content: 250px width (narrower than desktop)
- Total Width: 300px

**Classes/States:**
- Default: Expanded
- `.collapsed`: Content hidden

---

### Right Sidebar (`whiteboard-right-sidebar`)
```
                    ┌─────────────────────┐
                    │ ┌──────────┬──┐     │
                    │ │ Content  │ I│     │
    OVERLAY →       │ │          │ C│     │
    Slides in/out → │ │ Video    │ O│     │
                    │ │ Chat     │ N│     │
                    │ │ AI       │  │     │
                    │ │          │ B│     │
                    │ │          │ A│     │
                    │ │          │ R│     │
                    │ └──────────┴──┘     │
                    └─────────────────────┘
```

**Structure:**
- Display: `flex` with `flex-direction: row-reverse`
- Position: `fixed` (overlay, not in grid!)
- Location: `right: 0, top: 60px`
- Height: `calc(100vh - 60px)`
- Content: 420px width
- Icon Bar: 50px width, vertical
- Total Width: 470px
- Z-index: 1000
- Transform: `translateX(100%)` (hidden by default)

**Classes/States:**
- Default: Hidden (translated off-screen)
- `.expanded`: Visible (translateX(0))

**Toggle Button:** `#rightSidebarToggle` visible in header

---

### Grid Layout (Tablet 769-1024px)
```
.whiteboard-body {
    grid-template-columns: auto 1fr;
}

┌────────────────────────────────┐
│ Left (300px) │ Canvas (flex)  │ ← Right sidebar is overlay!
│     auto     │      1fr       │
└────────────────────────────────┘
```

**Canvas Behavior:**
- When right sidebar opens: `margin-right: 470px` (using `:has()` selector)
- When right sidebar closes: `margin-right: 0`
- Smooth 300ms transition

---

## Mobile (≤768px)

### Left Sidebar (`whiteboard-sidebar`) - VERTICAL STACK
```
     ┌──────────────────────┐
     │ [📋][📁][📝][🧪][⏱️][⚙️] │ ← Icon bar (horizontal, 56px height)
     ├──────────────────────┤
OVERLAY │                      │
Slides  │   Content Area       │
from    │                      │
left    │   - Session 1        │
        │   - Session 2        │
        │   - Files            │
        │                      │
        └──────────────────────┘
```

**Structure:**
- Display: `flex` with `flex-direction: column` (VERTICAL STACK!)
- Position: `fixed` (overlay, not in grid!)
- Location: `left: 0, top: 60px`
- Height: `calc(100vh - 60px)`
- Width: 280px (max 85vw)
- Z-index: 1001
- Transform: `translateX(-100%)` (hidden by default)

**Icon Bar:**
- Width: `100%` (full width of sidebar)
- Height: `auto`, min-height: `56px`
- Display: `flex` with `flex-direction: row` (horizontal!)
- Padding: `8px 12px`
- Overflow-x: `auto` (scrollable)
- Border-bottom: `1px solid`

**Icon Buttons:**
- Size: `40px × 40px`
- Flex-shrink: `0` (no shrinking)

**Content:**
- Width: `100%`
- Flex: `1` (takes remaining vertical space)

**Classes/States:**
- Default: Hidden (translated off-screen)
- `.mobile-active`: Visible (translateX(0))

**Toggle Button:** `#mobileToggleHistory` visible in header

---

### Right Sidebar (`whiteboard-right-sidebar`) - VERTICAL STACK
```
                    ┌──────────────────────┐
                    │ [📹][💬][✨]        │ ← Icon bar (horizontal, 56px height)
                    ├──────────────────────┤
        OVERLAY     │                      │
        Slides      │   Content Area       │
        from        │                      │
        right       │   - Video Grid       │
                    │   - Chat Messages    │
                    │   - AI Panel         │
                    │                      │
                    └──────────────────────┘
```

**Structure:**
- Display: `flex` with `flex-direction: column` (VERTICAL STACK!)
- Position: `fixed` (overlay, not in grid!)
- Location: `right: 0, top: 60px`
- Height: `calc(100vh - 60px)`
- Width: 280px (max 85vw)
- Z-index: 1000
- Transform: `translateX(100%)` (hidden by default)

**Icon Bar:**
- Width: `100%` (full width of sidebar)
- Height: `auto`, min-height: `56px`
- Display: `flex` with `flex-direction: row` (horizontal!)
- Padding: `8px 12px`
- Overflow-x: `auto` (scrollable)
- Border-bottom: `1px solid`

**Icon Buttons:**
- Size: `40px × 40px`
- Flex-shrink: `0`

**Content:**
- Width: `100%`
- Flex: `1` (takes remaining vertical space)

**Classes/States:**
- Default: Hidden (translated off-screen)
- `.mobile-active`: Visible (translateX(0))

**Toggle Button:** `#rightSidebarToggle` visible in header

---

### Grid Layout (Mobile ≤768px)
```
.whiteboard-body {
    grid-template-columns: 1fr;
}

┌────────────────────────┐
│   Canvas (100% width)  │ ← Both sidebars are overlays!
│         1fr            │
└────────────────────────┘
```

**Canvas Behavior:**
- Always full width
- No margin adjustments
- Sidebars overlay on top with backdrop

---

## Small Mobile (≤480px)

### Changes from Mobile (768px):
**Both Sidebars:**
- Width: `260px` (max 90vw) - slightly narrower
- Icon bar min-height: `48px` - slightly shorter
- Icon buttons: `36px × 36px` - slightly smaller
- Icon bar padding: `6px 8px` - more compact

**Everything else remains the same vertical stack structure!**

---

## Backdrop (Mobile & Tablet)

### Tablet (769-1024px):
```css
.mobile-sidebar-backdrop {
    display: none; /* Shown when right sidebar opens */
    z-index: 999; /* Below sidebars */
    background: rgba(0, 0, 0, 0.5);
}

.mobile-sidebar-backdrop.active {
    display: block;
}
```
- Only appears when right sidebar (overlay) opens
- Click backdrop to close right sidebar

### Mobile (≤768px):
- Same as tablet
- Appears when either left or right sidebar opens
- Click backdrop to close any open sidebar

---

## Summary Table

| Breakpoint | Left Sidebar | Right Sidebar | Canvas Grid | Backdrop |
|------------|--------------|---------------|-------------|----------|
| **≥1024px** | Static, Horizontal (Icon│Content), 330px | Static, Horizontal (Content│Icon), 470px | `auto 1fr auto` | No |
| **769-1024px** | Static, Horizontal (Icon│Content), 300px | **Overlay**, Horizontal (Content│Icon), 470px | `auto 1fr` | Yes (right only) |
| **≤768px** | **Overlay**, **Vertical** (Icon/Content), 280px | **Overlay**, **Vertical** (Icon/Content), 280px | `1fr` | Yes (both) |
| **≤480px** | **Overlay**, **Vertical** (Icon/Content), 260px | **Overlay**, **Vertical** (Icon/Content), 260px | `1fr` | Yes (both) |

---

## Key Differences Summary

### Desktop (≥1024px):
- ✅ Both sidebars in grid
- ✅ Side-by-side icon bars (vertical)
- ✅ No overlays
- ✅ Canvas in middle column

### Tablet (769-1024px):
- ✅ Left sidebar in grid
- ❌ Right sidebar overlay (not in grid)
- ✅ Side-by-side left sidebar
- ✅ Backdrop for right sidebar
- ✅ Canvas expands with margin

### Mobile (≤768px):
- ❌ Both sidebars overlays (not in grid)
- ✅ **VERTICAL STACK** - icon bar on top!
- ✅ Icon bars horizontal & scrollable
- ✅ Backdrop for both
- ✅ Canvas full width

**The revolutionary change on mobile is the VERTICAL STACK layout where icon bars become horizontal headers!**

---

## Right Sidebar Default State (All Breakpoints)

### JavaScript Initialization
When the whiteboard modal opens, JavaScript automatically adds the `.collapsed` class to the right sidebar:

```javascript
// js/tutor-profile/whiteboard-manager.js - Lines 1003, 1038, 1070
document.querySelector('.whiteboard-right-sidebar')?.classList.add('collapsed');
```

### Behavior Across Breakpoints

**Desktop (≥1024px):**
- Starts: Icon bar only (50px width)
- Grid adjusts: `auto 1fr 50px` (left sidebar | canvas | collapsed right sidebar)
- Canvas: Maximum width on load
- User action: Click any icon button (📹/💬/✨) → Expands to 470px
- Re-collapse: Click same active button again

**Tablet (769px-1024px):**
- Starts: Hidden off-screen (translateX(100%))
- Right sidebar is overlay (not in grid)
- Canvas: Full width minus left sidebar
- User action: Click toggle button or icon → Slides in
- Re-hide: Click toggle button, backdrop, or active icon

**Mobile (≤768px):**
- Starts: Hidden off-screen (translateX(100%))
- Right sidebar is overlay (not in grid)
- Canvas: Full width (100vw)
- User action: Click toggle button or icon → Slides in
- Re-hide: Click toggle button, backdrop, or active icon

### Why Start Collapsed?

1. **Maximum Canvas Space**: Users get the most drawing area immediately
2. **Cleaner Interface**: Less visual clutter on first load
3. **User Control**: Features appear only when explicitly needed
4. **Consistent UX**: Same behavior across all screen sizes
5. **Progressive Disclosure**: Advanced features (video, chat, AI) are one click away

### Opening Right Sidebar

1. Click any icon button in the right icon bar:
   - 📹 **Live** - Video call panel
   - 💬 **Chat** - Chat messages panel
   - ✨ **AI Assistant** - AI help panel
2. Sidebar expands with smooth 300ms transition
3. Click the same active button to collapse again
