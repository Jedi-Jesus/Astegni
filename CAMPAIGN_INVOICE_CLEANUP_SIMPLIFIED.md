# Campaign Invoice/Payment Fields - Simplified Cleanup

## Business Model: CPI (Cost Per Impression) Only

Astegni uses **Cost Per Impression (CPI)** as the sole pricing model. Other metrics (clicks, views, engagements, conversions) are tracked in `campaign_impressions` for analytics only, NOT for billing.

---

## Current State

### campaign_profile: 19 Invoice/Payment Fields

**Redundant (12 fields to REMOVE):**
1. `invoice_id` - Should use relationship, not stored value
2. `invoice_status` - Duplicate of campaign_invoices.status
3. `invoice_due_date` - Duplicate of campaign_invoices.due_date
4. `payment_status` - Duplicate of campaign_invoices.status
5. `payment_transaction_id` - Duplicate of campaign_invoices.payment_transaction_id
6. `paid_at` - Duplicate of campaign_invoices.paid_at
7. `deposit_paid` - Calculated from campaign_invoices
8. `deposit_transaction_id` - Should be in campaign_invoices
9. `final_settlement_paid` - Calculated from campaign_invoices
10. `final_settlement_transaction_id` - Should be in campaign_invoices
11. `last_billing_at` - Calculated (MAX(issued_at) from campaign_invoices)

**Unnecessary (6 fields to REMOVE - Not using CPC/CPV/CPE pricing):**
12. `payment_model` - Always 'cpi', no need to store
13. `cost_per_click` - Not used (CPI only)
14. `cost_per_view` - Not used (CPI only)
15. `cost_per_engagement` - Not used (CPI only)
16. `cost_per_conversion_rate` - Not used (CPI only)

**Keep (3 fields - Campaign Configuration):**
- `billing_frequency` - How often to bill (e.g., weekly, monthly)
- `campaign_budget` - Total campaign budget limit
- `cost_per_impression` - CPI rate for this campaign

---

## campaign_impressions: Analytics Data (Already Complete)

The `campaign_impressions` table tracks:
- Impressions (viewable, unique)
- Clicks (clicked, clicked_at)
- Conversions (converted, converted_at)
- CPI rate (cpi_rate)
- Charging (charged, charged_at)

**No changes needed** - This table is for analytics and detailed tracking.

---

## campaign_invoices: Missing Fields

### Essential Fields to Add (10 fields):

**Billing Period:**
1. `billing_cycle_number` INTEGER - Which billing cycle (1st, 2nd, 3rd...)
2. `billing_period_start` TIMESTAMP - Start of billing period
3. `billing_period_end` TIMESTAMP - End of billing period

**Performance Metrics (from campaign_impressions):**
4. `clicks_count` BIGINT - Total clicks in this period (analytics only)
5. `conversions_count` BIGINT - Total conversions in this period (analytics only)

**Financial Details:**
6. `discount_amount` NUMERIC(10, 2) - Discount applied
7. `tax_amount` NUMERIC(10, 2) - Tax amount
8. `refund_amount` NUMERIC(10, 2) - Refund (if any)

**Invoice Management:**
9. `payment_method` VARCHAR(50) - How paid (bank_transfer, card, etc.)
10. `invoice_pdf_url` VARCHAR(500) - Generated invoice PDF

**Current fields already in campaign_invoices:**
- impressions_delivered (BIGINT) - Total impressions billed
- cpi_rate (NUMERIC) - CPI rate used
- amount (NUMERIC) - Total amount (impressions_delivered * cpi_rate)
- deposit_amount (NUMERIC) - Deposit amount
- outstanding_amount (NUMERIC) - Amount still owed

---

## Migration Plan

### Step 1: Enhance campaign_invoices Table

Add 10 essential fields:

```sql
ALTER TABLE campaign_invoices
ADD COLUMN billing_cycle_number INTEGER,
ADD COLUMN billing_period_start TIMESTAMP,
ADD COLUMN billing_period_end TIMESTAMP,
ADD COLUMN clicks_count BIGINT DEFAULT 0,
ADD COLUMN conversions_count BIGINT DEFAULT 0,
ADD COLUMN discount_amount NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN tax_amount NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN refund_amount NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN payment_method VARCHAR(50),
ADD COLUMN invoice_pdf_url VARCHAR(500);
```

