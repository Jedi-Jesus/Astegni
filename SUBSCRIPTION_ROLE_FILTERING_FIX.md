# Subscription Role Filtering Fix

## Problem

The subscription plans weren't loading in the admin page (`manage-system-settings.html`) subscription-pricing-section. The API was returning 0 plans.

## Root Cause

1. The `subscription_type` column was removed from `subscription_plans` table during migration
2. The GET endpoint still tried to SELECT and filter by `subscription_type`
3. This caused SQL errors and no plans were returned

## Solution

Updated `GET /api/admin-db/subscription-plans` endpoint to:
1. Accept both `subscription_type` (old) and `user_role` (new) parameters for backward compatibility
2. Filter plans based on which roles have features in the `subscription_features` table
3. Use subquery to avoid DISTINCT + ORDER BY SQL errors

---

## Implementation

### Updated Endpoint

**File**: `admin_db_endpoints.py` (lines 496-548)

```python
@router.get("/subscription-plans")
async def get_subscription_plans(active_only: bool = True, user_role: str = None, subscription_type: str = None):
    """
    Get all subscription plans with role-based filtering

    Parameters:
    - active_only: Only return active plans (default: True)
    - user_role: Filter by role (tutor, student, parent, advertiser)
    - subscription_type: Alias for user_role (backward compatibility)
    """
    # Backward compatibility: subscription_type is alias for user_role
    role = user_role or subscription_type

    if role:
        # Filter plans that have features for the specified role
        query = """
            SELECT sp.id, sp.package_title, sp.package_price, ...
            FROM subscription_plans sp
            WHERE sp.id IN (
                SELECT DISTINCT subscription_plan_id
                FROM subscription_features
                WHERE user_role = %s AND is_enabled = TRUE
            )
            AND sp.is_active = TRUE
            ORDER BY sp.display_order ASC
        """
    else:
        # Get all plans (no role filter)
        query = """
            SELECT id, package_title, package_price, ...
            FROM subscription_plans
            WHERE is_active = TRUE
            ORDER BY display_order ASC
        """
```

---

## How It Works Now

### Frontend Request

The frontend calls with `subscription_type` parameter:

```javascript
// In subscription-plan-manager.js
const response = await fetch(`${apiUrl}/api/admin-db/subscription-plans?subscription_type=${currentSubscriptionTab}`, {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});
```

### Backend Processing

1. Endpoint receives `subscription_type=tutor`
2. Maps it to `role` variable (backward compatibility)
3. Queries `subscription_features` table for plans that have tutor features
4. Returns only plans with `plan_id IN (plans with tutor features)`

### Example Results

**Without role filter** (`GET /api/admin-db/subscription-plans`):
- Returns all 12 active plans

**With tutor filter** (`GET /api/admin-db/subscription-plans?subscription_type=tutor`):
- Returns 3 plans: Standard, Standard +, Free (plans that have tutor features)

**With student filter** (`GET /api/admin-db/subscription-plans?subscription_type=student`):
- Returns 3 plans: Standard, Standard +, Free (plans that have student features)

---

## Response Format

The API returns plans with both `features` (backward compat) and `features_by_role` (new):

```json
{
  "success": true,
  "plans": [
    {
      "id": 7,
      "package_title": "Standard",
      "package_price": 1500,
      "label": "none",
      "features": [
        "Boost profile visibility",
        "Access to analytics",
        "Priority support"
      ],
      "features_by_role": {
        "tutor": [
          {
            "name": "profile_boost",
            "description": "Boost profile visibility",
            "enabled": true,
            "value": null
          },
          {
            "name": "performance_analytics",
            "description": "Access to analytics",
            "enabled": true,
            "value": null
          }
        ],
        "student": [
          {
            "name": "premium_content",
            "description": "Premium learning content",
            "enabled": true,
            "value": null
          }
        ]
      }
    }
  ],
  "count": 3
}
```

---

## Frontend Display

### Subscription Tabs

The admin page has tabs for each role:
- **Tutor** - Shows 3 plans with tutor features
- **Student** - Shows 3 plans with student features
- **Parent** - Shows 3 plans with parent features
- **Institute** - Shows plans with institute features (if any)
- **Advertiser** - Shows plans with advertiser features (if any)

### Plan Cards

Each plan card displays:
- Plan name and price
- Features (from `plan.features` array)
- Discount tiers (3-month, 6-month, yearly)
- Popular/Recommended badges

---

## Database State

### subscription_plans Table

12 active plans exist:
- Basic (ID: 5)
- Basic + (ID: 6)
- Standard (ID: 7) ✅ Has features
- Standard + (ID: 8) ✅ Has features
- Premium (ID: 9)
- free (ID: 10)
- 64 gb (ID: 11)
- 100 gb (ID: 12)
- 250 gb (ID: 13)
- 500 gb (ID: 14)
- Tb package (ID: 15)
- Free (ID: 16) ✅ Has features

### subscription_features Table

33 features across 3 plans:
- **Plan 7 (Standard)**: 11 features (tutor: 4, student: 4, parent: 3)
- **Plan 8 (Standard +)**: 11 features (tutor: 4, student: 4, parent: 3)
- **Plan 16 (Free)**: 11 features (tutor: 4, student: 4, parent: 3)

---

## Testing

Created test script: `test_subscription_plans_by_role.py`

**Results:**
```
TUTOR: 3 plans (Standard, Standard +, Free)
STUDENT: 3 plans (Standard, Standard +, Free)
PARENT: 3 plans (Standard, Standard +, Free)
```

---

## Backward Compatibility

✅ **Frontend doesn't need changes** because:
1. Old parameter name `subscription_type` still works
2. Old response format `features` array still included
3. New response format `features_by_role` added without breaking existing code

---

## Files Modified

1. ✅ `admin_db_endpoints.py` - Updated GET endpoint with role filtering
2. ✅ `test_subscription_plans_by_role.py` - Created test script

---

## Summary

**Before:**
- GET endpoint tried to filter by non-existent `subscription_type` column
- Returned 0 plans
- Subscription tabs showed "No plans yet" message

**After:**
- GET endpoint filters by checking `subscription_features` table
- Returns plans based on which roles have features
- Subscription tabs show correct plans for each role
- Fully backward compatible with existing frontend code

**Status:** ✅ **FIXED** - Subscription plans now load correctly in admin page!
