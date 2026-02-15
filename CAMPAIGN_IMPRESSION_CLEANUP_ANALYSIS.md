# Campaign Profile Impression Fields Cleanup - Analysis

## Objective

Move impression-related fields from `campaign_profile` to make `campaign_impressions` the **single source of truth** for ALL impression data. `campaign_profile` should only contain campaign metadata and configuration.

---

## Current State

### campaign_profile: 66 columns

**Impression-Related Fields (11 fields to analyze):**

| Field | Type | Category | Action Needed |
|-------|------|----------|---------------|
| `impressions` | INTEGER | Aggregate metric | REMOVE - Calculate from campaign_impressions |
| `cost_per_impression` | NUMERIC | Pricing config | **KEEP** - Campaign setting (CPI rate) |
| `viewability_rate` | NUMERIC | Aggregate metric | REMOVE - Calculate from campaign_impressions |
| `click_through_rate` | NUMERIC | Aggregate metric | REMOVE - Calculate from campaign_impressions |
| `conversions` | INTEGER | Aggregate metric | REMOVE - Calculate from campaign_impressions |
| `conversion_rate` | NUMERIC | Aggregate metric | REMOVE - Calculate from campaign_impressions |
| `engagement_rate` | NUMERIC | Aggregate metric | REMOVE - Calculate from campaign_impressions |
| `reach` | INTEGER | Aggregate metric | REMOVE - Calculate from campaign_impressions |
| `impressions_delivered` | BIGINT | Aggregate metric | REMOVE - Calculate from campaign_impressions |
| `impressions_charged` | BIGINT | Aggregate metric | REMOVE - Calculate from campaign_impressions |
| `total_impressions_planned` | BIGINT | Campaign planning | **KEEP** - Campaign setting (planned budget) |

### campaign_impressions: 25 columns (Individual Records)

**Current Fields:**
- Impression tracking: `is_unique_impression`, `is_viewable`, `viewable_duration`
- Click tracking: `clicked`, `clicked_at`
- Conversion tracking: `converted`, `converted_at`
- User context: `user_id`, `profile_id`, `profile_type`, `device_type`, `location`
- Placement: `placement`, `audience`, `region`
- Charging: `cpi_rate`, `charged`, `charged_at`
- Technical: `ip_address`, `user_agent`, `session_id`

**What's Missing:** Nothing! This table already has everything needed to calculate aggregate metrics.

---

## Analysis: What Should Be Where?

### campaign_profile (Configuration Only)

**KEEP these 2 impression-related fields:**
1. `cost_per_impression` - CPI rate (pricing configuration)
2. `total_impressions_planned` - Planned impression budget (campaign planning)

**REMOVE these 9 aggregate metric fields:**
1. `impressions` - SUM from campaign_impressions
2. `viewability_rate` - Calculated: viewable impressions / total impressions
3. `click_through_rate` - Calculated: clicks / total impressions
4. `conversions` - SUM from campaign_impressions
5. `conversion_rate` - Calculated: conversions / total impressions
6. `engagement_rate` - Calculated: (clicks + conversions) / total impressions
7. `reach` - COUNT DISTINCT user_id from campaign_impressions
8. `impressions_delivered` - COUNT from campaign_impressions WHERE charged = TRUE
9. `impressions_charged` - Same as impressions_delivered

**Reason:** These are all **calculated/aggregate metrics** that should be computed on-demand from `campaign_impressions`, not stored in `campaign_profile`.

### campaign_impressions (Single Source of Truth)

**No changes needed.** Already complete with:
- Every impression record tracked individually
- All data needed to calculate aggregate metrics
- Proper granularity for analytics

---

## Data Separation Philosophy

### campaign_profile
**What it stores:** Campaign metadata and configuration
- Who: advertiser_id, brand_id
- What: name, description, status
- When: start_date, end_date, created_at
- Where: target_placements, target_regions
- Who (audience): target_audiences
- Budget/Pricing Configuration:
  - `cost_per_impression` (CPI rate)
  - `total_impressions_planned` (planned budget)
  - `campaign_budget` (total monetary budget)
  - `billing_frequency`

