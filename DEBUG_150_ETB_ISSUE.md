# Debugging 150 ETB Issue - Step by Step Guide

## Summary

**Database confirms**: There is NO 150 ETB in the database. Only 100 ETB and 200 ETB exist.

If you're seeing 150 ETB in the table/graph, it's from **browser cache** loading old JavaScript with hardcoded fallback data.

---

## Step-by-Step Debugging

### Step 1: Verify Database State ✅

Run this to confirm database has no 150 ETB:

```bash
cd astegni-backend
python debug_market_data_150.py
```

**Expected output:**
```
❌ No enrollments found with 150 ETB
ALL AGREED PRICES IN DATABASE
  100.00 ETB (Online) - 1 enrollments
  200.00 ETB (Online) - 1 enrollments
SIMILAR TUTORS (>65% similarity): 1
  Tutor 2: 100.00 ETB (similarity: 1.000)
CONCLUSION:
❌ 150 ETB is NOT in similar tutors!
```

✅ **CONFIRMED**: Database has no 150 ETB. Issue is frontend cache.

---

### Step 2: Check JavaScript Version

Open your browser console and look for this message when the page loads:

```
📊 Market Trend Functions v2.3.1 loaded - Fallback data removed
```

**If you DON'T see this message:**
- Your browser is loading OLD cached JavaScript (the one with fallback data)
- Proceed to Step 3 for cache clearing

**If you DO see this message but still see 150 ETB:**
- There might be another source (unlikely)
- Proceed to Step 4 for deep debugging

---

### Step 3: Clear Browser Cache (REQUIRED)

#### Option A: Hard Refresh (Quick)

1. Open the tutor profile page with market analysis
2. Press **Ctrl + Shift + R** (Windows) or **Cmd + Shift + R** (Mac)
3. This forces browser to reload JavaScript files
4. Check console for version message

#### Option B: Clear Cache via DevTools (Recommended)

1. Open DevTools (F12)
2. Right-click the **Refresh** button (next to address bar)
3. Select **"Empty Cache and Hard Reload"**
4. Check console for version message

#### Option C: Clear All Site Data (Nuclear Option)

1. Open DevTools (F12)
2. Go to **Application** tab
3. In left sidebar, expand **Storage**
4. Click **"Clear site data"** button
5. Refresh page
6. Log in again
7. Check console for version message

---

### Step 4: Use Debug Test Page

I've created a special debug page for you:

1. **Start backend server:**
   ```bash
   cd astegni-backend
   python app.py
   ```

2. **Start frontend server:**
   ```bash
   python dev-server.py
   ```

3. **Open debug page:**
   ```
   http://localhost:8081/test-market-150-debug.html
   ```

4. **Follow the 4 steps on the page:**
   - Step 1: Check Browser Cache (shows JavaScript version loaded)
   - Step 2: Test Market API Directly (shows raw API response)
   - Step 3: Check for Hardcoded Values (searches for "150" in memory)
   - Step 4: Aggregation Test (tests the data grouping logic)

5. **Look for these results:**
   - ✅ API should return only 100 ETB
   - ✅ No "150" should be found anywhere
   - ✅ Aggregated table should show 100 ETB

---

### Step 5: Verify Cache Clearing Worked

After clearing cache, open browser console on tutor profile page and run:

```javascript
// Check version
console.log('Version check:', typeof fetchMarketTutorData);
// Should log: "function"

// Check for fallback data
console.log('Has fallback?', typeof tutorDataByTime);
// Should log: "undefined" (good - no fallback data)

// Fetch real data
const token = localStorage.getItem('access_token') || localStorage.getItem('token');
fetch('http://localhost:8000/api/market-pricing/market-tutors', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
        time_period_months: 3,
        session_format: 'Online'
    })
})
.then(r => r.json())
.then(data => {
    console.log('API Data:', data);
    console.log('Prices:', data.tutors.map(t => t.price_per_hour));
    // Should log: [100]
});
```

---

### Step 6: Check Network Tab

1. Open DevTools (F12) → **Network** tab
2. Clear network log (trash icon)
3. Load the market analysis (open package modal → Market Analysis tab)
4. Filter by "market" in network tab
5. Click on `/api/market-pricing/market-tutors` request
6. Check **Response** tab
7. Look for `price_per_hour` values

**Expected response:**
```json
{
  "tutors": [
    {
      "id": 2,
      "price_per_hour": 100.0,
      "similarity_score": 1.000
    }
  ],
  "count": 1
}
```

**If you see 150 in response:** Backend issue (unlikely, we verified database)
**If you see 100 in response but table shows 150:** JavaScript cache issue

---

## Common Scenarios

### Scenario A: Console shows v2.3.1 message, API returns 100 ETB, but table shows 150 ETB

