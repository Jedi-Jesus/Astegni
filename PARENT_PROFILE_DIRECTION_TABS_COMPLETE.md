# Parent Profile - Session Requests Direction Tabs Implementation

## Overview
Updated parent-profile to show both **SENT** and **RECEIVED** session requests with direction tabs, supporting multi-role users (e.g., someone who is both a parent AND a tutor).

## Problem Solved
Previously, the `/api/session-requests/my-requests` endpoint only returned requests **sent by** the current user (parent/student). For users with multiple roles (e.g., parent + tutor), they couldn't see requests they **received as a tutor** when viewing their parent profile.

## Solution
### Backend Changes (`session_request_endpoints.py`)

**Updated Endpoint:** `GET /api/session-requests/my-requests`

Now returns BOTH:
1. **SENT requests**: Requests the user sent as student/parent to tutors
2. **RECEIVED requests**: Requests the user received as a tutor (if they have tutor role)

Each request now includes a `direction` field: `"sent"` or `"received"`

**Query Logic:**
```python
# Query 1: SENT requests (where user is requester)
WHERE sr.requester_id = %s AND sr.requester_type = %s

# Query 2: RECEIVED requests (where user is tutor) - Only if user has tutor role
WHERE sr.tutor_id = %s
```

**Key Changes:**
- Line 1179-1361: Added dual query system (sent_query + received_query)
- Line 1360-1453: Process both sent and received results, add `direction` field to each
- Checks if user has `tutor_id` in `role_ids` to determine if received requests should be fetched
- Sorts combined results by `created_at DESC`

### Frontend Changes

#### 1. HTML (`parent-profile.html`)
**Lines 4202-4214:** Added direction tabs
```html
<!-- Request Direction Tabs (Received vs Sent) - Only shown for Session Requests -->
<div id="parent-session-direction-tabs" class="request-direction-tabs mb-4 hidden"
    style="display: none; gap: 1rem; border-bottom: 2px solid var(--border-color); padding-bottom: 0.5rem;">
    <button class="direction-tab active"
        onclick="filterParentRequestDirection('sent')" data-direction="sent">
        <i class="fas fa-paper-plane"></i> Sent
    </button>
    <button class="direction-tab"
        onclick="filterParentRequestDirection('received')" data-direction="received">
        <i class="fas fa-inbox"></i> Received
    </button>
</div>
```

**Line 28:** Added CSS import
```html
<link rel="stylesheet" href="../css/parent-profile/requests-panel.css">
```

#### 2. JavaScript (`session-requests-manager.js`)

**Line 13:** Added `currentDirection` property
```javascript
currentDirection: 'sent',   // sent, received (for sessions only)
```

**Lines 239-253:** Added `filterByDirection(direction)` method
```javascript
filterByDirection(direction) {
    this.currentDirection = direction;
    // Update tab styling
    document.querySelectorAll('#parent-session-direction-tabs .direction-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.direction === direction) {
            tab.classList.add('active');
        }
    });
    this.renderCurrentView();
}
```

**Lines 258-280:** Updated `getFilteredData()` to filter by direction
```javascript
getFilteredData() {
    let data = this.allData[this.currentType] || [];

    // Apply direction filter for sessions
    if (this.currentType === 'sessions') {
        data = data.filter(item => {
            const direction = item.direction || 'sent';
            return direction === this.currentDirection;
        });
    }

    // Apply status filter (All/Pending/Accepted/Rejected)
    if (this.currentStatus !== 'all') {
        // ...
    }

    return data;
}
```

**Lines 818-894:** Updated `filterParentRequestType()` to show/hide direction tabs
```javascript
if (type === 'sessions') {
    // Show session direction tabs
    if (sessionDirectionTabs) {
        sessionDirectionTabs.classList.remove('hidden');
        sessionDirectionTabs.style.display = 'flex';
    }
    // Hide parenting direction tabs
    // Show status tabs
} else if (type === 'parenting') {
    // Show parenting direction tabs, hide session tabs
} else {
    // Hide both direction tabs for courses/schools
}
```

**Lines 921-941:** Added global function `filterParentRequestDirection(direction)`
```javascript
function filterParentRequestDirection(direction) {
    console.log('[filterParentRequestDirection] Called with direction:', direction);

    // Update tab styling
    const tabs = document.querySelectorAll('#parent-session-direction-tabs .direction-tab');
    tabs.forEach(tab => {
        if (tab.dataset.direction === direction) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Call manager's filterByDirection
    if (typeof ParentRequestsManager !== 'undefined') {
        ParentRequestsManager.filterByDirection(direction);
    }
}
```

