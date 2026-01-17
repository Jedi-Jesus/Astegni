# Call API Endpoint Fix

## Issues Found

### 1. ✅ FIXED: `is_verified` AttributeError
**File**: `astegni-backend/app.py modules/routes.py:1600`
**Problem**: Trying to access `tutor.is_verified` but `is_verified` is in the `users` table, not `tutor_profiles`
**Fix Applied**: Changed to `tutor.user.is_verified if tutor.user else False`

### 2. 422 Error on `/api/chat/calls` Endpoint

**Problem**: Frontend is calling the endpoint incorrectly

The backend endpoint expects **query parameters**, not a JSON body:

```python
@router.post("/calls")
async def log_call(
    conversation_id: int,
    call_type: str,  # 'voice' or 'video'
    profile_id: int,
    profile_type: str,
    user_id: int
):
```

## How to Fix the Frontend Call

### Current (Incorrect) Frontend Code
```javascript
// ❌ Wrong - sending as JSON body
const response = await fetch(`${API_BASE_URL}/api/chat/calls?profile_id=${profileId}&profile_type=${profileType}&user_id=${userId}`, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        conversation_id: conversationId,
        call_type: callType
    })
});
```

### Correct Frontend Code
```javascript
// ✅ Correct - all parameters as query params
const response = await fetch(
    `${API_BASE_URL}/api/chat/calls?` +
    `conversation_id=${conversationId}&` +
    `call_type=${callType}&` +
    `profile_id=${profileId}&` +
    `profile_type=${profileType}&` +
    `user_id=${userId}`,
    {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    }
);
```

## Complete Call Logging Flow

### 1. Start a Call (Log Call Initiated)
```javascript
// When user clicks voice/video call button
const response = await fetch(
    `${API_BASE_URL}/api/chat/calls?` +
    `conversation_id=${conversationId}&` +
    `call_type=${isVideo ? 'video' : 'voice'}&` +
    `profile_id=${currentProfile.profile_id}&` +
    `profile_type=${currentProfile.profile_type}&` +
    `user_id=${currentUser.id}`,
    {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    }
);

const { call_id } = await response.json();
// Store call_id in state for later updates
this.state.currentCallId = call_id;
```

### 2. Update Call When Answered
```javascript
// When remote peer accepts the call
await fetch(
    `${API_BASE_URL}/api/chat/calls/${callId}?` +
    `status=answered`,
    {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    }
);
```

### 3. End Call (Update with Duration)
```javascript
// When call ends
const durationSeconds = Math.floor((Date.now() - callStartTime) / 1000);

await fetch(
    `${API_BASE_URL}/api/chat/calls/${callId}?` +
    `status=ended&` +
    `duration_seconds=${durationSeconds}`,
    {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    }
);
```

### 4. Get Call History
```javascript
// Get recent calls
const response = await fetch(
    `${API_BASE_URL}/api/chat/calls?` +
    `profile_id=${profileId}&` +
    `profile_type=${profileType}&` +
    `limit=20`,
    {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    }
);

const calls = await response.json();
```

## Call Statuses

- `'initiated'` - Call started (default when logged)
- `'answered'` - Call was answered
- `'ended'` - Call completed normally
- `'missed'` - Call not answered
- `'declined'` - Call rejected
- `'failed'` - Call failed to connect

## Integration Points

Add these to the WebRTC implementation in `chat-modal.js`:

### In `startChatVoiceCall()` / `startChatVideoCall()`:
```javascript
// After getting media stream, before sending invitation
try {
    const response = await fetch(
        `${this.API_BASE_URL}/api/chat/calls?` +
        `conversation_id=${this.state.selectedConversation.id}&` +
        `call_type=${this.state.isVideoCall ? 'video' : 'voice'}&` +
        `profile_id=${this.state.currentProfile.profile_id}&` +
        `profile_type=${this.state.currentProfile.profile_type}&` +
        `user_id=${this.state.currentUser.id}`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }
    );

    const { call_id } = await response.json();
    this.state.currentCallId = call_id;
    console.log('📞 Call logged with ID:', call_id);
} catch (error) {
    console.error('Failed to log call:', error);
}
```

### In `handleCallAnswer()` (when peer accepts):
```javascript
// After remote description is set
if (this.state.currentCallId) {
    try {
        await fetch(
            `${this.API_BASE_URL}/api/chat/calls/${this.state.currentCallId}?status=answered`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            }
        );
    } catch (error) {
        console.error('Failed to update call status:', error);
    }
}
```

### In `endChatCall()`:
```javascript
// Before cleanup
if (this.state.currentCallId && this.state.callStartTime) {
    try {
        const durationSeconds = Math.floor((Date.now() - this.state.callStartTime) / 1000);
        await fetch(
            `${this.API_BASE_URL}/api/chat/calls/${this.state.currentCallId}?` +
            `status=ended&duration_seconds=${durationSeconds}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            }
        );
    } catch (error) {
        console.error('Failed to end call log:', error);
    }
}

// Reset call ID
this.state.currentCallId = null;
```

### In `declineIncomingCall()`:
```javascript
// If there's a call ID from the invitation
if (this.state.pendingCallInvitation?.call_id) {
    try {
        await fetch(
            `${this.API_BASE_URL}/api/chat/calls/${this.state.pendingCallInvitation.call_id}?status=declined`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            }
        );
    } catch (error) {
        console.error('Failed to update declined call:', error);
    }
}
```

## Summary

1. ✅ **Fixed**: `is_verified` error in routes.py
2. ⚠️ **Frontend Fix Needed**: Change `/api/chat/calls` POST to use query parameters instead of JSON body
3. 📋 **Integration Guide**: Add call logging to the WebRTC functions

The backend endpoints are working correctly - just need to call them with the right format!
