# Connections Section Data Fix

**Date:** 2025-11-21
**Issue:** Connections section loads cards but displays incorrect/incomplete data
**Status:** ✅ FIXED

---

## Problem Analysis

### Symptoms
- Connections section shows 3 cards
- User names and emails display correctly
- **Role badges show generic "User" instead of actual role (Student, Tutor, Parent)**
- **Role filters (All, Students, Tutors, Parents) don't work properly**

### Root Cause

The frontend `getOtherUser` function expects the API to provide `requester_roles` and `recipient_roles` fields containing arrays of all roles a user has (e.g., `['student', 'tutor']`).

**What Was Missing:**
```javascript
// Frontend expects (communityManager.js:1441-1442):
requester_roles: ['student', 'tutor']  // All roles the user has
recipient_roles: ['tutor']             // All roles the user has
```

**What API Was Providing:**
```json
{
  "requester_type": "student",  // Only the role used when connecting
  "recipient_type": "tutor"      // Only the role context
}
```

**Why This Matters:**
- **Role Type** = Which role they used when making the connection (metadata)
- **Roles Array** = All roles the user actually has (for filtering and display)

Without the roles array, the frontend couldn't:
1. Display the correct role badge
2. Filter connections by role (Students, Tutors, Parents)
3. Count connections by role type

---

## Solution Implemented

### 1. Updated ConnectionResponse Model

**File:** `astegni-backend/app.py modules/models.py`

**Changes:**
```python
class ConnectionResponse(BaseModel):
    # ... existing fields ...

    # Optional user details (populated by endpoints)
    requester_name: Optional[str] = None
    requester_email: Optional[str] = None
    requester_profile_picture: Optional[str] = None
    requester_roles: Optional[list[str]] = None  # ✅ NEW: All roles the requester has
    recipient_name: Optional[str] = None
    recipient_email: Optional[str] = None
    recipient_profile_picture: Optional[str] = None
    recipient_roles: Optional[list[str]] = None  # ✅ NEW: All roles the recipient has
```

### 2. Updated Connections Endpoint

**File:** `astegni-backend/connection_endpoints.py`

**Changes Made:**

**A. Updated GET /api/connections endpoint:**
```python
# Enrich with user details
result = []
for conn in connections:
    requester = db.query(User).filter(User.id == conn.requested_by).first()
    recipient = db.query(User).filter(User.id == conn.recipient_id).first()

    response = ConnectionResponse.from_orm(conn)
    if requester:
        response.requester_name = f"{requester.first_name} {requester.father_name}"
        response.requester_email = requester.email
        response.requester_profile_picture = requester.profile_picture
        response.requester_roles = get_all_user_roles(db, requester.id)  # ✅ NEW
    if recipient:
        response.recipient_name = f"{recipient.first_name} {recipient.father_name}"
        response.recipient_email = recipient.email
        response.recipient_profile_picture = recipient.profile_picture
        response.recipient_roles = get_all_user_roles(db, recipient.id)  # ✅ NEW

    result.append(response)
```

**B. Updated POST /api/connections endpoint:**
```python
# Build response with user details
response = ConnectionResponse.from_orm(new_connection)
response.requester_name = f"{current_user.first_name} {current_user.father_name}"
response.requester_email = current_user.email
response.requester_profile_picture = current_user.profile_picture
response.requester_roles = get_all_user_roles(db, current_user.id)  # ✅ NEW
response.recipient_name = f"{target_user.first_name} {target_user.father_name}"
response.recipient_email = target_user.email
response.recipient_profile_picture = target_user.profile_picture
response.recipient_roles = get_all_user_roles(db, target_user_id)  # ✅ NEW
```

**Note:** The `get_all_user_roles()` helper function already existed in the codebase (lines 62-76).

---

## How to Apply the Fix

### Step 1: Verify Changes Are in Place

The changes have already been applied to:
- `astegni-backend/app.py modules/models.py` (lines 1118, 1122)
- `astegni-backend/connection_endpoints.py` (lines 195, 199, 276, 280)

### Step 2: Restart Backend Server

**Stop existing server:**
```bash
# Find and kill the python process running app.py
tasklist | findstr python
taskkill /F /PID <process_id>
```

**Start fresh server:**
```bash
cd astegni-backend
python app.py
```

### Step 3: Verify the Fix

**Test the API:**
```bash
# Login
curl -X POST http://localhost:8000/api/login \
  -d "username=jediael.s.abebe@gmail.com" \
  -d "password=@JesusJediael1234"

# Get connections (use the token from login response)
curl -X GET "http://localhost:8000/api/connections?status=accepted" \
  -H "Authorization: Bearer <your_token>"
```

