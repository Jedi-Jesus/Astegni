# Subscription Features System

## Overview

Implemented a role-based subscription features system that allows different features for different user roles within the same subscription plan.

---

## Database Schema

### subscription_features Table (Admin Database)

**Location**: `astegni_admin_db.subscription_features`

```sql
CREATE TABLE subscription_features (
    id SERIAL PRIMARY KEY,
    subscription_plan_id INTEGER NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
    user_role VARCHAR(50) NOT NULL,  -- 'tutor', 'student', 'parent', 'advertiser'
    feature_name VARCHAR(255) NOT NULL,
    feature_description TEXT,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    feature_value TEXT,  -- Optional configuration value
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_plan_role_feature UNIQUE (subscription_plan_id, user_role, feature_name)
);
```

**Key Points**:
- ✅ One subscription plan can have different features for different roles
- ✅ Features can be enabled/disabled per plan per role
- ✅ Feature values allow configuration (e.g., limits, quotas)
- ✅ Unique constraint prevents duplicate features

---

## Migration

### Changes Made

**File 1**: [migrate_create_subscription_features_table.py](astegni-backend/migrate_create_subscription_features_table.py)

1. ✅ Created `subscription_features` table
2. ✅ Removed `astegni_features` column from `subscription_plans`
3. ✅ Removed `subscription_type` column from `subscription_plans`
4. ✅ Seeded example features for 3 roles × 3 plans = 33 features

**File 2**: [migrate_remove_features_from_subscription_plans.py](astegni-backend/migrate_remove_features_from_subscription_plans.py)

5. ✅ Removed `features` column (JSONB) from `subscription_plans`

**Migration Results**:
- Total features created: 33
- Plans with features: 3 (Free, Standard, Standard +)
- Unique roles: 3 (tutor, student, parent)
- All feature columns removed from subscription_plans

---

## Example Features by Role

### Tutor Features
- `profile_boost` - Boost profile visibility in search results
- `performance_analytics` - Access to detailed performance metrics
- `student_connections` - Connect with unlimited students (value: "unlimited")
- `priority_support` - Priority customer support

### Student Features
- `premium_content` - Access to premium learning content
- `unlimited_tutors` - Connect with unlimited tutors (value: "unlimited")
- `progress_tracking` - Advanced progress tracking tools
- `priority_support` - Priority customer support

### Parent Features
- `child_monitoring` - Monitor multiple children progress
- `detailed_reports` - Detailed performance reports
- `priority_support` - Priority customer support

---

## API Endpoints

### 1. Get User's Subscription Features

**Endpoint**: `GET /api/subscription/features`

**Query Parameters**:
- `role` (optional): Filter features by role (tutor/student/parent). If not provided, uses user's active role.

**Response**:
```json
[
    {
        "feature_name": "profile_boost",
        "feature_description": "Boost profile visibility in search results",
        "is_enabled": true,
        "feature_value": null
    },
    {
        "feature_name": "student_connections",
        "feature_description": "Connect with unlimited students",
        "is_enabled": true,
        "feature_value": "unlimited"
    }
]
```

**Example Usage**:
```javascript
// Get features for current role
fetch('/api/subscription/features', {
    headers: { 'Authorization': 'Bearer <token>' }
});

// Get features for specific role
fetch('/api/subscription/features?role=tutor', {
    headers: { 'Authorization': 'Bearer <token>' }
});
```

### 2. Check Specific Feature Access

**Endpoint**: `GET /api/subscription/features/check/{feature_name}`

**Query Parameters**:
- `role` (optional): Check feature for specific role

**Response**:
```json
{
    "has_access": true,
    "feature_name": "profile_boost",
    "feature_value": null,
    "feature_description": "Boost profile visibility in search results"
}
```

**Example Usage**:
```javascript
// Check if user has profile_boost feature
const response = await fetch('/api/subscription/features/check/profile_boost', {
    headers: { 'Authorization': 'Bearer <token>' }
});

const data = await response.json();
if (data.has_access) {
    // Show profile boost UI
}
```

### 3. Get All Plan Features by Role

**Endpoint**: `GET /api/subscription/plan/features/all`

**Response**:
```json
{
    "features_by_role": {
        "tutor": [
            {
                "feature_name": "profile_boost",
                "feature_description": "Boost profile visibility in search results",
                "is_enabled": true,
                "feature_value": null
            }
        ],
        "student": [
            {
                "feature_name": "premium_content",
                "feature_description": "Access to premium learning content",
                "is_enabled": true,
                "feature_value": null
            }
        ]
    }
}
```

---

## How It Works

### Architecture Flow

```
User subscribes to a plan
    ↓
Subscription stored in:
  - users.subscription_plan_id
  - user_investments table (history)
    ↓
Frontend calls: GET /api/subscription/features?role=tutor
    ↓
Backend queries:
  1. users table → get subscription_plan_id
  2. subscription_features table → get features for plan + role
    ↓
Returns features specific to:
  - The user's subscription plan
  - The current role (tutor/student/parent)
    ↓
Frontend shows/hides features based on response
```

