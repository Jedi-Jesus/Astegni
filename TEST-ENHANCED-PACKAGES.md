# Quick Test Guide - Enhanced Package Display

## What's New? 🎉

Your packages panel now shows **ALL** the important information:

✅ **Courses** taught (e.g., "Algebra, Geometry, Trigonometry")
✅ **Schedule** with specific days and times (e.g., "Mon, Wed, Fri (14:00-15:30)")
✅ **Payment frequency** (Monthly, Bi-weekly, etc.)
✅ **Discount badges** for 1 month, 6 months, and 1 year in beautiful colors!
✅ **"🔥 DISCOUNTS" ribbon** when discounts are available

## Quick Test (5 Minutes)

### Step 1: Restart Backend (IMPORTANT!)
The backend endpoint was updated, so you **must restart** it:

```bash
cd astegni-backend

# Stop the running backend (Ctrl+C if running)

# Start it again
python app.py
```

Wait for: `Application startup complete.`

### Step 2: Check Sample Data

Make sure you have packages in the database:

```bash
cd astegni-backend
python seed_tutor_packages.py
```

You should see: `Successfully created X tutor packages!`

### Step 3: Open View Tutor Page

```
http://localhost:8080/view-profiles/view-tutor.html?id=1
```

Replace `1` with an actual tutor ID that has packages.

### Step 4: Navigate to Packages Tab

Click the **"Packages"** tab in the profile navigation.

### Step 5: Verify Display

You should see package cards with:

#### Top Section:
- **🔥 DISCOUNTS** ribbon (top-right corner, if discounts exist)
- **Package name** (e.g., "Mathematics Complete Package")
- **Price** in large text (e.g., "ETB 375/session")

#### Discount Badges (if available):
- 🎁 Green badge: "X% OFF - 1 Month"
- 🎁 Blue badge: "X% OFF - 6 Months"
- 🎁 Purple badge: "X% OFF - 1 Year"

#### Description:
Package description text

#### Features List:
- 📚 **Courses:** Algebra, Geometry, Trigonometry
- ✔ **1 hour 30 min** per session
- 📅 **Schedule:** Monday, Wednesday, Friday (14:00 - 15:30)
- ✔ **12 sessions/month**
- ✔ **Online & In-person** (or just Online, or just In-person)
- ✔ **Grade 9-10**
- 💳 **Payment:** Monthly (or Bi-weekly)

#### Bottom:
- **"Request Session"** button (blue, hover effect)

## What Each Package Should Show

### Example 1: Mathematics Package
```
🔥 DISCOUNTS (ribbon)

Mathematics Complete Package
ETB 375/session

🎁 10% OFF - 6 Months  🎁 15% OFF - 1 Year

Comprehensive mathematics package covering all Grade 9-10 topics

📚 Courses: Algebra, Geometry, Trigonometry
✔ 1 hour 30 min per session
📅 Schedule: Monday, Wednesday, Friday (14:00 - 15:30)
✔ 12 sessions/month
✔ Online & In-person
✔ Grade 9-10
💳 Payment: Monthly

[Request Session Button]
```

### Example 2: English Package (No discounts)
```
English Language Package
ETB 180/session

Comprehensive English language learning package

📚 Courses: Grammar, Writing, Reading Comprehension, Speaking
✔ 1 hour per session
📅 Schedule: 3 days/week
✔ 12 sessions/month
✔ Online
✔ All Levels
💳 Payment: Monthly

[Request Session Button]
```

## Troubleshooting

### Problem: Discounts not showing
**Solution:** Check the database - the package needs `discount_1_month`, `discount_6_month`, or `discount_12_month` > 0

### Problem: Schedule shows "0 days/week"
**Solution:** The package needs either:
- `schedule_days` populated (e.g., "Monday,Wednesday,Friday")
- OR `days_per_week` set to a number

### Problem: Courses not showing
**Solution:** The `courses` field in the database must be populated (can be string or array)

### Problem: Payment frequency not showing
**Solution:** The `payment_frequency` field must be set (e.g., "monthly", "2-weeks")

### Problem: Backend error after restart
**Solution:** The database might not have the `discount_12_month` column. Run this migration:

```sql
ALTER TABLE tutor_packages ADD COLUMN IF NOT EXISTS discount_12_month DECIMAL(5,2) DEFAULT 0;
```

## Verify Backend Endpoint

Test the endpoint directly:

```
http://localhost:8000/api/view-tutor/1/packages
```

You should see JSON with these fields:
- `courses`
- `schedule_type`
- `recurring_days`
- `start_time`
- `end_time`
- `hours_per_day`
- `days_per_week`
- `payment_frequency`
- `discount_1_month`
- `discount_6_month`
- `discount_12_month`

## Expected Browser Console

Open DevTools (F12) → Console:

```
🚀 Initializing View Tutor DB Loader for tutor ID: 1
🔄 Loading tutor profile from database...
✓ Profile loaded: {...}
✓ Loaded X packages
✅ All data loaded successfully!
```

## Success Criteria ✅

- [ ] Packages load without errors
- [ ] Courses displayed with 📚 icon
- [ ] Schedule shows days and times
- [ ] Payment frequency shows with 💳 icon
- [ ] Discount badges appear in correct colors
- [ ] "🔥 DISCOUNTS" ribbon appears when discounts exist
- [ ] Empty state shows friendly message if no packages
- [ ] Cards are responsive (try resizing browser)
- [ ] Hover effects work on cards and buttons
- [ ] Theme variables work (try dark/light mode if supported)

## Common Test Scenarios

### Scenario 1: Tutor with no packages
**Expected:** Empty state message with 📦 icon

### Scenario 2: Tutor with 1 package
**Expected:** Single package card displayed correctly

### Scenario 3: Tutor with multiple packages
**Expected:** 3-column grid on desktop, responsive on mobile

### Scenario 4: Package with all discounts
**Expected:** All 3 discount badges (green, blue, purple) + ribbon

### Scenario 5: Package with recurring schedule
**Expected:** Specific days shown (e.g., "Monday, Wednesday, Friday")

### Scenario 6: Package with flexible schedule
**Expected:** "Flexible" displayed

## Next Steps After Testing

If everything looks good:

1. ✅ Test with different tutor IDs
2. ✅ Test on mobile devices
3. ✅ Test theme switching (if supported)
4. ✅ Test "Request Session" button functionality
5. ✅ Consider adding more visual enhancements

## Files to Check if Issues Occur

1. **Backend:** `astegni-backend/view_tutor_endpoints.py` (Lines 461-510)
2. **Frontend JS:** `js/view-tutor/view-tutor-db-loader.js` (Lines 1121-1274)
3. **Frontend HTML:** `view-profiles/view-tutor.html` (Lines 1173-1184)
4. **Sample Data:** `astegni-backend/seed_tutor_packages.py`

## Need Help?

Check the full documentation: `VIEW-TUTOR-PACKAGES-DYNAMIC-LOADING.md`

---

**Happy Testing! 🎉**
