# Campaign Invoice/Payment Fields - Cleanup Analysis

## Current State

### campaign_profile: 19 Invoice/Payment Fields (REDUNDANT)

**Invoice Tracking:**
1. `invoice_id` - Foreign key to invoices (should be in campaign_invoices)
2. `invoice_status` - Status of invoice (duplicate of campaign_invoices.status)
3. `invoice_due_date` - Due date (duplicate of campaign_invoices.due_date)

**Payment Tracking:**
4. `payment_status` - Payment status (duplicate of campaign_invoices.status)
5. `payment_transaction_id` - Transaction ID (duplicate of campaign_invoices.payment_transaction_id)
6. `paid_at` - Payment timestamp (duplicate of campaign_invoices.paid_at)

**Deposit Tracking:**
7. `deposit_paid` - Boolean flag (can be calculated from campaign_invoices)
8. `deposit_transaction_id` - Transaction ID (should be in campaign_invoices)

**Final Settlement:**
9. `final_settlement_paid` - Boolean flag (can be calculated from campaign_invoices)
10. `final_settlement_transaction_id` - Transaction ID (should be in campaign_invoices)

**Billing:**
11. `billing_frequency` - How often to bill (keep in campaign_profile - campaign setting)
12. `last_billing_at` - Last billing timestamp (can be calculated from campaign_invoices)

**Pricing Model (KEEP - Campaign Settings):**
13. `payment_model` - e.g., 'cpi', 'cpc', 'cpm' (campaign configuration)
14. `campaign_budget` - Total budget (campaign configuration)
15. `cost_per_impression` - CPI rate (campaign configuration)
16. `cost_per_click` - CPC rate (campaign configuration)
17. `cost_per_view` - CPV rate (campaign configuration)
18. `cost_per_engagement` - CPE rate (campaign configuration)
19. `cost_per_conversion_rate` - Conversion rate (campaign configuration)

---

## Problem Summary

### Duplicate Fields (12 fields)
These exist in BOTH `campaign_profile` AND `campaign_invoices`:

| campaign_profile | campaign_invoices | Notes |
|-----------------|-------------------|-------|
| invoice_id | N/A | Should be foreign key relationship |
| invoice_status | status | Same data |
| invoice_due_date | due_date | Same data |
| payment_status | status | Same data |
| payment_transaction_id | payment_transaction_id | Exact duplicate |
| paid_at | paid_at | Exact duplicate |
| deposit_paid | (calculated) | Can derive from invoices with invoice_type='deposit' |
| deposit_transaction_id | payment_transaction_id | Should be in invoice record |
| final_settlement_paid | (calculated) | Can derive from invoices with invoice_type='final_settlement' |
| final_settlement_transaction_id | payment_transaction_id | Should be in invoice record |
| last_billing_at | (calculated) | MAX(issued_at) from campaign_invoices |

**Why This is Bad:**
- Data duplication (same info in two places)
- Update anomalies (update one, forget the other)
- Inconsistency risk
- Violates database normalization principles

---

## campaign_invoices: Missing Fields

The `campaign_invoices` table needs these additional fields:

### Critical Missing Fields:

1. **billing_cycle_number** - Which billing cycle this invoice is for
   - Type: INTEGER
   - Purpose: Track sequential billing cycles

2. **billing_period_start** - Start date of billing period
   - Type: TIMESTAMP
   - Purpose: Define what period this invoice covers

3. **billing_period_end** - End date of billing period
   - Type: TIMESTAMP
   - Purpose: Define what period this invoice covers

4. **clicks_delivered** - Number of clicks delivered (for CPC campaigns)
   - Type: BIGINT
   - Purpose: Track CPC performance

5. **views_delivered** - Number of views delivered (for CPV campaigns)
   - Type: BIGINT
   - Purpose: Track CPV performance

6. **engagements_delivered** - Number of engagements (for CPE campaigns)
   - Type: BIGINT
   - Purpose: Track CPE performance

7. **conversions_delivered** - Number of conversions
   - Type: BIGINT
   - Purpose: Track conversion performance

8. **cpc_rate** - Cost per click rate
   - Type: NUMERIC(10, 2)
   - Purpose: Store CPC rate used for this invoice

9. **cpv_rate** - Cost per view rate
   - Type: NUMERIC(10, 2)
   - Purpose: Store CPV rate used for this invoice

10. **cpe_rate** - Cost per engagement rate
    - Type: NUMERIC(10, 2)
    - Purpose: Store CPE rate used for this invoice

