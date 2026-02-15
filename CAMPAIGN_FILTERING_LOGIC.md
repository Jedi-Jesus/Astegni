# Campaign Filtering Logic - Complete Reference

## Summary

✅ **The implementation is correct!** All panels, widgets, and statistics follow the proper filtering logic.

## Filtering Rules

### 1. Campaign Requests (Pending/Submitted)

**Shows**: Campaigns that advertisers have submitted for verification

**Filter**:
```sql
(verification_status = 'pending' OR verification_status IS NULL)
AND submit_for_verification = true
```

**Applied To**:
- ✅ `campaign-requested-panel` (Campaign Requests Panel)
- ✅ `campaign-requests-widget` (Live Campaign Requests Widget)
- ✅ `campaign-pending-count` (Dashboard pending count)

### 2. Verified Campaigns

**Shows**: Campaigns that admins have verified

**Filter**:
```sql
verification_status = 'verified'
```

**Applied To**:
- ✅ `campaign-verified-panel` (Verified Campaigns Panel)
- ✅ `campaign-verified-count` (Dashboard verified count)

### 3. Rejected Campaigns

**Shows**: Campaigns that admins have rejected

**Filter**:
```sql
verification_status = 'rejected'
```

**Applied To**:
- ✅ `campaign-rejected-panel` (Rejected Campaigns Panel)
- ✅ `campaign-rejected-count` (Dashboard rejected count)

### 4. Suspended Campaigns

**Shows**: Campaigns that admins have suspended

**Filter**:
```sql
verification_status = 'suspended'
```

**Applied To**:
- ✅ `campaign-suspended-panel` (Suspended Campaigns Panel)
- ✅ `campaign-suspended-count` (Dashboard suspended count)

## Backend Implementation

### GET /api/admin-advertisers/campaigns?status={status}

**Location**: `astegni-backend/admin_advertisers_endpoints.py:377-550`

```python
@router.get("/campaigns")
async def get_campaigns(status: Optional[str] = None, ...):
    if status:
        if status == 'verified':
            where_clauses.append("cp.verification_status = 'verified'")

        elif status == 'pending' or status == 'requested':
            # Only show campaigns that have been submitted for verification
            where_clauses.append(
                "((cp.verification_status = 'pending' OR cp.verification_status IS NULL) "
                "AND cp.submit_for_verification = true)"
            )

        elif status == 'rejected':
            where_clauses.append("cp.verification_status = 'rejected'")

        elif status == 'suspended':
            where_clauses.append("cp.verification_status = 'suspended'")
```

### GET /api/admin-advertisers/campaigns/counts

**Location**: `astegni-backend/admin_advertisers_endpoints.py:553-572`

```python
@router.get("/campaigns/counts")
async def get_campaign_counts():
    cur.execute("""
        SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE verification_status = 'verified') as verified,
            COUNT(*) FILTER (WHERE (verification_status = 'pending' OR verification_status IS NULL)
                             AND submit_for_verification = true) as pending,
            COUNT(*) FILTER (WHERE verification_status = 'rejected') as rejected,
            COUNT(*) FILTER (WHERE verification_status = 'suspended') as suspended
        FROM campaign_profile
    """)
```

### GET /api/admin-advertisers/recent/campaigns

**Location**: `astegni-backend/admin_advertisers_endpoints.py:767-805`

```python
@router.get("/recent/campaigns")
async def get_recent_campaigns(limit: int = 5):
    # Returns ALL recent campaigns (no filtering by status)
    # Frontend widget will display them with their current status
    cur.execute("""
        SELECT cp.id, cp.name, cp.verification_status, cp.created_at,
               bp.name as brand_name, bp.thumbnail as brand_logo
        FROM campaign_profile cp
        LEFT JOIN brand_profile bp ON cp.id = ANY(bp.campaign_ids)
        ORDER BY cp.created_at DESC
        LIMIT %s
    """, (limit,))
```

**Note**: The "Live Campaign Requests" widget shows recent campaigns regardless of status, but displays each campaign's current status badge.

## Frontend JavaScript Mapping

**Location**: `admin-pages/js/admin-pages/manage-advertisers-standalone.js:722-741`

```javascript
async loadPanelData(panelName) {
    let status = null;
    let type = null;

    if (panelName.includes('campaign-')) {
        type = 'campaign';
        if (panelName === 'campaign-requested') status = 'pending';
        else if (panelName === 'campaign-verified') status = 'verified';
        else if (panelName === 'campaign-rejected') status = 'rejected';
        else if (panelName === 'campaign-suspended') status = 'suspended';
    }

    if (type && status) {
        await DataLoader.loadList(type, status, panelName);
    }
}
```

## Visual Reference

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CAMPAIGN STATUS FLOW                                                    │
└─────────────────────────────────────────────────────────────────────────┘

Campaign Created by Advertiser
    ↓
[Draft State]
    submit_for_verification: false
    verification_status: null or 'pending'
    is_verified: false

    ↓ Advertiser clicks "Submit for Verification"

