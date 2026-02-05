# DEEP DEBUG GUIDE - Role Filters Not Responding

## What I Added for Debugging

I've added **console logs** to track the script loading:

1. **Line 7**: `🟢 schedule-panel-manager.js STARTING TO LOAD...` (green)
2. **Line 1624**: `🟡 About to export functions to window...` (yellow)
3. **Line 1632**: `🟢 Functions exported to window!` (green)

## Step-by-Step Debugging

### STEP 1: Clear ALL Cache
1. Close the tutor-profile page completely
2. Press **Ctrl + Shift + Delete** (Chrome/Edge) or **Ctrl + Shift + Del** (Firefox)
3. Select:
   - ✅ Cached images and files
   - ✅ Cookies and site data (optional but recommended)
   - Time range: **All time**
4. Click "Clear data"

### STEP 2: Hard Refresh
1. Open tutor-profile.html
2. Press **Ctrl + Shift + R** (or Cmd + Shift + R on Mac)
3. Open browser console (F12 → Console tab)

### STEP 3: Check Console Output

You should see these messages in order:
```
🟢 schedule-panel-manager.js STARTING TO LOAD...
🟡 About to export functions to window...
filterSchedulesByRole function before export: function
🟢 Functions exported to window!
window.filterSchedulesByRole after export: function
🔧 Exported schedule functions - filterSchedulesByRole: function
✅ Search functions exported
✅ Schedule Panel Manager loaded successfully
```

### STEP 4: Diagnose Based on Output

**SCENARIO A: You see ALL the messages above**
- ✅ Script loaded successfully!
- ✅ Function is exported!
- Run this in console: `console.log(typeof window.filterSchedulesByRole);`
- Should show: `"function"`
- If it shows `"undefined"`, something is overwriting the function

**SCENARIO B: You see 🟢 STARTING but NOT 🟡 About to export**
- ❌ Script started loading but crashed midway
- Look for error messages in the console (red text)
- The error is somewhere between line 7 and line 1624

**SCENARIO C: You see NOTHING (no green messages)**
- ❌ Script is not loading at all!
- Check Network tab (F12 → Network)
- Filter by "schedule-panel-manager"
- If status is **404**: file path is wrong
- If status is **200** but no console logs: script might be empty or corrupted

**SCENARIO D: You see 🟢 Functions exported but typeof is still undefined**
- ❌ Function is being exported but then deleted/overwritten
- Check if another script is overwriting `window.filterSchedulesByRole`
- Run: `Object.getOwnPropertyDescriptor(window, 'filterSchedulesByRole');`

### STEP 5: Manual Test

If you see all the messages but button still doesn't work, run this in console:

```javascript
// Test 1: Check function exists
console.log(typeof window.filterSchedulesByRole);  // Should be "function"

// Test 2: Call function manually
await window.filterSchedulesByRole('tutor');

// Test 3: Check if button onclick is correct
const buttons = document.querySelectorAll('#schedule-role-filters button');
buttons.forEach((btn, i) => {
    console.log(`Button ${i}:`, btn.onclick);
});
```

### STEP 6: If All Else Fails - Manual Function Injection

Paste this in console:

```javascript
// Force reload the script with unique timestamp
const script = document.createElement('script');
script.src = `../js/tutor-profile/schedule-panel-manager.js?v=${Date.now()}`;
script.onload = () => console.log('✅ Script manually loaded!');
script.onerror = () => console.log('❌ Script failed to load!');
document.head.appendChild(script);

// Wait 2 seconds, then test
setTimeout(() => {
    console.log('Function type:', typeof window.filterSchedulesByRole);
    if (typeof window.filterSchedulesByRole === 'function') {
        console.log('✅ SUCCESS! Function is now available!');
    } else {
        console.log('❌ FAILED! Function still not available.');
    }
}, 2000);
```

## Key Files Updated
- `js/tutor-profile/schedule-panel-manager.js` (added debug logs)
- `profile-pages/tutor-profile.html` (cache-busting: `?v=DEBUG20260204141530`)

## Next Steps

After you follow the steps above, report back what you see in the console!
