# Call System Migration: Profile-Based → User-Based

## Summary

Successfully migrated the call invitation system from role-based (profile_id + profile_type) to user-based (user_id) to match the chat system migration.

## Problem

The chat system was migrated from role-based to user-based, but the call system was still using the old profile-based approach. This caused calls to fail because:

1. Frontend expected `other_profile_id` and `other_profile_type` from conversations
2. Backend only returned `other_user_id`
3. WebSocket routing tried to use profile-based connection keys that didn't exist

## Changes Made

### Frontend (chat-modal.js)

#### 1. Call Invitation (sendCallInvitation)
**Before:**
```javascript
if (!conversation.other_profile_id || !conversation.other_profile_type) {
    console.error('❌ No recipient found!');
    return;
}

const invitation = {
    to_profile_id: conversation.other_profile_id,
    to_profile_type: conversation.other_profile_type,
    to_user_id: conversation.other_user_id  // Sent but not used
};
```

**After:**
```javascript
if (!conversation.other_user_id) {
    console.error('❌ No recipient found!');
    return;
}

const invitation = {
    to_user_id: conversation.other_user_id  // Now primary
};
```

#### 2. Group Call Invitations (acceptGroupCallInvitation)
**Before:**
```javascript
const participantId = `${data.from_profile_type}_${data.from_profile_id}`;
this.state.callParticipants.push({
    profile_type: data.from_profile_type,
    profile_id: data.from_profile_id,
    ...
});
```

**After:**
```javascript
const participantId = `user_${data.from_user_id}`;
this.state.callParticipants.push({
    user_id: data.from_user_id,
    ...
});
```

#### 3. ICE Candidates (sendIceCandidate + handlers)
**Before:**
```javascript
const message = {
    type: 'ice_candidate',
    from_profile_id: this.state.userId,
    to_profile_id: otherProfileId,
    to_profile_type: otherProfileType,
    candidate: candidate
};
```

**After:**
```javascript
const message = {
    type: 'ice_candidate',
    from_user_id: this.state.currentUser?.user_id,
    to_user_id: otherUserId,
    candidate: candidate
};
```

#### 4. Call Disconnect Messages (endChatCall)
**Before:**
```javascript
const otherProfileId = this.state.isIncomingCall
    ? this.state.pendingCallInvitation?.from_profile_id
    : this.state.selectedConversation?.other_profile_id;
const otherProfileType = this.state.isIncomingCall
    ? this.state.pendingCallInvitation?.from_profile_type
    : this.state.selectedConversation?.other_profile_type;

const message = {
    type: messageType,  // 'call_ended' or 'call_cancelled'
    from_profile_id: this.state.userId,
    to_profile_id: otherProfileId,
    to_profile_type: otherProfileType,
    call_type: callType
};
```

**After:**
```javascript
const otherUserId = this.state.isIncomingCall
    ? this.state.pendingCallInvitation?.from_user_id
    : this.state.selectedConversation?.other_user_id;

const message = {
    type: messageType,  // 'call_ended' or 'call_cancelled'
    from_user_id: this.state.currentUser?.user_id,
    to_user_id: otherUserId,
    call_type: callType
};
```

#### 5. Call Answers (multiple locations)
**Before:**
```javascript
const message = {
    type: 'call_answer',
    from_profile_id: this.state.userId,
    to_profile_id: inviteData.from_profile_id,
    to_profile_type: inviteData.from_profile_type,
    answer: answer
};
```

**After:**
```javascript
const message = {
    type: 'call_answer',
    from_user_id: this.state.currentUser?.user_id,
    to_user_id: inviteData.from_user_id,
    answer: answer
};
```

### Backend (websocket_manager.py)

#### 1. Recipient Connection Key Resolution (get_recipient_connection_key)
**Before:**
```python
def get_recipient_connection_key(data: dict) -> str:
    # Only looked for profile-based keys
    to_profile_id = data.get("to_profile_id")
    to_profile_type = data.get("to_profile_type")
    if to_profile_id and to_profile_type:
        return f"{to_profile_type}_{to_profile_id}"
    return None
```

**After:**
```python
def get_recipient_connection_key(data: dict) -> str:
    # Check for user-based recipient FIRST (preferred)
    to_user_id = data.get("to_user_id")
    if to_user_id:
        return f"user_{to_user_id}"

    # Fallback to profile-based for legacy/whiteboard calls
    to_profile_id = data.get("to_profile_id")
    to_profile_type = data.get("to_profile_type")
    if to_profile_id and to_profile_type:
        return f"{to_profile_type}_{to_profile_id}"

    return None
```

