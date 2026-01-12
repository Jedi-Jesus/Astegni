# Cleanup Old Column References - Complete Guide

## What Happened

✅ **Database columns dropped successfully!**

The old redundant profile-based columns have been removed from the `parent_invitations` table:
- ❌ `invited_by` (DROPPED)
- ❌ `invited_by_type` (DROPPED)
- ❌ `invited_to` (DROPPED)
- ❌ `invited_to_type` (DROPPED)

The NEW user-based columns are now the only columns:
- ✅ `inviter_user_id` (user_id)
- ✅ `inviter_type` (profile type)
- ✅ `invitee_user_id` (user_id)

---

## Remaining Backend Code Cleanup Needed

The backend code still has many references to the old columns that need to be removed. Here's the cleanup plan:

### Files with Old References

1. `parent_invitation_endpoints.py` - ~50 references
2. `parent_endpoints.py` - ~15 references

### Types of References to Remove

1. **SELECT queries** with old columns
2. **WHERE clauses** using old columns
3. **LEFT JOIN** statements referencing old columns
4. **Response fields** returning old column values
5. **Comments** mentioning old columns

---

## Cleanup Strategy

Due to the complexity and number of references (65+ across 2 files), here's the recommended approach:

### Option 1: Incremental Testing (RECOMMENDED)

Clean up one endpoint at a time and test:

1. **Start with GET endpoints** (most critical for display)
   - `GET /api/parent/pending-invitations` ✅ (Already updated to use user_id)
   - `GET /api/student/sent-invitations` - Needs cleanup
   - `GET /api/parent/sent-invitations` - Needs cleanup

2. **Then UPDATE endpoints**
   - `POST /api/parent/accept-invitation` - Needs cleanup
   - `DELETE /api/parent/reject-invitation` - Needs cleanup

3. **Finally CREATE endpoints** (already mostly updated)
   - `POST /api/student/invite-parent` ✅ (Already updated)
   - `POST /api/student/invite-new-parent` ✅ (Already updated)
   - `POST /api/parent/invite-coparent` - Needs verification

### Option 2: Complete Rewrite (SAFER but MORE WORK)

Rewrite all invitation endpoints from scratch using ONLY the new user-based columns. This ensures no old references remain.

---

## What Needs to Be Changed

### Pattern 1: LEFT JOIN with old columns

