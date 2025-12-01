# Connections Section Data Diagnosis

**Date:** 2025-11-21
**Issue:** Names and emails showing incorrectly in connections cards

---

## Expected vs Actual Behavior

### What SHOULD Be Displayed (User 115's perspective)

User 115 has 3 accepted connections. The cards should show:

**Card 1:**
- Name: Elias Kidane
- Email: elias.kidane17@astegni.com
- Role: Tutor

**Card 2:**
- Name: Helen Kebede
- Email: helen.kebede0@astegni.com
- Role: Tutor

**Card 3:**
- Name: Kebede Asfaw
- Email: kebede.asfaw1@astegni.com
- Role: Tutor

### What IS Being Displayed

According to user report: Names and emails are INCORRECT

**Possible Issues:**
1. Showing user 115's own data (Jediael Jediael, jediael.s.abebe@gmail.com) on all cards
2. Showing wrong users' data
3. Showing `null` or "Unknown User"

---

## Data Flow Verification

### 1. Database ✅ CORRECT

```sql
Connection 40: User 115 (student) → User 85 (tutor)
  Requester: Jediael Jediael (jediael.s.abebe@gmail.com)
  Recipient: Elias Kidane (elias.kidane17@astegni.com)

Connection 42: User 115 (student) → User 68 (tutor)
  Requester: Jediael Jediael
  Recipient: Helen Kebede (helen.kebede0@astegni.com)

Connection 43: User 115 (student) → User 69 (tutor)
  Requester: Jediael Jediael
  Recipient: Kebede Asfaw (kebede.asfaw1@astegni.com)
```

### 2. Backend API ✅ CORRECT

**API Call:** `GET /api/connections?status=accepted&direction=all`

**Response:**
```json
{
  "id": 40,
  "requested_by": 115,
  "requester_name": "Jediael Jediael",
  "requester_email": "jediael.s.abebe@gmail.com",
  "recipient_id": 85,
  "recipient_name": "Elias Kidane",
  "recipient_email": "elias.kidane17@astegni.com",
  "requester_type": "student",
  "recipient_type": "tutor"
}
```

API correctly returns all user details.

### 3. Frontend getOtherUser() Function

**File:** `js/page-structure/communityManager.js:1430-1459`

```javascript
getOtherUser(connection) {
    const currentUserId = this.getCurrentUserId();

    if (connection.requested_by === currentUserId) {
        // Other user is the recipient
        return {
            id: connection.recipient_id,
            name: connection.recipient_name || 'Unknown User',
            email: connection.recipient_email || '',
            avatar: connection.recipient_profile_picture || null,
            roles: connection.recipient_roles || [],
            profileType: connection.recipient_type || null
        };
    } else {
        // Other user is the requester
        return {
            id: connection.requested_by,
            name: connection.requester_name || 'Unknown User',
            email: connection.requester_email || '',
            avatar: connection.requester_profile_picture || null,
            roles: connection.requester_roles || [],
            profileType: connection.requester_type || null
        };
    }
}
```

**Logic:**
- For Connection 40: `requested_by (115) === currentUserId (115)` → Returns RECIPIENT data (Elias Kidane) ✅
- For Connection 42: `requested_by (115) === currentUserId (115)` → Returns RECIPIENT data (Helen Kebede) ✅
- For Connection 43: `requested_by (115) === currentUserId (115)` → Returns RECIPIENT data (Kebede Asfaw) ✅

**This logic is CORRECT!**

### 4. getCurrentUserId() Function

**File:** `js/page-structure/communityManager.js:1461-1473`

```javascript
getCurrentUserId() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return null;

        const payload = JSON.parse(atob(token.split('.')[1]));
        // JWT tokens use 'sub' for subject (user ID), not 'id'
        return parseInt(payload.sub) || null;
    } catch (error) {
        console.error('Error getting user ID:', error);
        return null;
    }
}
```

**JWT Payload for User 115:**
```json
{
  "sub": "115",
  "role": "tutor",
  "role_ids": {...},
  "exp": 1763727828
}
```

**Result:** `parseInt("115")` → `115` ✅ CORRECT

---

## Possible Root Causes

### Issue #1: getCurrentUserId() Returns Wrong Value

**Symptoms:** All cards show User 115's data
**Cause:** If `getCurrentUserId()` returns something other than 115 (e.g., `null`, `NaN`, wrong ID)
**Test:**
```javascript
console.log('Current User ID:', communityManager.getCurrentUserId());
```

**Expected:** `115`
**If showing wrong data:** Check if it returns `null` or different number

### Issue #2: API Not Being Called (Using Cached/Sample Data)

