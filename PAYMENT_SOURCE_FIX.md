# Payment Source Fix: advertiser_profiles.balance

**Date:** 2026-01-15
**Status:** ✅ Complete

## Problem

Initial implementation of the 20% deposit system incorrectly used `users.account_balance` as the payment source. However, the actual payment flow is:

1. Advertiser deposits money via **external payment gateway** (Chapa, etc.)
2. Money goes to **Astegni's bank account** (not user's account)
3. System tracks advertiser's prepaid balance in **`advertiser_profiles.balance`**

## Solution

Updated all payment-related endpoints to use `advertiser_profiles.balance` instead of `users.account_balance`.

## Files Modified

### 1. `astegni-backend/campaign_deposit_endpoints.py`

#### Changes in `create_campaign_with_deposit()` (Lines 121-205):

**Before:**
```python
# Get user's account balance
cur.execute("""
    SELECT account_balance FROM users WHERE id = %s
""", (advertiser['user_id'],))
user = cur.fetchone()
user_balance = float(user.get('account_balance', 0))

# Check if user has sufficient balance for deposit
if user_balance < deposit_amount:
    raise HTTPException(...)

# Deduct deposit from user's account balance
new_user_balance = user_balance - deposit_amount
cur.execute("""
    UPDATE users
    SET account_balance = %s
    WHERE id = %s
""", (new_user_balance, advertiser['user_id']))
```

**After:**
```python
# Get advertiser's balance
cur.execute("""
    SELECT balance FROM advertiser_profiles WHERE id = %s
""", (advertiser_profile_id,))
advertiser_data = cur.fetchone()
advertiser_balance = float(advertiser_data.get('balance', 0))

# Check if advertiser has sufficient balance for deposit
if advertiser_balance < deposit_amount:
    raise HTTPException(...)

# Deduct deposit from advertiser's balance
new_advertiser_balance = advertiser_balance - deposit_amount
cur.execute("""
    UPDATE advertiser_profiles
    SET balance = %s,
        updated_at = NOW()
    WHERE id = %s
""", (new_advertiser_balance, advertiser_profile_id))
```

#### Changes in `pay_invoice()` (Lines 503-524):

**Before:**
```python
# Get user balance
cur.execute("""
    SELECT account_balance FROM users WHERE id = %s
""", (advertiser['user_id'],))
user = cur.fetchone()
user_balance = float(user.get('account_balance', 0))

# Deduct from user balance
new_user_balance = user_balance - outstanding_amount
cur.execute("""
    UPDATE users
    SET account_balance = %s
    WHERE id = %s
""", (new_user_balance, advertiser['user_id']))
```

**After:**
```python
# Get advertiser balance
cur.execute("""
    SELECT balance FROM advertiser_profiles WHERE id = %s
""", (advertiser_profile_id,))
advertiser = cur.fetchone()
advertiser_balance = float(advertiser.get('balance', 0))

# Deduct from advertiser balance
new_advertiser_balance = advertiser_balance - outstanding_amount
cur.execute("""
    UPDATE advertiser_profiles
    SET balance = %s,
        updated_at = NOW()
    WHERE id = %s
""", (new_advertiser_balance, advertiser_profile_id))
```

#### Response Field Changes:

**Before:**
```json
{
  "payment": {
    "user_balance_before": 10000,
    "user_balance_after": 8000,
    "payment_source": "user_account"
  }
}
```

**After:**
```json
{
  "payment": {
    "advertiser_balance_before": 10000,
    "advertiser_balance_after": 8000,
    "payment_source": "advertiser_balance"
  }
}
```

### 2. `astegni-backend/campaign_stop_endpoints.py`

#### Changes in `stop_campaign_with_settlement()` (Lines 116-193):

**Before:**
```python
# Get advertiser user_id for account operations
cur.execute("""
    SELECT user_id FROM advertiser_profiles WHERE id = %s
""", (advertiser_profile_id,))
advertiser = cur.fetchone()
user_id = advertiser['user_id']

# CASE 2: Advertiser overpaid (settlement < 0)
elif settlement_amount < -0.01:
    settlement_type = 'credit_issued'
    credit_amount = abs(settlement_amount)

    # Credit user account
    cur.execute("""
        UPDATE users
        SET account_balance = account_balance + %s
        WHERE id = %s
    """, (credit_amount, user_id))
```

