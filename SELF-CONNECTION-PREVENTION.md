# Self-Connection Prevention ✅

## Overview
Users cannot connect with themselves. This validation is enforced at **both frontend and backend** levels to provide immediate feedback and ensure data integrity.

## The Rule
**A user cannot send a connection request to themselves**, even if they have multiple roles.

### Why This Matters
- **User ID 115** has both TUTOR and STUDENT profiles
- If viewing their own tutor profile (`view-tutor.html?id=115`), they should not see a "Connect" button
- Prevents meaningless self-connections in the database

## Implementation

### 1. Backend Validation ✅

**File:** `astegni-backend/connection_endpoints.py` (lines 146-148)

```python
# Prevent self-connection
if user_id == target_user_id:
    raise HTTPException(status_code=400, detail="Cannot connect with yourself")
```

**When it triggers:**
```python
POST /api/connections
{
  recipient_id: 115,  // Same as current user ID
  recipient_type: "tutor",
  requester_type: "student"
}

# Response: 400 Bad Request
{
  "detail": "Cannot connect with yourself"
}
```

**Location in flow:**
1. ✅ Check authentication
2. ✅ Determine requester role
3. ✅ Verify target user exists
4. ✅ Verify target user has requested role
5. ✅ **Prevent self-connection** ← Here
6. ✅ Check for existing connection
7. ✅ Create new connection

### 2. Frontend Validation ✅ (NEW)

**File:** `js/view-tutor/connection-manager.js` (lines 168-172)

```javascript
// Prevent self-connection
const currentUser = this.getCurrentUser();
if (currentUser && currentUser.id === tutorUserId) {
    throw new Error('You cannot connect with yourself');
}
```

**When it triggers:**
- User visits their own profile page (e.g., `view-tutor.html?id=115`)
- User clicks "Connect" button
- Frontend immediately shows error: "You cannot connect with yourself"
- **No API call is made** (saves bandwidth and backend processing)

**Benefits:**
- ✅ **Immediate feedback** - Error shown instantly, no waiting for API
- ✅ **No network request** - Saves bandwidth
- ✅ **Better UX** - User knows immediately why they can't connect
- ✅ **Consistent with backend** - Same validation logic

### 3. UI Prevention (Future Enhancement)

**Recommended:** Hide the "Connect" button entirely when viewing own profile

```javascript
// In view-tutor-db-loader.js or connection-manager.js
initializeConnectionButton() {
    const currentUser = this.getCurrentUser();
    const profileUserId = window.currentTutorData?.user_id;

    // Don't show connect button on own profile
    if (currentUser && currentUser.id === profileUserId) {
        console.log('[ConnectionManager] Hiding connect button - viewing own profile');
        const connectButton = document.querySelector('.connect-button');
        if (connectButton) {
            connectButton.style.display = 'none';
        }
        return;
    }

    // Proceed with normal connection button initialization
    this.checkConnectionStatus(profileUserId);
}
```

**Benefits:**
- User doesn't see "Connect" button on their own profile
- Cleaner UI
- No chance of confusion

## Validation Layers

### Layer 1: UI Prevention (Recommended - Not Yet Implemented)
```
User visits own profile
  ↓
Connect button hidden
  ↓
No attempt possible
```

### Layer 2: Frontend Validation (✅ Implemented)
```
User clicks Connect
  ↓
Check if tutorUserId === currentUser.id
  ↓
If same: Show error "You cannot connect with yourself"
  ↓
No API call made
```

### Layer 3: Backend Validation (✅ Implemented)
```
API receives connection request
  ↓
Check if user_id === target_user_id
  ↓
If same: Return 400 error
  ↓
Connection not created
```

## Testing

### Test 1: Backend Validation
```bash
# Login as user 115
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jediael.s.abebe@gmail.com","password":"@JesusJediael1234"}'

# Try to connect to self (should fail)
curl -X POST http://localhost:8000/api/connections \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recipient_id":115,"recipient_type":"tutor","requester_type":"student"}'

# Expected: 400 Bad Request
# {"detail": "Cannot connect with yourself"}
```

