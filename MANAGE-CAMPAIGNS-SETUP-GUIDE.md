# Manage Campaigns - Database Integration Setup Guide

## Overview

The manage-campaigns page has been fully integrated with the database. All hardcoded data has been removed and replaced with dynamic loading from the PostgreSQL database. Each campaign includes either an image or video media file.

## Features Implemented

### 1. Database Integration
- ✅ All campaign data loads from `ad_campaigns` table
- ✅ Live search and filters for each panel (requested, verified, rejected, suspended)
- ✅ Real-time campaign status updates (approve, reject, suspend, reinstate)
- ✅ Live Campaign Requests widget with auto-refresh every 30 seconds
- ✅ Campaign statistics auto-update based on database

### 2. Search & Filter System
Each panel has independent search and filters:
- **Search**: Searches campaign name, description, and company name
- **Industry Filter**: Filters by industry (Education, Technology, Healthcare, Finance, etc.)
- **Ad Type Filter**: Filters by media type (Image, Video, Carousel)
- **Debounced Search**: 300ms delay for optimal performance

### 3. Media Support
- Each campaign has either an **image** or **video**
- Media URLs stored in `creative_urls` JSON array
- Icons show media type: 🎥 for videos, 🖼️ for images

## Setup Instructions

### Step 1: Seed Campaign Data

Run the seeding script to populate the database with sample campaigns:

```bash
cd astegni-backend
python seed_campaign_data.py
```

This will create:
- **15 pending campaigns** (requested panel)
- **45 verified campaigns** (verified panel)
- **8 rejected campaigns** (rejected panel)
- **5 suspended campaigns** (suspended panel)

Total: **73 campaigns** with Ethiopian companies and realistic data

### Step 2: Start Backend Server

```bash
cd astegni-backend
python app.py
```

Server runs on `http://localhost:8000`

### Step 3: Start Frontend Server

```bash
# From project root
python -m http.server 8080
```

Frontend runs on `http://localhost:8080`

### Step 4: Create Test Admin Session

For testing, create an admin session in localStorage:

1. Open browser console on `http://localhost:8080/admin-pages/manage-campaigns.html`
2. Run this code:

```javascript
localStorage.setItem('adminSession', JSON.stringify({
    id: 1,
    email: 'admin@astegni.et',
    department: 'manage-campaigns',
    name: 'Campaign Admin'
}));
```

3. Refresh the page

## Testing the Features

### 1. Test Panel Switching

Navigate between panels using the sidebar:
- **Dashboard**: Overview statistics
- **Campaign Requests**: Pending campaigns
- **Verified Campaigns**: Active campaigns
- **Rejected Campaigns**: Rejected applications
- **Suspended Campaigns**: Suspended campaigns

Each panel loads its own data independently.

### 2. Test Search Functionality

In any panel:
1. Type in the search box
2. Wait 300ms (debounced)
3. Table filters automatically
4. Try searching for:
   - "Addis Ababa University"
   - "Tech"
   - "Education"

### 3. Test Filters

#### Industry Filter
- Select "Education" → Shows only education campaigns
- Select "Technology" → Shows only tech campaigns
- Select "All Industries" → Shows all campaigns

#### Ad Type Filter
- Select "Video" → Shows only video campaigns
- Select "Image" → Shows only image campaigns
- Select "All Types" → Shows all campaigns

### 4. Test Campaign Actions

#### In Requested Panel:
- Click "Approve" → Moves campaign to verified
- Click "Reject" → Moves campaign to rejected
- Click "Review" → Opens campaign details (placeholder)

#### In Verified Panel:
- Click "Suspend" → Moves campaign to suspended

#### In Rejected Panel:
- Click "Reconsider" → Moves campaign back to pending

#### In Suspended Panel:
- Click "Reinstate" → Moves campaign back to verified

After each action:
- All panels auto-refresh
- Statistics update
- Live widget updates

### 5. Test Live Campaign Requests Widget

The right sidebar widget shows recent campaigns:
- Auto-refreshes every 30 seconds
- Shows all statuses (pending, verified, rejected, suspended)
- Color-coded status tags
- Displays time ago (e.g., "2 minutes ago")
- Smooth continuous scrolling animation

## API Endpoints Used

### Campaign Management Endpoints

```
GET  /api/manage-campaigns/campaigns
     ?status=pending|verified|rejected|suspended
     &search=query
     &industry=Education
     &ad_type=image|video
     &limit=50
     &offset=0
```

```
GET  /api/manage-campaigns/campaigns/live-requests
     ?limit=20
```

```
PUT  /api/manage-campaigns/campaigns/{campaign_id}/status
     Body: { "new_status": "verified|rejected|suspended|pending" }
```

```
GET  /api/manage-campaigns/stats/{admin_id}
```

