# Session Request System - User-Based Implementation

## Overview

The session request system has been migrated to a **user-based architecture** instead of profile-based. This means all requests, conversations, and messages are now tracked by `users.id` instead of `profile_id + profile_type`.

## Key Changes

### 1. Database Schema

**requested_sessions table:**
```sql
- requester_id: INTEGER (users.id) -- NOT profile ID
- requester_type: VARCHAR ('student' or 'parent') -- Context only
- tutor_id: INTEGER (tutor_profiles.id) -- Still profile ID for tutors
- requested_to_id: INTEGER (student_profiles.id) -- Student the session is for
```

**conversations table:**
```sql
- created_by_user_id: INTEGER (users.id) -- NEW column added
- created_by_profile_id: INTEGER (nullable) -- Legacy, kept for backward compatibility
- created_by_profile_type: VARCHAR (nullable) -- Legacy
```

**conversation_participants table:**
```sql
- user_id: INTEGER (users.id) -- PRIMARY identifier
- profile_id: INTEGER (nullable) -- Legacy
- profile_type: VARCHAR (nullable) -- Legacy
```

**chat_messages table:**
```sql
- sender_user_id: INTEGER (users.id) -- PRIMARY identifier
- sender_profile_id: INTEGER (nullable) -- Legacy
- sender_profile_type: VARCHAR (nullable) -- Legacy
```

### 2. API Endpoints

#### Create Session Request
```http
POST /api/session-requests
Authorization: Bearer {token}
Content-Type: application/json

{
  "tutor_id": 2,
  "package_id": 1,
  "message": "I'd like to book sessions",
  "schedule_type": "recurring",
  "days": ["Monday", "Wednesday"],
  "start_time": "14:00",
  "end_time": "16:00",
  "counter_offer_price": 150.00
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Session request sent successfully",
  "request_id": 123,
  "conversation_id": 45,
  "message_id": 678,
  "created_at": "2026-01-31T10:30:00"
}
```

**Duplicate Request Error (409):**
```json
{
  "detail": "Request already sent. You have a pending request for this package (Request ID: 123, sent on January 31, 2026). Please wait for the tutor's response."
}
```

### 3. Duplicate Prevention

**How It Works:**
- Checks for existing `pending` requests with same `requester_id + tutor_id + package_id`
- Returns `409 Conflict` if duplicate found
- Allows new request after previous one is accepted/rejected
- Allows multiple requests to different packages from same tutor

**Frontend Handling:**
```javascript
// view-tutor-db-loader.js
if (response.status === 409) {
    alert('⚠️ Request Already Sent\n\n' + error.detail);
    window.closePackageDetailsModal();
    return;
}
```

## Migration Guide

### Database Migration

Run the migration script:
```bash
cd astegni-backend
python migrate_conversations_to_user_based.py
```

**What it does:**
1. Adds `created_by_user_id` column to `conversations`
2. Populates existing data by looking up user_id from profile tables
3. Makes profile columns nullable in `conversation_participants` and `chat_messages`

**Results:**
- ✓ 37 existing conversations migrated
- ✓ Profile columns made nullable
- ✓ Backward compatible (old profile columns kept)

### Code Changes

**session_request_endpoints.py:**
```python
# OLD (profile-based)
WHERE cp1.profile_id = %s AND cp1.profile_type = %s

# NEW (user-based)
WHERE cp1.user_id = %s
```

**Key fixes:**
1. Removed undefined `requester_id` variable (was causing 500 error)
2. Changed conversation lookup to use `user_id` only
3. Changed conversation creation to use `created_by_user_id`
4. Changed participant creation to use `user_id` only
5. Changed message creation to use `sender_user_id` only

## Request Flow

### Student Requesting Session

1. **User visits tutor profile** → view-tutor.html
2. **Clicks package** → Opens package details modal
3. **Fills schedule preferences** → submitPackageRequest()
4. **Backend receives request:**
   ```python
   user_id = current_user['id']  # users.id (e.g., 1)
   active_role = current_user['active_role']  # 'student'
   student_profile_id = role_ids['student']  # student_profiles.id (e.g., 8)

   # Check for duplicates
   existing = SELECT ... WHERE requester_id = user_id AND tutor_id = 2 AND package_id = 1

   if existing and status = 'pending':
       return 409 Conflict

   # Create request
   INSERT INTO requested_sessions (
       requester_id = 1,  # users.id
       requester_type = 'student',  # context
       requested_to_id = 8  # student_profiles.id (self)
   )
   ```

5. **Create/Get conversation:**
   ```python
   # Find existing conversation (user-based)
   SELECT c.id FROM conversations c
   WHERE cp1.user_id = 1 AND cp2.user_id = 3  # both users.id

   # Or create new one
   INSERT INTO conversations (created_by_user_id = 1)
   ```