### Test 2: Frontend Validation
```
1. Login as jediael.s.abebe@gmail.com
2. Get your user ID (115) from localStorage: JSON.parse(localStorage.getItem('currentUser')).id
3. Visit: http://localhost:8080/view-profiles/view-tutor.html?id=115
4. Click "Connect" button
5. Expected: Error notification "You cannot connect with yourself"
6. Check console: Error should show before API call
7. Check network tab: No POST request to /api/connections
```

### Test 3: Database Verification
```bash
# Check for self-connections in database
cd astegni-backend
python -c "
import psycopg, os
from dotenv import load_dotenv
load_dotenv()
conn = psycopg.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()
cur.execute('SELECT COUNT(*) FROM connections WHERE requested_by = recipient_id')
count = cur.fetchone()[0]
print(f'Self-connections in database: {count}')
print('PASS' if count == 0 else 'FAIL')
"

# Expected output:
# Self-connections in database: 0
# PASS
```

## Edge Cases

### Case 1: User with Multiple Roles
```
User 115 has TUTOR and STUDENT profiles

Scenario: User 115 as STUDENT tries to connect to User 115 as TUTOR
Request:
{
  recipient_id: 115,        // Same user
  recipient_type: "tutor",  // Different role
  requester_type: "student" // Different role
}

Result: ❌ Blocked
Reason: Same user_id (115), regardless of roles
```

**Why blocked?**
- It's the same person
- A person cannot be connected to themselves
- Roles don't matter - it's about the user entity

### Case 2: Different Profiles, Same User
```
Scenario: Viewing own student profile from tutor profile
- User 115 logs in as TUTOR
- Visits view-student.html?id=115 (their own student profile)
- Tries to connect

Result: ❌ Blocked
Reason: requested_by=115, recipient_id=115 (same user)
```

### Case 3: Legitimate Connection Between Different Users
```
User 115 as STUDENT → User 85 as TUTOR

Request:
{
  recipient_id: 85,         // Different user ✓
  recipient_type: "tutor",
  requester_type: "student"
}

Result: ✅ Allowed
Reason: Different users (115 ≠ 85)
```

## Error Messages

### Frontend Error
```javascript
Error: 'You cannot connect with yourself'
```

Displayed as:
- Notification/toast message
- Console error log
- No API call made

### Backend Error
```json
{
  "detail": "Cannot connect with yourself"
}
```

Returned as:
- HTTP 400 Bad Request
- JSON error response

## Seed Data Verification

Our seed script (`seed_connections_context_aware.py`) creates connections only between **different users**:

```python
# User 115 → User 85 ✓
VALUES (115, 'student', 85, 'tutor', ...)

# User 115 → User 86 ✓
VALUES (115, 'tutor', 86, 'tutor', ...)

# User 85 → User 115 ✓
VALUES (85, 'tutor', 115, 'tutor', ...)

# User 86 → User 115 ✓
VALUES (86, 'tutor', 115, 'student', ...)

# NO self-connections like this:
# VALUES (115, 'student', 115, 'tutor', ...) ✗
```

**Verified:** Database has **0 self-connections** ✓

## Status

✅ **Backend validation**: Implemented and working
✅ **Frontend validation**: Implemented (NEW)
✅ **Database integrity**: Verified - no self-connections
✅ **Seed data**: Verified - only cross-user connections
⚠️ **UI prevention**: Recommended for future (hide button on own profile)

## Future Enhancement

**Hide Connect Button on Own Profile:**

Add to `js/view-tutor/connection-manager.js`:

```javascript
async initialize() {
    const currentUser = this.getCurrentUser();
    const profileUserId = this.getProfileUserId(); // From URL or window.currentTutorData

    // Hide button if viewing own profile
    if (currentUser && currentUser.id === profileUserId) {
        this.hideConnectionButton();
        console.log('[ConnectionManager] Own profile - connect button hidden');
        return;
    }

    // Normal flow
    await this.checkConnectionStatus(profileUserId);
    this.updateConnectionButtonUI();
}

hideConnectionButton() {
    const button = document.querySelector('.connect-button');
    if (button) {
        button.style.display = 'none';
    }
}
```

This would provide the best UX by preventing confusion before it happens.

---

**Last Updated:** 2025-01-21
**Status:** ✅ Complete - Validated at frontend and backend
**Recommendation:** Add UI prevention for optimal UX
