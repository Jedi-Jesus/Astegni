# Role Removal: 90-Day Grace Period Implementation

## Summary of Changes

This update adds a **90-day grace period** for role removal, matching the same deletion period used in the "Leave Astegni" (account deletion) feature. When a user removes a role, the role is **deactivated immediately** but **data is preserved for 90 days**, allowing the user to restore it by re-adding the role.

---

## Key Changes

### 1. **Backend: Scheduled Deletion Instead of Immediate Deletion**
- **OLD**: Role profile was **permanently deleted immediately** after OTP + password verification
- **NEW**: Role profile is **deactivated and scheduled for deletion in 90 days**
- Profile data is preserved during grace period
- User can restore role anytime within 90 days

### 2. **Database Migration: Added `scheduled_deletion_at` Column**
- Added `scheduled_deletion_at` timestamp column to all profile tables:
  - `student_profiles`
  - `tutors`
  - `parent_profiles`
  - `advertiser_profiles`
  - `user_profiles`
- NULL value = no scheduled deletion
- Timestamp value = role will be permanently deleted on that date

### 3. **New Backend Endpoints**
- `GET /api/role/deletion-status` - Check for pending role deletions
- `POST /api/role/restore` - Restore a role scheduled for deletion

### 4. **Frontend: Enhanced Role Manager**
- Updated success message to inform user about 90-day grace period
- Added clear instructions about restoration process

### 5. **Countdown Banner Integration**
- Reused existing `deletion-countdown-banner.js` for role deletion
- Banner now checks for both account deletion and role deletion
- Shows countdown timer in profile dropdown
- "Restore Role" button for easy restoration

---

## Files Modified

### Backend

#### 1. **[astegni-backend/role_management_endpoints.py](astegni-backend/role_management_endpoints.py)**

**Updated Endpoint: `DELETE /api/role/remove`**
```python
@router.delete("/api/role/remove")
async def remove_role(request, current_user, db):
    """
    Schedule role deletion with 90-day grace period
    - Requires password AND OTP verification
    - Schedules role deletion for 90 days from now
    - Role profile is deactivated immediately but data preserved
    - User can restore role by re-adding it within 90 days
    """
    # Calculate scheduled deletion time (90 days from now)
    scheduled_deletion_at = datetime.utcnow() + timedelta(days=90)

    # Deactivate the role profile (don't delete yet)
    if request.role == 'tutor':
        tutor = db.query(TutorProfile).filter(TutorProfile.user_id == user.id).first()
        if tutor:
            tutor.is_active = False
            tutor.scheduled_deletion_at = scheduled_deletion_at

    # [Similar for other role types]

    return {
        "success": True,
        "message": f"{role} scheduled for deletion in 90 days. You can restore it anytime.",
        "scheduled_deletion_at": scheduled_deletion_at.isoformat(),
        "days_remaining": 90,
        "can_restore": True
    }
```

**New Endpoint: `GET /api/role/deletion-status`**
```python
@router.get("/api/role/deletion-status")
async def get_role_deletion_status(current_user, db):
    """
    Check if user has any roles scheduled for deletion
    Returns the role with the nearest scheduled deletion
    """
    # Check all profile types
    pending_deletions = []

    if 'tutor' in user.roles:
        tutor = db.query(TutorProfile).filter(TutorProfile.user_id == user.id).first()
        if tutor and tutor.scheduled_deletion_at and tutor.scheduled_deletion_at > datetime.utcnow():
            days_remaining = (tutor.scheduled_deletion_at - datetime.utcnow()).days
            pending_deletions.append({
                'role': 'tutor',
                'scheduled_deletion_at': tutor.scheduled_deletion_at,
                'days_remaining': days_remaining
            })

    # [Check other roles...]

    if not pending_deletions:
        return {"success": True, "has_pending_deletion": False}

    # Return nearest deletion
    nearest = min(pending_deletions, key=lambda x: x['scheduled_deletion_at'])
    return {
        "success": True,
        "has_pending_deletion": True,
        "role": nearest['role'],
        "scheduled_deletion_at": nearest['scheduled_deletion_at'].isoformat(),
        "days_remaining": nearest['days_remaining']
    }
```

**New Endpoint: `POST /api/role/restore`**
```python
@router.post("/api/role/restore")
async def restore_role(request, current_user, db):
    """
    Restore a role that was scheduled for deletion
    Clears scheduled_deletion_at and reactivates the role
    """
    if request.role == 'tutor':
        tutor = db.query(TutorProfile).filter(TutorProfile.user_id == user.id).first()
        if tutor and tutor.scheduled_deletion_at:
            tutor.scheduled_deletion_at = None
            tutor.is_active = True

    # [Similar for other roles...]

    db.commit()

    return {
        "success": True,
        "message": f"{role} has been restored successfully",
        "role_restored": request.role
    }
```

