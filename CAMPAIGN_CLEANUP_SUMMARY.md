# Campaign Media Cleanup - Redundant Fields Removed

## What Was Done

Successfully removed **3 redundant fields** from `campaign_profile` table:

1. ❌ `file_url` - Removed (was VARCHAR(500))
2. ❌ `thumbnail_url` - Removed (was VARCHAR(500))
3. ❌ `file_size` - Removed (was BIGINT)

**Why?** These fields are now redundant because the `campaign_media` table tracks ALL media files with complete metadata.

---

## Before vs After

### BEFORE (Problematic)
```sql
campaign_profile
  ├─ id
  ├─ name
  ├─ file_url          ❌ Single URL (campaigns have multiple files)
  ├─ thumbnail_url     ❌ Should be from campaign_media
  ├─ file_size         ❌ Each file has its own size
  └─ ... (82 other fields)
```

**Problems:**
- Could only store ONE file URL (campaigns need multiple images/videos)
- Duplicate data (same info in two places)
- Inconsistency risk (update one, forget the other)
- No metadata (which placement? what type? when uploaded?)

### AFTER (Clean)
```sql
campaign_profile (82 columns - CLEANED)
  ├─ id, name, brand_id, advertiser_id
  ├─ target_placements, target_audiences
  └─ ... (campaign settings)

campaign_media (13 columns - SOURCE OF TRUTH)
  ├─ id, campaign_id, brand_id, advertiser_id
  ├─ media_type, file_url, file_name, file_size
  ├─ placement, content_type, folder_path
  └─ created_at, updated_at
```

**Benefits:**
- ✅ Multiple media files per campaign
- ✅ Complete metadata for each file
- ✅ Single source of truth
- ✅ No data duplication
- ✅ Clean separation of concerns

---

## Migration Details

### What Happened

**File**: `migrate_remove_redundant_campaign_fields.py`

**Steps**:
1. ✅ Backed up current values to `campaign_profile_media_backup`
2. ✅ Dropped 3 redundant columns from `campaign_profile`
3. ✅ Created `campaign_with_media` view (backward compatibility)
4. ✅ Created `get_campaign_primary_image()` function (easy access)
5. ✅ Verified all changes

**Statistics**:
- Campaigns backed up: 2
- Columns removed: 3
- New table size: 82 columns (from 85)

---

## New Helper Tools

### 1. View: `campaign_with_media`

**Purpose**: Query campaign with its media in one go

**Usage**:
```sql
SELECT * FROM campaign_with_media WHERE id = 3;
```

**Returns**:
- All `campaign_profile` columns
- `first_image_url` - First uploaded image
- `first_video_url` - First uploaded video
- `all_media` - JSON array of all media files

**Example**:
```sql
SELECT
    id,
    name,
    first_image_url,
    all_media
FROM campaign_with_media
WHERE id = 3;
```

### 2. Function: `get_campaign_primary_image(campaign_id)`

**Purpose**: Get the best image for campaign thumbnail

**Priority Order**:
1. Widget placement (most visible)
2. Placeholder placement
3. Popup placement
4. In-session placement

**Usage**:
```sql
-- Get primary image for campaign 3
SELECT get_campaign_primary_image(3);

-- Use in SELECT
SELECT
    id,
    name,
    get_campaign_primary_image(id) as thumbnail
FROM campaign_profile;
```

---

## How to Access Media Now

### Direct Query (Recommended)
```sql
-- Get all media for campaign
SELECT * FROM campaign_media WHERE campaign_id = 3;

-- Get only widget images
SELECT * FROM campaign_media
WHERE campaign_id = 3
  AND placement = 'widget'
  AND media_type = 'image';

-- Count media by type
SELECT media_type, COUNT(*)
FROM campaign_media
WHERE campaign_id = 3
GROUP BY media_type;
```

### Using View (Convenient)
```sql
-- Get campaign with media
SELECT * FROM campaign_with_media WHERE id = 3;

-- Get campaigns with their primary images
SELECT
    id,
    name,
    first_image_url as thumbnail
FROM campaign_with_media
ORDER BY name;
```

### Using Function (Simple)
```sql
-- Just get the primary image URL
SELECT get_campaign_primary_image(3);
```

---

## API Impact

### No Changes Required!

The backend API already uses `campaign_media` table:

**Upload Endpoint** (Already updated):
```http
POST /api/upload/campaign-media
- Saves to campaign_media table ✅
- Returns media_id ✅
```

