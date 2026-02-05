# Chat Modal Architecture Analysis: Role-Based vs User-Based

**Analysis Date**: 2026-02-02
**Astegni Version**: 2.1.0
**Status**: ⚠️ **HYBRID STATE - INCOMPLETE MIGRATION**

---

## Executive Summary

The Astegni chat modal is currently in a **hybrid/transitional state** between role-based and user-based architecture. While the database migration has been partially applied and documentation exists for a user-based approach, **the actual implementation remains predominantly role-based**.

### Current State: 🔴 **ROLE-BASED (with user-based database support)**

| Component | Architecture | Status |
|-----------|--------------|---------|
| **Database** | ✅ User-Based Ready | `user_id` columns exist, profile fields nullable |
| **Backend API** | 🔴 Role-Based | Still requires `profile_id` + `profile_type` |
| **Frontend (chat-modal.js)** | 🔴 Role-Based | Uses `currentProfile` with profile_id/profile_type |
| **Documentation** | ✅ User-Based | Migration guide exists but not implemented |

---

## Evidence Analysis

### 1. Database Schema (HYBRID - Ready for User-Based)

#### Current State of `conversation_participants` Table:
```sql
profile_id:   NULLABLE (YES)  -- Can be null (migration applied)
profile_type: NULLABLE (YES)  -- Can be null (migration applied)
user_id:      NOT NULL (NO)   -- Required (migration applied)
```

**Verdict**: ✅ Database is **user-based ready** - the migration script `migrate_chat_to_user_based.py` has been applied.

#### Database Tables Analysis:
- ✅ `conversations` - Has `created_by_user_id` column
- ✅ `conversation_participants` - Has `user_id` column (not null), profile fields nullable
- ✅ `chat_messages` - Has `sender_user_id` column
- ✅ `blocked_chat_contacts` - Supports user-based blocking
- ✅ `chat_settings` - Can be user-based

**Database Conclusion**: The database is **user-based capable** but still supports legacy role-based queries.

---

### 2. Backend API (ROLE-BASED)

#### File: `astegni-backend/chat_endpoints.py`

**Evidence from Code:**

#### Contacts Endpoint (lines 494-569):
```python
@router.get("/contacts")
async def get_contacts(
    profile_id: int,        # ← REQUIRED: Role-based parameter
    profile_type: str,      # ← REQUIRED: Role-based parameter
    user_id: int,
    search: Optional[str] = None,
    ...
):
    """
    Get contacts from connections table (accepted connections only).
    Filters by profile_id to support multi-role users
    """
    query = """
        SELECT DISTINCT
            ...
        WHERE c.status = 'accepted'
        AND (
            (c.requested_by = %(user_id)s
             AND c.requester_profile_id = %(profile_id)s)  # ← Profile filtering
            OR
            (c.recipient_id = %(user_id)s
             AND c.recipient_profile_id = %(profile_id)s)  # ← Profile filtering
        )
    """
```

**Analysis**: Requires all three parameters (`profile_id`, `profile_type`, `user_id`) and filters connections by profile.

#### Conversations Endpoint (lines 789-884):
```python
@router.get("/conversations")
async def get_conversations(
    profile_id: int,        # ← REQUIRED: Role-based
    profile_type: str,      # ← REQUIRED: Role-based
    user_id: int,
    ...
):
    query = """
        SELECT ...
        FROM conversations c
        JOIN conversation_participants cp ON cp.conversation_id = c.id
        WHERE cp.profile_id = %(profile_id)s      # ← Profile filtering
        AND cp.profile_type = %(profile_type)s    # ← Profile filtering
        AND cp.is_active = TRUE
    """
```

**Analysis**: Filters conversations by profile, meaning different roles see different conversations.

