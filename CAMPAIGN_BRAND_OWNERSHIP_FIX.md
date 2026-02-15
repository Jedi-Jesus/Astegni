# Campaign-Brand Ownership Fix - Complete Summary

**Date:** 2026-02-13
**Issue:** Multiple brands claiming the same campaigns
**Status:** ✅ RESOLVED

---

## Problem Identified

### The Issue
In `manage-campaign.html`, campaigns were showing incorrect brand names (e.g., "Ethiopian Airlines" for a campaign that actually belonged to "Test brand").

### Root Cause
The database had **data integrity issues** where multiple brands claimed ownership of the same campaigns:

| Campaign ID | Campaign Name | True Owner (brand_id) | Brands Claiming It (campaign_ids[]) |
|-------------|---------------|----------------------|--------------------------------------|
| 2 | adsf | Brand 20 | Brands 2, 20 |
| 3 | Gothe Institute | Brand 17 | Brands 3 (Ethiopian Airlines), 17 |
| 4 | Test campaign 2 | Brand 17 | Brands 4, 17 |

### Why "Ethiopian Airlines" Appeared
When the backend query used:
```sql
LEFT JOIN brand_profile bp ON cp.id = ANY(bp.campaign_ids)
```

This JOIN would match **multiple brands** if they both had the same campaign ID in their `campaign_ids[]` array. PostgreSQL would return one of them (non-deterministically), which happened to be "Ethiopian Airlines" for campaign 3.

---

## Solution Implemented

### 1. Database Schema Analysis ✅
Discovered that `campaign_profile` table **already has** a `brand_id` column containing the **correct** brand ownership:
```sql
campaign_profile.brand_id → brand_profile.id (proper foreign key)
```

The `brand_profile.campaign_ids[]` array was redundant and had incorrect/duplicate data.

### 2. Data Migration ✅
Created and ran: `migrate_fix_campaign_brand_ownership.py`

**Actions taken:**
- Analyzed all campaign ownership conflicts
- Removed campaign IDs from wrong brands' `campaign_ids[]` arrays
- Kept campaign IDs only in the correct brands (matching `campaign_profile.brand_id`)

**Results:**
```
Fixed 3 campaigns:
- Campaign 2: Removed from Brand 2 (Dashen Bank)
- Campaign 3: Removed from Brand 3 (Ethiopian Airlines)
- Campaign 4: Removed from Brand 4 (Awash Bank)

✓ All campaigns now correctly assigned to their brands
✓ No duplicate ownership
✓ brand_profile.campaign_ids[] matches campaign_profile.brand_id
```

### 3. Backend API Updates ✅
Updated `admin_advertisers_endpoints.py`:

**Changed JOIN logic from:**
```sql
FROM campaign_profile cp
LEFT JOIN brand_profile bp ON cp.id = ANY(bp.campaign_ids)  -- WRONG: Uses array
```

**To:**
```sql
FROM campaign_profile cp
LEFT JOIN brand_profile bp ON cp.brand_id = bp.id  -- CORRECT: Uses FK
```

**Endpoints updated:**
- `GET /api/admin-advertisers/campaigns` (line 405-408)
- `GET /api/admin-advertisers/recent/campaigns` (line 774-778)

**Docstrings updated:**
- Marked `brand_profile.campaign_ids[]` as deprecated
- Documented proper relationship: `campaign_profile.brand_id → brand_profile.id`

### 4. Verification ✅
**Database verification:**
```
Campaign 3 "Gothe Institute":
  brand_id: 17 (Test brand)
  Joined Brand: 17 (Test brand)
  Claiming brands: [17] only
```

**API verification:**
```json
{
  "id": 3,
  "campaign_name": "Gothe Institute",
  "brand_name": "Test brand",
  "brand_id": 17
}
```

**Before:** Campaign 3 showed "Ethiopian Airlines"
**After:** Campaign 3 correctly shows "Test brand"

---

## Frontend Impact

No frontend changes required! The JavaScript in `manage-advertisers-standalone.js` already uses `campaign.brand_name` from the API response.

**Widgets now working correctly:**
- ✅ `campaign-requests-widget` - Shows pending campaigns with correct brand names
- ✅ `campaign-requested-panel` - Shows pending campaigns with correct brand names
- ✅ `campaign-verified-panel` - Shows verified campaigns with correct brand names
- ✅ `campaign-total-widget` - Shows count of submitted campaigns

---

## Files Modified