**After:**
```python
# Get advertiser balance for credit operations
cur.execute("""
    SELECT balance FROM advertiser_profiles WHERE id = %s
""", (advertiser_profile_id,))
advertiser = cur.fetchone()
advertiser_balance = float(advertiser.get('balance', 0))

# CASE 2: Advertiser overpaid (settlement < 0)
elif settlement_amount < -0.01:
    settlement_type = 'credit_issued'
    credit_amount = abs(settlement_amount)

    # Credit advertiser balance
    new_advertiser_balance = advertiser_balance + credit_amount
    cur.execute("""
        UPDATE advertiser_profiles
        SET balance = %s,
            updated_at = NOW()
        WHERE id = %s
    """, (new_advertiser_balance, advertiser_profile_id))
```

### 3. `CAMPAIGN_DEPOSIT_SYSTEM.md`

Updated documentation to clarify:
- Payment source is `advertiser_profiles.balance`
- Money flow: External payment gateway → Astegni bank account → tracked in `advertiser_profiles.balance`
- Credits go back to `advertiser_profiles.balance`

## Database Schema

### `advertiser_profiles` Table

The `balance` column tracks advertiser's prepaid funds:

```sql
CREATE TABLE advertiser_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    balance NUMERIC(10,2) DEFAULT 0.00,  -- Prepaid balance from external deposits
    total_spent NUMERIC(10,2) DEFAULT 0.00,
    total_deposits NUMERIC(10,2) DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'ETB',
    ...
);
```

## Payment Flow

### Complete Flow:

1. **External Deposit** (via Chapa/payment gateway):
   - Advertiser clicks "Deposit" button
   - External payment gateway processes payment
   - Money goes to **Astegni's bank account**
   - System updates `advertiser_profiles.balance` (via webhook or manual confirmation)

2. **Campaign Creation (20% Deposit)**:
   - System checks `advertiser_profiles.balance`
   - Deducts 20% from `advertiser_profiles.balance`
   - Campaign starts running

3. **Campaign Completion**:
   - System generates invoice for remaining 80%
   - Advertiser pays invoice
   - System deducts from `advertiser_profiles.balance`

4. **Early Stop with Overpayment**:
   - System calculates actual cost < deposit
   - Credits difference back to `advertiser_profiles.balance`
   - Advertiser can use credit for next campaign

## Impact

### What Changed:
- ✅ All campaign costs now deducted from `advertiser_profiles.balance`
- ✅ All credits now go to `advertiser_profiles.balance`
- ✅ No more touching `users.account_balance` for campaign payments

### What Stayed the Same:
- ✅ All campaign logic (20% deposit, invoicing, settlement)
- ✅ API endpoints (same URLs, same request/response structure)
- ✅ Database schema (no migration needed)
- ✅ Frontend (no changes needed)

### Breaking Changes:
- ⚠️ Response fields renamed:
  - `user_balance_before` → `advertiser_balance_before`
  - `user_balance_after` → `advertiser_balance_after`
  - `payment_source: "user_account"` → `payment_source: "advertiser_balance"`

## Testing Checklist

- [ ] Create campaign with deposit → verify deducted from `advertiser_profiles.balance`
- [ ] Stop campaign (owe money) → verify invoice generated
- [ ] Stop campaign (overpaid) → verify credit to `advertiser_profiles.balance`
- [ ] Pay invoice → verify deducted from `advertiser_profiles.balance`
- [ ] Check insufficient balance error → verify correct error message
- [ ] Verify `advertiser_transactions` records correct balance_before/balance_after

## Notes

- The `advertiser_profiles.balance` field already existed in the database
- No migration needed - just code changes
- Frontend may need updates if it displays balance information
- External payment integration (Chapa webhook) needs to update `advertiser_profiles.balance` when deposits are made

## Summary

✅ **Fixed payment source from `users.account_balance` to `advertiser_profiles.balance`**
✅ **All endpoints updated consistently**
✅ **Documentation updated**
✅ **No database migration required**
✅ **Ready for testing**
