# Account Restoration on Login - Implementation Guide

## Overview

When a user schedules their account for deletion via "Leave Astegni", they are logged out. If they log back in during the 90-day grace period, a **full-screen restoration modal** appears immediately after login, offering them the chance to recover their account.

This is different from role deletion, which shows a small banner in the profile dropdown.

---

## Key Differences: Account vs Role Deletion

### Account Deletion (Leave Astegni)
- **What happens:** Entire account scheduled for deletion
- **User state:** Logged out immediately
- **On login:** Full-screen restoration modal appears
- **Recovery:** Click "Recover My Account" button (instant, no password needed)
- **Visual:** Red color scheme (severe warning)

### Role Deletion (Individual Roles)
- **What happens:** One specific role scheduled for deletion
- **User state:** Remains logged in
- **Visual feedback:** Orange banner in profile dropdown
- **Recovery:** Click "Restore Role" button in banner
- **Visual:** Orange color scheme (warning)

---

## Implementation Files

### 1. Account Restoration Modal HTML
**File:** [modals/common-modals/account-restoration-modal.html](modals/common-modals/account-restoration-modal.html)

**Features:**
- Full-screen modal overlay with blur effect
- Large countdown showing days remaining
- Detailed time remaining (days, hours, minutes)
- Deletion date display
- List of what will be deleted
- Reasons for leaving (if provided)
- Two action buttons:
  - **Recover My Account** (green, primary)
  - **Continue to Account** (gray, secondary)
- Dark theme support

**Key Elements:**
```html
<div id="account-restoration-modal" class="modal-overlay hidden">
    <!-- Warning icon with red background -->
    <!-- Large days remaining countdown -->
    <!-- Deletion date and time -->
    <!-- What will be deleted list -->
    <!-- Reason for deletion section -->
    <!-- Action buttons -->
</div>
```

---

### 2. Account Restoration Modal JavaScript
**File:** [js/common-modals/account-restoration-modal.js](js/common-modals/account-restoration-modal.js)

**Main Object:** `window.AccountRestorationModal`

**Methods:**

#### `checkAndShowModal()`
- Called after successful login
- Fetches account deletion status from API
- Shows modal if deletion is scheduled
- Silent if no deletion scheduled

```javascript
await AccountRestorationModal.checkAndShowModal();
```

#### `showModal(data)`
- Displays the modal with deletion info
- Updates all dynamic content:
  - Days remaining
  - Deletion date/time
  - Time remaining (detailed)
  - Request date
  - Reasons for leaving

#### `recoverAccount()`
- Calls `POST /api/account/delete/cancel`
- Shows loading spinner
- Displays success message
- Refreshes page after 2 seconds

#### `closeModal()`
- Hides modal
- Allows user to continue to account (with deletion still scheduled)

#### `calculateTimeRemaining(scheduledDeletionAt)`
- Calculates precise time remaining
- Returns format: "45 days, 3 hours, 22 minutes"

---

### 3. Login Flow Integration
**File:** [js/index/profile-and-authentication.js](js/index/profile-and-authentication.js)

**Updated:** `handleLogin()` function (lines 354-410)

**New Flow:**
```javascript
async function handleLogin(e) {
    // ... login logic ...

    if (result.success) {
        // Close login modal
        closeModal("login-modal");

        // Update UI
        updateUIForLoggedInUser();

        // 🆕 CHECK FOR ACCOUNT DELETION
        if (window.AccountRestorationModal) {
            await window.AccountRestorationModal.checkAndShowModal();

            // Wait to see if modal appears
            setTimeout(() => {
                const isModalShowing = !document.getElementById('account-restoration-modal')?.classList.contains('hidden');

                if (!isModalShowing) {
                    // No deletion - proceed with normal redirect
                    proceedWithRedirect();
                }
            }, 500);
        } else {
            proceedWithRedirect();
        }
    }
}
```

**Key Changes:**
1. After successful login, check for account deletion BEFORE redirecting
2. If modal appears, DON'T redirect (let user handle restoration)
3. If no deletion scheduled, proceed with normal redirect

