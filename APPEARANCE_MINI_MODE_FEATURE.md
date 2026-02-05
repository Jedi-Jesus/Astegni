# Appearance Modal Mini-Mode Feature

## Overview
Added a mini-mode feature to the appearance modal that allows users to minimize the modal to a compact widget at the bottom-right of the screen. This enables live theme preview while keeping the page content visible and interactive.

## Implementation Date
2026-01-28

## Features

### 1. Mini-Mode Toggle
- **Minimize Button**: Added a minimize button (↓ icon) in the modal header
- **Position**: Bottom-right corner when minimized
- **Size**: 320px × 400px (responsive on mobile)
- **Animation**: Smooth slide-in from bottom with scale effect

### 2. Live Preview
- Users can experiment with themes and color palettes while minimized
- Changes apply instantly to the background page
- No blocking of page content or interactions
- Perfect for comparing different theme combinations

### 3. Visual Indicators
- **Preview Mode Badge**: Shows "Preview Mode - Click header to expand" at the top
- **Hover Hints**: "👆 Click to expand" appears on header hover
- **Unsaved Changes**: Red badge on modal icon when changes haven't been saved
- **Pulsing Save Button**: Indicates unsaved changes with animation

### 4. User Experience
- Click minimize button (↓) to enter mini-mode
- Click modal header to restore full mode
- All settings remain functional in mini-mode
- Shows essential controls (Theme, Color Palette)
- Hides non-essential sections (Display Density, Animations, etc.)

### 5. Responsive Design
- Desktop: 320px wide at bottom-right
- Mobile: Full width minus 20px padding, 50vh max height
- Maintains usability on all screen sizes

## Files Modified

### 1. HTML (`modals/common-modals/appearance-modal.html`)
- Added minimize button in modal header
- Updated header structure with `.modal-header-actions` wrapper

### 2. CSS (`css/common-modals/appearance-modal.css`)
- Added `.mini-mode` class styles
- Created slide-in animation (`@keyframes slideInFromBottom`)
- Added pulse animation for indicators
- Responsive mini-mode styles for mobile
- Compact grid layouts for mini-mode
- Visual hints and badges

### 3. JavaScript (`js/common-modals/appearance-modal.js`)
- Added `isMiniMode` state tracking
- Created `toggleMiniMode()` method
- Added `hasUnsavedChanges()` method
- Added `updateUnsavedIndicator()` method
- Updated all preview methods to track changes
- Global function: `toggleAppearanceMiniMode()`
- Header click handler for restoring full mode

## Usage

### For Users
```javascript
// Open the appearance modal
openAppearanceModal();

// Click the minimize button (↓) in the top-right
// OR use the global function:
toggleAppearanceMiniMode();

// Click the modal header to expand back to full mode
```

### For Developers
```javascript
// Access the manager instance
const manager = appearanceModalManager;

// Check if in mini-mode
if (manager.isMiniMode) {
    console.log('Currently in mini-mode');
}

// Check for unsaved changes
if (manager.hasUnsavedChanges()) {
    console.log('User has unsaved changes');
}
```

## Testing
A test page has been created: `test-appearance-mini-mode.html`

### Test Steps:
1. Open `test-appearance-mini-mode.html` in browser
2. Click "Open Appearance Settings"
3. Click the minimize button (↓) in header
4. Modal moves to bottom-right corner
5. Try changing themes/palettes
6. See changes apply to background content
7. Click header to expand back
8. Click "Save Changes" to persist

## Technical Details

### State Management
- **Saved Settings**: `this.settings` - Current saved state
- **Preview Settings**: `this.previewSettings` - Temporary preview state
- **Mini Mode**: `this.isMiniMode` - Boolean flag for mini-mode state

### CSS Classes
- `.mini-mode` - Applied to `#appearance-modal` element
- `.has-unsaved-changes` - Applied when preview differs from saved
- `.modal-header-actions` - Wrapper for header buttons

### Animations
- `modalSlideUp` - Initial modal open animation
- `slideInFromBottom` - Mini-mode entrance animation
- `pulse` - Unsaved changes indicator animation

## Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS transitions and animations
- Flexbox layout
- CSS custom properties

## Future Enhancements
1. Remember mini-mode preference in localStorage
2. Drag-and-drop repositioning in mini-mode
3. Resize handle for adjusting mini-mode size
4. Keyboard shortcut to toggle mini-mode
5. Auto-minimize when clicking outside
6. Mini-mode preview for other modals

## Benefits
1. **Better UX**: Users can see theme changes in context
2. **Faster Decisions**: Compare themes without blocking view
3. **Reduced Friction**: No need to close/reopen modal repeatedly
4. **Professional Feel**: Modern, polished interaction pattern
5. **Accessibility**: Still keyboard navigable in mini-mode

## Notes
- Mini-mode automatically clears body scroll lock
- Full mode reapplies scroll lock
- Changes are only saved when user clicks "Save Changes"
- Closing modal reverts to last saved state
- Header is clickable in mini-mode (except buttons)

## Related Files
- `modals/common-modals/appearance-modal.html`
- `css/common-modals/appearance-modal.css`
- `js/common-modals/appearance-modal.js`
- `test-appearance-mini-mode.html` (test page)
- `css/root/color-palettes.css` (color palette definitions)
- `css/root/theme.css` (theme variables)
