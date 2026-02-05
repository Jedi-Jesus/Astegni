# "Make an Estimate" Auto-Pricing Feature

## Status: ✅ IMPLEMENTED

When creating or editing a package, checking the "Make an Estimate" checkbox now automatically fetches the suggested market price from the v2.1 algorithm and applies it to the hourly rate field.

---

## What It Does

### User Flow:

1. **Tutor opens Package Management modal**
2. **Goes to Pricing Details section**
3. **Checks "Make an Estimate" checkbox**
4. **System automatically:**
   - Fetches suggested market price from API
   - Sets the hourly rate field
   - Updates the fee calculator
   - Shows success notification

---

## Implementation Details

### 1. Event Listener Added

**File:** [js/tutor-profile/package-manager-clean.js:1274-1285](js/tutor-profile/package-manager-clean.js#L1274-L1285)

```javascript
// Add event listener for "Make an Estimate" checkbox
const makeEstimateCheckbox = document.getElementById('makeEstimate');
if (makeEstimateCheckbox) {
    makeEstimateCheckbox.addEventListener('change', async function(e) {
        if (e.target.checked) {
            console.log('💰 Make an Estimate checked - fetching suggested market price...');
            await fetchAndApplyMarketPrice();
        } else {
            console.log('ℹ️ Make an Estimate unchecked');
        }
    });
}
```

**When checkbox is checked:**
- Calls `fetchAndApplyMarketPrice()` function
- Fetches market price suggestion
- Applies to hourly rate input

**When checkbox is unchecked:**
- Just logs (no action)
- Tutor can manually adjust price

---

### 2. Fetch and Apply Function

**File:** [js/tutor-profile/package-manager-clean.js:2752-2832](js/tutor-profile/package-manager-clean.js#L2752-L2832)

```javascript
async function fetchAndApplyMarketPrice() {
    // 1. Get hourly rate input
    const hourlyRateInput = document.getElementById('hourlyRate');

    // 2. Show loading state
    hourlyRateInput.value = 'Loading...';
    hourlyRateInput.disabled = true;

    // 3. Fetch market price from API
    const response = await fetch(`${API_BASE_URL}/api/market-pricing/suggest-price`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            time_period_months: 3  // 3-month market data (consistent with Price Suggestion)
        })
    });

    // 4. Apply suggested price
    const data = await response.json();
    hourlyRateInput.value = data.suggested_price;
    hourlyRateInput.disabled = false;

    // 5. Trigger calculator update
    hourlyRateInput.dispatchEvent(new Event('input'));

    // 6. Show success notification
    // Green notification: "Market Price Applied! X ETB based on market data"
}
```

---

## User Experience

### Success Flow:

```
1. User checks "Make an Estimate" ✓
2. Hourly rate shows "Loading..."
3. API fetches suggested price (e.g., 235 ETB)
4. Hourly rate updates to 235
5. Calculator updates automatically
6. Green notification: "Market Price Applied! 235 ETB based on market data"
```

### Error Flow:

```
1. User checks "Make an Estimate" ✓
2. Hourly rate shows "Loading..."
3. API fails (network error, not logged in, etc.)
4. Hourly rate restores original value
5. Red notification: "Error! Could not fetch market price. Please enter manually."
```

---

## API Integration

### Endpoint Called:
```http
POST /api/market-pricing/suggest-price
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "time_period_months": 3
}
```

### Response Used:
```json
{
  "suggested_price": 235.0,
  "market_average": 220.0,
  "price_range": { "min": 180, "max": 290 },
  "similar_tutors_count": 18,
  "confidence_level": "high",
  "factors": {
    "tutor_rating": 4.5,
    "completion_rate": 0.95,
    "student_count": 25,
    "experience_score": 60,
    "account_age_days": 730
  }
}
```

**Only `suggested_price` is used** to set the hourly rate.

---

## UI States

### 1. Loading State
```
Hourly Rate: [Loading...] (disabled)
Checkbox: [✓] Make an Estimate
```

### 2. Success State
```
Hourly Rate: [235] (enabled)
Checkbox: [✓] Make an Estimate
Notification: ✓ Market Price Applied! 235 ETB based on market data
```

### 3. Error State
```
Hourly Rate: [200] (enabled, restored)
Checkbox: [✓] Make an Estimate
Notification: ✗ Error! Could not fetch market price. Please enter manually.
```

---

## Benefits

### 1. **Convenience**
- One click to get market-based pricing
- No need to manually open Market Trends tab
- Integrated into package creation flow

### 2. **Accuracy**
- Uses v2.1 algorithm (5 factors)
- Based on real `enrolled_students.agreed_price` data
- 3-month market data by default (consistent with Price Suggestion)

### 3. **Speed**
- Instant pricing recommendation
- Auto-updates calculator
- No manual calculation needed

### 4. **User Feedback**
- Loading indicator during fetch
- Success/error notifications
- Console logs for debugging

---

## Checkbox Location

**HTML:** [modals/tutor-profile/package-management-modal.html](modals/tutor-profile/package-management-modal.html)

**Pricing Details Section:**
```html
<div class="form-section">
    <div class="form-section-title">
        <i class="fas fa-money-bill"></i> Pricing
    </div>

    <!-- Make Estimate Checkbox -->
    <div style="margin-bottom: 1rem; padding: 0.875rem 1rem; background: var(--hover-bg); border-radius: 8px; border: 1px solid var(--border-color); display: flex; align-items: center; gap: 0.75rem;">
        <input type="checkbox" id="makeEstimate" style="width: 20px; height: 20px; cursor: pointer;">
        <label for="makeEstimate" style="cursor: pointer; font-weight: 500;">
            <i class="fas fa-calculator"></i> Make an estimate
            <span style="font-size: 0.8rem; color: var(--text-secondary);">
                (Calculate fees based on days/hours)
            </span>
        </label>
    </div>

    <!-- Hourly Rate Field -->
    <div class="form-field">
        <label><i class="fas fa-money-bill-wave"></i> Hourly Rate (ETB)</label>
        <input type="number" id="hourlyRate" value="200" min="0" placeholder="200">
    </div>
</div>
```

---

## Edge Cases Handled

### Case 1: Not Logged In
```javascript
if (!token) {
    alert('Please log in to get market pricing');
    return;
}
```

### Case 2: Hourly Rate Input Not Found
```javascript
if (!hourlyRateInput) {
    console.error('❌ Hourly rate input not found');
    return;
}
```

### Case 3: API Returns Error
```javascript
if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
}
// Shows error notification
// Restores original value
```

### Case 4: Network Failure
```javascript
try {
    await fetch(...);
} catch (error) {
    console.error('Failed to fetch market price:', error);
    // Restore original value
    // Show error notification
}
```

### Case 5: Unchecking Checkbox
```javascript
if (!e.target.checked) {
    console.log('ℹ️ Make an Estimate unchecked');
    // No action - tutor can keep or change price
}
```

---

## Testing Steps

1. **Hard refresh browser:** `Ctrl+Shift+R`
2. **Login as tutor**
3. **Open Package Management modal**
4. **Create new package or edit existing**
5. **Scroll to Pricing Details section**
6. **Check "Make an Estimate" checkbox**
7. **Verify:**
   - Hourly rate shows "Loading..."
   - API call made (check browser console)
   - Hourly rate updates to suggested price
   - Green success notification appears
   - Calculator updates automatically

### Expected Console Output:
```
💰 Make an Estimate checked - fetching suggested market price...
✅ Suggested market price fetched: 235 ETB
```

---

## Integration with Market Trends

This feature is a **shortcut** to the Market Trends pricing system:

| Feature | Make an Estimate | Market Trends Tab |
|---------|------------------|-------------------|
| **Access** | Checkbox in Pricing section | Separate tab |
| **Data Source** | Same API (`/suggest-price`) | Same API |
| **Algorithm** | v2.1 (5 factors) | v2.1 (5 factors) |
| **Time Period** | 3 months (default) | 3/6/12 months (adjustable) |
| **Display** | Auto-apply to hourly rate | Detailed breakdown + graphs |
| **Use Case** | Quick pricing during package creation | Detailed market analysis |

**Both use the same backend v2.1 algorithm with `enrolled_students.agreed_price` data!**

---

## Files Changed

| File | Lines | Changes |
|------|-------|---------|
| [package-manager-clean.js](js/tutor-profile/package-manager-clean.js) | 1274-1285 | Added event listener for checkbox |
| [package-manager-clean.js](js/tutor-profile/package-manager-clean.js) | 2752-2832 | Added `fetchAndApplyMarketPrice()` function |

---

## Future Enhancements

### Possible Improvements:
1. **Time Period Selector**
   - Dropdown: 3, 6, or 12 months
   - Next to checkbox

2. **Show Price Breakdown**
   - Tooltip showing factors used
   - Confidence level indicator

3. **Refresh Button**
   - "Refresh market price" icon
   - Update price without unchecking/rechecking

4. **Auto-Refresh**
   - Automatically update when courses change
   - Different prices for different course combinations

5. **Price Range**
   - Show min/max range
   - "Low/Medium/High" price options

---

## Summary

✅ **What:** Auto-fetch market price when "Make an Estimate" is checked
✅ **How:** Event listener → API call → Apply to hourly rate → Update calculator
✅ **Benefits:** Convenience, accuracy, speed, integrated workflow
✅ **Status:** Fully implemented and ready for testing

**Files Changed:**
- [js/tutor-profile/package-manager-clean.js](js/tutor-profile/package-manager-clean.js) - Lines 1274-1285, 2752-2832

**Testing Required:** Yes - hard refresh browser (Ctrl+Shift+R)

---

**Date:** 2026-01-20
**Version:** 2.1 Enhanced