### campaign_impressions
**What it stores:** Every single impression event + all analytics data
- Individual impression records
- User who saw it (user_id, profile_id)
- When they saw it (created_at)
- Where they saw it (placement, location, region)
- What happened (viewable, clicked, converted)
- Charging info (cpi_rate, charged, charged_at)

### campaign_invoices
**What it stores:** Billing records
- How many impressions billed (impressions_delivered)
- Amount owed (amount = impressions × CPI)
- Payment status
- Billing periods

---

## How Aggregate Metrics Are Calculated

All aggregate metrics should be calculated on-demand from `campaign_impressions`:

### Total Impressions
```sql
SELECT COUNT(*)
FROM campaign_impressions
WHERE campaign_id = 3;
```

### Impressions Delivered/Charged
```sql
SELECT COUNT(*)
FROM campaign_impressions
WHERE campaign_id = 3 AND charged = TRUE;
```

### Reach (Unique Users)
```sql
SELECT COUNT(DISTINCT user_id)
FROM campaign_impressions
WHERE campaign_id = 3;
```

### Viewability Rate
```sql
SELECT
    COUNT(CASE WHEN is_viewable THEN 1 END)::FLOAT / NULLIF(COUNT(*), 0) * 100 as viewability_rate
FROM campaign_impressions
WHERE campaign_id = 3;
```

### Click-Through Rate (CTR)
```sql
SELECT
    COUNT(CASE WHEN clicked THEN 1 END)::FLOAT / NULLIF(COUNT(*), 0) * 100 as ctr
FROM campaign_impressions
WHERE campaign_id = 3;
```

### Conversions
```sql
SELECT COUNT(*)
FROM campaign_impressions
WHERE campaign_id = 3 AND converted = TRUE;
```

### Conversion Rate
```sql
SELECT
    COUNT(CASE WHEN converted THEN 1 END)::FLOAT / NULLIF(COUNT(*), 0) * 100 as conversion_rate
FROM campaign_impressions
WHERE campaign_id = 3;
```

### Engagement Rate
```sql
SELECT
    COUNT(CASE WHEN clicked OR converted THEN 1 END)::FLOAT / NULLIF(COUNT(*), 0) * 100 as engagement_rate
FROM campaign_impressions
WHERE campaign_id = 3;
```

---

## Migration Plan

### Step 1: Create Helper View (Optional)

Create a view that provides campaign with calculated metrics:

```sql
CREATE OR REPLACE VIEW campaign_with_metrics AS
SELECT
    c.*,
    -- Total impressions
    (SELECT COUNT(*) FROM campaign_impressions WHERE campaign_id = c.id) as impressions,
    -- Charged impressions
    (SELECT COUNT(*) FROM campaign_impressions WHERE campaign_id = c.id AND charged = TRUE) as impressions_delivered,
    -- Reach
    (SELECT COUNT(DISTINCT user_id) FROM campaign_impressions WHERE campaign_id = c.id) as reach,
    -- Conversions
    (SELECT COUNT(*) FROM campaign_impressions WHERE campaign_id = c.id AND converted = TRUE) as conversions,
    -- Viewability rate
    (SELECT
        ROUND(COUNT(CASE WHEN is_viewable THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2)
     FROM campaign_impressions WHERE campaign_id = c.id) as viewability_rate,
    -- CTR
    (SELECT
        ROUND(COUNT(CASE WHEN clicked THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2)
     FROM campaign_impressions WHERE campaign_id = c.id) as click_through_rate,
    -- Conversion rate
    (SELECT
        ROUND(COUNT(CASE WHEN converted THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2)
     FROM campaign_impressions WHERE campaign_id = c.id) as conversion_rate,
    -- Engagement rate
    (SELECT
        ROUND(COUNT(CASE WHEN clicked OR converted THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2)
     FROM campaign_impressions WHERE campaign_id = c.id) as engagement_rate
FROM campaign_profile c;
```

**Usage:**
```sql
SELECT * FROM campaign_with_metrics WHERE id = 3;
```

### Step 2: Remove Redundant Fields from campaign_profile

Remove 9 aggregate metric fields:

