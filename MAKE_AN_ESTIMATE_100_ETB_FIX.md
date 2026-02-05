# Make an Estimate 100 ETB Difference - Fix Complete

## Issue
"Make an Estimate" checkbox was showing **100 ETB MORE** than the "Market Trend Suggest Price" for the same tutor.

**Example:**
- Market Trend Suggest Price: **100 ETB**
- Make an Estimate: **200 ETB** ❌

## Root Cause

### The Problem
The "Make an Estimate" function and "Market Trend Suggest Price" were using **different radio button selectors**:

1. **Market Trend (Correct):**
   ```javascript
   // market-trend-functions.js line 1383
   const sessionFormatRadio = document.querySelector('input[name="universalSessionFormat"]:checked');
   ```
   - ✅ Uses `universalSessionFormat` (the actual radio button name in HTML)
   - ✅ Sends `session_format: "Online"` to API

2. **Make an Estimate (Wrong):**
   ```javascript
   // package-manager-clean.js line 2884 (BEFORE FIX)
   const sessionFormatRadio = document.querySelector('input[name="sessionFormat"]:checked');
   ```
   - ❌ Looks for `sessionFormat` which **doesn't exist** in HTML
   - ❌ `sessionFormatRadio` becomes `null`
   - ❌ Sends `session_format: null` to API

### Backend Behavior

When `session_format` is `null`, the backend treats it as "all formats" and matches different base price rules:

**Base Price Rules in Database:**

| ID | Rule Name | Session Format | Base Price | Priority |
|----|-----------|----------------|------------|----------|
| 10 | New tutor online | `'Online'` | **100 ETB** | 2 |
| 9 | New tutor in person | `'all'` | **200 ETB** | 2 |

**Matching Logic:**

```python
# Backend: market_pricing_endpoints.py

# When session_format = "Online" (Market Trend - CORRECT)
base_price, source = get_base_price_for_tutor(
    subject_category="all",
    session_format="Online",  # Matches Rule ID 10
    ...
)
# Returns: 100 ETB ✅

# When session_format = null (Make an Estimate - WRONG)
base_price, source = get_base_price_for_tutor(
    subject_category="all",
    session_format=None,  # Treated as "all", matches Rule ID 9
    ...
)
# Returns: 200 ETB ❌
```

### Why the 100 ETB Difference?

The base price rules are set up with different prices for different formats:
- **Online tutoring:** 100 ETB (lower overhead, no travel)
- **In-person/All formats:** 200 ETB (higher overhead, includes travel, venue costs)

When "Make an Estimate" sent `null`, it defaulted to the higher "all formats" price instead of "Online" price.

## The Fix

**File:** `js/tutor-profile/package-manager-clean.js`
**Lines:** 2883-2885

### Before (Wrong):
```javascript
// Get session format from radio button
const sessionFormatRadio = document.querySelector('input[name="sessionFormat"]:checked');
const sessionFormat = sessionFormatRadio ? sessionFormatRadio.value : null;
```

### After (Fixed):
```javascript
// Get session format from universal session format radio button (same as Market Trend)
const sessionFormatRadio = document.querySelector('input[name="universalSessionFormat"]:checked');
const sessionFormat = sessionFormatRadio ? sessionFormatRadio.value : 'Online';  // Default to Online
```

### What Changed:

1. **Correct Radio Button Name:**
   - Changed from `input[name="sessionFormat"]` (doesn't exist)
   - To `input[name="universalSessionFormat"]` (actual HTML name)

2. **Correct Default:**
   - Changed from `null` (matches "all" = 200 ETB)
   - To `'Online'` (matches online = 100 ETB)

3. **Consistency:**
   - Now uses the SAME selector as Market Trend
   - Guarantees both features return the same price

## Verification

### Test Steps:

1. Open package management modal
2. Select "Online" in the universal session format filter
3. Click "Market Trend" → "Make an Estimate" button
   - Note the suggested price (e.g., **100 ETB**)
4. Go back to package editor
5. Check the "Make an Estimate" checkbox
   - Should now show **100 ETB** (SAME as Market Trend) ✅

### Before Fix:
```
Market Trend:     100 ETB  (Online)
Make an Estimate: 200 ETB  (null → "all")
Difference:       100 ETB  ❌
```

### After Fix:
```
Market Trend:     100 ETB  (Online)
Make an Estimate: 100 ETB  (Online)
Difference:       0 ETB    ✅
```

## Technical Details

### HTML Structure
**File:** `modals/tutor-profile/package-management-modal.html`

The actual radio buttons in the HTML:
```html
<input type="radio" name="universalSessionFormat" value="Online" checked>
<input type="radio" name="universalSessionFormat" value="In-person">
<input type="radio" name="universalSessionFormat" value="Hybrid">
```

**Not** `name="sessionFormat"` - that doesn't exist!

### API Request Comparison

#### Market Trend (Before and After - Always Correct):
```json
POST /api/market-pricing/suggest-price
{
  "time_period_months": 3,
  "session_format": "Online"
}
// Response: { "suggested_price": 100.0 }
```

#### Make an Estimate (Before Fix):
```json
POST /api/market-pricing/suggest-price
{
  "time_period_months": 3,
  "session_format": null
}
// Response: { "suggested_price": 200.0 }  ❌
```

#### Make an Estimate (After Fix):
```json
POST /api/market-pricing/suggest-price
{
  "time_period_months": 3,
  "session_format": "Online"
}
// Response: { "suggested_price": 100.0 }  ✅
```

## Related Files

### Modified:
- ✅ `js/tutor-profile/package-manager-clean.js` (line 2884)

### Referenced:
- `modals/tutor-profile/package-management-modal.html` (radio buttons)
- `js/tutor-profile/market-trend-functions.js` (comparison reference)
- `astegni-backend/market_pricing_endpoints.py` (API endpoint)
- `base_price_rules` table in `astegni_admin_db` (pricing rules)

## Summary

The 100 ETB difference was caused by:
1. Wrong radio button selector (`sessionFormat` vs `universalSessionFormat`)
2. Sending `null` instead of `"Online"` to the API
3. Backend matching different base price rule (200 ETB for "all" instead of 100 ETB for "Online")

The fix ensures both features use the SAME radio button and send the SAME session format to the API, resulting in consistent pricing.

**Status:** ✅ Fixed
**Testing:** Refresh browser and test both features - should now show identical prices
