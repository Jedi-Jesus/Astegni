# Deletion Countdown Banner - Implementation Summary

## Overview
A visual countdown banner that appears in the profile dropdown when a user has a role scheduled for deletion with the 90-day grace period.

## Features Implemented

### 1. Visual Countdown Banner
**Location**: Profile dropdown menu (after user info, before role switcher)

**Design**:
- 🟠 Orange gradient background with pulsing animation
- ⏰ Clock icon in circular badge
- 📊 Shows role name and days remaining
- 🔵 "Restore Role" button

**States**:
- **Visible**: When user has role scheduled for deletion
- **Hidden**: When no pending deletions

### 2. Automatic Detection
The banner automatically:
- Checks deletion status on page load
- Updates when profile dropdown opens
- Calls `/api/role/deletion-status` endpoint
- Shows nearest scheduled deletion if multiple roles pending

### 3. User Actions
**"Restore Role" Button**:
- Opens the Manage Role modal
- User can restore the role (clears scheduled deletion)
- No password/OTP required for restoration

## Files Modified/Created

### Frontend Files

1. **index.html** (Line ~165-185)
   - Added countdown banner HTML in profile dropdown
   - Added script import for deletion-countdown-banner.js

2. **css/root/profile-dropdown.css** (Line ~444-537)
   - Added countdown banner styles
   - Pulsing animation
   - Dark theme support

3. **js/common-modals/deletion-countdown-banner.js** (NEW)
   - DeletionCountdownBanner object
   - Auto-checks on page load and dropdown open
   - Shows/hides banner based on API response

### Backend Files (Already Existed)

4. **astegni-backend/role_management_endpoints.py**
   - `GET /api/role/deletion-status` endpoint
   - Returns scheduled deletion info

## How It Works

### Flow

1. **Page Loads**
   ```
   DOMContentLoaded → Wait 1s → Check deletion status
   ```

2. **User Opens Dropdown**
   ```
   Click profile → toggleProfileDropdown() → Check deletion status
   ```

3. **API Call**
   ```javascript
   GET /api/role/deletion-status
   Authorization: Bearer {token}
   ```

4. **Response (Has Pending Deletion)**
   ```json
   {
     "success": true,
     "has_pending_deletion": true,
     "role": "student",
     "scheduled_deletion_at": "2026-04-27T10:30:00",
     "days_remaining": 45
   }
   ```

5. **Banner Shows**
   - Updates role name: "student"
   - Updates days: "45"
   - Shows banner with pulsing animation

### Banner HTML Structure

```html
<div id="deletion-countdown-banner" class="deletion-countdown-banner hidden">
    <div class="countdown-content">
        <div class="countdown-icon">
            <!-- Clock SVG -->
        </div>
        <div class="countdown-text">
            <div class="countdown-title">Role Scheduled for Deletion</div>
            <div class="countdown-details">
                Your <span id="countdown-role-name">student</span> role will be deleted in
                <span id="countdown-days">45</span> days
            </div>
        </div>
    </div>
    <button onclick="openManageRoleModal()" class="countdown-restore-btn">
        Restore Role
    </button>
</div>
```

## CSS Classes

### Main Classes
- `.deletion-countdown-banner` - Container with gradient and pulse animation
- `.countdown-content` - Flexbox layout for icon + text
- `.countdown-icon` - Circular orange badge with clock icon
- `.countdown-text` - Text content area
- `.countdown-title` - "Role Scheduled for Deletion" heading
- `.countdown-details` - Description with dynamic content
- `.countdown-restore-btn` - Orange button with hover effects

### Animations
```css
@keyframes pulse-orange {
    0%, 100% { box-shadow: 0 0 0 0 rgba(255, 152, 0, 0.4); }
    50% { box-shadow: 0 0 0 4px rgba(255, 152, 0, 0.1); }
}
```

## JavaScript API

### DeletionCountdownBanner Object