6. **Add participants:**
   ```python
   # Student participant
   INSERT INTO conversation_participants (user_id = 1)

   # Tutor participant
   INSERT INTO conversation_participants (user_id = 3)
   ```

7. **Send session_request message:**
   ```python
   INSERT INTO chat_messages (
       sender_user_id = 1,
       message_type = 'session_request',
       media_metadata = {...package info...}
   )
   ```

### Parent Requesting for Child

Same flow, but:
```python
user_id = 1  # parent's users.id
requester_type = 'parent'
requested_to_id = 5  # child's student_profiles.id (from request body)
```

## Testing

### Manual Testing

1. **Restart backend** (migration changes require restart)
   ```bash
   cd astegni-backend
   python app.py
   ```

2. **Test request creation:**
   - Login as student
   - Visit tutor profile (view-tutor.html?id=2)
   - Select package
   - Fill schedule, submit
   - Should succeed

3. **Test duplicate prevention:**
   - Try submitting same request again
   - Should see "Request already sent" alert
   - Should close modal automatically

4. **Test different package:**
   - Select different package from same tutor
   - Should succeed (different package allowed)

### Automated Testing

```bash
cd astegni-backend
python test_duplicate_session_request.py
```

**Expected output:**
```
✓ Login successful
✓ First request created successfully
✓ Duplicate prevented successfully! (409 Conflict)
✓ Request for different package created successfully
```

## Error Handling

### Backend Errors

| Status | Error | Cause | Solution |
|--------|-------|-------|----------|
| 400 | Student/Parent profile not found | User missing role profile | Complete profile first |
| 403 | Only students/parents can request | Wrong active role | Switch to student/parent role |
| 404 | Tutor not found | Invalid tutor_id | Check tutor exists |
| 409 | Request already sent | Duplicate pending request | Wait for tutor response |
| 500 | Internal server error | Various | Check backend logs |

### Frontend Errors

All errors show user-friendly alerts:
```javascript
// Duplicate request (409)
alert('⚠️ Request Already Sent\n\n' + error.detail);

// Other errors (400, 403, 404, 500)
alert('❌ Failed to send session request:\n\n' + error.message);
```

## Database Queries

### Find pending requests for user
```sql
SELECT * FROM requested_sessions
WHERE requester_id = {user_id}
AND status = 'pending';
```

### Find all conversations for user
```sql
SELECT c.* FROM conversations c
JOIN conversation_participants cp ON c.id = cp.conversation_id
WHERE cp.user_id = {user_id};
```

### Find duplicate request
```sql
SELECT id, created_at FROM requested_sessions
WHERE tutor_id = {tutor_id}
AND requester_id = {user_id}
AND package_id = {package_id}
AND status = 'pending';
```

## Benefits of User-Based System

1. **Simpler Architecture:** No need to track profile_id + profile_type
2. **Fewer Joins:** Queries use single user_id instead of profile lookups
3. **Better Performance:** Indexed on user_id only
4. **Clearer Code:** No confusion between user_id and profile_id
5. **Easier Debugging:** Single identifier to track
6. **Future-Proof:** Ready for chat system migration to user-based

## Next Steps

### Chat System Migration

Now that session requests are user-based, migrate the entire chat system:

1. **Update chat endpoints** to use `user_id` only
2. **Update chat frontend** to use `user_id` for lookups
3. **Remove profile_id/profile_type** from queries (optional cleanup)
4. **Update WebSocket** to use `user_id` for connections

### Recommended Approach

- Keep profile columns for now (backward compatibility)
- Gradually migrate all chat features to user-based
- Eventually remove profile columns in future release

## Troubleshooting

### Backend won't start after migration
```bash
# Check migration was successful
psql -U astegni_user -d astegni_user_db
\d conversations  # Should show created_by_user_id column
\d conversation_participants  # profile_id should allow NULL
```

### Requests fail with 500 error
```bash
# Check backend logs
cd astegni-backend
python app.py  # Watch console for errors
```

### Duplicate prevention not working
```sql
-- Check existing pending requests
SELECT requester_id, tutor_id, package_id, status, created_at
FROM requested_sessions
WHERE status = 'pending';
```

## Summary

✅ **Session requests are now user-based**
✅ **Duplicate requests prevented (409 error)**
✅ **Chat conversations use user_id**
✅ **Chat messages use sender_user_id**
✅ **Backward compatible (profile columns nullable)**
✅ **Migration script provided**
✅ **Test script provided**

The system is ready for production use and prepared for full chat system migration!
