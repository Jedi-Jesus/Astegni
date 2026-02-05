# Subscription API Endpoints Summary

## Overview
Two separate API endpoint sets for tutor and student subscriptions, each querying their respective database tables.

---

## Tutor Subscription Endpoints

### Base Path: `/api/tutor`

#### 1. Get All Subscriptions
```
GET /api/tutor/subscriptions
```

**Authentication**: Required (JWT token in Authorization header)

**Response**: Array of subscription objects with performance metrics

```json
[
  {
    "id": 1,
    "tutor_profile_id": 2,
    "plan_id": 8,
    "plan_name": "Premium",
    "description": "15,516 impressions, 669 clicks, 82 connections",
    "amount": 5000.00,
    "current_value": 8200.00,
    "roi_percentage": 64.00,
    "status": "active",
    "start_date": "2025-07-13T00:00:00",
    "end_date": "2028-04-08T00:00:00",
    "payment_method": null,
    "transaction_id": null,
    "total_impressions": 15516,
    "profile_views": 415,
    "clicks": 669,
    "click_through_rate": 4.31,
    "student_connections": 82,
    "connection_rate": 19.76,
    "cost_per_impression": 0.3222,
    "cost_per_click": 7.47,
    "cost_per_connection": 60.98,
    "created_at": "2025-07-13T00:00:00"
  }
]
```

**Data Source**:
- `tutor_investments` table (investment_type = 'subscription')
- `subscription_metrics` table (LEFT JOIN for performance data)
- `tutor_profiles` table (for subscription_plan_id)

#### 2. Get Current Subscription
```
GET /api/tutor/subscriptions/current
```

**Authentication**: Required

**Response**: Current subscription status

```json
{
  "tutor_profile_id": 2,
  "plan_id": 8,
  "started_at": "2025-07-13T00:00:00",
  "expires_at": "2028-04-08T00:00:00",
  "is_active": true
}
```

**Data Source**: `tutor_profiles` table

#### 3. Get Subscription Metrics
```
GET /api/tutor/subscriptions/{subscription_id}/metrics
```

**Authentication**: Required

**Response**: Detailed performance metrics for a specific subscription

```json
{
  "investment_name": "Premium",
  "amount": 5000.00,
  "status": "active",
  "investment_date": "2025-07-13",
  "maturity_date": "2028-04-08",
  "metrics": {
    "total_impressions": 15516,
    "profile_views": 415,
    "clicks": 669,
    "click_through_rate": 4.31,
    "student_connections": 82,
    "connection_rate": 19.76,
    "cost_per_impression": 0.3222,
    "cost_per_click": 7.47,
    "cost_per_connection": 60.98
  },
  "period_start": "2025-07-13T00:00:00",
  "period_end": "2028-04-08T00:00:00"
}
```

**Data Source**:
- `tutor_investments` table
- `subscription_metrics` table

---

## Student Subscription Endpoints

### Base Path: `/api/student`

#### 1. Get All Subscriptions
```
GET /api/student/subscriptions
```

**Authentication**: Required (JWT token in Authorization header)

**Response**: Array of subscription objects

```json
[
  {
    "id": 1,
    "student_profile_id": 1,
    "plan_id": 8,
    "plan_name": "Standard +",
    "description": "Premium access to tutors and learning resources for 500 days",
    "amount": 2800.00,
    "current_value": 833.33,
    "roi_percentage": -70.24,
    "status": "active",
    "start_date": "2026-01-14T00:00:00",
    "end_date": "2026-03-09T00:00:00",
    "payment_method": "CBE Birr",
    "transaction_id": "STD-429005771",
    "created_at": "2026-01-14T00:00:00"
  }
]
```

**Data Source**:
- `student_investments` table (investment_type = 'subscription')
- `student_profiles` table (for subscription_plan_id)

#### 2. Get Current Subscription
```
GET /api/student/subscriptions/current
```

**Authentication**: Required

**Response**: Current subscription status

```json
{
  "student_profile_id": 1,
  "plan_id": 8,
  "started_at": "2026-01-14T00:00:00",
  "expires_at": "2026-03-09T00:00:00",
  "is_active": true
}
```

**Data Source**: `student_profiles` table

#### 3. Get Subscription Details
```
GET /api/student/subscriptions/{subscription_id}
```

