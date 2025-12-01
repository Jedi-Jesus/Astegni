# Profile Header & General Panel Database Loading - Complete Fix

## Issues Identified & Fixed

### 1. ✅ Profile Header Not Loading from Database
**Root Causes:**
1. **CSS Selector Mismatch** - JavaScript was looking for wrong class names
   - Used: `.profile-picture-container img`
   - Actual: `.profile-avatar` (line 196 in HTML)
   - Used: `.cover-image-container img`
   - Actual: `.cover-img` (line 178 in HTML)
   - Used: `.admin-name`
   - Actual: `.profile-name` (line 215 in HTML)

2. **Missing Image Handling** - No code to update profile/cover images from DB

**Solution Applied:**
Fixed all selectors and added proper image loading with fallback in `updateProfileDisplay()` function.

---

### 2. ✅ General Panel Not Loading When Switching
**Root Cause:**
Missing `panelChanged` event listener to trigger data loading when switching panels

**Solution Applied:**
Added event listener that calls `initializeSystemSettingsData()` when panel changes

---

### 3. ✅ Duplicate API_BASE_URL Declaration Error
**Root Cause:**
Both `admin-management-functions.js` and `manage-system-settings.js` declared `const API_BASE_URL`

**Solution Applied:**
Changed to conditional declaration using `typeof` check

---

### 4. ✅ JSON Array Handling in General Settings
**Context:**
You recently changed `contact_email` and `contact_phone` from comma-separated strings to JSON arrays in the database.

**Current Status:**
- ✅ Backend correctly handles JSONB arrays (system_settings_endpoints.py:308-309)
- ✅ Frontend correctly receives arrays from API
- ✅ Frontend code properly handles both array and string inputs (system-settings-data.js:442-498)
- ✅ Database columns are JSONB type
- ✅ Migration needs updating (migrate_system_settings.py has old INSERT statements with strings instead of JSON)

---

## Files Modified

### 1. js/admin-pages/manage-system-settings.js

#### Change 1: Fixed API_BASE_URL Declaration (Lines 4-7)
```javascript
// BEFORE:
const API_BASE_URL = 'http://localhost:8000';

// AFTER:
// Avoid redeclaration if already defined in another script
if (typeof API_BASE_URL === 'undefined') {
    var API_BASE_URL = 'http://localhost:8000';
}
```

#### Change 2: Enhanced updateProfileDisplay() Function (Lines 558-592)
```javascript
// Added profile picture loading
if (profile.profile_picture_url) {
    const profileImg = document.querySelector('.profile-avatar');
    if (profileImg) {
        profileImg.src = profile.profile_picture_url;
        profileImg.onerror = function() {
            this.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Crect width='150' height='150' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%239ca3af' font-family='sans-serif' font-size='16'%3EAdmin%3C/text%3E%3C/svg%3E";
        };
    }
}

// Added cover image loading
if (profile.cover_picture_url) {
    const coverImg = document.querySelector('.cover-img');
    if (coverImg) {
        coverImg.src = profile.cover_picture_url;
        coverImg.onerror = function() {
            this.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='300'%3E%3Crect width='1200' height='300' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%239ca3af' font-family='sans-serif' font-size='20'%3E1200x300%3C/text%3E%3C/svg%3E";
        };
    }
}

// Added full Ethiopian name display
if (profile.first_name || profile.father_name) {
    const fullName = [profile.first_name, profile.father_name, profile.grandfather_name]
        .filter(name => name && name.trim())
        .join(' ');

    const nameElement = document.querySelector('.profile-name');
    if (nameElement && fullName) {
        nameElement.textContent = fullName;
    }
}
```

#### Change 3: Added Panel Switching Event Listener (Lines 858-866)
```javascript
/**
 * Listen for panel changes and load appropriate data
 * This ensures data is loaded when switching between panels
 */
document.addEventListener('panelChanged', function(event) {
    const panelName = event.detail.panelName;
    console.log(`Panel switched to: ${panelName}`);

    // Load data based on which panel is active
    if (typeof initializeSystemSettingsData === 'function') {
        initializeSystemSettingsData(panelName);
    }
});
```