#### 2. **[astegni-backend/migrate_add_scheduled_deletion_to_profiles.py](astegni-backend/migrate_add_scheduled_deletion_to_profiles.py)** (NEW)
```python
"""
Add scheduled_deletion_at column to all profile tables
"""
profile_tables = [
    'student_profiles',
    'tutors',
    'parent_profiles',
    'advertiser_profiles',
    'user_profiles'
]

for table in profile_tables:
    cursor.execute(f"""
        ALTER TABLE {table}
        ADD COLUMN scheduled_deletion_at TIMESTAMP DEFAULT NULL
    """)
    conn.commit()
```

---

### Frontend

#### 3. **[js/common-modals/role-manager.js](js/common-modals/role-manager.js)**

**Updated `executeRemove()` function:**
```javascript
if (response.ok && data.success) {
    // Show success message with 90-day grace period info
    let message = `Your ${this.currentRole} role has been scheduled for deletion in 90 days.\n\n`;
    message += `✓ Your data will be preserved for 90 days\n`;
    message += `✓ You can restore your ${this.currentRole} role anytime by re-adding it\n`;
    message += `✓ After 90 days, the role and all data will be permanently deleted\n\n`;

    alert(message);
    window.location.href = '/index.html';
}
```

#### 4. **[js/common-modals/deletion-countdown-banner.js](js/common-modals/deletion-countdown-banner.js)**

**Updated `init()` function to check both account and role deletions:**
```javascript
async init() {
    // Check for pending account deletion
    const accountResponse = await fetch(`${API_BASE_URL}/api/account/delete/status`, {...});
    if (accountData.success && accountData.has_pending_deletion) {
        this.deletionData = accountData;
        this.deletionData.type = 'account';
        this.injectIntoNav();
        this.startCountdown();
        return;  // Account deletion takes precedence
    }

    // Check for pending role deletion
    const roleResponse = await fetch(`${API_BASE_URL}/api/role/deletion-status`, {...});
    if (roleData.success && roleData.has_pending_deletion) {
        this.deletionData = roleData;
        this.deletionData.type = 'role';
        this.injectIntoNav();
        this.startCountdown();
    }
}
```

**Updated `restoreRole()` function to handle both types:**
```javascript
async restoreRole() {
    const isAccountDeletion = this.deletionData.type === 'account';

    // Choose endpoint based on deletion type
    const endpoint = isAccountDeletion
        ? `${API_BASE_URL}/api/account/delete/cancel`
        : `${API_BASE_URL}/api/role/restore`;

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {...},
        body: isAccountDeletion ? null : JSON.stringify({
            role: this.deletionData.role
        })
    });

    if (response.ok && data.success) {
        this.showSuccess(restoredItem);
    }
}
```

---

## API Changes

### Updated Endpoint

```
DELETE /api/role/remove
Authorization: Bearer <token>
Content-Type: application/json

Request Payload:
{
  "role": "tutor",
  "password": "string",
  "otp": "123456"
}

OLD Response:
{
  "message": "Tutor role and all associated data have been permanently deleted",
  "deleted_role": "tutor",
  "new_active_role": null,
  "remaining_active_roles": ["student"]
}

NEW Response:
{
  "success": true,
  "message": "Tutor role scheduled for deletion in 90 days. You can restore it anytime before then by re-adding your role.",
  "deleted_role": "tutor",
  "new_active_role": null,
  "remaining_active_roles": ["student"],
  "scheduled_deletion_at": "2026-04-26T12:00:00",
  "days_remaining": 90,
  "can_restore": true
}
```

### New Endpoints

**1. Check Role Deletion Status**
```
GET /api/role/deletion-status
Authorization: Bearer <token>

Response:
{
  "success": true,
  "has_pending_deletion": true,
  "role": "tutor",
  "scheduled_deletion_at": "2026-04-26T12:00:00",
  "days_remaining": 85
}

OR (if no pending deletions):
{
  "success": true,
  "has_pending_deletion": false
}
```

**2. Restore Role**
```
POST /api/role/restore
Authorization: Bearer <token>
Content-Type: application/json

Request Payload:
{
  "role": "tutor"
}

Response:
{
  "success": true,
  "message": "Tutor role has been restored successfully",
  "role_restored": "tutor"
}
```

---