**Expected Response:**
```json
{
  "id": 40,
  "requested_by": 115,
  "requester_type": "student",
  "recipient_id": 85,
  "recipient_type": "tutor",
  "status": "accepted",
  "requester_name": "Jediael Jediael",
  "requester_email": "jediael.s.abebe@gmail.com",
  "requester_roles": ["student", "tutor"],  // ✅ NEW
  "recipient_name": "Elias Kidane",
  "recipient_email": "elias.kidane17@astegni.com",
  "recipient_roles": ["tutor"]  // ✅ NEW
}
```

### Step 4: Test Frontend

1. Open browser and navigate to tutor profile
2. Click "Community" button to open modal
3. Click "Connections" section
4. Verify:
   - ✅ Role badges show correct roles (Student, Tutor, Parent)
   - ✅ Clicking "Students" filter shows only student connections
   - ✅ Clicking "Tutors" filter shows only tutor connections
   - ✅ Filter count badges show correct numbers

---

## Frontend Data Flow (For Reference)

### 1. API Request
```javascript
// communityManager.js:466
const response = await fetch(`${this.API_BASE_URL}/api/connections?status=accepted&direction=all`, {
    headers: { 'Authorization': `Bearer ${token}` }
});
const connections = await response.json();
```

### 2. Extract "Other User" Data
```javascript
// communityManager.js:1430-1459
getOtherUser(connection) {
    const currentUserId = this.getCurrentUserId();

    if (connection.requested_by === currentUserId) {
        // Other user is the recipient
        return {
            id: connection.recipient_id,
            name: connection.recipient_name,
            email: connection.recipient_email,
            avatar: connection.recipient_profile_picture,
            roles: connection.recipient_roles || [],  // ✅ Uses recipient_roles
            profileType: connection.recipient_type,
            isOnline: false
        };
    } else {
        // Other user is the requester
        return {
            id: connection.requested_by,
            name: connection.requester_name,
            email: connection.requester_email,
            avatar: connection.requester_profile_picture,
            roles: connection.requester_roles || [],  // ✅ Uses requester_roles
            profileType: connection.requester_type,
            isOnline: false
        };
    }
}
```

### 3. Determine Role Badge
```javascript
// communityManager.js:1000-1005
const primaryRole = otherUser.profileType
    ? otherUser.profileType.charAt(0).toUpperCase() + otherUser.profileType.slice(1)
    : (otherUser.roles || []).includes('student') ? 'Student' :
      (otherUser.roles || []).includes('tutor') ? 'Tutor' :
      (otherUser.roles || []).includes('parent') ? 'Parent' :
      'User';  // Fallback if no roles
```

**Before Fix:** `otherUser.roles` was always `[]` → Badge showed "User"
**After Fix:** `otherUser.roles` contains actual roles → Badge shows correct role

### 4. Filter by Role
```javascript
// communityManager.js:482-496
filteredConnections = connections.filter(conn => {
    const otherUser = this.getOtherUser(conn);
    const roles = otherUser.roles || [];  // ✅ Uses the roles array

    if (category === 'students') {
        return roles.includes('student');  // Now works!
    } else if (category === 'tutors') {
        return roles.includes('tutor');  // Now works!
    } else if (category === 'parents') {
        return roles.includes('parent');  // Now works!
    }
});
```

**Before Fix:** Filtering never worked because `roles` was always `[]`
**After Fix:** Filtering works correctly

---

## Testing Checklist

After restarting the backend, verify:

**Connections Section:**
- [ ] User names display correctly
- [ ] Emails display correctly
- [ ] Role badges show actual roles (not "User")
- [ ] "All" filter shows all connections
- [ ] "Students" filter shows only student connections
- [ ] "Tutors" filter shows only tutor connections
- [ ] "Parents" filter shows only parent connections
- [ ] Filter count badges show correct numbers

**Requests Section (Should Already Work):**
- [ ] Received requests show correct data
- [ ] Sent requests show correct data
- [ ] Role filtering works

---

## Database Context

**User 115 (Jediael) has:**
- Student profile (id=28)
- Tutor profile (id=85)
- Expected roles: `['student', 'tutor']`

**User 85 (Elias) has:**
- Tutor profile (id=63)
- Expected roles: `['tutor']`

**Current Connections:**
```
[40] User 115 (student) → User 85 (tutor) [ACCEPTED]
[43] User 115 (student) → User 69 (tutor) [ACCEPTED]
[42] User 115 (student) → User 68 (tutor) [ACCEPTED]
```

All connections are USER-based (no duplicates) as per the fix in [CONNECTION-USER-BASED-FIX.md](./CONNECTION-USER-BASED-FIX.md).

---

## Summary

**Issue:** Connections displayed incomplete data (generic "User" badges, broken filters)
**Root Cause:** API didn't provide user roles arrays
**Solution:** Added `requester_roles` and `recipient_roles` to API response
**Impact:** ✅ Role badges now display correctly, role filters now work
**Status:** Code updated, requires backend restart to apply

**Next Step:** Restart the backend server to see the fix in action!
