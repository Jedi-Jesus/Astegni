# 90-Day Role Removal Grace Period System

## Overview
The system implements a **90-day grace period** for role removal, giving users time to change their mind before permanent deletion.

## How It Works

### User Action Flow
1. User opens "Manage Role" modal from profile dropdown
2. Selects "Remove Role Permanently" option
3. Enters password and receives OTP via email/SMS
4. Enters 6-digit OTP code
5. Reviews final confirmation warning
6. Confirms permanent deletion

### Backend Process
1. **Verification**:
   - Password verification
   - OTP verification (extra security layer)
   - Role ownership check

2. **Immediate Actions**:
   - Set `is_active = False` on role profile
   - Set `scheduled_deletion_at = NOW() + 90 days`
   - Keep role in `users.roles` array (for restoration)
   - Clear `active_role` if it was the removed role

3. **What Happens**:
   - ✓ Profile is hidden from searches immediately
   - ✓ User cannot use the role's features
   - ✓ All data is preserved for 90 days
   - ✓ User can restore role anytime within 90 days

4. **After 90 Days**:
   - Automatic cron job permanently deletes:
     - Profile data
     - Removes role from `users.roles` array
     - All related data (CASCADE delete)

## Database Schema

### Profile Tables
All profile tables have these columns:
```sql
is_active BOOLEAN DEFAULT TRUE
scheduled_deletion_at TIMESTAMP DEFAULT NULL
```

Profile tables:
- `student_profiles`
- `tutor_profiles`
- `parent_profiles`
- `advertiser_profiles`
- `user_profiles`

## API Endpoints

### 1. Remove Role (Schedule Deletion)
```
DELETE /api/role/remove
```

**Request:**
```json
{
  "role": "student",
  "password": "user_password",
  "otp": "123456"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Student role scheduled for deletion in 90 days...",
  "deleted_role": "student",
  "new_active_role": null,
  "remaining_active_roles": ["tutor", "parent"],
  "scheduled_deletion_at": "2026-04-27T10:30:00",
  "days_remaining": 90,
  "can_restore": true
}
```

### 2. Check Deletion Status
```
GET /api/role/deletion-status
```

**Response:**
```json
{
  "success": true,
  "has_pending_deletion": true,
  "role": "student",
  "scheduled_deletion_at": "2026-04-27T10:30:00",
  "days_remaining": 45
}
```

### 3. Restore Role
```
POST /api/role/restore
```

**Request:**
```json
{
  "role": "student"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Student role has been restored successfully",
  "role_restored": "student"
}
```

## Cron Job for Automatic Deletion

### Setup Cron Job
File: `astegni-backend/cron_delete_expired_roles.py`

```bash
# Run daily at 2 AM
0 2 * * * cd /var/www/astegni/astegni-backend && /var/www/astegni/astegni-backend/venv/bin/python cron_delete_expired_roles.py >> /var/logs/role_deletion.log 2>&1
```

The cron job:
1. Finds all profiles with `scheduled_deletion_at < NOW()`
2. Permanently deletes profile data
3. Removes role from `users.roles` array
4. Logs all deletions

## Frontend Implementation

### Files
- **Modal**: `modals/common-modals/manage-role-modal.html`
- **JavaScript**: `js/common-modals/role-manager.js`
- **CSS**: Inline in modal file

### User Messages
When role is scheduled for deletion:
```
Your student role has been scheduled for deletion in 90 days.

✓ Your data will be preserved for 90 days
✓ You can restore your student role anytime by re-adding it
✓ After 90 days, the role and all data will be permanently deleted

You have 2 other active roles available.
```

## Security Features

### Multi-Layer Protection
1. **Password Verification**: User must enter their account password
2. **OTP Verification**: 6-digit OTP sent to verified email/phone
3. **Final Confirmation**: Warning screen with explicit consent
4. **Prevention**: Cannot remove last role (use "Leave Astegni" instead)

