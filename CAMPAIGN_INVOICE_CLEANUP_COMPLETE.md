# Campaign Invoice/Payment Cleanup - COMPLETE ✅

## Summary

Successfully cleaned up campaign invoice/payment structure for **CPI-only business model**.

---

## Changes Made

### 1. Enhanced campaign_invoices Table ✅

**Added 10 new fields:**

| Field | Type | Purpose |
|-------|------|---------|
| billing_cycle_number | INTEGER | Track billing cycle (1st, 2nd, 3rd...) |
| billing_period_start | TIMESTAMP | Period start date |
| billing_period_end | TIMESTAMP | Period end date |
| clicks_count | BIGINT | Total clicks (analytics only) |
| conversions_count | BIGINT | Total conversions (analytics only) |
| discount_amount | NUMERIC(10, 2) | Discount applied |
| tax_amount | NUMERIC(10, 2) | Tax amount |
| refund_amount | NUMERIC(10, 2) | Refund amount |
| payment_method | VARCHAR(50) | Payment method (bank_transfer, card, etc.) |
| invoice_pdf_url | VARCHAR(500) | Generated invoice PDF URL |

**Result:** 19 columns → **29 columns**

---

### 2. Cleaned campaign_profile Table ✅

**Removed 16 redundant fields:**

**Invoice/Payment Tracking (10 fields):**
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

**Unused Pricing Models (6 fields):**
11. payment_model (always 'cpi')
12. cost_per_click (not used)
13. cost_per_view (not used)
14. cost_per_engagement (not used)
15. cost_per_conversion_rate (not used)
16. last_billing_at (calculated from invoices)

**Kept 3 Essential Fields:**
- `billing_frequency` - How often to bill (campaign setting)
- `campaign_budget` - Total budget limit (campaign setting)
- `cost_per_impression` - CPI rate (campaign pricing)

**Result:** 82 columns → **66 columns** (16 removed)

---

## Final Database Structure

### campaign_profile (66 columns)
```
Campaign Configuration Only
├─ Core: id, name, brand_id, advertiser_id, status
├─ Targeting: target_placements, target_audiences, target_regions
├─ Scheduling: start_date, end_date, timezone
├─ Billing Settings:
│   ├─ billing_frequency (weekly, monthly, etc.)
│   ├─ campaign_budget (total budget limit)
│   └─ cost_per_impression (CPI rate)
└─ NO invoice/payment tracking data
```

### campaign_invoices (29 columns)
```
Complete Invoice Tracking
├─ Identification: id, campaign_id, advertiser_id, brand_id, invoice_number
├─ Invoice Type: invoice_type (deposit, recurring, final_settlement)
├─ Billing Cycle:
│   ├─ billing_cycle_number (1st, 2nd, 3rd...)
│   ├─ billing_period_start
│   └─ billing_period_end
├─ Performance Metrics:
│   ├─ impressions_delivered (billed impressions)
│   ├─ clicks_count (analytics)
│   └─ conversions_count (analytics)
├─ Pricing: cpi_rate, amount (impressions × CPI)
├─ Financial:
│   ├─ deposit_amount
│   ├─ outstanding_amount
│   ├─ discount_amount
│   ├─ tax_amount
│   └─ refund_amount
├─ Payment:
│   ├─ status (pending, paid, overdue, cancelled)
│   ├─ payment_transaction_id
│   ├─ paid_at
│   └─ payment_method
├─ Invoice Management:
│   ├─ issued_at
│   ├─ due_date
│   ├─ invoice_pdf_url
│   └─ notes
└─ Timestamps: created_at, updated_at
```

### campaign_impressions (25 columns - No Changes)
```
Analytics & Detailed Tracking
├─ Impression: is_unique_impression, is_viewable, viewable_duration
├─ Click: clicked, clicked_at
├─ Conversion: converted, converted_at
├─ User: user_id, profile_id, profile_type
├─ Context: placement, audience, region, device_type, location
├─ Technical: ip_address, user_agent, session_id
└─ Charging: cpi_rate, charged, charged_at
```

---

## Helper Tools Created

### 1. View: campaign_with_media
**Purpose:** Get campaign with all its media files