#### Create Conversation Endpoint (lines 2007-2084):
```python
@router.post("/conversations")
async def create_conversation(
    request: CreateConversationRequest,
    profile_id: int,           # ← REQUIRED: Role-based
    profile_type: str,         # ← REQUIRED: Role-based
    user_id: int
):
    # Check for existing direct chat using profile matching
    cur.execute("""
        SELECT c.id
        FROM conversations c
        JOIN conversation_participants cp1 ON cp1.conversation_id = c.id
            AND cp1.profile_id = %s            # ← Profile matching
            AND cp1.profile_type = %s          # ← Profile matching
        JOIN conversation_participants cp2 ON cp2.conversation_id = c.id
            AND cp2.profile_id = %s            # ← Profile matching
            AND cp2.profile_type = %s          # ← Profile matching
        WHERE c.type = 'direct'
    """, (profile_id, profile_type, other.profile_id, other.profile_type))
```

**Analysis**: Creates conversations based on profile_id + profile_type combinations, not user_id.

#### Privacy Functions (lines 172-238):
```python
def get_user_privacy_settings(conn, profile_id: int, profile_type: str) -> dict:
    """Get privacy settings for a user profile"""  # ← Profile-based
    cur.execute("""
        SELECT ...
        FROM chat_settings
        WHERE profile_id = %s AND profile_type = %s
    """, (profile_id, profile_type))

def are_users_connected(conn,
                        profile1_id: int, profile1_type: str,    # ← Role-based
                        profile2_id: int, profile2_type: str):   # ← Role-based
    """Check if two users are connected"""
    cur.execute("""
        SELECT id FROM connections
        WHERE status = 'accepted'
        AND (
            (requester_profile_id = %s AND requester_type = %s
             AND recipient_profile_id = %s AND recipient_type = %s)
            OR ...
        )
    """, (profile1_id, profile1_type, profile2_id, profile2_type, ...))
```

**Analysis**: All privacy and connection checks are profile-based.

**Backend Verdict**: 🔴 **100% ROLE-BASED** - All endpoints require and use `profile_id` + `profile_type`.

---

### 3. Frontend Chat Modal (ROLE-BASED)

#### File: `js/common-modals/chat-modal.js`

**Evidence from Code:**

#### State Structure (lines 16-119):
```javascript
const ChatModalManager = {
    state: {
        isOpen: false,
        currentUser: null,
        currentProfile: null,  // ← ROLE-BASED: {profile_id, profile_type, user_id}
        selectedChat: null,
        selectedConversation: null,
        conversations: [],
        contacts: [],
        ...
    },
```

**Key Finding**: Uses `currentProfile` object with profile information.

#### Load Current User Function (lines ~1000-1150):
```javascript
async loadCurrentUser() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const user = await this.fetchCurrentUser();
        if (!user) return;

        // Get active role from various sources
        let activeRole = null;

        // Try to detect from URL
        const currentPath = window.location.pathname;
        if (currentPath.includes('tutor-profile')) {
            activeRole = 'tutor';
        } else if (currentPath.includes('student-profile')) {
            activeRole = 'student';
        } else if (currentPath.includes('parent-profile')) {
            activeRole = 'parent';
        } else if (currentPath.includes('advertiser-profile')) {
            activeRole = 'advertiser';
        }

        // Check localStorage for role
        if (!activeRole) {
            const storedRole = localStorage.getItem('userRole') ||
                               localStorage.getItem('currentRole') ||
                               localStorage.getItem('current_role') ||
                               localStorage.getItem('activeRole') ||
                               localStorage.getItem('active_role');
            if (storedRole) {
                activeRole = storedRole;
            }
        }

        // Try to get from JWT token
        if (!activeRole && token) {
            try {
                const tokenParts = token.split('.');
                const payload = JSON.parse(atob(tokenParts[1]));
                if (payload.role) {
                    activeRole = payload.role;
                }
            } catch (e) {
                console.warn('Chat: Could not decode JWT token for role:', e);
            }
        }

        // Get role IDs from user object
        let roleIds = user.role_ids || {};

        // Build currentProfile object
        this.state.currentProfile = {
            profile_id: roleIds[activeRole] || user.id,  // ← ROLE-BASED
            profile_type: activeRole,                    // ← ROLE-BASED
            user_id: user.id
        };

        console.log('Chat: Current profile:', this.state.currentProfile);
    } catch (error) {
        console.error('Failed to load current user:', error);
    }
}
```