11. **calculated_amount** - Auto-calculated amount based on metrics
    - Type: NUMERIC(10, 2)
    - Purpose: Store calculated amount (impressions * CPI, clicks * CPC, etc.)

12. **discount_amount** - Any discount applied
    - Type: NUMERIC(10, 2)
    - Purpose: Track discounts

13. **tax_amount** - Tax amount
    - Type: NUMERIC(10, 2)
    - Purpose: Track taxes

14. **refund_amount** - Refund amount (if any)
    - Type: NUMERIC(10, 2)
    - Purpose: Track refunds

15. **payment_method** - How it was paid (bank_transfer, card, etc.)
    - Type: VARCHAR(50)
    - Purpose: Track payment method

16. **invoice_pdf_url** - Link to generated invoice PDF
    - Type: VARCHAR(500)
    - Purpose: Store generated invoice document

17. **sent_at** - When invoice was sent to advertiser
    - Type: TIMESTAMP
    - Purpose: Track invoice delivery

18. **reminded_at** - Last reminder sent
    - Type: TIMESTAMP
    - Purpose: Track payment reminders

---

## Recommended Actions

### Phase 1: Enhance campaign_invoices Table

Add missing fields to make `campaign_invoices` the complete source of truth:

```sql
ALTER TABLE campaign_invoices
ADD COLUMN billing_cycle_number INTEGER,
ADD COLUMN billing_period_start TIMESTAMP,
ADD COLUMN billing_period_end TIMESTAMP,
ADD COLUMN clicks_delivered BIGINT DEFAULT 0,
ADD COLUMN views_delivered BIGINT DEFAULT 0,
ADD COLUMN engagements_delivered BIGINT DEFAULT 0,
ADD COLUMN conversions_delivered BIGINT DEFAULT 0,
ADD COLUMN cpc_rate NUMERIC(10, 2),
ADD COLUMN cpv_rate NUMERIC(10, 2),
ADD COLUMN cpe_rate NUMERIC(10, 2),
ADD COLUMN calculated_amount NUMERIC(10, 2),
ADD COLUMN discount_amount NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN tax_amount NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN refund_amount NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN payment_method VARCHAR(50),
ADD COLUMN invoice_pdf_url VARCHAR(500),
ADD COLUMN sent_at TIMESTAMP,
ADD COLUMN reminded_at TIMESTAMP;
```

### Phase 2: Remove Redundant Fields from campaign_profile

Remove these 12 redundant fields:

```sql
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
DROP COLUMN last_billing_at;
```

**Keep in campaign_profile** (Campaign Configuration, NOT Invoice Data):
- `billing_frequency` - Campaign setting
- `payment_model` - Campaign pricing model (CPI, CPC, CPM, etc.)
- `campaign_budget` - Campaign budget limit
- `cost_per_impression` - CPI rate
- `cost_per_click` - CPC rate
- `cost_per_view` - CPV rate
- `cost_per_engagement` - CPE rate
- `cost_per_conversion_rate` - Conversion cost

### Phase 3: Create Helper Views

```sql
-- View: Campaign with payment summary
CREATE OR REPLACE VIEW campaign_with_payment_summary AS
SELECT
    c.*,
    COUNT(i.id) as total_invoices,
    SUM(CASE WHEN i.status = 'paid' THEN i.amount ELSE 0 END) as total_paid,
    SUM(i.outstanding_amount) as total_outstanding,
    MAX(CASE WHEN i.invoice_type = 'deposit' AND i.status = 'paid' THEN TRUE ELSE FALSE END) as deposit_paid,
    MAX(CASE WHEN i.invoice_type = 'final_settlement' AND i.status = 'paid' THEN TRUE ELSE FALSE END) as final_settlement_paid,
    MAX(i.issued_at) as last_billed_at,
    (
        SELECT json_agg(
            json_build_object(
                'id', id,
                'invoice_number', invoice_number,
                'type', invoice_type,
                'amount', amount,
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

-- Function: Get campaign payment status
CREATE OR REPLACE FUNCTION get_campaign_payment_status(p_campaign_id INTEGER)
RETURNS VARCHAR AS $$
DECLARE
    v_total_outstanding NUMERIC;
    v_deposit_paid BOOLEAN;
BEGIN
    SELECT
        SUM(outstanding_amount),
        MAX(CASE WHEN invoice_type = 'deposit' AND status = 'paid' THEN TRUE ELSE FALSE END)
    INTO v_total_outstanding, v_deposit_paid
    FROM campaign_invoices
    WHERE campaign_id = p_campaign_id;

    IF v_total_outstanding IS NULL THEN
        RETURN 'no_invoices';
    ELSIF v_total_outstanding = 0 THEN
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

## Final Schema Comparison

### BEFORE (Messy)

```
campaign_profile (82 columns + 19 invoice/payment fields = 101 columns)
  ├─ id, name, brand_id, advertiser_id
  ├─ Campaign Settings: billing_frequency, payment_model, campaign_budget
  ├─ Pricing: cost_per_impression, cost_per_click, cost_per_view, etc.
  ├─ REDUNDANT: invoice_id, invoice_status, invoice_due_date
  ├─ REDUNDANT: payment_status, payment_transaction_id, paid_at
  ├─ REDUNDANT: deposit_paid, deposit_transaction_id
  ├─ REDUNDANT: final_settlement_paid, final_settlement_transaction_id
  └─ REDUNDANT: last_billing_at

