# Campaign Media Data Structure

## Overview

The campaign media system uses a **dual-storage architecture**:

1. **Files**: Stored in Backblaze B2 cloud storage
2. **Metadata**: Tracked in PostgreSQL database

---

## Database Tables

### 1. `campaign_media` (NEW - Source of Truth)

**Purpose**: Tracks ALL media files (images/videos) for campaigns

**Schema**:
```sql
CREATE TABLE campaign_media (
    id                SERIAL PRIMARY KEY,
    campaign_id       INTEGER NOT NULL,
    brand_id          INTEGER NOT NULL,
    advertiser_id     INTEGER NOT NULL,
    media_type        VARCHAR(10) NOT NULL CHECK (media_type IN ('image', 'video')),
    file_url          VARCHAR(500) NOT NULL,
    file_name         VARCHAR(255) NOT NULL,
    file_size         BIGINT,
    placement         VARCHAR(50) NOT NULL,
    content_type      VARCHAR(100),
    folder_path       VARCHAR(500),
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_campaign FOREIGN KEY (campaign_id)
        REFERENCES campaign_profile(id) ON DELETE CASCADE
);
```

**Indexes**:
- `campaign_media_pkey` - Primary key on `id`
- `idx_campaign_media_campaign_id` - Fast lookup by campaign
- `idx_campaign_media_brand_id` - Fast lookup by brand
- `idx_campaign_media_advertiser_id` - Fast lookup by advertiser
- `idx_campaign_media_placement` - Filter by placement type
- `idx_campaign_media_media_type` - Filter by image/video

**Constraints**:
- `media_type` must be 'image' or 'video'
- CASCADE DELETE: When campaign is deleted, all its media is deleted

**Trigger**:
- `trigger_update_campaign_media_updated_at` - Auto-updates `updated_at` timestamp

---

### 2. `campaign_profile` (Existing - Campaign Metadata)

**Purpose**: Stores campaign configuration and settings

**Relevant Fields**:
```sql
id                  INTEGER PRIMARY KEY
name                VARCHAR - Campaign name
brand_id            INTEGER - Foreign key to brand_profile
advertiser_id       INTEGER - Foreign key to advertiser_profiles
file_url            VARCHAR - Legacy field (now synced from campaign_media)
thumbnail_url       VARCHAR - Campaign thumbnail
target_placements   ARRAY - Where ads can appear: ['placeholder', 'widget', 'popup', 'insession']
target_audiences    ARRAY - Who sees ads: ['tutor', 'student', 'parent', 'advertiser', 'user']
target_regions      ARRAY - Geographic targeting
...
```

**Note**: `file_url` is now a **legacy field** kept for backward compatibility. The `campaign_media` table is the source of truth.

---

### 3. `brand_profile` (Existing - Brand Info)

**Purpose**: Brand/company information

**Relevant Fields**:
```sql
id                  INTEGER PRIMARY KEY
name                VARCHAR - Brand name
campaign_ids        ARRAY - List of campaign IDs belonging to this brand
...
```

---

### 4. `advertiser_profiles` (Existing - Advertiser Info)

**Purpose**: Advertiser user profile

**Relevant Fields**:
```sql
id                  INTEGER PRIMARY KEY
user_id             INTEGER - Foreign key to users table
brand_ids           ARRAY - List of brand IDs owned by this advertiser
...
```

---

## Relationships

```
users (user account)
  |
  | 1:1
  v
advertiser_profiles (advertiser role)
  |
  | 1:many
  v
brand_profile (brands/companies)
  |
  | 1:many
  v
campaign_profile (ad campaigns)
  |
  | 1:many
  v
campaign_media (images/videos)
```

**Foreign Keys**:
- `campaign_media.campaign_id` -> `campaign_profile.id` (CASCADE DELETE)
- `campaign_media.brand_id` -> `brand_profile.id`
- `campaign_media.advertiser_id` -> `advertiser_profiles.id`

**Cascade Behavior**:
- When a campaign is deleted, all its media records are automatically deleted
- The actual files in Backblaze B2 remain (requires separate cleanup)

---

## Data Flow