```
GET  /api/manage-campaigns/profile/{admin_id}
```

## Database Schema

### ad_campaigns Table

Key fields:
- `id`: Campaign ID
- `name`: Campaign name
- `description`: Campaign description
- `verification_status`: pending | verified | rejected | suspended
- `budget`: Campaign budget in ETB
- `ad_type`: image | video | carousel | text
- `creative_urls`: JSON array of media URLs
- `target_audience`: JSON array of target audiences
- `locations`: JSON array of Ethiopian cities
- `impressions`, `clicks`, `ctr`: Performance metrics
- `created_at`, `updated_at`: Timestamps

### advertiser_profiles Table

Linked via `advertiser_id`:
- `company_name`: Company name
- `industry`: Industry sector
- `verified`: Verification status

## File Structure

```
astegni-backend/
├── seed_campaign_data.py                  # Seed campaigns
├── manage_campaigns_endpoints.py          # API endpoints
└── app.py                                 # Main app (imports endpoints)

admin-pages/
└── manage-campaigns.html                  # Main page

js/admin-pages/
├── manage-campaigns.js                    # Core functions
├── manage-campaigns-standalone.js         # Panel management
├── manage-campaigns-data-loader.js        # Profile & stats loading
└── manage-campaigns-table-loader.js       # Campaign tables & live widget
```

## Troubleshooting

### No campaigns showing
1. Check if backend is running: `http://localhost:8000/docs`
2. Run seed script: `python seed_campaign_data.py`
3. Check browser console for errors
4. Verify API response: Open DevTools → Network tab

### Search not working
1. Check browser console for JavaScript errors
2. Verify debouncing is working (300ms delay)
3. Test API directly: `http://localhost:8000/api/manage-campaigns/campaigns?status=pending&search=test`

### Live widget not updating
1. Check if `loadLiveRequests()` is being called
2. Verify 30-second interval is set
3. Check API endpoint: `/api/manage-campaigns/campaigns/live-requests`

### Status updates not working
1. Check if admin session exists in localStorage
2. Verify PUT endpoint returns success
3. Check if panels are reloading after update

## Key Features Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Database Integration | ✅ Complete | All data from PostgreSQL |
| Search by Name/Company | ✅ Complete | 300ms debounced |
| Industry Filter | ✅ Complete | Per-panel independent |
| Ad Type Filter | ✅ Complete | Image/Video/Carousel |
| Approve Campaign | ✅ Complete | Pending → Verified |
| Reject Campaign | ✅ Complete | Pending → Rejected |
| Suspend Campaign | ✅ Complete | Verified → Suspended |
| Reconsider Campaign | ✅ Complete | Rejected → Pending |
| Reinstate Campaign | ✅ Complete | Suspended → Verified |
| Live Widget | ✅ Complete | Auto-refresh 30s |
| Statistics Auto-Update | ✅ Complete | Updates after actions |
| Media Support | ✅ Complete | Images & Videos |

## Next Steps (Optional Enhancements)

1. **View Campaign Modal**: Implement detailed campaign view
2. **Edit Campaign**: Add campaign editing functionality
3. **Rejection Reasons**: Store and display rejection reasons
4. **Suspension Reasons**: Store and display suspension reasons
5. **Campaign Analytics**: Show detailed performance metrics
6. **Export Reports**: Export campaigns to CSV/PDF
7. **WebSocket Integration**: Real-time updates without refresh
8. **Pagination**: Add pagination for large result sets
9. **Advanced Filters**: Date range, budget range, location filters
10. **Backblaze B2 Integration**: Upload actual media files to B2

## Support

For issues or questions, check:
- Backend logs: Terminal running `python app.py`
- Frontend logs: Browser Developer Console (F12)
- Network tab: Check API responses

---

## Quick Test Checklist

- [ ] Backend server running on port 8000
- [ ] Frontend server running on port 8080
- [ ] Database seeded with campaigns
- [ ] Admin session in localStorage
- [ ] Dashboard shows statistics
- [ ] Requested panel shows pending campaigns
- [ ] Verified panel shows verified campaigns
- [ ] Rejected panel shows rejected campaigns
- [ ] Suspended panel shows suspended campaigns
- [ ] Search works in all panels
- [ ] Industry filter works in all panels
- [ ] Ad type filter works in all panels
- [ ] Approve button moves campaign to verified
- [ ] Reject button moves campaign to rejected
- [ ] Suspend button moves campaign to suspended
- [ ] Reconsider button moves campaign to pending
- [ ] Reinstate button moves campaign to verified
- [ ] Live widget shows recent campaigns
- [ ] Live widget auto-refreshes every 30 seconds
- [ ] Statistics update after actions

---

✅ **All features implemented and ready for testing!**
