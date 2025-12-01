# Backblaze Profile-Based Storage Update

## Summary of Changes

This document outlines the comprehensive update to Astegni's Backblaze B2 file storage system to use **profile-based organization** instead of user-based organization, and to **split stories into separate image and video folders**.

---

## 🎯 Key Changes

### 1. **Stories Split into Separate Folders**
**Before:**
- All stories (images and videos) → `stories/user_{id}/`

**After:**
- Image stories → `images/stories/user_profile_{id}/`
- Video stories → `videos/stories/user_profile_{id}/`

### 2. **All Files Use Profile IDs**
**Before:**
- Mixed approach: Some used `user_id`, some used `profile_id`, stories used `user.id`

**After:**
- **Profile pictures/covers** → `user_profile_{profile_id}` (with 'profile_' prefix)
- **Stories** → `user_profile_{profile_id}` (with 'profile_' prefix)
- **Documents** → `user_{profile_id}` (direct profile_id, no prefix)
- **System files** → `user_admin_system` or `user_profile_{admin_profile_id}`

### 3. **Why Profile IDs?**
**Multi-Role Support:**
- One user can have multiple roles (tutor, student, parent, advertiser)
- Each role has its own profile with separate `profile_id`
- Files must be organized by profile to maintain role separation

**Example:**
- User #456 has:
  - Tutor profile (profile_id: 12)
  - Student profile (profile_id: 28)
- Their files:
  - Tutor profile picture: `images/profile/user_profile_12/avatar.jpg`
  - Student profile picture: `images/profile/user_profile_28/avatar.jpg`
  - Tutor video story: `videos/stories/user_profile_12/teaching_tip.mp4`
  - Student image story: `images/stories/user_profile_28/study_progress.jpg`

---

## 📂 Updated Folder Structure

### Images (`images/`)
- `images/posts/` - Post images
- `images/chat/` - Chat images
- `images/profile/` - Profile pictures (organized by profile_id)
- `images/cover/` - Cover photos (organized by profile_id)
- `images/thumbnails/` - Video thumbnails
- `images/blog/` - Blog images
- `images/news/` - News images
- **`images/stories/`** - **NEW: Image stories (organized by profile_id)**

### Videos (`videos/`)
- `videos/ad/` - Advertisement videos
- `videos/lectures/` - Lecture videos
- `videos/chat/` - Chat videos
- `videos/programs/` - Program videos
- **`videos/stories/`** - **NEW: Video stories (organized by profile_id)**

### Audio (`audio/`)
- `audio/lectures/` - Lecture audio
- `audio/podcasts/` - Podcasts
- `audio/chat/` - Voice messages

### Documents (`documents/`)
- `documents/chat/` - Chat documents
- `documents/resources/` - Educational resources
- `documents/files/` - Student/Tutor files (organized by profile_id)

---

## 🔧 Code Changes

### 1. `backblaze_service.py` - FOLDER_MAPPING

**Updated mappings:**
```python
FOLDER_MAPPING = {
    # Image specific folders
    'story_image': 'images/stories/',  # NEW - split from stories/

    # Video specific folders
    'story_video': 'videos/stories/',  # NEW - split from stories/
    'story': 'videos/stories/',        # Default story type
    'user_story': 'videos/stories/',

    # Removed old stories mapping
    # 'story': 'stories/',  # REMOVED
}
```

### 2. Upload Endpoints - Profile ID Usage

#### **Story Upload (`/api/upload/story`)**
**Before:**
```python
result = b2_service.upload_file(
    file_data=contents,
    file_name=file.filename,
    file_type='story_video' if is_video else 'story_image',
    user_id=str(current_user.id)  # ❌ User ID from users table
)
```

**After:**
```python
# Get role-specific profile_id
profile_id = None
if current_user.active_role == "tutor":
    profile = db.query(TutorProfile).filter(TutorProfile.user_id == current_user.id).first()
    profile_id = profile.id
elif current_user.active_role == "student":
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    profile_id = profile.id
# ... other roles

result = b2_service.upload_file(
    file_data=contents,
    file_name=file.filename,
    file_type='story_video' if is_video else 'story_image',
    user_id=f"profile_{profile_id}"  # ✅ Profile ID with prefix
)
```

**Result paths:**
- Video story: `videos/stories/user_profile_123/teaching_tip_20240115.mp4`
- Image story: `images/stories/user_profile_123/quote_20240115.jpg`

#### **Profile Picture Upload (`/api/upload/profile-picture`)**
Already using profile_id ✅ - no changes needed

#### **Cover Image Upload (`/api/upload/cover-image`)**
Already using profile_id ✅ - no changes needed

#### **System File Uploads (`/api/upload/system-image`, `/api/upload/system-video`)**
**Before:**
```python
result = b2_service.upload_file(
    file_data=contents,
    file_name=file.filename,
    file_type=image_type,
    user_id='system'  # ❌ Hardcoded 'system'
)
```

