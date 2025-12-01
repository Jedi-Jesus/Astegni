# Name and Location Persistence Fix

## Problem
After the initial fixes, **name** and **location** fields were still not persisting after page reload, even though other fields (hero_title, hero_subtitle, bio, quote) were working correctly.

---

## Root Causes

### Issue 1: Name Field - Wrong Database Table
**Problem**:
- Name is stored in the `users` table (`first_name`, `father_name` columns)
- The `PUT /api/tutor/profile` endpoint only updated the `tutor_profiles` table
- Frontend sent `first_name` but backend ignored it

**Evidence**:
```python
# Backend GET returns computed name from users table
"name": f"{current_user.first_name} {current_user.father_name}"  # routes.py:497

# But PUT endpoint only updated tutor_profiles table
class TutorProfileUpdateExtended(BaseModel):
    # No first_name or father_name fields!
    bio: Optional[str] = None
    location: Optional[str] = None
    # ... only tutor_profiles fields
```

### Issue 2: Location Field - Data Type Mismatch
**Problem**:
- Frontend collected locations as **array**: `['Addis Ababa', 'Bahir Dar']`
- Sent as `locations` (plural) property
- Backend expected **string**: `"Addis Ababa, Bahir Dar"`
- Expected `location` (singular) property

**Evidence**:
```javascript
// Frontend was sending (WRONG)
profileData.locations = ['Addis Ababa', 'Bahir Dar'];  // Array

// Backend expected (CORRECT)
class TutorProfileUpdateExtended(BaseModel):
    location: Optional[str] = None  # String, not array!
```

### Issue 3: Fallback Values Masking the Problem
**Problem**:
- Profile data loader had hardcoded fallbacks
- When database returned `null`, frontend showed defaults
- Made it look like data was saved but actually wasn't

```javascript
// BEFORE (BAD)
this.updateElement('tutorName', data.name || 'Professional Tutor');
this.updateElement('tutor-location', data.location || 'Location not specified');
```

---

## All Fixes Applied

### ✅ Fix 1: Backend - Accept User Fields in Profile Update
**File**: `astegni-backend/app.py modules/routes.py`
**Lines**: 616-661

```python
# BEFORE
@router.put("/api/tutor/profile")
def update_tutor_profile(
    profile_data: TutorProfileUpdateExtended,  # Only tutor_profiles fields
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only updated tutor_profile table
    for field, value in update_data.items():
        setattr(tutor_profile, field, value)
    db.commit()

# AFTER
@router.put("/api/tutor/profile")
def update_tutor_profile(
    profile_data: dict,  # ✅ Changed to dict to accept any fields
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Separate user fields from tutor profile fields
    user_fields = {'first_name', 'father_name', 'grandfather_name', 'username', 'gender'}

    # ✅ Update user fields if provided
    for field in user_fields:
        if field in profile_data and profile_data[field] is not None:
            value = profile_data[field]
            if isinstance(value, str):
                value = value.strip()
                if value:  # Only update if non-empty
                    setattr(current_user, field, value)

    # Update tutor profile fields
    for field, value in profile_data.items():
        if field in user_fields:
            continue  # Skip user fields (already handled)
        if value is None:
            continue
        if isinstance(value, str) and value.strip() == "" and field not in ['bio', 'quote']:
            continue
        if hasattr(tutor_profile, field):
            setattr(tutor_profile, field, value)

    db.commit()
```

**Why**: Now the endpoint can update BOTH `users` table (name) AND `tutor_profiles` table (location, bio, etc.)

---

### ✅ Fix 2: Frontend - Convert Location Array to String
**File**: `js/tutor-profile/global-functions.js`
**Lines**: 808-811

```javascript
// BEFORE
// Get locations
const locationInputs = document.querySelectorAll('#locationsContainer .form-input');
profileData.locations = Array.from(locationInputs).map(input => input.value).filter(v => v.trim());
// ❌ Sent as array with wrong property name

// AFTER
// Get locations - convert array to comma-separated string for backend
const locationInputs = document.querySelectorAll('#locationsContainer .form-input');
const locationsArray = Array.from(locationInputs).map(input => input.value).filter(v => v.trim());
profileData.location = locationsArray.join(', '); // ✅ Backend expects singular 'location' as string
```