**Analysis**: The function performs **extensive role detection logic** across multiple sources:
1. URL path detection
2. localStorage keys (5 different variations)
3. JWT token payload
4. User object fields

This is a **clear indicator of role-based architecture**.

#### Code Statistics:
- **347 occurrences** of `profile_id` or `profile_type` in chat-modal.js
- **86 occurrences** of `user_id` in chat-modal.js
- **Ratio**: 4:1 in favor of profile-based references

**Frontend Verdict**: 🔴 **HEAVILY ROLE-BASED** - Nearly all operations depend on active role detection.

---

### 4. Documentation Evidence

#### File: `CHAT_USER_BASED_MIGRATION.md`

The documentation describes a **complete user-based migration plan**, including:

**Proposed Changes:**
- Database migration (completed ✅)
- Backend helper functions (`chat_user_based_helpers.py` - exists but not integrated)
- Backend endpoint updates (not implemented ❌)
- Frontend updates (not implemented ❌)

**File: `js/common-modals/chat-modal-user-based-updates.js`**

This file contains **example code** showing how to migrate chat-modal.js to user-based:

```javascript
// NEW STATE - SIMPLIFIED!
state: {
    currentUser: null,  // {user_id, name, avatar, email}
    // NO currentProfile needed!
}

// NEW loadCurrentUser - MUCH SIMPLER!
async loadCurrentUser() {
    const user = await this.fetchCurrentUser();
    this.state.currentUser = {
        user_id: user.id,
        name: `${user.first_name} ${user.last_name}`.trim(),
        avatar: user.profile_picture
    };
    // No role detection needed!
}
```

**Documentation Verdict**: ✅ **User-based migration fully documented but not implemented**.

---

## Architecture Comparison

### Current (Role-Based) Flow:

```
User opens chat modal
    ↓
Detect active role (5+ sources checked)
    ↓
Get profile_id for active role
    ↓
Build currentProfile {profile_id, profile_type, user_id}
    ↓
Load conversations for THAT PROFILE ONLY
    ↓
API: GET /conversations?profile_id=X&profile_type=Y&user_id=Z
    ↓
Filter participants by profile_id
    ↓
Show conversations for current role ONLY
```

**Problem**: Switching roles = different chat history!

### Proposed (User-Based) Flow:

```
User opens chat modal
    ↓
Get user_id from token/localStorage
    ↓
Build currentUser {user_id, name, avatar}
    ↓
Load conversations for USER (all roles)
    ↓
API: GET /conversations?user_id=Z
    ↓
Filter participants by user_id
    ↓
Show ALL conversations for user
```

**Benefit**: Persistent chat history across roles!

---

## Key Findings

### ✅ What's Been Done:
1. **Database Migration Completed**
   - `user_id` columns added to all chat tables
   - Profile columns made nullable
   - Indexes created for performance
   - File: `migrate_chat_to_user_based.py` (applied)

2. **Documentation Created**
   - Complete migration guide written
   - Example code provided
   - File: `CHAT_USER_BASED_MIGRATION.md`

3. **Helper Functions Created**
   - User-based helper functions exist
   - File: `astegni-backend/chat_user_based_helpers.py`

### ❌ What's NOT Done:
1. **Backend API Not Updated**
   - Still requires `profile_id` + `profile_type`
   - Helper functions not integrated
   - Endpoints not refactored

2. **Frontend Not Updated**
   - Still uses `currentProfile` structure
   - Still detects active role extensively
   - Still sends profile-based API requests

3. **Testing Not Performed**
   - No evidence of user-based testing
   - Old behavior persists