---

### 4. Index Page Integration
**File:** [index.html](index.html)

**Added:**
1. Script import for account-restoration-modal.js (line 1148)
2. Dynamic modal HTML loading (lines 1164-1171)

```javascript
// Load account restoration modal HTML
fetch('modals/common-modals/account-restoration-modal.html')
    .then(response => response.text())
    .then(html => {
        document.body.insertAdjacentHTML('beforeend', html);
        console.log('✅ Account Restoration Modal loaded for index');
    })
    .catch(err => console.error('Failed to load account-restoration-modal:', err));
```

---

### 5. Updated Deletion Countdown Banner
**File:** [js/common-modals/deletion-countdown-banner.js](js/common-modals/deletion-countdown-banner.js)

**Changes:**
- Removed `checkAccountDeletion()` method
- Removed account deletion color logic from `showBanner()`
- Now ONLY handles role deletion in dropdown banner
- Account deletion is handled by restoration modal

**Updated Comment:**
```javascript
/**
 * Deletion Countdown Banner
 * Shows a warning banner in profile dropdown when a user has a ROLE scheduled for deletion
 *
 * NOTE: Account deletion is handled separately by account-restoration-modal.js
 */
```

---

## API Endpoints Used

### Get Account Deletion Status
```http
GET /api/account/delete/status
Authorization: Bearer {access_token}

Response (Has Pending Deletion):
{
  "success": true,
  "has_pending_deletion": true,
  "status": "pending",
  "requested_at": "2026-01-26T10:30:00",
  "scheduled_deletion_at": "2026-04-26T10:30:00",
  "days_remaining": 90,
  "deletion_fee": 200.00,
  "reasons": ["not_useful", "too_expensive"],
  "other_reason": "Found a better platform"
}

Response (No Pending Deletion):
{
  "success": true,
  "has_pending_deletion": false
}
```

### Cancel Account Deletion
```http
POST /api/account/delete/cancel
Authorization: Bearer {access_token}
Content-Type: application/json

Response:
{
  "success": true,
  "message": "Account deletion cancelled successfully",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "account_status": "active",
    "is_active": true
  }
}
```

---

## User Experience Flow

### Scenario: User Schedules Account Deletion Then Logs Back In

#### Step 1: User Schedules Deletion
1. Navigate to profile page → Settings panel
2. Click "Leave Astegni" (red card)
3. Complete deletion flow (type DELETE, reasons, OTP, password)
4. Account scheduled for deletion
5. User logged out
6. Redirected to homepage

#### Step 2: User Logs Back In (Within 90 Days)
1. Click "Login" on homepage
2. Enter email and password
3. Click "Login" button

#### Step 3: Restoration Modal Appears
**Instead of redirecting to profile, the restoration modal appears:**

```
┌─────────────────────────────────────────────────────────────┐
│                  ⚠️  RED WARNING ICON                        │
│                                                             │
│           Account Scheduled for Deletion                    │
│       Your account is scheduled to be permanently deleted   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                        90                                   │
│                   Days Remaining                            │
│       Deletion scheduled for: Sunday, April 27, 2026        │
│         Time remaining: 90 days, 3 hours, 22 minutes        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│   What Will Be Deleted:                                     │
│   • All your profile data                                   │
│   • All uploaded files                                      │
│   • All chat messages                                       │
│   • All connections and reviews                             │
│   • All coursework and credentials                          │
│   • Your entire account                                     │
├─────────────────────────────────────────────────────────────┤
│   Reason for Leaving:                                       │
│   Not useful for me, Too expensive                          │
├─────────────────────────────────────────────────────────────┤
│  [✓ Recover My Account]  [→ Continue to Account]           │
│                                                             │
│      This deletion was requested on January 26, 2026        │
└─────────────────────────────────────────────────────────────┘
```

#### Step 4a: User Clicks "Recover My Account"
1. Button shows loading spinner: "Recovering..."
2. API call: `POST /api/account/delete/cancel`
3. Success message appears:
   ```
   ✅ Account Recovered!
   Your account has been successfully restored.
   Refreshing page...
   ```