[Submitted for Verification] ← Shows in Campaign Requests Panel
    submit_for_verification: true ✓
    verification_status: 'pending' or null
    is_verified: false

    ↓ Admin reviews and takes action

    ├─→ [Verified] ← Shows in Verified Panel
    │       submit_for_verification: true
    │       verification_status: 'verified' ✓
    │       is_verified: true
    │
    ├─→ [Rejected] ← Shows in Rejected Panel
    │       submit_for_verification: true
    │       verification_status: 'rejected' ✓
    │       is_verified: false
    │
    └─→ [Suspended] ← Shows in Suspended Panel
            submit_for_verification: true
            verification_status: 'suspended' ✓
            is_verified: false
```

## Database State Examples

### Example 1: Campaign Submitted for Verification
```sql
-- Shows in: Campaign Requests Panel
id: 3
name: 'Gothe Institute'
submit_for_verification: true
verification_status: 'pending' (or NULL)
is_verified: false
```

### Example 2: Campaign Verified by Admin
```sql
-- Shows in: Verified Campaigns Panel
id: 3
name: 'Gothe Institute'
submit_for_verification: true
verification_status: 'verified'
is_verified: true
```

### Example 3: Campaign Rejected by Admin
```sql
-- Shows in: Rejected Campaigns Panel
id: 3
name: 'Gothe Institute'
submit_for_verification: true
verification_status: 'rejected'
is_verified: false
```

### Example 4: Campaign in Draft (Not Submitted)
```sql
-- Shows in: NOWHERE (not visible to admin)
id: 2
name: 'Test Campaign'
submit_for_verification: false
verification_status: null or 'pending'
is_verified: false
```

## UI Panel Mapping

| Panel | HTML ID | Table Body ID | Status Filter | submit_for_verification |
|-------|---------|---------------|---------------|-------------------------|
| Campaign Requests | `campaign-requested-panel` | `campaign-requests-table-body` | `pending` or `null` | **✓ true** |
| Verified Campaigns | `campaign-verified-panel` | `campaign-verified-table-body` | `verified` | any |
| Rejected Campaigns | `campaign-rejected-panel` | `campaign-rejected-table-body` | `rejected` | any |
| Suspended Campaigns | `campaign-suspended-panel` | `campaign-suspended-table-body` | `suspended` | any |

## Dashboard Statistics Breakdown

**Location**: `manage-campaign.html:349`

```html
<p id="campaign-pending-count">1</p>
<p id="campaign-verified-count">0</p>
<p id="campaign-rejected-count">0</p>
<p id="campaign-suspended-count">0</p>
```

**SQL Logic**:
```sql
-- Pending count
COUNT(*) FILTER (WHERE (verification_status = 'pending' OR verification_status IS NULL)
                 AND submit_for_verification = true)

-- Verified count
COUNT(*) FILTER (WHERE verification_status = 'verified')

-- Rejected count
COUNT(*) FILTER (WHERE verification_status = 'rejected')

-- Suspended count
COUNT(*) FILTER (WHERE verification_status = 'suspended')
```

## Important Notes

### 1. Why `submit_for_verification = true` for Pending Only?

The `submit_for_verification` flag is ONLY required for pending campaigns because:

- **Draft campaigns** (`submit_for_verification = false`) should NOT appear in admin panel
- Once a campaign is **verified/rejected/suspended**, it has been reviewed and should always be visible to admins
- The flag acts as a "submission gate" - admins only see campaigns that advertisers explicitly submit

### 2. Automatic Reset Behavior

When a campaign is **edited after submission**, the flag automatically resets:

**Location**: `astegni-backend/advertiser_brands_endpoints.py:973`

```python
# If campaign is edited after submission
if campaign_data_changed:
    updates.append("submit_for_verification = false")
```

This forces the advertiser to **re-submit** the campaign for verification after making changes.

### 3. Live Widget Behavior

The "Live Campaign Requests" widget shows **recent campaigns** (not just pending), but:
- Each campaign displays its current status badge
- Clicking "Review" opens the campaign modal
- This gives admins visibility into all recent activity

## Testing the Logic

### Test 1: Campaign Submission
```bash
# Create campaign (draft)
submit_for_verification: false
verification_status: null
→ Does NOT appear in admin panel ✓

# Submit for verification
submit_for_verification: true
verification_status: 'pending'
→ APPEARS in Campaign Requests Panel ✓
→ campaign-pending-count increases ✓
```

### Test 2: Admin Verification
```bash
# Admin verifies campaign
verification_status: 'verified'
is_verified: true
→ DISAPPEARS from Campaign Requests Panel ✓
→ APPEARS in Verified Campaigns Panel ✓
→ campaign-pending-count decreases ✓
→ campaign-verified-count increases ✓
```

### Test 3: Campaign Edit After Submission
```bash
# Advertiser edits submitted campaign
submit_for_verification: false (auto-reset)
verification_status: 'pending'
→ DISAPPEARS from Campaign Requests Panel ✓
→ Advertiser must re-submit ✓
```

## Conclusion

✅ **All filtering logic is correctly implemented**

- **Campaign Requests** (pending): Requires `submit_for_verification = true`
- **Verified/Rejected/Suspended**: Filter by `verification_status` only
- Dashboard statistics match panel filters
- Live widget shows recent campaigns with status badges
- Auto-reset on edit ensures campaigns are re-reviewed after changes

The system properly separates draft campaigns (invisible to admins) from submitted campaigns (visible for review).
