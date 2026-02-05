# Quick Guide: Restart Backend and Test Calls

## 1. Restart Backend

The backend needs to be restarted to load the updated WebSocket and call log endpoints.

```bash
# Stop current backend (Ctrl+C if running)

# Start backend
cd astegni-backend
python app.py
```

You should see:
```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

## 2. Clear Browser Cache (Optional but Recommended)

```javascript
// In browser console, run:
localStorage.clear();
location.reload();
```

## 3. Test Voice Call

### Start a Call:
1. Open http://localhost:8081 (or your dev server)
2. Login with your test account
3. Open chat modal
4. Select a conversation
5. Click the voice call button (🎤 icon)

### What to Check:
- ✅ Console should show: `📤 Recipient key will be: user_{user_id}`
- ✅ Call invitation should be sent without errors
- ✅ No errors about missing `other_profile_id` or `other_profile_type`
- ✅ Call modal should appear on recipient's screen

### Expected Console Output (Caller):
```
📞 Starting voice call...
🔍 ========== CALL INVITATION DEBUG ==========
📤 sendCallInvitation called with type: voice
✅ FETCH SUCCESS (200) http://localhost:8000/api/call-logs
📤 Sending call invitation: {...}
📤 Recipient key will be: user_2
✅ Call invitation sent via WebSocket
```

### Expected Console Output (Receiver):
```
📞 Incoming call invitation: {
  "type": "call_invitation",
  "call_type": "voice",
  "from_user_id": 1,
  "from_name": "John Doe",
  "offer": {...}
}
```

## 4. Test Video Call

Same steps as voice call, but click the video call button (📹 icon) instead.

## 5. Verify Database

After making a call, check the database:

```sql
-- Check latest call logs
SELECT
    id,
    conversation_id,
    caller_user_id,
    caller_profile_id,
    caller_profile_type,
    call_type,
    status,
    created_at
FROM call_logs
ORDER BY created_at DESC
LIMIT 5;
```

**Expected Result:**
- `caller_user_id` should be populated (e.g., 1, 2, 3)
- `caller_profile_id` and `caller_profile_type` should be NULL (new calls)

## 6. Troubleshooting

### Issue: "No recipient found in conversation!"
**Cause:** Backend not returning `other_user_id`
**Fix:** Check that backend `/api/chat/conversations` endpoint includes `other_user_id` in response

### Issue: Call invitation not received
**Cause:** WebSocket connection using wrong endpoint
**Solution:**
1. Check WebSocket connection in Network tab
2. Should be: `ws://localhost:8000/ws/{user_id}` (user-based)
3. NOT: `ws://localhost:8000/ws/{profile_id}/{role}` (profile-based)

### Issue: 422 Validation Error on /api/call-logs
**Cause:** Old code still sending required profile fields
**Fix:** Already fixed - restart backend and clear browser cache

### Issue: Backend crashes on call
**Check backend terminal for errors:**
```bash
# Backend should show:
📞 Chat call invitation: voice from user_1 to user_2
✅ FETCH SUCCESS (200) http://localhost:8000/api/call-logs
📞 Call invitation forwarded from user_1 to user_2
```

## 7. Success Indicators

✅ **Frontend:**
- No console errors about missing profile fields
- Call invitation sends successfully
- Call modal appears on both sides

✅ **Backend:**
- No validation errors
- WebSocket messages route correctly
- Call logs created with `caller_user_id`

✅ **Database:**
- New call_logs entries have `caller_user_id` populated
- Profile fields are NULL (expected for new architecture)

## 8. Known Limitations

1. **Whiteboard video calls** still use profile-based approach (intentional)
2. **Old call logs** in database still have profile fields (historical data)
3. **Legacy WebSocket endpoints** still exist for backward compatibility

These are expected and don't affect chat call functionality.

---

**You're all set!** The call system is now using the user-based architecture like the rest of the chat system. 🎉
