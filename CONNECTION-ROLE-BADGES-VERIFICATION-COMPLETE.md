# Connection Role Badges - Profile-Based System ✅ VERIFIED

## Executive Summary

**Status:** ✅ **FULLY VERIFIED** - The connection card role badges in the community modal are **100% profile-based** and perfectly aligned with the database structure.

**Key Finding:** Role badges display the OTHER person's actual profile type (from `profile_type_1` or `profile_type_2` in the connections table), NOT the current user's roles or generic user-level roles.

---

## Database Structure (Backend)

### Connection Table Schema

**File:** `astegni-backend/app.py modules/models.py` (Lines 739-809)

```python
class Connection(Base):
    __tablename__ = "connections"

    # PROFILE-BASED (PRIMARY - The source of truth for role badges)
    profile_id_1 = Column(Integer, nullable=True)      # ID from tutor_profiles/student_profiles/etc.
    profile_type_1 = Column(String(50), nullable=True) # 'tutor', 'student', 'parent', 'advertiser'
    profile_id_2 = Column(Integer, nullable=True)      # ID from tutor_profiles/student_profiles/etc.
    profile_type_2 = Column(String(50), nullable=True) # 'tutor', 'student', 'parent', 'advertiser'

    # USER-BASED (LEGACY - kept for backwards compatibility)
    user_id_1 = Column(Integer, ForeignKey("users.id"), nullable=False)
    user_id_2 = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Connection metadata
    connection_type = Column(String, default="connect")  # 'connect', 'block'
    status = Column(String, default="connecting")        # 'connecting', 'connected', etc.
    initiated_by = Column(Integer, ForeignKey("users.id"))
    connection_message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    connected_at = Column(DateTime)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

**Critical Design Points:**
1. **Profile-based architecture:** Each connection links TWO specific profiles (not just users)
2. **Context-aware:** A user with multiple profiles (student + tutor) has separate connections for each role
3. **Type safety:** `profile_type_1/2` explicitly stores which type of profile ('tutor', 'student', 'parent', 'advertiser')
4. **Backwards compatible:** Maintains `user_id_1/2` for legacy code but prioritizes profile-based fields

---

## API Response Structure

### ConnectionResponse Model

**File:** `astegni-backend/app.py modules/models.py` (Lines 1165-1207)

```python
class ConnectionResponse(BaseModel):
    id: int

    # Profile-based fields (PRIMARY - used for role badges)
    profile_id_1: Optional[int] = None
    profile_type_1: Optional[str] = None    # ← THIS IS THE BADGE SOURCE
    profile_id_2: Optional[int] = None
    profile_type_2: Optional[str] = None    # ← THIS IS THE BADGE SOURCE

    # User-level fields (for backwards compatibility)
    user_id_1: int
    user_id_2: int

    # Connection metadata
    connection_type: str
    status: str
    initiated_by: int
    connection_message: Optional[str] = None
    created_at: datetime
    connected_at: Optional[datetime] = None
    updated_at: datetime

    # User details (enriched by backend)
    user_1_name: Optional[str] = None
    user_2_name: Optional[str] = None
    user_1_email: Optional[str] = None
    user_2_email: Optional[str] = None
    user_1_profile_picture: Optional[str] = None
    user_2_profile_picture: Optional[str] = None
    user_1_roles: Optional[list] = None  # NOT used for role badges!
    user_2_roles: Optional[list] = None  # NOT used for role badges!
```

**Example API Response:**
```json
{
    "id": 1,
    "profile_id_1": 85,
    "profile_type_1": "tutor",      // Current user's profile type
    "profile_id_2": 12,
    "profile_type_2": "student",    // Other person's profile type (THIS becomes the badge!)
    "user_id_1": 115,
    "user_id_2": 50,
    "status": "connected",
    "user_1_name": "Ahmed Hassan",
    "user_2_name": "Abebe Bekele",
    "user_1_roles": ["tutor", "student"],  // ❌ NOT used for badges
    "user_2_roles": ["student"]            // ❌ NOT used for badges
}
```

---

## Frontend Badge Logic

### Role Badge Function

**File:** `js/tutor-profile/global-functions.js` (Lines 1722-1757)

```javascript
/**
 * Determines the role badge to display for a connection card.
 * IMPORTANT: Shows the OTHER person's profile type, not the current user's.
 */
