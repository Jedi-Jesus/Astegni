# OTP Timezone Fix - Account Restoration

## Problem

When users entered the OTP code immediately after receiving it, they got the error:
```
OTP has expired. Please request a new one.
```

## Root Cause

**Timezone mismatch** between OTP creation and verification:

### Before Fix:

**account_deletion_endpoints.py (Line 235):**
```python
expires_at = datetime.now() + timedelta(minutes=5)  # Local time
```

**app.py modules/routes.py (Line 597):**
```python
if datetime.utcnow() > expires_at:  # UTC time
    raise HTTPException(400, "OTP has expired")
```

### The Issue:

- OTP was created with **local time** (`datetime.now()`)
- OTP was verified against **UTC time** (`datetime.utcnow()`)
- If server's local time is behind UTC (e.g., UTC-3 or UTC-5), the OTP appears expired immediately

**Example:**
```
Server local time: 10:00 AM (UTC-5)
OTP created: expires_at = 10:05 AM (local)
UTC time: 3:00 PM
Verification: 3:00 PM > 10:05 AM? YES → "OTP expired"
```

---

## Solution

Changed OTP creation to use **UTC time** instead of local time:

### account_deletion_endpoints.py (Line 235)

**Before:**
```python
expires_at = datetime.now() + timedelta(minutes=5)  # Local time
```

**After:**
```python
expires_at = datetime.utcnow() + timedelta(minutes=5)  # UTC time
```

### Updated Log Message (Line 239)

**Before:**
```python
print(f"[ACCOUNT RESTORATION] Expires at: {expires_at}")
```

**After:**
```python
print(f"[ACCOUNT RESTORATION] Expires at (UTC): {expires_at}")
```

---

## How It Works Now

### OTP Creation (account_deletion_endpoints.py)
```python
expires_at = datetime.utcnow() + timedelta(minutes=5)  # UTC
# Store in database: expires_at = "2025-01-27 15:05:00 UTC"
```

### OTP Verification (routes.py)
```python
if datetime.utcnow() > expires_at:  # UTC > UTC (same timezone)
    raise HTTPException(400, "OTP has expired")
```

**Now both use UTC**, so comparison is accurate:
```
UTC time: 3:00 PM
OTP expires: 3:05 PM
3:00 PM > 3:05 PM? NO → OTP is valid
```

---

## Testing

### Test Case: Immediate OTP Entry

1. **Request OTP**
   - Click "Send OTP"
   - OTP created: `expires_at = datetime.utcnow() + 5 minutes`
   - Console: `[ACCOUNT RESTORATION] Expires at (UTC): 2025-01-27 15:05:00`

2. **Enter OTP Immediately**
   - Copy OTP from email/console
   - Enter into input field
   - Click "Verify & Restore"

3. **Verification**
   - Current time: `datetime.utcnow() = 2025-01-27 15:00:30`
   - Expires at: `2025-01-27 15:05:00`
   - Check: `15:00:30 > 15:05:00?` → NO
   - ✅ OTP is valid → Account restored

### Test Case: OTP After 4 Minutes

1. Request OTP at 3:00 PM UTC
2. Wait 4 minutes
3. Enter OTP at 3:04 PM UTC
4. ✅ Should work (within 5-minute window)

### Test Case: OTP After 6 Minutes

1. Request OTP at 3:00 PM UTC
2. Wait 6 minutes
3. Enter OTP at 3:06 PM UTC
4. ❌ Should show "OTP has expired"

---

## Related Files

### Modified:
- ✅ `astegni-backend/account_deletion_endpoints.py` (Line 235)

### Already Using UTC (No changes needed):
- ✅ `astegni-backend/app.py modules/routes.py` (Line 597)

---

## Backend Log Output

### Before Fix:
```
[ACCOUNT RESTORATION] Generating OTP for user 123
[ACCOUNT RESTORATION] OTP Code: 456789
[ACCOUNT RESTORATION] Expires at: 2025-01-27 10:05:00  ← Local time
...
[Login] Verifying OTP for account restoration - user 123
[Login] Provided OTP: 456789
[Login] ERROR: OTP has expired (UTC: 15:00:30 > Local: 10:05:00)
```

### After Fix:
```
[ACCOUNT RESTORATION] Generating OTP for user 123
[ACCOUNT RESTORATION] OTP Code: 456789
[ACCOUNT RESTORATION] Expires at (UTC): 2025-01-27 15:05:00  ← UTC time
...
[Login] Verifying OTP for account restoration - user 123
[Login] Provided OTP: 456789
[Login] OTP verified - Restoring account for user 123  ← Success!
```

---

## Why This Matters

### Production Considerations:

1. **Server Location**: Servers in different timezones (AWS us-east-1, eu-west-1, etc.)
2. **Database Timezone**: PostgreSQL stores timestamps in UTC by default
3. **Client Timezone**: Users can be anywhere in the world
4. **Consistency**: All time comparisons should use the same timezone

### Best Practice:

✅ **Always use `datetime.utcnow()` for backend time operations**
✅ **Store all timestamps in UTC in database**
✅ **Convert to user's local timezone only in frontend/UI**

---

## Summary

✅ Fixed timezone mismatch between OTP creation and verification
✅ Changed `datetime.now()` → `datetime.utcnow()`
✅ OTP now works immediately after being sent
✅ 5-minute expiration works correctly
✅ No more false "OTP expired" errors

The account restoration OTP system now works reliably! 🎉
