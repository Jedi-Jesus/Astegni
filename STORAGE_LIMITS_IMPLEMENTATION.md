# Storage Limits Implementation

## Overview
Implemented subscription-based storage quota system that validates file uploads against user's subscription tier limits.

## Features Implemented

### 1. Database Schema
**New Table: `user_storage_usage`**
- Tracks storage consumption per user across all media types
- Fields:
  - `images_size`, `videos_size`, `documents_size`, `audios_size` (bytes)
  - `total_size` (bytes) - sum of all media types
  - `images_count`, `videos_count`, `documents_count`, `audios_count`
  - `last_calculated_at`, `updated_at` - timestamps

**Migration Script:**
- File: `migrate_create_user_storage_usage.py`
- Run: `python migrate_create_user_storage_usage.py`

### 2. Backend Services

**StorageService (`storage_service.py`)**
Centralized service for storage validation and tracking:

- `get_user_subscription_limits(db, user_id)` - Get limits from subscription plan
- `get_user_storage_usage(db, user_id)` - Get current usage
- `validate_file_upload(db, user_id, file_size_bytes, file_type)` - Validate before upload
- `update_storage_usage(db, user_id, file_size_bytes, file_type, operation)` - Track uploads/deletions
- `get_storage_summary(db, user_id)` - Comprehensive usage + limits summary

**Subscription Tiers (from system_media_settings table)**
```
Free Tier:
- Max file size: 5MB images, 50MB videos
- Total storage: 5GB
- Image storage: 2.5GB
- Video storage: 2.5GB

Basic Tier:
- Max file size: 10MB images, 100MB videos
- Total storage: 20GB
- Image storage: 10GB
- Video storage: 10GB

Premium Tier:
- Max file size: 20MB images, 200MB videos
- Total storage: 100GB
- Image storage: 50GB
- Video storage: 50GB
```

### 3. API Endpoints (`storage_endpoints.py`)

**GET /api/storage/usage**
- Returns comprehensive storage usage for current user
- Response includes:
  - Usage by type (images, videos, documents, audios)
  - File counts
  - Limits from subscription
  - Usage percentage
  - Remaining storage

**POST /api/storage/validate**
- Query params: `file_size_mb`, `file_type`
- Validates file before upload
- Returns: `is_allowed`, `error_message`, `remaining_storage`

**GET /api/storage/limits**
- Returns storage limits for current user's subscription tier

**GET /api/storage/breakdown**
- Detailed breakdown by media type
- Useful for charts/graphs

### 4. Upload Endpoint Integration

**Modified Endpoints:**
1. `POST /api/upload/story` - Story uploads
2. `POST /api/upload/profile-picture` - Profile pictures
3. `POST /api/upload/cover-image` - Cover images

**Changes Made:**
- Added `StorageService.validate_file_upload()` check before upload
- Added `StorageService.update_storage_usage()` after successful upload
- Returns HTTP 400 with detailed error message if quota exceeded

**Example Error Messages:**
- "File size (75.2 MB) exceeds maximum allowed size (50 MB) for videos"
- "Storage limit exceeded. You've used 4.8 GB of 5 GB. Upgrade your subscription for more storage."
- "Video storage limit exceeded. You've used 2.6 GB of 2.5 GB for videos."

### 5. Frontend Integration

**StorageManager (`js/root/storage-manager.js`)**
JavaScript module for client-side storage validation:

**Methods:**
- `getStorageUsage()` - Fetch user's storage usage
- `validateFileUpload(fileSizeMB, fileType)` - Validate before upload
- `getStorageLimits()` - Get subscription limits
- `getStorageBreakdown()` - Get detailed breakdown
- `validateFile(file, fileType)` - Client-side validation wrapper
- `showStorageIndicator(containerId)` - Display storage usage widget
- `formatBytes(bytes)` - Utility for formatting file sizes

**Upload Modal Integration (`global-functions.js`)**
- Updated `handleStorySelect()` to async function
- Adds storage validation before file preview
- Shows error notification if quota exceeded
- Logs remaining storage in console
- Prevents upload if validation fails

### 6. User Experience

**Before Upload (Client-Side):**
1. User selects file
2. StorageManager validates file size and quota
3. If validation fails → show error notification, reset file input
4. If validation passes → show file preview, allow upload

**During Upload (Server-Side):**
1. Backend validates file against subscription limits
2. Checks both individual file size limit and total storage quota
3. If validation fails → HTTP 400 error with detailed message
4. If validation passes → upload file, update storage usage

**After Upload:**
- Storage usage automatically tracked in `user_storage_usage` table
- Next upload will check against updated usage

## Usage Examples

### Backend (Python)
```python
from storage_service import StorageService

# Validate before upload
is_allowed, error_message = StorageService.validate_file_upload(
    db=db,
    user_id=current_user.id,
    file_size_bytes=file_size,
    file_type='image'  # or 'video', 'document', 'audio'
)

if not is_allowed:
    raise HTTPException(status_code=400, detail=error_message)

# After successful upload
StorageService.update_storage_usage(
    db=db,
    user_id=current_user.id,
    file_size_bytes=file_size,
    file_type='image',
    operation='add'  # or 'remove' for deletion
)

# Get storage summary
summary = StorageService.get_storage_summary(db, user_id)
print(f"Used: {summary['usage_percentage']}%")
print(f"Remaining: {summary['remaining_bytes']} bytes")
```

