# Currency Auto-Detection - Quick Start Guide

## What Was Implemented

The Astegni platform now automatically detects and sets user currency based on their GPS location.

## How It Works

```
User Enables GPS → Location Detected → Country Code Extracted → Currency Auto-Set
     ↓                    ↓                      ↓                       ↓
  User Action      Addis Ababa, Ethiopia        ET                    ETB
```

## Setup (One-Time)

### 1. Run Migration
```bash
cd astegni-backend
python migrate_add_currency_to_users.py
```

**Result:** Adds `currency` and `country_code` columns to users table

### 2. Test the System
```bash
cd astegni-backend
python test_currency_detection.py
```

**Expected:** All 152 countries pass, 0 failures

## Usage

### Frontend - GPS Detection

When user enables location detection:

```javascript
// GPS detects coordinates
latitude: 9.0054, longitude: 38.7636

// Nominatim API returns:
{
  address: {
    country: "Ethiopia",
    country_code: "et"  // Automatically provided
  }
}

// System extracts:
location: "Addis Ababa, Ethiopia"
country_code: "ET"  // Uppercase

// Backend receives both and auto-sets:
currency: "ETB"  // Mapped from ET
```

### Backend - Currency Mapping

```python
from currency_utils import get_currency_from_country

# Automatic mapping
currency = get_currency_from_country('ET')  # Returns 'ETB'
currency = get_currency_from_country('US')  # Returns 'USD'
currency = get_currency_from_country('GB')  # Returns 'GBP'
currency = get_currency_from_country('DE')  # Returns 'EUR'

# Edge cases handled
currency = get_currency_from_country('XX')  # Returns 'USD' (default)
currency = get_currency_from_country(None)  # Returns 'USD' (default)
```

### API Endpoint

**PUT** `/api/user/profile`

**Request:**
```json
{
  "location": "Addis Ababa, Ethiopia",
  "country_code": "ET"
}
```

**Response:**
```json
{
  "message": "Profile updated successfully",
  "profile": {
    "location": "Addis Ababa, Ethiopia",
    "country_code": "ET",
    "currency": "ETB"  // Auto-detected!
  }
}
```

## Supported Countries

**Total:** 152 countries worldwide
**Currencies:** 121 unique currencies

**Popular Countries:**
- 🇪🇹 Ethiopia → ETB (Br)
- 🇺🇸 United States → USD ($)
- 🇬🇧 United Kingdom → GBP (£)
- 🇩🇪 Germany → EUR (€)
- 🇨🇳 China → CNY (¥)
- 🇮🇳 India → INR (₹)
- 🇯🇵 Japan → JPY (¥)
- 🇳🇬 Nigeria → NGN (₦)
- 🇰🇪 Kenya → KES (KSh)
- 🇿🇦 South Africa → ZAR (R)

**Full list:** See [currency_utils.py](astegni-backend/currency_utils.py)

## Files Created/Modified

### Backend
✅ `migrate_add_currency_to_users.py` - Database migration
✅ `currency_utils.py` - Country-to-currency mapping (NEW)
✅ `app.py modules/models.py` - Added columns
✅ `user_profile_endpoints.py` - Auto-detection logic
✅ `test_currency_detection.py` - Test suite (NEW)

### Frontend
✅ `js/utils/geolocation-utils.js` - Extract country_code from GPS

### Documentation
✅ `CURRENCY_AUTO_DETECTION.md` - Full documentation
✅ `CURRENCY_QUICK_START.md` - This file

## Testing

### Test Scenarios

**1. Ethiopia (Addis Ababa)**
```
Location: Addis Ababa, Ethiopia
Country: ET
Currency: ETB ✓
```

**2. United States (New York)**
```
Location: New York, United States
Country: US
Currency: USD ✓
```

**3. Germany (Berlin)**
```
Location: Berlin, Germany
Country: DE
Currency: EUR ✓
```

### Console Logs

**Frontend (GPS detection):**
```
[Geolocation] GPS coordinates: 9.0054, 38.7636
[Geolocation] Country code extracted: ET
[Geolocation] Country code set: ET (Currency will be auto-detected)
```

**Backend (profile update):**
```
[Currency Auto-Detection] Country: ET -> Currency: ETB
```

## Troubleshooting

### Issue: Currency not set

**Check:**
1. Migration ran successfully
2. User has `country_code` in request
3. Backend logs show `[Currency Auto-Detection]`

**Solution:**
```bash
# Verify migration
cd astegni-backend
python -c "from sqlalchemy import create_engine, inspect; import os; from dotenv import load_dotenv; load_dotenv(); engine = create_engine(os.getenv('DATABASE_URL')); inspector = inspect(engine); print([col['name'] for col in inspector.get_columns('users') if 'currency' in col['name'] or 'country' in col['name']])"
```

### Issue: Wrong currency detected

**Check:**
```python
from currency_utils import get_currency_from_country
print(get_currency_from_country('ET'))  # Should print 'ETB'
```

### Issue: GPS not detecting country_code

**Check browser console:**
```
[Geolocation] Country code extracted: [should see country code]
```

If null, check Nominatim API response format.

## Quick Reference

| Country Code | Currency | Symbol |
|-------------|----------|--------|
| ET | ETB | Br |
| US | USD | $ |
| GB | GBP | £ |
| EU | EUR | € |
| NG | NGN | ₦ |
| KE | KES | KSh |
| IN | INR | ₹ |
| CN | CNY | ¥ |
| JP | JPY | ¥ |
| SA | SAR | SAR |

## Next Steps

1. ✅ Migration completed
2. ✅ System tested (152 countries pass)
3. ✅ Frontend integrated
4. ⏭️ Test with real GPS in different countries
5. ⏭️ Consider currency conversion features

---

**Status:** ✅ READY TO USE
**Version:** 2.1.0
**Date:** 2026-01-22
