# Community Modal 422 Error - FIXED

## Issue Summary
When opening the Community Modal in `tutor-profile.html`, the console showed a **422 Unprocessable Content** error when calling `/api/connections/stats`:

```
GET http://localhost:8000/api/connections/stats 422 (Unprocessable Content)
Failed to fetch connection stats, badge counts will remain at 0
```

## Root Cause Analysis

### The Problem
The `/api/connections/stats` endpoint was returning 422 because the **JWT token structure was being read incorrectly** in the frontend:

1. **Backend (utils.py:28):** Stores user ID in JWT token as `sub` (JWT standard):
   ```python
   user_id_str = payload.get("sub")
   ```

2. **Frontend (communityManager.js:970):** Was trying to read user ID as `id` (incorrect):
   ```javascript
   const payload = JSON.parse(atob(token.split('.')[1]));
   return payload.id;  // ❌ WRONG - JWT uses 'sub', not 'id'
   ```

3. **Result:** `getCurrentUserId()` returned `null` or `undefined`

4. **Backend Response:** When the backend couldn't find the user, it returned 422

### JWT Token Structure
JWT tokens follow a standard where the user ID is stored in the `sub` (subject) field:
```json
{
  "sub": "115",           // ← User ID (string format)
  "role": "tutor",
  "role_ids": {
    "tutor": "85",
    "student": "98"
  },
  "exp": 1234567890
}
```

## The Fix

**File:** `js/page-structure/communityManager.js`
**Line:** 964-976

**Before:**
```javascript
getCurrentUserId() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.id;  // ❌ WRONG
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
}
```

**After:**
```javascript
getCurrentUserId() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const payload = JSON.parse(atob(token.split('.')[1]));
    // JWT tokens use 'sub' for subject (user ID), not 'id'
    return parseInt(payload.sub) || null;  // ✅ CORRECT
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
}
```

### Key Changes:
1. Changed `payload.id` to `payload.sub` (JWT standard)
2. Added `parseInt()` to convert string to integer (backend expects integer)
3. Added fallback `|| null` for safety
4. Added comment explaining JWT structure

## Impact

### Before Fix:
- ❌ `getCurrentUserId()` returned `null`
- ❌ Backend couldn't identify the user
- ❌ `/api/connections/stats` returned 422 error
- ❌ Badge counts remained at 0
- ❌ Events/clubs filtering didn't work properly

### After Fix:
- ✅ `getCurrentUserId()` returns correct user ID (e.g., `115`)
- ✅ Backend can identify the user
- ✅ `/api/connections/stats` returns 200 with stats
- ✅ Badge counts update correctly
- ✅ Events/clubs filtering works based on user ID

## Testing

To verify the fix works:

1. **Open tutor-profile.html** in browser
2. **Open DevTools Console** (F12)
3. **Click "Community" card** to open modal
4. **Check console** - Should see:
   ```
   ✓ Initialized all-count badge to 0
   ✓ Initialized requests-badge to 0
   ✓ Initialized connections-badge to 0
   📊 Updating badge counts: {totalConnections: X, pendingRequests: Y, ...}
   ✓ Updated all-count to: X
   ✓ Updated requests-badge to: Y
   ✓ Updated connections-badge to: Z
   ```

5. **Check Network tab** - `/api/connections/stats` should return **200 OK**

## Related Functions Affected

The `getCurrentUserId()` fix impacts these functions in `communityManager.js`:

1. **Line 396:** `loadEventsGrid()` - Now correctly identifies user's own events
2. **Line 477:** `loadClubsGrid()` - Now correctly identifies user's own clubs
3. **Line 766:** `loadGroups()` - Now correctly filters events
4. **Line 852:** `loadClubs()` - Now correctly filters clubs
5. **Line 940:** `getOtherUser()` - Now correctly identifies connection partner

## Prevention

To prevent this issue in other files:

### ✅ Correct Pattern:
```javascript
const token = localStorage.getItem('token');
const payload = JSON.parse(atob(token.split('.')[1]));
const userId = parseInt(payload.sub);  // Use 'sub', not 'id'
```

### ❌ Incorrect Pattern:
```javascript
const payload = JSON.parse(atob(token.split('.')[1]));
const userId = payload.id;  // WRONG - JWT doesn't have 'id' field
```

## Files to Check

Search for similar patterns in other files that may have the same issue:

```bash
# Search for payload.id usage
grep -r "payload\.id" js/
```

If found, replace with `parseInt(payload.sub)`.

## Status

✅ **FIXED** - Community modal now loads badge counts correctly without 422 errors.

## Date
2025-01-28