**This is extremely rare.** It means:
- Correct JavaScript is loaded
- API is correct
- But some OTHER code is injecting 150 ETB

**Debug steps:**
1. Check if there are multiple market-trend-functions.js files loaded:
   ```javascript
   document.querySelectorAll('script[src*="market-trend"]').forEach(s => console.log(s.src))
   ```

2. Search all loaded scripts for "150":
   ```javascript
   for (let key in window) {
       if (typeof window[key] === 'object') {
           try {
               if (JSON.stringify(window[key]).includes('150')) {
                   console.log('Found 150 in:', key);
               }
           } catch(e) {}
       }
   }
   ```

### Scenario B: Console does NOT show v2.3.1 message

**This is the most likely scenario.** Your browser is loading old cached JavaScript.

**Solutions:**
1. Hard refresh: Ctrl+Shift+R
2. Use dev-server.py (port 8081) which has cache-busting headers
3. Clear browser cache completely
4. Try incognito/private window

### Scenario C: API returns error or empty array

**Check console for:**
```
❌ Table API failed - showing error message
Debug info: {...}
```

**If you see this:**
- Check token exists: `localStorage.getItem('access_token')`
- Check backend is running: `http://localhost:8000/docs`
- Check database connection

---

## Files Modified (for Reference)

1. **js/tutor-profile/market-trend-functions.js**
   - Lines 7-10: Removed fallback data, added version log
   - Lines 358-385: Added graph error handling
   - Lines 645-692: Added table error handling

2. **test-market-150-debug.html** (NEW)
   - Interactive debugging page

3. **astegni-backend/debug_market_data_150.py** (NEW)
   - Database verification script

---

## Expected Behavior After Fix

### When Cache is Cleared:

1. **Console output:**
   ```
   📊 Market Trend Functions v2.3.1 loaded - Fallback data removed
   📊 v2.3 - Fetched 1 SIMILAR tutors out of 1 total (Online)
   ✅ Table using REAL API data: 1 similar tutors out of 1 total
   ✅ Market table populated with 1 rows (1 similar tutors out of 1 total) - v2.3
   ```

2. **Table display:**
   ```
   Rating | Completion | Students | Experience | Age    | Price
   3.5⭐  | 0%         | 0.0      | 50.0/100   | 0.0yrs | 100.00 ETB
   ```

3. **Graph display:**
   - Shows 1 data point at rating 3.5 with price 100 ETB
   - Title: "Rating vs Price (1 Similar Tutors)"

4. **Price suggestion:**
   ```
   Suggested Price: 100 ETB
   Market Range: 100 - 100 ETB
   Confidence: Low (1 similar tutors)
   ```

---

## If Problem Persists

If after following ALL steps above you STILL see 150 ETB:

1. **Take screenshots of:**
   - Browser console (full output)
   - Network tab (showing API response)
   - The table/graph showing 150 ETB

2. **Share this information:**
   - Browser name and version
   - Are you using dev-server.py (port 8081) or http.server (port 8080)?
   - Did you see "v2.3.1" message in console?
   - What does Network tab show for API response?

3. **Nuclear option:**
   - Close ALL browser tabs
   - Close browser completely
   - Clear browser cache via browser settings
   - Restart browser
   - Try in incognito mode first

---

## Technical Explanation

### Why 150 ETB Appeared Originally:

The old `market-trend-functions.js` had this hardcoded data:

```javascript
const tutorDataByTime = {
    3: [
        { name: "Hana Mekonnen", rating: 4.2, pricePerHour: 150 }, // ← HERE
        // ... 7 more fake tutors
    ]
};
```

When API failed or returned empty, it fell back to this sample data:

```javascript
const tutorData = (marketData && marketData.tutors)
    ? marketData.tutors           // Real data
    : tutorDataByTime[3];         // Fallback (150 ETB)
```

### Why It's Fixed Now:

1. **Removed fallback data completely** (lines 7-8)
2. **Added error detection:** If API fails, show error message instead
3. **Added debug logging:** Console shows exactly what data is being used
4. **Added version marker:** Easy to verify correct JavaScript is loaded

### Why You Might Still See It:

**Browser cache** - Your browser might still have the OLD JavaScript file in memory/cache. The new version exists on disk, but browser hasn't fetched it yet.

**Solution:** Force browser to re-download JavaScript files via cache clearing.

---

## Quick Checklist

- [ ] Run `debug_market_data_150.py` - confirms database has no 150 ETB
- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Check console for "v2.3.1 loaded" message
- [ ] Open Network tab and verify API response shows 100 ETB
- [ ] Use `test-market-150-debug.html` for detailed diagnostics
- [ ] If still showing 150, try incognito/private window
- [ ] As last resort, clear all browser cache and restart browser

---

**Last Updated:** January 21, 2026
**Version:** 2.3.1 - Fallback Data Removed
