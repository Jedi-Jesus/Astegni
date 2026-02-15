# manage-campaign.html - Data Flow Architecture

## Overview

This document explains how campaign data flows through `manage-campaign.html`, from database to UI elements, including all panels, widgets, and counts.

## Architecture Components

### 1. HTML Elements (manage-campaign.html)

#### A. Dashboard Statistics
```html
<!-- Line 349: Pending count display -->
<p id="campaign-pending-count">0</p>

<!-- Lines 1033-1063: Quota widget bars -->
<span id="quota-campaign-verified">0</span>
<div id="quota-campaign-verified-bar"></div>
<span id="quota-campaign-pending">0</span>
<div id="quota-campaign-pending-bar"></div>
<span id="quota-campaign-rejected">0</span>
<div id="quota-campaign-rejected-bar"></div>
<span id="quota-campaign-suspended">0</span>
<div id="quota-campaign-suspended-bar"></div>
```

#### B. Panel Navigation (Sidebar)
```html
<!-- Lines 147-166: Sidebar links -->
<a onclick="switchPanel('campaign-requested')" data-panel="campaign-requested">
    Campaign Requests
</a>
<a onclick="switchPanel('campaign-verified')" data-panel="campaign-verified">
    Verified Campaigns
</a>
<a onclick="switchPanel('campaign-rejected')" data-panel="campaign-rejected">
    Rejected Campaigns
</a>
<a onclick="switchPanel('campaign-suspended')" data-panel="campaign-suspended">
    Suspended Campaigns
</a>
```

#### C. Panel Content Areas
```html
<!-- Line 407: Campaign Requests Panel -->
<div id="campaign-requested-panel" class="panel-content hidden">
    <table>
        <tbody id="campaign-requests-table-body"></tbody>
    </table>
</div>

<!-- Line 482: Verified Campaigns Panel -->
<div id="campaign-verified-panel" class="panel-content hidden">
    <table>
        <tbody id="campaign-verified-table-body"></tbody>
    </table>
</div>

<!-- Line 535: Rejected Campaigns Panel -->
<div id="campaign-rejected-panel" class="panel-content hidden">
    <table>
        <tbody id="campaign-rejected-table-body"></tbody>
    </table>
</div>

<!-- Line 588: Suspended Campaigns Panel -->
<div id="campaign-suspended-panel" class="panel-content hidden">
    <table>
        <tbody id="campaign-suspended-table-body"></tbody>
    </table>
</div>
```

#### D. Live Campaign Requests Widget
```html
<!-- Line 1008: Right sidebar widget -->
<div id="campaign-requests-widget" class="admin-widget-card">
    <h3>📢 Live Campaign Requests</h3>
    <div id="live-campaign-requests">
        <!-- Populated by JavaScript -->
    </div>
</div>
```

### 2. JavaScript Flow (manage-advertisers-standalone.js)

#### A. Initialization Sequence

```javascript
// On page load:
document.addEventListener('DOMContentLoaded', () => {
    1. ModeManager.init('campaign')
    2. ModeManager.loadModeData('campaign')
});
```

#### B. ModeManager - Data Loading (Lines 314-360)

**Function**: `loadCampaignData()`

```javascript
async loadCampaignData() {
    // Step 1: Fetch campaign counts from API
    const response = await fetch(
        `${API_URL}/api/admin-advertisers/campaigns/counts`
    );
    const counts = await response.json();
    // Returns: { verified: 0, pending: 1, rejected: 0, suspended: 0, total: 1 }

    // Step 2: Update dashboard statistics
    document.getElementById('campaign-pending-count').textContent = counts.pending;
    document.getElementById('campaign-verified-count').textContent = counts.verified;
    document.getElementById('campaign-rejected-count').textContent = counts.rejected;
    document.getElementById('campaign-suspended-count').textContent = counts.suspended;

    // Step 3: Update quota widget bars
    this.updateCampaignQuotaWidget(counts);

    // Step 4: Load recent campaigns for live widget
    await this.loadRecentCampaigns();
}
```

#### C. Live Widget Population (Lines 362-425)

**Function**: `loadRecentCampaigns()`

```javascript
async loadRecentCampaigns() {
    // Fetch 5 most recent campaigns
    const response = await fetch(
        `${API_URL}/api/admin-advertisers/recent/campaigns?limit=5`
    );
    const campaigns = await response.json();

    // Render in live widget
    this.updateLiveCampaignWidget(campaigns);
}

updateLiveCampaignWidget(campaigns) {
    const container = document.getElementById('live-campaign-requests');

    // Create HTML for each campaign
    container.innerHTML = campaigns.map(campaign => `
        <div class="advertiser-request-item">
            <img src="${campaign.campaign_image}">
            <span>${campaign.campaign_name}</span>
            <span class="status-tag">${campaign.verification_status}</span>
            <span>${campaign.brand_name}</span>
            <button onclick="viewCampaign(...)">Review</button>
        </div>
    `).join('');
}
```

