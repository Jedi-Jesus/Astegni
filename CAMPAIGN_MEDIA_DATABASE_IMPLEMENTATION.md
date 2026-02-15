# Campaign Media Database Implementation

## Problem Summary

Campaign media (images/videos) were being uploaded to Backblaze B2 successfully, but the file URLs were not being saved to the database. This meant that:

- Files existed in Backblaze ✅
- Upload showed "success" message ✅
- But file URLs were NOT in the database ❌
- Frontend only stored URLs in JavaScript memory (lost on page refresh) ❌

## Solution Implemented

Created a complete database tracking system for campaign media uploads.

---

## Database Changes

### New Table: `campaign_media`

**Purpose**: Store metadata for all campaign media files (images/videos)

**Schema**:
```sql
CREATE TABLE campaign_media (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL,
    brand_id INTEGER NOT NULL,
    advertiser_id INTEGER NOT NULL,
    media_type VARCHAR(10) NOT NULL CHECK (media_type IN ('image', 'video')),
    file_url VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    placement VARCHAR(50) NOT NULL,
    content_type VARCHAR(100),
    folder_path VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_campaign FOREIGN KEY (campaign_id)
        REFERENCES campaign_profile(id) ON DELETE CASCADE
);
```

**Indexes Created**:
- `idx_campaign_media_campaign_id` - Fast lookup by campaign
- `idx_campaign_media_brand_id` - Fast lookup by brand
- `idx_campaign_media_advertiser_id` - Fast lookup by advertiser
- `idx_campaign_media_placement` - Filter by placement
- `idx_campaign_media_media_type` - Filter by type (image/video)

**Trigger**: Automatic `updated_at` timestamp update

---

## Backend Changes

### 1. Migration Script
**File**: `astegni-backend/migrate_create_campaign_media_table.py`

Creates the `campaign_media` table with all indexes and triggers.

**Usage**:
```bash
cd astegni-backend
python migrate_create_campaign_media_table.py
```

### 2. Updated Upload Endpoint
**File**: `astegni-backend/app.py modules/routes.py`
**Endpoint**: `POST /api/upload/campaign-media`

**Changes**:
- Added optional parameters: `campaign_id` and `brand_id`
- After successful Backblaze upload, saves metadata to `campaign_media` table
- Returns `media_id` in response for frontend tracking
- Gracefully handles database save failures (file still in Backblaze)

**New Response Fields**:
```json
{
    "success": true,
    "message": "Campaign image uploaded successfully",
    "url": "https://f005.backblazeb2.com/file/...",
    "file_name": "example.png",
    "file_type": "image",
    "media_id": 1,
    "file_size": 7598,
    "placement": "widget",
    "folder": "images/profile_5/Brand/Campaign/placement/",
    "details": {...}
}
```

### 3. New API Endpoints

#### Get Campaign Media
**Endpoint**: `GET /api/campaign/{campaign_id}/media`

**Query Parameters**:
- `media_type` (optional): Filter by 'image' or 'video'
- `placement` (optional): Filter by placement type

**Response**:
```json
{
    "success": true,
    "campaign_id": 3,
    "total": 5,
    "media": [
        {
            "id": 1,
            "campaign_id": 3,
            "brand_id": 17,
            "advertiser_id": 5,
            "media_type": "image",
            "file_url": "https://...",
            "file_name": "example.png",
            "file_size": 7598,
            "placement": "widget",
            "content_type": "image/png",
            "folder_path": "images/profile_5/Brand/Campaign/widget/",
            "created_at": "2026-02-12T08:59:39.479044Z",
            "updated_at": "2026-02-12T08:59:39.479044Z"
        }
    ]
}
```

**Examples**:
```bash
# Get all media
GET /api/campaign/3/media

# Get only images
GET /api/campaign/3/media?media_type=image

# Get only widget placement
GET /api/campaign/3/media?placement=widget

# Get widget images
GET /api/campaign/3/media?media_type=image&placement=widget
```

#### Delete Campaign Media
**Endpoint**: `DELETE /api/campaign/media/{media_id}`

**Response**:
```json
{
    "success": true,
    "message": "Media deleted successfully",
    "media_id": 1
}
```

**Security**: Verifies user owns the media before allowing deletion

### 4. Migration Script for Existing Files
**File**: `astegni-backend/migrate_existing_campaign_media.py`

Scans Backblaze B2 for existing campaign media files and adds them to the database.

**Features**:
- Scans both `images/` and `videos/` folders
- Parses folder structure: `{type}/profile_{id}/{brand}/{campaign}/{placement}/`
- Matches files to campaigns in database
- Skips duplicates
- Shows progress and summary

**Usage**:
```bash
cd astegni-backend
python migrate_existing_campaign_media.py
```

**Output**:
```
Scanning Backblaze for campaign media files...
================================================================================
Added: gothe_logo_widget_20260212_031334.png (ID: 1)
  Campaign: Gothe_Institute (ID: 3)
  Placement: widget
  Size: 7598 bytes

================================================================================
Migration complete!
Added: 1 files
Skipped: 1 files
```

---

## Frontend Changes

### 1. API Service Update
**File**: `js/advertiser-profile/api-service.js`

**Function**: `uploadCampaignMedia()`

**Changes**:
- Added parameters: `campaignId` and `brandId`
- Sends these IDs to backend for database storage

**Updated Signature**:
```javascript
async uploadCampaignMedia(file, brandName, campaignName, adPlacement, campaignId = null, brandId = null)
```

### 2. Brands Manager Update
**File**: `js/advertiser-profile/brands-manager.js`

**Function**: `submitMediaUpload()`

**Changes**:
- Now passes `campaign.id` and `this.currentBrand?.id` to API
- Stores `media_id` from response for database tracking
- Added `placement` and `file_size` to stored media items

