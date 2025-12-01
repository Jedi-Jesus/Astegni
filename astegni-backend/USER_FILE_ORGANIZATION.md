# Profile-Based File Organization Strategy

## Overview
Astegni implements a **profile-based** file organization system that separates files by profile ID (not user ID). This ensures proper multi-role support, privacy, easy management, and scalability.

## File Path Structure

### Pattern
```
{media_type}/{category}/user_{profile_id_or_identifier}/{filename}_{timestamp}.{extension}
```

### Examples
```
images/profile/user_profile_123/avatar_20240115_143022.jpg
images/stories/user_profile_123/story_img_20240115_143022.jpg
videos/stories/user_profile_123/story_vid_20240115_143022.mp4
videos/lectures/user_profile_67/math_lesson_20240115_150530.mp4
documents/files/user_28/achievement_certificate_20240115_160145.pdf
images/posts/user_admin_system/banner_20240115_170230.jpg
```

## Why Profile IDs Instead of User IDs?

**Multi-Role Support:**
- One user can have multiple roles (tutor, student, parent, advertiser)
- Each role has its own profile with separate profile_id
- Files must be organized by profile to maintain role separation

**Example:**
- User #456 has:
  - Tutor profile (profile_id: 12)
  - Student profile (profile_id: 28)
- Their files:
  - Tutor profile picture: `images/profile/user_profile_12/avatar.jpg`
  - Student profile picture: `images/profile/user_profile_28/avatar.jpg`
  - Tutor stories: `videos/stories/user_profile_12/teaching_tip.mp4`
  - Student stories: `videos/stories/user_profile_28/my_day.mp4`

## Implementation

### 1. Uploading Files with Profile ID

```python
from backblaze_service import get_backblaze_service

b2_service = get_backblaze_service()

# Example: Upload a profile picture for tutor profile
def upload_tutor_profile_picture(profile_id, file_data, filename):
    result = b2_service.upload_file(
        file_data=file_data,
        file_name=filename,
        file_type='profile',
        user_id=f"profile_{profile_id}"  # Profile ID with 'profile_' prefix
    )
    return result
# Result: images/profile/user_profile_123/avatar_20240115.jpg

# Example: Upload a video story for student profile
def upload_student_story(profile_id, file_data, filename):
    result = b2_service.upload_file(
        file_data=file_data,
        file_name=filename,
        file_type='story_video',
        user_id=f"profile_{profile_id}"  # Profile ID with 'profile_' prefix
    )
    return result
# Result: videos/stories/user_profile_28/story_20240115.mp4

# Example: Upload student document (uses direct profile_id without prefix)
def upload_student_document(student_profile_id, file_data, filename):
    result = b2_service.upload_file(
        file_data=file_data,
        file_name=filename,
        file_type='files',
        user_id=str(student_profile_id)  # Direct profile ID for documents
    )
    return result
# Result: documents/files/user_28/certificate_20240115.pdf
```

### 2. API Endpoint Implementation

```python
from fastapi import UploadFile, Depends
from app.py.modules.routes import get_current_user

@app.post("/api/upload/profile-picture")
async def upload_profile_picture(
    file: UploadFile,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload profile picture for the authenticated user's active role profile"""
    content = await file.read()

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
        file_data=content,
        file_name=file.filename,
        file_type='profile',
        user_id=f"profile_{profile_id}"  # Use profile ID with prefix
    )

    if result:
        # Save the URL to role-specific profile in database
        profile.profile_picture = result['url']
        db.commit()
        return {
            "success": True,
            "url": result['url'],
            "path": result['fileName']
        }
    return {"success": False, "error": "Upload failed"}

@app.post("/api/upload/chat-file")
async def upload_chat_file(
    file: UploadFile,
    chat_id: int,
    current_user = Depends(get_current_user)
):
    """Upload file in chat conversation"""
    content = await file.read()

    # Determine file type
    ext = file.filename.split('.')[-1].lower()
    if ext in ['jpg', 'png', 'gif']:
        file_type = 'chat_image'
    elif ext in ['mp4', 'avi', 'mov']:
        file_type = 'chat_video'
    elif ext in ['mp3', 'wav', 'ogg']:
        file_type = 'chat_audio'
    else:
        file_type = 'chat_document'

    result = b2_service.upload_file(
        file_data=content,
        file_name=file.filename,
        file_type=file_type,
        user_id=str(current_user.id)
    )

    if result:
        # Save to chat_messages table
        return {
            "success": True,
            "url": result['url'],
            "messageType": file_type
        }
    return {"success": False, "error": "Upload failed"}
```

### 3. Listing User Files

```python
@app.get("/api/my-files")
async def get_my_files(
    file_type: str = None,
    current_user = Depends(get_current_user)
):
    """Get all files for the authenticated user"""
    files = b2_service.list_user_files(
        user_id=str(current_user.id),
        file_type=file_type  # Optional filter
    )
    return {"files": files}

@app.get("/api/my-files/images")
async def get_my_images(current_user = Depends(get_current_user)):
    """Get all images for the user"""
    files = b2_service.list_user_files(
        user_id=str(current_user.id),
        file_type='image'
    )
    return {"images": files}
```

### 4. Deleting User Files