#### D. Panel Switching (Lines 667-720)

**Function**: `switchPanel(panelName)`

```javascript
switchPanel(panelName) {
    // Example: panelName = 'campaign-requested'

    // Step 1: Hide all panels
    document.querySelectorAll('.panel-content').forEach(panel => {
        panel.classList.add('hidden');
        panel.classList.remove('active');
    });

    // Step 2: Show selected panel
    const selectedPanel = document.getElementById(`${panelName}-panel`);
    selectedPanel.classList.remove('hidden');
    selectedPanel.classList.add('active');

    // Step 3: Update sidebar highlighting
    this.updateSidebarLinks(panelName);

    // Step 4: Load panel-specific data
    this.loadPanelData(panelName);
}
```

#### E. Panel Data Loading (Lines 722-842)

**Function**: `loadPanelData(panelName)`

```javascript
async loadPanelData(panelName) {
    // Map panel name to status
    let status = null;
    if (panelName === 'campaign-requested') status = 'pending';
    else if (panelName === 'campaign-verified') status = 'verified';
    else if (panelName === 'campaign-rejected') status = 'rejected';
    else if (panelName === 'campaign-suspended') status = 'suspended';

    // Load data for the panel
    if (status) {
        await DataLoader.loadList('campaign', status, panelName);
    }
}
```

#### F. DataLoader - Campaign List Loading (Lines 773-842)

**Function**: `loadList(type, status, panelName)`

```javascript
async loadList(type, status, panelName) {
    // type = 'campaign', status = 'pending', panelName = 'campaign-requested'

    // Step 1: Build API endpoint
    const endpoint = `${API_URL}/api/admin-advertisers/campaigns?status=${status}`;

    // Step 2: Fetch campaigns
    const response = await fetch(endpoint);
    const data = await response.json();
    const campaigns = data.campaigns;
    // Returns array of campaign objects with submit_for_verification: true

    // Step 3: Render campaigns in table
    this.renderList('campaign', status, campaigns, panelName);
}

renderList(type, status, items, panelName) {
    // Get table body ID
    const tableBodyId = this.getTableBodyId(panelName);
    // Returns: 'campaign-requests-table-body'

    const container = document.getElementById(tableBodyId);

    // Render campaign rows
    container.innerHTML = items.map(campaign =>
        this.renderCampaignRow(campaign, status)
    ).join('');
}

renderCampaignRow(campaign, status) {
    return `
        <tr onclick="viewCampaign('${JSON.stringify(campaign)}', '${status}')">
            <td>
                <img src="${campaign.brand_logo}">
                ${campaign.brand_name}
            </td>
            <td>
                <img src="${campaign.campaign_image}">
                ${campaign.campaign_name}
            </td>
            <td>${campaign.package_name}</td>
            <td>${campaign.target_audience}</td>
            <td>${campaign.created_at}</td>
            <td>
                <button onclick="viewCampaign(...)">View</button>
            </td>
        </tr>
    `;
}
```

#### G. Table Body ID Mapping (Lines 759-771)

```javascript
getTableBodyId(panelName) {
    const mapping = {
        'campaign-requested': 'campaign-requests-table-body',
        'campaign-verified': 'campaign-verified-table-body',
        'campaign-rejected': 'campaign-rejected-table-body',
        'campaign-suspended': 'campaign-suspended-table-body'
    };
    return mapping[panelName];
}
```

### 3. Backend API Endpoints

#### A. Campaign Counts Endpoint

**URL**: `GET /api/admin-advertisers/campaigns/counts`

**Location**: `astegni-backend/admin_advertisers_endpoints.py:503-524`

```python
@router.get("/campaigns/counts")
async def get_campaign_counts():
    with get_user_db() as conn:
        with conn.cursor() as cur:
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
            return cur.fetchone()
```

**Response**:
```json
{
  "total": 3,
  "verified": 0,
  "pending": 1,
  "rejected": 0,
  "suspended": 0
}
```

#### B. Campaign List Endpoint

**URL**: `GET /api/admin-advertisers/campaigns?status={status}`

**Location**: `astegni-backend/admin_advertisers_endpoints.py:377-545`

