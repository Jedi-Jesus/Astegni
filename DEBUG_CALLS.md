# Debug Guide: Voice & Video Calls

## 🔍 Comprehensive Debugging Added

I've added extensive logging to help diagnose call issues. Follow this guide to test and debug.

## 🧪 Test Setup

### Step 1: Start Servers

**Terminal 1 - Backend (with logs):**
```bash
cd astegni-backend
python app.py
```

**Terminal 2 - Frontend:**
```bash
python dev-server.py
```

### Step 2: Open Two Browser Windows

**Window 1 - User A (jediael.s.abebe@gmail.com):**
1. Go to http://localhost:8081
2. Login with: `jediael.s.abebe@gmail.com` / `@JesusJediael1234`
3. Open browser console (F12)
4. Click chat icon
5. Select or start conversation with kushstudios16@gmail.com

**Window 2 - User B (kushstudios16@gmail.com):**
1. Go to http://localhost:8081 (use incognito/private mode)
2. Login with: `kushstudios16@gmail.com` / `@KushStudios16`
3. Open browser console (F12)
4. Have chat modal ready (don't need to open conversation yet)

## 📋 Debugging Checklist

### Phase 1: WebSocket Connection

**User A Console - Look for:**
```
🔍 ========== WEBSOCKET CONNECTION DEBUG ==========
📡 Connecting to WebSocket for calls
📡 Profile ID: [number]
📡 Profile Type: [student/tutor/parent]
📡 WebSocket URL: ws://localhost:8000/ws/[id]/[type]
📡 Connection key will be: [type]_[id]
🔍 ================================================

🔍 ========== WEBSOCKET CONNECTED ==========
✅ Chat WebSocket connected as [type] profile [id]
✅ Connection key: [type]_[id]
🔍 ==========================================
```

**User B Console - Look for the same**

**If NOT seeing connection logs:**
- ❌ Chat modal not opening WebSocket
- ❌ Profile not loaded
- ❌ Backend server not running

### Phase 2: Starting a Call

**User A - Click voice/video call button**

**User A Console - Look for:**
```
🔍 ========== CALL INVITATION DEBUG ==========
📤 sendCallInvitation called with type: voice (or video)
📡 WebSocket status: Ready state: 1
🔍 Current Profile: {profile_id: X, profile_type: "..."}
🔍 Current User: {email: "...", first_name: "..."}
🔍 Selected Chat: {id: X, name: "...", ...}
🔍 Selected Conversation: {id: X, other_profile_id: Y, other_profile_type: "...", ...}
🔍 Conversation object: {...}
📤 Sending call invitation: {...}
📤 Recipient key will be: [type]_[id]
✅ Call invitation sent via WebSocket
🔍 ========================================
```

**Key things to check:**
1. ✅ `WebSocket status: Ready state: 1` (1 = OPEN)
2. ✅ `Selected Conversation` exists and has data
3. ✅ `other_profile_id` and `other_profile_type` are present
4. ✅ `Recipient key` format is correct: `[type]_[id]`

### Phase 3: Backend Processing

**Backend Terminal - Look for:**
```
📨 WebSocket message received from [sender_type]_[sender_id]
🔔 DEBUG: handle_video_call_message called
🔔 DEBUG: message_type=call_invitation, sender_key=[type]_[id], recipient_key=[type]_[id]
📞 Chat call invitation: voice from [sender] to [recipient]
📞 Call invitation forwarded from [sender] to [recipient]
```

**If recipient is offline:**
```
📞 Recipient [type]_[id] is offline - sent decline to caller
```

### Phase 4: Receiving the Call

**User B Console - Look for:**
```
🔍 ========== WEBSOCKET MESSAGE RECEIVED ==========
📨 Message type: call_invitation
📨 Full message: {
  "type": "call_invitation",
  "call_type": "voice",
  "from_profile_id": X,
  "from_profile_type": "...",
  "from_name": "...",
  "offer": {...}
}
✅ Routing to handleIncomingCallInvitation
📞 Incoming call invitation: {...}
🔍 ================================================
```

**Then the incoming call modal should appear on User B's screen.**

## 🐛 Common Issues & Solutions

### Issue 1: "Could not find call recipient"

**Console shows:**
```
❌ No recipient found in conversation!
❌ other_profile_id: undefined
❌ other_profile_type: undefined
```

**Cause:** `selectedConversation` doesn't have `other_profile_id` or `other_profile_type`

**Solutions:**
1. Check if conversation API returns these fields
2. Check conversation loading in `loadConversations()` function
3. Verify database has correct conversation structure

**Debug command (in browser console):**
```javascript
console.log('Selected Conversation:', ChatModalManager.state.selectedConversation);
```

### Issue 2: WebSocket not connecting

**Console shows:**
```
📡 Cannot connect WebSocket: No profile loaded yet
🔍 Current Profile: null
```

**Cause:** Profile data not loaded when modal opens

**Solutions:**
1. Ensure user is fully logged in
2. Check if `getCurrentProfile()` is called
3. Verify localStorage has profile data

**Debug command:**
```javascript
console.log('Profile:', ChatModalManager.state.currentProfile);
console.log('User:', ChatModalManager.state.currentUser);
```

### Issue 3: Call invitation sent but not received

**User A sees:** ✅ Call invitation sent
**User B sees:** Nothing

**Check:**
1. **Backend logs** - Is message being forwarded?
2. **User B WebSocket** - Is connection active?
3. **Profile ID matching** - Is recipient key correct?

**Backend debug:**
```python
# Check active connections in backend
print(f"Active connections: {list(manager.active_connections.keys())}")
```

### Issue 4: "WebSocket not open"

**Console shows:**
```
❌ WebSocket not open! Ready state: 0 (CONNECTING)
```

**Cause:** Trying to send before connection established

**Solution:** Wait for WebSocket to connect before calling

### Issue 5: User appears offline when they're online

**Possible causes:**
1. WebSocket not connected on recipient side
2. Recipient profile ID mismatch
3. Backend can't find recipient in active connections

**Backend check:**
```python
# In handle_video_call_message
print(f"Checking if {recipient_key} is online")
print(f"Active connections: {list(manager.active_connections.keys())}")
is_online = manager.is_user_online(recipient_key)
print(f"Is online: {is_online}")
```

## 📝 Step-by-Step Debug Process

### 1. Verify WebSocket Connections

**User A:**
```
F12 → Console
Look for: "✅ Chat WebSocket connected as [type] profile [id]"
Note the connection key
```

**User B:**
```
F12 → Console
Look for: "✅ Chat WebSocket connected as [type] profile [id]"
Note the connection key
```

**Backend:**
```
Terminal running app.py
Look for: "🔌 WebSocket connected: [type] profile [id]"
Should see TWO connections (one for each user)
```

### 2. Check Conversation Data

**User A (before calling):**
```javascript
// In browser console
console.log('Conversation:', ChatModalManager.state.selectedConversation);
// Should show: {id, other_profile_id, other_profile_type, other_user_id}
```

### 3. Initiate Call

**User A:** Click voice or video call button

**Watch User A console for complete call flow**

### 4. Check Backend Routing

**Backend terminal:**
```
Should see:
- Message received
- Message type identified
- Recipient key determined
- Message forwarded (or offline notification)
```

### 5. Verify User B Receives

**User B console:**
```
Should see:
- WEBSOCKET MESSAGE RECEIVED
- Message type: call_invitation
- Routing to handleIncomingCallInvitation
```

### 6. Test Accept/Decline

**User B:** Click Accept or Decline

**Check both consoles and backend for corresponding messages**

## 🔧 Quick Fixes

### Reset WebSocket

**In browser console:**
```javascript
ChatModalManager.disconnectWebSocket();
ChatModalManager.connectWebSocket();
```

### Force Reload Conversation

```javascript
ChatModalManager.loadConversations();
```

### Check Call State

```javascript
console.log('Call State:', {
    isCallActive: ChatModalManager.state.isCallActive,
    isVideoCall: ChatModalManager.state.isVideoCall,
    isIncomingCall: ChatModalManager.state.isIncomingCall,
    peerConnection: ChatModalManager.state.peerConnection
});
```

## 📊 Expected Full Flow Logs

**Complete successful call from start to finish:**

```
User A:
  🔍 WEBSOCKET CONNECTION → Connected
  🔍 CALL INVITATION DEBUG → Sending...
  ✅ Call invitation sent

Backend:
  📨 Received call_invitation from student_1
  📞 Forwarding to tutor_2
  ✅ Message sent to tutor_2

User B:
  🔍 WEBSOCKET MESSAGE RECEIVED
  📨 Message type: call_invitation
  ✅ Showing incoming call modal

User B clicks Accept:
  📤 Sending call_answer

Backend:
  📨 Received call_answer from tutor_2
  📞 Forwarding to student_1

User A:
  🔍 WEBSOCKET MESSAGE RECEIVED
  📨 Message type: call_answer
  ✅ Setting remote description
  🧊 ICE candidates exchanging...
  📡 Connection state: connected
```

## 🎯 Next Steps After Debugging

1. Copy all console logs from both browsers
2. Copy backend terminal logs
3. Identify where the flow stops
4. Check the corresponding section in this guide
5. Apply the suggested fix

If issue persists, look for:
- ❌ Error messages (red text in console)
- ⚠️ Warning messages
- Missing log sections (indicates code not executing)

---

**With these comprehensive logs, you should be able to identify exactly where the call flow is breaking!**
