# Testing the 90-Day Role Removal System

## Status Check

✅ Database has `scheduled_deletion_at` columns in all profile tables
✅ Backend endpoint `/api/role/remove` implements 90-day grace period
✅ Frontend modal has proper UI flow
✅ Cron job script exists for automatic deletion
✅ Debug logging added to frontend

## Issue You're Experiencing

**Problem**: "Removal failed. Please check your credentials and try again."
**But**: Role is being removed from `users.roles` array and profile is deleted

## Diagnostic Steps

### Step 1: Check Browser Console
When you click "Yes, Delete Permanently":
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for these debug logs:
   ```
   [RoleManager] Remove role response status: XXX
   [RoleManager] Response OK: true/false
   [RoleManager] Response data: {...}
   [RoleManager] data.success: true/false
   ```

### Step 2: Check What's Actually Happening

Run this query to see if the role is being scheduled or deleted:
```sql
-- Check if student profile still exists
SELECT
  sp.id,
  sp.user_id,
  sp.is_active,
  sp.scheduled_deletion_at,
  u.email,
  u.roles
FROM student_profiles sp
JOIN users u ON u.id = sp.user_id
WHERE u.email = 'your_email@example.com';
```

### Step 3: Test Backend Directly

Test the endpoint manually:
```bash
cd astegni-backend
python test_role_remove_response.py
```

Update the script with your credentials first!

## Possible Causes

### Cause 1: Frontend Condition Check Issue
The frontend checks `if (response.ok && data.success)` but maybe:
- `data.success` is `undefined` or `false`
- Response status is not 200
- Backend returns different structure

**Solution**: Check console logs added in role-manager.js

### Cause 2: Different Endpoint Being Called
Maybe there's a custom endpoint that actually deletes instead of scheduling.

**Check**: Search for other DELETE endpoints
```bash
cd astegni-backend
grep -n "DELETE.*role" *.py
```

### Cause 3: OTP Verification Failing
If OTP is invalid/expired, backend returns error but something else deletes the role.

**Check Backend Response**: Look at actual error message in console

## Quick Fix Test

Let's verify the endpoint response format. Add this to your test:

### JavaScript Test (Run in Browser Console)
```javascript
// Test the endpoint directly
const testRoleRemove = async () => {
  const response = await fetch('http://localhost:8000/api/role/remove', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('access_token')}`
    },
    body: JSON.stringify({
      role: 'student',  // Change to your role
      password: 'your_password',
      otp: '123456'  // Use valid OTP
    })
  });

  const data = await response.json();
  console.log('Status:', response.status);
  console.log('OK:', response.ok);
  console.log('Data:', data);
  console.log('Has success field?', 'success' in data);
  console.log('Success value:', data.success);
};

testRoleRemove();
```

## Expected Behavior

### What SHOULD Happen:
1. User submits password + OTP
2. Backend returns:
   ```json
   {
     "success": true,
     "message": "Student role scheduled for deletion in 90 days...",
     "deleted_role": "student",
     "scheduled_deletion_at": "2026-04-27T10:30:00",
     "days_remaining": 90
   }
   ```
3. Frontend sees `response.ok === true` and `data.success === true`
4. Shows success message with 90-day info
5. Redirects to index.html

### What IS Happening:
1. Role is removed from `users.roles` array (shouldn't happen)
2. Profile is deleted (shouldn't happen immediately)
3. Frontend shows "Removal failed" (condition not met)

This suggests:
- Either backend is not returning `success: true`
- Or there's a different code path being executed

## Next Steps

1. **Check Console**: Look at the 4 debug log lines
2. **Share Console Output**: Tell me what the logs show
3. **Check Database**: See if profile still exists or is deleted
4. **Check Backend Logs**: Any errors in backend terminal

Once I see the console output, I can identify the exact issue!

## Manual Database Fix (If Needed)

If you need to manually set up a scheduled deletion:
```sql
-- Schedule a role for deletion (90 days from now)
UPDATE student_profiles
SET
  is_active = false,
  scheduled_deletion_at = CURRENT_TIMESTAMP + INTERVAL '90 days'
WHERE user_id = 123;  -- Your user ID
```

To restore:
```sql
-- Restore a scheduled role
UPDATE student_profiles
SET
  is_active = true,
  scheduled_deletion_at = NULL
WHERE user_id = 123;
```
