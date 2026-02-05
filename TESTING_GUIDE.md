# Chat Modal Testing Guide
## User-Based Architecture Verification

**File:** `js/common-modals/chat-modal.js`
**Date:** February 2, 2026
**Status:** Ready for Testing

---

## Quick Start Testing

### 1. Start Development Server
```bash
cd c:\Users\zenna\Downloads\Astegni
python dev-server.py
```

Access: http://localhost:8081

### 2. Start Backend Server
```bash
cd c:\Users\zenna\Downloads\Astegni\astegni-backend
python app.py
```

Backend: http://localhost:8000

### 3. Login to Test
- Email: `jediael.s.abebe@gmail.com`
- Password: `@JesusJediael1234`

---

## Core Features to Test

### ✅ Test 1: Chat Initialization
1. Login to any profile page
2. Open browser DevTools (F12)
3. Check Console for:
   - `Chat Modal Manager initialized successfully`
   - `Chat: Current user loaded: {user_id, name, avatar, email}`
   - NO errors about `currentProfile`

**Expected:** User loads successfully without role detection

---

### ✅ Test 2: View Conversations
1. Click the chat icon (💬)
2. Chat modal opens
3. Check Console for:
   - `Chat: Loaded X conversations`
4. Check Network tab:
   - Request: `GET /api/chat/conversations?user_id=XXX`
   - NO `profile_id` or `profile_type` parameters

**Expected:** Conversations list displays correctly

---

### ✅ Test 3: Open Existing Conversation
1. Click any conversation from the list
2. Messages load
3. Check Console:
   - `Chat: Loading messages for conversation XXX`
4. Check Network tab:
   - Request: `GET /api/chat/conversations/XXX/messages`
   - Authorization header present

**Expected:** Messages display correctly

---

### ✅ Test 4: Send Text Message
1. In an open conversation
2. Type a message in the input field
3. Press Enter or click Send button
4. Check Console:
   - `Chat: Sending message...`
   - `Chat: Message sent successfully`
5. Check Network tab:
   - Request: `POST /api/chat/conversations/XXX/messages`
   - Body: `{content: "...", message_type: "text"}`
   - NO `sender_profile_id` or `sender_profile_type` in body

**Expected:** Message sends and appears in chat

---

### ✅ Test 5: Start New Direct Chat
1. Click "New Chat" or "Contacts" tab
2. Select a contact
3. Chat opens
4. Check Network tab:
   - Request: `POST /api/chat/conversations`
   - Body: `{type: "direct", participant_user_ids: [XXX]}`
   - NO `participants` array with profile objects

**Expected:** New conversation created and opens

---

### ✅ Test 6: Load Contacts
1. Click "Contacts" tab
2. Check Network tab:
   - Request: `GET /api/chat/contacts?user_id=XXX`
   - NO `profile_id` or `profile_type` parameters

**Expected:** Contacts list displays

---

### ✅ Test 7: Chat Settings
1. Click settings icon in chat modal
2. Toggle any setting
3. Check Network tab:
   - Request: `POST /api/chat/settings/save?user_id=XXX`
   - Body: `{...settings}`
   - NO `profile_id` or `profile_type` parameters

**Expected:** Settings save successfully

---

### ✅ Test 8: Typing Indicators
1. Open a conversation
2. Start typing a message
3. Check Network tab:
   - Request: `POST /api/chat/conversations/XXX/typing`
   - Body: `{user_id: XXX, is_typing: true}`
   - NO `profile_id` or `profile_type`

**Expected:** Typing status broadcasts correctly

---

### ✅ Test 9: Message Reactions
1. Right-click (or long-press) a message
2. Context menu appears
3. Click a reaction emoji
4. Check Network tab:
   - Request includes `user_id` only

**Expected:** Reaction appears on message

---

### ✅ Test 10: Block Contact
1. Open a conversation
2. Click options menu → Block Contact
3. Confirm block
4. Check Network tab:
   - Request: `POST /api/chat/block`
   - Body: `{blocked_user_id: XXX, reason: "..."}`
   - NO `blocked_profile_id` or `blocked_profile_type`

**Expected:** Contact blocked, conversation updates

---

## Console Checks

### ✅ Good Console Output
```javascript
Chat Modal Manager initialized successfully
Chat: Current user loaded: {user_id: 123, name: "John Doe", ...}
Chat: Loaded 15 conversations
Chat: Loading messages for conversation 456
Chat: Message sent successfully
```

### ❌ Bad Console Output (should NOT see)
```javascript
Chat: No currentProfile, attempting to load user
Chat: Could not get role from URL
TypeError: Cannot read property 'profile_id' of null
Failed to load conversations: profile_type is required
```

---

## Network Tab Checks

### ✅ Correct API Calls
```
GET  /api/chat/conversations?user_id=123
GET  /api/chat/contacts?user_id=123
GET  /api/chat/settings?user_id=123
POST /api/chat/conversations
     Body: {type: "direct", participant_user_ids: [456]}
POST /api/chat/conversations/789/messages
     Body: {content: "Hello", message_type: "text"}
```