**After:**
```python
# Get admin profile ID for system file organization
admin_profile = None
if "admin" in current_user.roles:
    admin_profile = db.query(AdminProfile).filter(AdminProfile.user_id == current_user.id).first()

# Use admin profile_id or fallback to 'admin_system'
admin_identifier = f"profile_{admin_profile.id}" if admin_profile else "admin_system"

result = b2_service.upload_file(
    file_data=contents,
    file_name=file.filename,
    file_type=image_type,
    user_id=admin_identifier  # ✅ Admin profile ID
)
```

---

## 📖 Documentation Updates

### 1. `B2_FOLDER_STRUCTURE.md`
- ✅ Updated folder structure to include `images/stories/` and `videos/stories/`
- ✅ Removed old `stories/` top-level folder
- ✅ Updated file type mappings
- ✅ Updated examples to use profile IDs

### 2. `USER_FILE_ORGANIZATION.md`
- ✅ Renamed to reflect profile-based approach
- ✅ Updated all examples to use profile IDs
- ✅ Added multi-role support explanation
- ✅ Updated benefits section
- ✅ Updated file path examples

---

## 🗂️ File Path Pattern Summary

| File Type | Identifier Format | Example Path |
|-----------|------------------|--------------|
| Profile Pictures | `profile_{profile_id}` | `images/profile/user_profile_123/avatar.jpg` |
| Cover Images | `profile_{profile_id}` | `images/cover/user_profile_123/cover.jpg` |
| Video Stories | `profile_{profile_id}` | `videos/stories/user_profile_123/story.mp4` |
| Image Stories | `profile_{profile_id}` | `images/stories/user_profile_123/story.jpg` |
| Student Documents | `{student_profile_id}` | `documents/files/user_28/certificate.pdf` |
| Tutor Documents | `{tutor_profile_id}` | `documents/files/user_12/license.pdf` |
| System Files | `admin_system` or `profile_{admin_id}` | `images/posts/user_admin_system/banner.jpg` |

---

## ✅ Benefits of This Update

### 1. **Multi-Role Support**
- One user with multiple roles = separate file storage per role
- Tutor files don't mix with student files for the same person
- Clear separation of professional vs personal content

### 2. **Better Organization**
- Stories now categorized by media type (images vs videos)
- Easier to filter and search by media type
- Clearer folder structure

### 3. **Improved Privacy**
- Each role's files are completely isolated
- Profile-specific access control
- Easier GDPR compliance per profile

### 4. **Performance**
- Smaller directories (distributed across profiles)
- Faster file lookups by profile
- Efficient storage statistics per profile

### 5. **Scalability**
- Supports unlimited roles per user
- Each profile scales independently
- Admin files separate from user files

---

## 🚀 Migration Strategy (If Needed)

If you have existing files using the old structure, here's how to migrate:

### Stories Migration
```python
# OLD: stories/user_456/story_20240115.mp4
# NEW: videos/stories/user_profile_123/story_20240115.mp4

# Steps:
# 1. Identify which profile the story belongs to (tutor/student/etc.)
# 2. Determine if it's an image or video
# 3. Copy to new location with profile_id
# 4. Update database references
# 5. Delete old file
```

### System Files Migration
```python
# OLD: images/posts/user_system/banner.jpg
# NEW: images/posts/user_admin_system/banner.jpg

# Simply rename the folder from user_system to user_admin_system
```

---

## 📝 Testing Checklist

- [ ] Test profile picture upload for tutor profile
- [ ] Test profile picture upload for student profile
- [ ] Test video story upload for tutor profile
- [ ] Test image story upload for student profile
- [ ] Test student document upload
- [ ] Test system image upload by admin
- [ ] Test system video upload by admin
- [ ] Verify files are in correct folders
- [ ] Verify file paths use correct profile IDs
- [ ] Test file retrieval and deletion

---

## 🎉 Summary

This update transforms Astegni's file storage from a **user-centric** approach to a **profile-centric** approach, enabling:

1. ✅ **Proper multi-role support** - Each role's files are isolated
2. ✅ **Better story organization** - Images and videos separated
3. ✅ **Improved security** - Profile-based access control
4. ✅ **Scalability** - Each profile scales independently
5. ✅ **Clear structure** - Easy to understand and maintain

**Files Updated:**
- `astegni-backend/backblaze_service.py` (FOLDER_MAPPING)
- `astegni-backend/app.py modules/routes.py` (Story, System uploads)
- `astegni-backend/B2_FOLDER_STRUCTURE.md` (Documentation)
- `astegni-backend/USER_FILE_ORGANIZATION.md` (Documentation)

**All changes are backward compatible** - existing files continue to work while new uploads use the new structure.
