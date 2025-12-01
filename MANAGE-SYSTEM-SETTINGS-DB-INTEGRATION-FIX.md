# Manage System Settings - Database Integration Fix

## Issues Fixed

### 1. ✅ Panel Switching Not Loading Data
**Problem:** When switching from one panel to another (e.g., Dashboard → General Settings), the data wasn't being loaded from the database.

**Root Cause:** Missing `panelChanged` event listener

**Solution:** Added event listener at the end of `js/admin-pages/manage-system-settings.js`:

```javascript
document.addEventListener('panelChanged', function(event) {
    const panelName = event.detail.panelName;
    console.log(`Panel switched to: ${panelName}`);

    // Load data based on which panel is active
    if (typeof initializeSystemSettingsData === 'function') {
        initializeSystemSettingsData(panelName);
    }
});
```

**File Modified:** `js/admin-pages/manage-system-settings.js:858-866`

---

### 2. ✅ Profile Header Not Loading Images from Database
**Problem:** Profile picture and cover image were showing hardcoded placeholder images instead of loading from the database

**Root Cause:** The `updateProfileDisplay()` function wasn't handling `profile_picture_url` and `cover_picture_url` from the API response

**Solution:** Enhanced `updateProfileDisplay()` function to handle images with fallback:

```javascript
// Update profile picture if available
if (profile.profile_picture_url) {
    const profileImg = document.querySelector('.profile-picture-container img');
    if (profileImg) {
        profileImg.src = profile.profile_picture_url;
        profileImg.onerror = function() {
            // Fallback to default if image fails to load
            this.src = 'https://via.placeholder.com/120?text=Admin';
        };
    }
}

// Update cover image if available
if (profile.cover_picture_url) {
    const coverImg = document.querySelector('.cover-image-container img');
    if (coverImg) {
        coverImg.src = profile.cover_picture_url;
        coverImg.onerror = function() {
            // Fallback to placeholder if image fails to load
            this.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='300'%3E%3Crect width='1200' height='300' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%239ca3af' font-family='sans-serif' font-size='20'%3E1200x300%3C/text%3E%3C/svg%3E";
        };
    }
}
```

**File Modified:** `js/admin-pages/manage-system-settings.js:555-577`

---

### 3. ✅ Ethiopian Name Display
**Enhancement:** Added support for displaying full Ethiopian names (First + Father + Grandfather names)

```javascript
// Update full name display (Ethiopian naming convention)
if (profile.first_name || profile.father_name) {
    const fullName = [profile.first_name, profile.father_name, profile.grandfather_name]
        .filter(name => name && name.trim())
        .join(' ');

    const nameElement = document.querySelector('.admin-name');
    if (nameElement && fullName) {
        nameElement.textContent = fullName;
    }
}
```

**File Modified:** `js/admin-pages/manage-system-settings.js:579-589`

---

### 4. ✅ Duplicate API_BASE_URL Declaration Error
**Problem:** Console error: `Uncaught SyntaxError: Identifier 'API_BASE_URL' has already been declared`

**Root Cause:** Both `admin-management-functions.js` and `manage-system-settings.js` were declaring `const API_BASE_URL`

**Solution:** Changed to conditional declaration to avoid redeclaration:

```javascript
// Avoid redeclaration if already defined in another script
if (typeof API_BASE_URL === 'undefined') {
    var API_BASE_URL = 'http://localhost:8000';
}
```

**File Modified:** `js/admin-pages/manage-system-settings.js:4-7`

---

## Data Flow

### Profile Header (Dashboard Panel)
```
Page Load
    ↓
loadAdminProfile() called (line 20)
    ↓
GET /api/admin/profile?admin_id=1
    ↓
updateProfileDisplay(profile)
    ↓
Updates:
  - Username (#adminUsername)
  - Quote (.profile-quote span)
  - Department (.info-item .info-value)
  - Bio (.info-description p)
  - Profile Picture (.profile-picture-container img)
  - Cover Image (.cover-image-container img)
  - Full Name (.admin-name)
```

### General Settings Panel
```
User clicks "General Settings"
    ↓
switchPanel('general') called
    ↓
'panelChanged' event fired
    ↓
initializeSystemSettingsData('general') called
    ↓
loadGeneralSettings() called (system-settings-data.js:421)
    ↓
GET /api/admin/system/general-settings
    ↓
Populates form fields with DB data:
  - Platform Name
  - Site URL
  - Platform Tagline
  - Platform Description
  - Contact Emails (multiple)
  - Contact Phones (multiple)
  - Support Email
```

---

## Backend API Endpoints Used

### Admin Profile
- **Endpoint:** `GET /api/admin/profile?admin_id=1`
- **Response Fields:**
  - `admin_username`
  - `quote`
  - `department`
  - `bio`
  - `profile_picture_url` ← Now handled
  - `cover_picture_url` ← Now handled
  - `first_name` ← Now handled
  - `father_name` ← Now handled
  - `grandfather_name` ← Now handled

### General Settings
- **Endpoint:** `GET /api/admin/system/general-settings`
- **Response Fields:**
  - `platform_name`
  - `site_url`
  - `platform_tagline`
  - `platform_description`
  - `contact_email` (JSON array)
  - `contact_phone` (JSON array)
  - `support_email`

---

## Testing Checklist

### Profile Header Loading
- [ ] Navigate to manage-system-settings.html
- [ ] Check console for `GET /api/admin/profile?admin_id=1` request
- [ ] Verify admin username displays from DB
- [ ] Verify quote displays from DB
- [ ] Verify department displays from DB
- [ ] Verify bio displays from DB
- [ ] Verify profile picture loads from DB (or shows placeholder)
- [ ] Verify cover image loads from DB (or shows placeholder)
- [ ] Verify full Ethiopian name displays

### Panel Switching
- [ ] Start on Dashboard panel
- [ ] Click "General Settings" in sidebar
- [ ] Check console for `Panel switched to: general` message
- [ ] Check console for `GET /api/admin/system/general-settings` request
- [ ] Verify form fields populate with DB data
- [ ] Verify multiple contact emails load correctly
- [ ] Verify multiple contact phones load correctly

### Error Handling
- [ ] No console errors about duplicate `API_BASE_URL`
- [ ] Profile images show fallback if URL is invalid
- [ ] General settings show default values if API fails

---

## Files Modified

1. **js/admin-pages/manage-system-settings.js**
   - Line 4-7: Fixed duplicate API_BASE_URL declaration
   - Line 555-589: Enhanced updateProfileDisplay() for images and names
   - Line 858-866: Added panelChanged event listener

---

## Notes

- Image fallback ensures graceful degradation if images fail to load
- Ethiopian naming convention properly supported (3-part names)
- All data now loads dynamically from database
- Panel switching properly triggers data loading
- Compatible with existing `system-settings-data.js` module
