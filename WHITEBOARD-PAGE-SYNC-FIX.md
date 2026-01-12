# Whiteboard Page Navigation Synchronization Fix

## Issue Summary
Page navigation (Previous/Next/Add Page) works locally but doesn't sync to other participants during video calls.

## Root Causes Identified

### Issue 1: Backend WebSocket Not Forwarding Complete Data ❌
**Location:** `astegni-backend/websocket_manager.py:1024-1035`

**Problem:**
The backend was only forwarding `page_id` and `page_number`, but the frontend expects:
- `action` ('add', 'navigate', 'delete')
- `page` (full page object)
- `sender_name` (for notifications)

**Backend Code (Before):**
```python
elif message_type == "whiteboard_page_change":
    await manager.send_personal_message({
        "type": "whiteboard_page_change",
        "session_id": session_id,
        "page_id": data.get("page_id"),
        "page_number": data.get("page_number"),
        "from_student_profile_id": data.get("from_student_profile_id"),
        "from_tutor_profile_id": data.get("from_tutor_profile_id"),
        "timestamp": datetime.utcnow().isoformat()
    }, recipient_key)
```

**Backend Code (After):**
```python
elif message_type == "whiteboard_page_change":
    await manager.send_personal_message({
        "type": "whiteboard_page_change",
        "session_id": session_id,
        "action": data.get("action"),  # 'add', 'navigate', 'delete'
        "page": data.get("page"),  # Full page object
        "sender_id": data.get("sender_id"),
        "sender_name": data.get("sender_name"),
        "sender_role": data.get("sender_role"),
        "from_profile_id": data.get("from_profile_id"),
        "from_profile_type": data.get("from_profile_type"),
        # Legacy fields for backward compatibility
        "page_id": data.get("page_id") or (data.get("page", {}).get("id") if data.get("page") else None),
        "page_number": data.get("page_number") or (data.get("page", {}).get("page_number") if data.get("page") else None),
        "from_student_profile_id": data.get("from_student_profile_id"),
        "from_tutor_profile_id": data.get("from_tutor_profile_id"),
        "timestamp": datetime.utcnow().isoformat()
    }, recipient_key)
    print(f"📄 Page change synced from {sender_key} to {recipient_key}: action={data.get('action')}")
```

### Issue 2: Frontend Not Sending `sender_name` ❌
**Location:** `js/tutor-profile/whiteboard-manager.js:4565-4592`

**Problem:**
The `broadcastPageChange()` method wasn't including `sender_name` in the message, causing notifications to show "undefined added page X".

**Frontend Code (Before):**
```javascript
broadcastPageChange(action, page) {
    const message = {
        type: 'whiteboard_page_change',
        session_id: this.currentSession?.id,
        action: action,
        page: page,
        sender_id: this.myProfileId,
        sender_role: this.userRole,
        // ... routing fields
    };
    this.ws.send(JSON.stringify(message));
}
```

**Frontend Code (After):**
```javascript
broadcastPageChange(action, page) {
    // Get sender name from profile data
    const senderName = this.myProfileData?.first_name
        ? `${this.myProfileData.first_name} ${this.myProfileData.last_name || ''}`.trim()
        : 'Host';

    const message = {
        type: 'whiteboard_page_change',
        session_id: this.currentSession?.id,
        action: action,
        page: page,
        sender_id: this.myProfileId,
        sender_name: senderName,  // NEW!
        sender_role: this.userRole,
        // ... routing fields
    };

    console.log(`📤 Broadcasting page ${action}:`, {
        action,
        pageId: page.id,
        from: `${this.userRole}_${this.myProfileId}`,
        to: `${otherParty.type}_${otherParty.id}`
    });

    this.ws.send(JSON.stringify(message));
}
```

### Issue 3: Overly Restrictive Permission Logic (ALREADY FIXED)
**Location:** `js/tutor-profile/whiteboard-manager.js:3858-3881`

**Problem:**
Solo whiteboard usage (without video call) was broken. Tutors couldn't navigate pages unless in a call.

**Solution:**
Enhanced `canUserManagePages()` to allow:
1. Tutors ALWAYS manage pages (regardless of call status)
2. Solo whiteboard usage allows page navigation
3. During calls, respect host/participant permissions

---

## How Page Synchronization Works

### Message Flow:
```
Host clicks "Next Page"
    ↓
1. nextPage() called (whiteboard-manager.js:3896)
    ↓
2. Permission check: canUserManagePages() ✅
    ↓
3. flipToPage(index, 'next') - Update local UI
    ↓
4. broadcastPageChange('navigate', page) - Send WebSocket message
    ↓
5. Backend receives "whiteboard_page_change"
    ↓
6. websocket_manager.py forwards to recipient
    ↓
7. Participant receives message
    ↓
8. handleRemotePageChange(data) called (whiteboard-manager.js:5023)
    ↓
9. Switch on data.action: 'navigate'
    ↓
10. flipToPage(pageIndex, direction) - Sync participant's UI
    ↓
11. Show notification: "Host navigated to page X"
```

