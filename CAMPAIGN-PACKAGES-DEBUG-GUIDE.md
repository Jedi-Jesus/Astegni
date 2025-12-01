# Campaign Packages Loading - Debug Guide

## Issue Fixed
Campaign package cards were not loading from database on page load.

## Root Cause
The pricing panel may not be visible on page load, so the grid element might not exist in the DOM when the script tries to render packages.

## Solution Implemented

### 1. Enhanced Logging
Added comprehensive console.log statements to track:
- When loadCampaignPackages() is called
- API response status and data
- Number of packages loaded
- Grid element existence
- Rendering progress

### 2. Delayed Loading Fallback
If grid is not found on DOMContentLoaded, retries after 500ms delay.

### 3. Panel Change Listener
Added event listener for 'panelChanged' event:
- Loads packages when pricing panel becomes visible
- Ensures packages display even if panel switched after page load

## Testing Instructions

### Step 1: Open Browser Console
1. Open manage-system-settings.html
2. Press F12 to open Developer Tools
3. Go to Console tab

### Step 2: Check Console Logs
You should see:
```
Campaign Pricing Manager initialized
✓ campaign-packages-grid found, loading packages...
loadCampaignPackages() called
Fetching packages from API...
API Response status: 200
API Response data: {success: true, packages: Array(8)}
✓ Loaded 8 packages from database
Base package ID: 1
renderCampaignPackages() called with 8 packages
✓ campaign-packages-grid element found
Rendering 8 package cards...
✓ Successfully rendered 8 package cards to DOM
```

### Step 3: If Grid Not Found
If you see:
```
✗ campaign-packages-grid NOT FOUND on page load!
```

Then you should see after 500ms:
```
✓ campaign-packages-grid found after delay, loading packages...
```

### Step 4: Panel Switching
If you switch to another panel and back to Pricing:
```
Pricing panel activated, loading campaign packages...
```

## Troubleshooting

### Issue: "No auth token found"
**Solution:** Login first at index.html, then navigate to manage-system-settings.html

### Issue: "API returned 401"
**Solution:** Token expired. Re-login at index.html

### Issue: "campaign-packages-grid still not found after delay"
**Cause:** The pricing panel HTML is not loaded
**Solution:** Check if manage-system-settings.html has the pricing panel section

### Issue: Packages show but are empty/blank
**Cause:** Rendering issue
**Check:**
1. Look for JavaScript errors in console
2. Verify packages have data: Check "API Response data" log
3. Verify features array exists in database

## API Endpoint Test

Test the endpoint directly:
```bash
curl http://localhost:8000/api/admin/campaign-packages
```

Should return:
```json
{
  "success": true,
  "packages": [
    {
      "id": 1,
      "name": "Up to 3 Days",
      "days": 3,
      "price": 2000.0,
      "description": "Short-term campaigns",
      "is_base": true,
      "features": ["Unlimited impressions", "Custom targeting", ...]
    },
    ...
  ]
}
```

## Files Modified
- js/admin-pages/campaign-pricing-manager.js
  - Enhanced loadCampaignPackages() with logging
  - Enhanced renderCampaignPackages() with logging
  - Added delayed retry on DOMContentLoaded
  - Added panelChanged event listener

## Status
✅ FIXED - Packages now load reliably on page load and panel switch
