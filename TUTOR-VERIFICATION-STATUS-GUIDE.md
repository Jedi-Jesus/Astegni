# Tutor Verification Status Guide

## Verification Status Values

The `verification_status` field in the `tutor_profiles` table should have these possible values:

1. **`not_verified`** - Tutors who registered but haven't requested verification (we don't display these)
2. **`pending`** - Tutors who requested verification, awaiting admin review
3. **`verified`** - Tutors approved by admin and active
4. **`suspended`** - Temporarily suspended tutors (policy violations, etc.)
5. **`rejected`** - Tutors whose verification request was denied

## Panel Data Filtering

### 1. **Verified Tutors Panel**
- **Filter**: `verification_status = 'verified'`
- **Shows**: All approved and active tutors
- **Purpose**: Manage currently active tutors

### 2. **Tutor Requests Panel** (Requested/Pending)
- **Filter**: `verification_status = 'pending'`
- **Shows**: Tutors awaiting verification review
- **Purpose**: Review and process new verification requests

### 3. **Suspended Tutors Panel**
- **Filter**: `verification_status = 'suspended'`
- **Shows**: Temporarily suspended tutors
- **Purpose**: Manage suspensions and reinstatements

### 4. **Rejected Tutors Panel**
- **Filter**: `verification_status = 'rejected'`
- **Shows**: Tutors whose verification was denied
- **Purpose**: Review rejected applications, allow reconsideration

### 5. **Live Tutor Requests Widget**
- **Filter**: `verification_status IN ('pending', 'verified', 'suspended', 'rejected')`
- **Excludes**: `not_verified` (tutors who haven't requested verification)
- **Shows**: Recent activity across all relevant statuses
- **Purpose**: Real-time activity monitoring

### 6. **Dashboard Statistics**
- **Counts**:
  - Pending: `WHERE verification_status = 'pending'`
  - Verified: `WHERE verification_status = 'verified'`
  - Suspended: `WHERE verification_status = 'suspended'`
  - Rejected: `WHERE verification_status = 'rejected'`
- **Excludes**: `not_verified` from all counts

## Database Schema

```sql
-- Verification status enum-like constraint
ALTER TABLE tutor_profiles
ADD CONSTRAINT check_verification_status
CHECK (verification_status IN ('not_verified', 'pending', 'verified', 'suspended', 'rejected'));

-- Default value for new tutors
ALTER TABLE tutor_profiles
ALTER COLUMN verification_status SET DEFAULT 'not_verified';
```

## Status Flow Diagram

```
Registration → [not_verified]
      ↓
Request Verification → [pending]
      ↓
   Admin Review
   ↙        ↘
[verified]  [rejected]
   ↓           ↓
   ↓      (can reapply)
   ↓           ↓
   ↓        [pending]
   ↓
(can be suspended)
   ↓
[suspended]
   ↓
(can be reinstated)
   ↓
[verified]
```

## API Endpoint Filters

### GET /api/admin/tutors/pending
```sql
SELECT * FROM tutor_profiles
WHERE verification_status = 'pending'
ORDER BY created_at DESC
```

### GET /api/admin/tutors/verified
```sql
SELECT * FROM tutor_profiles
WHERE verification_status = 'verified'
ORDER BY updated_at DESC
```

### GET /api/admin/tutors/suspended
```sql
SELECT * FROM tutor_profiles
WHERE verification_status = 'suspended'
ORDER BY updated_at DESC
```

### GET /api/admin/tutors/rejected
```sql
SELECT * FROM tutor_profiles
WHERE verification_status = 'rejected'
ORDER BY updated_at DESC
```

### GET /api/admin/tutors/recent-activity
```sql
SELECT * FROM tutor_profiles
WHERE verification_status != 'not_verified'
ORDER BY updated_at DESC
LIMIT 10
```

### GET /api/admin/tutors/statistics
```sql
-- Exclude not_verified from all counts
SELECT
  COUNT(*) FILTER (WHERE verification_status = 'pending') as pending,
  COUNT(*) FILTER (WHERE verification_status = 'verified') as verified,
  COUNT(*) FILTER (WHERE verification_status = 'suspended') as suspended,
  COUNT(*) FILTER (WHERE verification_status = 'rejected') as rejected
FROM tutor_profiles
WHERE verification_status != 'not_verified'
```

## Implementation Notes

### Frontend Behavior
- **Never display** `not_verified` tutors in admin panels
- **Live widget** shows all statuses except `not_verified`
- **Statistics** exclude `not_verified` from counts
- **Search** should also exclude `not_verified` tutors

### Backend Validation
- New tutors start with `verification_status = 'not_verified'`
- Only tutors can request verification (role check)
- Admin role required to change status (except initial request)
- Status transitions must follow logical flow

### Status Badge Colors
- `pending` → Yellow (warning)
- `verified` → Green (success)
- `suspended` → Orange (alert)
- `rejected` → Red (danger)
- `not_verified` → Gray (not shown in admin)

## Sample Data

### Not Verified (not shown in admin)
```json
{
  "verification_status": "not_verified",
  "name": "New Tutor",
  "note": "Has account but hasn't requested verification"
}
```

### Pending (shown in Requests panel)
```json
{
  "verification_status": "pending",
  "name": "Abebe Tadesse",
  "requested_at": "2024-01-15",
  "documents_submitted": true
}
```

### Verified (shown in Verified panel)
```json
{
  "verification_status": "verified",
  "name": "Sara Bekele",
  "verified_at": "2024-01-10",
  "rating": 4.8
}
```

### Suspended (shown in Suspended panel)
```json
{
  "verification_status": "suspended",
  "name": "Daniel Haile",
  "suspended_at": "2024-01-12",
  "reason": "Policy violation"
}
```

### Rejected (shown in Rejected panel)
```json
{
  "verification_status": "rejected",
  "name": "Marta Kebede",
  "rejected_at": "2024-01-08",
  "reason": "Incomplete documentation"
}
```

## Key Points

1. **`not_verified`** tutors are completely hidden from admin dashboard
2. Each panel shows only one specific status (except dashboard and live widget)
3. Live widget shows all statuses except `not_verified` for activity monitoring
4. Statistics exclude `not_verified` from all calculations
5. Status transitions should be logged for audit trail