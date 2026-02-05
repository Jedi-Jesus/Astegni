# Affiliate Business Types Implementation

## Overview

The affiliate system has been enhanced to support three distinct business types for commission tracking:

1. **Tutoring Sessions** - Commission from transactions when referred users hire tutors (up to 18% across 4 tiers)
2. **Subscriptions** - Commission from subscription purchases by referred users
3. **Advertisements** - Commission from ad impressions viewed by both the referrer and their referred users' network

## Database Changes

### Migration File
- **File**: `astegni-backend/migrate_add_business_type_to_affiliate_tiers.py`
- **Run**: `python migrate_add_business_type_to_affiliate_tiers.py`

### Schema Changes
Added to `affiliate_tiers` table:
- **Column**: `business_type VARCHAR(50) NOT NULL DEFAULT 'tutoring'`
- **Check Constraint**: Ensures values are one of: `tutoring`, `subscription`, `advertisement`
- **Unique Constraint**: Updated from `(program_id, tier_level)` to `(program_id, tier_level, business_type)`
- **Index**: Added `idx_affiliate_tiers_business_type` for faster queries

## Backend Changes

### File: `admin_db_endpoints.py`

#### Updated Endpoints:

1. **GET `/api/admin-db/affiliate-program`**
   - New query parameter: `business_type` (optional)
   - Returns tiers filtered by business type if specified
   - Response includes `business_type` field in tier objects

2. **GET `/api/admin-db/affiliate-tiers`**
   - New query parameter: `business_type` (optional)
   - Filters tiers by both `program_id` and `business_type`

3. **POST `/api/admin-db/affiliate-tiers`**
   - Now requires `business_type` field in request body
   - Valid values: `tutoring`, `subscription`, `advertisement`
   - Unique constraint now includes business_type

4. **DELETE `/api/admin-db/affiliate-tiers/{program_id}/{tier_level}/{business_type}`**
   - Added `business_type` path parameter
   - Ensures deletion of specific tier for specific business type

## Frontend Changes

### HTML: `manage-system-settings.html`

#### New Tab Interface (line ~1191):
```html
<!-- Business Type Tabs -->
<div class="affiliate-business-type-tabs mb-6">
    <div class="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        <button onclick="switchAffiliateBusinessTab('tutoring')"
                class="affiliate-business-tab active"
                data-tab="tutoring">
            <i class="fas fa-chalkboard-teacher text-blue-600"></i>
            <span>Tutoring Sessions</span>
            <span class="tab-count">0</span>
        </button>
        <!-- Similar for subscription and advertisement -->
    </div>
</div>
```

#### Tab Content Panels:
Each business type has its own grid:
- `affiliate-business-tab-tutoring`
- `affiliate-business-tab-subscription`
- `affiliate-business-tab-advertisement`

#### Updated Modal (line ~5982):
Added business type selector:
```html
<select id="affiliate-tier-business-type" required>
    <option value="tutoring">Tutoring Sessions</option>
    <option value="subscription">Subscriptions</option>
    <option value="advertisement">Advertisements</option>
</select>
```

### JavaScript: `affiliate-tier-manager.js`

#### New State Variable:
```javascript
let currentBusinessType = 'tutoring'; // Default to tutoring tab
```

#### New Functions:

1. **`switchAffiliateBusinessTab(businessType)`**
   - Switches between business type tabs
   - Updates active tab styling
   - Shows/hides appropriate panel

2. **`updateTabCounts()`**
   - Updates the count badges on each tab
   - Shows number of tiers per business type

#### Updated Functions:

1. **`loadAffiliateProgram()`**
   - Now calls `updateTabCounts()` after loading
   - Loads all tiers regardless of business type

2. **`renderAffiliateTiers()`**
   - Renders tiers to appropriate grids based on business_type
   - Filters tiers by business type for each tab
   - Passes business_type to edit/delete functions

3. **`openAddAffiliateTierModal()`**
   - Sets business type to current active tab
   - Calculates next tier level per business type

4. **`editAffiliateTier(tierLevel, businessType)`**
   - Now requires both tier level and business type
   - Finds tier by both parameters

5. **`saveAffiliateTier(event)`**
   - Includes `business_type` in save payload
   - Validates business type is selected

6. **`deleteAffiliateTier(tierLevel, businessType)`**
   - Requires both parameters for deletion
   - Updates delete confirmation message

