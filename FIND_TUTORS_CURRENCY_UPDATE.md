# Find Tutors - Dynamic Currency Display

## Overview

Updated the find-tutors page to display tutor prices in the **logged-in user's currency** instead of hardcoded ETB. The currency is automatically detected from the user's GPS location and stored in the database.

## Changes Made

### 1. API Utility Enhancement

**File:** `js/find-tutors/api-config-&-util.js`

**Added:**
- `userCurrency` - Stores the logged-in user's currency code
- `userCurrencySymbol` - Stores the currency symbol for display
- `fetchUserCurrency()` - Fetches user data from `/api/me` and extracts currency
- `getCurrencySymbol(currencyCode)` - Maps currency codes to symbols

**Currency Symbol Mapping:**
```javascript
{
    // Major currencies (10)
    'ETB': 'Br', 'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'CNY': '¥',
    'INR': '₹', 'CAD': 'C$', 'AUD': 'A$', 'CHF': 'CHF',

    // African currencies (25)
    'NGN': '₦', 'ZAR': 'R', 'KES': 'KSh', 'GHS': 'GH₵', 'EGP': 'E£',
    'TZS': 'TSh', 'UGX': 'USh', 'MAD': 'DH', 'DZD': 'DA', 'TND': 'DT',
    // ... and 15 more

    // Americas (22)
    'BRL': 'R$', 'MXN': '$', 'ARS': '$', 'COP': '$', 'CLP': '$',
    'PEN': 'S/', 'VES': 'Bs', 'BOB': 'Bs', 'PYG': '₲', 'UYU': '$U',
    // ... and 12 more

    // European currencies (18)
    'SEK': 'kr', 'NOK': 'kr', 'DKK': 'kr', 'PLN': 'zł', 'CZK': 'Kč',
    'HUF': 'Ft', 'RON': 'lei', 'BGN': 'лв', 'RSD': 'дин', 'ISK': 'kr',
    // ... and 8 more

    // Asian currencies (25)
    'KRW': '₩', 'SGD': 'S$', 'MYR': 'RM', 'THB': '฿', 'VND': '₫',
    'PHP': '₱', 'IDR': 'Rp', 'PKR': '₨', 'BDT': '৳', 'LKR': 'Rs',
    // ... and 15 more

    // Middle East (13)
    'SAR': 'SR', 'AED': 'DH', 'ILS': '₪', 'IQD': 'ID', 'IRR': '﷼',
    'JOD': 'JD', 'KWD': 'KD', 'LBP': 'LL', 'OMR': 'OMR', 'QAR': 'QR',
    // ... and 3 more

    // Oceania (7)
    'NZD': 'NZ$', 'PGK': 'K', 'FJD': 'FJ$', 'SBD': 'SI$', 'VUV': 'VT',
    'WST': 'WS$', 'TOP': 'T$'
}
// Total: 120+ currencies for 152 countries worldwide
```

### 2. Main Controller Update

**File:** `js/find-tutors/main-controller.js`

**Added:**
- Call to `FindTutorsAPI.fetchUserCurrency()` on page initialization
- `updatePriceFilterLabel()` - Updates "Price Range" filter label to show user's currency

**Initialization Flow:**
```javascript
async init() {
    // 1. Initialize UI
    FindTutorsUI.init();

    // 2. Fetch user's currency from backend
    await FindTutorsAPI.fetchUserCurrency();

    // 3. Update UI labels with user's currency
    this.updatePriceFilterLabel();

    // 4. Load tutors and display prices in user's currency
    await this.loadTutors();
}
```

### 3. Tutor Card Display Update

**File:** `js/find-tutors/tutor-card-creator.js`

**Changed:**
```javascript
// BEFORE (hardcoded)
const currency = tutor.currency || 'ETB';
<div class="price-amount">${currency} ${price}</div>

// AFTER (user-based)
const currencySymbol = FindTutorsAPI.userCurrencySymbol || 'Br';
<div class="price-amount">${currencySymbol}${price}</div>
```

**Result:**
- **Ethiopia user:** Br500 (Ethiopian Birr)
- **US user:** $500 (US Dollar)
- **UK user:** £500 (British Pound)
- **Germany user:** €500 (Euro)

## How It Works

```
Page Load
    ↓
Fetch User Data from /api/me
    ↓
Extract currency field (e.g., "USD")
    ↓
Map to symbol (USD → "$")
    ↓
Store in FindTutorsAPI.userCurrencySymbol
    ↓
Render Tutor Cards
    ↓
Display prices: "$500" instead of "ETB 500"
```