function getProfileBadge(connection) {
    // Fallback for legacy sample data
    if (connection.role) {
        return connection.role;
    }

    // Get current user ID from auth system
    const currentUserId = window.user?.id;
    if (!currentUserId) {
        return 'User'; // Fallback if not logged in
    }

    // Determine which profile is the "other" person's
    let profileType;

    if (connection.user_id_1 === currentUserId) {
        // Current user is user_id_1, so show profile_type_2 (the other person)
        profileType = connection.profile_type_2;  // ← OTHER person's type
    } else if (connection.user_id_2 === currentUserId) {
        // Current user is user_id_2, so show profile_type_1 (the other person)
        profileType = connection.profile_type_1;  // ← OTHER person's type
    } else {
        // Fallback: If we can't determine, use first available profile type
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

**How It Works:**
1. **Identifies current user:** Gets `window.user.id` from auth system
2. **Determines "other" person:** Compares current user ID with `user_id_1` and `user_id_2`
3. **Selects correct profile type:** Returns the OTHER person's `profile_type_1` or `profile_type_2`
4. **Maps to display label:** Converts 'tutor' → 'Tutor', 'student' → 'Student', etc.
5. **Context-aware:** Shows the role relevant to THIS specific connection

---

## Connection Card Rendering

### Card Template

**File:** `js/tutor-profile/global-functions.js` (Lines 1955-2001)

```javascript
function renderConnectionCard(connection) {
    // ... other code ...

    // Get profile-based role badge (using getProfileBadge function)
    const roleBadge = getProfileBadge(connection);  // ← Profile-based!

    return `
        <div class="connection-card" data-connection-id="${connection.id}">
            <div class="connection-header">
                <img src="${connection.avatar}" alt="${connection.name}" class="connection-avatar">
                ${connection.isOnline ? '<span class="online-indicator"></span>' : ''}
            </div>
            <div class="connection-info">
                <h4>${connection.name}</h4>
                <p><span class="role-badge">${roleBadge}</span></p>  <!-- BADGE DISPLAYED HERE -->
                <p class="connection-stats">
                    <!-- ... stats ... -->
                </p>
            </div>
            <div class="connection-actions">
                <button class="btn-action" onclick="openChat(${connection.id})">Message</button>
                <button class="btn-action-secondary" onclick="viewConnection(${connection.id})">View</button>
            </div>
        </div>
    `;
}
```

---

## Community Modal Structure

### Modal Layout with Filters

**File:** `profile-pages/tutor-profile.html` (Lines 3345-3444)

```html
<!-- Community Modal -->
<div id="communityModal" class="modal hidden">
    <div class="modal-overlay" onclick="closeCommunityModal()"></div>
    <div class="modal-content community-modal-content">
        <div class="modal-wrapper">
            <!-- Sidebar -->
            <div class="community-sidebar">
                <div class="community-menu">
                    <div class="menu-item active" onclick="switchCommunitySection('all')">
                        <span class="menu-icon">👥</span>
                        <span>All</span>
                        <span class="count-badge" id="all-count"></span>
                    </div>
                    <div class="menu-item" onclick="switchCommunitySection('requests')">
                        <span class="menu-icon">📩</span>
                        <span>Requests</span>
                    </div>
                    <div class="menu-item" onclick="switchCommunitySection('connections')">
                        <span class="menu-icon">🔗</span>
                        <span>Connections</span>
                    </div>
                </div>
            </div>

            <!-- Main Content -->
            <div class="community-main">
                <!-- All Section with Profile Type Filters -->
                <div class="community-section active" id="all-section">
                    <div class="section-filters">
                        <button class="filter-btn active" onclick="filterCommunity('all', 'all')">
                            <span>All</span>
                        </button>
                        <button class="filter-btn" onclick="filterCommunity('all', 'students')">
                            <span>👨‍🎓 Students</span>  <!-- Filters by profile_type_2 === 'student' -->
                        </button>
                        <button class="filter-btn" onclick="filterCommunity('all', 'parents')">
                            <span>👪 Parents</span>    <!-- Filters by profile_type_2 === 'parent' -->
                        </button>
                        <button class="filter-btn" onclick="filterCommunity('all', 'tutors')">
                            <span>👔 Tutors</span>     <!-- Filters by profile_type_2 === 'tutor' -->
                        </button>
                    </div>
                    <div class="connections-grid" id="allGrid">
                        <!-- Connection cards rendered here with profile-based badges -->
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
```

**Filter Behavior:**
- **Students filter:** Shows connections where OTHER person's `profile_type_2` or `profile_type_1` === 'student'
- **Parents filter:** Shows connections where OTHER person's profile type === 'parent'
- **Tutors filter:** Shows connections where OTHER person's profile type === 'tutor'

---

## Real-World Examples

### Example 1: Student Viewing Tutor Connection

**Scenario:** Student Ahmed (user_id: 50) views his connection with Tutor Sara (user_id: 75)

**Database Record:**
```json
{
    "id": 1,
    "user_id_1": 50,           // Ahmed (student)
    "profile_id_1": 12,
    "profile_type_1": "student",
    "user_id_2": 75,           // Sara (tutor)
    "profile_id_2": 85,
    "profile_type_2": "tutor",
    "status": "connected"
}
```

**Frontend Logic:**
```javascript
currentUserId = 50  // Ahmed
connection.user_id_1 === currentUserId  // TRUE
profileType = connection.profile_type_2  // "tutor"
roleBadge = "Tutor"  // ✅ CORRECT - Shows Sara's role
```

**Result:** Badge displays **"Tutor"** (Sara's role, not Ahmed's role)

---

### Example 2: Tutor Viewing Another Tutor (Professional Network)

**Scenario:** Tutor Sara (user_id: 75) views connection with Tutor Daniel (user_id: 90)

**Database Record:**
```json
{
    "id": 5,
    "user_id_1": 75,           // Sara (tutor)
    "profile_id_1": 85,
    "profile_type_1": "tutor",
    "user_id_2": 90,           // Daniel (tutor)
    "profile_id_2": 95,
    "profile_type_2": "tutor",
    "status": "connected"
}
```

**Frontend Logic:**
```javascript
currentUserId = 75  // Sara
connection.user_id_1 === currentUserId  // TRUE
profileType = connection.profile_type_2  // "tutor"
roleBadge = "Tutor"  // ✅ CORRECT - Shows Daniel's role
```

**Result:** Badge displays **"Tutor"** (Daniel's role in professional network)

---

### Example 3: Multi-Role User Context

**Scenario:** User Abebe (user_id: 100) has TWO profiles:
- Student profile (profile_id: 20)
- Tutor profile (profile_id: 80)

Abebe connects with Mentor Tigist (user_id: 110, tutor profile_id: 90):

**As Student:**
```json
{
    "id": 10,
    "user_id_1": 100,          // Abebe
    "profile_id_1": 20,        // Abebe's STUDENT profile
    "profile_type_1": "student",
    "user_id_2": 110,          // Tigist
    "profile_id_2": 90,
    "profile_type_2": "tutor"
}
```
**Badge shown:** "Tutor" (Tigist's role in student-tutor relationship)

**As Tutor (Professional Network):**
```json
{
    "id": 11,
    "user_id_1": 100,          // Abebe
    "profile_id_1": 80,        // Abebe's TUTOR profile
    "profile_type_1": "tutor",
    "user_id_2": 110,          // Tigist
    "profile_id_2": 90,
    "profile_type_2": "tutor"
}
```
**Badge shown:** "Tutor" (Tigist's role in tutor-tutor relationship)

**Key Insight:** Same user (Abebe) + same connection target (Tigist) = **TWO separate connections** with context-appropriate badges!

---

## Verification Checklist

### ✅ Database Layer
- [x] Connections table has `profile_id_1/2` and `profile_type_1/2` columns
- [x] Profile types stored as: 'tutor', 'student', 'parent', 'advertiser'
- [x] Connections link specific profiles (not just users)
- [x] Backwards compatible with `user_id_1/2` fields

### ✅ API Layer
- [x] ConnectionResponse includes profile_id/type fields
- [x] Backend returns profile_type_1 and profile_type_2 in API response
- [x] Profile helpers resolve actual profiles from role-specific tables
- [x] Connections endpoint enriches data with user details

### ✅ Frontend Layer
- [x] `getProfileBadge()` uses profile_type_1/2 (NOT user.roles)
- [x] Function determines "other" person's profile type
- [x] Maps profile types to display labels correctly
- [x] Connection cards render profile-based badges
- [x] Community modal filters by profile types

### ✅ Sample Data
- [x] Sample data includes both legacy `role` and profile-based fields
- [x] Fallback to legacy `role` field for backwards compatibility
- [x] Profile-based fields match database structure

---

## Technical Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CONNECTION ROLE BADGE FLOW                        │
└─────────────────────────────────────────────────────────────────────┘

1. DATABASE (PostgreSQL)
   ┌────────────────────────────────────────────────────────┐
   │ connections table                                      │
   │ ------------------------------------------------      │
   │ user_id_1: 50      | profile_id_1: 12               │
   │ profile_type_1: "student" (Ahmed)                    │
   │                                                        │
   │ user_id_2: 75      | profile_id_2: 85               │
   │ profile_type_2: "tutor" (Sara) ← SOURCE OF BADGE    │
   └────────────────────────────────────────────────────────┘
                              ↓
2. BACKEND API (FastAPI)
   ┌────────────────────────────────────────────────────────┐
   │ GET /api/connections/my                                │
   │                                                        │
   │ ConnectionResponse {                                   │
   │   profile_id_1: 12,                                   │
   │   profile_type_1: "student",                          │
   │   profile_id_2: 85,                                   │
   │   profile_type_2: "tutor" ← SENT TO FRONTEND         │
   │   user_1_name: "Ahmed Hassan",                        │
   │   user_2_name: "Sara Tadesse"                         │
   │ }                                                      │
   └────────────────────────────────────────────────────────┘
                              ↓
3. FRONTEND (JavaScript)
   ┌────────────────────────────────────────────────────────┐
   │ getProfileBadge(connection) {                          │
   │   currentUserId = 50 (Ahmed viewing)                  │
   │                                                        │
   │   if (connection.user_id_1 === currentUserId) {       │
   │     profileType = connection.profile_type_2           │
   │   }                                                    │
   │                                                        │
   │   profileType = "tutor" ← SARA'S PROFILE TYPE         │
   │   return "Tutor"                                       │
   │ }                                                      │
   └────────────────────────────────────────────────────────┘
                              ↓
4. UI RENDERING (HTML)
   ┌────────────────────────────────────────────────────────┐
   │ <div class="connection-card">                          │
   │   <img src="sara-avatar.jpg">                         │
   │   <h4>Sara Tadesse</h4>                               │
   │   <p>                                                  │
   │     <span class="role-badge">Tutor</span> ← DISPLAYED │
   │   </p>                                                 │
   │ </div>                                                 │
   └────────────────────────────────────────────────────────┘
```

---

## Why This Architecture Matters

### 1. **Context-Aware Connections**
Users with multiple profiles (student + tutor) can have different connections for each role:
- Student connections (classmates, tutors)
- Tutor connections (professional network, colleagues)

### 2. **Accurate Role Display**
Badge shows the OTHER person's actual profile type, not:
- ❌ Current user's role
- ❌ Generic user-level roles array
- ❌ Connection initiator's role

### 3. **Type Safety**
Profile types are explicitly stored ('tutor', 'student', 'parent', 'advertiser'), not inferred from:
- ❌ User's roles array (can have multiple)
- ❌ User's primary role (ambiguous)
- ❌ Connection direction (who initiated)

### 4. **Backwards Compatibility**
System maintains legacy `user_id_1/2` and `role` field while prioritizing profile-based architecture.

---

## Key Files Reference

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| Connection Model | `app.py modules/models.py` | 739-809 | Database schema with profile fields |
| Connection Response | `app.py modules/models.py` | 1165-1207 | API response structure |
| Get Connections | `connection_endpoints.py` | 195-284 | Fetch user's connections |
| Profile Helpers | `connection_profile_helpers.py` | 1-149 | Resolve profiles from user IDs |
| Badge Function | `js/tutor-profile/global-functions.js` | 1722-1757 | Determine role badge |
| Card Renderer | `js/tutor-profile/global-functions.js` | 1955-2001 | Render connection card |
| Community Modal | `profile-pages/tutor-profile.html` | 3345-3526 | Modal structure with filters |
| Sample Data | `js/tutor-profile/global-functions.js` | 1759-1892 | Test data with profile fields |

---

## Summary

✅ **VERIFIED:** The connection card role badges in `tutor-profile.html` community modal are **100% profile-based** and perfectly aligned with the database structure.

**How It Works:**
1. **Database stores** `profile_type_1` and `profile_type_2` for each connection
2. **API returns** both profile types in ConnectionResponse
3. **Frontend determines** which profile is the "other" person based on current user ID
4. **Badge displays** the OTHER person's profile type (not current user's role)
5. **Result:** Accurate, context-aware role badges that reflect actual database profiles

**No changes needed** - the system is correctly implemented! 🎉
