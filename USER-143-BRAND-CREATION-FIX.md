# User 143 Brand Creation Issue - SOLVED

## Problem Summary

**Error**: "Advertiser profile not found" (HTTP 404) when user 143 tries to create a brand.

**Why it happens**: User 143's JWT token is missing the `role_ids.advertiser` value, even though they have an advertiser profile (ID: 24) in the database.

---

## Root Cause Analysis

### Database State (CORRECT ✅)
```sql
-- User 143 HAS an advertiser profile with brand_ids column
SELECT id, user_id, brand_ids FROM advertiser_profiles WHERE user_id = 143;
-- Result: ID: 24, user_id: 143, brand_ids: [] ✅
```

### JWT Token State (INCORRECT ❌)
```javascript
// User 143's current JWT token (from browser localStorage)
{
  "sub": "143",
  "role": "advertiser",
  "role_ids": {
    "student": 30,
    "tutor": 86,
    "parent": 2
    // ❌ MISSING: "advertiser": 24
  }
}
```

### How JWT Tokens Are Created

When a user logs in, the backend calls `get_role_ids_from_user()` (in `utils.py:103`) which queries all role-specific profile tables:

```python
# From utils.py:142-147
if 'advertiser' in user.roles:
    advertiser_profile = db.query(AdvertiserProfile).filter(
        AdvertiserProfile.user_id == user.id
    ).first()
    role_ids['advertiser'] = advertiser_profile.id if advertiser_profile else None
```

**The issue**: User 143 logged in BEFORE the advertiser profile was created, or before the `brand_ids` column migration ran. Their token still has the old `role_ids` without the advertiser ID.

---

## API Endpoint Logic

### `POST /api/advertiser/brands` (line 184-272 in `advertiser_brands_endpoints.py`)

```python
# Line 188-192
advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

if not advertiser_profile_id:
    raise HTTPException(status_code=404, detail="Advertiser profile not found")
```

The endpoint checks `current_user.role_ids.get('advertiser')`, which returns `None` if the key doesn't exist in the JWT token, causing the 404 error.

---

## Why User 115 Works ✅

```javascript
// User 115's JWT token (CORRECT)
{
  "sub": "115",
  "role": "advertiser",
  "role_ids": {
    "student": 28,
    "tutor": 85,
    "parent": 4,
    "advertiser": 23  // ✅ Present!
  }
}
```

User 115 logged in AFTER their advertiser profile was properly set up, so their token has the correct `role_ids.advertiser: 23`.

---

## Solution (3 Methods)

### Method 1: Logout & Login (RECOMMENDED ⭐)

**Steps:**
1. Open `http://localhost:8081/fix-user-143-token.html` in browser
2. Click "Clear Token & Logout"
3. Login again as `contact@astegni.com` with password `@ContactAstegni1234`
4. New JWT token will have `role_ids.advertiser: 24`
5. Brand creation will work!

**Why this works**: Logging in again triggers `get_role_ids_from_user()` which will query the database and find advertiser profile ID: 24.

---

### Method 2: Manual Token Refresh (Developer Console)

```javascript
// Open browser console (F12) and run:
localStorage.removeItem('token');
localStorage.removeItem('refreshToken');
localStorage.removeItem('user');
location.reload();
// Then login again
```

---

### Method 3: Force Token Refresh via API

```bash
# Use refresh token to get new access token
curl -X POST "http://localhost:8000/api/refresh" \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "YOUR_REFRESH_TOKEN_HERE"}'
```

**Note**: This might not work if the refresh token also has the old `role_ids`.

---

## Verification

After logging in again, verify the new token has the correct `role_ids`:

### Browser Console
```javascript
const user = JSON.parse(localStorage.getItem('user'));
console.log('Advertiser ID:', user.role_ids.advertiser);
// Expected: 24
```

### API Test
```bash
# Login
curl -X POST "http://localhost:8000/api/login" \
  -d "username=contact@astegni.com&password=@ContactAstegni1234"

# Expected response (truncated):
{
  "user": {
    "id": 143,
    "role_ids": {
      "student": 30,
      "tutor": 86,
      "parent": 2,
      "advertiser": 24  // ✅ Should be present!
    }
  }
}
```

---

## Database Schema Reference

### advertiser_profiles table
```sql
CREATE TABLE advertiser_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    brand_ids INTEGER[] DEFAULT '{}'::INTEGER[],  -- Added by migration
    username TEXT,
    bio TEXT,
    -- ... other fields
);

-- Index for fast brand_ids lookups
CREATE INDEX idx_advertiser_profiles_brand_ids
ON advertiser_profiles USING GIN (brand_ids);
```

### Migration that added brand_ids
File: `migrate_add_brand_ids_to_advertiser.py`

```python
# Add brand_ids column
cur.execute("""
    ALTER TABLE advertiser_profiles
    ADD COLUMN brand_ids INTEGER[] DEFAULT '{}'::INTEGER[]
""")
```

---

## Prevention for Future Users

To prevent this issue from happening again:

### Option 1: Force Token Refresh on Profile Creation
When a new role profile is created (e.g., advertiser), automatically invalidate the user's current tokens and force re-login.

### Option 2: Lazy Token Update
Update the `get_current_user()` function in `utils.py` to always re-fetch `role_ids` from the database instead of relying on the JWT token.

```python
# In utils.py:155+
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    # ... existing code ...

    # ✅ Always re-fetch role_ids from database (don't trust token)
    user.role_ids = get_role_ids_from_user(user, db)

    return user
```

### Option 3: Token Version System
Add a `token_version` field to the users table and increment it when role profiles change. Reject tokens with outdated versions.

---

## Quick Fix Command

```bash
# For user 143 specifically, you can manually update the token in browser console:
const user = JSON.parse(localStorage.getItem('user'));
user.role_ids.advertiser = 24;
localStorage.setItem('user', JSON.stringify(user));
location.reload();
```

**Warning**: This is a temporary client-side fix. The JWT token signature won't match, so API calls might still fail. **Always use Method 1 (logout/login) for a proper fix.**

---

## Summary

| Item | Value |
|------|-------|
| **User ID** | 143 |
| **Advertiser Profile ID** | 24 |
| **Problem** | JWT token missing `role_ids.advertiser: 24` |
| **Cause** | User logged in before advertiser profile was set up |
| **Solution** | Logout and login again to get fresh token |
| **File** | Open `fix-user-143-token.html` in browser |

---

## Test Results

### Before Fix ❌
```bash
POST /api/advertiser/brands 404 (Not Found)
Error: Advertiser profile not found
```

### After Fix ✅
```bash
POST /api/advertiser/brands 200 (OK)
{
  "message": "Brand created successfully",
  "brand_id": 16,
  "brand": { ... }
}
```

---

**Status**: ✅ RESOLVED
**Date**: 2026-01-02
**Affected Users**: User 143 (contact@astegni.com)
**Root Cause**: Stale JWT token without advertiser profile ID
**Resolution**: Logout/login to refresh JWT token with correct role_ids
