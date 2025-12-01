# Manage Campaigns - Verification Workflow Guide

## Overview
The Manage Campaigns page implements a complete campaign verification workflow with panel-based organization, dynamic modals, and real-time updates.

## Panel Structure

### 1. **Requested Panel** (Pending Campaigns)
- **Status Filter**: `verification_status = 'pending'`
- **Table Columns**:
  - Company Name
  - Campaign Name
  - Ad Type
  - Target Audience
  - Submitted Date
  - Actions (View button)
- **Modal Buttons**:
  - ✅ **Approve** - Moves to Verified panel
  - ❌ **Reject** - Moves to Rejected panel (requires reason)

### 2. **Verified Panel** (Approved Campaigns)
- **Status Filter**: `verification_status = 'verified'`
- **Table Columns**:
  - Company Name
  - Campaign Name
  - Ad Type
  - Target Audience
  - Actions (View button)
- **Modal Buttons**:
  - ❌ **Reject** - Moves to Rejected panel (requires reason)
  - ⏸️ **Suspend** - Moves to Suspended panel (requires reason)

### 3. **Rejected Panel** (Rejected Campaigns)
- **Status Filter**: `verification_status = 'rejected'`
- **Table Columns**:
  - Company Name
  - Campaign Name
  - Ad Type
  - Rejected Date
  - Rejection Reason (truncated with tooltip)
  - Actions (View button)
- **Modal Buttons**:
  - 🔄 **Reconsider** - Moves back to Requested panel (clears rejection)

### 4. **Suspended Panel** (Suspended Campaigns)
- **Status Filter**: `verification_status = 'suspended'`
- **Table Columns**:
  - Company Name
  - Campaign Name
  - Ad Type
  - Suspended Date
  - Suspension Reason (truncated with tooltip)
  - Actions (View button)
- **Modal Buttons**:
  - ❌ **Reject** - Moves to Rejected panel (requires reason)
  - ✅ **Reinstate** - Moves back to Verified panel

## Status Transition Flow

```
┌─────────────┐
│  REQUESTED  │ (pending)
│   Panel     │
└──────┬──────┘
       │
       ├─ Approve ──────────┐
       │                    │
       ├─ Reject ────────┐  │
       │                 │  │
       v                 v  v
┌─────────────┐    ┌─────────────┐
│  REJECTED   │    │  VERIFIED   │
│   Panel     │    │   Panel     │
└──────┬──────┘    └──────┬──────┘
       │                  │
       │                  ├─ Suspend ────┐
       │                  │               │
       │                  ├─ Reject ──┐   │
       │                  │           │   │
       └─ Reconsider ─────┤           │   │
         (back to         │           │   │
          pending)        │           │   │
                          v           │   v
                    ┌─────────────┐   │
                    │  REJECTED   │◄──┤
                    │   Panel     │   │
                    └─────────────┘   │
                                      │
                                      v
                              ┌─────────────┐
                              │  SUSPENDED  │
                              │   Panel     │
                              └──────┬──────┘
                                     │
                                     ├─ Reinstate ──► (back to verified)
                                     │
                                     └─ Reject ─────► (to rejected)
```

## API Endpoints

### Get Campaigns (Panel-Specific)
```http
GET /api/manage-campaigns/campaigns?status={status}&search={query}&industry={industry}&ad_type={type}

Parameters:
- status: 'pending' | 'verified' | 'rejected' | 'suspended'
- search: Search query (optional)
- industry: Industry filter (optional)
- ad_type: Ad type filter (optional)
- limit: Results per page (default: 50)
- offset: Pagination offset (default: 0)

Response:
{
  "campaigns": [
    {
      "id": 1,
      "campaign_name": "Spring Sale 2024",
      "company_name": "Addis Tech Solutions",
      "ad_type": "video",
      "verification_status": "pending",
      "budget": 50000,
      "target_audience": ["Students", "Parents"],
      "target_region": ["Addis Ababa", "Bahir Dar"],
      "submitted_date": "2024-01-15T10:30:00",
      "rejected_reason": null,
      "suspended_reason": null,
      ...
    }
  ],
  "total_count": 25,
  "limit": 50,
  "offset": 0
}
```

