# Storage Limits Fix - Complete

## Problem Identified

When setting storage limits in the Media Panel of `manage-system-settings.html`, values were being automatically changed:
- **Example**: Setting video storage to 51,200 MB would change it to 30,720 MB
- **Root Cause**: The system was splitting total storage 50/50 between images and videos

### Technical Details

**Before the fix:**
1. When loading data (`system-settings-data.js:576-577`):
   - Took `storage_limit_gb` from database
   - Converted to MB: `storage_limit_gb * 1024`
   - **Divided by 2** to split between images and videos

2. When saving data (`manage-system-settings.js:1034-1035`):
   - Took image and video limits (in MB)
   - Converted each to GB and added them together
   - This created a feedback loop where values were recalculated

**Example of the problem:**
```
User enters: Video = 51,200 MB, Image = 10,240 MB
On save: storage_limit_gb = (10240 / 1024) + (51200 / 1024) = 10 + 50 = 60 GB
On reload: video_limit = 60 * 1024 / 2 = 30,720 MB  ← Wrong!
```

## Solution Implemented

Added **separate storage limit fields** to the database and API:
- `max_image_storage_mb` - Independent storage limit for images
- `max_video_storage_mb` - Independent storage limit for videos
- `storage_limit_gb` - Total storage (calculated as sum of both)

### Files Modified

#### Backend Changes

1. **Database Migration** - `astegni-backend/migrate_add_separate_storage_limits.py`
   - ✅ Added two new columns to `system_media_settings` table
   - ✅ Migrated existing data (split current storage 50/50 as starting point)
   - ✅ **Migration already run successfully**

2. **API Endpoints** - `astegni-backend/system_settings_endpoints.py`
   - ✅ Updated `GET /api/admin/system/media-settings` to return separate limits
   - ✅ Updated `PUT /api/admin/system/media-settings/{tier_name}` to accept and save separate limits
   - ✅ Maintains backward compatibility

#### Frontend Changes

3. **Data Loading** - `js/admin-pages/system-settings-data.js`
   - ✅ Updated `updateTierUI()` function to use dedicated fields
   - ✅ Falls back to 50/50 split if dedicated fields not available (backward compatibility)

4. **Data Saving** - `js/admin-pages/manage-system-settings.js`
   - ✅ Updated `saveMediaSettings()` to send separate storage limits
   - ✅ Calculates total storage as sum of both limits

## How to Apply the Fix

### Step 1: Restart the Backend Server

The migration has already run, but you need to restart the backend to load the updated API code:

1. **Stop the current backend server:**
   - Go to the terminal/console where the backend is running
   - Press `Ctrl+C` to stop it
   - If it doesn't stop, manually kill the process:
     ```bash
     # On Windows:
     tasklist | findstr python
     # Find the PID of the process on port 8000
     taskkill /F /PID <process_id>
     ```

2. **Start the backend server again:**
   ```bash
   cd astegni-backend
   venv\Scripts\python.exe app.py
   ```

### Step 2: Clear Browser Cache

To ensure you're using the updated JavaScript files:

1. Open the browser's developer tools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload" (or Ctrl+Shift+R)

### Step 3: Test the Fix

1. Navigate to: `http://localhost:8080/admin-pages/manage-system-settings.html`
2. Click on the "Media Management" panel
3. Try setting storage limits:
   - **Basic tier** - Try setting Video to `51,200` MB
   - Click "Save Media Settings"
   - Refresh the page
   - **Expected**: Video limit should remain `51,200` MB (not change to 30,720)

## Current Storage Settings (After Migration)

```
FREE:
  Single file limits: Image=5MB, Video=50MB
  Storage limits: Image=2,048MB, Video=2,048MB (Total=4GB)

BASIC:
  Single file limits: Image=5MB, Video=100MB
  Storage limits: Image=30,720MB, Video=30,720MB (Total=60GB)

PREMIUM:
  Single file limits: Image=5MB, Video=200MB
  Storage limits: Image=451,072MB, Video=451,072MB (Total=881GB)

ENTERPRISE:
  Single file limits: Image=0MB, Video=0MB
  Storage limits: Image=0MB, Video=0MB (Total=0GB)
```

**Note:** These values were split 50/50 from existing totals during migration. You can now set them independently to any values you want!

## What Changed

### API Response Structure (New)

```json
{
  "tier_name": "basic",
  "max_image_size_mb": 10,
  "max_video_size_mb": 100,
  "max_image_storage_mb": 30720,  // NEW - Independent image storage
  "max_video_storage_mb": 30720,  // NEW - Independent video storage
  "storage_limit_gb": 60           // Calculated total
}
```

### API Request Structure (New)

When saving media settings, the frontend now sends:
```json
{
  "max_image_size_mb": 10,
  "max_video_size_mb": 100,
  "max_image_storage_mb": 10240,   // NEW - Separate image storage
  "max_video_storage_mb": 51200,   // NEW - Separate video storage
  "storage_limit_gb": 60            // Total (auto-calculated)
}
```

## Benefits

1. **Independent Control**: Set image and video storage limits separately
2. **No More Auto-Changes**: Values stay exactly as you enter them
3. **Backward Compatible**: Old code will still work (uses 50/50 split as fallback)
4. **Flexible Quotas**: Can allocate more storage to videos than images (or vice versa)

## Troubleshooting

### Values still changing after save?

1. Ensure backend server was restarted with updated code
2. Clear browser cache (Ctrl+Shift+R)
3. Check browser console for any JavaScript errors
4. Verify migration ran successfully:
   ```bash
   cd astegni-backend
   venv\Scripts\python.exe -c "import psycopg; from dotenv import load_dotenv; import os; load_dotenv(); conn = psycopg.connect(os.getenv('DATABASE_URL')); cursor = conn.cursor(); cursor.execute('SELECT column_name FROM information_schema.columns WHERE table_name = \\'system_media_settings\\' AND column_name LIKE \\'max_%_storage_mb\\''); print(cursor.fetchall())"
   ```
   Should show: `[('max_image_storage_mb',), ('max_video_storage_mb',)]`

### API returns 500 error?

- Check backend console for error messages
- Ensure database migration completed successfully
- Verify `.env` file has correct DATABASE_URL

## Files Reference

### Backend Files
- `astegni-backend/migrate_add_separate_storage_limits.py` - Database migration
- `astegni-backend/system_settings_endpoints.py` - API endpoints (lines 379-505)

### Frontend Files
- `js/admin-pages/system-settings-data.js` - Data loading (lines 568-586)
- `js/admin-pages/manage-system-settings.js` - Data saving (lines 1027-1041)

---

**Status**: ✅ All code changes complete, migration run successfully
**Next Step**: Restart backend server and test in browser