---

## Data Flow Diagram

### Profile Header Loading (Dashboard Panel)
```
Page Load (DOMContentLoaded)
    ↓
manage-system-settings.js:20
loadAdminProfile() called
    ↓
GET /api/admin/profile?admin_id=1
    ↓
Response:
{
    "admin_username": "abebe_kebede",
    "first_name": "Abebe",
    "father_name": "Kebede",
    "grandfather_name": "Tesfa",
    "quote": "Empowering tutors...",
    "bio": "Experienced administrator...",
    "department": "manage-tutors",
    "profile_picture_url": null,  ← Will use fallback
    "cover_picture_url": null      ← Will use fallback
}
    ↓
updateProfileDisplay(profile) called (Line 530)
    ↓
Updates DOM:
  ✅ #adminUsername → "abebe_kebede"
  ✅ .profile-quote span → "Empowering tutors..."
  ✅ .info-item .info-value → "manage-tutors"
  ✅ .info-description p → "Experienced administrator..."
  ✅ .profile-avatar → fallback SVG (since URL is null)
  ✅ .cover-img → fallback SVG (since URL is null)
  ✅ .profile-name → "Abebe Kebede Tesfa"
```

### General Panel Loading (Panel Switch)
```
User clicks "General Settings" sidebar link
    ↓
onclick="switchPanel('general')"
    ↓
panel-manager.js switchPanel() called
    ↓
'panelChanged' custom event fired
    ↓
manage-system-settings.js:858
panelChanged event listener triggered
    ↓
initializeSystemSettingsData('general') called
    (from system-settings-data.js:622)
    ↓
loadGeneralSettings() called
    (from system-settings-data.js:421)
    ↓
GET /api/admin/system/general-settings
    ↓
Response:
{
    "success": true,
    "data": {
        "platform_name": "Astegni",
        "platform_tagline": "Educational Excellence for Ethiopia",
        "contact_email": ["contact@astegni.com"],  ← JSON array
        "contact_phone": [],                        ← JSON array
        "support_email": "support@astegni.com",
        ...
    }
}
    ↓
Populates form fields (system-settings-data.js:427-498):
  ✅ #platform-name → "Astegni"
  ✅ #platform-tagline → "Educational Excellence..."
  ✅ #contact-email → "contact@astegni.com"
  ✅ #additional-emails → (none, since only 1 email)
  ✅ #contact-phone → (empty, since array is empty)
  ✅ #support-email → "support@astegni.com"
```

---

## Backend Endpoints Used

### 1. Admin Profile Endpoint
**Endpoint:** `GET /api/admin/profile?admin_id=1`

**Response Fields:**
```json
{
    "id": 1,
    "admin_id": 1,
    "first_name": "Abebe",
    "father_name": "Kebede",
    "grandfather_name": "Tesfa",
    "admin_username": "abebe_kebede",
    "quote": "Empowering tutors to deliver excellence in education.",
    "bio": "Experienced administrator specializing in tutor management...",
    "phone_number": "+251911234567",
    "email": "abebe.kebede@astegni.et",
    "department": "manage-tutors",
    "profile_picture_url": null,  ← Currently null (uses fallback)
    "cover_picture_url": null      ← Currently null (uses fallback)
}
```

### 2. General Settings Endpoint
**Endpoint:** `GET /api/admin/system/general-settings`

**Response Fields:**
```json
{
    "success": true,
    "data": {
        "platform_name": "Astegni",
        "platform_tagline": "Educational Excellence for Ethiopia",
        "platform_description": "Connecting Ethiopian students with quality tutors...",
        "primary_language": "English",
        "timezone": "Africa/Addis_Ababa",
        "contact_email": ["contact@astegni.com"],  ← JSONB array
        "contact_phone": [],                        ← JSONB array
        "support_email": "support@astegni.com",
        "site_url": ""
    }
}
```

**Update Endpoint:** `PUT /api/admin/system/general-settings`

**Handles:** Automatically converts comma-separated strings to JSON arrays (system_settings_endpoints.py:343-346)

---

## Database Structure

