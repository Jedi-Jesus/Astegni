# Campaign Invoice Cleanup - Final Summary

## ✅ COMPLETE: CPI-Only Billing System

---

## Final Changes

### campaign_invoices: 19 → 27 columns (+8 fields)

**Added 8 Essential Fields:**

| Field | Type | Purpose |
|-------|------|---------|
| billing_cycle_number | INTEGER | Track billing cycle (1st, 2nd, 3rd...) |
| billing_period_start | TIMESTAMP | Period start date |
| billing_period_end | TIMESTAMP | Period end date |
| discount_amount | NUMERIC(10, 2) | Discount applied |
| tax_amount | NUMERIC(10, 2) | Tax amount |
| refund_amount | NUMERIC(10, 2) | Refund amount |
| payment_method | VARCHAR(50) | Payment method |
| invoice_pdf_url | VARCHAR(500) | Generated invoice PDF URL |

**Note:** Removed clicks_count and conversions_count - these stay in campaign_impressions where they belong.

---

### campaign_profile: 82 → 66 columns (-16 fields)

**Removed 16 Fields:**

**Invoice/Payment Tracking (10):**
1. invoice_id
2. invoice_status
3. invoice_due_date
4. payment_status
5. payment_transaction_id
6. paid_at
7. deposit_paid
8. deposit_transaction_id
9. final_settlement_paid
10. final_settlement_transaction_id

**Unused Pricing Models (6):**
11. payment_model
12. cost_per_click
13. cost_per_view
14. cost_per_engagement
15. cost_per_conversion_rate
16. last_billing_at

**Kept 3 Essential Fields:**
- billing_frequency
- campaign_budget
- cost_per_impression

---

## Final Database Structure

### campaign_profile (66 columns)
```
Campaign Settings Only
├─ Core: id, name, brand_id, advertiser_id
├─ Targeting: placements, audiences, regions
├─ Billing Configuration:
│   ├─ billing_frequency
│   ├─ campaign_budget
│   └─ cost_per_impression (CPI rate)
└─ NO invoice/payment data
```

### campaign_invoices (27 columns)
```
Billing & Payment Tracking
├─ Identification: id, campaign_id, advertiser_id, brand_id, invoice_number
├─ Type: invoice_type (deposit, recurring, final_settlement)
├─ Billing Period:
│   ├─ billing_cycle_number
│   ├─ billing_period_start
│   └─ billing_period_end
├─ Performance:
│   ├─ impressions_delivered (what we bill for)
│   └─ cpi_rate (rate used)
├─ Financial:
│   ├─ amount (impressions × CPI)
│   ├─ deposit_amount
│   ├─ outstanding_amount
│   ├─ discount_amount
│   ├─ tax_amount
│   └─ refund_amount
├─ Payment:
│   ├─ status
│   ├─ payment_transaction_id
│   ├─ paid_at
│   └─ payment_method
├─ Management:
│   ├─ issued_at
│   ├─ due_date
│   ├─ invoice_pdf_url
│   └─ notes
└─ Timestamps: created_at, updated_at
```

### campaign_impressions (25 columns - UNCHANGED)
```
Analytics & Detailed Tracking (NOT in invoices)
├─ Impressions: is_unique, is_viewable, viewable_duration
├─ Clicks: clicked, clicked_at
├─ Conversions: converted, converted_at
├─ User Context: user_id, profile_id, device, location
├─ Charging: cpi_rate, charged, charged_at
└─ All analytics data stays here
```

---

## Data Separation

### campaign_profile
**What it stores:** Campaign configuration
**Examples:** billing frequency, budget, CPI rate, targeting rules

### campaign_invoices
**What it stores:** Billing records
**Examples:** How many impressions billed, amount owed, payment status

### campaign_impressions
**What it stores:** Every single impression + analytics
**Examples:** Who saw it, when, where, did they click, did they convert

---

## CPI Billing Flow

