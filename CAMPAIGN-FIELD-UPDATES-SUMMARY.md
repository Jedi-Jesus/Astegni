# Campaign Field Updates Summary

## Overview
Updated the ad_campaigns table and all related code to use more descriptive field names and ensure media URL fields are properly displayed.

## Database Changes

### Field Name Updates
1. **`age_range`** → **`target_age_range`**
2. **`locations`** → **`target_location`**

### Migration Script Created
**File:** `astegni-backend/migrate_rename_campaign_fields.py`

**To run the migration:**
```bash
cd astegni-backend
python migrate_rename_campaign_fields.py
```

**What it does:**
- Safely renames `age_range` to `target_age_range` in the `ad_campaigns` table
- Safely renames `locations` to `target_location` in the `ad_campaigns` table
- Checks for existing columns before attempting rename
- Verifies the changes after migration

## Backend Updates

### File: `astegni-backend/manage_campaigns_endpoints.py`

**Changes Made:**
1. Updated all SQL queries to use `target_location` instead of `locations`
2. Updated all SQL queries to include `target_age_range` field
3. Updated response mappings to return:
   - `target_location` (changed from `target_region`)
   - `target_age_range` (newly added)
4. Updated filter queries to use `ac.target_location` instead of `ac.locations`

**Affected Endpoints:**
- `GET /api/manage-campaigns/campaigns` - List campaigns with filters
- `GET /api/manage-campaigns/campaigns/{campaign_id}` - Get campaign details
- `GET /api/manage-campaigns/campaigns/live-requests` - Live campaign requests

## Frontend Updates

### File: `admin-pages/manage-campaigns.html`

**Changes Made:**
1. Added new "Target Demographics" section in the view-campaign-modal
2. Added display fields for:
   - Target Age Range (`detail-target-age-range`)
   - Target Location (`detail-target-location`)
3. Enhanced the "Campaign Media" section title to clarify it shows Images/Videos

**New HTML Structure:**
```html
<!-- Target Demographics -->
<div class="mb-6">
    <h4 class="text-lg font-semibold mb-3">Target Demographics</h4>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="info-item">
            <span class="text-gray-600 text-sm">Target Age Range:</span>
            <p class="font-medium" id="detail-target-age-range">-</p>
        </div>
        <div class="info-item">
            <span class="text-gray-600 text-sm">Target Location:</span>
            <p class="font-medium" id="detail-target-location">-</p>
        </div>
    </div>
</div>
```

### File: `js/admin-pages/manage-campaigns-table-loader.js`

**Changes Made:**
1. Updated `populateCampaignModal()` function to populate new fields:
   - `target_age_range` - Handles object format `{min: 18, max: 65}`, arrays, and strings
   - `target_location` - Handles arrays and strings
2. Added backward compatibility for `target_region` → `target_location` transition
3. Enhanced age range formatting to display as "18 - 65 years" for object format

**Code Updates:**
```javascript
// Format target age range
let targetAgeRange = 'N/A';
if (campaign.target_age_range) {
    if (typeof campaign.target_age_range === 'object' && !Array.isArray(campaign.target_age_range)) {
        // Handle object format like {min: 18, max: 65}
        targetAgeRange = `${campaign.target_age_range.min || 'N/A'} - ${campaign.target_age_range.max || 'N/A'} years`;
    } else if (Array.isArray(campaign.target_age_range)) {
        targetAgeRange = campaign.target_age_range.join(', ');
    } else {
        targetAgeRange = String(campaign.target_age_range);
    }
}

// Format target location
const targetLocation = Array.isArray(campaign.target_location)
    ? campaign.target_location.join(', ')
    : campaign.target_location || 'N/A';
```

## Media URL Field

The media URL field (`creative_urls`) was already present in the database and is now properly displayed in the view-campaign-modal:

1. **Database Field:** `creative_urls` (JSONB array) - stores multiple image/video URLs
2. **Frontend Display:** Creative Media section shows all images and videos with:
   - Video player for `.mp4`, `.webm`, `.mov`, `.avi` files
   - Image viewer for `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg` files
   - Direct link for unknown file types
3. **API Response:** Includes `creative_urls` array and helper flags:
   - `has_video` - boolean indicating if campaign has video content
   - `has_image` - boolean indicating if campaign has image content
   - `media_url` - first URL from creative_urls array (for quick access)

## Testing Checklist

### Before Migration
- [ ] Backup the database
- [ ] Note current campaign count: `SELECT COUNT(*) FROM ad_campaigns;`
- [ ] Check existing data: `SELECT id, name, age_range, locations FROM ad_campaigns LIMIT 5;`

### Run Migration
- [ ] Run: `python astegni-backend/migrate_rename_campaign_fields.py`
- [ ] Verify migration output shows success
- [ ] Check renamed columns exist:
  ```sql
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'ad_campaigns'
  AND column_name IN ('target_age_range', 'target_location');
  ```

### After Migration
- [ ] Verify data integrity: `SELECT id, name, target_age_range, target_location FROM ad_campaigns LIMIT 5;`
- [ ] Restart backend server: `cd astegni-backend && python app.py`
- [ ] Test frontend:
  - [ ] Open manage-campaigns.html in browser
  - [ ] Click "View" on any campaign
  - [ ] Verify "Target Demographics" section displays correctly
  - [ ] Verify age range and location are populated
  - [ ] Verify campaign media (images/videos) display correctly

## Backward Compatibility

The JavaScript code includes backward compatibility:
- Checks for both `target_region` and `target_location` (uses target_location if available)
- This ensures the UI works during the transition period

## Next Steps

1. **Run the migration script** to update the database
2. **Restart the backend server** to load the updated code
3. **Test the changes** using the checklist above
4. **Update seed data scripts** if needed to use new field names

## Files Modified

### Backend
- `astegni-backend/migrate_rename_campaign_fields.py` (NEW)
- `astegni-backend/manage_campaigns_endpoints.py` (UPDATED)

### Frontend
- `admin-pages/manage-campaigns.html` (UPDATED)
- `js/admin-pages/manage-campaigns-table-loader.js` (UPDATED)

## Notes

- The `creative_urls` field already exists and stores all media URLs as a JSONB array
- No changes needed to the database schema for media URLs
- The frontend already displays all media from `creative_urls` with proper video/image detection
- All queries have been updated to use the new field names
- The migration script is idempotent (safe to run multiple times)