### Backend
1. **`admin_advertisers_endpoints.py`**
   - Updated campaign-brand JOIN logic (2 locations)
   - Updated docstrings

2. **`migrate_fix_campaign_brand_ownership.py`** (NEW)
   - Migration script to fix data conflicts
   - Can be re-run safely (idempotent)

### Frontend
No changes required - already using API correctly

---

## Database Schema (Updated Documentation)

### Relationships
```
advertiser_profiles
    └── brand_ids[] (array) → brand_profile.id

brand_profile
    ├── campaign_ids[] (DEPRECATED - kept for backward compatibility)
    └── package_id → brand_packages.id (admin db)

campaign_profile
    ├── brand_id → brand_profile.id (✅ PRIMARY RELATIONSHIP)
    ├── advertiser_id → advertiser_profiles.id
    └── campaign_package_id → brand_packages.id (admin db)
```

### Join Logic
```sql
-- CORRECT: Use brand_id (foreign key)
FROM campaign_profile cp
LEFT JOIN brand_profile bp ON cp.brand_id = bp.id

-- DEPRECATED: Using campaign_ids[] array
FROM campaign_profile cp
LEFT JOIN brand_profile bp ON cp.id = ANY(bp.campaign_ids)
```

---

## Prevention for Future

### Recommendations

1. **Add Database Constraint** (Optional)
   ```sql
   -- Ensure campaign_ids[] matches reality
   CREATE OR REPLACE FUNCTION sync_campaign_ids()
   RETURNS TRIGGER AS $$
   BEGIN
       -- When campaign.brand_id changes, update old and new brand's campaign_ids
       -- This keeps the array in sync automatically
   END;
   $$ LANGUAGE plpgsql;
   ```

2. **Use brand_id Only**
   - Always use `campaign_profile.brand_id` for joins
   - Consider removing `brand_profile.campaign_ids[]` in future major version

3. **Validation in Application**
   - When creating campaigns, set `brand_id`
   - Optionally update `brand_profile.campaign_ids[]` for backward compatibility

---

## Testing

### Manual Test Steps
1. ✅ Start backend: `cd astegni-backend && python app.py`
2. ✅ Open `manage-campaign.html` in browser
3. ✅ Check campaign-requests-widget - should show correct brand names
4. ✅ Check campaign panels (requested, verified, etc.) - should show correct brands
5. ✅ Verify no "Ethiopian Airlines" appears for "Test brand" campaigns

### API Test
```bash
curl http://localhost:8000/api/admin-advertisers/campaigns?status=pending
```

Should return campaigns with correct `brand_name` matching `brand_id`.

---

## Rollback (If Needed)

If issues occur, the migration can be reversed:
```python
# Restore original campaign_ids arrays
UPDATE brand_profile SET campaign_ids = '{3}' WHERE id = 3;  # Ethiopian Airlines
UPDATE brand_profile SET campaign_ids = '{2}' WHERE id = 2;  # Dashen Bank
UPDATE brand_profile SET campaign_ids = '{4}' WHERE id = 4;  # Awash Bank
```

However, this is **NOT recommended** as it brings back the duplicate ownership issue.

---

## Summary

✅ **Problem:** Campaigns showing wrong brand names due to duplicate ownership
✅ **Cause:** Multiple brands claiming same campaigns via `campaign_ids[]` array
✅ **Solution:** Use `campaign_profile.brand_id` (proper FK) instead of array join
✅ **Data Fixed:** Removed duplicate claims, synced arrays with `brand_id`
✅ **Backend Updated:** Changed JOIN logic in 2 API endpoints
✅ **Verified:** Campaign 3 now correctly shows "Test brand" instead of "Ethiopian Airlines"
✅ **Frontend:** No changes needed - already using API correctly

**Migration file:** `migrate_fix_campaign_brand_ownership.py`
**Can be re-run safely:** Yes (idempotent)
**Production ready:** Yes - test on staging first

---

## Next Steps

1. **Test in staging/development** - Verify all campaign pages work correctly
2. **Monitor production** - Check for any edge cases after deployment
3. **Consider cleanup** - In future version, remove `brand_profile.campaign_ids[]` entirely
4. **Update other endpoints** - Search codebase for other uses of `campaign_ids[]` array joins

---

**Status:** ✅ Complete and verified
**Impact:** High (fixes incorrect data display across admin dashboard)
**Risk:** Low (proper FK relationship, data verified)