```
1. Billing period ends
   ↓
2. Query campaign_impressions
   COUNT(*) WHERE campaign_id = X
   AND charged = TRUE
   AND created_at BETWEEN period_start AND period_end
   ↓
3. Calculate
   impressions_delivered × cpi_rate = amount
   ↓
4. Create invoice in campaign_invoices
   INSERT INTO campaign_invoices (
       campaign_id,
       impressions_delivered,  ← from campaign_impressions
       cpi_rate,              ← from campaign_profile
       amount,                ← calculated
       billing_cycle_number,
       billing_period_start,
       billing_period_end,
       ...
   )
   ↓
5. Advertiser pays invoice
   UPDATE campaign_invoices SET
       status = 'paid',
       paid_at = NOW(),
       payment_method = 'bank_transfer',
       outstanding_amount = 0
```

**Analytics (clicks, conversions) are queried from campaign_impressions when needed - not stored in invoice.**

---

## Helper Tools

### 1. campaign_with_payment_summary (view)
```sql
SELECT * FROM campaign_with_payment_summary WHERE id = 3;
```
Returns campaign with aggregated payment data (total invoices, paid amounts, etc.)

### 2. get_campaign_payment_status() (function)
```sql
SELECT get_campaign_payment_status(3);
```
Returns: `'no_invoices'`, `'fully_paid'`, `'deposit_pending'`, or `'partially_paid'`

---

## Example Queries

### Get campaign with billing summary
```sql
SELECT
    c.id,
    c.name,
    c.campaign_budget,
    c.cost_per_impression,
    cps.total_invoices,
    cps.total_impressions_billed,
    cps.total_paid,
    cps.total_outstanding,
    get_campaign_payment_status(c.id) as status
FROM campaign_profile c
LEFT JOIN campaign_with_payment_summary cps ON c.id = cps.id
WHERE c.id = 3;
```

### Get invoice with analytics from campaign_impressions
```sql
SELECT
    i.invoice_number,
    i.billing_cycle_number,
    i.impressions_delivered,
    i.cpi_rate,
    i.amount,
    -- Get clicks for this billing period
    (SELECT COUNT(*) FROM campaign_impressions
     WHERE campaign_id = i.campaign_id
     AND clicked = TRUE
     AND created_at BETWEEN i.billing_period_start AND i.billing_period_end
    ) as clicks_in_period,
    -- Get conversions for this billing period
    (SELECT COUNT(*) FROM campaign_impressions
     WHERE campaign_id = i.campaign_id
     AND converted = TRUE
     AND created_at BETWEEN i.billing_period_start AND i.billing_period_end
    ) as conversions_in_period,
    i.status,
    i.paid_at
FROM campaign_invoices i
WHERE i.campaign_id = 3
ORDER BY i.billing_cycle_number DESC;
```

This way analytics are calculated on-demand from the source of truth (campaign_impressions), not duplicated in invoices.

---

## Migration Files

### Created/Updated:
1. **migrate_enhance_campaign_invoices.py** - Adds 8 fields (not 10)
2. **migrate_remove_redundant_invoice_fields.py** - Removes 16 fields
3. **CAMPAIGN_INVOICE_FINAL_SUMMARY.md** - This document

### To Run:
```bash
cd astegni-backend

# Already run:
python migrate_enhance_campaign_invoices.py
python migrate_remove_redundant_invoice_fields.py

# Already removed:
# - clicks_count and conversions_count from campaign_invoices
```

---

## Backups

- **campaign_profile_invoice_backup** - Contains removed fields (2 campaigns)
- Can be dropped after verification

---

## Summary

### What We Achieved:

1. **Clean Separation**
   - campaign_profile: Configuration only
   - campaign_invoices: Billing records only
   - campaign_impressions: Analytics data only

2. **No Duplication**
   - Clicks/conversions NOT in invoices
   - Query from campaign_impressions when needed
   - Single source of truth

3. **CPI-Optimized**
   - Only impressions_delivered in invoices
   - Only cost_per_impression in campaign_profile
   - No CPC/CPV/CPE fields

4. **Complete Invoice Tracking**
   - Billing cycles and periods
   - Financial details (discounts, taxes, refunds)
   - Payment methods and PDF URLs

### Final Column Counts:
- campaign_profile: **66 columns** (was 82)
- campaign_invoices: **27 columns** (was 19)
- campaign_impressions: **25 columns** (unchanged)

**Status:** ✅ Complete and optimized for CPI-only business model
