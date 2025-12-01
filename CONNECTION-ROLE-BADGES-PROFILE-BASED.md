# Profile-Based Role Badges in Connection Cards - Complete Guide

## Overview

The connection cards in the Community Modal now display **profile-based role badges** instead of generic user roles. This means the badge shows which **specific profile** (tutor, student, parent, advertiser) the person is connecting with you as.

## What Changed

### Before (User-Based Roles)
```javascript
// OLD: Used generic user.roles array
connection.role = 'Student'  // From user.roles array - unclear which profile!
```
**Problem:** User might have BOTH student AND tutor profiles. Which one is this connection using?

### After (Profile-Based Badges)
```javascript
// NEW: Uses profile_type_1 or profile_type_2 from connections table
connection.profile_type_2 = 'student'  // From student_profiles.id
connection.profile_type_1 = 'tutor'    // From tutor_profiles.id
```
**Solution:** Badge shows the EXACT profile type used in this specific connection!

## How It Works

### Connection Data Structure

When you fetch connections from `/api/connections`, each connection includes:

```json
{
    "id": 1,
    "profile_id_1": 85,           // Your tutor profile ID
    "profile_type_1": "tutor",    // Your profile type
    "profile_id_2": 12,           // Their student profile ID
    "profile_type_2": "student",  // Their profile type
    "user_id_1": 115,             // Your user ID (legacy)
    "user_id_2": 50,              // Their user ID (legacy)
    "status": "connected",
    "user_2_name": "Abebe Bekele"
}
```

### Badge Logic

The `getProfileBadge()` function:

1. **Identifies current user:** Checks `window.user.id`
2. **Determines "other" profile:**
   - If current user is `user_id_1` → Show `profile_type_2`
   - If current user is `user_id_2` → Show `profile_type_1`
3. **Maps to display label:**
   - `tutor` → "Tutor"
   - `student` → "Student"
   - `parent` → "Parent"
   - `advertiser` → "Advertiser"

### Example Scenarios

**Scenario 1: Student Connecting with Tutor**
```json
Connection:
  user_id_1: 115 (You - Ahmed)
  user_id_2: 50  (Abebe)
  profile_type_1: "tutor"     (Your profile)
  profile_type_2: "student"   (Abebe's profile)

Badge shown: "Student" ✓
```

**Scenario 2: Tutor Professional Network**
```json
Connection:
  user_id_1: 115 (You - Ahmed)
  user_id_2: 73  (Yonas)
  profile_type_1: "tutor"    (Your profile)
  profile_type_2: "tutor"    (Yonas's profile)

Badge shown: "Tutor" ✓ (Professional colleague!)
```

**Scenario 3: Same User, Different Contexts**

Ahmed (user_id=50) has TWO profiles:
- Student Profile #12
- Tutor Profile #42

**Connection 1 (as Student):**
```json
{
  profile_id_1: 12,
  profile_type_1: "student",
  profile_id_2: 85,
  profile_type_2: "tutor"
}
Badge: "Tutor" (connecting as student with a tutor)
```

**Connection 2 (as Tutor):**
```json
{
  profile_id_1: 42,
  profile_type_1: "tutor",
  profile_id_2: 90,
  profile_type_2: "tutor"
}
Badge: "Tutor" (professional network as tutor)
```

**Result:** Same person, different badges based on profile context!

## Code Implementation

### Helper Function

Located in `js/tutor-profile/global-functions.js`:

```javascript
function getProfileBadge(connection) {
    // Legacy fallback for sample data
    if (connection.role) {
        return connection.role;
    }

    // Get current user ID
    const currentUserId = window.user?.id;
    if (!currentUserId) {
        return 'User';
    }

    // Determine which profile is the "other" person's
    let profileType;

    if (connection.user_id_1 === currentUserId) {
        profileType = connection.profile_type_2;  // Show their profile
    } else if (connection.user_id_2 === currentUserId) {
        profileType = connection.profile_type_1;  // Show their profile
    } else {
        profileType = connection.profile_type_1 || connection.profile_type_2 || 'user';
    }

    // Map to display labels
    const profileTypeMap = {
        'tutor': 'Tutor',
        'student': 'Student',
        'parent': 'Parent',
        'advertiser': 'Advertiser'
    };

    return profileTypeMap[profileType] || profileType.charAt(0).toUpperCase() + profileType.slice(1);
}
```

### Usage in Connection Cards

**renderConnectionCard:**
```javascript
function renderConnectionCard(connection) {
    // ... other code ...

    // Get profile-based role badge
    const roleBadge = getProfileBadge(connection);

    return `
        <div class="connection-card">
            <h4>${connection.name}</h4>
            <p><span class="role-badge">${roleBadge}</span></p>
            <!-- ... -->
        </div>
    `;
}
```

**renderRequestCard:**
```javascript
function renderRequestCard(request) {
    // ... other code ...

    // Get profile-based role badge
    const roleBadge = getProfileBadge(request);

    return `
        <div class="connection-card request-card">
            <h4>${request.name}</h4>
            <p><span class="role-badge">${roleBadge}</span></p>
            <!-- ... -->
        </div>
    `;
}
```

## Sample Data Structure

Sample data in `getConnectionsData()` includes both formats:

```javascript
{
    id: 1,
    name: 'Abebe Bekele',

    // Legacy field (fallback for testing)
    role: 'Student',

    // Profile-based fields (NEW - from connections table)
    user_id_1: 115,              // Current user
    user_id_2: 50,               // Abebe
    profile_id_1: 85,            // Current user's tutor profile ID
    profile_type_1: 'tutor',     // Current user's profile type
    profile_id_2: 12,            // Abebe's student profile ID
    profile_type_2: 'student',   // Abebe's profile type

    // Other fields...
    avatar: 'path/to/image.jpg',
    connectedDate: '2025-09-15',
    mutualConnections: 12
}
```