## Updated Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER INITIATES ROLE REMOVAL                  │
│  Location: Profile Page → Settings → "Manage Role" → "Remove"   │
│  Trigger: openManageRoleModal() → openActionPanel('remove')     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  PANEL: Remove Role Permanently                                 │
│  • User must check "I understand this action is permanent"      │
│  • Input: Password                                              │
│  • Input: 6-digit OTP (sent via email)                          │
│  • [Cancel] [Continue to Final Confirmation →]                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  PANEL: Final Confirmation                                      │
│  • "Are you absolutely sure you want to delete [Role]?"         │
│  • List of what will be deleted                                 │
│  • [← Back] [Yes, Delete Permanently]                           │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼ (calls executeRemove())
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND: Schedule Role Deletion (90 Days)                      │
│  DELETE /api/role/remove                                        │
│  1. Verify password with bcrypt                                 │
│  2. Verify OTP (check code, expiration, mark as used)           │
│  3. Check user has this role                                    │
│  4. Prevent removing last role (must use Leave Astegni)         │
│  5. Calculate scheduled_deletion_at = now + 90 days             │
│  6. Deactivate role profile:                                    │
│     - profile.is_active = FALSE                                 │
│     - profile.scheduled_deletion_at = calculated_timestamp      │
│  7. If removed role was active_role, set to None                │
│  8. Return success with 90-day grace period info                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND: Show Success Message & Redirect                      │
│  • "Your [role] has been scheduled for deletion in 90 days"     │
│  • "✓ Your data will be preserved for 90 days"                  │
│  • "✓ You can restore your [role] anytime by re-adding it"      │
│  • "✓ After 90 days, the role and data will be deleted"         │
│  • Clear localStorage, redirect to /index.html                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  COUNTDOWN BANNER (Automatic)                                   │
│  On page load, deletion-countdown-banner.js:                    │
│  1. Calls GET /api/role/deletion-status                         │
│  2. If has_pending_deletion = true:                             │
│     - Injects countdown banner into profile dropdown            │
│     - Shows: "[Role] Deletion • X days remaining"               │
│     - Shows: "Restore [Role]" button                            │
│  3. Updates countdown every minute                              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
         ┌──────────────────┴──────────────────┐
         │                                     │
         ▼ (if 90 days pass)                   ▼ (if user clicks "Restore")
┌─────────────────────────┐         ┌─────────────────────────────┐
│  PERMANENT DELETION     │         │  RESTORE ROLE               │
│  (Cron Job - TBD)       │         │  POST /api/role/restore     │
│  • Finds expired roles  │         │  1. Find role profile       │
│  • Deletes permanently  │         │  2. Clear scheduled_deletion│
│  • CASCADE handles data │         │  3. Set is_active = TRUE    │
└─────────────────────────┘         │  4. Commit changes          │
                                    │  5. Reload page             │
                                    └─────────────────────────────┘
```

---

## Database Schema Changes

### Profile Tables (Student, Tutor, Parent, Advertiser, User)

**Added Column:**
```sql
scheduled_deletion_at TIMESTAMP DEFAULT NULL
```

**Usage:**
- NULL = No scheduled deletion
- Timestamp = Role will be permanently deleted on this date
- Role is deactivated (`is_active = FALSE`) when scheduled_deletion_at is set
- Clearing this field and setting `is_active = TRUE` restores the role

---

## Deployment Instructions

### 1. Run Database Migration
```bash
cd astegni-backend
python migrate_add_scheduled_deletion_to_profiles.py
```

**Expected Output:**
```
================================================================================
Migration: Add scheduled_deletion_at to Profile Tables
================================================================================

Checking table: student_profiles
  ✓ Added 'scheduled_deletion_at' column to student_profiles

Checking table: tutors
  ✓ Added 'scheduled_deletion_at' column to tutors

Checking table: parent_profiles
  ✓ Added 'scheduled_deletion_at' column to parent_profiles

Checking table: advertiser_profiles
  ✓ Added 'scheduled_deletion_at' column to advertiser_profiles

Checking table: user_profiles
  ✓ Added 'scheduled_deletion_at' column to user_profiles

