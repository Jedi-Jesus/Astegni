# Subscription Modal - Data Flow & Tables

## Quick Answer

The subscription modal cards read subscription features from **TWO tables** in the `astegni_admin_db` database:

1. **`subscription_plans`** - Main plan information (title, price, currency, discounts)
2. **`subscription_features`** - Role-based features for each plan

---

## Complete Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SUBSCRIPTION MODAL                          │
│                  (subscription-modal.html + .js)                    │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ 1. User opens modal
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  JavaScript: fetchSubscriptionPlans(subscriptionType)               │
│  File: js/common-modals/subscription-modal.js:65-88                 │
│                                                                      │
│  GET /api/admin-db/subscription-plans?subscription_type=tutor       │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ 2. HTTP Request
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Backend API: get_subscription_plans()                              │
│  File: astegni-backend/admin_db_endpoints.py:498-612                │
│                                                                      │
│  Step 1: Query subscription_plans table                             │
│  Step 2: For each plan, query subscription_features table           │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      DATABASE: astegni_admin_db                     │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │ TABLE 1: subscription_plans                              │      │
│  │ ─────────────────────────────────────────────────────── │      │
│  │ Columns:                                                 │      │
│  │   - id (Primary Key)                                     │      │
│  │   - package_title (e.g., "Standard", "Premium")          │      │
│  │   - package_price (e.g., 1500.0)                         │      │
│  │   - currency (e.g., "ETB")                               │      │
│  │   - is_base_package (boolean)                            │      │
│  │   - discount_3_months, discount_6_months, discount_yearly│      │
│  │   - is_active (boolean)                                  │      │
│  │   - display_order (for sorting)                          │      │
│  │   - label (e.g., "popular", "none")                      │      │
│  │   - duration_days (repurposed as storage_gb)             │      │
│  │   - created_at, updated_at                               │      │
│  └──────────────────────────────────────────────────────────┘      │
│                                  │                                  │
│                                  │ Joined by subscription_plan_id   │
│                                  │                                  │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │ TABLE 2: subscription_features                           │      │
│  │ ─────────────────────────────────────────────────────── │      │
│  │ Columns:                                                 │      │
│  │   - id (Primary Key)                                     │      │
│  │   - subscription_plan_id (Foreign Key → plans.id)        │      │
│  │   - user_role (e.g., "tutor", "student", "parent")       │      │
│  │   - feature_name (e.g., "profile_boost")                 │      │
│  │   - feature_description (e.g., "Boost visibility")       │      │
│  │   - is_enabled (boolean)                                 │      │
│  │   - feature_value (optional, e.g., "50%")                │      │
│  │   - created_at, updated_at                               │      │
│  └──────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ 3. Data returned
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  API Response (JSON)                                                │
│  {                                                                  │
│    "success": true,                                                 │
│    "plans": [                                                       │
│      {                                                              │
│        "id": 7,                                  ← FROM plans table │
│        "package_title": "Standard",              ← FROM plans table │
│        "package_price": 1500.0,                  ← FROM plans table │
│        "currency": "ETB",                        ← FROM plans table │
│        "features": [                             ← FROM features    │
│          "Boost profile visibility",             ← FROM features    │
│          "Priority support"                      ← FROM features    │
│        ],                                                           │
│        "features_by_role": {                     ← FROM features    │
│          "tutor": [...]                          ← FILTERED by role │
│        }                                                            │
│      }                                                              │
│    ]                                                                │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ 4. Render cards
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  JavaScript: renderPlanCard()                                       │
│  File: js/common-modals/subscription-modal.js:139-296               │
│                                                                      │
│  Creates HTML cards with:                                           │
│    - Plan title (from subscription_plans)                           │
│    - Price (from subscription_plans)                                │
│    - Features list (from subscription_features, filtered by role)   │
│    - Subscribe button                                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Detailed SQL Queries

### Query 1: Get All Plans
**Location**: [admin_db_endpoints.py:519-532](astegni-backend/admin_db_endpoints.py:519-532)

```sql
SELECT id, package_title, package_price, currency, is_base_package,
       discount_3_months, discount_6_months, discount_yearly,
       is_active, display_order, label, duration_days,
       created_at, updated_at
FROM subscription_plans
WHERE is_active = TRUE
ORDER BY display_order ASC, id ASC
```

**Returns**: All active subscription plans (6 plans currently)

---

### Query 2: Get Features for Each Plan (Role-Specific)
**Location**: [admin_db_endpoints.py:560-566](astegni-backend/admin_db_endpoints.py:560-566)

**When role is specified** (e.g., `subscription_type=tutor`):
```sql
SELECT user_role, feature_name, feature_description, is_enabled, feature_value
FROM subscription_features
WHERE subscription_plan_id = %s
  AND user_role = %s           -- ← FILTERED BY ROLE
  AND is_enabled = TRUE
ORDER BY user_role, feature_name
```

**When no role specified**:
```sql
SELECT user_role, feature_name, feature_description, is_enabled, feature_value
FROM subscription_features
WHERE subscription_plan_id = %s
  AND is_enabled = TRUE
ORDER BY user_role, feature_name
```

**Returns**: Features for the specified role only

---

## Example: Standard Plan (ID 7) Data

### From `subscription_plans` table:
```
id: 7
package_title: "Standard"
package_price: 1500.0
currency: "ETB"
is_base_package: false
discount_3_months: 7.0
discount_6_months: 10.0
discount_yearly: 12.0
duration_days: 250  (repurposed as storage_gb)
is_active: true
display_order: 6
label: "none"
```

### From `subscription_features` table (when user_role = 'tutor'):
```
┌────┬─────────────────────┬───────────┬──────────────────────┬────────────────────────────────────┐
│ id │ subscription_plan_id│ user_role │ feature_name         │ feature_description                │
├────┼─────────────────────┼───────────┼──────────────────────┼────────────────────────────────────┤
│ 29 │ 7                   │ tutor     │ performance_analytics│ Access to detailed metrics         │
│ 30 │ 7                   │ tutor     │ priority_support     │ Priority customer support          │
│ 31 │ 7                   │ tutor     │ profile_boost        │ Boost profile visibility           │
│ 32 │ 7                   │ tutor     │ student_connections  │ Connect with unlimited students    │
└────┴─────────────────────┴───────────┴──────────────────────┴────────────────────────────────────┘
```

### From `subscription_features` table (when user_role = 'student'):
```
┌────┬─────────────────────┬───────────┬──────────────────┬────────────────────────────────────┐
│ id │ subscription_plan_id│ user_role │ feature_name     │ feature_description                │
├────┼─────────────────────┼───────────┼──────────────────┼────────────────────────────────────┤
│ 33 │ 7                   │ student   │ premium_content  │ Access to premium learning content │
│ 34 │ 7                   │ student   │ priority_support │ Priority customer support          │
│ 35 │ 7                   │ student   │ progress_tracking│ Advanced progress tracking tools   │
│ 36 │ 7                   │ student   │ unlimited_tutors │ Connect with unlimited tutors      │
└────┴─────────────────────┴───────────┴──────────────────┴────────────────────────────────────┘
```

---

## Frontend Code Breakdown

### 1. Fetch Plans (Line 67)
```javascript
const url = `${API_BASE_URL}/api/admin-db/subscription-plans?subscription_type=${subscriptionType}`;
```
- **Database**: `astegni_admin_db`
- **Tables**: `subscription_plans` + `subscription_features`
- **Filter**: By `user_role` column in `subscription_features`

### 2. Render Cards (Line 139-296)
```javascript
function renderPlanCard(plan, index) {
    const planName = plan.package_title;        // ← FROM subscription_plans
    const price = plan.package_price;           // ← FROM subscription_plans
    const features = plan.features || [];       // ← FROM subscription_features (filtered)
    const features_by_role = plan.features_by_role; // ← FROM subscription_features

    // Generate features list HTML
    features.forEach(feature => {
        featuresHTML += `<li>${feature}</li>`;  // Shows feature_description
    });
}
```

### 3. Display Features (Line 168-189)
```javascript
// Default features based on storage
featuresHTML = `
    <li class="flex items-center gap-2">
        <svg>...</svg>
        <span>${storageDisplay} Storage</span>     ← FROM subscription_plans.duration_days
    </li>
`;

// Features from database
features.forEach(feature => {
    featuresHTML += `
        <li>
            <span>${feature}</span>                ← FROM subscription_features.feature_description
        </li>
    `;
});
```

---

## Key Points

1. **Two Tables**:
   - `subscription_plans` (main plan data)
   - `subscription_features` (role-specific features)

2. **Role Filtering**:
   - Features are filtered by `user_role` column in `subscription_features`
   - Each role (tutor/student/parent) sees different features

3. **Database**:
   - Both tables are in `astegni_admin_db` (NOT `astegni_user_db`)

4. **Join Logic**:
   - Plans are fetched first
   - For each plan, features are fetched separately with role filter
   - Features are grouped by role in the response

5. **Backward Compatibility**:
   - `features`: Flat array of feature descriptions
   - `features_by_role`: Object grouped by role (tutor/student/parent)

---

## Verify Database Contents

### Check subscription_plans:
```bash
cd astegni-backend
python -c "import psycopg; conn = psycopg.connect('postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db'); cur = conn.cursor(); cur.execute('SELECT id, package_title, package_price FROM subscription_plans'); print('\n'.join([f'ID {r[0]}: {r[1]} - {r[2]} ETB' for r in cur.fetchall()])); conn.close()"
```

### Check subscription_features:
```bash
cd astegni-backend
python -c "import psycopg; conn = psycopg.connect('postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db'); cur = conn.cursor(); cur.execute('SELECT sp.package_title, sf.user_role, sf.feature_description FROM subscription_features sf JOIN subscription_plans sp ON sf.subscription_plan_id = sp.id WHERE sp.id = 7 ORDER BY sf.user_role'); print('\n'.join([f'{r[0]} ({r[1]}): {r[2]}' for r in cur.fetchall()])); conn.close()"
```

---

## Summary

**The subscription modal cards read from:**
- **Table**: `subscription_features` (in `astegni_admin_db`)
- **Filtered by**: `user_role` column (tutor/student/parent)
- **Joined with**: `subscription_plans` table (for plan details)
- **API Endpoint**: `/api/admin-db/subscription-plans?subscription_type={role}`
- **Backend File**: `astegni-backend/admin_db_endpoints.py:498-612`
- **Frontend File**: `js/common-modals/subscription-modal.js:65-296`
