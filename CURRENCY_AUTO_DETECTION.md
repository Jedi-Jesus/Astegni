# Currency Auto-Detection System - Complete Implementation

## Overview

The Astegni platform now automatically detects and sets user currency based on their GPS location. When a user enables location detection, the system:

1. Detects their GPS coordinates
2. Reverse geocodes to get country code (e.g., 'US', 'ET', 'GB')
3. Automatically maps country code to currency (e.g., US → USD, ET → ETB)
4. Stores both country_code and currency in the users table

**Coverage:** 195+ countries worldwide with automatic currency detection

## Architecture

### Backend Components

#### 1. Database Schema (users table)

```sql
-- New columns added to users table
country_code VARCHAR(10) NULL  -- ISO country code (e.g., 'ET', 'US', 'GB')
currency VARCHAR(10) NULL      -- Currency code (e.g., 'ETB', 'USD', 'EUR')
```

**Migration File:** `migrate_add_currency_to_users.py`

**Run migration:**
```bash
cd astegni-backend
python migrate_add_currency_to_users.py
```

#### 2. Currency Mapping Utility

**File:** `astegni-backend/currency_utils.py`

**Functions:**
- `get_currency_from_country(country_code)` - Main function, returns currency code
- `get_currency_symbol(currency_code)` - Returns currency symbol (e.g., '$', '€', 'Br')
- `is_country_supported(country_code)` - Check if country is supported
- `get_supported_countries()` - Get list of all supported countries
- `get_supported_currencies()` - Get list of all unique currencies

**Example Usage:**
```python
from currency_utils import get_currency_from_country, get_currency_symbol

# Auto-detect currency from country
currency = get_currency_from_country('ET')  # Returns 'ETB'
currency = get_currency_from_country('US')  # Returns 'USD'
currency = get_currency_from_country('GB')  # Returns 'GBP'

# Get currency symbol
symbol = get_currency_symbol('ETB')  # Returns 'Br'
symbol = get_currency_symbol('USD')  # Returns '$'
symbol = get_currency_symbol('EUR')  # Returns '€'
```

**Supported Countries (195+):**

| Region | Countries |
|--------|-----------|
| **Africa** | ET, NG, EG, ZA, KE, GH, TZ, UG, MA, DZ, TN, RW, SN, CI, CM, AO, BW, MU, ZM, ZW, MW, MZ, NA, and more |
| **Americas** | US, CA, MX, BR, AR, CO, CL, PE, VE, EC, BO, PY, UY, CR, PA, GT, HN, NI, SV, DO, JM, TT, and more |
| **Europe** | GB, DE, FR, IT, ES, NL, BE, AT, PT, IE, GR, FI, SE, NO, DK, CH, PL, CZ, HU, RO, BG, HR, and more |
| **Asia** | CN, IN, JP, KR, SG, MY, TH, VN, PH, ID, PK, BD, LK, MM, KH, LA, NP, BT, MV, AF, KZ, UZ, and more |
| **Middle East** | SA, AE, IL, IQ, IR, JO, KW, LB, OM, QA, BH, YE, SY, PS |
| **Oceania** | AU, NZ, PG, FJ, SB, VU, WS, TO |

#### 3. API Endpoint Update

**File:** `astegni-backend/user_profile_endpoints.py`

**Updated Endpoint:** `PUT /api/user/profile`

**New Request Fields:**
```json
{
  "location": "Addis Ababa, Ethiopia",
  "country_code": "ET"  // NEW: Auto-detected from GPS
}
```

**Auto-Detection Logic:**
```python
# When country_code is provided
if 'country_code' in update_data and update_data['country_code']:
    country_code = update_data['country_code']
    currency = get_currency_from_country(country_code)
    current_user.currency = currency
    # Log: [Currency Auto-Detection] Country: ET -> Currency: ETB
```

**Response:**
```json
{
  "message": "Profile updated successfully",
  "profile": {
    "location": "Addis Ababa, Ethiopia",
    "country_code": "ET",
    "currency": "ETB",  // Auto-detected
    ...
  }
}
```

### Frontend Components

#### 1. Geolocation Utils Update

**File:** `js/utils/geolocation-utils.js`

**Key Changes:**

1. **Extract country_code from Nominatim API:**
```javascript
// Nominatim returns both country name and country_code
{
  address: {
    country: "Ethiopia",
    country_code: "et"  // ISO code from Nominatim
  }
}

// Extract and uppercase
const country_code = data.address.country_code ?
  data.address.country_code.toUpperCase() : null;
```

2. **Return object with address AND country_code:**
```javascript
async function reverseGeocode(latitude, longitude) {
  // ... API call ...
  return {
    address: "Addis Ababa, Ethiopia",
    country_code: "ET"
  };
}
```

3. **Update country_code field for backend:**
```javascript
function addDetectedLocation(location, country_code) {
  // Add location to array
  addLocationField(location);

  // Update hidden country_code field
  if (country_code) {
    const countryCodeField = document.getElementById('editCountryCode');
    if (countryCodeField) {
      countryCodeField.value = country_code;
      console.log(`Country code set: ${country_code} (Currency will be auto-detected)`);
    }
  }
}
```

#### 2. Detection Flow

```
User clicks "Detect Location"
  ↓
Get GPS coordinates (latitude, longitude)
  ↓
Call Nominatim API for reverse geocoding
  ↓
Extract:
  - address: "Addis Ababa, Ethiopia"
  - country_code: "ET"
  ↓
Update UI:
  - Location field: "Addis Ababa, Ethiopia"
  - Hidden country_code field: "ET"
  ↓
User saves profile
  ↓
Backend receives:
  - location: "Addis Ababa, Ethiopia"
  - country_code: "ET"
  ↓
Backend auto-detects:
  - currency: "ETB" (from country_code 'ET')
  ↓
Saved to database:
  - users.location = "Addis Ababa, Ethiopia"
  - users.country_code = "ET"
  - users.currency = "ETB"
```

