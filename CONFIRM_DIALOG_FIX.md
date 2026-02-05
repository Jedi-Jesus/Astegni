# Confirm Dialog Grace Period Fix

## Root Cause Found!

The grace period was expiring because the **timestamp was set BEFORE the confirm dialog**, not after.

### The Problem Flow (Before Fix):

1. User clicks role switcher
2. `localStorage.role_switch_timestamp` = 1769348059387 ✅ **Set here**
3. `confirm("Go to your tutor profile now?")` dialog appears 🛑 **JavaScript pauses**
4. User waits... 10 seconds... 30 seconds... 63 seconds... ⏰
5. User clicks "OK"
6. Navigation happens: `window.location.href = profileUrl`
7. **Page loads 63+ seconds later**
8. Grace period check: `63911ms > 5000ms` ❌ **EXPIRED!**
9. Alert: "This page is for tutors only..."

### The Fix:

**Move timestamp setting to AFTER confirm dialog is accepted:**

```javascript
setTimeout(() => {
    if (confirm(switchMessage)) {
        // ✅ Set timestamp RIGHT HERE (after user clicks OK)
        const switchTimestamp = Date.now();
        localStorage.setItem('role_switch_timestamp', switchTimestamp.toString());
        localStorage.setItem('role_switch_target', data.active_role);

        // Navigate immediately
        window.location.href = profileUrl;
    }
}, 500);
```

### Why This Works:

1. User clicks role switcher
2. Confirm dialog appears: "Go to your tutor profile now?"
3. User waits... (grace period **hasn't started yet**)
4. User clicks "OK"
5. `localStorage.role_switch_timestamp` = **NOW** ✅
6. Navigation happens immediately
7. Page loads within ~500-2000ms ✅
8. Grace period check: `1500ms < 5000ms` ✅ **VALID!**
9. Page loads successfully, no alert!

## Files Modified

- `js/root/profile-system.js` - Line 1478-1492: Moved timestamp setting inside confirm callback

## Testing

Try role switching again:
1. Click role switcher (Student → Tutor)
2. See confirm dialog
3. Wait as long as you want
4. Click OK
5. Page should load without the alert!

The grace period now starts **when you click OK**, not when you see the dialog.