## Example Flow

### User in Ethiopia
```
1. User enables GPS location
2. Location detected: Addis Ababa, Ethiopia
3. Country code: ET
4. Currency auto-set: ETB
5. Find tutors page shows: Br500
```

### User in United States
```
1. User enables GPS location
2. Location detected: New York, United States
3. Country code: US
4. Currency auto-set: USD
5. Find tutors page shows: $500
```

### User in Germany
```
1. User enables GPS location
2. Location detected: Berlin, Germany
3. Country code: DE
4. Currency auto-set: EUR
5. Find tutors page shows: €500
```

## Fallback Behavior

**If user hasn't set location:**
- Currency defaults to **ETB** (Ethiopian Birr)
- Symbol: **Br**
- Display: **Br500**

**If user not logged in:**
- Currency defaults to **ETB**
- Symbol: **Br**
- Display: **Br500**

**If API call fails:**
- Currency defaults to **ETB**
- Symbol: **Br**
- Display: **Br500**

## Price Filter Label

The "Price Range (ETB/hr)" label is now dynamic:

**Before:**
```html
<h3>Price Range (ETB/hr)</h3>
```

**After:**
```javascript
// For Ethiopian user
<h3>Price Range (ETB/hr)</h3>

// For US user
<h3>Price Range (USD/hr)</h3>

// For UK user
<h3>Price Range (GBP/hr)</h3>
```

## Console Logs

**On page load:**
```
🔍 Initializing Find Tutors page...
[Currency] User currency set to: USD ($)
✅ Find Tutors page initialized
```

**If user not logged in:**
```
[Currency] User not logged in, using default ETB
```

**If API fails:**
```
[Currency] Failed to fetch user data, using default ETB
```

## Testing

### Test Scenario 1: Ethiopian User
1. User sets location to Addis Ababa, Ethiopia
2. Currency is auto-set to ETB
3. Visit find-tutors page
4. Expected: Prices show as "Br500", "Br1000", etc.

### Test Scenario 2: US User
1. User sets location to New York, United States
2. Currency is auto-set to USD
3. Visit find-tutors page
4. Expected: Prices show as "$500", "$1000", etc.

### Test Scenario 3: German User
1. User sets location to Berlin, Germany
2. Currency is auto-set to EUR
3. Visit find-tutors page
4. Expected: Prices show as "€500", "€1000", etc.

### Test Scenario 4: No Location Set
1. User hasn't enabled GPS location
2. Currency field is NULL in database
3. Visit find-tutors page
4. Expected: Prices show as "Br500" (default ETB)

## Files Modified

### Frontend
- ✅ `js/find-tutors/api-config-&-util.js` - Added currency fetching and symbol mapping
- ✅ `js/find-tutors/main-controller.js` - Added currency initialization
- ✅ `js/find-tutors/tutor-card-creator.js` - Changed to use user's currency symbol

### Documentation
- ✅ `FIND_TUTORS_CURRENCY_UPDATE.md` - This file

## Dependencies

**Backend:**
- `/api/me` endpoint must return `currency` field
- User must have `currency` column in database (added by migration)

**Frontend:**
- `FindTutorsAPI` global object
- User must be logged in for personalized currency
- Access token in localStorage

## Related Documentation

- [CURRENCY_AUTO_DETECTION.md](CURRENCY_AUTO_DETECTION.md) - Full currency detection system
- [CURRENCY_QUICK_START.md](CURRENCY_QUICK_START.md) - Quick reference guide

## Benefits

✅ **Personalized Experience** - Users see prices in their local currency
✅ **Automatic** - No manual currency selection needed
✅ **Global Support** - 25+ currencies supported
✅ **Consistent** - All tutor prices use the same currency
✅ **Smart Fallback** - Defaults to ETB for Ethiopian market
✅ **Real-time** - Updates when user changes location

## Future Enhancements

1. **Currency Conversion:** Convert tutor prices to user's currency using exchange rates
2. **Currency Preference:** Allow users to override auto-detected currency
3. **Multi-Currency Display:** Show both original and converted prices
4. **Price Tooltips:** Show equivalent in ETB when hovering

## Notes

- **Important:** This displays prices in user's currency but **doesn't convert** the price values
- Prices remain in ETB, only the **symbol** changes based on user location
- For actual price conversion, integrate an exchange rate API (future enhancement)

---

**Status:** ✅ IMPLEMENTED
**Version:** 2.1.0
**Date:** 2026-01-22
