# Connection Role Context Update - Complete ✅

## Overview
Updated the connection system to determine **both** `requester_type` and `recipient_type` based on context:
- **`requester_type`**: Determined by the **active role** the user is currently accessing the system as
- **`recipient_type`**: Determined by the **page context** (which view page we're on)

This ensures that connections are created with the correct role context for both parties.

## The Problem You Identified

You asked: **"What about recipient_type?"**

### Previous Implementation
```javascript
body: JSON.stringify({
    recipient_id: tutorUserId,
    recipient_type: 'tutor',  // Hardcoded!
    requester_type: activeRole
})
```

**Issues:**
1. `recipient_type` was hardcoded to 'tutor'
2. This worked for view-tutor.html but wasn't reusable
3. Other view pages (view-student.html, view-parent.html) would need duplicate logic
4. Not maintainable across different view contexts

### The Real Question

**Should `recipient_type` be determined by:**
- **Option A:** Query the database to see what roles the recipient has?
  - ❌ **NO** - User might have multiple roles, which one to choose?

- **Option B:** Determine from the page context (which view page we're on)?
  - ✅ **YES** - The page context tells us how we're viewing the person!

## Solution: Page Context Determines Recipient Role

### Key Insight

The recipient role should be determined by **which page you're viewing**:

| Page | Recipient Role | Why |
|------|---------------|-----|
| `view-tutor.html?id=64` | `'tutor'` | You're viewing person 64 **as a tutor** |
| `view-student.html?id=64` | `'student'` | You're viewing person 64 **as a student** |
| `view-parent.html?id=64` | `'parent'` | You're viewing person 64 **as a parent** |
| `view-advertiser.html?id=64` | `'advertiser'` | You're viewing person 64 **as an advertiser** |

**Example Scenario:**
- User ID 64 has **both** Student and Tutor profiles
- When you visit `view-tutor.html?id=64` → You want to connect with them **as a tutor**
- When you visit `view-student.html?id=64` → You want to connect with them **as a student**
- The page context determines the intent!

## Implementation

### Added `getRecipientRoleFromPage()` Method

```javascript
/**
 * Get the recipient role type based on the current page
 * Determines what role the person being viewed has based on page context
 * @returns {string} The role type: 'tutor', 'student', 'parent', 'advertiser'
 */
getRecipientRoleFromPage() {
    const currentPage = window.location.pathname;

    // Determine role based on which view page we're on
    if (currentPage.includes('view-tutor.html')) {
        return 'tutor';
    } else if (currentPage.includes('view-student.html')) {
        return 'student';
    } else if (currentPage.includes('view-parent.html')) {
        return 'parent';
    } else if (currentPage.includes('view-advertiser.html')) {
        return 'advertiser';
    }

    // Default to tutor for view-tutor page
    console.warn('[ConnectionManager] Could not determine page type, defaulting to tutor');
    return 'tutor';
}
```

**How It Works:**
1. Checks `window.location.pathname` to see which page we're on
2. Returns the appropriate role based on the page name
3. Falls back to 'tutor' if page cannot be determined

### Updated `sendConnectionRequest()` Method

```javascript
// Get the active role the user is currently accessing the page as
const activeRole = this.getActiveRole();
if (!activeRole) {
    throw new Error('Could not determine your active role. Please refresh and try again.');
}

// Get the recipient role based on the page we're on
const recipientRole = this.getRecipientRoleFromPage();

console.log(`[ConnectionManager] Sending connection request as: ${activeRole} → to ${recipientRole}`);

try {
    const response = await fetch(`${this.API_BASE_URL}/api/connections`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            recipient_id: tutorUserId,
            recipient_type: recipientRole,  // Determined from page context
            requester_type: activeRole  // User's active role
        })
    });
}
```

**Key Changes:**
- Added `const recipientRole = this.getRecipientRoleFromPage();`
- Changed from hardcoded `'tutor'` to dynamic `recipientRole`
- Updated console log to show both roles: `as: student → to tutor`

## Complete Flow Example

### Scenario: Student Connecting to a Tutor

```javascript
// User State
User ID: 45
Roles: ['student', 'tutor']  // Has both profiles
Active Role: 'student'  // Currently viewing as student

// Viewing
Page: view-tutor.html?id=64
Recipient: User ID 64 (who also has both student and tutor profiles)

// Connection Request
getActiveRole() → 'student'  // From authManager
getRecipientRoleFromPage() → 'tutor'  // From page URL

// API Call
POST /api/connections
{
  recipient_id: 64,
  recipient_type: 'tutor',  // Determined from page context ✅
  requester_type: 'student'  // User's active role ✅
}

// Result
Connection created:
- requested_by: 45 (as 'student')
- recipient_id: 64 (as 'tutor')
- Meaning: Student 45 connected to Tutor 64 ✅
```

### Scenario: Tutor Connecting to Another Tutor

```javascript
// User State
User ID: 45
Roles: ['student', 'tutor']
Active Role: 'tutor'  // Switched to tutor view

// Viewing
Page: view-tutor.html?id=64
Recipient: User ID 64

// Connection Request
getActiveRole() → 'tutor'  // From authManager
getRecipientRoleFromPage() → 'tutor'  // From page URL

// API Call
POST /api/connections
{
  recipient_id: 64,
  recipient_type: 'tutor',  // From page context ✅
  requester_type: 'tutor'  // User's active role ✅
}

// Result
Connection created:
- requested_by: 45 (as 'tutor')
- recipient_id: 64 (as 'tutor')
- Meaning: Tutor 45 connected to Tutor 64 ✅
```

### Scenario: Student Viewing Another Student

```javascript
// User State
User ID: 45
Roles: ['student']
Active Role: 'student'

// Viewing
Page: view-student.html?id=88
Recipient: User ID 88 (student profile)

// Connection Request
getActiveRole() → 'student'
getRecipientRoleFromPage() → 'student'  // From view-student.html ✅

// API Call
POST /api/connections
{
  recipient_id: 88,
  recipient_type: 'student',  // From page context ✅
  requester_type: 'student'  // User's active role ✅
}

// Result
Connection created:
- requested_by: 45 (as 'student')
- recipient_id: 88 (as 'student')
- Meaning: Student 45 connected to Student 88 ✅
```

## Why This Solution Is Correct

### ✅ Context-Aware
- Both roles are determined by **context**, not hardcoded values
- `requester_type`: From user's current active role (which profile they're using)
- `recipient_type`: From page context (which profile page they're viewing)

### ✅ Handles Multiple Roles
- User with Student + Tutor can connect as either role
- Recipient with Student + Tutor can be connected to as either role
- Page determines the recipient role, not database priority

### ✅ Reusable Across All View Pages
- Same ConnectionManager can be used on:
  - view-tutor.html
  - view-student.html
  - view-parent.html
  - view-advertiser.html
- No code duplication needed

### ✅ Clear Intent
- The connection request clearly states:
  - "I am connecting AS [my active role]"
  - "TO this person AS [their role on this page]"
- Example: "I (student) want to connect to you (tutor)"

## Console Logging

The updated console log now shows both roles:

```javascript
[ConnectionManager] Sending connection request as: student → to tutor
```

This makes it easy to debug and verify that both roles are being determined correctly.

## Files Modified

### [js/view-tutor/connection-manager.js](js/view-tutor/connection-manager.js)

**Lines 65-87:** Added `getRecipientRoleFromPage()` method
```javascript
getRecipientRoleFromPage() {
    const currentPage = window.location.pathname;
    if (currentPage.includes('view-tutor.html')) return 'tutor';
    else if (currentPage.includes('view-student.html')) return 'student';
    else if (currentPage.includes('view-parent.html')) return 'parent';
    else if (currentPage.includes('view-advertiser.html')) return 'advertiser';
    console.warn('[ConnectionManager] Could not determine page type, defaulting to tutor');
    return 'tutor';
}
```

**Lines 168-191:** Updated `sendConnectionRequest()` to use dynamic recipient role
```javascript
// Get the recipient role based on the page we're on
const recipientRole = this.getRecipientRoleFromPage();

console.log(`[ConnectionManager] Sending connection request as: ${activeRole} → to ${recipientRole}`);

// ... API call with recipient_type: recipientRole
```

## Reusability

This ConnectionManager can now be used on **all view pages**:

### On view-tutor.html
```javascript
const connectionManager = new ConnectionManager();
await connectionManager.sendConnectionRequest(64);
// → recipient_type = 'tutor' (from page context)
```

### On view-student.html (Future)
```javascript
const connectionManager = new ConnectionManager();
await connectionManager.sendConnectionRequest(88);
// → recipient_type = 'student' (from page context)
```

### On view-parent.html (Future)
```javascript
const connectionManager = new ConnectionManager();
await connectionManager.sendConnectionRequest(42);
// → recipient_type = 'parent' (from page context)
```

**No code changes needed** - the same class automatically adapts to the page context!

## Backend Compatibility

The backend already validates both roles:

```python
# Verify requester has the requested role
if requested_role not in user_roles:
    raise HTTPException(
        status_code=400,
        detail=f"You don't have a '{requested_role}' profile. Your roles: {', '.join(user_roles)}"
    )

# Verify recipient has the recipient role
target_user_role = get_user_role(db, target_user_id)
if target_user_role != target_role:
    raise HTTPException(
        status_code=400,
        detail=f"Target user does not have '{target_role}' role"
    )
```

So both roles are validated on the backend.

## Benefits

### 1. **Context-Aware Connections**
- Both roles determined by context (active role + page context)
- Clear intent: "I (as X) want to connect to you (as Y)"

### 2. **Flexible Multi-Role Support**
- User can connect as different roles to different people
- Same person can be connected to in different role contexts

### 3. **Maintainable & Reusable**
- Single ConnectionManager works across all view pages
- No hardcoded role values
- Easy to extend to new role types

### 4. **Clear Debugging**
- Console log shows both roles: "as: student → to tutor"
- Easy to verify correct roles are being used

## Status

✅ **Implementation Complete**
✅ **requester_type**: Uses active role from authManager
✅ **recipient_type**: Uses page context (view-tutor.html, view-student.html, etc.)
✅ **Reusable**: Same code works on all view pages
✅ **Console Logging**: Shows both roles for debugging

### Ready for Testing

**Test Steps:**
1. Login as user with multiple roles
2. Switch to Student role
3. Visit view-tutor.html?id=64
4. Click "Connect"
5. Check console: Should show "Sending connection request as: student → to tutor"
6. Verify connection created with correct roles

---

**Implementation Date:** 2025-01-21
**Author:** Claude Code
**Status:** ✅ Complete - Both roles now context-aware
