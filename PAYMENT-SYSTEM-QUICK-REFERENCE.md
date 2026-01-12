# Payment System Quick Reference

**Last Updated**: 2026-01-02

---

## Payment Model: Upfront Deposit

```
Advertiser pays full budget → Impressions deliver → Money moves to "used"
```

**Example:** 1M ETB budget, CPI = 1 ETB

1. **Campaign Created** → Advertiser pays 1M ETB upfront
2. **Impressions Deliver** → 100K impressions = 100K ETB moved to "used"
3. **Campaign State**:
   - `campaign_budget`: 1,000,000 ETB (unchanged)
   - `amount_used`: 100,000 ETB (non-refundable)
   - `remaining_balance`: 900,000 ETB (refundable minus fee)

---

## Cancellation Tiers

| Tier | Condition | Fee | Example (900K remaining) |
|------|-----------|-----|--------------------------|
| **Grace Period** | Within 24 hours | **0%** | Refund: 900,000 ETB |
| **New** | First campaign | **5%** | Fee: 45,000 ETB<br>Refund: 855,000 ETB |
| **Regular** | 5+ campaigns | **3%** | Fee: 27,000 ETB<br>Refund: 873,000 ETB |
| **Experienced** | 20+ campaigns | **1%** | Fee: 9,000 ETB<br>Refund: 891,000 ETB |
| **Premium** | 100K+ ETB spent | **0%** | Fee: 0 ETB<br>Refund: 900,000 ETB |

---

## Pause vs Cancel

| Feature | Pause | Cancel |
|---------|-------|--------|
| **Fee** | 0% (FREE) | Tiered (0-5%) |
| **Money** | Locked in campaign | Refunded minus fee |
| **Impressions** | Stop delivering | Stop delivering |
| **Reversible** | Yes (can resume) | No (permanent) |
| **Use Case** | Temporary stop | Permanent termination |

---

## API Endpoints

### Cancellation Calculator
```bash
GET /api/campaign/cancellation-calculator/{campaign_id}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "cancellation": {
    "within_grace_period": false,
    "base_fee_percent": 5.0,
    "final_fee_percent": 5.0,
    "fee_amount": 45000.00,
    "refund_amount": 855000.00,
    "fee_tier_reason": "New advertiser - 5% fee"
  }
}
```

### Pause Campaign
```bash
POST /api/campaign/pause/{campaign_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "reason": "Need to review performance"
}
```

### Resume Campaign
```bash
POST /api/campaign/resume/{campaign_id}
Authorization: Bearer {token}
```

### Cancel Campaign
```bash
POST /api/campaign/cancel-enhanced/{campaign_id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "reason": "Campaign underperforming"
}
```

---

## User Flow Examples

### Example 1: New Advertiser, Cancel Within Grace Period
```
1. Create campaign: 50,000 ETB budget (Jan 1, 10:00 AM)
2. Impressions delivered: 10,000 ETB
3. Remaining: 40,000 ETB
4. Cancel at Jan 2, 9:00 AM (23 hours later)

Result:
✅ Grace period active
✅ Fee: 0 ETB (0%)
✅ Refund: 40,000 ETB
```

### Example 2: Regular Advertiser, Cancel After Grace Period
```
1. Create campaign: 100,000 ETB budget (Jan 1, 10:00 AM)
2. Impressions delivered: 25,000 ETB
3. Remaining: 75,000 ETB
4. Advertiser has 8 campaigns total
5. Cancel at Jan 5 (after grace period)

Result:
❌ Grace period expired
✅ Fee tier: 3% (5+ campaigns)
✅ Fee: 2,250 ETB (3% of 75,000)
✅ Refund: 72,750 ETB
```

### Example 3: Premium Advertiser
```
1. Create campaign: 200,000 ETB budget
2. Impressions delivered: 50,000 ETB
3. Remaining: 150,000 ETB
4. Advertiser has spent 120,000 ETB total
5. Cancel anytime

Result:
✅ Premium tier unlocked
✅ Fee: 0 ETB (0% - premium benefit)
✅ Refund: 150,000 ETB (full remaining)
```

