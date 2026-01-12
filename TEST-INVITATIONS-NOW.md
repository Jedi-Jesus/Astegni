# Test Parent Invitations - User-ID System

## Quick Test Steps

### 1. Start Backend
```bash
cd astegni-backend
python app.py
```

### 2. Login to Frontend
Open browser: `http://localhost:8081/profile-pages/tutor-profile.html`

Login with:
- **Email**: `kushstudios16@gmail.com`
- **Password**: (your password)
- **User ID**: 141

### 3. Check Backend Logs
You should see:
```
================================================================================
[BACKEND DEBUG] /api/parent/pending-invitations CALLED (USER-ID SYSTEM)
================================================================================
Current User ID: 141
Current User Email: kushstudios16@gmail.com
Current User Roles: ['parent', 'student', 'tutor']

[NEW SYSTEM] Fetching invitations for user_id=141
This will show invitations across ALL profile types (student, tutor, parent)

[QUERY RESULT] Total invitations found: 1

[INVITATION DETAILS]:
  1. ID=11, inviter_user_id=115 (parent), invitee_user_id=141, status=pending

[OK] Returning 1 invitations to client
================================================================================
```

### 4. Check Frontend Display
**Expected**: You should see 1 pending invitation card with:
- Inviter name showing
- Badge showing "👨‍👩‍👧 Parent"
- Relationship type
- Accept/Decline buttons

### 5. Test All Profile Pages
Try these URLs (all should show the same invitation):
- `http://localhost:8081/profile-pages/tutor-profile.html` ✅
- `http://localhost:8081/profile-pages/student-profile.html` ✅
- `http://localhost:8081/profile-pages/parent-profile.html` ✅

**Key Point**: The same invitation should appear on ALL profile pages because it's user-based now!

### 6. Check Browser Console
Press F12 → Console tab

Expected logs:
```
[ParentingInvitationManager] 🔄 Loading parenting invitations (received)...
[ParentingInvitationManager] API URL: http://localhost:8000/api/parent/pending-invitations
[ParentingInvitationManager] API response status: 200 OK
[ParentingInvitationManager] ✅ API response data: {invitations: Array(1)}
[ParentingInvitationManager] Total invitations received: 1
[ParentingInvitationManager] Invitation details: [{inviter_user_id: 115, inviter_type: "parent", ...}]
```

### 7. Test Invitation Creation
Login as **user 115** (jediael.s.abebe@gmail.com):
1. Go to student profile
2. Go to "Parent Portal" panel
3. Click "Invite Parent"
4. Create a new invitation
5. Check database to verify `inviter_user_id`, `inviter_type`, `invitee_user_id` are populated

---

## Database Verification

```bash
cd astegni-backend
python debug_parent_invitations.py
```

Expected output:
```
SECTION 1: INVITATION STATISTICS
Total invitations: 3
  - Pending: 1
  - Accepted: 2

SECTION 2: ALL PENDING INVITATIONS
Invitation #1:
  ID: 11
  Inviter: parent (profile_id=115)
  Invites: parent (profile_id=141)
  Relationship: Guardian
  Is New User: False
  Created: ...
```

---

## What Changed (Frontend)

### Before (Profile-ID System):
```javascript
const studentName = invitation.student_name;
const inviterType = invitation.inviter_profile_type;
```

### After (User-ID System):
```javascript
const inviterName = invitation.inviter_name;  // Works for ANY inviter type
const inviterType = invitation.inviter_type;  // 'student', 'parent', 'tutor'
```

---

## Files Updated

### Backend ✅
1. `parent_invitation_endpoints.py` - GET `/api/parent/pending-invitations` (simplified query)
2. `parent_invitation_endpoints.py` - POST `/api/student/invite-parent` (uses user_id)
3. `parent_invitation_endpoints.py` - POST `/api/student/invite-new-parent` (uses user_id)
4. `parent_endpoints.py` - POST `/api/parent/invite-coparent` (both endpoints)
5. `migrate_invitations_to_user_id.py` - NEW migration script

### Frontend ✅
1. `js/tutor-profile/parenting-invitation-manager.js` - Updated field names
2. `js/parent-profile/session-requests-manager.js` - Updated field names
3. `js/student-profile/parent-portal-manager.js` - No changes needed ✅

### Database ✅
- Added columns: `inviter_user_id`, `inviter_type`, `invitee_user_id`
- Migrated all existing data (3/3 invitations)

---

## Troubleshooting

### Issue: "No invitations showing"
**Solution**: Check backend logs - if you see "Total invitations found: 0", the query isn't matching.

### Issue: "TypeError: Cannot read property 'inviter_name'"
**Solution**: Backend might not be restarted. Kill Python process and restart `python app.py`.

### Issue: "Showing old field names"
**Solution**: Hard refresh browser (Ctrl+Shift+R) to clear JavaScript cache.

### Issue: "401 Unauthorized"
**Solution**: Token expired - logout and login again.

---

## Success Criteria

✅ Backend returns invitations with `inviter_user_id`, `inviter_type`, `invitee_user_id`
✅ Frontend displays inviter name correctly
✅ Frontend shows inviter type badge (Student/Parent/Tutor)
✅ Same invitation visible on ALL profile pages (universal)
✅ Accept/Decline buttons work
✅ New invitations created with user_id columns populated

---

## Next Steps After Testing

1. Test invitation acceptance flow
2. Test invitation creation from parent profile (co-parent feature)
3. Monitor for any errors in production
4. Eventually add NOT NULL constraints to new columns
5. Eventually deprecate old columns (inviter_id, invites_id, inviter_profile_type, invites_profile_type)

---

**Status**: ✅ **READY TO TEST**