### Data Relationships

```
subscription_plans (admin_db)
    ↓ (one-to-many)
subscription_features (admin_db)
    ├── subscription_plan_id
    └── user_role

users (user_db)
    └── subscription_plan_id → references subscription_plans.id
```

---

## Use Cases

### Use Case 1: Feature Gating in Frontend

```javascript
// Check if user can access analytics
async function showAnalytics() {
    const response = await fetch('/api/subscription/features/check/performance_analytics');
    const data = await response.json();

    if (data.has_access) {
        // Show analytics dashboard
        document.getElementById('analytics-panel').style.display = 'block';
    } else {
        // Show upgrade prompt
        showUpgradeModal('Upgrade to access analytics!');
    }
}
```

### Use Case 2: Dynamic Feature Display

```javascript
// Load all features for current role
async function loadFeatures() {
    const response = await fetch('/api/subscription/features');
    const features = await response.json();

    features.forEach(feature => {
        console.log(`${feature.feature_name}: ${feature.feature_description}`);

        // Enable feature in UI
        enableFeature(feature.feature_name, feature.feature_value);
    });
}
```

### Use Case 3: Multi-Role Feature Comparison

```javascript
// Show what features are available in each role
async function showPlanFeatures() {
    const response = await fetch('/api/subscription/plan/features/all');
    const data = await response.json();

    for (const [role, features] of Object.entries(data.features_by_role)) {
        console.log(`${role} features:`, features);
    }
}
```

---

## Feature Value Examples

Features can have optional configuration values:

| Feature | Value | Meaning |
|---------|-------|---------|
| `student_connections` | `"unlimited"` | No limit on connections |
| `student_connections` | `"50"` | Maximum 50 connections |
| `storage_quota` | `"10GB"` | 10GB storage limit |
| `monthly_sessions` | `"100"` | 100 tutoring sessions per month |
| `priority_support` | `null` | Boolean feature (on/off) |

---

## Benefits

1. ✅ **Role-Specific Features**: Same plan, different features per role
2. ✅ **Flexible Configuration**: Feature values allow limits and quotas
3. ✅ **Easy Management**: Add/remove features without code changes
4. ✅ **Centralized Control**: All features managed in admin database
5. ✅ **Feature Gating**: Frontend can check access before showing features
6. ✅ **Scalable**: Easy to add new features or roles

---

## Admin Management

### Adding a New Feature

```sql
INSERT INTO subscription_features
(subscription_plan_id, user_role, feature_name, feature_description, is_enabled, feature_value)
VALUES
(5, 'tutor', 'advanced_scheduling', 'Advanced scheduling tools', true, null);
```

### Disabling a Feature

```sql
UPDATE subscription_features
SET is_enabled = false
WHERE subscription_plan_id = 5
  AND user_role = 'tutor'
  AND feature_name = 'profile_boost';
```

### Updating Feature Value

```sql
UPDATE subscription_features
SET feature_value = '100'
WHERE subscription_plan_id = 5
  AND user_role = 'student'
  AND feature_name = 'monthly_sessions';
```

---

## Integration with Existing System

### Current Subscription Flow

1. **User Table**: Stores current active subscription
   - `users.subscription_plan_id`
   - `users.subscription_started_at`
   - `users.subscription_expires_at`

2. **User Investments Table**: Stores subscription history
   - `user_investments` (user-based)
   - `subscription_metrics` (performance data for tutors)

3. **Subscription Features**: Define what users can access
   - `subscription_features` (admin_db, role-based)

### Complete User Journey

```
User purchases subscription
    ↓
1. users.subscription_plan_id updated
2. Record added to user_investments
3. subscription_metrics initialized (for tutors)
    ↓
User switches role (tutor → student)
    ↓
Frontend calls /api/subscription/features?role=student
    ↓
Returns student-specific features for same plan
    ↓
UI shows/hides features based on role
```

---

## Files Created

1. [migrate_create_subscription_features_table.py](astegni-backend/migrate_create_subscription_features_table.py) - Initial migration script
2. [migrate_remove_features_from_subscription_plans.py](astegni-backend/migrate_remove_features_from_subscription_plans.py) - Remove features column
3. [subscription_features_endpoints.py](astegni-backend/subscription_features_endpoints.py) - API endpoints

---

## Summary

**Before**:
- Features stored in multiple columns: `astegni_features`, `subscription_type`, `features` (JSONB)
- No role-based feature differentiation
- Hard to manage or update features
- Unstructured data in subscription_plans table

**After**:
- Features in dedicated `subscription_features` table
- Role-specific features (tutor vs student vs parent)
- Configurable feature values
- Easy to add/remove/update features via database
- API endpoints for feature access checking
- Clean subscription_plans table (all feature columns removed)

**Migration Status**: ✅ Complete
**Features Seeded**: ✅ 33 features across 3 roles and 3 plans
**API Ready**: ✅ 3 endpoints available

The subscription system now supports role-based feature access!