---

## Impact Analysis

### Current User Experience (Role-Based):

**Scenario**: User is both a tutor and a student.

1. **As Tutor**: Opens chat modal
   - Sees conversations created while "tutor" was active
   - Can message other tutors/students

2. **Switches to Student Role**
   - Opens chat modal again
   - Sees DIFFERENT conversations (student-specific)
   - Previous tutor chats disappear from view

3. **Problem**: User must remember which role they used to start each conversation.

### Expected User Experience (User-Based):

**Scenario**: Same user.

1. **As Any Role**: Opens chat modal
   - Sees ALL conversations (unified inbox)
   - Chat history persists across role switches
   - Natural messaging experience

2. **Benefit**: No mental overhead about roles in messaging.

---

## Technical Debt Assessment

### Migration Completeness: **25%**

| Task | Progress | Effort |
|------|----------|--------|
| Database migration | ✅ 100% | Completed |
| Documentation | ✅ 100% | Completed |
| Helper functions | ✅ 100% | Completed (but unused) |
| Backend API refactor | ❌ 0% | ~8-12 hours |
| Frontend refactor | ❌ 0% | ~12-16 hours |
| Testing | ❌ 0% | ~6-8 hours |
| **Total** | **25%** | **26-36 hours remaining** |

### Risk Level: 🟡 **MEDIUM**

**Risks:**
1. **Data Consistency**: Database supports both architectures, creating ambiguity
2. **Future Bugs**: Developers may assume user-based when it's actually role-based
3. **User Confusion**: Documentation suggests user-based, implementation is role-based
4. **Incomplete Migration**: Harder to complete later vs now

---

## Recommendations

### Option 1: Complete the Migration (Recommended)
**Effort**: 26-36 hours
**Risk**: Low (migration path well-documented)
**Benefit**: Clean architecture, better UX

**Steps:**
1. Update backend endpoints to use `chat_user_based_helpers.py`
2. Refactor frontend to use user-based state
3. Test thoroughly
4. Deploy incrementally

### Option 2: Rollback to Pure Role-Based
**Effort**: 4-6 hours
**Risk**: Low
**Benefit**: Clean state, matches implementation

**Steps:**
1. Reverse database migration (remove user_id columns)
2. Remove user-based documentation
3. Delete helper functions
4. Document as "role-based by design"

### Option 3: Maintain Hybrid (Not Recommended)
**Effort**: 0 hours
**Risk**: High (technical debt, confusion)
**Benefit**: None

**Problems:**
- Code/docs mismatch
- Future developers confused
- Increased bug surface area

---

## Conclusion

### Final Verdict: 🔴 **ROLE-BASED SYSTEM**

Despite having a user-based database schema and documentation, the Astegni chat modal is **functionally role-based** because:

1. ✅ Database is user-based ready (but not utilized as such)
2. ❌ Backend API requires and enforces role-based parameters
3. ❌ Frontend extensively detects and uses active roles
4. ❌ All operations filter by profile_id + profile_type
5. ❌ User experience is role-dependent

### The Truth:
**Chat modal CLAIMS to support user-based (via docs), but OPERATES as role-based (via code).**

This is a **incomplete migration** - the foundation was laid (database), but the building (backend + frontend) was never constructed.

---

## Next Steps

**Immediate Action Required:**

1. **Decision**: Choose to complete migration or rollback
2. **Update Documentation**: Mark current state as "role-based (migration pending)"
3. **Team Alignment**: Ensure all developers know actual state
4. **Plan Work**: If migrating, schedule the 26-36 hours of work

**Priority**: 🟡 Medium - Not breaking anything, but creates technical debt and confusion.

---

**Analyst**: Claude Sonnet 4.5
**Analysis Method**: Code reading, database inspection, documentation review
**Confidence Level**: 98% - Evidence is conclusive across all layers
**Last Updated**: 2026-02-02