**Line 947:** Exported to window
```javascript
window.filterParentRequestDirection = filterParentRequestDirection;
```

#### 3. CSS (`css/parent-profile/requests-panel.css`)
Created new file with direction tab styles (NO grid layout - uses existing card layout)

```css
/* Direction Tabs (Received/Sent) - Only for session requests */
.request-direction-tabs {
    display: flex;
    gap: 1rem;
    border-bottom: 2px solid var(--border-color);
    padding-bottom: 0.5rem;
    margin-bottom: 1rem;
}

.direction-tab {
    background: none;
    border: none;
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.3s ease;
    border-bottom: 3px solid transparent;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.direction-tab:hover {
    color: var(--primary-color);
    background-color: var(--hover-bg);
}

.direction-tab.active {
    color: var(--primary-color);
    border-bottom-color: var(--primary-color);
    font-weight: 600;
}
```

## How It Works

### Multi-Role User Flow (e.g., Parent + Tutor)

1. **User logs in** as a parent (active_role = 'parent')
2. **Navigates to** "My Requests" → "Requested Sessions"
3. **Backend fetches**:
   - ✅ Sent requests (parent_id matches requester_id) → `direction: 'sent'`
   - ✅ Received requests (tutor_id matches tutor_id) → `direction: 'received'` *(if user has tutor role)*
4. **Frontend displays**:
   - Direction tabs visible (Sent/Received)
   - Default: "Sent" tab active
   - Status tabs still work (All/Pending/Accepted/Rejected)

### Single-Role User Flow (Parent Only)

1. **User logs in** as a parent (active_role = 'parent', no tutor role)
2. **Navigates to** "My Requests" → "Requested Sessions"
3. **Backend fetches**:
   - ✅ Sent requests (parent_id matches requester_id) → `direction: 'sent'`
   - ❌ No received requests (user doesn't have tutor_id)
4. **Frontend displays**:
   - Direction tabs visible but "Received" will show empty state
   - "Sent" tab shows all requests sent by parent

### Tab Visibility Rules

- **Courses/Schools**: Direction tabs HIDDEN
- **Sessions**: Direction tabs SHOWN
- **Parenting**: Parenting direction tabs SHOWN (different tabs)
- **Child Invitations**: Both direction tabs HIDDEN

## Testing

### Test Case 1: Multi-Role User (Parent + Tutor)
**User:** Has both parent and tutor roles
**Expected:**
- "Sent" tab shows requests they sent as parent to tutors
- "Received" tab shows requests they received as tutor from students/parents
- Both tabs work with status filters (All/Pending/Accepted/Rejected)

### Test Case 2: Single-Role User (Parent Only)
**User:** Only has parent role
**Expected:**
- "Sent" tab shows requests they sent as parent to tutors
- "Received" tab shows empty state (no requests)
- Both tabs visible but received is empty

### Test Case 3: Request Type Switching
**Steps:**
1. Click "Requested Courses" → Direction tabs HIDDEN
2. Click "Requested Sessions" → Direction tabs SHOWN
3. Click "Parenting Invitations" → Session direction tabs HIDDEN, parenting tabs SHOWN

## Database Schema

**Table:** `requested_sessions`

**Key Columns:**
- `requester_id`: Profile ID of the person sending the request
- `requester_type`: 'student' or 'parent'
- `tutor_id`: Profile ID of the tutor receiving the request

**Direction Logic:**
- If `current_user.role_ids.parent == requester_id AND requester_type == 'parent'` → **SENT**
- If `current_user.role_ids.tutor == tutor_id` → **RECEIVED**

## Files Modified

### Backend
- `astegni-backend/session_request_endpoints.py` (lines 1179-1453)

### Frontend
- `profile-pages/parent-profile.html` (lines 27-28, 4202-4214)
- `js/parent-profile/session-requests-manager.js` (lines 13, 239-253, 258-280, 818-894, 921-947)
- `css/parent-profile/requests-panel.css` (new file)

## Summary

✅ **Multi-role support**: Users with parent + tutor roles see both sent and received requests
✅ **Direction filtering**: Sent/Received tabs work correctly
✅ **Status filtering**: All/Pending/Accepted/Rejected still works within each direction
✅ **Conditional visibility**: Direction tabs only show for session requests
✅ **Backward compatible**: Single-role users still work (just see empty received tab)
✅ **No layout changes**: Uses existing card layout, no CSS Grid conflicts

The system now correctly handles users with multiple roles, showing them all relevant session requests regardless of which profile they're viewing!
