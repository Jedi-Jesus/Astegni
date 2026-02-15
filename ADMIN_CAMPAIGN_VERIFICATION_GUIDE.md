# Admin Campaign Verification Guide

## How It Works

The admin interface at [manage-campaign.html](admin-pages/manage-campaign.html) automatically displays campaigns that have been submitted for verification by advertisers.

### Flow Overview

```
Advertiser Side                     Backend API                      Admin Side
━━━━━━━━━━━━━━                     ━━━━━━━━━━━                     ━━━━━━━━━━

1. Create Campaign
   ↓
2. Click "Submit for
   Verification"
   ↓
3. POST /api/advertiser/
   campaigns/{id}/
   submit-for-verification
                                    4. Set submit_for_
                                       verification = true
                                       ↓
                                    5. Campaign now
                                       appears in query
                                                                   6. Navigate to
                                                                      "Campaign Requests"
                                                                      ↓
                                                                   7. GET /api/admin/
                                                                      campaigns?status=pending
                                                                      ↓
                                                                   8. Backend filters by:
                                                                      submit_for_verification=true
                                                                      ↓
                                                                   9. Campaign appears
                                                                      in table!
```

## Admin Pages Setup

### 1. Navigation to Campaign Requests

**File**: [admin-pages/manage-campaign.html](admin-pages/manage-campaign.html)

The page has a sidebar with these panels:
- 🏠 Dashboard
- 📋 **Campaign Requests** ← This is where submitted campaigns appear
- ✅ Verified Campaigns
- ❌ Rejected Campaigns
- 🚫 Suspended Campaigns

### 2. Campaign Requests Panel

**Location**: Lines 388-460 in manage-campaign.html

**Panel ID**: `campaign-requested-panel`
**Table Body ID**: `campaign-requests-table-body`

The panel includes:
- Statistics cards (Pending Requests, Under Review, Approved Today, Total Budget)
- Search and filter controls
- Table with columns:
  - Brand Name
  - Campaign Name
  - Package
  - Target Audience
  - Submitted Date
  - Actions (View button)

### 3. JavaScript Loading Logic

**File**: [admin-pages/js/admin-pages/manage-advertisers-standalone.js](admin-pages/js/admin-pages/manage-advertisers-standalone.js)

**Key Functions**:

#### Panel Switching (Line 737)
```javascript
if (panelName === 'campaign-requested') status = 'pending';
```

When admin clicks "Campaign Requests", it sets `status = 'pending'`

#### API Call (Line 777)
```javascript
const endpoint = `${ADVERTISERS_API_URL}/api/admin-advertisers/campaigns?status=${status}`;
```

Makes request to: `GET /api/admin-advertisers/campaigns?status=pending`

#### Data Loading (Lines 788-792)
```javascript
const data = await response.json();
const items = data.campaigns;
this.renderList(type, status, items, panelName);
```

Receives campaigns array and renders them in the table

#### Campaign Row Rendering (Lines 880-918)
```javascript
renderCampaignRow(campaign, status) {
    return `
        <tr onclick="viewCampaign(...)">
            <td>Brand Name</td>
            <td>Campaign Name</td>
            <td>Package</td>
            <td>Target Audience</td>
            <td>Submitted Date</td>
            <td><button>View</button></td>
        </tr>
    `;
}
```

Creates table rows for each campaign

## Backend API Filter

**File**: [astegni-backend/admin_advertisers_endpoints.py](astegni-backend/admin_advertisers_endpoints.py)

**Endpoint**: `GET /api/admin-advertisers/campaigns?status=pending`

**Key Logic** (Lines 413-419):
```python
if status == 'pending' or status == 'requested':
    # Only show campaigns that have been submitted for verification
    where_clauses.append(
        "((cp.verification_status = 'pending' OR cp.verification_status IS NULL) "
        "AND cp.submit_for_verification = true)"
    )
```

**What This Means**:
- ✅ Shows campaigns where `submit_for_verification = true`
- ❌ Hides draft campaigns (not yet submitted)
- ❌ Hides already verified campaigns
- ✅ Only shows campaigns pending admin review

## Testing the Flow

### Step 1: Advertiser Submits Campaign
1. Login as advertiser at http://localhost:8081
2. Navigate to advertiser profile
3. Create or select a campaign
4. Click **"Submit for Verification"** button
5. Confirm the submission

