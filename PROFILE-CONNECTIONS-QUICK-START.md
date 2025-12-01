# Profile-Based Connections: Quick Start Guide

## What Changed?
Connections now use **profile IDs** (from tutor_profiles, student_profiles, etc.) instead of user IDs.

### Before (User-Based)
```
User #50 ↔ User #102
(No context - are they student/tutor? teacher/teacher?)
```

### After (Profile-Based)
```
Student Profile #12 ↔ Tutor Profile #85
(Clear context: student learning from tutor!)

Tutor Profile #200 ↔ Tutor Profile #90
(Different context: professional network!)
```

## How to Use (3 Steps)

### Step 1: Run Migration (One-Time Setup)
```bash
cd astegni-backend
python migrate_connections_to_profile_ids.py
```

Expected output:
```
✅ Column profile_id_1 added successfully
✅ Column profile_type_1 added successfully
✅ Column profile_id_2 added successfully
✅ Column profile_type_2 added successfully
✅ Successfully migrated N connections
```

### Step 2: Restart Backend
```bash
# Kill existing backend (Ctrl+C)
python app.py
```

### Step 3: Test It!
```bash
# Test creating a connection (legacy way - still works!)
curl -X POST http://localhost:8000/api/connections \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"target_user_id": 102, "connection_type": "connect"}'
```

## Frontend Changes (Optional)

### Option 1: Keep Current Code (No Changes Needed!)
Your frontend already works! The backend auto-detects profiles.

```javascript
// This still works - profile auto-detected!
await connectionManager.sendConnectionRequest(tutorUserId);
```

### Option 2: Send Profile Info Explicitly (Better!)
Update `connection-manager.js` to send profile info:

```javascript
// In js/view-tutor/connection-manager.js
async sendConnectionRequest(tutorUserId, tutorProfileId, message = null) {
    const response = await fetch(`${this.API_BASE_URL}/api/connections`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            target_profile_id: tutorProfileId,  // NEW
            target_profile_type: 'tutor',       // NEW
            connection_type: 'connect',
            connection_message: message
        })
    });
    // ... rest of code
}
```

## Key Files Changed

| File | Purpose | Status |
|------|---------|--------|
| `migrate_connections_to_profile_ids.py` | Adds profile columns | ✅ Ready |
| `app.py modules/models.py` | Updated Connection model | ✅ Updated |
| `connection_endpoints.py` | Updated API logic | ✅ Updated |
| `connection_profile_helpers.py` | Helper functions | ✅ New |
| `js/view-tutor/connection-manager.js` | Frontend (optional) | ⏳ Optional |

## Quick Test

1. **Create a connection** (view-tutor page):
   - Go to http://localhost:8080/view-profiles/view-tutor.html?id=1
   - Click "Connect"
   - Should work without errors!

2. **Check database**:
```sql
SELECT profile_type_1, profile_id_1, profile_type_2, profile_id_2, status
FROM connections
ORDER BY created_at DESC
LIMIT 5;
```

Expected output:
```
 profile_type_1 | profile_id_1 | profile_type_2 | profile_id_2 | status
----------------+--------------+----------------+--------------+-----------
 student        | 12           | tutor          | 85           | connecting
```

## Troubleshooting

### Error: "No profile found for user"
**Problem**: User doesn't have any profile (tutor/student/parent/advertiser)

**Solution**: Create a profile for the user:
```sql
-- For tutors
INSERT INTO tutor_profiles (user_id, ...) VALUES (user_id, ...);

-- For students
INSERT INTO student_profiles (user_id, ...) VALUES (user_id, ...);
```

### Error: "Column profile_id_1 does not exist"
**Problem**: Migration not run

**Solution**:
```bash
cd astegni-backend
python migrate_connections_to_profile_ids.py
```

### Frontend still using user_id
**No problem!** Backend auto-detects profiles from user_id. It's backwards compatible!

## Benefits Summary

✅ **Role-specific connections** - Student-to-tutor vs. tutor-to-tutor
✅ **Better data isolation** - Connections belong to profiles, not generic users
✅ **Backwards compatible** - Old code still works!
✅ **Analytics ready** - Track connections by profile type
✅ **Context-aware** - Know the relationship type

## Next Steps
1. ✅ Run migration
2. ✅ Test connection creation
3. ⏳ Optionally update frontend to send profile info
4. ⏳ Add analytics by profile type (future)

---

**Status**: ✅ Ready to Deploy
**Breaking Changes**: None! Fully backwards compatible.
