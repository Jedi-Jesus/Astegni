# Profile ID Upload Fix - Complete ✅

## Issue
Cover and profile image uploads were using `user_id` instead of `profile_id` when saving to Backblaze B2.

## Problem
Since one user can have multiple profiles (tutor, student, parent, advertiser), using `user_id` meant all profiles for the same user would share the same folder in Backblaze:
- ❌ `images/profile/user_123/avatar.jpg` (shared by all profiles)
- ❌ `images/cover/user_123/cover.jpg` (shared by all profiles)

This caused issues when a user had multiple roles with different profile pictures.

## Solution
Now using `profile_id` with a `profile_` prefix to ensure each profile has its own folder:
- ✅ `images/profile/profile_85/avatar.jpg` (tutor profile 85)
- ✅ `images/profile/profile_28/avatar.jpg` (student profile 28)
- ✅ `images/cover/profile_85/cover.jpg` (tutor profile 85)
- ✅ `images/cover/profile_28/cover.jpg` (student profile 28)

## Changes Made

### Backend Updates
**File**: `astegni-backend/app.py modules/routes.py`

#### 1. Profile Picture Upload (`/api/upload/profile-picture`)
**Lines 1104-1150**

**Before**:
```python
b2_service.upload_file(
    file_data=contents,
    file_name=file.filename,
    file_type='profile',
    user_id=str(current_user.id)  # ❌ Using user_id
)
```

**After**:
```python
# Get profile first to extract profile_id
if current_user.active_role == "tutor":
    profile = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Tutor profile not found")
    profile_id = profile.id
# ... similar for student, parent, advertiser

b2_service.upload_file(
    file_data=contents,
    file_name=file.filename,
    file_type='profile',
    user_id=f"profile_{profile_id}"  # ✅ Using profile_id with prefix
)

# Update profile directly
profile.profile_picture = result['url']
```

#### 2. Cover Image Upload (`/api/upload/cover-image`)
**Lines 1175-1223**

**Before**:
```python
b2_service.upload_file(
    file_data=contents,
    file_name=file.filename,
    file_type='cover',
    user_id=str(current_user.id)  # ❌ Using user_id
)
```

**After**:
```python
# Get profile first to extract profile_id
# ... (same logic as profile picture)

b2_service.upload_file(
    file_data=contents,
    file_name=file.filename,
    file_type='cover',
    user_id=f"profile_{profile_id}"  # ✅ Using profile_id with prefix
)

# Update profile directly
profile.cover_image = result['url']
```

## Key Improvements

### 1. Profile Separation
Each profile gets its own Backblaze folder:
- User 115 as tutor (profile_id: 85) → `images/profile/profile_85/`
- User 115 as student (profile_id: 28) → `images/profile/profile_28/`

### 2. Error Handling
Added proper validation:
```python
if not profile:
    raise HTTPException(status_code=404, detail="Tutor profile not found")
```

### 3. Cleaner Code
Instead of repeating `if tutor: tutor.profile_picture = ...` for each role, now:
```python
profile.profile_picture = result['url']  # Works for any role
```

### 4. Backward Compatibility
Still updates `current_user.profile_picture` for any legacy code that might rely on it.

## File Structure in Backblaze

**Before** (using user_id):
```
images/
  profile/
    user_115/  ← Same folder for all profiles of user 115
      avatar_20250115_1.jpg
  cover/
    user_115/  ← Same folder for all profiles of user 115
      cover_20250115_1.jpg
```

**After** (using profile_id):
```
images/
  profile/
    profile_85/  ← Tutor profile 85
      avatar_20250115_1.jpg
    profile_28/  ← Student profile 28
      avatar_20250115_2.jpg
  cover/
    profile_85/  ← Tutor profile 85
      cover_20250115_1.jpg
    profile_28/  ← Student profile 28
      cover_20250115_2.jpg
```

## Testing

1. **Login as user with tutor role**
2. **Upload profile picture** → Should save to `profile_85/` (tutor profile_id)
3. **Switch to student role**
4. **Upload profile picture** → Should save to `profile_28/` (student profile_id)
5. **Check Backblaze** → Should see separate folders

## Benefits

✅ **Proper separation** - Each profile has its own folder
✅ **No conflicts** - Tutor and student profiles don't share images
✅ **Scalable** - Works for users with multiple roles
✅ **Clear organization** - Easy to find which profile owns which files
✅ **Profile-based** - Aligns with the multi-role system architecture

## Migration Note

**Existing files** uploaded with `user_id` will remain at their current location. New uploads will use `profile_id`.

If you need to migrate old files:
1. Create a migration script to move files from `user_X/` to `profile_Y/`
2. Update database URLs to point to new locations

## Status
✅ **COMPLETE** - Backend now uses profile_id for all uploads