campaign_invoices (19 columns - INCOMPLETE)
  ├─ Basic: id, campaign_id, invoice_number, amount
  ├─ Status: status, due_date, paid_at
  └─ MISSING: billing cycle, performance metrics, detailed tracking
```

### AFTER (Clean)

```
campaign_profile (89 columns - CLEAN)
  ├─ Campaign metadata and settings
  ├─ Pricing configuration (CPI, CPC, CPV, CPE rates)
  ├─ Campaign budget and billing frequency
  └─ NO invoice/payment status data

campaign_invoices (37 columns - COMPLETE)
  ├─ Invoice identification
  ├─ Billing period and cycle tracking
  ├─ Performance metrics (impressions, clicks, views, engagements, conversions)
  ├─ Pricing rates (CPI, CPC, CPV, CPE)
  ├─ Financial details (amounts, discounts, taxes, refunds)
  ├─ Payment tracking (status, method, transaction_id, paid_at)
  ├─ Invoice delivery (sent_at, reminded_at, pdf_url)
  └─ Single source of truth for ALL invoice data

campaign_with_payment_summary (view)
  └─ Campaign + aggregated payment data in one query

get_campaign_payment_status(id)
  └─ Get current payment status: no_invoices, fully_paid, deposit_pending, partially_paid
```

---

## Benefits

1. **Single Source of Truth**: All invoice data in `campaign_invoices`
2. **No Duplication**: Each piece of data stored once
3. **No Update Anomalies**: Can't have mismatched data
4. **Complete Tracking**: All invoice details captured
5. **Performance Metrics**: Track impressions, clicks, views, engagements, conversions
6. **Better Reporting**: Calculate revenue per metric type
7. **Audit Trail**: Complete history of all invoices
8. **Scalability**: Multiple invoices per campaign (deposits, recurring billing, final settlement)

---

## Migration Impact

### Backend Changes Required:
1. Update invoice creation endpoints
2. Update payment status queries (use view or function)
3. Update dashboard analytics

### Frontend Changes Required:
1. Update payment status displays
2. Update invoice list rendering
3. Update payment tracking UI

### Database Changes:
- Add 18 columns to `campaign_invoices`
- Remove 12 columns from `campaign_profile`
- Create 1 view and 1 function

---

## Summary

### Fields to REMOVE from campaign_profile (12 fields):
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

### Fields to KEEP in campaign_profile (8 fields - Campaign Configuration):
1. billing_frequency - How often to bill
2. payment_model - CPI, CPC, CPM, etc.
3. campaign_budget - Total budget
4. cost_per_impression - CPI rate
5. cost_per_click - CPC rate
6. cost_per_view - CPV rate
7. cost_per_engagement - CPE rate
8. cost_per_conversion_rate - Conversion cost

### Fields to ADD to campaign_invoices (18 fields):
1. billing_cycle_number
2. billing_period_start
3. billing_period_end
4. clicks_delivered
5. views_delivered
6. engagements_delivered
7. conversions_delivered
8. cpc_rate
9. cpv_rate
10. cpe_rate
11. calculated_amount
12. discount_amount
13. tax_amount
14. refund_amount
15. payment_method
16. invoice_pdf_url
17. sent_at
18. reminded_at

**Result**:
- campaign_profile: 101 columns → 89 columns (12 removed)
- campaign_invoices: 19 columns → 37 columns (18 added)
- Clean separation: Campaign config vs Invoice tracking