### Step 2: Remove Redundant Fields from campaign_profile

Remove 18 fields (12 redundant + 6 unused pricing models):

```sql
-- Backup first
CREATE TABLE campaign_profile_invoice_backup AS
SELECT
    id as campaign_id,
    invoice_id, invoice_status, invoice_due_date,
    payment_status, payment_transaction_id, paid_at,
    deposit_paid, deposit_transaction_id,
    final_settlement_paid, final_settlement_transaction_id,
    last_billing_at,
    payment_model, cost_per_click, cost_per_view,
    cost_per_engagement, cost_per_conversion_rate
FROM campaign_profile;

-- Remove redundant fields
ALTER TABLE campaign_profile
DROP COLUMN invoice_id,
DROP COLUMN invoice_status,
DROP COLUMN invoice_due_date,
DROP COLUMN payment_status,
DROP COLUMN payment_transaction_id,
DROP COLUMN paid_at,
DROP COLUMN deposit_paid,
DROP COLUMN deposit_transaction_id,
DROP COLUMN final_settlement_paid,
DROP COLUMN final_settlement_transaction_id,
DROP COLUMN last_billing_at,
DROP COLUMN payment_model,
DROP COLUMN cost_per_click,
DROP COLUMN cost_per_view,
DROP COLUMN cost_per_engagement,
DROP COLUMN cost_per_conversion_rate;
```

**Keep in campaign_profile:**
- `billing_frequency` - Campaign setting
- `campaign_budget` - Budget limit
- `cost_per_impression` - CPI rate

### Step 3: Create Helper Views

```sql
-- View: Campaign with payment summary
CREATE OR REPLACE VIEW campaign_with_payment_summary AS
SELECT
    c.*,
    COUNT(i.id) as total_invoices,
    SUM(i.impressions_delivered) as total_impressions_billed,
    SUM(CASE WHEN i.status = 'paid' THEN i.amount ELSE 0 END) as total_paid,
    SUM(i.outstanding_amount) as total_outstanding,
    COALESCE(
        (SELECT TRUE FROM campaign_invoices
         WHERE campaign_id = c.id AND invoice_type = 'deposit' AND status = 'paid' LIMIT 1),
        FALSE
    ) as deposit_paid,
    COALESCE(
        (SELECT TRUE FROM campaign_invoices
         WHERE campaign_id = c.id AND invoice_type = 'final_settlement' AND status = 'paid' LIMIT 1),
        FALSE
    ) as final_settlement_paid,
    MAX(i.issued_at) as last_billed_at,
    (
        SELECT json_agg(
            json_build_object(
                'id', id,
                'invoice_number', invoice_number,
                'type', invoice_type,
                'amount', amount,
                'impressions', impressions_delivered,
                'cpi_rate', cpi_rate,
                'status', status,
                'due_date', due_date,
                'paid_at', paid_at
            )
            ORDER BY issued_at DESC
        )
        FROM campaign_invoices
        WHERE campaign_id = c.id
    ) as invoices
FROM campaign_profile c
LEFT JOIN campaign_invoices i ON c.id = i.campaign_id
GROUP BY c.id;

-- Function: Get payment status
CREATE OR REPLACE FUNCTION get_campaign_payment_status(p_campaign_id INTEGER)
RETURNS VARCHAR AS $$
DECLARE
    v_outstanding NUMERIC;
    v_deposit_paid BOOLEAN;
BEGIN
    SELECT
        SUM(outstanding_amount),
        COALESCE(MAX(CASE WHEN invoice_type = 'deposit' AND status = 'paid' THEN TRUE ELSE FALSE END), FALSE)
    INTO v_outstanding, v_deposit_paid
    FROM campaign_invoices
    WHERE campaign_id = p_campaign_id;

    IF v_outstanding IS NULL THEN
        RETURN 'no_invoices';
    ELSIF v_outstanding = 0 THEN
        RETURN 'fully_paid';
    ELSIF NOT v_deposit_paid THEN
        RETURN 'deposit_pending';
    ELSE
        RETURN 'partially_paid';
    END IF;
END;
$$ LANGUAGE plpgsql;
```