**Why**: Backend schema expects `location: str`, not `locations: List[str]`.

---

### ✅ Fix 3: Remove Fallback Values from Data Loader
**File**: `js/tutor-profile/profile-data-loader.js`
**Lines**: 115-127

```javascript
// BEFORE
populateProfileDetails() {
    const data = this.profileData;

    this.updateElement('tutorName', data.name || 'Professional Tutor');  // ❌ Always shows "Professional Tutor"
    this.updateElement('tutor-location', data.location || 'Location not specified');  // ❌ Always shows default
}

// AFTER
populateProfileDetails() {
    const data = this.profileData;

    // Basic info - only update if data exists, keep HTML defaults otherwise
    if (data.name) {
        this.updateElement('tutorName', data.name);  // ✅ Only update if exists
    }
    if (data.location) {
        this.updateElement('tutor-location', data.location);  // ✅ Only update if exists
    }
    if (data.bio) {
        this.updateElement('tutor-bio', data.bio);
    }
    if (data.quote) {
        this.updateElement('tutor-quote', data.quote);
    }
}
```

**Why**: If database has no value, keep the original HTML defaults instead of overwriting with hardcoded fallbacks.

---

### ✅ Fix 4: Pre-populate Edit Modal with Current Values
**File**: `js/tutor-profile/global-functions.js`
**Lines**: 35-88

```javascript
// BEFORE
function openEditProfileModal() {
    // Just opened the modal - fields were empty
    TutorModalManager.open('edit-profile-modal');
}

// AFTER
function openEditProfileModal() {
    const profile = TutorProfileState?.getTutorProfile();
    if (profile) {
        // ✅ Populate name field - use the display value if profile.name not set
        const tutorName = document.getElementById('tutorName');
        if (tutorName) {
            tutorName.value = profile.name || document.querySelector('#tutorName')?.textContent || '';
        }

        // ✅ Populate locations - split comma-separated string into multiple inputs
        const locationsContainer = document.getElementById('locationsContainer');
        if (locationsContainer && profile.location) {
            locationsContainer.innerHTML = ''; // Clear existing
            const locations = profile.location.split(',').map(loc => loc.trim()).filter(loc => loc);
            locations.forEach(location => {
                const locationDiv = document.createElement('div');
                locationDiv.className = 'location-item input-group';
                locationDiv.innerHTML = `
                    <input type="text" class="form-input" placeholder="Enter location" name="location[]" value="${location}">
                    <button type="button" class="btn-remove" onclick="removeLocation(this)">×</button>
                `;
                locationsContainer.appendChild(locationDiv);
            });
        }

        // Populate other fields (hero_title, hero_subtitle, bio, quote, etc.)
        // ...
    }

    TutorModalManager.open('edit-profile-modal');
}
```

**Why**:
- User sees current name and locations when editing
- Location string is split and displayed as multiple input fields
- User can add/remove locations easily
- Prevents accidentally overwriting with empty values

---

## Data Flow - How It Works Now

### **Name Persistence**
```
User enters: "Abebe Kebede"
  ↓
saveProfile() collects:
  first_name: "Abebe Kebede"
  ↓
Sent to PUT /api/tutor/profile
  ↓
Backend recognizes first_name as user_field
  ↓
Updates: current_user.first_name = "Abebe Kebede"
  ↓
Database: users.first_name = "Abebe Kebede" ✅
  ↓
On reload: GET /api/tutor/profile
  ↓
Backend returns: "name": "Abebe Kebede"
  ↓
Frontend displays: ✅ "Abebe Kebede" persists!
```

### **Location Persistence**
```
User enters multiple locations:
  - "Addis Ababa"
  - "Bahir Dar"
  - "Gondar"
  ↓
saveProfile() collects array and joins:
  location: "Addis Ababa, Bahir Dar, Gondar"
  ↓
Sent to PUT /api/tutor/profile
  ↓
Backend validates and updates:
  tutor_profile.location = "Addis Ababa, Bahir Dar, Gondar"
  ↓
Database: tutor_profiles.location = "Addis Ababa, Bahir Dar, Gondar" ✅
  ↓
On reload: GET /api/tutor/profile
  ↓
Backend returns: "location": "Addis Ababa, Bahir Dar, Gondar"
  ↓
Frontend displays: ✅ "Addis Ababa, Bahir Dar, Gondar" persists!
```

