# System Media Upload Integration - Complete Implementation

## 🎯 Overview

A comprehensive system media upload solution that allows admins to upload images and videos to Backblaze B2 with proper categorization, targeting, and database tracking.

## ✅ What Has Been Implemented

### 1. **Database Model** (`SystemMedia`)
Located in: `astegni-backend/app.py modules/models.py`

```python
class SystemMedia(Base):
    __tablename__ = "system_media"

    # Key fields:
    - media_type: 'image' or 'video'
    - file_type: Image types or 'ad'/'alert' for videos
    - classification: For ads (tutorial, course, success-story, etc.)
    - targets: JSON array of target pages
    - file_url: Main file URL from Backblaze
    - thumbnail_url: For videos
    - uploaded_by: Admin user ID
```

### 2. **Backend Endpoints**
Located in: `astegni-backend/app.py modules/routes.py`

#### Image Upload
```
POST /api/upload/system-image
Headers: Authorization: Bearer <token>
Form Data:
  - file: Image file
  - image_type: 'profile' | 'cover' | 'logo' | 'favicon' | 'system'
  - target: Target entity
  - title: Optional title

Response:
  {
    "success": true,
    "media_id": 123,
    "url": "https://...",
    "details": {...}
  }
```

#### Video Upload
```
POST /api/upload/system-video
Headers: Authorization: Bearer <token>
Form Data:
  - file: Video file
  - thumbnail: Thumbnail image
  - video_type: 'ad' | 'alert'
  - targets: JSON string array of targets
  - title: Video title
  - description: Optional description
  - classification: Required for ads

Response:
  {
    "success": true,
    "media_id": 123,
    "video_url": "https://...",
    "thumbnail_url": "https://...",
    "targets": [...],
    "details": {...}
  }
```

#### Get System Media
```
GET /api/system-media
Headers: Authorization: Bearer <token>
Query Params:
  - media_type: 'image' | 'video' (optional)
  - file_type: Specific type (optional)
  - target: Filter by target (optional)

Response:
  {
    "success": true,
    "count": 10,
    "media": [...]
  }
```

### 3. **Frontend Modals**
Located in: `admin-pages/manage-system-settings.html`

#### Image Upload Modal
- **Image Type Selection**: profile, cover, logo, favicon, system
- **Dynamic Target Options**: Based on image type
  - Profile/Cover: All user profiles + admin managers
  - Logo/Favicon: Platform-specific options
  - System: Categories like banners, backgrounds, icons
- **Live Preview**: Shows image before upload
- **Title Field**: Optional custom title

#### Video Upload Modal
- **Video Type**: Advertisement or Alert
- **Ad Classification** (for ads only):
  - Tutorial
  - Course
  - Success Story
  - Tips & Tricks
  - Entertainment
  - News
- **Multiple Target Selection**: Checkboxes for:
  - 🏠 Homepage
  - User Profiles (tutor, student, parent, user, advertiser)
  - Admin Managers (campaign, course, school, etc.)
- **Required Thumbnail**: 1280x720px recommended
- **Upload Progress**: Real-time progress bar
- **Video Preview**: Shows video before upload

### 4. **JavaScript Integration**
Located in: `js/admin-pages/manage-system-settings.js`

Features:
- ✅ JWT authentication from localStorage
- ✅ Real API calls to backend
- ✅ Upload progress tracking (XMLHttpRequest for videos)
- ✅ Error handling with user-friendly messages
- ✅ Form validation
- ✅ Button state management (disable during upload)
- ✅ Modal reset on close

### 5. **Backblaze B2 Integration**

All uploads use `user_id='system'` for organization:

```
Structure in B2:
/images/profile/user_system/admin-logo_20250107_123456.png
/images/cover/user_system/default-cover_20250107_123456.jpg
/videos/ad/user_system/tutorial-math_20250107_123456.mp4
/images/thumbnails/user_system/tutorial-math-thumb_20250107_123456.jpg
```

Key Points:
- All system media uses `user_id='system'`
- Files are timestamped to prevent conflicts
- Supports file types configured in `backblaze_service.py`
- Thumbnail and video stored separately

## 🚀 Setup Instructions

### 1. Run Database Migration

```bash
cd astegni-backend
python migrate_system_media.py
```

This will:
- Create the `system_media` table
- Show table structure
- Verify successful creation

### 2. Restart Backend Server

```bash
cd astegni-backend
python app.py
```

The new endpoints will be available at:
- `http://localhost:8000/api/upload/system-image`
- `http://localhost:8000/api/upload/system-video`
- `http://localhost:8000/api/system-media`

### 3. Access Admin Panel

```
http://localhost:8080/admin-pages/manage-system-settings.html
```

Navigate to **Media Management** panel and use the upload buttons.

## 📋 Testing Checklist

### Image Upload
- [ ] Upload logo (test with PNG/SVG)
- [ ] Upload favicon (test size limit: 1MB)
- [ ] Upload profile picture for different targets
- [ ] Upload cover image for different targets
- [ ] Upload system image (banner/background)
- [ ] Verify preview works
- [ ] Check authentication (try without login)
- [ ] Verify files appear in Backblaze under `user_system/`