---

## Final Schema

### campaign_profile (Cleaned)
```
campaign_profile (71 columns - CLEAN)
  ├─ Campaign metadata (id, name, brand_id, advertiser_id, etc.)
  ├─ Campaign settings (status, dates, targeting, etc.)
  ├─ Billing configuration:
  │   ├─ billing_frequency - How often to bill
  │   ├─ campaign_budget - Total budget limit
  │   └─ cost_per_impression - CPI rate
  └─ NO invoice/payment tracking data
```

### campaign_invoices (Complete)
```
campaign_invoices (29 columns - COMPLETE)
  ├─ Identification: id, campaign_id, advertiser_id, brand_id, invoice_number
  ├─ Invoice type: invoice_type (deposit, recurring, final_settlement)
  ├─ Billing period: billing_cycle_number, billing_period_start, billing_period_end
  ├─ Performance: impressions_delivered, clicks_count, conversions_count
  ├─ Pricing: cpi_rate, amount, calculated from impressions
  ├─ Financial: deposit_amount, outstanding_amount, discount_amount, tax_amount, refund_amount
  ├─ Payment: status, payment_transaction_id, paid_at, payment_method
  ├─ Delivery: issued_at, due_date, invoice_pdf_url
  └─ Timestamps: created_at, updated_at
```

### campaign_impressions (Analytics - No Changes)
```
campaign_impressions (25 columns - UNCHANGED)
  ├─ Impression tracking (is_unique_impression, is_viewable, viewable_duration)
  ├─ Click tracking (clicked, clicked_at)
  ├─ Conversion tracking (converted, converted_at)
  ├─ User data (user_id, profile_id, profile_type, device_type, location)
  ├─ Placement data (placement, audience, region)
  ├─ Charging (cpi_rate, charged, charged_at)
  └─ For analytics and detailed reporting only
```

---

## How Billing Works (CPI Model)

### Invoice Creation Flow:
```
1. Billing cycle ends (weekly/monthly based on billing_frequency)
   ↓
2. Count impressions from campaign_impressions table
   WHERE campaign_id = X
   AND charged = TRUE
   AND created_at BETWEEN billing_period_start AND billing_period_end
   ↓
3. Calculate amount
   impressions_delivered * cpi_rate = amount
   ↓
4. Create invoice in campaign_invoices
   - impressions_delivered: counted from campaign_impressions
   - cpi_rate: from campaign_profile.cost_per_impression
   - amount: calculated
   - clicks_count: COUNT(*) WHERE clicked = TRUE (analytics only)
   - conversions_count: COUNT(*) WHERE converted = TRUE (analytics only)
   ↓
5. Invoice issued to advertiser
   - status: 'pending'
   - due_date: issued_at + payment_terms (e.g., 30 days)
```

---

## Summary

### Removed from campaign_profile (18 fields):
**Redundant Invoice/Payment Fields (12):**
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
11. last_billing_at

**Unused Pricing Models (6):**
12. payment_model (always 'cpi')
13. cost_per_click (not used)
14. cost_per_view (not used)
15. cost_per_engagement (not used)
16. cost_per_conversion_rate (not used)

### Kept in campaign_profile (3 fields):
1. billing_frequency
2. campaign_budget
3. cost_per_impression

### Added to campaign_invoices (10 fields):
1. billing_cycle_number
2. billing_period_start
3. billing_period_end
4. clicks_count (analytics)
5. conversions_count (analytics)
6. discount_amount
7. tax_amount
8. refund_amount
9. payment_method
10. invoice_pdf_url

**Result:**
- campaign_profile: 89 columns → 71 columns (18 removed)
- campaign_invoices: 19 columns → 29 columns (10 added)
- campaign_impressions: 25 columns (unchanged - for analytics)
- Clean CPI-based billing system
