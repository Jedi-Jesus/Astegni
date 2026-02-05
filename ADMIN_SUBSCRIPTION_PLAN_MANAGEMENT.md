# Admin Subscription Plan Management

## Overview

Admins can now create and manage subscription plans with role-based features through the **manage-system-settings.html** page in the **subscription-pricing-section**.

When creating or editing a subscription plan:
1. Plan info is saved to `subscription_plans` table
2. Features are saved to `subscription_features` table (role-specific)

---

## Architecture

### Database Tables

**subscription_plans** (admin_db)
- Stores plan metadata: title, price, discounts, label
- Does NOT store features anymore (features column removed)

**subscription_features** (admin_db)
- Stores role-based features for each plan
- One row per plan + role + feature combination
- Columns: `subscription_plan_id`, `user_role`, `feature_name`, `feature_description`, `is_enabled`, `feature_value`

---

## API Endpoints

### For Admins (Create/Update Plans)

#### 1. Create Subscription Plan with Features

**POST** `/api/admin/subscription-plans`

**Request Body:**
```json
{
  "package_title": "Premium Plan",
  "package_price": 299,
  "currency": "ETB",
  "label": "popular",
  "discount_3_months": 5,
  "discount_6_months": 10,
  "discount_yearly": 20,
  "features": [
    {
      "role": "tutor",
      "feature_name": "profile_boost",
      "feature_description": "Boost profile visibility in search results",
      "is_enabled": true,
      "feature_value": null
    },
    {
      "role": "tutor",
      "feature_name": "performance_analytics",
      "feature_description": "Access to detailed performance metrics",
      "is_enabled": true,
      "feature_value": null
    },
    {
      "role": "student",
      "feature_name": "premium_content",
      "feature_description": "Access to premium learning content",
      "is_enabled": true,
      "feature_value": null
    },
    {
      "role": "parent",
      "feature_name": "child_monitoring",
      "feature_description": "Monitor multiple children progress",
      "is_enabled": true,
      "feature_value": null
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription plan created successfully",
  "plan_id": 10,
  "features_created": 4
}
```

---

#### 2. Update Subscription Plan

**PUT** `/api/admin/subscription-plans/{plan_id}`

**Request Body:** (all fields optional)
```json
{
  "package_title": "Premium Plus Plan",
  "package_price": 399,
  "label": "recommended",
  "features": [
    {
      "role": "tutor",
      "feature_name": "profile_boost",
      "feature_description": "Enhanced profile boost",
      "is_enabled": true
    }
  ]
}
```

**Note:** If `features` array is provided, it **replaces** all existing features for that plan.

---

#### 3. Delete Subscription Plan

**DELETE** `/api/admin/subscription-plans/{plan_id}`

**Response:**
```json
{
  "success": true,
  "message": "Subscription plan 'Premium Plan' deleted successfully (features auto-deleted)"
}
```

**Note:** Features are auto-deleted via CASCADE.

---

#### 4. Get Plan Features

**GET** `/api/admin/subscription-plans/{plan_id}/features?role=tutor`

**Response:**
```json
{
  "success": true,
  "plan_id": 10,
  "plan_name": "Premium Plan",
  "features": [
    {
      "role": "tutor",
      "feature_name": "profile_boost",
      "feature_description": "Boost profile visibility",
      "is_enabled": true,
      "feature_value": null
    }
  ]
}
```

---

### For Users (Access Features)

#### 1. Get My Subscription Features

**GET** `/api/subscription/features?role=tutor`

Returns features available for the authenticated user's current subscription plan.

---

#### 2. Check Specific Feature Access

**GET** `/api/subscription/features/check/profile_boost`

Returns whether the user has access to a specific feature.

---

## Frontend Integration

### Current Frontend (subscription-plan-manager.js)

The current frontend sends data in this format:

```javascript
const planData = {
    package_title: planName,
    package_price: monthlyPrice,
    subscription_type: subscriptionType,
    currency: 'ETB',
    features: features,  // Array of strings: ["feature 1", "feature 2"]
    label: label,
    discount_3_months: discount3Months,
    discount_6_months: discount6Months,
    discount_yearly: discountYearly
};
```

### ⚠️ Frontend Needs Update

**Current format:**
```javascript
features: ["Profile boost", "Analytics", "Priority support"]
```

**New format required:**
```javascript
features: [
    {
        role: "tutor",
        feature_name: "profile_boost",
        feature_description: "Boost profile visibility",
        is_enabled: true
    },
    {
        role: "student",
        feature_name: "premium_content",
        feature_description: "Access premium content",
        is_enabled: true
    }
]
```

---

## Migration Status

✅ **Database Schema Updated**
- `features` column removed from `subscription_plans`
- `subscription_features` table created with 33 seeded features
- All endpoints updated to use new structure

✅ **Backend Endpoints Created**
- `/api/admin/subscription-plans` (POST, PUT, DELETE)
- `/api/admin/subscription-plans/{plan_id}/features` (GET)
- `/api/subscription/features` (GET - for users)
- `/api/subscription/features/check/{feature_name}` (GET - for users)

⚠️ **Frontend Needs Update**
- `admin-pages/js/admin-pages/subscription-plan-manager.js` needs to be updated to send features in new format
- Modal UI needs to support role selection for each feature

---

## Next Steps

### 1. Update Frontend Modal