### Video Upload
- [ ] Upload advertisement with classification
- [ ] Upload alert without classification
- [ ] Test multiple target selection
- [ ] Upload with thumbnail
- [ ] Verify progress bar works
- [ ] Test large video (near 200MB limit)
- [ ] Check both files uploaded to B2
- [ ] Verify video preview works

### API Testing
- [ ] Test `/api/system-media` endpoint
- [ ] Filter by media_type
- [ ] Filter by file_type
- [ ] Filter by target
- [ ] Verify admin-only access (403 for non-admins)

## 🔐 Security Features

1. **Admin-Only Access**: Only users with `admin` or `super_admin` role can upload
2. **JWT Authentication**: Required for all upload endpoints
3. **File Size Limits**:
   - Favicon: 1MB
   - Logo: 5MB
   - Images: 10MB
   - Thumbnails: 5MB
   - Videos: 200MB
4. **File Type Validation**: Content-type checking
5. **Input Validation**: All fields validated before upload

## 📁 File Structure

```
astegni-backend/
├── app.py modules/
│   ├── models.py          # SystemMedia model added
│   └── routes.py          # Upload endpoints added (lines 1287-1526)
├── backblaze_service.py   # Uses user_id='system'
└── migrate_system_media.py # Migration script

admin-pages/
└── manage-system-settings.html  # Upload modals added (lines 1549-1735)

js/admin-pages/
└── manage-system-settings.js    # Real API integration (lines 201-495)
```

## 🎨 Target Options Reference

### For Images (Profile/Cover):
**User Profiles**: tutor, student, parent, user, advertiser
**Admin Managers**: campaign, course, school, tutor-manager, customer, upload, system

### For Images (Logo/Favicon):
**Platform**: main-logo, admin-logo, email-logo, main-favicon, admin-favicon

### For Images (System):
**Categories**: banner, background, placeholder, icon, illustration

### For Videos:
**All Targets**: homepage + all user profiles + all admin managers

## 🔍 Database Queries

### Get All System Videos
```sql
SELECT * FROM system_media
WHERE media_type = 'video'
AND is_active = true
ORDER BY created_at DESC;
```

### Get Homepage Ads
```sql
SELECT * FROM system_media
WHERE file_type = 'ad'
AND targets @> '["homepage"]'::jsonb
AND is_active = true;
```

### Get System Images by Type
```sql
SELECT * FROM system_media
WHERE media_type = 'image'
AND file_type = 'logo'
ORDER BY created_at DESC;
```

## 🐛 Troubleshooting

### Issue: Upload fails with 403
**Solution**: Ensure user has admin role in JWT token

### Issue: Files not appearing in B2
**Solution**:
- Check `.env` has correct Backblaze credentials
- Verify `BACKBLAZE_KEY_ID` and `BACKBLAZE_APPLICATION_KEY`
- Check backend logs for B2 errors

### Issue: Table doesn't exist
**Solution**: Run `python migrate_system_media.py`

### Issue: No progress bar for videos
**Solution**: Ensure XMLHttpRequest is being used (it is in the implementation)

### Issue: Thumbnail upload fails
**Solution**:
- Check thumbnail is under 5MB
- Verify it's an image file
- Check if video uploaded successfully (thumbnail depends on video)

## 📊 API Response Examples

### Success Response (Image)
```json
{
  "success": true,
  "message": "System image uploaded successfully",
  "media_id": 15,
  "url": "https://f003.backblazeb2.com/file/astegni-media/images/logo/user_system/logo_20250107_143022.png",
  "details": {
    "fileId": "4_z...",
    "fileName": "images/logo/user_system/logo_20250107_143022.png",
    "uploadTimestamp": 1704635422000,
    "url": "https://...",
    "folder": "images/logo/user_system/",
    "size": 45632
  }
}
```

### Success Response (Video)
```json
{
  "success": true,
  "message": "System video uploaded successfully",
  "media_id": 23,
  "video_url": "https://f003.backblazeb2.com/file/astegni-media/videos/ad/user_system/tutorial_20250107_143530.mp4",
  "thumbnail_url": "https://f003.backblazeb2.com/file/astegni-media/images/thumbnails/user_system/tutorial-thumb_20250107_143530.jpg",
  "targets": ["homepage", "tutor", "student"],
  "details": {
    "video": {...},
    "thumbnail": {...}
  }
}
```

### Error Response
```json
{
  "detail": "Only admins can upload system videos"
}
```

## ✨ Next Steps

1. **Create Admin Dashboard**: Display uploaded media
2. **Add Edit/Delete**: Endpoints to modify/remove media
3. **Media Library**: Browse and manage all system media
4. **Usage Tracking**: Track where media is being displayed
5. **Scheduling**: Schedule ads to appear at specific times
6. **A/B Testing**: Test different ads/alerts

## 📝 Notes

- All system media files use `user_id='system'` for easy identification
- Files are automatically timestamped to prevent conflicts
- Thumbnails are required for all videos
- Multiple targets can be selected for videos
- Images support single target selection
- Classification is only for advertisements, not alerts
- Alerts are for system failures/warnings, not advertising
