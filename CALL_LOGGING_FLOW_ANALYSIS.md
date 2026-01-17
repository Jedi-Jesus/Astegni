# Deep Analysis: Call Logging Flow When You Make a Call

## Question: Is the call saved in DB when I make a call?

**Answer: YES ✅** - Let me show you exactly how.

## Complete Code Flow Analysis

### When You Click "Call" Button

```
USER ACTION: Clicks voice/video call button
     ↓
┌────────────────────────────────────────────────────────────────┐
│ Step 1: startChatVoiceCall() or startChatVideoCall()          │
│ File: js/common-modals/chat-modal.js:14199 or 14247           │
├────────────────────────────────────────────────────────────────┤
│ - Gets microphone/camera permission                           │
│ - Shows call modal                                            │
│ - Sets up WebRTC peer connection                              │
│ - Creates offer                                               │
│ - Calls: this.sendCallInvitation('voice', offer)              │
└────────────────────────────────────────────────────────────────┘
     ↓
┌────────────────────────────────────────────────────────────────┐
│ Step 2: sendCallInvitation(callType, offer)                   │
│ File: js/common-modals/chat-modal.js:14361                    │
├────────────────────────────────────────────────────────────────┤
│ - Sends WebSocket invitation to receiver                      │
│ - **LINE 14433: this.createCallLog(callType)** ← DB SAVE HERE │
│ - Updates UI to show "Calling..."                             │
└────────────────────────────────────────────────────────────────┘
     ↓
┌────────────────────────────────────────────────────────────────┐
│ Step 3: createCallLog(callType, isIncoming=false)             │
│ File: js/common-modals/chat-modal.js:14107                    │
├────────────────────────────────────────────────────────────────┤
│ Code executed:                                                 │
│                                                                │
│ const token = localStorage.getItem('token');                  │
│ const profileParams = this.getProfileParams();                │
│                                                                │
│ const response = await fetch(                                 │
│   `${API_BASE_URL}/api/call-logs?${profileParams}`,           │
│   {                                                            │
│     method: 'POST',                                            │
│     headers: {                                                 │
│       'Authorization': `Bearer ${token}`,                      │
│       'Content-Type': 'application/json'                       │
│     },                                                         │
│     body: JSON.stringify({                                     │
│       conversation_id: this.state.selectedConversation.id,     │
│       caller_profile_id: this.state.currentProfile.profile_id,│
│       caller_profile_type: this.state.currentProfile.type,    │
│       call_type: callType,  // 'voice' or 'video'             │
│       status: 'initiated',                                     │
│       started_at: new Date().toISOString()                     │
│     })                                                         │
│   }                                                            │
│ );                                                             │
│                                                                │
│ const data = await response.json();                           │
│ this.state.currentCallLogId = data.call_log_id;               │
│ console.log('📝 Call log created (outgoing):', data.call_log_id);│
└────────────────────────────────────────────────────────────────┘
     ↓
┌────────────────────────────────────────────────────────────────┐
│ Step 4: Backend receives request                              │
│ File: astegni-backend/call_log_endpoints.py:60                │
├────────────────────────────────────────────────────────────────┤
│ @router.post("/api/call-logs")                                │
│ async def create_call_log(...):                               │
│                                                                │
│   # Verify user is participant                                │
│   participant = db.query(ConversationParticipant).filter(...) │
│                                                                │
│   # Create database record                                    │
│   call_log = CallLog(                                         │
│     conversation_id=call_data.conversation_id,                │
│     caller_profile_id=call_data.caller_profile_id,            │
│     caller_profile_type=call_data.caller_profile_type,        │
│     caller_user_id=current_user['id'],                        │
│     call_type=call_data.call_type,                            │
│     status='initiated',                                       │
│     started_at=call_data.started_at,                          │
│     answered_at=None,                                         │
│     ended_at=None,                                            │
│     duration_seconds=None                                     │
│   )                                                            │
│                                                                │
│   db.add(call_log)                                            │
│   db.commit()  ← **SAVED TO DATABASE HERE**                   │
│   db.refresh(call_log)                                        │
│                                                                │
│   return {                                                     │
│     "success": True,                                           │
│     "call_log_id": call_log.id,  ← Returns ID to frontend     │
│     "message": "Call log created"                             │
│   }                                                            │
└────────────────────────────────────────────────────────────────┘
     ↓
┌────────────────────────────────────────────────────────────────┐
│ Step 5: PostgreSQL Database                                   │
│ Table: call_logs                                               │
├────────────────────────────────────────────────────────────────┤
│ INSERT INTO call_logs (                                        │
│   conversation_id,                                             │
│   caller_profile_id,                                           │
│   caller_profile_type,                                         │
│   caller_user_id,                                             │
│   call_type,                                                   │
│   status,                                                      │
│   started_at,                                                  │
│   answered_at,                                                 │
│   ended_at,                                                    │
│   duration_seconds,                                           │
│   created_at                                                   │
│ ) VALUES (                                                     │
│   123,              -- conversation ID                         │
│   1,                -- your profile ID                         │
│   'student',        -- your profile type                       │
│   1,                -- your user ID                            │
│   'voice',          -- call type                               │
│   'initiated',      -- status                                  │
│   '2026-01-16 14:30:00',  -- timestamp                        │
│   NULL,             -- not answered yet                        │
│   NULL,             -- not ended yet                           │
│   NULL,             -- no duration yet                         │
│   '2026-01-16 14:30:00'   -- created timestamp                │
│ );                                                             │
│                                                                │
│ RETURNS: call_log_id = 25                                     │
└────────────────────────────────────────────────────────────────┘
     ↓
┌────────────────────────────────────────────────────────────────┐
│ Step 6: Frontend receives response                            │
├────────────────────────────────────────────────────────────────┤
│ this.state.currentCallLogId = 25  ← Stored for later updates  │
│ console.log('📝 Call log created (outgoing): 25')              │
└────────────────────────────────────────────────────────────────┘
```