```sql
-- Backup first
CREATE TABLE campaign_profile_impression_backup AS
SELECT
    id as campaign_id,
    impressions,
    viewability_rate,
    click_through_rate,
    conversions,
    conversion_rate,
    engagement_rate,
    reach,
    impressions_delivered,
    impressions_charged
FROM campaign_profile;

-- Remove aggregate metric fields
ALTER TABLE campaign_profile
DROP COLUMN impressions,
DROP COLUMN viewability_rate,
DROP COLUMN click_through_rate,
DROP COLUMN conversions,
DROP COLUMN conversion_rate,
DROP COLUMN engagement_rate,
DROP COLUMN reach,
DROP COLUMN impressions_delivered,
DROP COLUMN impressions_charged;
```

**KEEP in campaign_profile:**
- `cost_per_impression` - CPI rate (pricing configuration)
- `total_impressions_planned` - Planned impression budget

---

## Final Schema

### campaign_profile (57 columns - cleaned)
```
campaign_profile (Configuration Only)
├─ Campaign metadata: id, name, brand_id, advertiser_id, status
├─ Scheduling: start_date, end_date, timezone
├─ Targeting: target_placements, target_audiences, target_regions
├─ Budget & Pricing Configuration:
│   ├─ campaign_budget (total monetary budget)
│   ├─ billing_frequency (how often to bill)
│   ├─ cost_per_impression (CPI rate)
│   └─ total_impressions_planned (planned impression budget)
└─ NO aggregate metrics or impression data
```

### campaign_impressions (25 columns - unchanged)
```
campaign_impressions (Single Source of Truth)
├─ Individual impression records
├─ User context: user_id, profile_id, profile_type, device_type, location
├─ Placement: placement, audience, region
├─ Impression quality: is_unique_impression, is_viewable, viewable_duration
├─ Click tracking: clicked, clicked_at
├─ Conversion tracking: converted, converted_at
├─ Charging: cpi_rate, charged, charged_at
├─ Technical: ip_address, user_agent, session_id
└─ All analytics data lives here
```

### campaign_invoices (27 columns - unchanged)
```
campaign_invoices (Billing Records)
├─ Billing period: billing_cycle_number, billing_period_start, billing_period_end
├─ Performance: impressions_delivered (from campaign_impressions)
├─ Pricing: cpi_rate, amount
├─ Financial: deposit_amount, outstanding_amount, discount_amount, tax_amount, refund_amount
├─ Payment: status, payment_transaction_id, paid_at, payment_method
└─ Invoice management: invoice_pdf_url, issued_at, due_date, notes
```

---

## Benefits

### 1. Single Source of Truth
- **campaign_impressions** is the ONLY place with impression data
- No duplicate data
- No inconsistencies
- No update anomalies

### 2. Always Accurate
- Metrics calculated on-demand from raw data
- No stale aggregate values
- Real-time accuracy

### 3. Flexible Analytics
- Can calculate ANY metric from raw impression data
- Can filter by date range, placement, audience, etc.
- Can create custom reports easily

### 4. Scalability
- campaign_profile stays lean (just configuration)
- campaign_impressions handles all detail tracking
- Views provide convenient access to calculated metrics

### 5. Clear Separation of Concerns
- **campaign_profile**: What the campaign IS (configuration)
- **campaign_impressions**: What HAPPENED (events/analytics)
- **campaign_invoices**: What's OWED (billing)

---

## Summary

### Fields to Remove from campaign_profile (9 fields):
1. `impressions`
2. `viewability_rate`
3. `click_through_rate`
4. `conversions`
5. `conversion_rate`
6. `engagement_rate`
7. `reach`
8. `impressions_delivered`
9. `impressions_charged`

### Fields to Keep in campaign_profile (2 fields):
1. `cost_per_impression` - CPI rate (pricing configuration)
2. `total_impressions_planned` - Planned impression budget

### Fields to Add to campaign_impressions:
**None** - Already complete!

### Helper View to Create:
- `campaign_with_metrics` - Campaign with calculated metrics from campaign_impressions

**Result:**
- campaign_profile: 66 columns → **57 columns** (9 removed)
- campaign_impressions: 25 columns (unchanged - already complete)
- campaign_invoices: 27 columns (unchanged)
- Clean single source of truth architecture
