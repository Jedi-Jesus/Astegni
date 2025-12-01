# Test Market Trend Feature Now - Quick Guide

## 🚀 Quick Start (3 Steps)

### Step 1: Start Servers
```bash
# Terminal 1 - Backend
cd astegni-backend
python app.py

# Terminal 2 - Frontend
cd ..
python -m http.server 8080
```

### Step 2: Open in Browser
```
http://localhost:8080/profile-pages/tutor-profile.html
```

### Step 3: Navigate to Market Trends
1. Login as tutor (or skip if already on tutor profile)
2. Scroll to "Package Management" section (middle of page)
3. Click **"Manage Packages"** button
4. Click **📈 Market Trends** icon in left sidebar (icon bar)

---

## ✅ 60-Second Test Checklist

**Visual Verification (10 seconds):**
- [ ] Modal opens full width (1600px max)
- [ ] Header shows "📈 Market Trends & Insights"
- [ ] Three view buttons visible: [Market Graph] [Market Table] [Suggest Price]
- [ ] "Market Graph" button is orange/yellow (active state)

**Graph View Test (20 seconds):**
- [ ] Interactive chart displays with colorful lines/bars
- [ ] Time slider shows "3 months"
- [ ] Graph type dropdown shows "Line Graph"
- [ ] Six dataset checkboxes below chart (all checked)
- [ ] **Move slider to 6** → Graph updates with new data
- [ ] **Change to "Bar Graph"** → Chart switches to bars
- [ ] **Uncheck "Avg Price"** → Yellow dataset disappears

**Table View Test (15 seconds):**
- [ ] Click **"Market Table"** button
- [ ] Data table appears with 7 columns
- [ ] Achievement column shows +/− with green/red colors
- [ ] **Hover over info icon (ⓘ)** → Tooltip appears
- [ ] **Move time slider** → Table data updates

**Price Suggestion Test (15 seconds):**
- [ ] Click **"Suggest Price"** button
- [ ] Calculator view appears with time slider
- [ ] Click **"Calculate Suggested Price"** button
- [ ] Result box shows:
   - Ethiopian tutor name (e.g., "Dear Abebe Tadesse,")
   - Rating (e.g., "Your Rating: 4.8")
   - Suggested price (e.g., "220 ETB/hour")
   - Detailed breakdown with 4 bullet points

**Done!** ✅ If all checkboxes passed, feature works perfectly.

---

## 🎯 Key Interactions to Try

### Time Slider Magic
1. **Graph View** → Move slider from 3 to 12
   - Watch dataset values change
   - Notice price increases over time
2. **Switch to Table** → Slider stays at 12
   - Table shows 12-month data
   - Time synced across views
3. **Switch to Price** → Slider still at 12
   - Click "Calculate"
   - Notice higher price due to +45% time factor

### Dataset Toggles
1. **Uncheck all 6 checkboxes** → Graph shows empty axes
2. **Check only "Avg Price"** → Single yellow dataset
3. **Add "Avg Achievement"** → Two datasets, easy comparison
4. **Check all again** → Full market overview

### Graph Type Switching
1. **Line Graph** → See trends over ratings
2. **Bar Graph** → Compare values side-by-side
3. **Switch back and forth** → Data persists

---

## 🐛 What to Look For (Error Checking)

### Console (F12 → Console Tab)
**Expected Messages:**
```
✅ Market trend functions loaded successfully
🔄 Switching market view to: graph
📊 Updating market graph...
✅ Market graph rendered successfully
```

**No Red Errors:**
- If you see "Chart is not defined" → Chart.js CDN not loaded
- If you see "Cannot read property..." → Check HTML structure

### Visual Bugs
- [ ] Chart not displaying → Check canvas element exists
- [ ] Slider not moving → Check input range element
- [ ] Buttons not switching → Check onclick handlers
- [ ] Table empty → Check tutorDataByTime data exists

### Theme Switching
1. Find theme toggle button (usually in header/settings)
2. Switch to **Dark Mode**:
   - [ ] Active button turns yellow (not orange)
   - [ ] Table header turns yellow gradient
   - [ ] Background colors darken
   - [ ] Text remains readable
3. Switch back to **Light Mode**:
   - [ ] Active button turns orange
   - [ ] All colors revert correctly

---

## 📊 Sample Data Overview

**What You'll See:**
- **8 Ethiopian tutors** per time period
- **Ratings:** 3.9 to 5.0
- **Prices:** 120 to 350 ETB per hour
- **Time periods:** 3, 6, 9, 12 months
- **Metrics tracked:**
  1. Number of tutors at each rating level
  2. Average students per tutor
  3. Average achievement % (+ or −)
  4. Average price per hour (ETB)
  5. Average certifications
  6. Average experience (years)

**Sample Tutors:**
- Abebe Tadesse (4.8 rating, 200 ETB/hr)
- Hana Mekonnen (4.2 rating, 150 ETB/hr)
- Yohannes Haile (4.5 rating, 250 ETB/hr)
- Sara Desta (3.9 rating, 120 ETB/hr)
- Dawit Tesfaye (4.7 rating, 220 ETB/hr)
- Marta Bekele (4.6 rating, 210 ETB/hr)
- Alemayehu Girma (4.3 rating, 170 ETB/hr)
- Tigist Solomon (4.9 rating, 280 ETB/hr)

---

## 🎨 Visual Examples