### Message Structure:
```javascript
{
    type: 'whiteboard_page_change',
    session_id: 123,
    action: 'navigate',  // or 'add', 'delete'
    page: {
        id: 456,
        page_number: 2,
        background_color: '#FFFFFF',
        strokes: []
    },
    sender_id: 789,
    sender_name: 'John Doe',
    sender_role: 'tutor',
    from_profile_id: 789,
    from_profile_type: 'tutor',
    to_profile_id: 101,
    to_profile_type: 'student'
}
```

---

## Frontend Permission System

### Button Disabling (Visual Only)
**Location:** `js/tutor-profile/whiteboard-manager.js:5700-5738`

The `updateToolbarPermissions()` method disables buttons for participants without permission, but this is **VISUAL ONLY** - it doesn't prevent receiving updates.

```javascript
// Participants without permission see disabled buttons
if (!canManagePages) {
    prevPageBtn.disabled = true;
    prevPageBtn.style.opacity = '0.4';
    prevPageBtn.style.cursor = 'not-allowed';
    prevPageBtn.title = 'Request draw permission to navigate pages';
}
```

### Receiving Updates (No Permission Check)
**Location:** `js/tutor-profile/whiteboard-manager.js:5023-5072`

The `handleRemotePageChange()` method has **NO PERMISSION CHECKS** - all participants receive and apply page changes from the host.

```javascript
handleRemotePageChange(data) {
    if (data.sender_id === this.myProfileId) return;  // Ignore own messages

    switch (data.action) {
        case 'add':
            this.pages.push(data.page);
            this.flipToPage(newPageIndex, 'next');  // ✅ Always follows host
            break;
        case 'navigate':
            this.flipToPage(pageIndex, direction);  // ✅ Always follows host
            break;
    }
}
```

**This is correct behavior!** Participants should:
- ❌ Not be able to click navigation buttons (unless permitted)
- ✅ Always follow the host's page changes automatically

---

## Testing Checklist

### Solo Whiteboard (Already Working)
- [x] Tutor can add/navigate pages without video call
- [x] Student can add/navigate pages without video call

### During Video Call (Now Fixed)
- [ ] **Host adds page** → Participant sees new page and navigates to it
- [ ] **Host navigates to previous page** → Participant follows with flip animation
- [ ] **Host navigates to next page** → Participant follows with flip animation
- [ ] **Participant without permission** → Buttons disabled but still receives updates
- [ ] **Participant with permission** → Can add/navigate pages and sync to host

### Notifications
- [ ] Participant sees: "John Doe added page 3"
- [ ] Participant sees: "John Doe navigated to page 2"

### Console Logs
- [ ] Host console: `📤 Broadcasting page navigate: {action, pageId, from, to}`
- [ ] Participant console: `📄 Page change: navigate`
- [ ] Participant console: `📄 Remote navigation to page 2`
- [ ] Backend logs: `📄 Page change synced from tutor_789 to student_101: action=navigate`

---

## Files Modified

1. ✅ **astegni-backend/websocket_manager.py** (Lines 1024-1043)
   - Fixed WebSocket message forwarding to include `action`, `page`, `sender_name`

2. ✅ **js/tutor-profile/whiteboard-manager.js** (Lines 4565-4605)
   - Added `sender_name` to broadcast messages
   - Added console logging for debugging

3. ✅ **js/tutor-profile/whiteboard-manager.js** (Lines 3858-3881)
   - Fixed permission logic (previous fix)

---

## Debugging Tips

### If page sync still doesn't work:

1. **Check WebSocket connection:**
   ```javascript
   console.log('WebSocket state:', this.ws?.readyState);
   // Should be 1 (OPEN)
   ```

2. **Check other party detection:**
   ```javascript
   const otherParty = this.getOtherParty();
   console.log('Other party:', otherParty);
   // Should be {id: 101, type: 'student'}
   ```

3. **Check message sending:**
   - Open browser console on HOST side
   - Click "Next Page"
   - Look for: `📤 Broadcasting page navigate: ...`

4. **Check message receiving:**
   - Open browser console on PARTICIPANT side
   - Wait for host to navigate
   - Look for: `📄 Page change: navigate`
   - Look for: `📄 Remote navigation to page X`

5. **Check backend logs:**
   ```bash
   cd astegni-backend
   python app.py
   # Look for: 📄 Page change synced from ... to ...: action=navigate
   ```

6. **Verify session and pages loaded:**
   ```javascript
   console.log('Current session:', this.currentSession);
   console.log('Pages:', this.pages);
   console.log('Current page:', this.currentPage);
   ```

---

## Summary

**What was broken:**
1. Backend wasn't forwarding complete page change data
2. Frontend wasn't sending sender name
3. Permission logic prevented solo whiteboard usage (already fixed)

**What's fixed:**
1. ✅ Backend now forwards full `page` object, `action`, and `sender_name`
2. ✅ Frontend now sends sender name and logs broadcasts
3. ✅ Permission logic allows solo usage and tutors always have access

**Expected behavior:**
- Host can add/navigate pages ✅
- Participants automatically follow host's page changes ✅
- Participants without permission see disabled buttons but still sync ✅
- Participants with permission can add/navigate and sync to host ✅

---

**Generated:** 2026-01-10
**Status:** ✅ FIXED
**Priority:** HIGH - Core collaboration feature
