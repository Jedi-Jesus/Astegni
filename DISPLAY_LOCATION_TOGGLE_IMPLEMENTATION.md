# Display Location Toggle Implementation

## Overview

Added `display_location` boolean field to allow users to control whether their location is visible on their public profile.

---

## Database Changes

### Migration Script

**File:** `astegni-backend/migrate_add_display_location_to_users.py`

**Column Added:**
- **Table:** `users`
- **Column:** `display_location`
- **Type:** `BOOLEAN`
- **Default:** `TRUE` (location visible by default)

**To Run Migration:**
```bash
cd astegni-backend
python migrate_add_display_location_to_users.py
```

### Model Update

**File:** `astegni-backend/app.py modules/models.py`

**Line 54:** Added `display_location` field to User model:
```python
display_location = Column(Boolean, default=True)  # Show location on public profile
```

---

## UI Changes

### Tutor Profile Edit Modal

**File:** `modals/tutor-profile/edit-profile-modal.html`

**Lines 55-63:** Added display location checkbox
```html
<!-- Display Location Checkbox -->
<div class="flex items-center gap-2 mt-3">
    <input type="checkbox" id="editDisplayLocation"
        class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2">
    <label for="editDisplayLocation" class="text-sm text-gray-700">
        Display location on my public profile
    </label>
</div>
<p class="text-xs text-gray-500 mt-1">When enabled, your location will be visible to others viewing your profile</p>
```

### Student Profile Edit Modal

**File:** `profile-pages/student-profile.html`

**Lines 4955-4962:** Added display location checkbox
```html
<!-- Display Location Checkbox -->
<div style="margin-top: 0.75rem;">
    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.875rem; color: var(--text-secondary); margin: 0;">
        <input type="checkbox" id="edit-display-location" style="width: 16px; height: 16px; cursor: pointer;">
        <span>Display location on my public profile</span>
    </label>
    <small style="color: var(--text-muted); font-size: 0.75rem; display: block; margin-top: 0.25rem;">When enabled, your location will be visible to others viewing your profile</small>
</div>
```

---

## Location Format Improvement

### Geolocation Utilities

**Files:**
- `js/utils/geolocation-utils.js`
- `admin-pages/js/admin-pages/shared/geolocation-utils.js`

**Already Implemented:** The `formatAddress()` function at line 281-312 already includes:
- ✅ **Subcity** (neighborhood/suburb)
- ✅ **City** (city/town/village)
- ✅ **State** (region)
- ✅ **Country**

**Format Order:**
1. Subcity (neighborhood or suburb)
2. City (city, town, village, or county)
3. State (optional, for clarity)
4. Country

**Example Output:**
- `"Bole, Addis Ababa, Addis Ababa Region, Ethiopia"`
- `"Lideta, Addis Ababa, Ethiopia"`
- `"Bahir Dar, Amhara Region, Ethiopia"`

---

## Implementation Status

### ✅ Completed

1. **Database Migration Script** - Created
2. **User Model Update** - Added `display_location` field
3. **Tutor Profile Modal** - Added display_location checkbox
4. **Student Profile Modal** - Added display_location checkbox
5. **Location Format** - Already includes subcity, city, and country

### ⏳ Pending

1. **Parent Profile Modal** - Add display_location checkbox
2. **Advertiser Profile Modal** - Add display_location checkbox
3. **User Profile Modal** - Add display_location checkbox
4. **Profile Data Loaders** - Update to check `display_location` before showing location
5. **API Endpoints** - Update to save/retrieve `display_location` field
6. **Public Profile Views** - Only show location if `display_location === true`

---

## Next Steps

### 1. Add Checkbox to Remaining Profiles

**Parent Profile:** `profile-pages/parent-profile.html` (~line 4777)
**Advertiser Profile:** `profile-pages/advertiser-profile.html` (~line 3084)
**User Profile:** `profile-pages/user-profile.html` (~line 2469)

Add after GPS detection elements:
```html
<!-- Display Location Checkbox -->
<div class="flex items-center gap-2 mt-3">
    <input type="checkbox" id="editDisplayLocation"
        class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2">
    <label for="editDisplayLocation" class="text-sm text-gray-700">
        Display location on my public profile
    </label>
</div>
<p class="text-xs text-gray-500 mt-1">When enabled, your location will be visible to others viewing your profile</p>
```

### 2. Update Profile Data Loaders

**Tutor:** `js/tutor-profile/profile-data-loader.js`
**Student:** `js/student-profile/profile-data-loader.js`
**Parent:** `js/parent-profile/profile-edit-manager.js`
**Advertiser:** `js/advertiser-profile/profile-data-loader.js`
**User:** `js/page-structure/user-profile.js`

**Update location display logic:**
```javascript
// Location - only show if display_location is true
const locationEl = document.getElementById('tutor-location'); // or student-location, etc.
if (data.location && data.display_location !== false) {
    if (locationEl) {
        locationEl.textContent = data.location;
        locationEl.style.color = 'var(--text)';
        locationEl.style.fontStyle = 'normal';
    }
} else {
    if (locationEl) {
        locationEl.textContent = 'Location not shared';
        locationEl.style.color = 'var(--text-muted)';
        locationEl.style.fontStyle = 'italic';
    }
}
```