4. Page refreshes after 2 seconds
5. User is fully restored, proceeds to profile

#### Step 4b: User Clicks "Continue to Account"
1. Modal closes
2. User proceeds to profile page
3. Account still scheduled for deletion (user chose not to recover)
4. They can still recover later by going to Settings

---

## Visual Design

### Modal Styling

**Colors:**
- Background overlay: `rgba(0, 0, 0, 0.75)` with blur
- Modal background: White (`#FFFFFF`)
- Warning background: Red gradient (`#FEE2E2` to `#FECACA`)
- Border: Red (`#EF4444`)
- Countdown number: Large red text (`#DC2626`)

**Animations:**
- Modal slide-in on appear
- Countdown number pulse effect (scale + color shift)
- Button hover effects (transform + shadow)

**Layout:**
- Max width: 42rem (672px)
- Centered on screen
- Max height: 95vh (scrollable if content overflows)
- Border radius: 1rem
- Padding: 2rem

---

## Dark Theme Support

```css
html.dark #account-restoration-modal .modal-content {
    background: #1F2937;
}

html.dark #account-restoration-modal h3,
html.dark #account-restoration-modal h4 {
    color: #F9FAFB;
}

html.dark #account-restoration-modal .bg-red-50 {
    background: #7F1D1D;
    border-color: #991B1B;
}

html.dark #account-restoration-modal #restoration-days-remaining {
    color: #FCA5A5;
}
```

---

## Testing Guide

### Manual Test Steps

1. **Setup Account Deletion:**
   ```bash
   # Login to Astegni
   # Go to profile → Settings → Leave Astegni
   # Complete deletion flow
   # Verify logged out
   ```

2. **Test Restoration Modal:**
   ```bash
   # Go to homepage
   # Click "Login"
   # Enter credentials
   # Click "Login" button

   Expected: Restoration modal appears (no redirect)
   ```

3. **Verify Modal Content:**
   ```
   ✓ Days remaining displayed (should be 90)
   ✓ Deletion date shown (90 days in future)
   ✓ Time remaining detailed (days, hours, minutes)
   ✓ "What Will Be Deleted" list present
   ✓ Reason for leaving shown (if provided)
   ✓ Two buttons visible
   ```

4. **Test Recovery:**
   ```bash
   # Click "Recover My Account"
   # Wait for loading spinner
   # Wait for success message
   # Page should refresh
   # Verify redirected to profile
   ```

5. **Verify Database:**
   ```sql
   SELECT id, email, account_status, is_active, scheduled_deletion_at
   FROM users
   WHERE email = 'test@example.com';

   -- After recovery, should show:
   -- account_status: 'active'
   -- is_active: true
   -- scheduled_deletion_at: NULL
   ```

6. **Test "Continue to Account":**
   ```bash
   # Login again (schedule deletion first)
   # Click "Continue to Account"
   # Modal should close
   # Should redirect to profile
   # Account still scheduled for deletion
   ```

---

## Browser Console Logs

### Expected Log Sequence (Normal Login)
```
[Login] Checking for scheduled account deletion...
[AccountRestoration] Could not check deletion status
(Modal does not appear)
(User redirected to profile)
```

### Expected Log Sequence (Scheduled Deletion)
```
[Login] Checking for scheduled account deletion...
[AccountRestoration] Account scheduled for deletion - showing modal
[AccountRestoration] Showing banner for role: entire account (90 days remaining)
(Modal appears, no redirect)
```

### Expected Log Sequence (Recovery)
```
(User clicks "Recover My Account")
[AccountRestoration] Account recovered successfully
(Success message appears)
(Page refreshes after 2 seconds)
```

---

## Backend Requirements

### Endpoints Must Exist

1. **GET /api/account/delete/status**
   - Returns deletion status for current user
   - Located in: `astegni-backend/account_deletion_endpoints.py`
   - Line: ~223