### Upload Flow
```
1. User uploads file via campaign modal
   |
2. Frontend: brands-manager.js
   - File: image/video
   - campaign_id: 3
   - brand_id: 17
   - placement: 'widget'
   |
3. API: POST /api/upload/campaign-media
   - Uploads file to Backblaze B2
   - Folder: images/profile_5/Test_brand/Gothe_Institute/widget/
   - URL: https://f005.backblazeb2.com/file/astegni-media/...
   |
4. Database: INSERT into campaign_media
   - Saves file metadata
   - Returns media_id
   |
5. Optional: Update campaign_profile.file_url
   - Syncs legacy field with first media file
   |
6. Frontend receives response
   - media_id: 1
   - file_url: https://...
   - Displays in gallery
```

### Fetch Flow
```
1. User views campaign
   |
2. Frontend requests media
   |
3. API: GET /api/campaign/3/media?placement=widget
   |
4. Database: SELECT from campaign_media
   - Filters by campaign_id, placement
   - Orders by created_at DESC
   |
5. Returns JSON array of media items
   |
6. Frontend displays images/videos
```

---

## Example Data (Gothe Institute Campaign)

### Campaign Profile
```json
{
  "id": 3,
  "name": "Gothe Institute",
  "brand_id": 17,
  "brand_name": "Test brand",
  "advertiser_id": 5,
  "target_placements": ["placeholder", "widget", "popup", "insession"],
  "file_url": "https://f005.backblazeb2.com/file/astegni-media/images/profile_5/Test_brand/Gothe_Institute/widget/gothe_logo_widget_20260212_031334.png"
}
```

### Campaign Media
```json
[
  {
    "id": 1,
    "campaign_id": 3,
    "brand_id": 17,
    "advertiser_id": 5,
    "media_type": "image",
    "file_url": "https://f005.backblazeb2.com/file/astegni-media/images/profile_5/Test_brand/Gothe_Institute/widget/gothe_logo_widget_20260212_031334.png",
    "file_name": "gothe_logo_widget_20260212_031334.png",
    "file_size": 7598,
    "placement": "widget",
    "content_type": "image/png",
    "folder_path": "images/profile_5/Test_brand/Gothe_Institute/widget/",
    "created_at": "2026-02-12T08:59:39.479044Z",
    "updated_at": "2026-02-12T08:59:39.479044Z"
  }
]
```

---

## File Organization in Backblaze B2

### Folder Structure
```
astegni-media/ (bucket)
├── images/
│   └── profile_{advertiser_id}/
│       └── {brand_name}/
│           └── {campaign_name}/
│               ├── placeholder/
│               │   ├── file1.jpg
│               │   └── file2.png
│               ├── widget/
│               │   └── gothe_logo_widget_20260212_031334.png
│               ├── popup/
│               └── insession/
└── videos/
    └── profile_{advertiser_id}/
        └── {brand_name}/
            └── {campaign_name}/
                ├── placeholder/
                ├── widget/
                ├── popup/
                └── insession/
```

### Example Paths
```
images/profile_5/Test_brand/Gothe_Institute/widget/gothe_logo_widget_20260212_031334.png
images/profile_5/Test_brand/Gothe_Institute/popup/banner_20260212_150000.jpg
videos/profile_5/Test_brand/Gothe_Institute/insession/intro_20260212_160000.mp4
```

### File URL Format
```
https://f005.backblazeb2.com/file/{bucket_name}/{file_path}

Example:
https://f005.backblazeb2.com/file/astegni-media/images/profile_5/Test_brand/Gothe_Institute/widget/gothe_logo_widget_20260212_031334.png
```

---

## Query Examples

### Get all media for a campaign
```sql
SELECT *
FROM campaign_media
WHERE campaign_id = 3
ORDER BY created_at DESC;
```

### Get only images for widget placement
```sql
SELECT *
FROM campaign_media
WHERE campaign_id = 3
  AND media_type = 'image'
  AND placement = 'widget';
```

### Get campaign with all its media
```sql
SELECT
    c.id,
    c.name as campaign_name,
    b.name as brand_name,
    json_agg(
        json_build_object(
            'id', cm.id,
            'type', cm.media_type,
            'url', cm.file_url,
            'placement', cm.placement,
            'size', cm.file_size
        )
    ) as media_files
FROM campaign_profile c
JOIN brand_profile b ON c.brand_id = b.id
LEFT JOIN campaign_media cm ON c.id = cm.campaign_id
WHERE c.id = 3
GROUP BY c.id, c.name, b.name;
```