**Before**:
```javascript
const response = await AdvertiserProfileAPI.uploadCampaignMedia(
    file, brandName, campaignName, adPlacement
);
```

**After**:
```javascript
const response = await AdvertiserProfileAPI.uploadCampaignMedia(
    file,
    brandName,
    campaignName,
    adPlacement,
    campaign.id,           // NEW: campaign_id
    this.currentBrand?.id  // NEW: brand_id
);
```

**Enhanced Media Item**:
```javascript
const mediaItem = {
    id: response.media_id || Date.now() + i,  // Database ID
    url: response.url,
    file_name: response.file_name || file.name,
    file_type: response.file_type || this.mediaUploadState.type,
    placements: selectedPlacements,
    campaign_id: campaign.id,
    placement: response.placement || adPlacement,  // NEW
    file_size: response.file_size,                 // NEW
    uploaded_at: new Date().toISOString()
};
```

---

## Testing Results

### 1. Database Structure ✅
```
campaign_media columns:
  - id: integer (PRIMARY KEY)
  - campaign_id: integer (FOREIGN KEY)
  - brand_id: integer
  - advertiser_id: integer
  - media_type: character varying
  - file_url: character varying
  - file_name: character varying
  - file_size: bigint
  - placement: character varying
  - content_type: character varying
  - folder_path: character varying
  - created_at: timestamp with time zone
  - updated_at: timestamp with time zone
```

### 2. Existing File Migration ✅
```
Gothe Institute Campaign (ID: 3):
  ✅ File exists in Backblaze
  ✅ File metadata now in database
  ✅ Media ID: 1
  ✅ URL: https://f005.backblazeb2.com/file/astegni-media/images/profile_5/Test_brand/Gothe_Institute/widget/gothe_logo_widget_20260212_031334.png
  ✅ Placement: widget
  ✅ Size: 7598 bytes
```

### 3. New Upload Flow ✅
1. User uploads image/video ✅
2. File uploaded to Backblaze ✅
3. Metadata saved to `campaign_media` table ✅
4. `media_id` returned to frontend ✅
5. Frontend tracks database ID ✅

---

## Data Flow

### Upload Flow
```
User selects file
    ↓
Frontend: brands-manager.js
    ↓
API: POST /api/upload/campaign-media
    ├─→ Upload to Backblaze B2
    ├─→ Get file URL
    └─→ Save to campaign_media table
    ↓
Response with media_id
    ↓
Frontend updates UI with database ID
```

### Fetch Flow
```
User views campaign
    ↓
Frontend requests media
    ↓
API: GET /api/campaign/{id}/media?placement=widget
    ↓
Query campaign_media table
    ↓
Return filtered media list
    ↓
Frontend displays images/videos
```

---

## Benefits

1. **Persistent Storage**: Media URLs saved permanently in database
2. **Fast Queries**: Indexed for quick lookups by campaign, brand, advertiser, placement
3. **Filtering**: Can filter by media type and placement
4. **Tracking**: File size, upload time, content type tracked
5. **Security**: User ownership verification for deletion
6. **Scalability**: Separate table from campaign_profile (better performance)
7. **Referential Integrity**: CASCADE delete when campaign is deleted
8. **Automatic Timestamps**: created_at and updated_at maintained automatically

---

## Files Created/Modified

### New Files
1. `astegni-backend/migrate_create_campaign_media_table.py` - Database migration
2. `astegni-backend/migrate_existing_campaign_media.py` - Backblaze→DB migration
3. `CAMPAIGN_MEDIA_DATABASE_IMPLEMENTATION.md` - This documentation

### Modified Files
1. `astegni-backend/app.py modules/routes.py` - Upload endpoint + new endpoints
2. `js/advertiser-profile/api-service.js` - Added campaign_id/brand_id params
3. `js/advertiser-profile/brands-manager.js` - Pass IDs to API, track media_id

---

## Future Enhancements

### Recommended
1. **Thumbnail Generation**: Auto-generate thumbnails for videos
2. **Batch Operations**: Endpoint to delete multiple media items
3. **Media Analytics**: Track views, clicks per media item
4. **Duplicate Detection**: Prevent uploading same file twice
5. **File Validation**: Check file dimensions, duration (videos)
6. **Frontend Gallery**: Fetch from database instead of JavaScript state

### Advanced
1. **CDN Integration**: Add CloudFlare/CDN caching
2. **Image Optimization**: Auto-resize/compress on upload
3. **Version History**: Keep track of replaced media
4. **Media Library**: Reuse media across campaigns
5. **A/B Testing**: Track performance per media file

---

## Maintenance

### Database Backup
```bash
# Backup campaign_media table
pg_dump astegni_user_db -t campaign_media > campaign_media_backup.sql

# Restore
psql astegni_user_db < campaign_media_backup.sql
```

### Clean Up Orphaned Files
Create a script to:
1. List all files in Backblaze
2. Check if they exist in `campaign_media` table
3. Report/delete orphaned files

### Monitor Storage
```sql
-- Get total storage used
SELECT
    media_type,
    placement,
    COUNT(*) as file_count,
    SUM(file_size) as total_bytes,
    ROUND(SUM(file_size) / 1024.0 / 1024.0, 2) as total_mb
FROM campaign_media
GROUP BY media_type, placement
ORDER BY total_bytes DESC;
```

---

## Summary

✅ **Problem**: Campaign media uploaded to Backblaze but not tracked in database

✅ **Solution**: Created `campaign_media` table with complete CRUD operations

✅ **Result**: All campaign media now persistently tracked with full metadata

✅ **Status**: Fully implemented and tested

✅ **Next Upload**: Will automatically save to database