## Testing

### 1. Test Currency Mapping

```bash
cd astegni-backend
python test_currency_detection.py
```

**Expected Output:**
```
[1] Testing Individual Countries
----------------------------------------------------------------------
✓ ET  (Ethiopia            ) -> ETB (Br)
✓ US  (United States       ) -> USD ($)
✓ GB  (United Kingdom      ) -> GBP (£)
✓ DE  (Germany             ) -> EUR (€)
✓ CN  (China               ) -> CNY (¥)
...

Results: 20 passed, 0 failed

[2] Testing Edge Cases
----------------------------------------------------------------------
✓ Lowercase 'et' -> ETB (expected ETB)
✓ With spaces '  ET  ' -> ETB (expected ETB)
✓ None -> USD (expected USD as default)
✓ Empty string -> USD (expected USD as default)
✓ Unknown 'XX' -> USD (expected USD as default)

[4] System Statistics
----------------------------------------------------------------------
Total countries supported: 195
Total unique currencies: 120+
```

### 2. Test Frontend GPS Detection

**Manual Test:**
1. Open user profile page
2. Enable location detection
3. Click "Detect Location"
4. Check browser console:
   ```
   [Geolocation] GPS coordinates: 9.0054, 38.7636
   [Geolocation] Country code extracted: ET
   [Geolocation] Country code set: ET (Currency will be auto-detected)
   [Geolocation] Added location: Addis Ababa, Ethiopia
   ```
5. Save profile
6. Check backend console:
   ```
   [Currency Auto-Detection] Country: ET -> Currency: ETB
   ```

### 3. Test API Endpoint

```bash
# Example: Update profile with country_code
curl -X PUT http://localhost:8000/api/user/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Addis Ababa, Ethiopia",
    "country_code": "ET"
  }'

# Response should include:
{
  "message": "Profile updated successfully",
  "profile": {
    "location": "Addis Ababa, Ethiopia",
    "country_code": "ET",
    "currency": "ETB"
  }
}
```

## Examples by Country

### Ethiopia (ET)
```
GPS Location: Addis Ababa, Ethiopia
Country Code: ET
Currency: ETB (Ethiopian Birr)
Symbol: Br
```

### United States (US)
```
GPS Location: New York, United States
Country Code: US
Currency: USD (US Dollar)
Symbol: $
```

### United Kingdom (GB)
```
GPS Location: London, United Kingdom
Country Code: GB
Currency: GBP (British Pound)
Symbol: £
```

### Germany (DE)
```
GPS Location: Berlin, Germany
Country Code: DE
Currency: EUR (Euro)
Symbol: €
```

### Nigeria (NG)
```
GPS Location: Lagos, Nigeria
Country Code: NG
Currency: NGN (Nigerian Naira)
Symbol: ₦
```

## Implementation Checklist

- [x] Create migration to add currency and country_code columns
- [x] Create country-to-currency mapping utility (195+ countries)
- [x] Update User model in models.py
- [x] Update user_profile_endpoints.py with auto-detection logic
- [x] Update frontend geolocation-utils.js to extract country_code
- [x] Update addDetectedLocation to set country_code field
- [x] Update reverseGeocode to return country_code
- [x] Update IP geolocation fallback to return country_code
- [x] Create comprehensive test suite
- [x] Create documentation

## Files Changed/Created

### Backend
- ✅ `migrate_add_currency_to_users.py` - Database migration
- ✅ `currency_utils.py` - Country-to-currency mapping (NEW)
- ✅ `app.py modules/models.py` - Added currency and country_code columns
- ✅ `user_profile_endpoints.py` - Auto-detection logic
- ✅ `test_currency_detection.py` - Test suite (NEW)

### Frontend
- ✅ `js/utils/geolocation-utils.js` - Extract and send country_code

### Documentation
- ✅ `CURRENCY_AUTO_DETECTION.md` - This file (NEW)

## Benefits

✅ **Automatic:** Currency is set automatically, no user input needed
✅ **Accurate:** Uses GPS coordinates, not affected by VPN
✅ **Global:** Supports 195+ countries worldwide
✅ **Seamless:** Integrates with existing GPS location detection
✅ **Flexible:** Falls back to USD if country unknown
✅ **Fast:** No additional API calls, uses existing Nominatim data

## Future Enhancements

1. **Price Conversion:** Auto-convert prices based on user currency
2. **Currency Preferences:** Allow users to override auto-detected currency
3. **Multi-Currency Support:** Display prices in user's currency + local currency
4. **Currency Exchange Rates:** Integrate real-time exchange rate API
5. **Payment Integration:** Use detected currency for payment processing

## Notes

- **Default Currency:** USD is used when country cannot be detected
- **VPN Impact:** GPS detection is NOT affected by VPN (uses physical location)
- **IP Fallback:** If GPS fails, IP geolocation is used (may be affected by VPN)
- **Privacy:** Country code is only stored when user explicitly enables location detection
- **Case Insensitive:** Country codes are automatically converted to uppercase
- **Validation:** Invalid country codes default to USD

## Support

**Questions or Issues?**
- Check test suite: `python test_currency_detection.py`
- Review console logs: `[Currency Auto-Detection]` prefix
- Verify migration ran: Check users table has `currency` and `country_code` columns

---

**Status:** ✅ IMPLEMENTED & TESTED
**Version:** 2.1.0
**Date:** 2026-01-22