```python
@app.delete("/api/my-files/{file_path:path}")
async def delete_my_file(
    file_path: str,
    current_user = Depends(get_current_user)
):
    """Delete a user's file"""
    success = b2_service.delete_user_file(
        user_id=str(current_user.id),
        file_path=file_path
    )

    if success:
        return {"success": True, "message": "File deleted"}
    return {"success": False, "error": "Could not delete file"}
```

### 5. User Storage Statistics

```python
@app.get("/api/my-storage")
async def get_storage_stats(current_user = Depends(get_current_user)):
    """Get storage statistics for the user"""
    stats = b2_service.get_user_storage_stats(str(current_user.id))

    return {
        "userId": current_user.id,
        "stats": stats
    }

# Response example:
{
    "userId": 12345,
    "stats": {
        "totalFiles": 42,
        "totalSize": 524288000,
        "totalSizeFormatted": "500.00 MB",
        "breakdown": {
            "images": {
                "count": 20,
                "size": 104857600,
                "sizeFormatted": "100.00 MB"
            },
            "videos": {
                "count": 5,
                "size": 367001600,
                "sizeFormatted": "350.00 MB"
            },
            "audio": {
                "count": 10,
                "size": 31457280,
                "sizeFormatted": "30.00 MB"
            },
            "documents": {
                "count": 7,
                "size": 20971520,
                "sizeFormatted": "20.00 MB"
            }
        }
    }
}
```

## Benefits of Profile-Based Separation

### 1. **Privacy & Security**
- Profiles can only access their own files
- File paths include profile ID for verification
- Easy to implement role-based access control
- Each role's files are completely isolated

### 2. **Multi-Role Support**
- One user with multiple roles = separate file storage per role
- Tutor files don't mix with student files for same person
- Clear separation of professional vs personal content
- Stories, profile pictures, documents all role-specific

### 3. **Organization**
- Files are organized by type AND profile
- Easy to find all files for a specific profile
- Clear structure: `type/category/user_profile_id/file`
- Admin files separate from user files

### 4. **Management**
- Simple to delete all profile files when profile is deleted
- Easy storage quota management per profile
- Straightforward backup/restore for specific profiles
- GDPR compliance per profile (not just per user)

### 5. **Performance**
- Faster file listing (filtered by profile)
- Reduced directory size (distributed across profiles)
- Efficient storage statistics calculation per profile

## File Path Examples by Feature

### Profile Management (Profile ID with 'profile_' prefix)
```
images/profile/user_profile_123/avatar_20240115_143022.jpg
images/cover/user_profile_123/cover_photo_20240115_143122.jpg
images/profile/user_profile_28/student_avatar_20240115_143022.jpg
images/cover/user_profile_28/student_cover_20240115_143122.jpg
```

### Stories (Profile ID with 'profile_' prefix - split by media type)
```
# Video stories
videos/stories/user_profile_123/tutor_teaching_tip_20240115_190022.mp4
videos/stories/user_profile_28/student_daily_vlog_20240115_190122.mp4

# Image stories
images/stories/user_profile_123/motivational_quote_20240115_190222.jpg
images/stories/user_profile_28/study_progress_20240115_190322.jpg
```

### Student/Tutor Files (Direct Profile ID - no prefix)
```
documents/files/user_28/achievement_certificate_20240115_170322.pdf
documents/files/user_28/academic_transcript_20240115_170422.pdf
documents/files/user_12/teaching_license_20240115_170522.pdf
```

### System/Admin Files (Admin Profile ID or 'admin_system')
```
images/posts/user_admin_system/hero_banner_20240115_180022.jpg
videos/ad/user_admin_system/promo_video_20240115_180122.mp4
images/thumbnails/user_admin_system/video_thumb_20240115_180222.jpg
```

## Database Integration

Store file references in your database with user association:

```sql
-- Example files table
CREATE TABLE user_files (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    file_type VARCHAR(50),
    file_path TEXT,
    file_url TEXT,
    file_size BIGINT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

-- Example query to get user's files
SELECT * FROM user_files
WHERE user_id = 12345
AND file_type = 'profile'
ORDER BY uploaded_at DESC;
```

## Migration Strategy

For existing files without user separation:

1. **Identify file owner** from database records
2. **Create new path** with user ID
3. **Copy file** to new location
4. **Update database** with new path
5. **Delete old file** after verification

```python
def migrate_file_to_user_structure(old_path, user_id):
    # Download existing file
    file_data = b2_service.download_file(old_path)

    # Extract filename and determine type
    filename = old_path.split('/')[-1]
    file_type = determine_file_type(old_path)

    # Upload with user ID
    result = b2_service.upload_file(
        file_data=file_data,
        file_name=filename,
        file_type=file_type,
        user_id=str(user_id)
    )

    if result:
        # Delete old file
        b2_service.delete_file(old_path)
        return result['fileName']

    return None
```

## Best Practices

1. **Always include user_id** when uploading files
2. **Validate user ownership** before allowing file operations
3. **Use consistent user ID format** (string recommended)
4. **Implement storage quotas** per user if needed
5. **Regular cleanup** of orphaned files
6. **Monitor storage usage** by user
7. **Backup strategy** should consider user separation

## Security Considerations

1. **Never expose direct file paths** in URLs
2. **Always verify user authentication** before file operations
3. **Implement rate limiting** for uploads
4. **Validate file types** before upload
5. **Scan for malware** if handling public uploads
6. **Use signed URLs** for temporary access
7. **Log all file operations** for audit trail