## Profile Type Mapping

| Database Value | Display Badge |
|---------------|---------------|
| `tutor` | Tutor |
| `student` | Student |
| `parent` | Parent |
| `advertiser` | Advertiser |

## Benefits

### 1. **Context Clarity**
```
Before: "Ahmed - Student" (Which role? He's both student AND tutor!)
After:  "Ahmed - Student" (You're connecting with his student profile)
        "Ahmed - Tutor" (You're connecting with his tutor profile - different connection!)
```

### 2. **Role Isolation**
- Professional network: Tutor ↔ Tutor badges
- Learning network: Student ↔ Tutor badges
- Parent network: Parent ↔ Student/Tutor badges

### 3. **Accurate Analytics**
- Track connections by actual profile type
- Know which profile is most connected
- Understand network composition better

### 4. **Future-Proof**
- Easy to add new profile types
- Consistent with database structure
- Supports multi-role users

## API Integration

### Fetching Connections

**Endpoint:** `GET /api/connections`

**Response includes profile fields:**
```json
[
    {
        "id": 1,
        "profile_id_1": 85,
        "profile_type_1": "tutor",
        "profile_id_2": 12,
        "profile_type_2": "student",
        "user_id_1": 115,
        "user_id_2": 50,
        "user_1_name": "Ahmed Hassan",
        "user_2_name": "Abebe Bekele",
        "user_2_profile_picture": "path/to/pic.jpg",
        "status": "connected",
        "created_at": "2025-09-15T10:30:00Z"
    }
]
```

### Loading Connections in Frontend

```javascript
// In api-service.js
async getConnections(filter = 'all') {
    const response = await fetch(`${this.baseURL}/api/connections?filter=${filter}`, {
        headers: this.getAuthHeaders()
    });
    return await response.json();
}

// In global-functions.js
async function loadRealConnections() {
    try {
        const connections = await apiService.getConnections('all');

        // Each connection now has profile_type_1/2 fields
        const connectionsGrid = document.getElementById('connectionsGrid');
        connectionsGrid.innerHTML = connections.map(c =>
            renderConnectionCard(c)  // Uses getProfileBadge() automatically!
        ).join('');
    } catch (error) {
        console.error('Failed to load connections:', error);
    }
}
```

## Testing

### Test with Sample Data

1. **Open tutor profile page**
2. **Click "Community" card** to open modal
3. **Check connection badges:**
   - Abebe Bekele: "Student" ✓
   - Tigist Haile: "Parent" ✓
   - Yonas Tesfaye: "Tutor" ✓ (colleague)

### Test with Real API

1. **Create connections** via POST `/api/connections`
2. **Specify profile types** in request:
   ```json
   {
       "target_profile_id": 12,
       "target_profile_type": "student",
       "connection_type": "connect"
   }
   ```
3. **Verify badge** shows correct profile type

### Debug in Console

```javascript
// Check connection data structure
const connections = await apiService.getConnections('all');
console.log('First connection:', connections[0]);

// Check badge output
const badge = getProfileBadge(connections[0]);
console.log('Badge:', badge);

// Check current user
console.log('Current user:', window.user);
```

## Backwards Compatibility

The implementation maintains **full backwards compatibility**:

1. **Legacy 'role' field:**
   - If present, use it as fallback
   - Useful for sample/test data
   - No breaking changes

2. **Profile fields:**
   - If present, use them (preferred)
   - More accurate and context-aware
   - Future-proof approach

3. **Graceful fallback:**
   ```javascript
   if (connection.role) {
       return connection.role;  // Legacy
   }
   // ... profile-based logic ...
   ```

## Common Scenarios

### Scenario 1: Student Views Their Connections
```
Student profile viewing connections:
- "Tutor" badges → Teachers they're learning from
- "Student" badges → Classmates/peers
- "Parent" badges → Parents in community
```

### Scenario 2: Tutor Views Professional Network
```
Tutor profile viewing connections:
- "Tutor" badges → Professional colleagues
- "Student" badges → Current/past students
- "Parent" badges → Parents of students
```

### Scenario 3: Multi-Role User
```
User with both Student AND Tutor profiles:

As Student:
- "Tutor" badges → Their teachers

As Tutor:
- "Tutor" badges → Their colleagues
- "Student" badges → Their students

Same people, different contexts!
```

## Files Modified

1. **`js/tutor-profile/global-functions.js`**
   - Added `getProfileBadge()` helper function (47 lines)
   - Updated `renderConnectionCard()` to use profile badges
   - Updated `renderRequestCard()` to use profile badges
   - Enhanced sample data with profile fields

2. **Location:** Lines 1706-1756 (helper function)
3. **Location:** Lines 1877-1923 (renderConnectionCard)
4. **Location:** Lines 1925-1962 (renderRequestCard)

## Summary

✅ **COMPLETE:** Connection role badges now display based on profile types from the connections table

**Before:** Generic user roles (unclear context)
**After:** Specific profile types (clear relationship)

**Key Features:**
- Profile-based badges (tutor/student/parent/advertiser)
- Context-aware (knows which profile is connecting)
- Backwards compatible (legacy 'role' field supported)
- Future-proof (easy to extend)

**User Experience:**
- Clear understanding of connection type
- Accurate representation of relationship
- Support for multi-role users
- Consistent with database architecture

The connection cards now accurately reflect the **profile-based connection system** implemented in the database! 🎉