**Expected Result**:
- Button changes state
- Campaign status shows "Pending Verification"
- Campaign `submit_for_verification` field set to `true` in database

### Step 2: Admin Reviews Campaign
1. Login as admin at http://localhost:8081/admin-pages/manage-campaign.html
2. Click **"Campaign Requests"** in sidebar
3. See the submitted campaign in the table

**Expected Result**:
- Campaign appears in "Pending Campaign Requests" table
- Shows: Brand Name, Campaign Name, Package, Target Audience, Submitted Date
- "View" button available for detailed review

### Step 3: Verify Database
```sql
-- Check submitted campaigns
SELECT
    id,
    name,
    submit_for_verification,
    is_verified,
    verification_status,
    created_at
FROM campaign_profile
WHERE submit_for_verification = true;
```

**Expected Result**:
```
id | name           | submit_for_verification | is_verified | verification_status
---+----------------+------------------------+-------------+--------------------
1  | Spring Sale    | true                   | false       | pending
2  | Summer Promo   | true                   | false       | pending
```

## API Response Format

**Request**: `GET /api/admin-advertisers/campaigns?status=pending`

**Response**:
```json
{
  "campaigns": [
    {
      "id": 1,
      "campaign_name": "Spring Sale",
      "brand_name": "Acme Corp",
      "brand_logo": "https://...",
      "campaign_image": "https://...",
      "package_name": "Premium",
      "target_audience": "Students",
      "created_at": "2026-02-12T10:00:00",
      "verification_status": "pending",
      "is_verified": false,
      "submit_for_verification": true,  ← KEY FIELD
      "campaign_budget": 50000.00
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "pages": 1
}
```

## Admin Actions Available

When viewing a campaign, admins can:

1. **View Details**: Click campaign row or "View" button
   - Opens modal with full campaign details
   - Shows all targeting, budget, media, etc.

2. **Verify Campaign**: (In modal)
   - Approve the campaign
   - Sets `is_verified = true`
   - Campaign can now be launched by advertiser

3. **Reject Campaign**: (In modal)
   - Reject with reason
   - Sets `verification_status = 'rejected'`
   - Optionally provide feedback to advertiser

4. **Suspend Campaign**: (In modal)
   - Temporarily suspend if needed
   - Sets `verification_status = 'suspended'`

## Important Notes

### ⚠️ Key Behaviors

1. **Only Submitted Campaigns Appear**
   - Draft campaigns (not submitted) will NOT appear in admin panel
   - Advertiser must explicitly click "Submit for Verification"

2. **Edit Resets Verification**
   - When advertiser edits campaign, `submit_for_verification` resets to `false`
   - Campaign disappears from admin panel until re-submitted
   - Ensures admins only see final, ready-for-review versions

3. **Verified Campaigns Don't Appear Here**
   - Once verified (`is_verified = true`), campaigns move to "Verified Campaigns" panel
   - "Campaign Requests" only shows pending submissions

### 🔄 Workflow States

```
Draft → Submitted → Pending Review → Verified → Launchable
  ↑         ↓              ↓             ↓
  └─────────┴──────────────┘             │
       (Edit resets)                     │
                                         ↓
                                    Can Launch
```

## Troubleshooting

### Issue: No campaigns showing in admin panel

**Possible Causes**:
1. ✅ No campaigns have been submitted (check advertiser side)
2. ✅ Campaigns are still in draft (not yet submitted)
3. ❌ API endpoint not working (check backend logs)
4. ❌ Frontend not loading data (check browser console)

**Debug Steps**:
```sql
-- Check database
SELECT COUNT(*)
FROM campaign_profile
WHERE submit_for_verification = true;
```

If count > 0 but still not showing:
- Check browser console for errors
- Check network tab for API response
- Verify backend is running on port 8000

### Issue: Campaign disappears after edit

**This is expected behavior!**
- When advertiser edits campaign, it must be re-submitted
- Ensures quality control
- Admin only sees final versions

## Summary

The admin campaign verification system is **fully automated**:

✅ **No HTML changes needed** - Already configured in manage-campaign.html
✅ **No JavaScript changes needed** - Logic already handles status filtering
✅ **Backend API configured** - Filters by `submit_for_verification = true`
✅ **Database field added** - Migration already run

**The system is ready to use!**

Simply:
1. Advertiser submits campaign
2. Admin navigates to "Campaign Requests"
3. Campaign automatically appears
4. Admin reviews and verifies

That's it! The verification workflow is complete and operational.
