# Ads Not Showing - Troubleshooting Guide

## Problem Diagnosed and Fixed

You weren't seeing ads in leaderboard-banner and logo-container because of a **placement value mismatch**.

### Issue Found
- **Database had**: `"leaderboard-banner"` (with hyphen)
- **Frontend expected**: `"leaderboard_banner"` (with underscore)

### Fix Applied
✅ Ran migration script: `fix_campaign_media_placement_values.py`
✅ Updated all placement values to use underscores instead of hyphens

---

## Current Status

**Database now has:**
- ✅ 1 active leaderboard_banner ad (Campaign #3: Gothe Institute)
- ✅ 2 active logo ads (Campaign #3: Gothe Institute, Campaign #6: Test campaign 4)

**All ads are:**
- ✅ Status: `active`
- ✅ Verification: `verified`
- ✅ Media uploaded with correct placement values

---

## How to See Ads Now

### Step 1: Start Backend Server

```bash
cd astegni-backend
python app.py
```

Wait for:
```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### Step 2: Start Frontend Server

```bash
python dev-server.py
```

Access: http://localhost:8081

### Step 3: Open Browser DevTools

1. Press **F12** to open DevTools
2. Go to **Console** tab
3. Refresh the page
4. Look for messages from **[AdRotationManager]**

Expected console output:
```
[AdRotationManager] Initialized X ad container(s)
[AdRotationManager] Impression tracked: ...
```

### Step 4: Check Network Tab

1. Go to **Network** tab in DevTools
2. Filter by: `campaigns`
3. Look for requests to: `/api/campaigns/ads/placement/leaderboard_banner`
4. Check response shows ads data

---

## If Ads Still Don't Show

### Diagnostic Checklist

#### 1. Backend Server Running?
```bash
# Check if server is responding
curl http://localhost:8000/health
```

#### 2. API Endpoint Working?
```bash
# Test leaderboard ads
curl "http://localhost:8000/api/campaigns/ads/placement/leaderboard_banner?limit=5"

# Test logo ads
curl "http://localhost:8000/api/campaigns/ads/placement/logo?limit=5"
```

Expected response:
```json
{
  "success": true,
  "placement_type": "leaderboard_banner",
  "count": 1,
  "ads": [...]
}
```

#### 3. JavaScript Loaded?

Check HTML includes the script:
```html
<script src="../js/common-modals/ad-rotation-manager.js"></script>
```

Pages confirmed to have it:
- ✅ index.html
- ✅ All profile-pages (5 pages)
- ✅ All view-profiles (4 pages)

#### 4. Containers Have Correct Attributes?

Check HTML has:
```html
<div class="leaderboard-banner"
     data-placement="leaderboard_banner"    <!-- IMPORTANT! -->
     data-profile-type="tutor"
     data-location="tutor_profile">
</div>
```

#### 5. Browser Console Errors?

Look for:
- ❌ `AdRotationManager is not defined`
- ❌ `Cannot read property 'init' of undefined`
- ❌ `Failed to fetch`
- ❌ `CORS error`

#### 6. CORS Issues?

Backend should allow:
- http://localhost:8080
- http://localhost:8081

Check `app.py` has proper CORS configuration.

---

## Common Issues & Solutions

### Issue: "No ads available" in console

**Cause**: No active + verified campaigns with media

**Solution**:
1. Create campaigns in advertiser profile
2. Upload media files
3. Admin verifies campaign
4. Advertiser launches campaign (status → active)

### Issue: 404 on API endpoint

**Cause**: Endpoint not registered or server not running

**Solution**:
```bash
# Verify endpoint is registered
grep "campaign_launch" astegni-backend/app.py

# Should show:
# from campaign_launch_endpoints import router as campaign_launch_router
# app.include_router(campaign_launch_router)
```

### Issue: Ads container is empty

**Cause**: JavaScript not initializing or API returning 0 ads

**Solution**:
```bash
# Run diagnostic
cd astegni-backend
python check_campaign_ads.py

# Should show active ads available
```

### Issue: Old cached code

**Cause**: Python or browser caching old files

**Solution**:
```bash
# Clear Python cache
cd astegni-backend
find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null

# Hard refresh browser: Ctrl + Shift + R
```

---

## Testing Tools Created

Run these diagnostic scripts:

### 1. Check Database
```bash
cd astegni-backend
python check_campaign_ads.py
```

Shows:
- Total campaigns
- Campaigns by status
- Active + verified campaigns
- Media by placement type
- Ready-to-display ads

### 2. Test API Directly
```bash
cd astegni-backend
python test_query_directly.py
```

Tests SQL query and shows ads that would be returned.

### 3. Test API Endpoint (requires server running)
```bash
cd astegni-backend
python test_ads_api.py
```

Makes actual HTTP requests to API endpoints.

---

## Standard Placement Values

Use these **exact** values in `campaign_media.placement`:

1. **leaderboard_banner** - Wide horizontal banners at top of pages
2. **logo** - Square/vertical ads in sidebar widgets
3. **in_session_skyscraper** - Vertical banners during whiteboard sessions

⚠️ **IMPORTANT**: Use underscores (`_`), NOT hyphens (`-`)!

---

## How the System Works

```
1. Page loads → HTML has <div data-placement="leaderboard_banner">

2. ad-rotation-manager.js initializes on DOMContentLoaded

3. Finds all containers: querySelectorAll('[data-placement]')

4. For each container:
   - Calls: GET /api/campaigns/ads/placement/{type}
   - Backend queries: WHERE campaign_status='active' AND placement={type}
   - Returns JSON with ads array

5. Renders ads dynamically:
   - Creates <img> or <video> elements
   - Adds to container
   - Starts 10-second rotation

6. Tracks engagement:
   - Impression after 1 second visible
   - Click when user clicks ad
```

---

## Next Steps

1. ✅ Database fixed (placement values corrected)
2. ✅ Query verified (ads available)
3. ✅ HTML containers verified (all 12 pages)
4. ⏳ **START SERVERS** and check browser

If ads still don't appear after starting servers, check browser console and share any error messages.

---

## Support

If you continue having issues:

1. Open browser DevTools (F12)
2. Copy any error messages from Console
3. Check Network tab for failed requests
4. Run diagnostic scripts and share output