The subscription plan modal needs to allow admins to:
- Select which role each feature applies to (tutor/student/parent/advertiser)
- Add feature name (identifier) and description separately
- Optionally set feature_value for configurable features

### 2. Update JavaScript

File: `admin-pages/js/admin-pages/subscription-plan-manager.js`

**In `saveSubscriptionPlan()` function (line 424-529):**

Change from:
```javascript
// OLD: Collect features as strings
const features = [];
featureInputs.forEach(input => {
    features.push(input.value.trim());
});
```

To:
```javascript
// NEW: Collect features with role and description
const features = [];
const featureCards = document.querySelectorAll('.subscription-feature-card');
featureCards.forEach(card => {
    const role = card.querySelector('.feature-role-select').value;
    const featureName = card.querySelector('.feature-name-input').value.trim();
    const featureDesc = card.querySelector('.feature-desc-input').value.trim();
    const isEnabled = card.querySelector('.feature-enabled-checkbox').checked;

    if (role && featureName && featureDesc) {
        features.push({
            role: role,
            feature_name: featureName,
            feature_description: featureDesc,
            is_enabled: isEnabled,
            feature_value: null
        });
    }
});
```

### 3. Update Modal HTML

The feature input UI needs to include:
- **Role selector** (dropdown: tutor, student, parent, advertiser)
- **Feature name** (identifier like `profile_boost`)
- **Feature description** (human-readable like "Boost profile visibility")
- **Enabled checkbox**

---

## Example: Complete Flow

### Admin Creates Plan

1. Admin opens **manage-system-settings.html**
2. Clicks "Add Plan" button
3. Fills in:
   - Plan Name: "Premium Plan"
   - Price: 299 ETB
   - Discounts: 5%, 10%, 20%
4. Adds features:
   - Role: Tutor, Name: `profile_boost`, Desc: "Boost profile visibility"
   - Role: Tutor, Name: `performance_analytics`, Desc: "Access to analytics"
   - Role: Student, Name: `premium_content`, Desc: "Premium learning content"
5. Clicks "Save"

### Backend Processing

1. POST request to `/api/admin/subscription-plans`
2. Plan saved to `subscription_plans` table (WITHOUT features)
3. Features saved to `subscription_features` table:
   - 3 rows created (1 per feature)
   - Each linked to `subscription_plan_id`
   - Each has `user_role` specified

### User Subscribes

1. User subscribes to "Premium Plan"
2. `users.subscription_plan_id` = 10
3. User switches to tutor role
4. Frontend calls `/api/subscription/features?role=tutor`
5. Backend returns: `profile_boost`, `performance_analytics`
6. UI shows these features

### User Switches Role

1. User switches to student role
2. Frontend calls `/api/subscription/features?role=student`
3. Backend returns: `premium_content`
4. UI shows different features

---

## Files Created/Modified

### Backend
1. ✅ [admin_subscription_plan_endpoints.py](astegni-backend/admin_subscription_plan_endpoints.py) - NEW (admin CRUD endpoints)
2. ✅ [subscription_features_endpoints.py](astegni-backend/subscription_features_endpoints.py) - EXISTING (user feature access)
3. ✅ [app.py](astegni-backend/app.py) - MODIFIED (registered new routers)
4. ✅ [utils.py](astegni-backend/utils.py) - MODIFIED (added get_current_admin)

### Database
5. ✅ [migrate_create_subscription_features_table.py](astegni-backend/migrate_create_subscription_features_table.py) - RAN
6. ✅ [migrate_remove_features_from_subscription_plans.py](astegni-backend/migrate_remove_features_from_subscription_plans.py) - RAN

### Frontend (NEEDS UPDATE)
7. ⚠️ [admin-pages/js/admin-pages/subscription-plan-manager.js](admin-pages/js/admin-pages/subscription-plan-manager.js) - NEEDS UPDATE
8. ⚠️ [admin-pages/manage-system-settings.html](admin-pages/manage-system-settings.html) - NEEDS MODAL UPDATE

---

## API Response Format

When calling `GET /api/admin-db/subscription-plans`, the response includes both formats:

```json
{
  "success": true,
  "plans": [
    {
      "id": 7,
      "package_title": "Premium Plan",
      "package_price": 299,
      "label": "popular",
      "features": [
        "Boost profile visibility",
        "Access to analytics",
        "Premium content"
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
  ]
}
```

**Format Notes:**
- `features` - Flat array of feature descriptions (backward compatibility)
- `features_by_role` - Grouped by role with full feature data (NEW)

---

## Summary

The subscription system is now properly architected with:
- Clean separation: plans in `subscription_plans`, features in `subscription_features`
- Role-based features: same plan, different features per role
- Complete API: Admin CRUD + User feature access
- Database integrity: CASCADE delete, unique constraints

✅ **GET Endpoints Updated:**
- `GET /api/admin-db/subscription-plans` - Returns plans with `features_by_role`
- `GET /api/admin-db/subscription-plans/{id}` - Returns single plan with `features_by_role`

⚠️ **POST/PUT Endpoints:**
- Old endpoints at `/api/admin-db/subscription-plans` (POST/PUT) are DEPRECATED
- Use new endpoints at `/api/admin/subscription-plans` (POST/PUT/DELETE)

**Action Required:** Update frontend to:
1. Use `features_by_role` instead of `features` array
2. Use new `/api/admin/subscription-plans` endpoints for creating/updating plans