## Verification Points

### 1. Check Console Logs
When you make a call, you should see:
```
📞 Starting voice call...
📤 Sending call invitation: {...}
✅ Call invitation sent via WebSocket
📝 Call log created (outgoing): 25
```

### 2. Check Network Tab (DevTools)
```
Request URL: http://localhost:8000/api/call-logs?profile_id=1&profile_type=student
Request Method: POST
Status Code: 200 OK

Request Payload:
{
  "conversation_id": 123,
  "caller_profile_id": 1,
  "caller_profile_type": "student",
  "call_type": "voice",
  "status": "initiated",
  "started_at": "2026-01-16T14:30:00.000Z"
}

Response:
{
  "success": true,
  "call_log_id": 25,
  "message": "Call log created"
}
```

### 3. Check Database Directly
```bash
cd astegni-backend
python -c "
from models import SessionLocal, CallLog
db = SessionLocal()
latest = db.query(CallLog).order_by(CallLog.id.desc()).first()
print(f'Latest call: ID={latest.id}, Type={latest.call_type}, Status={latest.status}')
db.close()
"
```

Expected output:
```
Latest call: ID=25, Type=voice, Status=initiated
```

### 4. Run Test Script
```bash
cd astegni-backend
python test_call_logging.py
```

Should show your call in the "Recent 10 calls" section.

## What Happens Next (Status Updates)

### When Receiver Answers:
```
┌─────────────────────────────────────────────────┐
│ ontrack event fires (WebRTC)                    │
│ File: js/common-modals/chat-modal.js:14299      │
├─────────────────────────────────────────────────┤
│ this.startCallTimer();                          │
│ this.updateCallLog('answered'); ← DB UPDATE     │
└─────────────────────────────────────────────────┘
     ↓
Database: status changes from 'initiated' → 'answered'
          answered_at = current timestamp
```

### When Call Ends:
```
┌─────────────────────────────────────────────────┐
│ endChatCall()                                   │
│ File: js/common-modals/chat-modal.js:14711      │
├─────────────────────────────────────────────────┤
│ const duration = calculate_duration();          │
│ const finalStatus = wasAnswered ? 'ended' :     │
│                     'cancelled';                 │
│ this.updateCallLog(finalStatus, duration);      │
│                     ↑ DB UPDATE                  │
└─────────────────────────────────────────────────┘
     ↓
Database: status changes to 'ended' or 'cancelled'
          ended_at = current timestamp
          duration_seconds = calculated duration
```

### When Receiver Declines:
```
┌─────────────────────────────────────────────────┐
│ Receives 'call_declined' WebSocket message      │
│ File: js/common-modals/chat-modal.js:14007      │
├─────────────────────────────────────────────────┤
│ this.updateCallLog('declined', 0); ← DB UPDATE  │
└─────────────────────────────────────────────────┘
     ↓
Database: status changes from 'initiated' → 'declined'
          ended_at = current timestamp
          duration_seconds = 0
```

## Summary: Database Record Lifecycle

```
┌──────────────────────────────────────────────────────────┐
│ Initial State (when you click call button)              │
├──────────────────────────────────────────────────────────┤
│ id: 25                                                   │
│ conversation_id: 123                                     │
│ caller_profile_id: 1 (you)                              │
│ caller_profile_type: 'student'                          │
│ call_type: 'voice'                                      │
│ status: 'initiated' ← CREATED HERE                      │
│ started_at: '2026-01-16 14:30:00'                       │
│ answered_at: NULL                                        │
│ ended_at: NULL                                           │
│ duration_seconds: NULL                                   │
└──────────────────────────────────────────────────────────┘
     ↓ (if receiver answers)
┌──────────────────────────────────────────────────────────┐
│ After Answer                                             │
├──────────────────────────────────────────────────────────┤
│ status: 'initiated' → 'answered' ← UPDATED               │
│ answered_at: NULL → '2026-01-16 14:30:05' ← UPDATED     │
└──────────────────────────────────────────────────────────┘
     ↓ (when call ends)
┌──────────────────────────────────────────────────────────┐
│ Final State                                              │
├──────────────────────────────────────────────────────────┤
│ status: 'answered' → 'ended' ← UPDATED                   │
│ ended_at: NULL → '2026-01-16 14:30:50' ← UPDATED        │
│ duration_seconds: NULL → 45 ← UPDATED                    │
└──────────────────────────────────────────────────────────┘
```

## Proof Points

### ✅ **YES, calls ARE saved to database**

1. **Creation happens at:** `sendCallInvitation()` line 14433
2. **API endpoint:** `POST /api/call-logs`
3. **Database table:** `call_logs`
4. **Initial status:** `initiated`
5. **Timing:** Immediately after clicking call button and before receiver's phone rings

### ✅ **Updates happen automatically:**

1. When receiver answers → status: `answered`
2. When call ends → status: `ended` (with duration)
3. When you cancel → status: `cancelled`
4. When receiver declines → status: `declined`

### ✅ **Both sides are logged:**

- **Your side:** Created when you click call
- **Receiver's side:** Created when they receive the call invitation

---

**Conclusion:** Every call you make is **immediately** saved to the database with status `initiated`, then updated as the call progresses. You can verify this by running the test script or checking the database directly.
