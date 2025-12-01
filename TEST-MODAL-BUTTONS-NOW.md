# Test Modal Buttons - Step by Step

## Step 1: Hard Refresh Browser
**IMPORTANT:** You MUST do a hard refresh to clear cached JavaScript:

### Windows/Linux:
- **Ctrl + F5** (hard refresh)
- Or **Ctrl + Shift + R**

### Mac:
- **Cmd + Shift + R**

---

## Step 2: Open Browser Console
Press **F12** or right-click → Inspect → Console tab

---

## Step 3: Look for Registration Message

You should see this in the console:
```
🔧 Registering profile extensions modal functions...
✅ Profile extensions modal functions registered: {
    openUploadCertificationModal: "function",
    openAddAchievementModal: "function",
    openAddExperienceModal: "function"
}
```

**If you DON'T see this**, the script has an error and isn't loading.

---

## Step 4: Manual Test in Console

Type this in the console:
```javascript
typeof window.openUploadCertificationModal
```

**Expected result:** `"function"`
**If you get:** `"undefined"` → Script didn't load or has error

---

## Step 5: Test the Buttons

1. Navigate to **Certifications panel**
2. Click **"Upload Certification"** button
3. Modal should open

Repeat for:
- **Achievements panel** → "Add Achievement" button
- **Experience panel** → "Add Experience" button

---

## If Buttons Still Don't Work

### Check Console for Errors
Look for:
```
Uncaught ReferenceError: openUploadCertificationModal is not defined
```

### If You See This Error:
The script has a syntax error or isn't loading. Check console for:
```
Uncaught SyntaxError: ...
```

### Common Issues:

1. **Browser cached old file**
   - Solution: Hard refresh (Ctrl+F5)
   - Or clear browser cache completely

2. **Script has syntax error**
   - Look for red errors in console
   - Check if you see the registration message

3. **Script loaded in wrong order**
   - Should load before init.js (already correct)

---

## Debugging Steps

### Step 1: Check if Script Loaded
In console, type:
```javascript
console.log('Extensions:', {
    cert: typeof openUploadCertificationModal,
    ach: typeof openAddAchievementModal,
    exp: typeof openAddExperienceModal
});
```

### Step 2: Check for API_BASE_URL Error
In console, look for:
```
Uncaught SyntaxError: Identifier 'API_BASE_URL' has already been declared
```

**If you see this:** I already fixed it, but you need to hard refresh!

### Step 3: Manually Call Function
In console, type:
```javascript
openUploadCertificationModal()
```

**If modal opens:** Button onclick is broken
**If you get error:** Function not registered

---

## Expected Behavior After Fix

### Console Should Show:
1. ✅ No syntax errors
2. ✅ Registration message appears
3. ✅ Functions are type "function"

### Buttons Should:
1. ✅ Open modal when clicked
2. ✅ Not show any console errors
3. ✅ Modal has proper styling

---

## Next Steps After Buttons Work

Once modals open, you'll still see **422 errors** when loading data because:
- Backend server hasn't been restarted yet
- Route conflict fix not applied yet

**After buttons work, restart backend:**
```bash
cd astegni-backend
# Ctrl+C to stop
python app.py
```

Then the data will load properly!