**Usage:**
```sql
SELECT * FROM campaign_with_media WHERE id = 3;
```

**Returns:**
- All campaign_profile columns
- first_image_url - First uploaded image
- first_video_url - First uploaded video
- all_media - JSON array of all media files

---

### 2. View: campaign_with_payment_summary
**Purpose:** Get campaign with payment summary

**Usage:**
```sql
SELECT * FROM campaign_with_payment_summary WHERE id = 3;
```

**Returns:**
- All campaign_profile columns
- total_invoices - Count of invoices
- total_impressions_billed - Sum of impressions
- total_paid - Sum of paid amounts
- total_outstanding - Sum of outstanding amounts
- deposit_paid - Boolean (deposit invoice paid?)
- final_settlement_paid - Boolean (final settlement paid?)
- last_billed_at - Last invoice date
- invoices - JSON array of all invoices

---

### 3. Function: get_campaign_payment_status()
**Purpose:** Get current payment status

**Usage:**
```sql
SELECT get_campaign_payment_status(3);
```

**Returns:**
- `'no_invoices'` - No invoices yet
- `'fully_paid'` - All invoices paid
- `'deposit_pending'` - Deposit not paid
- `'partially_paid'` - Some invoices paid, some pending

---

## How CPI Billing Works

### Invoice Creation Flow:

```
1. Billing period ends (based on billing_frequency)
   ↓
2. Query campaign_impressions for period
   SELECT COUNT(*) FROM campaign_impressions
   WHERE campaign_id = X
   AND charged = TRUE
   AND created_at BETWEEN period_start AND period_end
   ↓
3. Calculate invoice amount
   impressions_delivered × cpi_rate = amount
   ↓
4. Aggregate analytics (optional)
   clicks_count = COUNT(*) WHERE clicked = TRUE
   conversions_count = COUNT(*) WHERE converted = TRUE
   ↓
5. Create invoice record
   INSERT INTO campaign_invoices (
       campaign_id, impressions_delivered, cpi_rate, amount,
       clicks_count, conversions_count, billing_cycle_number,
       billing_period_start, billing_period_end, ...
   )
   ↓
6. Invoice issued to advertiser
   status = 'pending'
   due_date = issued_at + 30 days
```

---

## Example Queries

### Get campaign billing summary
```sql
SELECT
    c.id,
    c.name,
    c.billing_frequency,
    c.campaign_budget,
    c.cost_per_impression,
    cps.total_invoices,
    cps.total_impressions_billed,
    cps.total_paid,
    cps.total_outstanding,
    get_campaign_payment_status(c.id) as payment_status
FROM campaign_profile c
LEFT JOIN campaign_with_payment_summary cps ON c.id = cps.id
WHERE c.id = 3;
```

### Get all invoices for a campaign
```sql
SELECT
    invoice_number,
    invoice_type,
    billing_cycle_number,
    billing_period_start,
    billing_period_end,
    impressions_delivered,
    cpi_rate,
    amount,
    clicks_count,
    conversions_count,
    status,
    issued_at,
    due_date,
    paid_at
FROM campaign_invoices
WHERE campaign_id = 3
ORDER BY billing_cycle_number DESC;
```

### Calculate total revenue from impressions
```sql
SELECT
    c.id,
    c.name,
    COUNT(i.id) as total_invoices,
    SUM(i.impressions_delivered) as total_impressions,
    SUM(i.amount) as total_billed,
    SUM(CASE WHEN i.status = 'paid' THEN i.amount ELSE 0 END) as total_received,
    ROUND(
        SUM(CASE WHEN i.status = 'paid' THEN i.amount ELSE 0 END) / NULLIF(SUM(i.amount), 0) * 100,
        2
    ) as payment_percentage
FROM campaign_profile c
LEFT JOIN campaign_invoices i ON c.id = i.campaign_id
WHERE c.advertiser_id = 5
GROUP BY c.id, c.name
ORDER BY total_billed DESC;
```

