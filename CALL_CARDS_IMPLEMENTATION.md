# Call Cards & Independent Call Modal Implementation

## Overview
Implement call history cards in chat area and make call modal independent from chat modal.

## Features Implemented

### A. Call History Cards in Chat Area ✅

**Frontend:**
1. Added `renderCallCard()` function in [js/common-modals/chat-modal.js](js/common-modals/chat-modal.js:4449-4522)
   - Beautiful card design with call type (voice/video)
   - Status indicators (answered, missed, declined)
   - Duration display
   - Call back button
   - Direction arrows (incoming/outgoing)

2. Modified `displayMessage()` to handle `message_type: 'call'` (line 3972-3976)

3. Call card features:
   - Green: Answered calls with duration
   - Red: Missed/declined calls
   - Icons: Phone for voice, video for video calls
   - Arrows: Up for outgoing, down for incoming
   - Click "Call Back" to initiate same type of call

**Backend:**
1. Created [astegni-backend/call_log_endpoints.py](astegni-backend/call_log_endpoints.py)
   - `POST /api/call-logs` - Create call log
   - `PUT /api/call-logs/{id}` - Update call log (status, duration)
   - `GET /api/call-logs/{conversation_id}` - Get call history

2. Added models in [astegni-backend/app.py modules/models.py](astegni-backend/app.py modules/models.py:2774-2863)
   - `Conversation` model
   - `ConversationParticipant` model
   - `ChatMessage` model
   - `CallLog` model

3. Registered router in [astegni-backend/app.py](astegni-backend/app.py:378-380)

### B. Independent Call Modal (TODO)

**Current State:** Call modal is embedded in chat-modal.html

**Plan:**
1. Extract call modal HTML to `modals/common-modals/call-modal.html`
2. Create `js/common-modals/call-modal.js` for call management
3. Create `css/common-modals/call-modal.css` for styling
4. Add global WebSocket listener in `js/root/app.js` for incoming calls
5. Load call modal on page load via modal-loader.js

**Benefits:**
- Receive calls even when chat is closed
- Cleaner separation of concerns
- Can call anyone from anywhere (not just chat)
- Global incoming call notifications

## How to Use

### View Call History
1. Open chat with any contact
2. Calls will appear as cards in the chat area
3. Click "Call Back" to call them back

### Call Cards Show:
- **Green cards**: Completed calls with duration
- **Red cards**: Missed or declined calls
- **Phone icon**: Voice calls
- **Video icon**: Video calls
- **Up arrow**: Calls you made
- **Down arrow**: Calls you received

## Database Schema

### call_logs Table
```sql
id                   SERIAL PRIMARY KEY
conversation_id      INTEGER (FK to conversations)
caller_profile_id    INTEGER
caller_profile_type  VARCHAR(50) -- 'tutor', 'student', 'parent', 'advertiser'
caller_user_id       INTEGER (FK to users)
call_type            VARCHAR(20) -- 'voice', 'video'
status               VARCHAR(20) -- 'initiated', 'ringing', 'answered', 'missed', 'declined', 'ended'
started_at           TIMESTAMP
answered_at          TIMESTAMP
ended_at             TIMESTAMP
duration_seconds     INTEGER
participants         JSONB
created_at           TIMESTAMP
```

## Next Steps

### Phase 2: Independent Call Modal
1. Extract call modal to separate file
2. Add global WebSocket for calls
3. Test receiving calls when chat is closed
4. Add call notifications to system tray

### Phase 3: Call Logging Integration
1. Automatically create call log on call start
2. Update call log on answer
3. Update call log on end with duration
4. Insert call card message in chat
5. Fetch and display call history on load

## Testing

### Test Call Cards
1. Start backend: `cd astegni-backend && python app.py`
2. Start frontend: `python dev-server.py`
3. Make a voice/video call
4. End the call
5. Check chat area for call card
6. Click "Call Back" button

### Expected Behavior
- Call cards appear in chronological order
- Answered calls show duration
- Missed calls show "No answer"
- Call back button initiates correct call type
- Cards are styled beautifully with gradients

## Files Modified

### Frontend
- `js/common-modals/chat-modal.js` - Added call card rendering and call initiation

### Backend
- `astegni-backend/call_log_endpoints.py` - NEW: Call log API
- `astegni-backend/app.py modules/models.py` - Added chat and call models
- `astegni-backend/app.py` - Registered call log router

## Status
- ✅ Call card UI complete
- ✅ Backend call log API complete
- ⏳ Integration with WebRTC calls (Phase 3)
- ⏳ Independent call modal (Phase 2)
- ⏳ Global WebSocket for calls (Phase 2)

---
**Last Updated:** 2026-01-16
**Version:** 1.0
