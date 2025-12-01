# Role Switching Token Regeneration Fix

## Problem

When a user switches roles in `index.html` (e.g., from tutor to student), the JWT token was **NOT being regenerated** with the updated role information. This caused issues where:

1. User switches from `tutor` → `student` in index.html
2. Token still has `role: "tutor"` in its payload
3. Backend endpoints checking the token see the old role
4. Permission checks fail (e.g., "Only students and parents can send requests")

### Example Scenario

**User ID 115 has 3 roles: tutor, student, parent**

```javascript
// Before role switch - logged in as tutor
const payload = decodeJWT(token);
console.log(payload);
// {
//   sub: "115",              // users.id
//   role: "tutor",           // ❌ Active role in token
//   role_ids: {
//     student: "200",
//     tutor: "123",
//     parent: "45"
//   }
// }

// User clicks "Switch to Student" in UI
// Database updates: users.active_role = "student" ✅
// BUT token still has role: "tutor" ❌

// When trying to access features restricted to students
// Backend checks token and sees role: "tutor"
// Returns error: "Only students and parents can send requests"
```

## Root Cause

The `/api/switch-role` endpoint was only updating the database:

```python
# OLD CODE (BEFORE FIX)
@router.post("/api/switch-role")
def switch_user_role(...):
    fresh_user.active_role = new_role
    db.commit()

    return {
        "message": f"Successfully switched to {new_role} role",
        "active_role": new_role,
        "user_roles": fresh_user.roles
        # ❌ NO access_token returned!
    }
```

The frontend would update localStorage with the new role, but the **JWT token remained unchanged**:

```javascript
// OLD FRONTEND CODE (BEFORE FIX)
if (response.ok) {
    const data = await response.json();

    // Updates localStorage ✅
    localStorage.setItem('userRole', newRole);

    // But token is NOT updated ❌
    // localStorage.getItem('token') still has old role
}
```

## Solution

### Backend Fix ([astegni-backend/app.py modules/routes.py](astegni-backend/app.py modules/routes.py:1853-1914))

The `/api/switch-role` endpoint now **generates and returns a new JWT token** with the updated active role:

```python
# NEW CODE (AFTER FIX)
@router.post("/api/switch-role")
def switch_user_role(...):
    """
    Switch user's active role and return new JWT token with updated role_ids
    """
    # Update database
    fresh_user.active_role = new_role
    db.commit()

    # ✅ Generate new JWT token with updated role
    role_ids = get_role_ids_from_user(fresh_user, db)

    token_data = {
        "sub": fresh_user.id,
        "role": new_role,  # ✅ Updated active role
        "role_ids": role_ids
    }

    new_access_token = create_access_token(data=token_data)
    new_refresh_token = create_refresh_token(data=token_data)

    # Store new refresh token
    refresh_token_obj = RefreshToken(
        token=new_refresh_token,
        user_id=fresh_user.id,
        expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(refresh_token_obj)
    db.commit()

    return {
        "message": f"Successfully switched to {new_role} role",
        "active_role": new_role,
        "user_roles": fresh_user.roles,
        "access_token": new_access_token,  # ✅ NEW
        "refresh_token": new_refresh_token,  # ✅ NEW
        "token_type": "bearer"
    }
```

### Frontend Fix 1 ([js/index/profile-and-authentication.js](js/index/profile-and-authentication.js:103-118))

```javascript
// NEW CODE (AFTER FIX)
if (response.ok) {
    const data = await response.json();

    // ✅ CRITICAL: Update tokens with new JWT
    if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('access_token', data.access_token);
        console.log('[switchRole] Updated access token with new role');
    }

    if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token);
    }

    // ✅ Update AuthManager token
    if (window.AuthManager) {
        window.AuthManager.token = data.access_token;
    }

    // Update localStorage with new role
    localStorage.setItem('userRole', newRole);
    // ... rest of the code
}
```

### Frontend Fix 2 ([js/root/profile-system.js](js/root/profile-system.js:836-851))

Same fix applied to the `switchToRole()` function in profile-system.js.

## How It Works Now

### Complete Flow (After Fix)

1. **User clicks "Switch to Student"**

2. **Frontend calls `/api/switch-role`** with `{ role: "student" }`

