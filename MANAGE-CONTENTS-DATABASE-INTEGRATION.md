# Manage Contents - Database Integration Complete

## Overview
The manage-contents.html page has been fully integrated with a PostgreSQL database backend. All hardcoded data has been replaced with real-time database queries, and the content management system now supports full CRUD operations.

## Database Schema

### Contents Table
```sql
CREATE TABLE contents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('image', 'video')),
    uploader_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    uploader_name VARCHAR(255),
    file_size BIGINT NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    grade_level VARCHAR(100),
    course_type VARCHAR(100),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (
        verification_status IN ('pending', 'verified', 'rejected', 'suspended')
    ),
    verified_at TIMESTAMP,
    verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    rejected_at TIMESTAMP,
    rejected_reason TEXT,
    suspended_at TIMESTAMP,
    suspended_reason TEXT,
    thumbnail_path TEXT,
    duration INTEGER,
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Field Descriptions
- **title**: Content title/name
- **content_type**: Either 'image' or 'video'
- **uploader_id/uploader_name**: User who uploaded the content
- **file_size**: Size in bytes
- **file_path**: Backblaze B2 file path
- **grade_level**: Target grade level (e.g., "Grade 1-6", "Grade 9-10", "University Level")
- **course_type**: Subject area (e.g., "Mathematics", "Physics", "Chemistry")
- **verification_status**: Current status (pending, verified, rejected, suspended)
- **rejected_reason/suspended_reason**: Admin notes for rejection/suspension

## Backend Implementation

### Files Created
1. **astegni-backend/migrate_create_contents_table.py** - Database migration script
2. **astegni-backend/content_management_endpoints.py** - API endpoints
3. **astegni-backend/seed_content_data.py** - Sample data seeding

### API Endpoints

#### GET Endpoints
- `GET /api/admin/contents/stats` - Dashboard statistics
  ```json
  {
    "total_contents": 80,
    "pending_contents": 21,
    "verified_contents": 39,
    "rejected_contents": 14,
    "suspended_contents": 6,
    "total_videos": 50,
    "total_images": 30,
    "total_storage_mb": 1234.56
  }
  ```

- `GET /api/admin/contents?verification_status={status}` - Get contents by status
  - Query parameters: `verification_status`, `content_type`, `grade_level`, `course_type`, `limit`, `offset`

- `GET /api/admin/contents/{id}` - Get specific content details

#### PUT Endpoints
- `PUT /api/admin/contents/{id}` - Update content details (title, description, etc.)
- `PUT /api/admin/contents/{id}/verify` - Update verification status
  ```json
  {
    "verification_status": "verified|rejected|suspended",
    "reason": "Optional reason for rejection/suspension",
    "verified_by": 1
  }
  ```

#### DELETE Endpoints
- `DELETE /api/admin/contents/{id}` - Delete content permanently

## Frontend Implementation

### Files Updated
1. **js/admin-pages/manage-contents.js** - Complete rewrite with database integration
2. **admin-pages/manage-contents.html** - Updated table structure and added content modal

### Key Features

#### Dashboard Stats
- Real-time statistics from database
- Verified, Pending, Rejected, Suspended counts
- Total storage usage in GB/MB
- Approval rate calculation
- Video/Image breakdown

#### Panel Tables
All four panels now display data from database:
1. **Requested Contents** (pending)
2. **Verified Contents**
3. **Rejected Contents**
4. **Flagged Contents** (suspended)

#### Table Columns
- Content (Title + ID)
- Type (Video/Image with badges)
- Uploader name
- File size in MB
- Upload/Action date
- Grade Level / Course Type
- Action buttons (View, Approve, Reject, Flag, etc.)

#### Content Modal
- Opens when "View" button is clicked
- Displays content (video player or image viewer)
- Shows all content details:
  - ID, Type, Uploader, Size, Upload date
  - Status badge (color-coded)
  - Grade level, Course type
  - Description
  - Rejection/Suspension reason (if applicable)
- Integrated with Backblaze B2 for content display

#### Action Buttons (Context-Aware)
- **Requested Panel**: View, Approve, Reject
- **Verified Panel**: View, Flag
- **Rejected Panel**: View, Reconsider
- **Flagged Panel**: View, Restore, Delete

#### Search & Filters
- Real-time search by title, uploader, or ID
- Filter by content type (image/video)
- Automatic table filtering

## Setup Instructions

### 1. Run Database Migration
```bash
cd astegni-backend
python migrate_create_contents_table.py
```

### 2. Seed Sample Data
```bash
python seed_content_data.py
```

This creates 80 sample contents:
- 50 videos (various sizes from 10MB-500MB)
- 30 images (500KB-10MB)
- Mixed verification statuses (40% verified, 30% pending, 20% rejected, 10% suspended)
- Ethiopian educational context (local names, institutions, grade levels)

### 3. Update Backend App
The endpoints are automatically included in `app.py`:
```python
from content_management_endpoints import router as content_management_router
app.include_router(content_management_router)
```

### 4. Start Backend Server
```bash
cd astegni-backend
python app.py
```

### 5. Access Frontend
Open `admin-pages/manage-contents.html` in a browser (with live server running)

## Sample Data Statistics

After seeding, you should see approximately:
- **Total Contents**: 80
- **Pending**: ~21
- **Verified**: ~39
- **Rejected**: ~14
- **Suspended**: ~6
- **Videos**: 50
- **Images**: 30
- **Total Storage**: ~4-8 GB (randomly generated)

## Content Examples

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

### Ethiopian Context
- Uploaders have Ethiopian names (Dr. Abebe Tadesse, Prof. Marta Bekele, etc.)
- Realistic file sizes and durations
- Professional rejection/suspension reasons
- Appropriate educational content descriptions

## Testing Guide

### Test Dashboard Stats
1. Open manage-contents.html
2. Dashboard should automatically load with real statistics
3. All 8 stat cards should show actual numbers (not "0" or "Loading...")

### Test Panel Switching
1. Click "Requested Contents" in sidebar
2. Table should populate with pending contents
3. Stats should show pending counts
4. Click "Verified Contents" - table updates
5. Repeat for Rejected and Flagged panels

### Test Content View Modal
1. Click "View" button on any content
2. Modal opens with content details
3. Video should have player controls (if video type)
4. Image should display (if image type)
5. All details populated correctly
6. Status badge color-coded appropriately

### Test Actions
1. **Approve Content**:
   - Go to Requested panel
   - Click "Approve" on a content
   - Confirm the action
   - Content moves to Verified panel
   - Dashboard stats update

2. **Reject Content**:
   - Go to Requested panel
   - Click "Reject" on a content
   - Enter rejection reason
   - Content moves to Rejected panel

3. **Flag Content**:
   - Go to Verified panel
   - Click "Flag" on a content
   - Enter suspension reason
   - Content moves to Flagged panel

4. **Reconsider Content**:
   - Go to Rejected panel
   - Click "Reconsider" on a content
   - Content moves back to Requested panel

5. **Restore Content**:
   - Go to Flagged panel
   - Click "Restore" on a content
   - Content moves back to Verified panel

6. **Delete Content**:
   - Go to Flagged panel
   - Click "Delete" on a content
   - Confirm deletion (PERMANENT)
   - Content removed from database

### Test Search & Filters
1. Type in search box (e.g., "Math")
2. Table filters in real-time
3. Select content type filter (e.g., "Videos")
4. Table shows only videos
5. Combine search + filter

### Test Export
1. Click "Export" button in any panel
2. CSV file downloads with all visible data
3. Open in Excel/Sheets to verify format

## Known Limitations

1. **Backblaze Integration**: Content files don't actually exist in Backblaze yet
   - File paths are generated but files aren't uploaded
   - Video player/image viewer will show 404 errors
   - This is expected for testing with sample data

2. **Admin ID**: Currently hardcoded to 1 for verification actions
   - TODO: Get actual admin ID from session/authentication

3. **No Pagination**: All contents loaded at once
   - Limit of 100 items per query
   - For production, implement pagination

4. **No Real-time Updates**: Manual refresh required
   - WebSocket integration planned for future

## Next Steps

### Immediate Enhancements
1. Implement actual file uploads to Backblaze B2
2. Add pagination for large datasets
3. Integrate with admin authentication for verified_by field
4. Add notification system (replace alerts)
5. Implement real-time updates via WebSocket

### Future Features
1. Bulk actions (approve/reject multiple contents)
2. Advanced filtering (date ranges, file size ranges)
3. Content analytics (views, engagement)
4. Automated content moderation (AI-based)
5. Content versioning and history
6. Comments/notes on content reviews
7. Email notifications to uploaders
8. Content scheduling (publish at specific time)

## Troubleshooting

### Stats Not Loading
- Check browser console for errors
- Verify backend is running on http://localhost:8000
- Check CORS settings in app.py
- Verify database connection

### Tables Empty
- Run seed script: `python seed_content_data.py`
- Check API response in Network tab
- Verify verification_status values are correct

### Modal Not Opening
- Check browser console for errors
- Verify content ID is valid
- Check if modal HTML exists in page

### Actions Not Working
- Check browser console for errors
- Verify API endpoints are registered
- Check HTTP status codes (200, 404, 500)
- Verify request payload format

## File Locations

### Backend Files
```
astegni-backend/
├── migrate_create_contents_table.py
├── content_management_endpoints.py
├── seed_content_data.py
└── app.py (updated)
```

### Frontend Files
```
js/admin-pages/
├── manage-contents.js (complete rewrite)
└── manage-contents-old.js (backup)

admin-pages/
└── manage-contents.html (updated)
```

## Success Criteria

✅ Database table created with all required fields
✅ API endpoints implemented and tested
✅ Sample data seeded (80 contents)
✅ Dashboard stats display real data
✅ All four panels load data from database
✅ Content modal displays full details
✅ Action buttons work (approve, reject, flag, etc.)
✅ Search and filters function correctly
✅ Export to CSV works

## Summary

The manage-contents.html page is now fully integrated with the database backend. All hardcoded data has been removed, and the system supports:

- Real-time dashboard statistics
- Dynamic content tables by verification status
- Full CRUD operations via API
- Content viewing with modal
- Verification workflow (approve/reject/flag/reconsider)
- Search and filtering
- CSV export

The implementation follows the Astegni architectural patterns and integrates seamlessly with the existing admin panel structure.