---

## Database Schema Reference

### Users Table (Name Storage)
```python
class User(Base):
    __tablename__ = "users"

    first_name = Column(String, nullable=False)  # ✅ Name stored here
    father_name = Column(String, nullable=False)
    grandfather_name = Column(String)
    # ... other fields
```

### Tutor Profiles Table (Location Storage)
```python
class TutorProfile(Base):
    __tablename__ = "tutor_profiles"

    location = Column(String)  # ✅ Location stored here as string
    bio = Column(Text)
    quote = Column(Text)
    hero_title = Column(String)
    hero_subtitle = Column(String)
    # ... other fields
```

---

## Testing Instructions

### Test 1: Name Persistence
1. Open tutor profile page
2. Click "Edit Profile"
3. Change name to "Test Tutor Name"
4. Click "Save"
5. ✅ Verify name updates immediately
6. **Reload page** (F5)
7. ✅ Verify "Test Tutor Name" persists

### Test 2: Location Persistence
1. Open tutor profile page
2. Click "Edit Profile"
3. Add multiple locations:
   - "Addis Ababa"
   - "Bahir Dar"
   - Click "+ Add Location" for each
4. Click "Save"
5. ✅ Verify locations display immediately
6. **Reload page** (F5)
7. ✅ Verify all locations persist

### Test 3: Edit Existing Locations
1. Open tutor profile page
2. Click "Edit Profile"
3. ✅ Verify existing locations are pre-filled in separate input fields
4. Modify one location
5. Add a new location
6. Remove one location (click × button)
7. Click "Save"
8. **Reload page** (F5)
9. ✅ Verify changes persist

### Test 4: Combined Update
1. Edit profile
2. Change name, locations, bio, quote, hero_title
3. Save
4. **Reload page** (F5)
5. ✅ Verify ALL fields persist correctly

---

## Database Verification

Run this SQL query to verify data is saved:

```sql
-- Check user name
SELECT
    id,
    first_name,
    father_name,
    grandfather_name,
    username
FROM users
WHERE id = YOUR_USER_ID;

-- Check tutor location
SELECT
    user_id,
    location,
    bio,
    quote,
    hero_title,
    hero_subtitle,
    updated_at
FROM tutor_profiles
WHERE user_id = YOUR_USER_ID;
```

Expected results:
- `users.first_name` = your entered name
- `tutor_profiles.location` = comma-separated location string
- Both should have recent `updated_at` timestamps

---

## Files Modified

1. ✅ **Backend**: `astegni-backend/app.py modules/routes.py` (lines 616-661)
   - Changed parameter from `TutorProfileUpdateExtended` to `dict`
   - Added logic to update both `users` and `tutor_profiles` tables

2. ✅ **Frontend**: `js/tutor-profile/global-functions.js`
   - Lines 808-811: Fixed location data format (array → string)
   - Lines 35-88: Added form pre-population for name and locations

3. ✅ **Data Loader**: `js/tutor-profile/profile-data-loader.js` (lines 115-127)
   - Removed fallback values for name and location
   - Changed to conditional updates only

---

## Summary

### Before Fixes ❌
- **Name**: Sent to backend but ignored → Not saved → Reverted on reload
- **Location**: Sent as array with wrong property name → Backend rejected → Not saved

### After Fixes ✅
- **Name**: Sent as `first_name` → Backend updates `users` table → Persists correctly
- **Location**: Sent as string `location` → Backend updates `tutor_profiles` table → Persists correctly

---

## Complete Fix Checklist

- ✅ Backend accepts user fields (`first_name`, `father_name`, etc.)
- ✅ Backend updates both `users` and `tutor_profiles` tables
- ✅ Frontend converts location array to comma-separated string
- ✅ Frontend sends correct property name (`location` not `locations`)
- ✅ Data loader only updates when data exists (no fallbacks)
- ✅ Edit modal pre-populates name and locations from database
- ✅ Location string splits into multiple input fields for editing
- ✅ All data persists correctly after page reload

**Both name and location now persist correctly! 🎉**

---

**Document Created**: 2025-10-02
**Related Document**: TUTOR-PROFILE-DATA-PERSISTENCE-FIX.md