### OTP Details
- **Purpose**: `role_remove`
- **Expiration**: 10 minutes
- **One-time use**: OTP is marked as used after successful verification
- **Rate limited**: Max 5 OTP requests per minute

## Restoration Process

Users can restore a scheduled role two ways:

### 1. Via Add Role Modal
- Open "Add Role" modal
- Select the previously removed role
- System automatically:
  - Sets `is_active = True`
  - Clears `scheduled_deletion_at`
  - Reactivates the role

### 2. Via API
```javascript
await fetch('/api/role/restore', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ role: 'student' })
});
```

## Testing

### Manual Test
1. Open profile dropdown → "Manage Role"
2. Click "Remove Role Permanently"
3. Enter password and request OTP
4. Enter OTP code
5. Review final warning
6. Confirm deletion
7. Check database:
   ```sql
   SELECT is_active, scheduled_deletion_at FROM student_profiles WHERE user_id = 123;
   ```
   Should show: `is_active = false`, `scheduled_deletion_at = 90 days from now`

### Verify Grace Period
```sql
-- Check scheduled deletions
SELECT
  u.email,
  'student' as role,
  sp.scheduled_deletion_at,
  EXTRACT(day FROM (sp.scheduled_deletion_at - NOW())) as days_remaining
FROM users u
JOIN student_profiles sp ON sp.user_id = u.id
WHERE sp.scheduled_deletion_at IS NOT NULL
  AND sp.scheduled_deletion_at > NOW();
```

## Current Status

✅ Database columns added to all profile tables
✅ Backend endpoints implemented
✅ Frontend modal and JavaScript ready
✅ OTP verification integrated
✅ 90-day grace period logic complete
⚠️ Cron job needs to be set up on production server

## Next Steps

1. **Set up Cron Job**:
   ```bash
   ssh root@128.140.122.215
   crontab -e
   # Add: 0 2 * * * cd /var/www/astegni/astegni-backend && /var/www/astegni/astegni-backend/venv/bin/python cron_delete_expired_roles.py >> /var/logs/role_deletion.log 2>&1
   ```

2. **Create Deletion Countdown Banner** (Optional):
   - Show banner when user has pending deletion
   - Display days remaining
   - Provide "Restore Role" button

3. **Email Notifications** (Optional):
   - Send email when role is scheduled for deletion
   - Send reminders at 30 days, 7 days, 1 day before deletion
   - Send confirmation after permanent deletion

## Error Handling

### Common Issues

1. **"Removal failed. Please check your credentials"**
   - Check browser console for actual error
   - Verify password is correct
   - Verify OTP is valid and not expired
   - Check backend logs

2. **Profile deleted immediately instead of scheduled**
   - Verify `scheduled_deletion_at` column exists
   - Check if CASCADE delete is triggering
   - Verify using correct endpoint (`/api/role/remove` not a custom one)

3. **Cannot restore role**
   - Check if 90 days have passed
   - Verify role still in `users.roles` array
   - Check `scheduled_deletion_at` is in the future

## Database Queries

### Find roles scheduled for deletion
```sql
SELECT
  u.id,
  u.email,
  'student' as role,
  sp.scheduled_deletion_at,
  sp.is_active
FROM users u
JOIN student_profiles sp ON sp.user_id = u.id
WHERE sp.scheduled_deletion_at IS NOT NULL;
```

### Manually restore a role
```sql
UPDATE student_profiles
SET is_active = true, scheduled_deletion_at = NULL
WHERE user_id = 123;
```

### Manually delete expired roles
```sql
-- BE CAREFUL! This permanently deletes data
DELETE FROM student_profiles
WHERE scheduled_deletion_at < NOW()
  AND scheduled_deletion_at IS NOT NULL;
```

## Summary

The 90-day grace period system is **fully implemented** in the codebase:
- ✅ Database schema ready
- ✅ Backend logic complete
- ✅ Frontend UI implemented
- ✅ Security measures in place
- ⚠️ Cron job needs production setup

Users can safely remove roles knowing they have 90 days to change their mind, with all data preserved during that period.
