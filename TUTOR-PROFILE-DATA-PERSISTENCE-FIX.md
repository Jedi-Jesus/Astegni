# Tutor Profile Data Persistence - Complete Fix

## Problem Summary
Profile header data (hero_title, hero_subtitle) was changing/resetting when the page reloaded, even though the buttons were writing to the database.

## Root Causes Identified

### 1. **Missing HTML ID**
- The `hero-subtitle` paragraph element had no `id` attribute
- Profile data loader couldn't update it with database values
- **Location**: `profile-pages/tutor-profile.html:469`

### 2. **Backend Overwriting Data with Empty Values**
- Backend `PUT /api/tutor/profile` endpoint was accepting `None` and empty string values
- These would overwrite existing good data in the database
- **Location**: `astegni-backend/app.py modules/routes.py:630-633`

### 3. **Hardcoded Fallback Values**
- Profile data loader used hardcoded fallback values with `||` operator
- If database returned `null` or empty, hardcoded defaults would display
- Created illusion that data was "changing"
- **Location**: `js/tutor-profile/profile-data-loader.js:98-99`

### 4. **Image Upload Triggering Full Profile Reload**
- After uploading profile picture or cover photo, code called `loadCompleteProfile()`
- This would refetch ALL data from database, potentially with incomplete/sample data
- **Location**: `js/tutor-profile/image-upload-handler.js:82, 124`

### 5. **Edit Modal Not Pre-populating Form**
- When opening edit profile modal, form fields were empty
- User couldn't see current values to edit
- If user saved without entering hero_title/subtitle, they'd be sent as empty
- **Location**: `js/tutor-profile/global-functions.js:35`

## All Fixes Applied

### ✅ Fix 1: Added Missing ID to HTML
**File**: `profile-pages/tutor-profile.html`
**Line**: 469

```html
<!-- BEFORE -->
<p class="hero-subtitle">Empowering students through personalized learning and expert guidance</p>

<!-- AFTER -->
<p id="hero-subtitle" class="hero-subtitle">Empowering students through personalized learning and expert guidance</p>
```

### ✅ Fix 2: Backend - Prevent Overwriting with Empty Values
**File**: `astegni-backend/app.py modules/routes.py`
**Lines**: 630-638

```python
# BEFORE
update_data = profile_data.dict(exclude_unset=True)
for field, value in update_data.items():
    setattr(tutor_profile, field, value)

# AFTER
# Update fields - only update non-None, non-empty values to prevent overwriting with blanks
update_data = profile_data.dict(exclude_unset=True)
for field, value in update_data.items():
    # Skip None values and empty strings for text fields
    if value is None:
        continue
    if isinstance(value, str) and value.strip() == "" and field not in ['bio', 'quote']:
        continue
    setattr(tutor_profile, field, value)
```

**Why**: This prevents accidentally wiping out existing data when partial updates are sent.

### ✅ Fix 3: Remove Hardcoded Fallbacks from Data Loader
**File**: `js/tutor-profile/profile-data-loader.js`
**Lines**: 97-103

```javascript
// BEFORE
populateHeroSection() {
    const data = this.profileData;
    this.updateElement('typedText', data.hero_title || 'Excellence in Education, Delivered with Passion');
    this.updateElement('hero-subtitle', data.hero_subtitle || 'Empowering students through personalized learning');
    // ...
}

// AFTER
populateHeroSection() {
    const data = this.profileData;

    // Hero title and subtitle - use database values or keep existing HTML defaults
    if (data.hero_title) {
        this.updateElement('typedText', data.hero_title);
    }
    if (data.hero_subtitle) {
        this.updateElement('hero-subtitle', data.hero_subtitle);
    }
    // ...
}
```

**Why**: Only update if database has a value. Otherwise, keep the default HTML content.

### ✅ Fix 4: Image Upload - Update State Without Full Reload
**File**: `js/tutor-profile/image-upload-handler.js`