3. **Backend:**
   - Updates database: `users.active_role = "student"` ✅
   - Fetches all role-specific IDs from database
   - Generates **NEW JWT token** with updated role:
     ```python
     {
       "sub": "115",
       "role": "student",  # ✅ Updated!
       "role_ids": {
         "student": "200",
         "tutor": "123",
         "parent": "45"
       }
     }
     ```
   - Returns new token to frontend

4. **Frontend:**
   - Receives new token from API response
   - Updates localStorage: `localStorage.setItem('token', new_token)` ✅
   - Updates AuthManager: `window.AuthManager.token = new_token` ✅
   - Redirects to student profile page

5. **Subsequent API calls:**
   - Use the new token with `role: "student"` ✅
   - Backend permission checks now see correct role
   - Features work as expected! ✅

### Token Comparison

```javascript
// BEFORE role switch (tutor)
{
  "sub": "115",
  "role": "tutor",
  "role_ids": {
    "student": "200",
    "tutor": "123",
    "parent": "45"
  },
  "exp": 1234567890
}

// AFTER switching to student (with NEW TOKEN)
{
  "sub": "115",
  "role": "student",    // ✅ Changed
  "role_ids": {         // ✅ Same (user still has all roles)
    "student": "200",
    "tutor": "123",
    "parent": "45"
  },
  "exp": 1234569999     // ✅ New expiration time
}
```

## Testing the Fix

### 1. Test Role Switching

```javascript
// Before switching roles, check token
const beforePayload = authManager.decodeJWT(localStorage.getItem('token'));
console.log('Before switch:', beforePayload.role);  // "tutor"

// Switch role in UI (tutor → student)
// ... click "Switch to Student" ...

// After switch, check token again
const afterPayload = authManager.decodeJWT(localStorage.getItem('token'));
console.log('After switch:', afterPayload.role);   // "student" ✅
```

### 2. Test Permission Checks

```javascript
// As student, try to access student-only features
const response = await fetch('/api/tutor/packages/request', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({ ... })
});

// Should now work! Token has role: "student"
console.log(response.status);  // 200 ✅
```

### 3. Check in Browser DevTools

```javascript
// After role switch, run in console:
const payload = authManager.decodeJWT(authManager.getToken());
console.log('Current role in token:', payload.role);
console.log('Active role ID:', authManager.getActiveRoleId());
```

## Files Changed

### Backend
- [x] `astegni-backend/app.py modules/routes.py` (lines 1853-1914)
  - Updated `/api/switch-role` endpoint to generate and return new tokens

### Frontend
- [x] `js/index/profile-and-authentication.js` (lines 103-118)
  - Updated `switchRole()` to store new token from API response

- [x] `js/root/profile-system.js` (lines 836-851)
  - Updated `switchToRole()` to store new token from API response

## Benefits

1. **Correct Permission Checks**: Backend always sees the current active role
2. **Consistent State**: Token matches database state
3. **Security**: Fresh token with updated expiration time
4. **Seamless UX**: Role switching works immediately without logout/login
5. **Multi-Role Support**: Users can freely switch between roles they have

## Important Notes

- **Old refresh tokens are NOT revoked** when switching roles (same as login)
- **Token expiration resets** when you switch roles (new 30-minute window)
- **All role_ids remain in token** even after switching (user still has all roles)
- **Only active role changes** in the token payload

## Common Mistakes to Avoid

### ❌ DON'T: Forget to update the token

```javascript
// WRONG - only updates localStorage role
if (response.ok) {
    localStorage.setItem('userRole', newRole);
    // ❌ Token not updated!
}
```

### ✅ DO: Update both role AND token

```javascript
// CORRECT - updates both
if (response.ok) {
    const data = await response.json();

    // Update token ✅
    if (data.access_token) {
        localStorage.setItem('token', data.access_token);
    }

    // Update role ✅
    localStorage.setItem('userRole', newRole);
}
```

## Summary

**The fix ensures that when a user switches roles, they get a fresh JWT token with the updated active role, so all subsequent API calls use the correct role for permission checks.**

This solves the issue where user ID 115 (with tutor, student, parent roles) could switch to student in the UI but still be rejected from student-only features because the token still said "tutor".