### Frontend (JavaScript)
```javascript
// Validate file before upload
const validation = await StorageManager.validateFile(file, 'image');

if (!validation.isAllowed) {
    alert(validation.message);
    return;
}

// Show storage usage indicator
await StorageManager.showStorageIndicator('storage-container');

// Get detailed breakdown
const breakdown = await StorageManager.getStorageBreakdown();
console.log('Images:', breakdown.breakdown.images.size_mb, 'MB');
console.log('Videos:', breakdown.breakdown.videos.size_mb, 'MB');
```

## Testing

### Setup
1. Run migration: `python migrate_create_user_storage_usage.py`
2. Ensure `system_media_settings` table has subscription tier limits
3. Assign subscription plan to test user in `users.subscription_plan_id`
4. Include `storage-manager.js` in frontend pages

### Test Cases
1. **Free tier user uploads 6MB image** → Should fail (exceeds 5MB limit)
2. **User at 90% storage quota uploads large file** → Should fail with quota message
3. **User with Premium tier uploads 15MB image** → Should succeed
4. **Upload story, then check storage usage API** → Should show updated usage
5. **Frontend validation before upload** → Should show error before hitting backend

### Manual Testing
```bash
# Backend
cd astegni-backend
python migrate_create_user_storage_usage.py
python app.py

# Test endpoints
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/storage/usage
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" "http://localhost:8000/api/storage/validate?file_size_mb=10&file_type=image"

# Frontend
# Open browser console
await StorageManager.getStorageUsage()
await StorageManager.validateFile(fileObject, 'image')
```

## File Locations

### Backend
- `astegni-backend/storage_service.py` - Storage validation service
- `astegni-backend/storage_endpoints.py` - API endpoints
- `astegni-backend/migrate_create_user_storage_usage.py` - Database migration
- `astegni-backend/app.py modules/models.py` - UserStorageUsage model (added)
- `astegni-backend/app.py modules/routes.py` - Updated upload endpoints (lines 2888-3133)
- `astegni-backend/app.py` - Registered storage_endpoints router (line 491-493)

### Frontend
- `js/root/storage-manager.js` - Storage manager module
- `js/tutor-profile/global-functions.js` - Updated handleStorySelect (line 4749)

## Database Tables Involved

1. **user_storage_usage** (new) - Tracks storage per user
2. **system_media_settings** (existing) - Defines limits per subscription tier
3. **subscription_plans** (existing) - Subscription plan definitions
4. **users** (existing) - Links user to subscription plan via `subscription_plan_id`

## Future Enhancements

1. **Background Jobs**
   - Periodic storage recalculation (verify actual files vs tracked usage)
   - Cleanup expired stories storage tracking
   - Send email notifications at 80% and 95% storage usage

2. **Admin Features**
   - Dashboard to view storage usage across all users
   - Manual storage quota adjustments
   - Storage usage reports and analytics

3. **User Features**
   - Storage management page showing breakdown by media type
   - Visual charts of storage usage
   - File manager to delete old files
   - Upgrade subscription prompt when approaching limit

4. **Optimization**
   - Cache storage usage in Redis for faster validation
   - Batch storage updates instead of per-file
   - Compress images/videos automatically to save space

## Notes

- Storage tracking uses bytes internally for precision
- Frontend receives MB/GB for display
- Failed uploads do NOT update storage usage
- Deleted files should call `update_storage_usage()` with `operation='remove'`
- Default limits apply if user has no subscription plan
- System fails open - if validation service unavailable, upload proceeds

## Troubleshooting

**Issue:** Storage validation always fails
- Check if user has `subscription_plan_id` set in `users` table
- Verify `system_media_settings` has record for that subscription plan
- Check `user_storage_usage` table exists and has record for user

**Issue:** Frontend validation not working
- Ensure `storage-manager.js` is loaded before upload modal scripts
- Check browser console for errors
- Verify API token is valid in localStorage

**Issue:** Storage usage not updating
- Check if `StorageService.update_storage_usage()` is called after successful upload
- Verify database connection and permissions
- Check `user_storage_usage` table has trigger for `updated_at`

## Migration Commands
```bash
# Create user_storage_usage table
python migrate_create_user_storage_usage.py

# Verify table created
# Connect to database and run:
# SELECT * FROM user_storage_usage LIMIT 10;

# Restart backend
python app.py
```

## API Response Examples

### GET /api/storage/usage
```json
{
  "success": true,
  "usage": {
    "images_size": 52428800,
    "videos_size": 104857600,
    "documents_size": 0,
    "audios_size": 0,
    "total_size": 157286400,
    "images_count": 25,
    "videos_count": 3,
    "documents_count": 0,
    "audios_count": 0
  },
  "limits": {
    "max_image_size_mb": 5,
    "max_video_size_mb": 50,
    "max_document_size_mb": 10,
    "max_audio_size_mb": 10,
    "storage_limit_gb": 5,
    "max_image_storage_mb": 2560,
    "max_video_storage_mb": 2560,
    "subscription_plan": 1
  },
  "summary": {
    "total_used_mb": 150.0,
    "total_used_gb": 0.15,
    "storage_limit_gb": 5,
    "usage_percentage": 2.93,
    "remaining_mb": 4974.0,
    "remaining_gb": 4.85,
    "can_upload": true
  },
  "subscription_plan": 1
}
```

### POST /api/storage/validate (failed)
```json
{
  "success": true,
  "is_allowed": false,
  "error_message": "Storage limit exceeded. You've used 4.85 GB of 5 GB. Upgrade your subscription for more storage.",
  "remaining_storage_bytes": 157286400,
  "remaining_storage_mb": 150.0,
  "usage_percentage": 97.07
}
```

## Success! ✅
The subscription-based storage limit system is now fully implemented and integrated into the upload flow.