### Expected Graph Appearance
```
┌─────────────────────────────────────────────────────────────┐
│          Market Trends by Rating (3 Months)                 │
├─────────────────────────────────────────────────────────────┤
│  35 ┤                                                    ●   │
│  30 ┤                                              ●         │
│  25 ┤                              ●                         │
│  20 ┤               ●                                        │
│  15 ┤        ●                                               │
│  10 ┤  ●                                                     │
│   5 ┤                                                        │
│   0 └─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────       │
│        3.9   4.2   4.3   4.5   4.6   4.7   4.8   4.9       │
│                        Rating                                │
│                                                               │
│  Legend:                                                     │
│  ● Tutors  ● Students  ● Achievement  ● Price               │
│  ● Certifications  ● Experience                             │
└─────────────────────────────────────────────────────────────┘
```

### Expected Table Appearance
```
┌────────────────────────────────────────────────────────────────┐
│ Rating │ Tutors │ Students │ Achievement │ Certs │ Exp │ Price │
├────────┼────────┼──────────┼─────────────┼───────┼─────┼───────┤
│  3.9   │   1    │   10.0   │   −8.0 🔴   │  0.0  │ 2.0 │120.00 │
│  4.0   │   0    │   0.0    │    0.0      │  0.0  │ 0.0 │  0.00 │
│  4.2   │   1    │   15.0   │  +10.0 🟢   │  1.0  │ 3.0 │150.00 │
│  4.3   │   1    │   18.0   │  +12.0 🟢   │  1.0  │ 4.0 │170.00 │
│  4.5   │   1    │   25.0   │  +20.0 🟢   │  3.0  │ 7.0 │250.00 │
│  4.6   │   1    │   22.0   │  +16.0 🟢   │  2.0  │ 5.0 │210.00 │
│  4.7   │   1    │   30.0   │  +18.0 🟢   │  2.0  │ 6.0 │220.00 │
│  4.8   │   1    │   20.0   │  +15.0 🟢   │  2.0  │ 5.0 │200.00 │
│  4.9   │   1    │   35.0   │  +22.0 🟢   │  3.0  │ 8.0 │280.00 │
└────────┴────────┴──────────┴─────────────┴───────┴─────┴───────┘
```

### Expected Price Suggestion
```
┌─────────────────────────────────────────────────────────────┐
│  Dear Abebe Tadesse,                                        │
│                                                               │
│  Your Rating: 4.8                                           │
│                                                               │
│  Based on your rating, your suggested hourly price is:      │
│  220 ETB                                                    │
│  (Based on 3-month market trends)                           │
│                                                               │
│  ───────────────────────────────────────────────────────    │
│                                                               │
│  Breakdown:                                                  │
│  • Matched with 2 tutor(s) with ratings between 4.7 and 4.9│
│  • Average price of similar tutors: 210.00 ETB             │
│  • Time adjustment: +0% for 3-month trends                  │
│  • Final suggested range: 200-240 ETB                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎉 Success Criteria

**Feature is working if:**
1. ✅ All 3 view modes switch correctly
2. ✅ Time slider updates data in real-time
3. ✅ Graph displays 6 datasets with correct colors
4. ✅ Table shows aggregated data by rating
5. ✅ Price suggestion calculates and displays breakdown
6. ✅ Theme switching works (light/dark)
7. ✅ No console errors (red messages)
8. ✅ Animations are smooth (no lag)
9. ✅ Sidebar auto-collapses when viewing market trends
10. ✅ Can switch back to packages view

**If ANY fail, check:**
- Chart.js CDN loaded? (view page source, search for "chart.js")
- JavaScript file loaded? (view page source, search for "market-trend-functions.js")
- CSS file loaded? (view page source, search for "market-trend-styles.css")
- Console errors? (F12 → Console tab)

---

## 🆘 Quick Troubleshooting

### Issue: "Chart is not defined"
**Fix:** Check that Chart.js CDN is in `<head>` section of tutor-profile.html
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
```

### Issue: Graph not displaying
**Fix:**
1. Check canvas element exists: `document.getElementById('marketChart')`
2. Check spinner is hiding: `document.getElementById('marketSpinner').style.display`
3. Clear browser cache (Ctrl+Shift+R)

### Issue: Buttons not switching views
**Fix:**
1. Check onclick handlers: `onclick="toggleMarketView('graph')"`
2. Check function exists: `typeof window.toggleMarketView` should be "function"
3. Check console for JavaScript errors

### Issue: Time slider not updating
**Fix:**
1. Check oninput handler: `oninput="updateMarketTimePeriod(this.value)"`
2. Check function exists: `typeof window.updateMarketTimePeriod` should be "function"
3. Check slider value attribute: `<input type="range" ... value="3">`

### Issue: Dark theme not working
**Fix:**
1. Verify theme toggle sets `[data-theme="dark"]` on `<body>` or `<html>`
2. Check CSS has `[data-theme="dark"]` selectors
3. Clear browser cache

---

## 📞 Support

**Files to Check:**
- [MARKET-TREND-COMPLETE-INTEGRATION.md](MARKET-TREND-COMPLETE-INTEGRATION.md) - Full documentation
- [MARKET-TREND-QUICK-SUMMARY.md](MARKET-TREND-QUICK-SUMMARY.md) - Overview

**Console Commands (F12):**
```javascript
// Check if functions loaded
typeof window.toggleMarketView          // Should be "function"
typeof window.updateMarketGraph         // Should be "function"
typeof window.suggestMarketPrice        // Should be "function"

// Check if Chart.js loaded
typeof Chart                            // Should be "function"

// Check if data exists
tutorDataByTime                         // Should show object with keys 3,6,9,12

// Manually trigger functions
updateMarketGraph()                     // Should render graph
populateMarketTable()                   // Should fill table
suggestMarketPrice()                    // Should show price
```

---

**Ready to Test!** 🚀

**Estimated Time:** 60 seconds for quick test, 5 minutes for thorough test

**Status:** ✅ All files in place, ready for testing
**Date:** 2025-11-23
