# Role Switcher Deactivated Roles Fix

## Problem Identified

The role switcher in `index.html` (both desktop `role-options` and mobile `mobile-role-options`) was potentially displaying deactivated roles because the backend API endpoints were **missing the check for the 'user' role**.

While the `student`, `tutor`, `parent`, and `advertiser` roles were being checked for `is_active` status, the **`user` role was not being checked**, which could lead to deactivated 'user' roles appearing in the role switcher.

## Root Cause

The following backend endpoints were missing the `'user'` role check:

1. **`GET /api/my-roles`** - Returns only active roles for role switcher
2. **`GET /api/check-role-status`** - Checks if a role is deactivated (for add-role modal)
3. **`POST /api/add-role`** - Reactivates deactivated roles (two locations in the code)

## Solution Applied

### 1. Fixed `/api/my-roles` Endpoint

**File:** `astegni-backend/app.py modules/routes.py` (lines 3486-3527)

**Added:**
```python
elif role == 'user':
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if profile and hasattr(profile, 'is_active'):
        is_active = profile.is_active
```

This ensures that **deactivated 'user' roles are filtered out** before being sent to the frontend role switcher.

---

### 2. Fixed `/api/check-role-status` Endpoint

**File:** `astegni-backend/app.py modules/routes.py` (lines 3529-3564)

**Added:**
```python
elif role == 'user':
    role_model = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
```

This ensures the add-role modal correctly detects when a 'user' role is deactivated and shows the **"⚠️ Role Already Exists (Deactivated)"** warning.

---

### 3. Fixed `/api/add-role` Endpoint (First Check)

**File:** `astegni-backend/app.py modules/routes.py` (lines 4026-4049)

**Added:**
```python
elif new_role == 'user':
    role_model = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
```

This prevents users from burning their OTP when trying to add a 'user' role that already exists and is active.

---

### 4. Fixed `/api/add-role` Endpoint (Reactivation Logic)

**File:** `astegni-backend/app.py modules/routes.py` (lines 4071-4098)

**Added:**
```python
elif new_role == 'user':
    role_model = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
```

This ensures that deactivated 'user' roles can be **reactivated** through the add-role flow.

---

## How It Works Now

### Role Switcher Flow (index.html)

1. **User opens profile dropdown** → Frontend calls `GET /api/my-roles`
2. **Backend filters roles:**
   ```python
   for role in current_user.roles:
       # Check each role's profile (student, tutor, parent, advertiser, user)
       if profile.is_active == True:
           active_roles.append(role)
   ```
3. **Only active roles returned** → Frontend displays only active roles
4. **Deactivated roles hidden** → User sees only roles they can switch to

### Deactivated Role Detection (Add Role Modal)

1. **User selects a role from dropdown** → Frontend calls `GET /api/check-role-status?role=user`
2. **Backend checks:**
   ```python
   if role == 'user':
       role_model = db.query(UserProfile).filter(...).first()
       is_active = role_model.is_active
   return {"is_deactivated": not is_active}
   ```
3. **If deactivated** → Modal shows orange warning + button changes to "Activate Role"
4. **If new** → Normal "Add Role" flow

### Reactivation Flow

1. **User enters password + OTP** → Frontend calls `POST /api/add-role`
2. **Backend checks if role is deactivated:**
   ```python
   if new_role == 'user':
       role_model = db.query(UserProfile).filter(...).first()
       if role_model.is_active == False:
           role_model.is_active = True  # Reactivate!
           return {"role_reactivated": True}
   ```
3. **Success** → Frontend shows "User role reactivated successfully!"

---

## All Affected Endpoints Now Handle All 5 Roles

| Endpoint | Student | Tutor | Parent | Advertiser | User |
|----------|---------|-------|--------|------------|------|
| `GET /api/my-roles` | ✅ | ✅ | ✅ | ✅ | ✅ (FIXED) |
| `GET /api/check-role-status` | ✅ | ✅ | ✅ | ✅ | ✅ (FIXED) |
| `POST /api/add-role` (check 1) | ✅ | ✅ | ✅ | ✅ | ✅ (FIXED) |
| `POST /api/add-role` (reactivate) | ✅ | ✅ | ✅ | ✅ | ✅ (FIXED) |
| `POST /api/role/deactivate` | ✅ | ✅ | ✅ | ✅ | ✅ (Already OK) |
| `DELETE /api/role/remove` | ✅ | ✅ | ✅ | ✅ | ✅ (Already OK) |

---

## Frontend (No Changes Needed)

The frontend in `js/root/profile-system.js` was **already correctly implemented**:

- `setupRoleSwitcher()` (line 600) calls `/api/my-roles` and trusts the backend filtering
- `updateMobileRoleSwitcher()` (line 827) uses the same filtered data
- No hardcoded role lists - everything dynamic from API

**The frontend was not the problem** - it was correctly calling the API and displaying whatever the backend returned. The issue was the backend was **not filtering out deactivated 'user' roles**.

---

## Testing Checklist

After restarting the backend, verify:

### 1. Role Switcher Displays Only Active Roles
- [ ] Login with a user that has multiple roles
- [ ] Open profile dropdown
- [ ] Verify only active roles are shown (both desktop and mobile)
- [ ] Deactivate a role via Settings → Manage Roles → Deactivate
- [ ] Refresh page
- [ ] Verify deactivated role is NO LONGER in role switcher

### 2. Deactivated Role Detection Works
- [ ] Click "Add Role" from profile dropdown
- [ ] Select a deactivated role from dropdown
- [ ] Verify orange warning appears: "⚠️ Role Already Exists (Deactivated)"
- [ ] Verify button text changes to "Activate Role"

### 3. Reactivation Works for All Roles
- [ ] Follow steps above to select deactivated role
- [ ] Enter password → OTP sent
- [ ] Enter OTP → Click "Activate Role"
- [ ] Verify success message: "User role reactivated successfully!"
- [ ] Verify role appears back in role switcher

### 4. Test All Role Types
Repeat the above tests for:
- [ ] Student role
- [ ] Tutor role
- [ ] Parent role
- [ ] Advertiser role
- [ ] User role (the one that was broken)

---

## Backend Restart Required

**IMPORTANT:** You must restart the backend server for these changes to take effect:

```bash
cd astegni-backend
# Stop the server (Ctrl+C)
python app.py
```

---

## Files Modified

1. **astegni-backend/app.py modules/routes.py**
   - Line 3515-3518: Added 'user' role check to `/api/my-roles`
   - Line 3553-3554: Added 'user' role check to `/api/check-role-status`
   - Line 4041-4042: Added 'user' role check to `/api/add-role` (first check)
   - Line 4083-4084: Added 'user' role check to `/api/add-role` (reactivation)

2. **No frontend changes required** - frontend was already correct

---

## Summary

The issue was that the backend was **incomplete** - it was checking `is_active` for 4 out of 5 role types, but **missing the 'user' role**. This meant:

- Deactivated 'user' roles could appear in the role switcher
- The add-role modal wouldn't detect deactivated 'user' roles
- Reactivation wouldn't work for 'user' roles

**All fixed now!** The backend now consistently checks `is_active` for **all 5 role types** across all relevant endpoints.