### Get campaigns with outstanding payments
```sql
SELECT
    c.id,
    c.name,
    cps.total_outstanding,
    cps.last_billed_at,
    get_campaign_payment_status(c.id) as status
FROM campaign_profile c
JOIN campaign_with_payment_summary cps ON c.id = cps.id
WHERE cps.total_outstanding > 0
ORDER BY cps.total_outstanding DESC;
```

---

## Backup Tables

### campaign_profile_media_backup
**Contains:** Old media-related fields from campaign_profile
- Created by: migrate_remove_redundant_campaign_fields.py
- Backed up: 2 campaigns
- Can be dropped after verification

### campaign_profile_invoice_backup
**Contains:** Old invoice/payment fields from campaign_profile
- Created by: migrate_remove_redundant_invoice_fields.py
- Backed up: 2 campaigns
- Contains: 16 removed fields
- Can be dropped after verification

**Check backups:**
```sql
SELECT * FROM campaign_profile_media_backup;
SELECT * FROM campaign_profile_invoice_backup;
```

**Drop backups (after verification):**
```sql
DROP TABLE campaign_profile_media_backup;
DROP TABLE campaign_profile_invoice_backup;
```

---

## Rollback (If Needed)

### Rollback invoice field removal:
```bash
cd astegni-backend
python migrate_remove_redundant_invoice_fields.py --rollback
```

This will:
1. Re-add 16 columns to campaign_profile
2. Restore values from campaign_profile_invoice_backup
3. Revert to old structure

**Note:** Not recommended - the new structure is cleaner and follows CPI-only model.

---

## Migration Files

### Created:
1. `migrate_enhance_campaign_invoices.py` - Added 10 fields to campaign_invoices
2. `migrate_remove_redundant_invoice_fields.py` - Removed 16 fields from campaign_profile
3. `CAMPAIGN_INVOICE_CLEANUP_SIMPLIFIED.md` - Detailed analysis
4. `CAMPAIGN_INVOICE_CLEANUP_COMPLETE.md` - This summary

### Previous (Campaign Media):
1. `migrate_create_campaign_media_table.py` - Created campaign_media table
2. `migrate_existing_campaign_media.py` - Migrated Backblaze files
3. `migrate_remove_redundant_campaign_fields.py` - Removed media fields
4. `sync_campaign_profile_file_urls.py` - (Now obsolete)

---

## Benefits

### 1. Clean Separation of Concerns
- **campaign_profile:** Campaign settings only
- **campaign_invoices:** All billing/payment data
- **campaign_impressions:** Detailed analytics
- **campaign_media:** Media files tracking

### 2. Single Source of Truth
- No duplicate data
- No update anomalies
- Consistent information

### 3. CPI-Optimized
- Only stores CPI pricing (not CPC/CPV/CPE)
- Impressions are the billing metric
- Clicks/conversions tracked for analytics only

### 4. Complete Invoice Tracking
- Billing periods and cycles
- Performance metrics per invoice
- Financial details (discounts, taxes, refunds)
- Payment methods and PDF URLs

### 5. Scalability
- Multiple invoices per campaign
- Proper billing cycle tracking
- Easy to generate reports
- Audit trail complete

---

## Testing Results

### ✅ campaign_profile
- Removed: 16 redundant fields
- Kept: 3 essential billing config fields
- Final count: 66 columns

### ✅ campaign_invoices
- Added: 10 new essential fields
- Final count: 29 columns
- Complete invoice tracking

### ✅ Views Created
- campaign_with_media (recreated without invoice fields)
- campaign_with_payment_summary (new)

### ✅ Function Created
- get_campaign_payment_status()

### ✅ Backups Created
- campaign_profile_invoice_backup (2 campaigns)

---

## Status: ✅ COMPLETE

The campaign invoice/payment system is now fully optimized for **CPI-only billing** with:

1. **Clean Schema:** No duplicate data, proper normalization
2. **Complete Tracking:** All invoice details captured
3. **CPI-Focused:** Only relevant pricing fields kept
4. **Helper Tools:** Views and functions for easy access
5. **Backward Compatibility:** Backups available for rollback

**Next Steps:**
1. Update frontend to use new views
2. Update invoice creation endpoints
3. Test invoice generation flow
4. Drop backup tables after verification
