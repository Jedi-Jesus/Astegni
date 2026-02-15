# Campaign Profile - Additional Cleanup Analysis

## Current State After Previous Cleanup

**campaign_profile: 54 columns**

After removing invoice and aggregate metric fields, we still have several issues:

---

## Issues Found

### 1. Aggregate Metrics Still Present (5 fields)

These are calculated metrics that should be derived from other tables:

| Field | Type | Purpose | Should Be |
|-------|------|---------|-----------|
| `video_completion_rate` | NUMERIC | Video completion percentage | Calculated from campaign_impressions |
| `quartile_metrics` | JSONB | Video viewing quartiles (25%, 50%, 75%, 100%) | Calculated from campaign_impressions |
| `frequency` | NUMERIC | Avg impressions per user | Calculated from campaign_impressions |
| `marketing_efficiency_ratio` | NUMERIC | ROI/efficiency metric | Calculated from campaign_impressions + invoices |
| `followers` | INTEGER | Number of followers | Belongs in campaign_engagement or separate table |

**Reason to remove:** These are all aggregate/calculated metrics that violate single source of truth principle.

---

### 2. Duplicate Target Audience Fields ⚠️ DUPLICATE

| Field | Type | Current Value | Status |
|-------|------|---------------|--------|
| `target_audience` | TEXT | NULL (never used) | **REMOVE** |
| `target_audiences` | ARRAY | `['tutor', 'student', 'parent', 'advertiser', 'user']` | **KEEP** |

**Analysis:**
- `target_audience` (singular, TEXT) is never used (all NULL values)
- `target_audiences` (plural, ARRAY) is the active field with default values
- Clear duplicate - only need one

**Action:** Remove `target_audience`, keep `target_audiences`

---

### 3. Orphaned Foreign Key Reference

| Field | Type | Purpose | Issue |
|-------|------|---------|-------|
| `campaign_package_id` | INTEGER | References campaign_packages table | **Table doesn't exist!** |

**Analysis:**
- References non-existent `campaign_packages` table
- All values are NULL
- No foreign key constraint (would fail if there was one)
- Appears to be for grouping campaigns into packages/bundles

**Options:**
1. **Remove it** - If packages feature was never implemented
2. **Keep it** - If you plan to implement campaign packages in future
3. **Create campaign_packages table** - If needed now

**Recommendation:** Remove unless packages feature is planned soon.

---

### 4. Video-Specific Analytics Fields

These fields are specific to video campaigns only:

| Field | Type | Purpose |
|-------|------|---------|
| `video_completion_rate` | NUMERIC | % of video watched |
| `quartile_metrics` | JSONB | Video quartile tracking |

**Issue:** Not all campaigns have videos (could be image-only campaigns)

**Options:**
1. Remove and calculate from campaign_impressions (if you track video progress)
2. Move to campaign_media table as video-specific metadata
3. Keep if you want quick access (but violates single source of truth)

**Recommendation:** Remove - calculate from campaign_impressions when needed.

---

### 5. Followers Field

| Field | Type | Current Value | Purpose |
|-------|------|---------------|---------|
| `followers` | INTEGER | 0 | Number of users following campaign? |

**Issues:**
- Aggregate metric (count of followers)
- Should be in separate table to track who follows what
- Currently just a count with no detail

**Recommendation:**
- Remove from campaign_profile
- Track in campaign_engagement as engagement_type = 'follow'
- OR create separate campaign_followers table if needed

---

## Recommended Changes

### Remove These 7 Fields:

1. ✅ **target_audience** (TEXT) - Duplicate of target_audiences (ARRAY)
2. ✅ **video_completion_rate** (NUMERIC) - Aggregate metric
3. ✅ **quartile_metrics** (JSONB) - Aggregate metric
4. ✅ **frequency** (NUMERIC) - Aggregate metric
5. ✅ **marketing_efficiency_ratio** (NUMERIC) - Aggregate metric
6. ✅ **followers** (INTEGER) - Aggregate metric
7. ✅ **campaign_package_id** (INTEGER) - Orphaned reference (table doesn't exist)

**Result:** campaign_profile: 54 → 47 columns (-7 fields)

---

## Where Should This Data Go?

### Video Completion & Quartile Metrics

**Option 1:** Track in campaign_impressions (add columns)
```sql
ALTER TABLE campaign_impressions
ADD COLUMN video_watched_duration INTEGER,  -- seconds watched
ADD COLUMN video_total_duration INTEGER,    -- total video length
ADD COLUMN video_quartile_reached INTEGER;  -- 0, 25, 50, 75, 100
```

**Option 2:** Calculate on-demand when needed
```sql
-- Video completion rate
SELECT
    AVG(CASE
        WHEN video_watched_duration >= video_total_duration THEN 100
        ELSE (video_watched_duration::FLOAT / video_total_duration * 100)
    END) as avg_completion_rate
FROM campaign_impressions
WHERE campaign_id = 3 AND video_total_duration > 0;
```

### Frequency (Impressions per User)

**Calculate from campaign_impressions:**
```sql
-- Average frequency (impressions per user)
SELECT
    COUNT(*)::FLOAT / NULLIF(COUNT(DISTINCT user_id), 0) as frequency
FROM campaign_impressions
WHERE campaign_id = 3;
```

### Marketing Efficiency Ratio

**Calculate from impressions + invoices:**
```sql
-- ROI or efficiency metric
SELECT
    c.id,
    c.name,
    -- Total spent
    (SELECT COALESCE(SUM(amount), 0) FROM campaign_invoices WHERE campaign_id = c.id AND status = 'paid') as total_spent,
    -- Total impressions delivered
    (SELECT COUNT(*) FROM campaign_impressions WHERE campaign_id = c.id AND charged = TRUE) as impressions_delivered,
    -- Total conversions
    (SELECT COUNT(*) FROM campaign_impressions WHERE campaign_id = c.id AND converted = TRUE) as conversions,
    -- Marketing efficiency ratio (conversions per dollar)
    (SELECT COUNT(*) FROM campaign_impressions WHERE campaign_id = c.id AND converted = TRUE)::FLOAT /
    NULLIF((SELECT COALESCE(SUM(amount), 0) FROM campaign_invoices WHERE campaign_id = c.id AND status = 'paid'), 0) as efficiency_ratio
FROM campaign_profile c
WHERE c.id = 3;
```

### Followers

**Option 1:** Add to campaign_engagement
```sql
-- Already supports this!
INSERT INTO campaign_engagement (
    campaign_id, brand_id, user_id, profile_id, profile_type,
    engagement_type
)
VALUES (3, 1, 123, 456, 'student', 'bookmark');  -- Use 'bookmark' as follow

-- Count followers
SELECT COUNT(*) FROM campaign_engagement
WHERE campaign_id = 3 AND engagement_type = 'bookmark';
```

**Option 2:** Create separate campaign_followers table
```sql
CREATE TABLE campaign_followers (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaign_profile(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    profile_id INTEGER NOT NULL,
    profile_type VARCHAR(50) NOT NULL,
    followed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, user_id)
);
```

**Recommendation:** Use campaign_engagement with `engagement_type = 'bookmark'` (already implemented!)

### Campaign Packages

**If needed, create table:**
```sql
CREATE TABLE campaign_packages (
    id SERIAL PRIMARY KEY,
    advertiser_id INTEGER NOT NULL,
    brand_id INTEGER,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    package_type VARCHAR(50),  -- 'bundle', 'seasonal', 'promotion'
    total_budget NUMERIC(10, 2),
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Then keep campaign_package_id in campaign_profile
ALTER TABLE campaign_profile
ADD CONSTRAINT fk_campaign_package
FOREIGN KEY (campaign_package_id) REFERENCES campaign_packages(id) ON DELETE SET NULL;
```

**If not needed:** Just remove campaign_package_id.

---

## Final Cleaned Schema

### campaign_profile (47 columns) - AFTER CLEANUP

**Core:**
- id, name, description, objective

**Relationships:**
- advertiser_id, brand_id

**Targeting:**
- target_audiences (ARRAY) ← KEEP THIS ONE
- target_regions (ARRAY)
- target_placements (ARRAY)
- target_location (TEXT)
- national_location (VARCHAR)
- regional_country_code (VARCHAR)
- national_country_code (VARCHAR)

**Budget & Pricing Configuration:**
- campaign_budget (total monetary budget)
- cost_per_impression (CPI rate)
- cpi_rate (alternate CPI field - may also be duplicate?)
- billing_frequency
- total_impressions_planned

**Scheduling:**
- start_date, submitted_date
- launched_at, ended_at, paused_at
- created_at, updated_at

**Status:**
- verification_status, status_by, status_reason, status_at
- is_verified

**Campaign Settings:**
- call_to_action
- campaign_socials (JSONB)
- auto_pause_on_low_balance
- minimum_balance_threshold
- grace_period_hours

**Financial Tracking (may need review):**
- deposit_percent, deposit_amount
- cancellation_fee_percent, cancellation_fee_amount
- outstanding_balance, remaining_balance
- total_charged, amount_used
- final_settlement_amount

**Other:**
- cancelled_by_user_id, cancellation_reason
- pause_reason

**NO aggregate metrics!**
**NO duplicate fields!**

---

## Wait - More Potential Duplicates!

### cost_per_impression vs cpi_rate 🤔

| Field | Type | Purpose |
|-------|------|---------|
| `cost_per_impression` | NUMERIC | CPI rate |
| `cpi_rate` | NUMERIC | CPI rate |

Both appear to be the same thing! Need to check which one is used.

```sql
SELECT
    id, name,
    cost_per_impression,
    cpi_rate,
    CASE
        WHEN cost_per_impression IS NOT NULL AND cpi_rate IS NOT NULL THEN 'Both set'
        WHEN cost_per_impression IS NOT NULL THEN 'Only cost_per_impression'
        WHEN cpi_rate IS NOT NULL THEN 'Only cpi_rate'
        ELSE 'Neither set'
    END as which_used
FROM campaign_profile;
```

**Recommendation:** Check data and remove duplicate.

---

## Migration Plan

### Step 1: Verify Data Usage

Check which fields are actually used:
- Is campaign_packages feature planned?
- Are video quartiles tracked in campaign_impressions?
- Which CPI field is used (cost_per_impression vs cpi_rate)?

### Step 2: Backup

```sql
CREATE TABLE campaign_profile_additional_cleanup_backup AS
SELECT
    id as campaign_id,
    target_audience,
    video_completion_rate,
    quartile_metrics,
    frequency,
    marketing_efficiency_ratio,
    followers,
    campaign_package_id,
    cost_per_impression,
    cpi_rate
FROM campaign_profile;
```

### Step 3: Remove Fields

```sql
ALTER TABLE campaign_profile
DROP COLUMN target_audience,
DROP COLUMN video_completion_rate,
DROP COLUMN quartile_metrics,
DROP COLUMN frequency,
DROP COLUMN marketing_efficiency_ratio,
DROP COLUMN followers,
DROP COLUMN campaign_package_id;

-- Optionally remove duplicate CPI field (after verifying which one is used)
-- DROP COLUMN cpi_rate;  -- OR DROP COLUMN cost_per_impression;
```

---

## Summary

### Issues Found:
1. ⚠️ **5 aggregate metrics** still in campaign_profile
2. ⚠️ **1 duplicate field** (target_audience vs target_audiences)
3. ⚠️ **1 orphaned reference** (campaign_package_id - table doesn't exist)
4. ⚠️ **Potential duplicate** (cost_per_impression vs cpi_rate - needs verification)

### Recommended Removals:
- target_audience (duplicate)
- video_completion_rate (aggregate)
- quartile_metrics (aggregate)
- frequency (aggregate)
- marketing_efficiency_ratio (aggregate)
- followers (aggregate)
- campaign_package_id (orphaned)

**Result:** 54 → 47 columns (-7 fields)

**After verifying CPI fields:** Potentially 46 columns (-8 fields)

### Next Steps:
1. Verify which CPI field is used in code/frontend
2. Check if campaign_packages feature is planned
3. Decide on video quartile tracking approach
4. Create migration script to remove these fields
5. Update any code references to removed fields