### Example 4: Use Pause Instead
```
1. Create campaign: 80,000 ETB budget
2. Impressions delivered: 20,000 ETB
3. Remaining: 60,000 ETB
4. Clicks "Pause (No Fee)" button

Result:
✅ Fee: 0 ETB
✅ Campaign paused
✅ Money locked: 60,000 ETB
✅ Can resume later or cancel then
```

---

## Frontend UI Elements

### Finances Tab - Cancellation Calculator

```
┌──────────────────────────────────────────────┐
│ 🕐 Grace Period Active!                      │ ← Shows if within 24h
│ Cancel within 12.5 hours for 0% fee          │
├──────────────────────────────────────────────┤
│ Your Fee Tier: [3%] Regular advertiser      │
│                                              │
│ Cancellation Fee: 3% of remaining balance   │
│                                              │
│ If you cancel now:                           │
│   Remaining: 75,000 ETB × 3% = 2,250 ETB fee│
│                                              │
│ You would receive: 72,750 ETB                │
│                                              │
│ ℹ️ The used amount (25,000 ETB) is          │
│    non-refundable as impressions delivered   │
├──────────────────────────────────────────────┤
│ 📊 Reduce Your Fee:                          │
│ • After 5 campaigns: 3% fee                  │
│ • After 20 campaigns: 1% fee                 │
│ • After 100K ETB spent: 0% fee (Premium)     │
├──────────────────────────────────────────────┤
│ [🔶 Pause (No Fee)]  [🔴 Cancel Campaign]   │
└──────────────────────────────────────────────┘
```

---

## Database Fields

### campaign_profile table

**Finance Fields:**
- `campaign_budget` - Total budget paid upfront
- `amount_used` - Money spent on impressions (non-refundable)
- `remaining_balance` - Budget not yet spent (refundable minus fee)

**Payment Fields:**
- `payment_status` - 'paid' or 'unpaid'
- `paid_at` - When payment was made
- `payment_transaction_id` - FK to advertiser_transactions

**Cancellation Fields:**
- `cancellation_fee_percent` - Fee % applied (0-5)
- `cancellation_fee_amount` - Actual fee charged
- `cancelled_by_user_id` - Who cancelled
- `cancellation_reason` - Why cancelled

**Pause Fields:**
- `paused_at` - When paused (NULL if never paused)
- `grace_period_hours` - Grace period duration (default: 24)

---

## Testing Quick Commands

```bash
# Run migration
cd astegni-backend
python migrate_add_pause_and_grace_period_fields.py

# Start backend
python app.py

# Test calculator (replace {token} and {campaign_id})
curl -H "Authorization: Bearer {token}" \
  http://localhost:8000/api/campaign/cancellation-calculator/{campaign_id}

# Test pause
curl -X POST \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Testing"}' \
  http://localhost:8000/api/campaign/pause/{campaign_id}

# Test enhanced cancel
curl -X POST \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Testing"}' \
  http://localhost:8000/api/campaign/cancel-enhanced/{campaign_id}
```

---

## Key Formulas

**Cancellation Fee:**
```
fee = remaining_balance × (tier_percent / 100)
refund = remaining_balance - fee
```

**Tier Calculation:**
```python
if total_spent >= 100000:    return 0%   # Premium
if total_campaigns >= 20:    return 1%   # Experienced
if total_campaigns >= 5:     return 3%   # Regular
else:                        return 5%   # New
```

**Grace Period:**
```python
grace_period_end = created_at + 24 hours
within_grace = now < grace_period_end
final_fee = 0% if within_grace else tier_fee
```

---

## Implementation Checklist

- [x] Database migration (pause + grace period fields)
- [x] Backend endpoints (calculator, pause, resume, cancel-enhanced)
- [x] Frontend UI (calculator display, grace notice, buttons)
- [x] JavaScript functions (load calculator, pause, cancel)
- [x] Router registration (app.py)
- [x] Documentation (this file + comprehensive guide)

---

**Status**: ✅ Ready for production

**Documentation**: See `ENHANCED-CANCELLATION-SYSTEM-COMPLETE.md` for full details
