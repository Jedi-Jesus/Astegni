# Campaign Verification Workflow Implementation

## Overview
Implemented a campaign verification workflow where advertisers must submit campaigns for admin verification before they can launch them. The workflow ensures quality control and prevents unauthorized campaign launches.

## Database Changes

### New Field: `submit_for_verification`
- **Table**: `campaign_profile`
- **Type**: `BOOLEAN`
- **Default**: `false`
- **Purpose**: Tracks whether a campaign has been submitted for admin verification
- **Index**: Created index on `submit_for_verification` for faster admin queries

### Migration Script
- **File**: `astegni-backend/migrate_add_submit_for_verification.py`
- **Status**: ✅ Executed successfully
- **Command**: `python migrate_add_submit_for_verification.py`

## Backend Changes

### 1. API Endpoint - Submit for Verification
**Endpoint**: `POST /api/advertiser/campaigns/{campaign_id}/submit-for-verification`

**Features**:
- Validates campaign ownership
- Checks if already verified or submitted
- Sets `submit_for_verification = true`
- Returns success confirmation

**File**: [advertiser_brands_endpoints.py](astegni-backend/advertiser_brands_endpoints.py#L1133-L1231)

### 2. Campaign Update - Auto Reset
**Endpoint**: `PUT /api/advertiser/campaigns/{campaign_id}`

**Change**: Automatically resets `submit_for_verification = false` on any campaign edit

**Reason**: Ensures campaigns are re-verified after modifications

**File**: [advertiser_brands_endpoints.py](astegni-backend/advertiser_brands_endpoints.py#L970-L973)

### 3. Admin Campaigns API - Filter by Submission
**Endpoint**: `GET /api/admin/campaigns?status=pending`

**Changes**:
- Filters campaigns where `submit_for_verification = true`
- Only shows submitted campaigns in admin dashboard
- Added `submit_for_verification` field to response

**File**: [admin_advertisers_endpoints.py](astegni-backend/admin_advertisers_endpoints.py#L413-L419)

### 4. Campaign Counts - Include Submission Count
**Endpoint**: `GET /api/admin/campaigns/counts`

**Changes**:
- Added `submitted_for_verification` count
- Updated `pending` count to only include submitted campaigns

**File**: [admin_advertisers_endpoints.py](astegni-backend/admin_advertisers_endpoints.py#L509-L518)

## Frontend Changes

### 1. Campaign Modal - Button Logic
**File**: [modals/advertiser-profile/campaign-modal.html](modals/advertiser-profile/campaign-modal.html#L1047-L1062)

**Changes**:
- Added "Submit for Verification" button (`campaign-submit-verification-btn`)
- Modified "Launch" button visibility logic
- Buttons now toggle based on verification status

**Button Display Logic**:
- **Not Verified + Not Submitted** → Show "Submit for Verification"
- **Not Verified + Submitted** → Hide buttons (waiting for admin)
- **Verified** → Show "Launch"

### 2. Brands Manager - Button Update Logic
**File**: [js/advertiser-profile/brands-manager.js](js/advertiser-profile/brands-manager.js#L3493-L3569)

**Function**: `updateFooterButtons()`

**Changes**:
- Checks `campaign.submit_for_verification` status
- Checks `campaign.is_verified` status
- Shows/hides appropriate buttons based on workflow state

**States**:
1. **Draft (not submitted)**: Show "Submit for Verification"
2. **Submitted (pending verification)**: Hide all action buttons
3. **Verified**: Show "Launch"
4. **Active/Running**: Show "Pause" and "Cancel"

### 3. Submit for Verification Function
**File**: [js/advertiser-profile/brands-manager.js](js/advertiser-profile/brands-manager.js#L3359-L3425)

**Function**: `submitForVerification()`

**Features**:
- Validates submission eligibility
- Confirms with user before submitting
- Makes API call to backend
- Updates UI on success
- Logs activity in campaign history

### 4. Admin Dashboard - Campaign Requests
**File**: [admin-pages/manage-advertisers.html](admin-pages/manage-advertisers.html#L1067-L1139)

**Panel**: `campaign-requested-panel`

**Changes**:
- Admin API automatically filters campaigns with `submit_for_verification = true`
- Only submitted campaigns appear in "Campaign Requests" panel
- Admin can verify campaigns from this panel

## Workflow Diagram

```
┌─────────────────────┐
│  Campaign Created   │
│ (Draft Status)      │
│ submit_for_         │
│ verification=false  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Advertiser Clicks  │
│ "Submit for         │
│  Verification"      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  API Call:          │
│  POST /submit-for-  │
│  verification       │
│                     │
│ submit_for_         │
│ verification=true   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Admin Dashboard    │
│  Shows Campaign in  │
│  "Campaign          │
│   Requests" Panel   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Admin Verifies     │
│  is_verified=true   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Advertiser Can     │
│  Now Launch         │
│  Campaign           │
└─────────────────────┘

┌─────────────────────┐
│  IF Campaign        │
│  Edited:            │
│                     │
│ submit_for_         │
│ verification=false  │
│                     │
│ Must Re-submit      │
└─────────────────────┘
```

## Testing Checklist

### Advertiser Side
- [x] Create a new campaign
- [ ] Click "Submit for Verification" button
- [ ] Verify button changes to pending state
- [ ] Try to edit campaign
- [ ] Verify "Submit for Verification" button reappears after edit
- [ ] Wait for admin verification
- [ ] Verify "Launch" button appears after verification

### Admin Side
- [ ] Navigate to "Campaign Requests" panel
- [ ] Verify only submitted campaigns appear
- [ ] Verify `submit_for_verification = true` campaigns are listed
- [ ] Approve a campaign
- [ ] Verify campaign moves to "Verified Campaigns" panel

### Database Verification
```sql
-- Check submitted campaigns
SELECT id, name, submit_for_verification, is_verified, verification_status
FROM campaign_profile
WHERE submit_for_verification = true;

-- Check verification workflow
SELECT
    COUNT(*) FILTER (WHERE submit_for_verification = false) as not_submitted,
    COUNT(*) FILTER (WHERE submit_for_verification = true AND is_verified = false) as pending_verification,
    COUNT(*) FILTER (WHERE submit_for_verification = true AND is_verified = true) as verified
FROM campaign_profile;
```

## Files Modified

### Backend
1. `astegni-backend/migrate_add_submit_for_verification.py` (NEW)
2. `astegni-backend/advertiser_brands_endpoints.py` (MODIFIED)
3. `astegni-backend/admin_advertisers_endpoints.py` (MODIFIED)

### Frontend
4. `modals/advertiser-profile/campaign-modal.html` (MODIFIED)
5. `js/advertiser-profile/brands-manager.js` (MODIFIED)

### Admin
6. Admin dashboard already configured - no HTML changes needed
7. API changes automatically filter submitted campaigns

## Key Features

✅ **Separation of Concerns**: Submit vs Verify
- Advertisers submit campaigns
- Admins verify campaigns
- Clear distinction between draft, submitted, and verified states

✅ **Auto-Reset on Edit**: Ensures quality control
- Any campaign edit resets submission status
- Forces re-verification for modified campaigns

✅ **Admin Filtering**: Easy campaign management
- Admin dashboard only shows submitted campaigns
- No clutter from draft campaigns
- Clear workflow for reviewers

✅ **User Experience**: Clear visual feedback
- Button states indicate current workflow stage
- Confirmation dialogs for important actions
- Activity logging for audit trail

## Security Considerations

- ✅ Ownership validation on all endpoints
- ✅ Role-based access control (advertiser vs admin)
- ✅ State validation (can't submit if already verified)
- ✅ Duplicate submission prevention

## Future Enhancements

1. **Email Notifications**
   - Notify advertiser when campaign is verified/rejected
   - Notify admin when new campaign is submitted

2. **Rejection Reasons**
   - Allow admin to provide feedback on rejected campaigns
   - Display rejection reason to advertiser

3. **Revision History**
   - Track changes between submissions
   - Show what was modified since last verification

4. **Bulk Actions**
   - Allow admin to verify multiple campaigns at once
   - Batch approval for trusted advertisers

5. **Auto-Verification**
   - Auto-verify campaigns from trusted advertisers
   - Implement verification score/trust system

## Deployment Notes

### Development
```bash
# Run migration
cd astegni-backend
python migrate_add_submit_for_verification.py
```

### Production
```bash
# SSH to production
ssh root@128.140.122.215

# Navigate to project
cd /var/www/astegni/astegni-backend

# Activate virtualenv
source venv/bin/activate

# BACKUP DATABASE FIRST!
pg_dump astegni_user_db > /var/backups/user_db_$(date +%Y%m%d_%H%M%S).sql

# Run migration
python migrate_add_submit_for_verification.py

# Restart backend
systemctl restart astegni-backend

# Check logs
journalctl -u astegni-backend -f
```

## Summary

This implementation adds a robust verification workflow to the campaign system, ensuring that all campaigns are reviewed by admins before going live. The workflow is user-friendly, secure, and maintainable, with clear separation between advertiser and admin actions.

The system now prevents unauthorized campaign launches while maintaining a smooth user experience with clear visual feedback at every step of the process.