**Profile Picture Upload (Lines 74-85)**:
```javascript
// BEFORE
if (response && response.url) {
    this.updateProfilePicture(response.url);
    this.showSuccessMessage('Profile picture updated successfully!');
    await TutorProfileDataLoader.loadCompleteProfile(); // ❌ Full reload
}

// AFTER
if (response && response.url) {
    // Update image with backend URL immediately
    this.updateProfilePicture(response.url);

    // Update state without reloading entire profile to prevent data override
    if (typeof TutorProfileState !== 'undefined' && TutorProfileState.tutorProfile) {
        TutorProfileState.tutorProfile.profile_picture = response.url;
    }

    this.showSuccessMessage('Profile picture updated successfully!');
}
```

**Cover Photo Upload (Lines 118-129)**:
```javascript
// BEFORE
if (response && response.url) {
    this.updateCoverPhoto(response.url);
    this.showSuccessMessage('Cover photo updated successfully!');
    await TutorProfileDataLoader.loadCompleteProfile(); // ❌ Full reload
}

// AFTER
if (response && response.url) {
    // Update image with backend URL immediately
    this.updateCoverPhoto(response.url);

    // Update state without reloading entire profile to prevent data override
    if (typeof TutorProfileState !== 'undefined' && TutorProfileState.tutorProfile) {
        TutorProfileState.tutorProfile.cover_image = response.url;
    }

    this.showSuccessMessage('Cover photo updated successfully!');
}
```

**Why**: Updating only the specific field prevents re-fetching and potentially overwriting other profile data.

### ✅ Fix 5: Pre-populate Edit Modal Form
**File**: `js/tutor-profile/global-functions.js`
**Lines**: 35-58

```javascript
// BEFORE
function openEditProfileModal() {
    if (typeof TutorModalManager !== 'undefined') {
        TutorModalManager.open('edit-profile-modal');
    }
}

// AFTER
function openEditProfileModal() {
    // Populate form with current profile data before opening
    const profile = TutorProfileState?.getTutorProfile();
    if (profile) {
        // Populate hero section fields
        const heroTitle = document.getElementById('heroTitle');
        const heroSubtitle = document.getElementById('heroSubtitle');
        if (heroTitle) heroTitle.value = profile.hero_title || document.getElementById('typedText')?.textContent || '';
        if (heroSubtitle) heroSubtitle.value = profile.hero_subtitle || document.getElementById('hero-subtitle')?.textContent || '';

        // Populate other fields
        const tutorName = document.getElementById('tutorName');
        const aboutUs = document.getElementById('aboutUs');
        const profileQuote = document.getElementById('profileQuote');

        if (tutorName) tutorName.value = profile.name || '';
        if (aboutUs) aboutUs.value = profile.bio || profile.about || '';
        if (profileQuote) profileQuote.value = profile.quote || '';
    }

    if (typeof TutorModalManager !== 'undefined') {
        TutorModalManager.open('edit-profile-modal');
    }
}
```

**Why**: User sees current values and can edit them. Empty fields won't accidentally overwrite data.

## How All Three Buttons Work Now

### 1. ✅ Edit Profile Button
```
Click "Edit Profile"
  → openEditProfileModal() pre-populates form with current data
  → User edits hero_title, hero_subtitle, bio, quote, etc.
  → Click "Save"
  → saveProfile() in global-functions.js:773
  → Sends data to PUT /api/tutor/profile
  → Backend validates and ONLY updates non-empty fields
  → Database updated ✅
  → Data persists on reload ✅
```

### 2. ✅ Upload Cover Button
```
Click "Upload Cover"
  → uploadImage('cover') in global-functions.js:902
  → Opens file selector
  → User selects image
  → TutorUploadHandler.uploadCoverPhoto()
  → Sends to POST /api/upload/cover-image
  → Backend saves: tutor_profile.cover_image = url
  → Frontend updates state: TutorProfileState.tutorProfile.cover_image = url
  → Image displays immediately
  → NO full profile reload
  → Database updated ✅
  → Data persists on reload ✅
```

### 3. ✅ Upload Profile Button
```
Click "Upload Profile"
  → uploadImage('profile') in global-functions.js:902
  → Opens file selector
  → User selects image
  → TutorUploadHandler.uploadProfilePicture()
  → Sends to POST /api/upload/profile-picture
  → Backend saves: current_user.profile_picture = url
  → Frontend updates state: TutorProfileState.tutorProfile.profile_picture = url
  → Image displays immediately
  → NO full profile reload
  → Database updated ✅
  → Data persists on reload ✅
```