### Get Campaign Details
```http
GET /api/manage-campaigns/campaigns/{campaign_id}

Response:
{
  "id": 1,
  "name": "Spring Sale 2024",
  "description": "Campaign description...",
  "verification_status": "pending",
  "budget": 50000,
  "start_date": "2024-02-01",
  "end_date": "2024-03-01",
  "creative_urls": ["https://...", "https://..."],
  "campaign_objective": "Brand Awareness",
  "target_audience": ["Students", "Parents"],
  "target_region": ["Addis Ababa"],
  "campaign_socials": {
    "facebook": "https://facebook.com/...",
    "instagram": "https://instagram.com/..."
  },
  "submitted_date": "2024-01-15T10:30:00",
  "submitted_reason": "Initial submission",
  "rejected_date": null,
  "rejected_reason": null,
  "suspended_date": null,
  "suspended_reason": null,
  "company_name": "Addis Tech Solutions",
  "industry": "Education"
}
```

### Update Campaign Status
```http
PUT /api/manage-campaigns/campaigns/{campaign_id}/status

Body:
{
  "new_status": "verified" | "rejected" | "suspended" | "pending",
  "reason": "Reason for rejection/suspension (required for reject/suspend)",
  "admin_id": 123
}

Response:
{
  "success": true,
  "message": "Campaign status updated from pending to verified",
  "campaign_id": 1,
  "old_status": "pending",
  "new_status": "verified",
  "reason": null,
  "timestamp": "2024-01-15T11:00:00"
}
```

## Frontend Implementation

### File Structure
```
manage-campaigns.html                 - Main HTML with panels and modals
js/admin-pages/
  manage-campaigns-standalone.js      - Navigation and panel switching
  manage-campaigns.js                 - Profile and stats loading
  manage-campaigns-data-loader.js     - Data fetching utilities
  manage-campaigns-table-loader.js    - Table rendering and modal logic
```

### Key Features

#### 1. Panel-Specific Data Loading
Each panel automatically loads campaigns filtered by `verification_status`:
- **Requested Panel**: Loads `status=pending`
- **Verified Panel**: Loads `status=verified`
- **Rejected Panel**: Loads `status=rejected`
- **Suspended Panel**: Loads `status=suspended`

#### 2. Search and Filters
Each panel has independent search and filter state:
```javascript
panelFilters = {
  requested: { search: '', industry: '', ad_type: '' },
  verified: { search: '', industry: '', ad_type: '' },
  rejected: { search: '', industry: '', ad_type: '' },
  suspended: { search: '', industry: '', ad_type: '' }
}
```

#### 3. Dynamic Modal Buttons
The view-campaign-modal shows different action buttons based on the campaign's `verification_status`:

**Pending (Requested Panel)**:
```javascript
renderModalActionButtons('pending', campaignId) {
  // Shows: Approve, Reject buttons
}
```

**Verified (Verified Panel)**:
```javascript
renderModalActionButtons('verified', campaignId) {
  // Shows: Reject, Suspend buttons
}
```

**Rejected (Rejected Panel)**:
```javascript
renderModalActionButtons('rejected', campaignId) {
  // Shows: Reconsider button
}
```

**Suspended (Suspended Panel)**:
```javascript
renderModalActionButtons('suspended', campaignId) {
  // Shows: Reject, Reinstate buttons
}
```

#### 4. Real-Time Updates
When any action is performed:
```javascript
async function updateCampaignStatus(campaignId, newStatus, reason) {
  // 1. Send PUT request to backend
  await fetch(`/api/manage-campaigns/campaigns/${campaignId}/status`, {...});

  // 2. IMMEDIATE table reload - all panels
  loadPanelData('requested');
  loadPanelData('verified');
  loadPanelData('rejected');
  loadPanelData('suspended');

  // 3. Refresh live widget
  loadLiveRequests();

  // 4. Show notification
  showNotification('Campaign updated!', 'success');
}
```

