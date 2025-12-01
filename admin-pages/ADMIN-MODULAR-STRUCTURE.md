# Admin Pages Modular Structure

## Overview
All admin pages have been refactored to follow a consistent modular structure with shared functionality and individual page-specific modules.

## Directory Structure

```
/js/admin-pages/
├── shared/                    # Shared functionality for all admin pages
│   ├── common.js              # Common utilities and initialization
│   ├── panel-manager.js       # Panel switching functionality
│   ├── sidebar-manager.js     # Sidebar navigation and responsive behavior
│   └── modal-manager.js       # Modal management system
├── manage-tutors.js           # Tutor management specific logic
├── manage-customers.js        # Customer management specific logic
├── manage-schools.js          # School management specific logic
└── manage-courses.js          # Course management specific logic

/css/admin-pages/
├── shared/                    # Shared styles for all admin pages
│   ├── admin-base.css         # Base admin styles (cards, tables, buttons)
│   └── admin-sidebar.css      # Sidebar navigation styles
├── manage-tutors.css          # Tutor management specific styles
├── manage-customers.css       # Customer management specific styles
├── manage-schools.css         # School management specific styles
└── manage-courses.css         # Course management specific styles
```

## Shared Functionality

### 1. Panel Manager (`panel-manager.js`)
- **Single implementation** of `switchPanel()` function for all pages
- Handles panel switching with URL state management
- Emits custom events for panel changes
- Automatically initializes on page load

```javascript
// Usage in HTML (backward compatible)
onclick="switchPanel('dashboard'); return false;"

// Or programmatically
panelManager.switchPanel('verified');
```

### 2. Sidebar Manager (`sidebar-manager.js`)
- Handles hamburger menu toggle
- Responsive sidebar behavior
- Overlay for mobile view
- ESC key to close functionality

### 3. Modal Manager (`modal-manager.js`)
- Centralized modal management
- ESC key and overlay click to close
- Custom events for modal open/close
- Supports multiple modals per page

```javascript
// Usage
modalManager.openModal('settings-modal');
modalManager.closeModal('settings-modal');
```

### 4. Common Utilities (`common.js`)
- Theme toggle functionality
- Notification system
- Toast messages
- Number and date formatting
- Logout functionality

```javascript
// Available utilities
showToast('Success message', 'success');
formatNumber(1234567);  // "1,234,567"
formatDate('2024-01-15');  // "Jan 15, 2024"
```

## Creating a New Admin Page

### Step 1: Copy the Template
```bash
cp admin-page-template.html manage-new-feature.html
```

### Step 2: Create Page-Specific JavaScript
Create `/js/admin-pages/manage-new-feature.js`:

```javascript
import { showToast, formatNumber } from './shared/common.js';

class NewFeatureManager {
    constructor() {
        // Initialize your feature
    }

    async initialize() {
        // Setup event listeners
        // Load initial data
    }

    // Your custom methods
}

const newFeatureManager = new NewFeatureManager();
window.newFeatureManager = newFeatureManager;

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        newFeatureManager.initialize();
    });
} else {
    newFeatureManager.initialize();
}

export { newFeatureManager };
```

### Step 3: Create Page-Specific CSS
Create `/css/admin-pages/manage-new-feature.css`:

```css
/* Import shared styles */
@import './shared/admin-base.css';
@import './shared/admin-sidebar.css';

/* Your page-specific styles */
.feature-specific-class {
    /* styles */
}
```

### Step 4: Update HTML File
1. Update the title and logo text
2. Configure sidebar links for your panels
3. Add your panel content divs
4. Import your page-specific modules

```html
<!-- In the <head> -->
<link rel="stylesheet" href="../css/admin-pages/manage-new-feature.css">

<!-- At the bottom, in the module script -->
<script type="module">
    import { initializeAdminPage } from '../js/admin-pages/shared/common.js';
    import '../js/admin-pages/shared/panel-manager.js';
    import '../js/admin-pages/shared/sidebar-manager.js';
    import '../js/admin-pages/shared/modal-manager.js';
    import '../js/admin-pages/manage-new-feature.js';
</script>
```

## Common UI Components

### Stat Cards
```html
<div class="stat-card">
    <div class="stat-label">Total Items</div>
    <div class="stat-value">1,234</div>
    <div class="stat-change positive">
        <i class="fas fa-arrow-up"></i> 12%
    </div>
</div>
```

### Admin Tables
```html
<table class="admin-table">
    <thead>
        <tr>
            <th>Column</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>Data</td>
        </tr>
    </tbody>
</table>
```

### Badges
```html
<span class="admin-badge badge-active">Active</span>
<span class="admin-badge badge-pending">Pending</span>
<span class="admin-badge badge-verified">Verified</span>
```

### Buttons
```html
<button class="btn-admin btn-admin-primary">Primary</button>
<button class="btn-admin btn-admin-secondary">Secondary</button>
<button class="btn-admin btn-admin-success">Approve</button>
<button class="btn-admin btn-admin-danger">Reject</button>
```

## Migration Guide

To migrate existing admin pages to the modular structure:

1. **Extract inline scripts** to `/js/admin-pages/[page-name].js`
2. **Extract inline styles** to `/css/admin-pages/[page-name].css`
3. **Remove duplicate `switchPanel()` functions** - use shared implementation
4. **Update script imports** to use ES6 modules
5. **Test panel switching** and sidebar functionality
6. **Verify theme toggle** works correctly

## Benefits

1. **No Duplication**: Single implementation of common functionality
2. **Consistent Behavior**: All admin pages work the same way
3. **Easy Maintenance**: Update shared functionality in one place
4. **Scalable**: Easy to add new admin pages using the template
5. **Modern Architecture**: ES6 modules with proper separation of concerns
6. **Backward Compatible**: onclick attributes still work for easy migration

## Testing Checklist

- [ ] Panel switching works correctly
- [ ] URL updates when switching panels
- [ ] Sidebar opens/closes on mobile
- [ ] Theme toggle persists across pages
- [ ] Modals open and close properly
- [ ] ESC key closes modals and sidebar
- [ ] Page-specific functionality works
- [ ] No console errors
- [ ] Responsive design works on all screen sizes