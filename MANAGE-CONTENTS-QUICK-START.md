# Manage Contents - Quick Start Guide

## Summary of Changes

All hardcoded data in manage-contents.html has been replaced with real database integration. The system now fully supports content management operations with:

✅ **Database table created** (`contents` with 20+ fields)
✅ **80 sample contents seeded** (50 videos, 30 images)
✅ **API endpoints implemented** (GET, PUT, DELETE)
✅ **Dashboard stats from database** (real-time statistics)
✅ **Tables load from database** (by verification status)
✅ **View modal implemented** (displays content from Backblaze path)
✅ **Action workflows complete** (approve, reject, flag, reconsider, delete)

## Current Data

After running the seed script, your database contains:
- **Total Contents**: 80
- **Pending**: 21
- **Verified**: 39
- **Rejected**: 14
- **Suspended**: 6
- **Videos**: 50
- **Images**: 30
- **Total Storage**: ~12.6 GB

## Quick Test

### 1. Verify Backend is Running
```bash
curl http://localhost:8000/api/admin/contents/stats
```

Expected response:
```json
{
  "total_contents": 80,
  "pending_contents": 21,
  "verified_contents": 39,
  "rejected_contents": 14,
  "suspended_contents": 6,
  "total_videos": 50,
  "total_images": 30,
  "total_storage_mb": 12880.13
}
```

### 2. Open Frontend
Navigate to: `http://localhost:8080/admin-pages/manage-contents.html`

### 3. Check Dashboard
- Dashboard should show 8 stat cards with real numbers
- Stats should match API response above
- No "Loading..." or "0" values

### 4. Test Panel Switching
1. Click "Requested Contents" → Should show 21 pending contents
2. Click "Verified Contents" → Should show 39 verified contents
3. Click "Rejected Contents" → Should show 14 rejected contents
4. Click "Flagged Contents" → Should show 6 suspended contents

### 5. Test View Modal
1. Click "View" button on any content
2. Modal opens with content details
3. All fields populated (title, type, uploader, size, date, grade, course)
4. Status badge shows correct color

### 6. Test Actions
**Approve a content:**
1. Go to "Requested Contents" panel
2. Click "Approve" on any content
3. Confirm the action
4. Content disappears from this panel
5. Go to "Verified Contents" → Content now appears there
6. Dashboard stats update (Pending: 20, Verified: 40)

**Reject a content:**
1. Go to "Requested Contents" panel
2. Click "Reject" on any content
3. Enter rejection reason (e.g., "Low quality video")
4. Content moves to "Rejected Contents" panel
5. Dashboard stats update

**Flag a content:**
1. Go to "Verified Contents" panel
2. Click "Flag" on any content
3. Enter suspension reason (e.g., "Reported by users")
4. Content moves to "Flagged Contents" panel

**Reconsider a content:**
1. Go to "Rejected Contents" panel
2. Click "Reconsider" on any content
3. Content moves back to "Requested Contents" panel

**Restore a flagged content:**
1. Go to "Flagged Contents" panel
2. Click "Restore" on any content
3. Content moves back to "Verified Contents" panel

**Delete a content (PERMANENT):**
1. Go to "Flagged Contents" panel
2. Click "Delete" on any content
3. Confirm deletion
4. Content is permanently removed from database

## Files Modified

### Backend
1. `astegni-backend/migrate_create_contents_table.py` (NEW)
2. `astegni-backend/content_management_endpoints.py` (NEW)
3. `astegni-backend/seed_content_data.py` (NEW)
4. `astegni-backend/app.py` (UPDATED - added content_management_router)

### Frontend
1. `js/admin-pages/manage-contents.js` (COMPLETELY REWRITTEN)
2. `admin-pages/manage-contents.html` (UPDATED - table headers, content modal added)

## API Endpoints Available

### Statistics
- **GET** `/api/admin/contents/stats` - Dashboard statistics

### Content CRUD
- **GET** `/api/admin/contents` - List contents (supports filtering)
  - Query params: `verification_status`, `content_type`, `grade_level`, `course_type`, `limit`, `offset`
- **GET** `/api/admin/contents/{id}` - Get specific content
- **POST** `/api/admin/contents` - Create new content
- **PUT** `/api/admin/contents/{id}` - Update content details
- **PUT** `/api/admin/contents/{id}/verify` - Update verification status
- **DELETE** `/api/admin/contents/{id}` - Delete content

## Sample Content Data

### Grade Levels
- Grade 1-6
- Grade 7-8
- Grade 9-10
- Grade 11-12
- University Level
- All Grades

### Course Types
- Mathematics
- Physics
- Chemistry
- Biology
- English
- Amharic
- History
- Geography
- Civics
- Economics
- Computer Science
- General Science

### Uploaders (Ethiopian Names)
- Dr. Abebe Tadesse
- Prof. Marta Bekele
- Mr. Dawit Solomon
- Mrs. Sara Haile
- Dr. Yohannes Mulugeta
- Ms. Hana Tesfaye
- Prof. Getachew Mekonnen
- Mr. Berhanu Alemu

## Known Issues

1. **Content files don't exist in Backblaze yet**
   - File paths are generated but actual files aren't uploaded
   - Video player will show 404 errors (expected for sample data)
   - To test with real files, upload to Backblaze with matching paths

2. **Admin ID hardcoded**
   - `verified_by` field uses hardcoded value (1)
   - TODO: Integrate with actual admin authentication session

3. **No pagination**
   - All contents loaded at once (limit 100)
   - For production, implement pagination UI

## Next Steps

1. **Upload test files to Backblaze B2**
   - Use paths matching the database (e.g., `videos/educational/user_1/video_1_20251020.mp4`)
   - Or update file_path in database to match existing files

2. **Integrate with admin authentication**
   - Replace hardcoded `verified_by: 1` with actual admin ID from session

3. **Add notifications**
   - Replace `alert()` with proper notification system
   - Use toast notifications for better UX

4. **Implement pagination**
   - Add page navigation to tables
   - Load contents in batches (e.g., 20 per page)

5. **Add WebSocket for real-time updates**
   - Auto-refresh when other admins make changes
   - Live feed of new uploads

## Troubleshooting

**Dashboard shows "0" or "Loading...":**
- Check browser console for errors
- Verify backend is running: `curl http://localhost:8000/health`
- Check CORS settings in app.py
- Verify database connection

**Tables are empty:**
- Run seed script: `python seed_content_data.py`
- Check API: `curl http://localhost:8000/api/admin/contents?verification_status=pending`
- Verify table exists: Check PostgreSQL

**Modal doesn't open:**
- Check browser console for errors
- Verify modal HTML exists in manage-contents.html
- Check if content ID is valid

**Actions don't work:**
- Check browser console for errors
- Verify API endpoints in backend logs
- Check HTTP status codes (should be 200)
- Verify request payload format

## Success!

Your manage-contents page is now fully integrated with the database backend. All hardcoded data has been removed and replaced with real-time database queries. The system supports full content management workflows including approval, rejection, flagging, and deletion.

For detailed documentation, see `MANAGE-CONTENTS-DATABASE-INTEGRATION.md`.
