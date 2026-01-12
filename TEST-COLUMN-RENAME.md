# Test Column Rename Migration

## Quick Verification Steps

### 1. Start Backend Server

```bash
cd astegni-backend
python app.py
```

**Expected**: Server starts without errors

**Check for**:
- No import errors
- No database errors
- Server starts on port 8000

---

### 2. Verify Database Columns

```bash
cd astegni-backend
python -c "import psycopg; import os; from dotenv import load_dotenv; from psycopg.rows import dict_row; load_dotenv(); conn = psycopg.connect(os.getenv('DATABASE_URL'), row_factory=dict_row); cur = conn.cursor(); cur.execute(\"SELECT column_name FROM information_schema.columns WHERE table_name = 'parent_invitations' AND column_name IN ('invited_by', 'invited_to', 'invited_by_type', 'invited_to_type', 'inviter_user_id', 'inviter_type', 'invitee_user_id') ORDER BY column_name\"); print('Column names after migration:'); print('\\n'.join(['  - ' + row['column_name'] for row in cur.fetchall()]))"
```

**Expected Output**:
```
Column names after migration:
  - invited_by
  - invited_by_type
  - invited_to
  - invited_to_type
  - invitee_user_id
  - inviter_type
  - inviter_user_id
```

---

### 3. Test Invitation Display (User 141)

**Login as**: user_id=141 (kushstudios16@gmail.com)

**Open**:
1. http://localhost:8081/profile-pages/tutor-profile.html
2. http://localhost:8081/profile-pages/student-profile.html
3. http://localhost:8081/profile-pages/parent-profile.html

**Expected**:
- Invitation ID=11 appears on ALL three profile pages
- Inviter name displays correctly
- Inviter type badge shows "👨‍👩‍👧 Parent"
- Accept/Decline buttons present

**Check Backend Logs**:
```
[BACKEND DEBUG] /api/parent/pending-invitations CALLED (USER-ID SYSTEM)
Current User ID: 141
[NEW SYSTEM] Fetching invitations for user_id=141
[QUERY RESULT] Total invitations found: 1
[INVITATION DETAILS]:
  1. ID=11, inviter_user_id=115 (parent), invitee_user_id=141, status=pending
```

---

### 4. Test Invitation Creation (Student Inviting Parent)

**Login as**: user_id=115 (jediael.s.abebe@gmail.com)

**Steps**:
1. Go to student profile
2. Navigate to "Parent Portal" panel
3. Click "Invite Parent"
4. Fill in parent details
5. Submit invitation

**Expected**:
- Invitation created successfully
- Backend logs show INSERT with new column names
- Database has new invitation with:
  - `invited_by` = student profile_id (backward compat)
  - `invited_by_type` = 'student'
  - `invited_to` = parent profile_id (or NULL for new users)
  - `invited_to_type` = 'parent'
  - `inviter_user_id` = 115 (PRIMARY)
  - `inviter_type` = 'student' (PRIMARY)
  - `invitee_user_id` = target user_id (PRIMARY)

**Verify in Database**:
```sql
SELECT id, invited_by, invited_by_type, invited_to, invited_to_type,
       inviter_user_id, inviter_type, invitee_user_id, status
FROM parent_invitations
ORDER BY created_at DESC
LIMIT 1;
```

---

### 5. Test Co-Parent Invitation (Parent Inviting Parent)

**Login as**: Parent user

**Steps**:
1. Go to parent profile
2. Navigate to "Co-Parent" panel
3. Click "Invite Co-Parent"
4. Fill in details
5. Submit invitation

**Expected**:
- Invitation created successfully
- Backend logs show INSERT with new column names
- Database has new invitation with parent → parent invitation

---

### 6. Backend Logs Verification

**Check for**:
- No SQL errors related to column names
- No "column does not exist" errors
- INSERT statements use new column names (`invited_by`, `invited_to`, etc.)
- SELECT statements use new column names

**Example Good Log**:
```
INSERT INTO parent_invitations (
    invited_by, invited_by_type, invited_to, invited_to_type,
    inviter_user_id, inviter_type, invitee_user_id,
    relationship_type, status, created_at
)
VALUES (28, 'student', 2, 'parent', 115, 'student', 141, 'Guardian', 'pending', NOW())
```

---

### 7. Frontend Console Verification

**Open Browser Console** (F12 → Console)

**Expected Logs**:
```
[ParentingInvitationManager] 🔄 Loading parenting invitations (received)...
[ParentingInvitationManager] API URL: http://localhost:8000/api/parent/pending-invitations
[ParentingInvitationManager] API response status: 200 OK
[ParentingInvitationManager] ✅ API response data: {invitations: Array(1)}
[ParentingInvitationManager] Total invitations received: 1
[ParentingInvitationManager] Invitation details: [{inviter_user_id: 115, inviter_type: "parent", inviter_name: "Jediael Seyoum", ...}]
```

**Check for**:
- No JavaScript errors
- API returns invitations with `inviter_user_id`, `inviter_type`, `invitee_user_id`
- Names display correctly (no "None" or "undefined")

---

## Troubleshooting

### Issue: "column inviter_id does not exist"

**Cause**: Migration not executed or backend not restarted

**Fix**:
```bash
cd astegni-backend
python migrate_rename_invitation_columns.py
# Restart backend
```

---

### Issue: No invitations showing despite backend returning data

**Cause**: Browser cache

**Fix**: Hard refresh (Ctrl+Shift+R) or clear cache

---

### Issue: Name displays as "None Seyoum" or empty

**Cause**: NULL values in first_name or father_name

**Fix**: Already handled in backend with `filter(None, ...)` - check backend logs for actual data

---

### Issue: Invitation creation fails with SQL error

**Cause**: Column name mismatch

**Fix**: Check backend logs for exact SQL error and verify column names match database

---

## Success Criteria

✅ Backend starts without errors
✅ Database has renamed columns
✅ Invitations display on all profile pages
✅ Inviter names display correctly
✅ Invitation creation works (student → parent)
✅ Invitation creation works (parent → parent)
✅ No SQL errors in backend logs
✅ No JavaScript errors in browser console
✅ Name formatting is correct (no NULL, no extra spaces)

---

## Database Quick Check

```bash
cd astegni-backend
python debug_parent_invitations.py
```

**Expected Output**:
```
SECTION 1: INVITATION STATISTICS
Total invitations: 3
  - Pending: 1
  - Accepted: 2

SECTION 2: ALL PENDING INVITATIONS
Invitation #1:
  ID: 11
  Inviter: parent (profile_id=115) [OLD COLUMN: invited_by]
  Invites: parent (profile_id=141) [OLD COLUMN: invited_to]
  Inviter User ID: 115 [NEW PRIMARY COLUMN]
  Inviter Type: parent [NEW PRIMARY COLUMN]
  Invitee User ID: 141 [NEW PRIMARY COLUMN]
  Relationship: Guardian
  Is New User: False
  Created: ...
```

---

## Summary of Changes

**What Changed**:
1. Database column names: `inviter_id` → `invited_by`, `invites_id` → `invited_to`, etc.
2. Backend code: 150+ references updated
3. Column comments: Updated to reflect OLD vs NEW system

**What Stayed the Same**:
1. Frontend code: No changes (already using new system)
2. API responses: Same field names (`inviter_user_id`, `inviter_type`, `invitee_user_id`)
3. Functionality: Invitation system works exactly the same
4. Data: All existing invitations preserved

---

**Status**: ✅ Migration complete, ready for testing!