**Authentication**: Required

**Response**: Detailed information about a specific subscription

```json
{
  "id": 1,
  "student_profile_id": 1,
  "plan_name": "Standard +",
  "description": "Premium access to tutors and learning resources for 500 days",
  "amount": 2800.00,
  "current_value": 833.33,
  "roi_percentage": -70.24,
  "status": "active",
  "start_date": "2026-01-14",
  "end_date": "2026-03-09",
  "payment_method": "CBE Birr",
  "transaction_id": "STD-429005771",
  "created_at": "2026-01-14T00:00:00"
}
```

**Data Source**: `student_investments` table

---

## Key Differences

| Feature | Tutor Endpoints | Student Endpoints |
|---------|----------------|-------------------|
| **Base Path** | `/api/tutor` | `/api/student` |
| **Data Source** | `tutor_investments` + `subscription_metrics` | `student_investments` |
| **Performance Metrics** | ✅ Yes (impressions, CTR, connections) | ❌ No |
| **Payment Info** | ❌ No | ✅ Yes (payment_method, transaction_id) |
| **Response Fields** | 20+ fields (includes metrics) | 13 fields (no metrics) |

---

## Frontend Integration

### File: `earnings-investments-manager.js`

**Function**: `loadStudentSubscriptions()`

**Logic**:
```javascript
// Determine endpoint based on user role
const user = JSON.parse(localStorage.getItem('user'));
const isTutor = user && user.roles && user.roles.includes('tutor');
const endpoint = isTutor
    ? `${this.API_BASE_URL}/api/tutor/subscriptions`
    : `${this.API_BASE_URL}/api/student/subscriptions`;
```

**Behavior**:
- **Tutor logged in** → Calls `/api/tutor/subscriptions`
- **Student logged in** → Calls `/api/student/subscriptions`
- **Auto-detection** → Based on `user.roles` in localStorage

---

## Authentication

All endpoints require JWT authentication:

```javascript
headers: {
    'Authorization': 'Bearer <jwt_token>',
    'Content-Type': 'application/json'
}
```

**Token Validation**:
- Extracts `user_id` from JWT payload
- Looks up tutor/student profile based on `user_id`
- Ensures user can only access their own data

---

## Error Responses

### 401 Unauthorized
```json
{
  "detail": "No authorization header"
}
```

### 404 Not Found
```json
{
  "detail": "Tutor profile not found"
}
```

### 422 Unprocessable Entity
```json
{
  "detail": [
    {
      "loc": ["header", "authorization"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

---

## Database Schema Reference

### Tutor Tables
```sql
-- Current subscription
tutor_profiles (
    subscription_plan_id,
    subscription_started_at,
    subscription_expires_at
)

-- Subscription history
tutor_investments (
    investment_type = 'subscription',
    tutor_profile_id,
    investment_name,
    amount,
    ...
)

-- Performance metrics
subscription_metrics (
    investment_id,
    tutor_profile_id,
    total_impressions,
    clicks,
    click_through_rate,
    ...
)
```

### Student Tables
```sql
-- Current subscription
student_profiles (
    subscription_plan_id,
    subscription_started_at,
    subscription_expires_at
)

-- Subscription history
student_investments (
    investment_type = 'subscription',
    student_profile_id,
    investment_name,
    amount,
    payment_method,
    transaction_id,
    ...
)
```

---

## Testing

### Tutor Endpoint Test
```bash
curl -X GET "http://localhost:8000/api/tutor/subscriptions" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Student Endpoint Test
```bash
curl -X GET "http://localhost:8000/api/student/subscriptions" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Files Modified/Created

### Backend
1. `tutor_subscription_endpoints.py` - Tutor subscription API
2. `student_subscription_endpoints.py` - Student subscription API
3. `app.py` - Router registration

### Frontend
1. `earnings-investments-manager.js` - Updated `loadStudentSubscriptions()` to detect role

---

## Summary

✅ **Separate endpoints** for tutors and students
✅ **Role-based routing** in frontend
✅ **Performance metrics** for tutors only
✅ **Payment tracking** for students only
✅ **JWT authentication** on all endpoints
✅ **Proper error handling** with meaningful messages

The system now correctly routes subscription requests based on user role and returns appropriate data from the correct database tables.