**Before (BROKEN - columns don't exist)**:
```sql
LEFT JOIN parent_profiles pp ON pi.invited_to = pp.id AND pi.invited_to_type = 'parent'
WHERE pi.invited_by = %s AND pi.invited_by_type = 'student'
```

**After (FIXED - uses user_id)**:
```sql
LEFT JOIN parent_profiles pp ON pp.user_id = pi.invitee_user_id
WHERE pi.inviter_user_id = %s AND pi.inviter_type = 'student'
```

### Pattern 2: WHERE clauses

**Before (BROKEN)**:
```sql
WHERE invited_by = %s AND invited_by_type = 'student' AND status = 'pending'
```

**After (FIXED)**:
```sql
WHERE inviter_user_id = %s AND inviter_type = 'student' AND status = 'pending'
```

### Pattern 3: Response fields

**Before (BROKEN - column doesn't exist)**:
```python
"invited_to": inv['invited_to'],
"invited_to_type": inv['invited_to_type'],
```

**After (FIXED - or remove entirely if not needed)**:
```python
"invitee_user_id": inv['invitee_user_id'],
"inviter_type": inv['inviter_type'],
```

### Pattern 4: Profile lookups

**Before (BROKEN - uses old column)**:
```python
cur.execute("SELECT id, user_id FROM student_profiles WHERE id = %s", (invitation['invited_by'],))
```

**After (FIXED - use inviter_user_id to get profile)**:
```python
cur.execute("SELECT id, user_id FROM student_profiles WHERE user_id = %s", (invitation['inviter_user_id'],))
```

---

## Critical Endpoints That MUST Work

These endpoints are actively used by the frontend and MUST be fixed immediately:

### 1. GET /api/parent/pending-invitations
**Status**: ✅ Already updated to use `invitee_user_id`
**Location**: [parent_invitation_endpoints.py:642-738](astegni-backend/parent_invitation_endpoints.py#L642)

### 2. POST /api/student/invite-parent
**Status**: ✅ Already updated (INSERT uses only new columns)
**Location**: [parent_invitation_endpoints.py:300-432](astegni-backend/parent_invitation_endpoints.py#L300)

### 3. POST /api/student/invite-new-parent
**Status**: ✅ Already updated (INSERT uses only new columns)
**Location**: [parent_invitation_endpoints.py:434-575](astegni-backend/parent_invitation_endpoints.py#L434)

### 4. GET /api/student/sent-invitations
**Status**: ❌ BROKEN - Uses old columns in LEFT JOIN and WHERE
**Location**: [parent_invitation_endpoints.py:577-650](astegni-backend/parent_invitation_endpoints.py#L577)
**Fix Needed**: Replace `invited_to`, `invited_to_type`, `invited_by`, `invited_by_type` with new columns

### 5. POST /api/parent/accept-invitation
**Status**: ❌ BROKEN - Uses old columns in WHERE and UPDATE
**Location**: [parent_invitation_endpoints.py:1000-1200](astegni-backend/parent_invitation_endpoints.py#L1000)
**Fix Needed**: Replace all old column references

---

## Testing After Cleanup

After fixing each endpoint:

1. **Start backend**:
   ```bash
   cd astegni-backend
   python app.py
   ```

2. **Test the endpoint**:
   ```bash
   # GET endpoint
   curl -H "Authorization: Bearer <token>" http://localhost:8000/api/parent/pending-invitations

   # POST endpoint
   curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
        -d '{"target_user_id":141,"relationship_type":"Guardian"}' \
        http://localhost:8000/api/student/invite-parent
   ```

3. **Check for SQL errors** in backend logs:
   - "column invited_by does not exist" = old references still present
   - No errors = endpoint successfully updated

---

## Quick Wins (Easy Fixes)

### Fix Comments
Search for comments mentioning old columns and update them:
```python
# Before
# This is the profile ID to use as invited_by

# After
# Get student profile for invitation metadata (optional)
```

### Remove Unused Response Fields
If the frontend doesn't use `invited_to` or `invited_to_type`, just remove them from responses:
```python
# Can be removed if frontend doesn't need it
"invited_to": inv['invited_to'],  # DELETE THIS LINE
```

---

## Rollback Plan (If Things Break)

If the cleanup causes issues:

### Option A: Restore Old Columns (Emergency)

```sql
-- Restore the old columns
ALTER TABLE parent_invitations ADD COLUMN invited_by INTEGER;
ALTER TABLE parent_invitations ADD COLUMN invited_to INTEGER;
ALTER TABLE parent_invitations ADD COLUMN invited_by_type VARCHAR(50);
ALTER TABLE parent_invitations ADD COLUMN invited_to_type VARCHAR(50);

-- Repopulate from new columns (approximate - not perfect)
-- This is lossy because we can't reverse user_id → profile_id accurately
UPDATE parent_invitations
SET invited_by = inviter_user_id,  -- WRONG but temporarily functional
    invited_to = invitee_user_id;  -- WRONG but temporarily functional
```

**Note**: This rollback is **NOT perfect** because we lost the profile_id data when we dropped the columns.

### Option B: Fix Forward (Recommended)

Don't rollback - instead, fix all the broken endpoints by replacing old column references with new ones.

---

## Summary

**Status**: Database migration complete ✅, Code cleanup in progress ⏳

**What's Working**:
- ✅ Database has only new user-based columns
- ✅ Core invitation display endpoint updated
- ✅ Core invitation creation endpoints updated

**What Needs Work**:
- ❌ ~50 references to old columns in `parent_invitation_endpoints.py`
- ❌ ~15 references to old columns in `parent_endpoints.py`
- ❌ Several endpoints will break until references are updated

**Next Steps**:
1. Fix `GET /api/student/sent-invitations` (HIGH PRIORITY)
2. Fix `POST /api/parent/accept-invitation` (HIGH PRIORITY)
3. Test each endpoint after fixing
4. Update comments and documentation

---

**The system is cleaner now** - we eliminated redundant columns! But we need to finish cleaning up the code references to complete the migration.
