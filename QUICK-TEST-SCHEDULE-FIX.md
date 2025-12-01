# Quick Test Guide: Schedule Specific Dates Fix

## ✅ What Was Fixed

The **date range picker** in the schedule modal had a timezone bug that caused dates to shift by one day in certain timezones (especially UTC+). This has been fixed!

## 🧪 Quick Test (5 minutes)

### Option 1: Visual Test Page
1. Open your browser to: `http://localhost:8080/test-schedule-specific-dates.html`
2. Click through all 4 test buttons:
   - ✅ Test 1: Add Single Date
   - ✅ Test 2: Add Date Range
   - ✅ Test 3: Timezone Edge Case
   - ✅ Test 4: Full Schedule Save
3. Verify all tests show green checkmarks

### Option 2: Full Integration Test
1. **Login as a tutor:**
   - Go to `http://localhost:8080`
   - Login with a tutor account
   - Navigate to your tutor profile page

2. **Open Schedule Modal:**
   - Scroll to "Teaching Schedules" section
   - Click "📅 Create Schedule" button

3. **Test Date Range Picker:**
   ```
   Fill in:
   - Title: "Test Specific Dates"
   - Subject: "Mathematics"
   - Grade Level: "Grade 9-10"
   - Year: 2025
   - Schedule Type: Select "Specific Dates" radio button
   ```

4. **Add dates using range picker:**
   ```
   In the "Date Range" section:
   - From Date: Select January 15, 2025
   - To Date: Select January 20, 2025
   - Click "➕ Add Date Range"
   ```

5. **Verify dates added correctly:**
   ```
   Should see in the "Selected Dates" list:
   ✓ Wed, Jan 15, 2025
   ✓ Thu, Jan 16, 2025
   ✓ Fri, Jan 17, 2025
   ✓ Sat, Jan 18, 2025
   ✓ Sun, Jan 19, 2025
   ✓ Mon, Jan 20, 2025

   Total: 6 dates
   ```

6. **Complete and save:**
   ```
   - Start Time: 09:00
   - End Time: 10:00
   - Click "Create Schedule"
   ```

7. **Verify in database:**
   ```
   - Should see success message
   - Schedule should appear in schedules list
   - Click "View" to see the schedule
   - Verify dates are correct (no day shifts!)
   ```

## 🐛 What to Look For (Bugs to Watch)

### ❌ OLD BUG (Should NOT happen now):
```
Selected: Jan 15 to Jan 20
Saved as: Jan 14 to Jan 19  ❌ (dates shifted!)
```

### ✅ CORRECT BEHAVIOR (Should happen now):
```
Selected: Jan 15 to Jan 20
Saved as: Jan 15 to Jan 20  ✅ (dates match!)
```

## 🌍 Timezone Test

Your current timezone affects how dates are processed:

**Check your timezone:**
```javascript
// Open browser console
console.log(Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log(new Date().getTimezoneOffset());
```

**Timezones that previously had issues:**
- UTC+3 (East Africa - Addis Ababa, Nairobi)
- UTC+8 (Asia - Singapore, Manila)
- UTC+10 (Australia - Sydney)

**Should work now in ALL timezones!**

## 📊 What Changed

### File Modified:
```
js/tutor-profile/global-functions.js
Function: addDateRange() (lines 2905-2938)
```

### Key Change:
```javascript
// OLD (buggy):
const dateString = currentDate.toISOString().split('T')[0];

// NEW (fixed):
const [year, month, day] = currentDateStr.split('-').map(Number);
const nextDate = new Date(Date.UTC(year, month - 1, day + 1));
currentDateStr = nextDate.toISOString().split('T')[0];
```

**Why it works:**
- Uses UTC directly instead of local time conversion
- Avoids timezone offset issues
- Preserves the exact date selected

## ✅ Verification Checklist

Test these scenarios:

- [ ] Single date picker works
- [ ] Date range picker works
- [ ] Adding same date twice shows "already added" message
- [ ] Dates appear in sorted order
- [ ] Can remove individual dates
- [ ] Schedule saves to database
- [ ] Schedule loads correctly when editing
- [ ] Schedule displays correctly in view modal
- [ ] Dates don't shift by ±1 day
- [ ] Works across different timezones

## 🚨 If You Still See Issues

1. **Clear browser cache:**
   - Press `Ctrl+Shift+R` (hard refresh)
   - Or clear cache completely

2. **Check file was updated:**
   ```bash
   # Verify the fix is in place
   grep -n "Date.UTC" js/tutor-profile/global-functions.js
   # Should show line 2936 with Date.UTC
   ```

3. **Check console for errors:**
   - Open browser DevTools (F12)
   - Look for JavaScript errors in Console tab
   - Look for failed API calls in Network tab

4. **Verify backend is running:**
   ```bash
   curl http://localhost:8000/api/tutor/schedules
   # Should return 401 (needs auth) not 404 or connection error
   ```

## 📝 Report Issues

If you still encounter problems:

1. Note your timezone
2. Note the exact dates you selected
3. Note the dates that were saved
4. Take a screenshot
5. Check browser console for errors
6. Report with all this information

## 🎉 Success Indicators

You'll know it's working when:
- ✅ Dates match what you selected
- ✅ No ±1 day shifts
- ✅ Date range adds all days inclusively
- ✅ Schedules save and load correctly
- ✅ No console errors

## 📚 Related Files

- `SCHEDULE-SPECIFIC-DATES-FIX.md` - Detailed technical explanation
- `test-schedule-specific-dates.html` - Visual test page
- `js/tutor-profile/global-functions.js` - Fixed code location
