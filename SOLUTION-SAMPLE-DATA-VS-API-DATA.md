# SOLUTION: Badge Shows "Student" Because Page Uses Sample Data

## Root Cause Found! 🎯

The page is displaying **SAMPLE DATA** instead of **API DATA**!

---

## The Problem Flow

```
1. kushstudios16 opens community modal
   ↓
2. Page calls getConnectionsData() (line 2095, 2101, 2239, 2247)
   ↓
3. Returns SAMPLE/HARDCODED data (not from database!)
   ↓
4. Sample data has legacy `role` field
   ↓
5. Badge function checks connection.role FIRST (line 1724)
   ↓
6. Returns wrong badge (from sample data, not real connection)
```

---

## Why Jediael Sees Correct Badge

**When Jediael logs in:**
- Jediael has multiple roles: `['admin', 'tutor', 'student', 'parent']`
- Sample data default user ID = 115 (Jediael's ID!)
- Sample data was designed around Jediael's account
- So badges appear correct for Jediael

**When Kushstudios16 logs in:**
- Kushstudios16 has single role: `['tutor']`
- User ID = 141 (NOT the default sample data user!)
- Sample data doesn't match real connections
- Badges show wrong values (from hardcoded sample data)

---

## The Evidence

### File: `js/tutor-profile/global-functions.js`

**Line 1761-1763: Sample Data Function**
```javascript
function getConnectionsData() {
    // Get current user ID for profile-based data (fallback to 115 for demo)
    const currentUserId = window.user?.id || 115;  // ← Defaults to Jediael!

    return [
        // HARDCODED sample data, NOT from API!
    ];
}
```

**Lines 1769, 1789, 1809, etc: Sample Data Has Legacy `role` Field**
```javascript
{
    id: 1,
    name: 'Abebe Bekele',
    role: 'Student',  // ← HARDCODED legacy field
    type: 'students',
    // ... more fields
}
```

**Line 1724-1726: Badge Function Checks `role` FIRST**
```javascript
function getProfileBadge(connection) {
    // If legacy 'role' field exists (for sample data), use it
    if (connection.role) {
        return connection.role;  // ← Returns sample data value!
    }
    // ... rest of logic
}
```

**Lines 2095, 2101, 2239, 2247: Page Uses Sample Data**
```javascript
function filterCommunity(section, type) {
    // ...
    if (section === 'all') {
        grid = document.getElementById('allGrid');
        data = getConnectionsData();  // ← SAMPLE DATA, not API!
    }
    // ...
}
```

---

## The Solution

### Option 1: Replace Sample Data with API Call (BEST)

Replace `getConnectionsData()` calls with actual API calls.

**File:** `js/tutor-profile/global-functions.js`

```javascript
// NEW: Fetch real connections from API
async function fetchConnectionsFromAPI() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:8000/api/connections/my', {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const connections = await response.json();

        // Transform API data to match expected format
        return connections.map(conn => {
            const currentUserId = window.user?.id;
            const isUser1 = conn.user_id_1 === currentUserId;

            return {
                id: conn.id,
                name: isUser1 ? conn.user_2_name : conn.user_1_name,
                avatar: isUser1 ? conn.user_2_profile_picture : conn.user_1_profile_picture,
                user_id_1: conn.user_id_1,
                user_id_2: conn.user_id_2,
                profile_id_1: conn.profile_id_1,
                profile_type_1: conn.profile_type_1,
                profile_id_2: conn.profile_id_2,
                profile_type_2: conn.profile_type_2,
                status: conn.status,
                isOnline: false,  // TODO: Get from WebSocket
                connectedDate: conn.connected_at || conn.created_at,
                mutualConnections: 0,  // TODO: Calculate
                // NO 'role' field! Use profile_type_1/2 instead
            };
        });
    } catch (error) {
        console.error('Error fetching connections:', error);
        // Fallback to sample data on error
        return getConnectionsData();
    }
}

// UPDATE: Make filterCommunity async and use API
async function filterCommunity(section, type) {
    let grid, data, renderFunc;

    if (section === 'all') {
        grid = document.getElementById('allGrid');
        data = await fetchConnectionsFromAPI();  // ← Use API!
        renderFunc = renderConnectionCard;
    } else if (section === 'connections') {
        grid = document.getElementById('connectionsGrid');
        data = await fetchConnectionsFromAPI();  // ← Use API!
        renderFunc = renderConnectionCard;
    }
    // ... rest of function
}
```

### Option 2: Fix Sample Data to Match Real Connection (QUICK FIX)

Update sample data to include your actual connection with correct values.

**File:** `js/tutor-profile/global-functions.js` (line 1765)

```javascript
function getConnectionsData() {
    const currentUserId = window.user?.id || 115;

    return [
        // ADD: Real connection between kushstudios16 and jediael
        {
            id: 21,  // Real connection ID
            name: currentUserId === 141 ? 'Jediael Jediael' : 'Kush Studios',
            role: 'Tutor',  // ✅ FIX: Change to "Tutor"
            type: 'tutors',  // ✅ FIX: Change to "tutors"
            avatar: '../uploads/system_images/system_profile_pictures/tutor-.jpg',
            isOnline: true,
            connectedDate: '2025-10-28',
            mutualConnections: 0,
            lastActivity: 'Active now',
            bio: 'Multi-role user: admin, tutor, student, parent',
            location: 'Addis Ababa',
            // Profile-based fields (from database)
            user_id_1: 141,
            user_id_2: 115,
            profile_id_1: 86,
            profile_type_1: 'tutor',
            profile_id_2: 85,
            profile_type_2: 'tutor'  // ← Database value
        },
        // ... rest of sample data
    ];
}
```

### Option 3: Remove Legacy `role` Check (ALSO GOOD)

Remove the `connection.role` check so badge function always uses profile_type.

**File:** `js/tutor-profile/global-functions.js` (line 1722)

```javascript
function getProfileBadge(connection) {
    // REMOVE THIS:
    // if (connection.role) {
    //     return connection.role;
    // }

    // Get current user ID (from auth system)
    const currentUserId = window.user?.id;
    if (!currentUserId) {
        return 'User';
    }

    // Determine which profile is the "other" person's profile
    let profileType;

    if (connection.user_id_1 === currentUserId) {
        profileType = connection.profile_type_2;
    } else if (connection.user_id_2 === currentUserId) {
        profileType = connection.profile_type_1;
    } else {
        profileType = connection.profile_type_1 || connection.profile_type_2 || 'user';
    }

    // Map profile types to display labels
    const profileTypeMap = {
        'tutor': 'Tutor',
        'student': 'Student',
        'parent': 'Parent',
        'advertiser': 'Advertiser'
    };

    return profileTypeMap[profileType] || profileType.charAt(0).toUpperCase() + profileType.slice(1);
}
```

---

## Recommended Approach

**Combine Option 1 + Option 3:**

1. **Remove legacy `role` check** (Option 3) - So profile_type always wins
2. **Fetch from API** (Option 1) - So we use real database data
3. **Keep sample data as fallback** - For when API fails

This gives us:
✅ Correct badges from database
✅ Works for all users (not just Jediael)
✅ Graceful fallback if API fails
✅ Future-proof (no legacy field interference)

---

## Testing After Fix

### Test 1: Login as kushstudios16@gmail.com

1. Open community modal
2. Badge for Jediael should show **"Tutor"** ✅
3. NOT "Student" ❌

### Test 2: Login as jediael.s.abebe@gmail.com

1. Open community modal
2. Badge for Kush Studios should show **"Tutor"** ✅
3. Should still work correctly

### Test 3: Multi-role User Test

1. Add another connection for jediael as student
2. Both connections should show correct badges
   - Connection #1 (as tutor): "Tutor" badge
   - Connection #2 (as student): "Student" badge

---

## Why This Bug Happened

1. **Sample data was created for demo** with hardcoded `role` fields
2. **Badge function has legacy fallback** to support old sample data
3. **Page never switched to API** - still using sample data function
4. **Sample data designed around user 115** (Jediael's account)
5. **Works for Jediael, breaks for others** - because sample data doesn't match their real connections

---

## Summary

**Problem:** Page shows sample data instead of API data

**Why Jediael sees correct badges:** Sample data defaults to user ID 115 (Jediael)

**Why Kushstudios16 sees wrong badges:** User ID 141 doesn't match sample data

**Solution:** Use API data OR remove legacy role check OR fix sample data

**Best Fix:** Remove `connection.role` check + use API data

---

## Quick Fix You Can Apply Right Now

**File:** `js/tutor-profile/global-functions.js`

**Line 1724-1726: Comment out these lines:**

```javascript
function getProfileBadge(connection) {
    // COMMENT OUT THIS BLOCK:
    // if (connection.role) {
    //     return connection.role;
    // }

    // Get current user ID (from auth system)
    const currentUserId = window.user?.id;
    // ... rest stays the same
}
```

**Result:** Badge will now use `profile_type_2` from sample data (which has correct value 'tutor')

**Then refresh page and test!**

---

## Files to Modify

1. **js/tutor-profile/global-functions.js** (main fix)
   - Remove lines 1724-1726 (legacy role check)
   - OR update sample data line 1765+
   - OR replace getConnectionsData() calls with API calls

That's it! One small change fixes the entire issue! 🎯