#### 2. Call Invitation Forwarding
**Before:**
```python
await manager.send_personal_message({
    "type": "call_invitation",
    "from_profile_id": data.get("from_profile_id"),
    "from_profile_type": data.get("from_profile_type"),
    "from_name": data.get("from_name"),
    ...
}, recipient_key)
```

**After:**
```python
await manager.send_personal_message({
    "type": "call_invitation",
    "from_user_id": data.get("from_user_id"),  # User-based
    "from_name": data.get("from_name"),
    ...
}, recipient_key)
```

#### 3. Call Answer Forwarding
**Before:**
```python
await manager.send_personal_message({
    "type": "call_answer",
    "from_profile_id": data.get("from_profile_id"),
    "answer": data.get("answer")
}, recipient_key)
```

**After:**
```python
await manager.send_personal_message({
    "type": "call_answer",
    "from_user_id": data.get("from_user_id"),  # User-based
    "answer": data.get("answer")
}, recipient_key)
```

#### 4. ICE Candidate Forwarding
**Before:**
```python
await manager.send_personal_message({
    "type": "ice_candidate",
    "candidate": data.get("candidate"),
    "from_student_profile_id": data.get("from_student_profile_id"),
    "from_tutor_profile_id": data.get("from_tutor_profile_id"),
}, recipient_key)
```

**After:**
```python
await manager.send_personal_message({
    "type": "ice_candidate",
    "candidate": data.get("candidate"),
    "from_user_id": data.get("from_user_id"),  # New: User-based
    "from_student_profile_id": data.get("from_student_profile_id"),  # Legacy
    "from_tutor_profile_id": data.get("from_tutor_profile_id"),  # Legacy
}, recipient_key)
```

### Backend (call_log_endpoints.py)

#### Call Log Schema
**Before:**
```python
class CallLogCreate(BaseModel):
    conversation_id: int
    caller_profile_id: int  # REQUIRED
    caller_profile_type: str  # REQUIRED
    call_type: str
    status: str
    ...
```

**After:**
```python
class CallLogCreate(BaseModel):
    conversation_id: int
    call_type: str
    status: str
    caller_user_id: Optional[int] = None  # NEW: Preferred
    caller_profile_id: Optional[int] = None  # Legacy: Optional
    caller_profile_type: Optional[str] = None  # Legacy: Optional
    ...
```

#### Call Log Creation
**Before:**
```python
call_log = CallLog(
    conversation_id=call_data.conversation_id,
    caller_profile_id=call_data.caller_profile_id,  # Required from request
    caller_profile_type=call_data.caller_profile_type,  # Required from request
    caller_user_id=current_user.id,  # Hardcoded to current user
    ...
)
```

**After:**
```python
call_log = CallLog(
    conversation_id=call_data.conversation_id,
    caller_user_id=call_data.caller_user_id or current_user.id,  # Prefer provided, fallback to current
    caller_profile_id=call_data.caller_profile_id,  # Optional (legacy)
    caller_profile_type=call_data.caller_profile_type,  # Optional (legacy)
    ...
)
```

## Key Benefits

1. **Consistency**: Call system now matches chat system architecture
2. **Simplicity**: Single `user_id` instead of `profile_id` + `profile_type` pairs
3. **Backward Compatibility**: Legacy profile-based fields still supported for whiteboard video calls
4. **Flexibility**: WebSocket routing works with both user-based and profile-based connection keys

## What Still Uses Profile-Based Approach

1. **Whiteboard Video Calls**: Still use `from_student_profile_id` and `from_tutor_profile_id`
2. **WebSocket Profile Endpoints**: `/ws/{profile_id}/{role}` still exists alongside `/ws/{user_id}`
3. **Legacy Call Logs**: Old call logs in database still have profile_id/profile_type fields

These will continue to work due to backward compatibility support.

## Testing Steps

1. **Restart Backend**:
   ```bash
   cd astegni-backend
   python app.py
   ```

2. **Test Voice Call**:
   - Open chat modal
   - Start a voice call
   - Verify call invitation is received
   - Answer the call
   - Verify audio connection

3. **Test Video Call**:
   - Same as voice call but with video enabled
   - Verify video streams work

4. **Check Console**:
   - Should see: `📤 Recipient key will be: user_{user_id}`
   - Should NOT see errors about missing profile fields

5. **Verify Database**:
   - Check `call_logs` table
   - Verify `caller_user_id` is populated
   - `caller_profile_id` and `caller_profile_type` should be NULL

## Files Modified

### Frontend
- `js/common-modals/chat-modal.js` (call system functions updated)

### Backend
- `astegni-backend/websocket_manager.py` (WebSocket routing updated)
- `astegni-backend/call_log_endpoints.py` (schema made flexible)

## Migration Complete ✅

The call system is now fully aligned with the user-based chat architecture while maintaining backward compatibility with profile-based systems (whiteboard).
