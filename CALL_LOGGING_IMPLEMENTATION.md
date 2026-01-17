# Call Logging Implementation Plan

## Overview
Add complete database call logging to track all call events: initiation, answer, cancellation, decline, and end with durations.

## Backend Status
✅ CallLog model exists with statuses: 'initiated', 'ringing', 'answered', 'missed', 'declined', 'cancelled', 'ended', 'failed'
✅ call_log_endpoints.py has 3 endpoints:
   - POST /api/call-logs - Create new call log
   - PUT /api/call-logs/{id} - Update call log (status, duration, timestamps)
   - GET /api/call-logs/{conversation_id} - Get all call logs for conversation
✅ Endpoints registered in app.py (lines 379-380)

## Frontend Integration Points

### 1. Add Helper Functions (in ChatModalManager)
```javascript
// Create call log when call is initiated
async createCallLog(callType) {
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const profileParams = this.getProfileParams();

    const response = await fetch(`${this.API_BASE_URL}/api/call-logs?${profileParams}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            conversation_id: this.state.selectedConversation.id,
            caller_profile_id: this.state.currentProfile.profile_id,
            caller_profile_type: this.state.currentProfile.profile_type,
            call_type: callType,
            status: 'initiated',
            started_at: new Date().toISOString()
        })
    });

    const data = await response.json();
    this.state.currentCallLogId = data.call_log_id;  // Store for later updates
    console.log('📝 Call log created:', data.call_log_id);
}

// Update call log status
async updateCallLog(status, duration = null) {
    if (!this.state.currentCallLogId) return;

    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    const profileParams = this.getProfileParams();

    const updateData = { status };
    if (status === 'answered') {
        updateData.answered_at = new Date().toISOString();
    }
    if (status === 'ended' || status === 'cancelled') {
        updateData.ended_at = new Date().toISOString();
        if (duration) {
            updateData.duration_seconds = duration;
        }
    }

    await fetch(`${this.API_BASE_URL}/api/call-logs/${this.state.currentCallLogId}?${profileParams}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
    });

    console.log(`📝 Call log updated: ${status}`);
}
```

### 2. Integration Points

**A. Call Initiation (line 14136 & 14194)**
After `this.sendCallInvitation(callType, offer);`:
```javascript
// Log call initiation to database
await this.createCallLog(callType);
```

**B. Call Answered (line 14238 - in ontrack handler)**
After `this.startCallTimer();`:
```javascript
// Update call log to answered status
await this.updateCallLog('answered');
```

**C. Call Cancelled/Ended (line 14655 in endChatCall)**
After determining `messageType`:
```javascript
// Update call log with final status and duration
const finalStatus = wasAnswered ? 'ended' : 'cancelled';
await this.updateCallLog(finalStatus, duration);
```

**D. Call Declined (in declineIncomingCall - line 14440)**
After sending decline message:
```javascript
// Receiver declining doesn't create log (only caller creates logs)
// But if you want both sides to log, add:
// await this.createCallLog(callType);
// await this.updateCallLog('declined');
```

**E. Cleanup (in cleanupCall)**
Add:
```javascript
this.state.currentCallLogId = null;  // Clear call log ID
```

### 3. State Variables to Add
In `this.state` initialization, add:
```javascript
currentCallLogId: null,  // Store call log ID for updates
```

## Testing Steps
1. Start backend: `cd astegni-backend && python app.py`
2. Make a voice call and cancel it → Check DB for 'cancelled' status
3. Make a video call and answer it → Check DB for 'answered' status
4. End the call after a few seconds → Check DB for 'ended' status with duration
5. Make a call and let receiver decline → Check DB for appropriate status

## Database Check
```python
from models import SessionLocal, CallLog
db = SessionLocal()
calls = db.query(CallLog).order_by(CallLog.started_at.desc()).limit(10).all()
for call in calls:
    print(f"{call.id}: {call.call_type} - {call.status} - {call.duration_seconds}s")
```

## Files to Modify
1. `js/common-modals/chat-modal.js` - Add helper functions and integrate at 6 points
2. Test with real calls

## Expected Outcome
All calls properly logged in database with:
- ✅ Correct status transitions (initiated → answered/cancelled → ended)
- ✅ Accurate timestamps (started_at, answered_at, ended_at)
- ✅ Call duration in seconds
- ✅ Call type (voice/video)