================================================================================
Migration completed successfully!
================================================================================
```

### 2. Restart Backend
```bash
cd astegni-backend
python app.py
```

### 3. Clear Browser Cache
- Frontend changes require cache clearing
- Or use dev server: `python dev-server.py`

---

## Testing Checklist

### Backend Testing
- [ ] Run database migration successfully
- [ ] Test `DELETE /api/role/remove` endpoint
  - [ ] Verify password + OTP verification required
  - [ ] Verify role is deactivated (is_active = FALSE)
  - [ ] Verify scheduled_deletion_at is set to 90 days in future
  - [ ] Verify response includes "days_remaining": 90
- [ ] Test `GET /api/role/deletion-status` endpoint
  - [ ] Returns has_pending_deletion = true when role scheduled
  - [ ] Returns correct role and days_remaining
  - [ ] Returns has_pending_deletion = false when no scheduled deletions
- [ ] Test `POST /api/role/restore` endpoint
  - [ ] Clears scheduled_deletion_at
  - [ ] Sets is_active = TRUE
  - [ ] Returns success message

### Frontend Testing
- [ ] Open "Manage Role" modal
- [ ] Click "Remove Role Permanently"
- [ ] Send OTP, enter OTP + password
- [ ] Proceed to final confirmation
- [ ] Click "Yes, Delete Permanently"
- [ ] Verify success message shows 90-day grace period info
- [ ] Verify redirect to index.html
- [ ] Reload page and check profile dropdown
- [ ] Verify countdown banner appears with "X days remaining"
- [ ] Click "Restore [Role]" button
- [ ] Verify role is restored and banner disappears
- [ ] Verify role is reactivated

### Edge Cases
- [ ] Prevent removing last role (should require Leave Astegni)
- [ ] Test with expired OTP
- [ ] Test with wrong password
- [ ] Test restoring non-existent scheduled deletion
- [ ] Test with multiple roles scheduled for deletion (should show nearest)

---

## Benefits of This Update

1. **User-Friendly**: Gives users 90 days to change their mind
2. **Data Safety**: Protects against accidental role removal
3. **Consistency**: Matches the Leave Astegni (account deletion) flow
4. **Transparent**: Clear countdown timer shows days remaining
5. **Easy Restoration**: One-click restore from dropdown banner
6. **Flexible**: Same OTP + password security as before

---

## Automatic Permanent Deletion (Cron Job)

### Cron Job Script Created

**File**: [astegni-backend/cron_delete_expired_roles.py](astegni-backend/cron_delete_expired_roles.py)

This script automatically deletes roles and accounts past their 90-day grace period.

**What it does:**
1. Checks all profile tables for expired `scheduled_deletion_at` timestamps
2. Permanently deletes expired role profiles
3. Removes role from user's `roles` array
4. Processes expired account deletions
5. Logs all deletions with timestamps

**Setup Guide**: See [CRON_JOB_SETUP_GUIDE.md](CRON_JOB_SETUP_GUIDE.md) for complete setup instructions for:
- Linux/Mac (Cron)
- Windows (Task Scheduler)
- Production (Systemd Timer)

**Quick Setup (Linux/Mac):**
```bash
# Test manually
cd astegni-backend
python cron_delete_expired_roles.py

# Schedule daily at 2:00 AM
crontab -e
# Add this line:
0 2 * * * cd /var/www/astegni/astegni-backend && /usr/bin/python3 cron_delete_expired_roles.py >> /var/log/astegni/cron_deletions.log 2>&1
```

**Quick Setup (Windows Task Scheduler):**
1. Open Task Scheduler (`taskschd.msc`)
2. Create Basic Task → Daily at 2:00 AM
3. Action: Start a program
   - Program: `python`
   - Arguments: `cron_delete_expired_roles.py`
   - Start in: `C:\Users\zenna\Downloads\Astegni\astegni-backend`

**Quick Setup (Production Systemd):**
```bash
# See CRON_JOB_SETUP_GUIDE.md for service and timer file creation
sudo systemctl enable astegni-delete-expired.timer
sudo systemctl start astegni-delete-expired.timer
```

### 2. **Email Reminders**
Send reminder emails at key intervals:
- 30 days before deletion
- 7 days before deletion
- 1 day before deletion

### 3. **Role Removal Analytics**
Track role removal reasons and restoration rates in database

---

## Rollback Plan

If you need to revert to immediate deletion:

1. **Backend**: Restore previous version:
```bash
git checkout HEAD~1 -- astegni-backend/role_management_endpoints.py
```

2. **Frontend**: Restore previous versions:
```bash
git checkout HEAD~1 -- js/common-modals/role-manager.js
git checkout HEAD~1 -- js/common-modals/deletion-countdown-banner.js
```

3. **Database**: Column can remain (won't be used)

---

## Questions or Issues?

If you encounter problems:
1. Check backend logs: `tail -f astegni-backend/logs/app.log`
2. Check browser console for JavaScript errors
3. Verify database migration ran successfully
4. Verify `scheduled_deletion_at` column exists in profile tables
5. Test API endpoints at http://localhost:8000/docs

**Last Updated**: 2026-01-26