#### 5. Reason Prompts
Actions that require a reason show a prompt:
```javascript
window.handleModalReject = async function(campaignId) {
  const reason = prompt('Enter rejection reason (required):');
  if (reason && reason.trim()) {
    await updateCampaignStatus(campaignId, 'rejected', reason.trim());
    closeViewCampaignModal();
  }
}
```

#### 6. Creative Media Preview
The modal displays all campaign media with automatic type detection:
- **Videos**: Rendered with HTML5 `<video>` player
- **Images**: Rendered as clickable `<img>` tags
- **Other**: Displayed as download links

## Database Schema

### ad_campaigns Table
```sql
CREATE TABLE ad_campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    verification_status VARCHAR(50) DEFAULT 'pending',
    is_verified BOOLEAN DEFAULT FALSE,

    -- Dates
    start_date DATE,
    end_date DATE,
    submitted_date TIMESTAMP,
    verified_date TIMESTAMP,
    rejected_date TIMESTAMP,
    suspended_date TIMESTAMP,

    -- Reasons
    submitted_reason TEXT,
    rejected_reason TEXT,
    suspended_reason TEXT,

    -- Campaign details
    budget DECIMAL(15,2),
    ad_type VARCHAR(50),
    creative_urls TEXT[],
    objective VARCHAR(100),
    locations TEXT[],
    target_audience TEXT[],
    campaign_socials JSONB,

    -- Advertiser reference
    advertiser_id INTEGER REFERENCES advertiser_profiles(id),

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast filtering by status
CREATE INDEX idx_campaigns_verification_status ON ad_campaigns(verification_status);
```

## Status Transition Rules

### From Pending (Requested)
| Action | New Status | Required Fields | Backend Updates |
|--------|-----------|----------------|-----------------|
| Approve | verified | None | `verified_date = NOW()`, `is_verified = TRUE` |
| Reject | rejected | `rejected_reason` | `rejected_date = NOW()`, `rejected_reason = reason` |

### From Verified
| Action | New Status | Required Fields | Backend Updates |
|--------|-----------|----------------|-----------------|
| Reject | rejected | `rejected_reason` | `rejected_date = NOW()`, `rejected_reason = reason`, `is_verified = FALSE` |
| Suspend | suspended | `suspended_reason` | `suspended_date = NOW()`, `suspended_reason = reason`, `is_verified = FALSE` |

### From Rejected
| Action | New Status | Required Fields | Backend Updates |
|--------|-----------|----------------|-----------------|
| Reconsider | pending | None | Clear `rejected_date`, `rejected_reason`, set `submitted_date = NOW()` |

### From Suspended
| Action | New Status | Required Fields | Backend Updates |
|--------|-----------|----------------|-----------------|
| Reject | rejected | `rejected_reason` | `rejected_date = NOW()`, `rejected_reason = reason`, clear suspended fields |
| Reinstate | verified | None | `verified_date = NOW()`, `is_verified = TRUE`, clear suspended fields |

## Testing Workflow

### 1. Test Requested Panel
1. Navigate to manage-campaigns.html
2. Click "Campaign Requests" in sidebar
3. Verify table shows only pending campaigns
4. Click "View" on a campaign
5. Modal should show: **Approve** and **Reject** buttons

**Test Approve**:
- Click "Approve"
- Confirm action
- Campaign should immediately disappear from Requested panel
- Campaign should appear in Verified panel

**Test Reject**:
- Click "Reject"
- Enter rejection reason
- Campaign should immediately disappear from Requested panel
- Campaign should appear in Rejected panel with reason

### 2. Test Verified Panel
1. Click "Verified Campaigns" in sidebar
2. Verify table shows only verified campaigns
3. Click "View" on a campaign
4. Modal should show: **Reject** and **Suspend** buttons