### CSS: `manage-system-settings.css`

Added comprehensive styles for affiliate business tabs (line ~1278):
- Base styles for `.affiliate-business-tab`
- Active state styles
- Tab-specific color schemes (blue for tutoring, purple for subscription, orange for advertisement)
- Panel transition animations
- Dark theme support
- Responsive mobile styles

## Usage Guide

### Adding a New Tier

1. Navigate to **Manage System Settings** → **Pricing** panel
2. Select the appropriate business type tab (Tutoring, Subscriptions, or Advertisements)
3. Click **"Add Tier"** button
4. Fill in the form:
   - **Business Type**: Auto-selected based on current tab (can be changed)
   - **Tier Level**: 1 for direct referral, 2 for second level, etc.
   - **Tier Name**: Descriptive name (e.g., "Direct Referral")
   - **Commission Rate**: Percentage (0-100%)
   - **Max Duration**: Months the commission applies
   - **Active**: Toggle to enable/disable
5. Click **"Save Tier"**

### Editing a Tier

1. Switch to the appropriate business type tab
2. Click on any tier card
3. Modify the fields
4. Click **"Save Tier"**

### Deleting a Tier

1. Hover over a tier card
2. Click the red delete button (top-left corner)
3. Confirm deletion

## Examples

### Tutoring Commission Structure
```
Level 1: Direct Referral - 10% commission, 12 months
Level 2: Second Level - 5% commission, 12 months
Level 3: Third Level - 2% commission, 6 months
Level 4: Fourth Level - 1% commission, 6 months
Total: Up to 18% across 4 tiers
```

### Subscription Commission Structure
```
Level 1: Direct Referral - 15% commission, 24 months
Level 2: Second Level - 8% commission, 12 months
Level 3: Third Level - 3% commission, 6 months
```

### Advertisement Commission Structure
```
Level 1: Direct Referral - 20% commission, 12 months
Level 2: Second Level - 10% commission, 6 months
```

## API Examples

### Fetch Tutoring Tiers Only
```javascript
GET /api/admin-db/affiliate-program?business_type=tutoring
```

### Create a Subscription Tier
```javascript
POST /api/admin-db/affiliate-tiers
{
  "tier_level": 1,
  "tier_name": "Direct Subscription Referral",
  "commission_rate": 15.0,
  "duration_months": 24,
  "business_type": "subscription",
  "is_active": true
}
```

### Delete an Advertisement Tier
```javascript
DELETE /api/admin-db/affiliate-tiers/1/2/advertisement
// Deletes program_id=1, tier_level=2, business_type=advertisement
```

## Technical Notes

### Backwards Compatibility
- Existing tiers automatically default to `business_type='tutoring'`
- Old unique constraint gracefully upgraded to include business_type
- Legacy grid kept hidden for backwards compatibility

### Performance
- Index on `business_type` column ensures fast filtering
- Tab counts updated on load and after CRUD operations
- Separate grids prevent unnecessary re-renders

### Validation
- Database check constraint prevents invalid business types
- Frontend validates business type is selected before save
- Backend validates business_type in all endpoints

## Testing Checklist

- [ ] Run migration successfully
- [ ] Backend restarts without errors
- [ ] Can create tiers for all three business types
- [ ] Tab switching works smoothly
- [ ] Tab counts update correctly
- [ ] Can edit tiers in each business type
- [ ] Can delete tiers in each business type
- [ ] Modal business type selector works
- [ ] Styles display correctly in light/dark themes
- [ ] Responsive mobile view works
- [ ] Commission calculations display correctly

## Files Modified

1. `astegni-backend/migrate_add_business_type_to_affiliate_tiers.py` (NEW)
2. `astegni-backend/admin_db_endpoints.py` (MODIFIED)
3. `admin-pages/manage-system-settings.html` (MODIFIED)
4. `admin-pages/js/admin-pages/affiliate-tier-manager.js` (MODIFIED)
5. `admin-pages/css/admin-pages/manage-system-settings.css` (MODIFIED)

## Future Enhancements

Consider these additions:
- Analytics dashboard showing commissions by business type
- Different payout schedules per business type
- Automatic tier adjustment based on performance
- Commission cap per referrer per business type
- Referral tracking integration with actual transactions