### ❌ Incorrect API Calls (should NOT see)
```
GET  /api/chat/conversations?profile_id=1&profile_type=student&user_id=123
POST /api/chat/conversations
     Body: {participants: [{profile_id: 1, profile_type: "student", ...}]}
POST /api/chat/conversations/789/messages
     Body: {sender_profile_id: 1, sender_profile_type: "student", ...}
```

---

## Advanced Testing

### Test 11: Voice Messages
1. Click microphone icon
2. Record a voice message
3. Send
4. Check that voice message appears and plays

### Test 12: File Attachments
1. Click attachment icon
2. Select a file
3. Upload and send
4. Check that file appears with download link

### Test 13: Message Search
1. Click search icon
2. Type search query
3. Check that messages filter correctly

### Test 14: Pin Message
1. Right-click a message
2. Select "Pin Message"
3. Check that message appears in pinned section

### Test 15: Delete Message
1. Right-click your own message
2. Select "Delete Message"
3. Confirm deletion
4. Check that message is removed

---

## Edge Cases to Test

### Test 16: No Token (Logged Out)
1. Clear localStorage: `localStorage.clear()`
2. Refresh page
3. Try to open chat
4. **Expected:** Chat doesn't initialize, no errors

### Test 17: Invalid Token
1. Set invalid token: `localStorage.setItem('token', 'invalid')`
2. Try to open chat
3. **Expected:** API calls fail gracefully, user sees error message

### Test 18: Network Offline
1. Open DevTools → Network tab
2. Set throttling to "Offline"
3. Try to send a message
4. **Expected:** Message queued, shows as "pending"

### Test 19: Empty Conversations
1. New user with no conversations
2. Open chat modal
3. **Expected:** "No conversations" message displays

### Test 20: Empty Contacts
1. User with no connections
2. Click Contacts tab
3. **Expected:** "No contacts" message displays

---

## Performance Testing

### Load Time
- Chat modal should initialize in < 1 second
- Conversations should load in < 2 seconds
- Messages should load in < 1 second

### Memory
- Check Chrome Task Manager (Shift+Esc)
- Chat should use < 50MB memory

### Network
- API calls should complete in < 500ms
- No redundant API calls
- No failed requests (except intentional offline tests)

---

## Compatibility Testing

### Browsers
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Edge (latest)
- ✅ Safari (if available)

### Devices
- ✅ Desktop (Windows/Mac/Linux)
- ✅ Mobile (responsive design)
- ✅ Tablet (responsive design)

---

## Debugging Tips

### If chat doesn't initialize
1. Check Console for errors
2. Verify token exists: `localStorage.getItem('token')`
3. Verify backend is running: `curl http://localhost:8000/health`
4. Check modal HTML exists: `document.getElementById('chatModal')`

### If API calls fail
1. Check Network tab for request details
2. Verify Authorization header: `Bearer <token>`
3. Check backend logs for errors
4. Verify user_id is correct (not profile_id)

### If messages don't send
1. Check `selectedChat` is set: `ChatModalManager.state.selectedChat`
2. Check user exists: `ChatModalManager.state.currentUser`
3. Check message input has value
4. Check for JavaScript errors in Console

### If conversations don't load
1. Verify API endpoint: `/api/chat/conversations?user_id=XXX`
2. Check response data structure
3. Verify backend returns `{conversations: [...]}`
4. Check `renderConversations()` executes

---

## Rollback Procedure

### If critical bugs found:

```bash
# 1. Restore backup
cd c:\Users\zenna\Downloads\Astegni\js\common-modals
cp chat-modal-role-based-backup.js chat-modal.js

# 2. Clear browser cache
# Users: Press Ctrl+Shift+R

# 3. Restart servers
cd ../../astegni-backend
python app.py

cd ..
python dev-server.py
```

---

## Success Criteria

### ✅ All Passed
- [ ] Chat initializes without errors
- [ ] Conversations load correctly
- [ ] Messages send and receive
- [ ] New chats can be started
- [ ] All API calls use `user_id` only
- [ ] No `profile_id`/`profile_type` in requests
- [ ] Console has no errors
- [ ] Network tab shows correct endpoints
- [ ] All features work as before
- [ ] Performance is same or better

### If all passed:
**STATUS: ✅ READY FOR PRODUCTION DEPLOYMENT**

---

## Reporting Issues

If you find bugs, report with:
1. **Steps to reproduce**
2. **Expected behavior**
3. **Actual behavior**
4. **Console errors** (copy full stack trace)
5. **Network requests** (copy request/response)
6. **Browser & OS** (e.g., Chrome 120 on Windows 11)

---

## Next Steps After Testing

### If All Tests Pass:
1. ✅ Document any minor issues found
2. ✅ Commit changes to git
3. ✅ Deploy to production
4. ✅ Monitor production logs for 24 hours
5. ✅ Collect user feedback

### Future Cleanup (1-2 weeks after deploy):
1. Remove `state.currentProfile` entirely
2. Remove deprecated functions
3. Update remaining comments
4. Remove `_fullUser` if not needed

---

**Testing Document Version:** 1.0
**Date:** February 2, 2026
**Author:** Claude Code (Anthropic AI)
**Project:** Astegni Educational Platform
