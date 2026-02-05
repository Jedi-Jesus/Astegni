# Appearance Modal - Quick Start

## 🚀 5-Minute Setup

### For Profile Pages (Already Have Settings)

**Add ONE line before `settings-manager.js`:**

```html
<script src="../js/common-modals/appearance-manager.js"></script>
<script src="../js/common-modals/settings-manager.js"></script>
```

**That's it!** The appearance button in Settings panel now works.

---

### For Other Pages (New Integration)

**1. Add CSS in `<head>`:**
```html
<link rel="stylesheet" href="css/common-modals/appearance-modal.css">
```

**2. Add button somewhere:**
```html
<button onclick="openAppearanceModal()">
    🎨 Appearance
</button>
```

**3. Add script before `</body>`:**
```html
<script src="js/common-modals/appearance-manager.js"></script>
```

**Done!** Click the button to open appearance settings.

---

## 📋 Files Checklist

### ✅ Created Files
- `js/common-modals/appearance-manager.js` - Main manager
- `css/common-modals/appearance-modal.css` - Styles
- `js/common-modals/appearance-modal.js` - Alternative (optional)

### ✅ Modified Files
- `js/common-modals/settings-manager.js` - Removed appearance code

### 📝 Documentation Files
- `APPEARANCE_MODAL_MIGRATION_GUIDE.md` - Full migration guide
- `APPEARANCE_REFACTOR_SUMMARY.md` - Refactor details
- `APPEARANCE_QUICK_START.md` - This file

---

## 🎯 What You Get

### Theme Options
- ☀️ Light mode
- 🌙 Dark mode
- 💻 System (auto-detect)

### Customization
- 📝 Font size (12-20px)
- 📐 Display density (compact/comfortable/spacious)
- 🎨 Accent colors (8 colors)
- ✨ Animation toggles
- 📱 Sidebar position (left/right)

### Features
- 💾 Auto-saves to localStorage
- 🔄 Persists across page loads
- 🎭 System theme detection
- ♿ Accessibility support

---

## 🧪 Test It

```bash
# Start dev server
python dev-server.py

# Visit test page
http://localhost:8081/test-appearance-modal.html

# Or visit profile page
http://localhost:8081/profile-pages/tutor-profile.html
```

---

## 📝 Update These Files

Add `appearance-manager.js` to:

- [ ] `profile-pages/tutor-profile.html`
- [ ] `profile-pages/student-profile.html`
- [ ] `profile-pages/parent-profile.html`
- [ ] `profile-pages/advertiser-profile.html`

---

## 🔧 API Functions

All functions available globally:

```javascript
openAppearanceModal()              // Open modal
closeAppearanceModal()             // Close modal
setThemePreference('dark')         // Set theme
setDisplayDensity('compact')       // Set density
setAccentColor('blue')             // Set accent color
setSidebarPosition('right')        // Set sidebar
previewFontSize(18)                // Preview font size
saveAppearanceSettings()           // Save all settings
resetAppearanceDefaults()          // Reset to defaults
```

---

## ❓ Troubleshooting

### Modal doesn't open?
```html
<!-- Make sure script is loaded -->
<script src="js/common-modals/appearance-manager.js"></script>
```

### Settings don't save?
```javascript
// Check localStorage is enabled
console.log(localStorage.getItem('appearance_settings'));
```

### Functions not defined?
```javascript
// Check script loaded
console.log(typeof openAppearanceModal); // Should be "function"
```

---

## 🎓 Examples

### Full Profile Page Setup
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <link rel="stylesheet" href="../css/root/theme.css">
    <link rel="stylesheet" href="../css/common-modals/appearance-modal.css">
</head>
<body>
    <!-- Settings button -->
    <div class="settings-panel">
        <button onclick="openAppearanceModal()">
            🎨 Appearance
        </button>
    </div>

    <!-- Scripts in order -->
    <script src="../js/common-modals/appearance-manager.js"></script>
    <script src="../js/common-modals/settings-manager.js"></script>
</body>
</html>
```

### Standalone Integration
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <link rel="stylesheet" href="css/common-modals/appearance-modal.css">
</head>
<body>
    <button onclick="openAppearanceModal()">Settings</button>
    <script src="js/common-modals/appearance-manager.js"></script>
</body>
</html>
```

---

## ✨ That's It!

You're ready to use the appearance modal. For more details, see:
- `APPEARANCE_MODAL_MIGRATION_GUIDE.md` - Complete migration instructions
- `APPEARANCE_MODAL_GUIDE.md` - Full API documentation
- `APPEARANCE_REFACTOR_SUMMARY.md` - Technical details

---

**Quick Start Version**: 1.0
**Last Updated**: 2026-01-27
**Total Setup Time**: ~5 minutes per page