```javascript
// Check and show/hide banner
await DeletionCountdownBanner.checkAndShowBanner();

// Manually show banner
DeletionCountdownBanner.showBanner({
    role: 'student',
    days_remaining: 45,
    scheduled_deletion_at: '2026-04-27T10:30:00'
});

// Manually hide banner
DeletionCountdownBanner.hideBanner();
```

## Testing

### Manual Test Steps

1. **Schedule a role for deletion**:
   - Go to profile dropdown → "Manage Role"
   - Select "Remove Role Permanently"
   - Complete password + OTP verification
   - Confirm final deletion

2. **Check countdown banner**:
   - Refresh page
   - Open profile dropdown
   - Banner should appear with role name and days remaining

3. **Test restore button**:
   - Click "Restore Role" button
   - Should open Manage Role modal
   - (Restoration flow depends on add-role modal implementation)

### Backend Test
```bash
cd astegni-backend
python -c "
import requests
token = 'your_access_token'
response = requests.get(
    'http://localhost:8000/api/role/deletion-status',
    headers={'Authorization': f'Bearer {token}'}
)
print(response.json())
"
```

Expected response when role is scheduled:
```json
{
  "success": true,
  "has_pending_deletion": true,
  "role": "student",
  "scheduled_deletion_at": "2026-04-27T10:30:00.123456",
  "days_remaining": 45
}
```

## User Experience

### What Users See

1. **After Removing Role**:
   - Success panel in modal shows 90-day message
   - Close modal
   - Open profile dropdown
   - **Orange pulsing banner appears** 📢

2. **Banner Content**:
   ```
   ⏰  Role Scheduled for Deletion
       Your student role will be deleted in 45 days

       [Restore Role]
   ```

3. **Daily Updates**:
   - Days remaining decreases each day
   - Banner remains until:
     - Role is restored (cancelled deletion)
     - 90 days pass (role permanently deleted)

## Integration Points

### With Other Systems

1. **Manage Role Modal**:
   - "Restore Role" button opens the modal
   - Modal should handle restoration
   - After restoration, banner should disappear

2. **Add Role Modal**:
   - When user re-adds a scheduled role
   - Backend clears `scheduled_deletion_at`
   - Banner disappears on next check

3. **Profile System**:
   - Banner checks on every dropdown open
   - Always shows latest deletion status
   - Multiple roles: shows nearest deletion date

## Troubleshooting

### Banner Not Showing

**Check**:
1. Is user logged in? (token exists)
2. Is role actually scheduled? Check database:
   ```sql
   SELECT is_active, scheduled_deletion_at
   FROM student_profiles
   WHERE user_id = 123;
   ```
3. Is `scheduled_deletion_at` in the future?
4. Browser console for errors

### Banner Showing Incorrectly

**Fix**:
- Clear localStorage
- Refresh page
- Check API response in Network tab

### Days Calculation Wrong

**Backend calculates**:
```python
days_remaining = (scheduled_deletion_at - datetime.now()).days
```

Ensure backend timezone is UTC.

## Future Enhancements (Optional)

### 1. Email Reminders
Send emails at:
- 60 days remaining
- 30 days remaining
- 7 days remaining
- 1 day remaining

### 2. Push Notifications
Browser notifications when:
- Days remaining < 7
- Days remaining < 1

### 3. Multiple Role Warning
If user has multiple roles scheduled:
- Show count: "2 roles scheduled for deletion"
- List all in banner

### 4. Progress Bar
Visual progress bar showing:
```
Day 1 ████████████████░░░░ Day 90
       30 days remaining
```

## Summary

✅ **Deletion countdown banner fully implemented**
✅ **Automatic detection on page load and dropdown open**
✅ **Beautiful pulsing orange design**
✅ **Restore role button**
✅ **Dark theme support**
✅ **Integrates with 90-day grace period system**

Users will now see a clear visual warning when they have roles scheduled for deletion, with easy access to restore them if they change their mind!