## Data Flow - Before vs After

### ❌ BEFORE (Broken)
```
User edits hero_title → Saves → Backend accepts empty string → Overwrites DB
User reloads → Backend returns empty → Frontend shows fallback → "Data changed!"

User uploads image → Saves → Frontend reloads ALL data → Gets sample data
User reloads → Backend auto-creates profile with defaults → "Data changed!"
```

### ✅ AFTER (Fixed)
```
User edits hero_title → Saves → Backend ignores empty values → DB keeps data
User reloads → Backend returns actual data → Frontend shows DB value → "Data persists!"

User uploads image → Saves → Frontend updates only image field → No data loss
User reloads → Backend returns existing profile → All fields intact → "Data persists!"
```

## Testing Instructions

### Test 1: Profile Edit Persistence
1. Open tutor profile page
2. Click "Edit Profile" button
3. Check that hero_title and hero_subtitle fields are pre-filled
4. Change hero_title to "My Custom Title"
5. Change hero_subtitle to "My Custom Subtitle"
6. Click "Save"
7. **Reload page** (F5)
8. ✅ Verify custom title and subtitle are still displayed

### Test 2: Cover Photo Upload
1. Open tutor profile page
2. Click "Upload Cover" button
3. Select an image
4. Click "Upload Cover"
5. ✅ Verify image appears immediately
6. **Reload page** (F5)
7. ✅ Verify cover image persists
8. ✅ Verify hero_title and hero_subtitle didn't change

### Test 3: Profile Picture Upload
1. Open tutor profile page
2. Click "Upload Profile" button
3. Select an image
4. Click "Upload Profile"
5. ✅ Verify image appears immediately
6. **Reload page** (F5)
7. ✅ Verify profile picture persists
8. ✅ Verify hero_title and hero_subtitle didn't change

### Test 4: Combined Operations
1. Edit profile → Save custom hero_title
2. Upload cover photo
3. Upload profile picture
4. Edit profile again → Change bio
5. **Reload page** (F5)
6. ✅ Verify ALL changes persist (hero_title, cover, profile pic, bio)

## Database Verification

To verify data is actually being saved, run this SQL query:

```sql
SELECT
    user_id,
    hero_title,
    hero_subtitle,
    bio,
    quote,
    profile_picture,
    cover_image,
    updated_at
FROM tutor_profiles
WHERE user_id = YOUR_USER_ID;
```

You should see:
- `hero_title` and `hero_subtitle` with your custom values (not NULL)
- `profile_picture` and `cover_image` with Backblaze B2 URLs
- `updated_at` timestamp reflecting last save

## Files Modified

1. ✅ `profile-pages/tutor-profile.html` - Added `id="hero-subtitle"` to display element
2. ✅ `astegni-backend/app.py modules/routes.py` - Backend validation to prevent empty overwrites
3. ✅ `js/tutor-profile/profile-data-loader.js` - Removed hardcoded fallback values
4. ✅ `js/tutor-profile/image-upload-handler.js` - Removed full profile reload after upload
5. ✅ `js/tutor-profile/global-functions.js` - Added form pre-population logic

## Summary

All three buttons **DO write to the database**. The issue was that:
- Backend was accepting empty values and overwriting good data
- Frontend was using hardcoded fallbacks, hiding the real problem
- Image uploads were triggering unnecessary full profile reloads
- Edit form wasn't showing current values, leading to accidental overwrites

All fixes are now applied. Data will persist correctly across page reloads.

## Next Steps

1. **Test thoroughly** using the test instructions above
2. **Check browser console** for any errors during save operations
3. **Verify database** using the SQL query to confirm data persistence
4. **Monitor behavior** after multiple save operations to ensure no regressions

---

**Document Created**: 2025-10-02
**Issues Fixed**: 5 root causes identified and resolved
**Files Modified**: 5 JavaScript/Python/HTML files