2. **POST /api/account/delete/cancel**
   - Cancels pending deletion
   - Restores account to active status
   - Clears `scheduled_deletion_at`
   - Located in: `astegni-backend/account_deletion_endpoints.py`

### Database Columns Required

**Table:** `users`
```sql
-- Must have these columns:
account_status VARCHAR(50)  -- 'active', 'pending_deletion', 'deleted'
is_active BOOLEAN           -- true/false
scheduled_deletion_at TIMESTAMP  -- NULL when active
```

**Table:** `account_deletion_requests`
```sql
-- Must have these columns:
user_id INTEGER
status VARCHAR(50)           -- 'pending', 'completed', 'cancelled'
requested_at TIMESTAMP
scheduled_deletion_at TIMESTAMP
reasons TEXT[]
other_reason TEXT
deletion_fee DECIMAL(10, 2)
```

---

## Troubleshooting

### Modal Not Appearing After Login

**Check:**
1. Is account actually scheduled for deletion?
   ```sql
   SELECT account_status, scheduled_deletion_at
   FROM users
   WHERE email = 'test@example.com';
   ```
2. Is `account-restoration-modal.html` loaded?
   - Open DevTools → Elements tab
   - Search for `id="account-restoration-modal"`
3. Is JavaScript file loaded?
   - Check Network tab for `account-restoration-modal.js`
4. Check browser console for errors
5. Verify API endpoint returns correct data:
   ```javascript
   // In browser console:
   const token = localStorage.getItem('access_token');
   fetch('http://localhost:8000/api/account/delete/status', {
       headers: {'Authorization': `Bearer ${token}`}
   }).then(r => r.json()).then(console.log);
   ```

---

### Modal Appears But "Recover" Button Doesn't Work

**Check:**
1. Browser console for error messages
2. Network tab for failed API calls
3. Backend endpoint exists: `POST /api/account/delete/cancel`
4. Token is valid (not expired)
5. User ID matches deletion request

---

### Page Redirects Instead of Showing Modal

**Check:**
1. Is `window.AccountRestorationModal` defined?
   ```javascript
   // In browser console:
   console.log(window.AccountRestorationModal);
   // Should show object with methods
   ```
2. Is modal check happening in login flow?
   - Add breakpoint at line 370 in `profile-and-authentication.js`
3. Check if modal HTML loaded before login
   - Modal must be in DOM before login completes

---

## Comparison: Old vs New System

### OLD System (Incorrect)
❌ User schedules account deletion → Logs out
❌ User logs back in → Sees countdown banner in dropdown
❌ Banner is small, easy to miss
❌ User might not notice they can restore

### NEW System (Correct)
✅ User schedules account deletion → Logs out
✅ User logs back in → Full-screen restoration modal appears immediately
✅ Modal is impossible to miss
✅ Clear "Recover My Account" button
✅ Detailed information about what will be deleted
✅ User must explicitly choose to recover or continue

---

## Summary

### Files Created
1. `modals/common-modals/account-restoration-modal.html` - Modal UI
2. `js/common-modals/account-restoration-modal.js` - Modal logic

### Files Modified
1. `js/index/profile-and-authentication.js` - Added account deletion check in login flow
2. `index.html` - Added modal HTML/JS loading
3. `js/common-modals/deletion-countdown-banner.js` - Removed account deletion handling

### Key Features
- ✅ Full-screen modal on login (impossible to miss)
- ✅ Large countdown with days, hours, minutes
- ✅ Detailed deletion information
- ✅ One-click recovery (no password needed)
- ✅ Option to continue with deletion
- ✅ Dark theme support
- ✅ Smooth animations
- ✅ Clear visual hierarchy

### User Benefits
1. **Can't be missed** - Full-screen modal vs small dropdown banner
2. **Clear information** - Exactly what will be deleted and when
3. **Easy recovery** - One button click, no complex flow
4. **Informed choice** - See reasons for leaving, make conscious decision
5. **Better UX** - Professional, polished modal design

---

**Last Updated:** 2026-01-26
**Version:** 1.0
**Author:** Claude Code (Sonnet 4.5)