**Symptoms:** Cards show placeholder or old data
**Cause:** Frontend might be using sample data instead of live API data
**Test:**
```javascript
// Check network tab in browser DevTools
// Look for: GET /api/connections?status=accepted&direction=all
```

### Issue #3: displayConnectionsGrid() Using Wrong Data

**Symptoms:** Cards render but with wrong source data
**Cause:** `displayConnectionsGrid` might be passed wrong connections array
**Location:** `js/page-structure/communityManager.js:975-1074`

### Issue #4: Multiple CommunityManager Instances

**Symptoms:** Inconsistent behavior
**Cause:** Multiple instances of CommunityManager with different state
**Check:** Look for multiple `new CommunityManager()` calls

---

## Debugging Steps

### Step 1: Check Browser Console

Open browser DevTools console and run:
```javascript
// 1. Check current user ID
console.log('Current User ID:', window.communityManager.getCurrentUserId());

// 2. Check token
const token = localStorage.getItem('token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('JWT Payload:', payload);

// 3. Manually fetch connections
fetch('http://localhost:8000/api/connections?status=accepted&direction=all', {
    headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => {
    console.log('API Response:', data);
    console.log('First connection other user:',
        window.communityManager.getOtherUser(data[0]));
});
```

### Step 2: Check Network Tab

1. Open browser DevTools → Network tab
2. Filter by "connections"
3. Look for: `GET /api/connections?status=accepted&direction=all`
4. Check:
   - Status code (should be 200)
   - Response body (should contain correct user data)

### Step 3: Use Test Page

1. Open: [test-connections-data.html](file:///c:/Users/zenna/Downloads/Astegni/test-connections-data.html)
2. This page will show:
   - Current user ID extracted from JWT
   - Raw API response
   - Extracted "other user" data for each connection

### Step 4: Add Console Logging

Temporarily add logging to `displayConnectionsGrid`:

```javascript
// js/page-structure/communityManager.js:987
grid.innerHTML = connections.map(conn => {
    const otherUser = this.getOtherUser(conn);

    // ADD THIS
    console.log('Connection:', conn.id);
    console.log('  requested_by:', conn.requested_by);
    console.log('  recipient_id:', conn.recipient_id);
    console.log('  currentUserId:', this.getCurrentUserId());
    console.log('  otherUser:', otherUser);

    // ... rest of code
});
```

---

## Quick Fixes to Try

### Fix #1: Ensure getCurrentUserId Uses Fallback

```javascript
getCurrentUserId() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return null;

        const payload = JSON.parse(atob(token.split('.')[1]));
        // Try both 'sub' and 'id' fields
        return parseInt(payload.sub) || parseInt(payload.id) || null;
    } catch (error) {
        console.error('Error getting user ID:', error);
        return null;
    }
}
```

### Fix #2: Add Null Checks in getOtherUser

```javascript
getOtherUser(connection) {
    const currentUserId = this.getCurrentUserId();

    // ADD THIS CHECK
    if (!currentUserId) {
        console.error('getCurrentUserId returned null!');
        return {
            id: null,
            name: 'Error: Not logged in',
            email: '',
            avatar: null,
            roles: [],
            profileType: null
        };
    }

    // Rest of the function...
}
```

### Fix #3: Verify API Call Parameters

Check if the API call in `loadConnectionsGrid` is correct:

```javascript
// Should be this:
const response = await fetch(`${this.API_BASE_URL}/api/connections?status=accepted&direction=all`, {
    headers: { 'Authorization': `Bearer ${token}` }
});

// NOT this:
const response = await fetch(`${this.API_BASE_URL}/api/connections`, {
    headers: { 'Authorization': `Bearer ${token}` }
});
```

---

## Expected Fix Result

After debugging, connections should display:

**✅ Card 1:**
- Avatar: Elias's picture (or default)
- Name: Elias Kidane
- Role: Tutor
- Email: elias.kidane17@astegni.com
- Connected: [date]

**✅ Card 2:**
- Avatar: Helen's picture (or default)
- Name: Helen Kebede
- Role: Tutor
- Email: helen.kebede0@astegni.com
- Connected: [date]

**✅ Card 3:**
- Avatar: Kebede's picture (or default)
- Name: Kebede Asfaw
- Role: Tutor
- Email: kebede.asfaw1@astegni.com
- Connected: [date]

---

## Next Steps

1. **Run the test page** to see what data is actually being extracted
2. **Check browser console** for any JavaScript errors
3. **Check network tab** to verify API is being called
4. **Add console.log** statements to trace the data flow
5. **Report back** with:
   - What names/emails are currently showing
   - Browser console output
   - Network tab screenshot of API response

This will help pinpoint exactly where the data is getting corrupted.