**Fetch Endpoint** (Already updated):
```http
GET /api/campaign/{campaign_id}/media
- Queries campaign_media table ✅
- Returns all media files ✅
```

**Delete Endpoint** (Already updated):
```http
DELETE /api/campaign/media/{media_id}
- Deletes from campaign_media table ✅
```

---

## Backup and Rollback

### Backup Table: `campaign_profile_media_backup`

**Contains**:
- `campaign_id` - Campaign ID
- `file_url` - Old file_url value
- `thumbnail_url` - Old thumbnail_url value
- `file_size` - Old file_size value
- `backed_up_at` - Backup timestamp

**Current Data**:
```
Campaign 2: No old values
Campaign 3: Had file_url (now in campaign_media)
```

### Rollback (If Needed)

If you need to restore the old structure:

```bash
cd astegni-backend
python migrate_remove_redundant_campaign_fields.py --rollback
```

**This will**:
1. Re-add the 3 columns to `campaign_profile`
2. Restore values from backup table
3. Leave everything as it was

**Note**: Not recommended - the new structure is cleaner and more flexible!

---

## Verification Results

### ✅ All Tests Passed

```
1. Column Removal: SUCCESS
   - file_url: REMOVED
   - thumbnail_url: REMOVED
   - file_size: REMOVED

2. Backup: SUCCESS
   - 2 campaigns backed up

3. View: SUCCESS
   - campaign_with_media works
   - first_image_url returns URL
   - all_media returns JSON

4. Function: SUCCESS
   - get_campaign_primary_image(3) returns URL

5. campaign_media: SUCCESS
   - 1 media file tracked for campaign 3
   - Type: image, Placement: widget
```

---

## Example Queries

### Get campaign with all media
```sql
SELECT
    c.id,
    c.name,
    json_agg(
        json_build_object(
            'id', m.id,
            'type', m.media_type,
            'url', m.file_url,
            'placement', m.placement
        )
    ) as media
FROM campaign_profile c
LEFT JOIN campaign_media m ON c.id = m.campaign_id
WHERE c.id = 3
GROUP BY c.id, c.name;
```

### Get campaigns with media counts
```sql
SELECT
    c.id,
    c.name,
    COUNT(m.id) as total_media,
    COUNT(CASE WHEN m.media_type = 'image' THEN 1 END) as images,
    COUNT(CASE WHEN m.media_type = 'video' THEN 1 END) as videos,
    SUM(m.file_size) as total_size_bytes
FROM campaign_profile c
LEFT JOIN campaign_media m ON c.id = m.campaign_id
GROUP BY c.id, c.name;
```

### Get media by placement
```sql
SELECT
    placement,
    COUNT(*) as count,
    ROUND(SUM(file_size) / 1024.0 / 1024.0, 2) as total_mb
FROM campaign_media
WHERE campaign_id = 3
GROUP BY placement;
```

---

## Clean Up Backup Table (Optional)

After verifying everything works, you can remove the backup:

```sql
-- Check backup contents first
SELECT * FROM campaign_profile_media_backup;

-- Drop backup table (careful!)
DROP TABLE campaign_profile_media_backup;
```

**Recommendation**: Keep the backup for at least 1 week in production.

---

## Summary

### What Changed
- ❌ Removed 3 redundant fields from `campaign_profile`
- ✅ Created helper view: `campaign_with_media`
- ✅ Created helper function: `get_campaign_primary_image()`
- ✅ Backed up old values to `campaign_profile_media_backup`

### Final Structure
```
campaign_profile (82 columns)
  └─ Campaign metadata only

campaign_media (13 columns)
  └─ ALL media files (source of truth)

campaign_with_media (view)
  └─ Campaign + media in one query

get_campaign_primary_image(id)
  └─ Get best thumbnail image
```

### Benefits
1. **Cleaner Schema**: No duplicate data
2. **More Flexible**: Multiple files per campaign
3. **Better Metadata**: Size, type, placement per file
4. **Single Source**: One place for all media info
5. **Easier Queries**: Direct access to campaign_media

### Migration Files
1. `migrate_create_campaign_media_table.py` - Created campaign_media
2. `migrate_existing_campaign_media.py` - Migrated Backblaze files
3. `migrate_remove_redundant_campaign_fields.py` - Removed redundant fields
4. `sync_campaign_profile_file_urls.py` - (Now obsolete)

---

## Status: ✅ COMPLETE

The campaign media system is now fully cleaned up with a proper, normalized database structure!
