# Profile Container Not Updating After Role Switch - Fixed

## Problem

After switching roles (e.g., student → tutor), the role switch succeeded and the page navigation worked, but the **profile container wasn't updating** to show the new role's information. The profile header would still show the old role's name/data.

## Root Cause

When a role switch happened:

1. ✅ API call succeeds → Database updated
2. ✅ `localStorage.userRole` updated to new role
3. ✅ Page navigates to new profile page
4. ✅ Grace period protection prevents redirects
5. ❌ **BUT**: The profile UI still showed the old role's data

The issue was that `AuthManager.restoreSession()` was updating its internal `user` object with the new role, but the **profile-system module** (which displays the profile header/name) wasn't being notified of this change.

### Why This Happened

- `auth.js` and `profile-system.js` are separate modules
- When `AuthManager` updated the user object during grace period, `profile-system` had no way to know
- `profile-system.js` maintains its own `currentUser` variable that wasn't being refreshed
- The `updateUI()` function in `profile-system.js` was never called after the role switch

## Solution

Implemented an **event-based notification system** to communicate between modules:

### 1. AuthManager Dispatches Event After Role Update

**File**: `js/root/auth.js` (lines 116-125)

When a grace period is detected and the user role is forced to the new role:

```javascript
// CRITICAL: Update the currentUser object in localStorage with the new role
localStorage.setItem('currentUser', JSON.stringify(this.user));
console.log('[AuthManager.restoreSession] Updated localStorage.currentUser with new role');

// Dispatch event to notify profile-system to refresh the UI
window.dispatchEvent(new CustomEvent('userRoleUpdated', {
    detail: { role: targetRole, user: this.user }
}));
console.log('[AuthManager.restoreSession] Dispatched userRoleUpdated event');
```

**Key Points**:
- Updates `localStorage.currentUser` with the new role data
- Dispatches a custom `userRoleUpdated` event with the new role details
- This happens immediately after forcing the role during grace period

### 2. ProfileSystem Listens for Role Updates

**File**: `js/root/profile-system.js` (lines 1974-1994)

Added an event listener that responds to role changes:

```javascript
// Listen for role updates from AuthManager (triggered after grace period role switch)
window.addEventListener('userRoleUpdated', function(event) {
    console.log('[profile-system] userRoleUpdated event received:', event.detail);

    // Reload currentUser from localStorage (AuthManager already updated it)
    const updatedUser = localStorage.getItem('currentUser');
    if (updatedUser) {
        try {
            const user = JSON.parse(updatedUser);
            console.log('[profile-system] Refreshing UI with updated user:', user);

            // Call updateUI to refresh the profile display
            if (ProfileSystem && ProfileSystem.updateUI) {
                ProfileSystem.updateUI();
                console.log('[profile-system] UI refreshed after role switch');
            }
        } catch (error) {
            console.error('[profile-system] Error parsing updated user:', error);
        }
    }
});
```

**Key Points**:
- Listens for the `userRoleUpdated` custom event
- Reloads the user data from `localStorage.currentUser`
- Calls `ProfileSystem.updateUI()` to refresh the profile display
- Updates the profile name, avatar, and other UI elements

## How It Works Now

### Complete Flow After Role Switch:

```
T+0ms:    User clicks "Switch to Tutor"
T+100ms:  API call succeeds
          - Database updated: active_role = 'tutor'
          - localStorage.userRole = 'tutor'
          - localStorage.currentUser updated
          - AuthManager.user.active_role = 'tutor'
          - Grace period flags set

T+200ms:  Navigation to tutor-profile.html

T+300ms:  Page starts loading

T+400ms:  AuthManager.restoreSession() runs
          - Loads user from localStorage
          - ✅ DETECTS grace period flags
          - ✅ FORCES user.active_role = 'tutor'
          - ✅ UPDATES localStorage.currentUser
          - ✅ DISPATCHES 'userRoleUpdated' event

T+450ms:  profile-system receives event
          - ✅ Reloads currentUser from localStorage
          - ✅ Calls ProfileSystem.updateUI()
          - ✅ Profile header updates with tutor data

T+500ms:  Page init.js runs
          - Checks grace period (still valid)
          - ✅ Skips validation
          - Page loads successfully

RESULT:   ✅ Correct role displayed
          ✅ Profile UI shows tutor information
          ✅ No redirects
```

## Benefits

1. **Modular Communication**: Clean event-based system allows modules to communicate without tight coupling
2. **Immediate UI Update**: Profile container updates as soon as the page loads
3. **No Race Conditions**: Event fires after all state is updated
4. **Debuggable**: Console logs show exactly when UI refresh happens
5. **Reusable**: Other modules can listen for `userRoleUpdated` event if needed

## Testing

To verify the fix works:

1. Log in with a multi-role account
2. Switch from one role to another (e.g., student → tutor)
3. Watch the console logs:
   ```
   [AuthManager.restoreSession] ✅ Within grace period - forcing active_role to: tutor
   [AuthManager.restoreSession] Updated localStorage.currentUser with new role
   [AuthManager.restoreSession] Dispatched userRoleUpdated event
   [profile-system] userRoleUpdated event received
   [profile-system] Refreshing UI with updated user
   [profile-system] UI refreshed after role switch
   ```
4. Profile header should show the NEW role's information immediately
5. No redirects, page stays loaded

## Files Modified

- ✅ `js/root/auth.js` - Dispatch event after grace period role update
- ✅ `js/root/profile-system.js` - Listen for role updates and refresh UI

## Related Fixes

This fix works in conjunction with:
- `ROLE_SWITCH_RACE_CONDITION_FIX.md` - Prevents premature grace period flag clearing
- `ROLE_SWITCHING_COMPLETE_FIX.md` - Original role switching implementation