```python
@router.get("/campaigns")
async def get_campaigns(status: str, page: int = 1, limit: int = 20):
    with get_user_db() as conn:
        with conn.cursor() as cur:
            # Build query based on status
            where_clause = ""
            if status == 'pending':
                where_clause = "((cp.verification_status = 'pending' OR cp.verification_status IS NULL)
                                AND cp.submit_for_verification = true)"
            elif status == 'verified':
                where_clause = "cp.verification_status = 'verified'"
            elif status == 'rejected':
                where_clause = "cp.verification_status = 'rejected'"
            elif status == 'suspended':
                where_clause = "cp.verification_status = 'suspended'"

            # Fetch campaigns
            cur.execute(f"""
                SELECT cp.*, bp.name as brand_name, bp.thumbnail as brand_logo
                FROM campaign_profile cp
                LEFT JOIN brand_profile bp ON cp.id = ANY(bp.campaign_ids)
                WHERE {where_clause}
                ORDER BY cp.created_at DESC
            """)
            campaigns = cur.fetchall()

            # Aggregate metrics from related tables
            # (impressions, clicks, conversions, likes, shares, comments)
            # Get thumbnails from campaign_media

            return {"campaigns": campaigns, "total": len(campaigns), "page": page}
```

**Response**:
```json
{
  "campaigns": [
    {
      "id": 3,
      "campaign_name": "Gothe Institute",
      "campaign_image": "https://f003.backblazeb2.com/file/...",
      "verification_status": "pending",
      "is_verified": false,
      "submit_for_verification": true,
      "impressions": 0,
      "clicks": 0,
      "conversions": 0,
      "likes": 0,
      "shares": 0,
      "comments": 0,
      "campaign_budget": 1000000.0,
      "brand_name": "Test brand",
      "brand_logo": null,
      "brand_id": 17,
      "package_name": "Custom",
      "created_at": "2026-02-12 03:12:47"
    }
  ],
  "total": 1,
  "page": 1
}
```

#### C. Recent Campaigns Endpoint

**URL**: `GET /api/admin-advertisers/recent/campaigns?limit=5`

**Location**: `astegni-backend/admin_advertisers_endpoints.py:767-805`

```python
@router.get("/recent/campaigns")
async def get_recent_campaigns(limit: int = 5):
    with get_user_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT cp.id, cp.name, cp.verification_status, cp.created_at,
                       bp.name as brand_name, bp.thumbnail as brand_logo
                FROM campaign_profile cp
                LEFT JOIN brand_profile bp ON cp.id = ANY(bp.campaign_ids)
                ORDER BY cp.created_at DESC
                LIMIT %s
            """, (limit,))
            campaigns = cur.fetchall()

            # Get thumbnails from campaign_media

            return campaigns
```

### 4. Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ DATABASE: astegni_user_db                                       │
├─────────────────────────────────────────────────────────────────┤
│ campaign_profile                                                │
│   - id, name, verification_status, submit_for_verification      │
│   - campaign_budget, start_date, ended_at, etc.                 │
│                                                                  │
│ campaign_media                                                  │
│   - campaign_id, file_url, media_type, placement               │
│                                                                  │
│ campaign_impressions                                            │
│   - campaign_id, clicked, converted                            │
│                                                                  │
│ campaign_engagement                                             │
│   - campaign_id, engagement_type (like/share/comment)          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND API: admin_advertisers_endpoints.py                     │
├─────────────────────────────────────────────────────────────────┤
│ GET /api/admin-advertisers/campaigns/counts                     │
│   → Returns: { verified, pending, rejected, suspended, total }  │
│                                                                  │
│ GET /api/admin-advertisers/campaigns?status=pending             │
│   → Returns: { campaigns: [...], total, page }                  │
│   → Filters: submit_for_verification = true                     │
│   → Aggregates: impressions, clicks, likes from related tables  │
│                                                                  │
│ GET /api/admin-advertisers/recent/campaigns?limit=5             │
│   → Returns: [campaign1, campaign2, ...]                        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND JS: manage-advertisers-standalone.js                   │
├─────────────────────────────────────────────────────────────────┤
│ ModeManager.loadCampaignData()                                  │
│   ├─ Fetch /campaigns/counts                                    │
│   ├─ Update #campaign-pending-count                             │
│   ├─ Update #quota-campaign-verified-bar                        │
│   └─ Call loadRecentCampaigns()                                 │
│                                                                  │
│ ModeManager.loadRecentCampaigns()                               │
│   ├─ Fetch /recent/campaigns?limit=5                            │
│   └─ Update #live-campaign-requests widget                      │
│                                                                  │
│ PanelManager.switchPanel('campaign-requested')                  │
│   ├─ Hide all panels                                            │
│   ├─ Show #campaign-requested-panel                             │
│   └─ Call loadPanelData('campaign-requested')                   │
│                                                                  │
│ PanelManager.loadPanelData('campaign-requested')                │
│   ├─ Map to status: 'pending'                                   │
│   └─ Call DataLoader.loadList('campaign', 'pending', ...)       │
│                                                                  │
│ DataLoader.loadList('campaign', 'pending', ...)                 │
│   ├─ Fetch /campaigns?status=pending                            │
│   ├─ Get tableBodyId: 'campaign-requests-table-body'            │
│   └─ Render rows in #campaign-requests-table-body               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ HTML UI: manage-campaign.html                                   │
├─────────────────────────────────────────────────────────────────┤
│ Dashboard Statistics:                                           │
│   <p id="campaign-pending-count">1</p>                          │
│   <div id="quota-campaign-verified-bar" style="width: 0%">      │
│                                                                  │
│ Live Widget:                                                    │
│   <div id="live-campaign-requests">                             │
│     [Gothe Institute campaign card with Review button]          │
│   </div>                                                        │
│                                                                  │
│ Campaign Requests Panel:                                        │
│   <div id="campaign-requested-panel" class="active">            │
│     <tbody id="campaign-requests-table-body">                   │
│       <tr onclick="viewCampaign(...)">                          │
│         [Gothe Institute row with View button]                  │
│       </tr>                                                     │
│     </tbody>                                                    │
│   </div>                                                        │
└─────────────────────────────────────────────────────────────────┘
```

## Key Points

### 1. Status Filtering

The `submit_for_verification` field is critical for the "pending" status:

```sql
-- Backend query for pending campaigns
WHERE ((cp.verification_status = 'pending' OR cp.verification_status IS NULL)
       AND cp.submit_for_verification = true)