**Test Reject from Verified**:
- Click "Reject"
- Enter reason
- Campaign moves to Rejected panel

**Test Suspend**:
- Click "Suspend"
- Enter suspension reason
- Campaign moves to Suspended panel with reason

### 3. Test Rejected Panel
1. Click "Rejected Campaigns" in sidebar
2. Verify table shows rejected campaigns with dates and reasons
3. Click "View" on a campaign
4. Modal should show: **Reconsider** button

**Test Reconsider**:
- Click "Reconsider"
- Confirm action
- Campaign moves back to Requested panel
- Rejection reason should be cleared

### 4. Test Suspended Panel
1. Click "Suspended Campaigns" in sidebar
2. Verify table shows suspended campaigns with dates and reasons
3. Click "View" on a campaign
4. Modal should show: **Reject** and **Reinstate** buttons

**Test Reinstate**:
- Click "Reinstate"
- Confirm action
- Campaign moves to Verified panel
- Suspension fields cleared

**Test Reject from Suspended**:
- Click "Reject"
- Enter reason
- Campaign moves to Rejected panel

### 5. Test Search and Filters
For each panel:
1. Enter search term in search box
2. Table should filter results (with debounce)
3. Select industry filter
4. Table should update immediately
5. Select ad type filter
6. Table should show only matching campaigns

### 6. Test Real-Time Updates
1. Open two browser windows with manage-campaigns.html
2. In Window 1: Approve a campaign from Requested panel
3. Verify:
   - Window 1: Campaign disappears from Requested, appears in Verified
   - Table updates immediately without page reload
   - Live widget updates with new data
   - Notification appears

## Quick Start Commands

### Backend Setup
```bash
cd astegni-backend

# Ensure campaigns endpoint is registered in app.py
# Should have: app.include_router(manage_campaigns_endpoints.router)

# Start backend
python app.py
```

### Test in Browser
1. Open http://localhost:8080/admin-pages/manage-campaigns.html
2. Login as admin with "manage-campaigns" department
3. Navigate through panels using sidebar
4. Test workflow: Requested → Verified → Suspended → Reinstated
5. Test workflow: Requested → Rejected → Reconsidered → Approved

## Troubleshooting

### Campaign Not Moving Between Panels
- Check browser console for API errors
- Verify backend endpoint is returning 200 OK
- Confirm `verification_status` is being updated in database
- Check that `loadPanelData()` is being called after status update

### Modal Buttons Not Showing
- Verify `renderModalActionButtons()` is being called
- Check `campaign.verification_status` matches expected values
- Inspect modal footer HTML for button insertion

### Search/Filter Not Working
- Verify debounce timer is set (300ms)
- Check `panelFilters` object is updating
- Confirm API endpoint receives correct query parameters

### Table Shows "Loading..."
- Check API endpoint is accessible
- Verify admin has correct department permissions
- Check browser console for CORS or network errors

## Best Practices

1. **Always Reload All Panels**: When status changes, reload all panels to ensure consistency
2. **Require Reasons**: Always prompt for reasons when rejecting or suspending
3. **Show Notifications**: Provide immediate feedback with success/error notifications
4. **Validate Input**: Check that reasons are not empty before submitting
5. **Handle Errors Gracefully**: Show user-friendly error messages
6. **Test All Transitions**: Verify each status transition works correctly
7. **Use Debouncing**: Prevent excessive API calls during search

## Implementation Complete ✅

All features are fully implemented:
- ✅ Panel-specific table loading by verification_status
- ✅ Dynamic modal buttons based on current panel
- ✅ Real-time table updates without page reload
- ✅ Reason prompts for reject/suspend actions
- ✅ Status transition workflow (all 8 transitions)
- ✅ Search and filter functionality per panel
- ✅ Creative media preview in modal
- ✅ Live campaign requests widget
- ✅ Backend endpoints with validation
- ✅ Database schema with indexed status field