### Get total storage used per campaign
```sql
SELECT
    c.id,
    c.name,
    COUNT(cm.id) as file_count,
    SUM(cm.file_size) as total_bytes,
    ROUND(SUM(cm.file_size) / 1024.0 / 1024.0, 2) as total_mb
FROM campaign_profile c
LEFT JOIN campaign_media cm ON c.id = cm.campaign_id
GROUP BY c.id, c.name
ORDER BY total_bytes DESC;
```

### Get media count by placement
```sql
SELECT
    placement,
    media_type,
    COUNT(*) as count,
    SUM(file_size) as total_size
FROM campaign_media
WHERE campaign_id = 3
GROUP BY placement, media_type;
```

---

## API Endpoints

### Upload Media
```http
POST /api/upload/campaign-media
Content-Type: multipart/form-data
Authorization: Bearer {token}

Form Data:
- file: File (required)
- brand_name: string (required)
- campaign_name: string (required)
- ad_placement: string (required) - 'placeholder', 'widget', 'popup', 'insession'
- campaign_id: integer (optional, recommended)
- brand_id: integer (optional, recommended)

Response:
{
  "success": true,
  "message": "Campaign image uploaded successfully",
  "url": "https://...",
  "file_name": "example.png",
  "file_type": "image",
  "media_id": 1,
  "file_size": 7598,
  "placement": "widget",
  "folder": "images/profile_5/Brand/Campaign/widget/",
  "details": {...}
}
```

### Get Campaign Media
```http
GET /api/campaign/{campaign_id}/media
Authorization: Bearer {token}

Query Parameters:
- media_type: 'image' | 'video' (optional)
- placement: 'placeholder' | 'widget' | 'popup' | 'insession' (optional)

Response:
{
  "success": true,
  "campaign_id": 3,
  "total": 5,
  "media": [...]
}
```

### Delete Media
```http
DELETE /api/campaign/media/{media_id}
Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "Media deleted successfully",
  "media_id": 1
}
```

---

## Key Design Decisions

### Why Separate `campaign_media` Table?

1. **Scalability**: Campaigns can have many media files without bloating campaign_profile
2. **Performance**: Indexed queries for filtering by placement/type
3. **Flexibility**: Easy to add media-specific features (views, clicks, A/B testing)
4. **History**: Track all media uploads with timestamps
5. **Cleanup**: CASCADE delete ensures no orphaned records

### Why Keep `campaign_profile.file_url`?

1. **Backward Compatibility**: Existing code may reference this field
2. **Quick Access**: Single representative image without joining tables
3. **Legacy Support**: Can be phased out gradually
4. **Sync**: Utility script keeps it updated with first media file

### Why Store Both Metadata and Files?

1. **Fast Queries**: Database queries are faster than Backblaze API calls
2. **Rich Metadata**: Store file size, type, timestamps, ownership
3. **Filtering**: Can filter by placement, type without downloading files
4. **Analytics**: Track which media performs best
5. **Security**: Verify ownership before allowing operations

---

## Summary

**Data Structure**:
```
advertiser_profiles (user)
  └─ brand_profile (brands)
      └─ campaign_profile (campaigns)
          └─ campaign_media (images/videos) ← NEW TABLE
              └─ Files in Backblaze B2
```

**Key Tables**:
- `campaign_media` - Source of truth for all campaign media (NEW)
- `campaign_profile` - Campaign settings (file_url is legacy)
- `brand_profile` - Brand information
- `advertiser_profiles` - Advertiser account

**Storage**:
- **Metadata**: PostgreSQL `campaign_media` table
- **Files**: Backblaze B2 cloud storage
- **Structure**: `{type}/profile_{id}/{brand}/{campaign}/{placement}/filename`

**Operations**:
- **Upload**: Saves to both Backblaze + database
- **Fetch**: Queries database (fast)
- **Delete**: Removes database record (CASCADE on campaign delete)
- **Sync**: Utility script updates campaign_profile.file_url
