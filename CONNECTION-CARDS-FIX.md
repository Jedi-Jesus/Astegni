# Connection Cards Fix - Community Panel

## Problem
In the tutor community panel (`connections-main-tab`), the connection cards were showing **your own name** instead of your **connection's name**.

## Root Cause
The `community-panel-manager.js` was using incorrect field names to extract the other user's information:
- ❌ Used: `conn.requester_id`
- ✅ Should use: `conn.requested_by` (actual API field name)

The community modal worked correctly because it used the `CommunityManager.getOtherUser()` method which correctly checks `connection.requested_by`.

## Solution
Updated `js/tutor-profile/community-panel-manager.js`:

1. **Added `getOtherUser()` function** (lines 314-347)
   - Correctly checks `connection.requested_by` vs `currentUserId`
   - Returns the other user's info (name, email, avatar, roles, etc.)
   - Matches the exact logic from `CommunityManager.getOtherUser()`

2. **Updated `renderConnectionCards()`** (lines 237-312)
   - Now uses `getOtherUser(conn)` instead of manual extraction
   - Shows "Connected as [Role]" label
   - Displays connection duration (e.g., "Connected 5 days ago")
   - Matches the exact styling from community modal

3. **Updated `renderRequestCards()`** (lines 491-585)
   - Also uses `getOtherUser()` for consistency
   - Correctly displays requester/recipient info in requests

## Result
✅ Connection cards now show the **correct person's name and info**
✅ Cards match the **exact layout and style** from community modal
✅ Role badges show the **correct role they connected as**
✅ All naming, layout, and functionality is consistent

## Files Changed
- `js/tutor-profile/community-panel-manager.js` (3 functions updated, 1 function added)

## Testing
1. Open tutor profile → Community panel
2. Click "Connections" main tab
3. Click "All Connections" sub-tab
4. Verify: Cards show your connections' names (not your own)
5. Compare with Community Modal → Connections section (should be identical)