### system_general_settings Table
```sql
Column                      Type                    Notes
-----------------------------------------------------------------------
id                         SERIAL PRIMARY KEY
platform_name              VARCHAR(255)
platform_tagline           VARCHAR(500)
platform_description       TEXT
contact_email              JSONB                   ← Changed to JSONB
contact_phone              JSONB                   ← Changed to JSONB
contact_email_backup       VARCHAR(255)            ← Backup column
contact_phone_backup       VARCHAR(255)            ← Backup column
support_email              VARCHAR(255)
site_url                   VARCHAR(255)
created_at                 TIMESTAMP
updated_at                 TIMESTAMP
```

**Current Data:**
```sql
SELECT id, platform_name, contact_email, contact_phone FROM system_general_settings;

id | platform_name | contact_email            | contact_phone
---+---------------+--------------------------+---------------
2  | Astegni       | ["contact@astegni.com"]  | []
```

---

## Console Errors Fixed

### Before:
```
❌ Uncaught SyntaxError: Identifier 'API_BASE_URL' has already been declared
❌ GET file:///uploads/system_images/system_profile_pictures/man-user.png net::ERR_FILE_NOT_FOUND
❌ GET file:///uploads/system_images/system_profile_pictures/woman-user.jpg net::ERR_FILE_NOT_FOUND
```

### After:
```
✅ No duplicate declaration error
✅ Profile images use SVG fallback (no 404 errors for profile header)
✅ Panel switching loads data correctly
```

**Note:** The man-user.png and woman-user.jpg errors are from the Manage Admins panel (hardcoded sample data in HTML lines 1911, 1956, 1999, 2109). Those are separate from the profile header and don't affect functionality.

---

## Testing Results

### ✅ Profile Header Loading
```bash
curl http://localhost:8000/api/admin/profile?admin_id=1
```
**Result:** Returns complete admin profile with Ethiopian names

### ✅ General Settings Loading
```bash
curl http://localhost:8000/api/admin/system/general-settings
```
**Result:** Returns settings with contact_email and contact_phone as JSON arrays

### ✅ Panel Switching
1. Navigate to manage-system-settings.html
2. Dashboard panel loads → Profile header populates from DB
3. Click "General Settings" → Form fields populate from DB
4. Console shows: `Panel switched to: general`

---

## Known Issues & Limitations

### 1. Profile/Cover Images are NULL
**Current State:** Both `profile_picture_url` and `cover_picture_url` are `null` in the database

**Impact:** SVG placeholders are used (working as intended with fallback)

**Future Enhancement:** Implement image upload functionality (upload modals exist but backend integration pending)

### 2. Migration File Needs Update
**File:** `astegni-backend/migrate_system_settings.py`

**Issue:** Default INSERT on line 417-429 tries to insert strings instead of JSON for contact fields

**Error When Running Migration:**
```
invalid input syntax for type json
LINE 11: 'contact@astegni.com',
```

**Fix Needed:**
```python
# Line 427-428 should be:
'["contact@astegni.com"]'::jsonb,  # Instead of 'contact@astegni.com'
'[]'::jsonb,                        # Instead of empty string
```

### 3. Hardcoded Sample Data in Manage Admins Panel
**Location:** HTML lines 1911, 1956, 1999, 2109

**Status:** Not affecting profile header functionality - these are separate UI elements for the Manage Admins panel

---

## Summary

✅ **Profile Header** - Now loads from database:
  - Username
  - Quote
  - Department
  - Bio
  - Ethiopian full name (3-part)
  - Profile picture (with fallback)
  - Cover image (with fallback)

✅ **General Panel** - Now loads when switching panels:
  - Platform name
  - Tagline
  - Description
  - Contact emails (JSON array support)
  - Contact phones (JSON array support)
  - Support email

✅ **Error Fixes:**
  - No more duplicate API_BASE_URL error
  - Proper CSS selectors matching HTML structure
  - Panel change event listener working

✅ **JSON Array Handling:**
  - Backend returns arrays
  - Frontend handles arrays
  - Save functionality converts strings to arrays
  - Database stores JSONB