```

Only campaigns where **submit_for_verification = true** appear in:
- Campaign Requests panel
- Pending count
- Live requests widget

### 2. Panel-to-Table Mapping

| Panel ID | Status | Table Body ID |
|----------|--------|---------------|
| `campaign-requested-panel` | `pending` | `campaign-requests-table-body` |
| `campaign-verified-panel` | `verified` | `campaign-verified-table-body` |
| `campaign-rejected-panel` | `rejected` | `campaign-rejected-table-body` |
| `campaign-suspended-panel` | `suspended` | `campaign-suspended-table-body` |

### 3. Data Refresh Triggers

Data is refreshed when:
- Page loads (`DOMContentLoaded`)
- Panel is switched (`switchPanel()`)
- Campaign action is performed (verify/reject/suspend)
- Manual refresh by user

### 4. Metrics Aggregation

Campaign metrics are NOT stored in `campaign_profile` but aggregated from:
- **Impressions/Clicks/Conversions**: `campaign_impressions` table
- **Likes/Shares/Comments**: `campaign_engagement` table
- **Thumbnail**: `campaign_media` table (first image)

## Workflow Example

**Scenario**: Advertiser submits "Gothe Institute" campaign for verification

1. **Advertiser Action** (advertiser-profile.html):
   ```javascript
   BrandsManager.submitForVerification()
   → POST /api/advertiser/campaigns/3/submit-for-verification
   → Sets submit_for_verification = true in database
   ```

2. **Database State**:
   ```sql
   UPDATE campaign_profile
   SET submit_for_verification = true
   WHERE id = 3
   ```

3. **Admin Panel Loads** (manage-campaign.html):
   ```javascript
   ModeManager.loadCampaignData()
   → GET /api/admin-advertisers/campaigns/counts
   → Response: { pending: 1, ... }
   → Updates #campaign-pending-count to "1"
   ```

4. **Live Widget Updates**:
   ```javascript
   loadRecentCampaigns()
   → GET /api/admin-advertisers/recent/campaigns?limit=5
   → Renders "Gothe Institute" card in #live-campaign-requests
   ```

5. **Admin Clicks "Campaign Requests"**:
   ```javascript
   switchPanel('campaign-requested')
   → loadPanelData('campaign-requested')
   → DataLoader.loadList('campaign', 'pending', 'campaign-requested')
   → GET /api/admin-advertisers/campaigns?status=pending
   → Renders campaign row in #campaign-requests-table-body
   ```

6. **Admin Reviews Campaign**:
   ```javascript
   viewCampaign() → Opens modal with campaign details
   verifyCampaign() → POST /api/admin-advertisers/campaigns/3/verify
   → Sets verification_status = 'verified', is_verified = true
   → Refreshes data: loadModeData() + loadPanelData()
   ```

## Summary

- **Dashboard counts**: Populated by `/campaigns/counts` endpoint
- **Live widget**: Populated by `/recent/campaigns?limit=5` endpoint
- **Panel tables**: Populated by `/campaigns?status={status}` endpoint
- **Filtering**: Uses `submit_for_verification = true` for pending status
- **Metrics**: Aggregated from `campaign_impressions`, `campaign_engagement`, `campaign_media`
- **Refresh**: Automatic on panel switch and after admin actions