### 3. Update Profile Edit Managers

**Tutor:** `js/tutor-profile/edit-profile-modal.js`
**Student:** `js/student-profile/profile-edit-manager.js`
**Parent:** `js/parent-profile/parent-profile.js`
**Advertiser:** `js/advertiser-profile/profile-data-loader.js`
**User:** User profile edit manager

**Load display_location value:**
```javascript
// Load display_location checkbox state
const displayLocationCheckbox = document.getElementById('editDisplayLocation');
if (displayLocationCheckbox && data.display_location !== undefined) {
    displayLocationCheckbox.checked = data.display_location;
}
```

**Save display_location value:**
```javascript
// Get display_location checkbox value
const displayLocationCheckbox = document.getElementById('editDisplayLocation');
const displayLocation = displayLocationCheckbox ? displayLocationCheckbox.checked : true;

// Include in update payload
const updateData = {
    location: locationValue,
    display_location: displayLocation,
    // ... other fields
};
```

### 4. Update API Endpoints

**User Profile Endpoints:** `astegni-backend/user_profile_endpoints.py`
**Tutor Profile Endpoints:** `astegni-backend/tutor_profile_endpoints.py` (if any)
**Student Profile Endpoints:** `astegni-backend/student_profile_endpoints.py` (if any)
**Parent Profile Endpoints:** `astegni-backend/parent_endpoints.py` (if any)
**Advertiser Profile Endpoints:** Similar files

**Update profile update endpoints to accept and save `display_location`:**
```python
# In update profile endpoint
if 'display_location' in request_data:
    user.display_location = request_data['display_location']
```

**Update profile retrieval endpoints to include `display_location`:**
```python
# In get profile endpoint
response_data = {
    'location': user.location,
    'display_location': user.display_location,
    # ... other fields
}
```

### 5. Update View Profiles

**View Tutor:** `view-profiles/view-tutor.html` + `js/view-tutor/view-tutor-loader.js`
**View Student:** `view-profiles/view-student.html` + `js/view-student/view-student-loader.js`
**View Parent:** `view-profiles/view-parent.html` + `js/view-parent/view-parent-loader.js`

**Update to only show location if `display_location === true`:**
```javascript
// In view profile loader
if (data.location && data.display_location !== false) {
    locationElement.textContent = data.location;
    locationContainer.style.display = 'flex'; // Show container
} else {
    locationContainer.style.display = 'none'; // Hide container entirely
}
```

---

## Testing Checklist

### Database
- [ ] Run migration successfully
- [ ] Verify `display_location` column exists in `users` table
- [ ] Verify default value is `TRUE`

### UI - Edit Profile Modals
- [ ] Tutor profile: Checkbox appears, saves correctly
- [ ] Student profile: Checkbox appears, saves correctly
- [ ] Parent profile: Checkbox appears, saves correctly
- [ ] Advertiser profile: Checkbox appears, saves correctly
- [ ] User profile: Checkbox appears, saves correctly

### Location Format
- [ ] GPS detection shows: Subcity, City, Country
- [ ] Example: "Bole, Addis Ababa, Ethiopia"
- [ ] Works in all profile types

### Privacy Control
- [ ] When checkbox checked → Location visible on public profile
- [ ] When checkbox unchecked → Location hidden on public profile
- [ ] Default state is checked (visible)

### Public Profile Views
- [ ] View tutor: Respects display_location setting
- [ ] View student: Respects display_location setting
- [ ] View parent: Respects display_location setting
- [ ] Location hidden shows "Location not shared" or hides element entirely

### API
- [ ] Profile update saves display_location value
- [ ] Profile retrieval includes display_location value
- [ ] Default value (TRUE) applied for existing users

---

## Security & Privacy Considerations

1. **Default Visible:** Location is visible by default (`display_location = TRUE`) to maintain current behavior
2. **User Control:** Users can opt-out by unchecking the checkbox
3. **Persistent:** Setting is saved to database and persists across sessions
4. **Respected Everywhere:** Both own profile and public view profiles respect the setting
5. **Clear Labeling:** Checkbox clearly states "Display location on my public profile"

---

## Summary

The `display_location` toggle gives users control over their location privacy. The location format already includes subcity, city, and country. Implementation is ~50% complete - database and UI checkboxes for tutor/student profiles are done. Remaining work includes adding checkboxes to other profiles, updating data loaders to respect the setting, and ensuring API endpoints handle the field properly.

**Key Files Modified:**
1. `astegni-backend/app.py modules/models.py` - Added field to User model
2. `modals/tutor-profile/edit-profile-modal.html` - Added checkbox
3. `profile-pages/student-profile.html` - Added checkbox

**Migration Script Created:**
- `astegni-backend/migrate_add_display_location_to_users.py`

**Location Format:** Already includes subcity, city, state, and country (no changes needed)
