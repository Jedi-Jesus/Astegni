# Campaign Fields - Complete Reference

## Overview

The campaign system consists of **5 core tables** plus **3 helper views** for querying data.

---

## campaign_profile (46 fields) - Configuration Only

**Purpose:** Stores campaign configuration and metadata. Does NOT store calculated metrics or transactional data.

### Core Identity (1 field)

| Field | Type | Nullable | Default | Use |
|-------|------|----------|---------|-----|
| `id` | INTEGER | NOT NULL | Auto | Unique campaign identifier (primary key) |

### Campaign Information (4 fields)

| Field | Type | Nullable | Default | Use |
|-------|------|----------|---------|-----|
| `name` | VARCHAR(255) | NULL | - | Campaign name/title |
| `description` | TEXT | NULL | - | Detailed campaign description |
| `objective` | VARCHAR(255) | NULL | - | Campaign goal (brand awareness, conversions, etc.) |
| `call_to_action` | VARCHAR(255) | NULL | - | CTA text/link (e.g., "Visit Website", "Sign Up") |

### Relationships (4 fields)

| Field | Type | Nullable | Default | Use |
|-------|------|----------|---------|-----|
| `advertiser_id` | INTEGER | NULL | - | FK to users table (who owns this campaign) |
| `brand_id` | INTEGER | NULL | - | FK to advertiser_brands table (which brand) |
| `status_by` | INTEGER | NULL | - | FK to admin_users (who approved/rejected) |
| `cancelled_by_user_id` | INTEGER | NULL | - | FK to users (who cancelled campaign) |

### Targeting Configuration (7 fields)

| Field | Type | Nullable | Default | Use |
|-------|------|----------|---------|-----|
| `target_audiences` | ARRAY | NULL | ['tutor', 'student', 'parent', 'advertiser', 'user'] | User types to target |
| `target_regions` | ARRAY | NULL | [] | Regions to show ads in |
| `target_placements` | ARRAY | NULL | ['placeholder', 'widget', 'popup', 'insession'] | Where ads appear |
| `target_location` | TEXT | NULL | - | Text description of target location |
| `national_location` | VARCHAR(500) | NULL | - | National-level location name |
| `national_country_code` | VARCHAR(10) | NULL | - | Country code for national targeting |
| `regional_country_code` | VARCHAR(10) | NULL | - | Country code for regional targeting |

**Note:** Targeting fields define WHO sees ads and WHERE they see them.

### Budget & Pricing Configuration (4 fields)

| Field | Type | Nullable | Default | Use |
|-------|------|----------|---------|-----|
| `campaign_budget` | NUMERIC | NULL | 0.00 | Total monetary budget (in Birr) |
| `cpi_rate` | NUMERIC | NULL | - | Cost Per Impression rate (e.g., 0.25 Birr) |
| `billing_frequency` | INTEGER | NULL | 1000 | Bill advertiser every N impressions |
| `total_impressions_planned` | BIGINT | NULL | 0 | Total impressions budgeted/planned |

**Example:**
- Budget: 10,000 Birr
- CPI: 0.25 Birr
- Total impressions planned: 40,000 (10,000 / 0.25)
- Billing frequency: Bill every 1,000 impressions

### Scheduling & Lifecycle (7 fields)

| Field | Type | Nullable | Default | Use |
|-------|------|----------|---------|-----|
| `start_date` | TIMESTAMP TZ | NULL | - | When campaign should start running |
| `submitted_date` | TIMESTAMP TZ | NULL | - | When advertiser submitted campaign |
| `launched_at` | TIMESTAMP | NULL | - | When campaign actually went live |
| `ended_at` | TIMESTAMP | NULL | - | When campaign ended |
| `paused_at` | TIMESTAMP | NULL | - | When campaign was paused |
| `created_at` | TIMESTAMP TZ | NULL | now() | Record creation timestamp |
| `updated_at` | TIMESTAMP TZ | NULL | now() | Record last updated timestamp |

**Lifecycle:** submitted → (verified) → launched → paused/ended

### Status & Verification (5 fields)

| Field | Type | Nullable | Default | Use |
|-------|------|----------|---------|-----|
| `verification_status` | VARCHAR(50) | NULL | 'pending' | Status: pending, approved, rejected |
| `is_verified` | BOOLEAN | NULL | false | Quick check if campaign is verified |
| `status_reason` | TEXT | NULL | - | Reason for approval/rejection |
| `status_at` | TIMESTAMP TZ | NULL | - | When status changed |
| `pause_reason` | VARCHAR(100) | NULL | - | Why campaign was paused |

**Workflow:** Admin reviews → approves/rejects → sets verification_status + status_reason

### Financial Tracking (10 fields)

| Field | Type | Nullable | Default | Use |
|-------|------|----------|---------|-----|
| `total_charged` | NUMERIC | NULL | 0.00 | Total amount charged so far |
| `amount_used` | NUMERIC | NULL | 0.00 | Amount of budget used |
| `remaining_balance` | NUMERIC | NULL | 0.00 | Budget remaining |
| `outstanding_balance` | NUMERIC | NULL | 0.00 | Amount owed (unpaid) |
| `deposit_percent` | NUMERIC | NULL | 20.00 | Deposit percentage required (e.g., 20%) |
| `deposit_amount` | NUMERIC | NULL | 0.00 | Deposit amount paid upfront |
| `final_settlement_amount` | NUMERIC | NULL | 0.00 | Final payment amount |
| `cancellation_fee_percent` | NUMERIC | NULL | 5.00 | Fee if cancelled early (e.g., 5%) |
| `cancellation_fee_amount` | NUMERIC | NULL | 0.00 | Cancellation fee charged |
| `minimum_balance_threshold` | NUMERIC | NULL | 100.00 | Pause campaign when balance < this |

**Payment Flow:**
1. Advertiser deposits 20% upfront (deposit_amount)
2. Campaign runs, charges accumulate (total_charged)
3. Budget decreases (remaining_balance)
4. When balance low → auto-pause
5. Final settlement at end

### Campaign Settings (4 fields)

| Field | Type | Nullable | Default | Use |
|-------|------|----------|---------|-----|
| `campaign_socials` | JSONB | NULL | [] | Social media links (JSON array) |
| `auto_pause_on_low_balance` | BOOLEAN | NULL | true | Auto-pause when balance too low |
| `grace_period_hours` | INTEGER | NULL | 24 | Hours before auto-action (pausing) |
| `cancellation_reason` | TEXT | NULL | - | Why campaign was cancelled |

**Example campaign_socials:**
```json
[
  {"platform": "facebook", "url": "https://facebook.com/campaign"},
  {"platform": "instagram", "url": "https://instagram.com/campaign"}
]
```

---

## campaign_impressions (25 fields) - Analytics

**Purpose:** Tracks EVERY single impression event. Single source of truth for impression analytics.

### Core (5 fields)

| Field | Type | Use |
|-------|------|-----|
| `id` | INTEGER | Unique impression ID |
| `campaign_id` | INTEGER | FK to campaign_profile |
| `brand_id` | INTEGER | FK to advertiser_brands |
| `created_at` | TIMESTAMP | When impression occurred |
| `session_id` | VARCHAR(255) | User session identifier |

### User Context (5 fields)

| Field | Type | Use |
|-------|------|-----|
| `user_id` | INTEGER | User who saw ad (if logged in) |
| `profile_id` | INTEGER | Profile ID (student_id, tutor_id, etc.) |
| `profile_type` | VARCHAR(50) | Profile type (student, tutor, parent) |
| `device_type` | VARCHAR(50) | Device: mobile, desktop, tablet |
| `ip_address` | VARCHAR(45) | User IP address |

### Placement & Targeting (4 fields)

| Field | Type | Use |
|-------|------|-----|
| `placement` | VARCHAR(50) | Where ad shown: widget, popup, placeholder, insession |
| `location` | VARCHAR(100) | User location |
| `audience` | VARCHAR(50) | Audience segment |
| `region` | VARCHAR(100) | Region |

### Impression Quality (3 fields)

| Field | Type | Use |
|-------|------|-----|
| `is_unique_impression` | BOOLEAN | First time user saw this campaign |
| `is_viewable` | BOOLEAN | Ad was actually viewable (not scrolled past) |
| `viewable_duration` | INTEGER | Seconds ad was viewable |

### Click Tracking (2 fields)

| Field | Type | Use |
|-------|------|-----|
| `clicked` | BOOLEAN | User clicked on ad |
| `clicked_at` | TIMESTAMP | When click occurred |

### Conversion Tracking (2 fields)

| Field | Type | Use |
|-------|------|-----|
| `converted` | BOOLEAN | User completed goal (signup, purchase, etc.) |
| `converted_at` | TIMESTAMP | When conversion occurred |

### Charging (3 fields)

| Field | Type | Use |
|-------|------|-----|
| `cpi_rate` | NUMERIC | CPI rate at time of impression |
| `charged` | BOOLEAN | Whether this impression was charged |
| `charged_at` | TIMESTAMP | When impression was charged |

### Technical (1 field)

| Field | Type | Use |
|-------|------|-----|
| `user_agent` | TEXT | Browser user agent string |

**Key Metrics Calculated from This Table:**
- Total impressions: COUNT(*)
- Unique reach: COUNT(DISTINCT user_id)
- Viewability rate: COUNT(is_viewable) / COUNT(*) * 100
- Click-through rate (CTR): COUNT(clicked) / COUNT(*) * 100
- Conversion rate: COUNT(converted) / COUNT(*) * 100
- Frequency: COUNT(*) / COUNT(DISTINCT user_id)
- Impressions delivered: COUNT(*) WHERE charged = TRUE

---

## campaign_engagement (14 fields) - Social Engagement

**Purpose:** Tracks social interactions with campaigns. Single source of truth for engagement.

### Core (5 fields)

| Field | Type | Use |
|-------|------|-----|
| `id` | INTEGER | Unique engagement ID |
| `campaign_id` | INTEGER | FK to campaign_profile |
| `brand_id` | INTEGER | FK to advertiser_brands |
| `impression_id` | INTEGER | FK to campaign_impressions (optional) |
| `engagement_type` | VARCHAR(20) | Type: like, share, comment, save, bookmark |

### User (3 fields)

| Field | Type | Use |
|-------|------|-----|
| `user_id` | INTEGER | User who engaged |
| `profile_id` | INTEGER | Profile ID |
| `profile_type` | VARCHAR(50) | Profile type |

### Comment-Specific (2 fields)

| Field | Type | Use |
|-------|------|-----|
| `comment_text` | TEXT | Comment content (only for comments) |
| `parent_comment_id` | INTEGER | FK to self (for comment replies/threads) |

### Context (2 fields)

| Field | Type | Use |
|-------|------|-----|
| `device_type` | VARCHAR(50) | Device used |
| `location` | VARCHAR(100) | User location |

### Timestamps (2 fields)

| Field | Type | Use |
|-------|------|-----|
| `created_at` | TIMESTAMP | When engagement occurred |
| `updated_at` | TIMESTAMP | When engagement updated (for edited comments) |

**Engagement Types:**
- `like` - User liked campaign
- `share` - User shared campaign
- `comment` - User commented (with text)
- `save` - User saved for later
- `bookmark` - User bookmarked/followed campaign

**Comment Threading:**
- Top-level comment: `parent_comment_id = NULL`
- Reply: `parent_comment_id` points to parent comment ID

**Key Metrics Calculated:**
- Total likes: COUNT(*) WHERE engagement_type = 'like'
- Total shares: COUNT(*) WHERE engagement_type = 'share'
- Total comments: COUNT(*) WHERE engagement_type = 'comment'
- Followers: COUNT(*) WHERE engagement_type = 'bookmark'
- Engagement rate: (clicks + conversions + social engagements) / impressions * 100

---

## campaign_invoices (27 fields) - Billing

**Purpose:** Tracks billing records and payments. Single source of truth for financial transactions.

### Core (4 fields)

| Field | Type | Use |
|-------|------|-----|
| `id` | INTEGER | Unique invoice ID |
| `campaign_id` | INTEGER | FK to campaign_profile |
| `brand_id` | INTEGER | FK to advertiser_brands |
| `advertiser_id` | INTEGER | FK to users |

### Invoice Info (5 fields)

| Field | Type | Use |
|-------|------|-----|
| `invoice_number` | VARCHAR(100) | Unique invoice number |
| `invoice_type` | VARCHAR(50) | Type: deposit, billing_cycle, final_settlement |
| `issued_at` | TIMESTAMP | When invoice created |
| `due_date` | TIMESTAMP | Payment due date |
| `notes` | TEXT | Additional notes |

### Billing Period (3 fields)

| Field | Type | Use |
|-------|------|-----|
| `billing_cycle_number` | INTEGER | Which cycle (1st, 2nd, 3rd...) |
| `billing_period_start` | TIMESTAMP | Period start date |
| `billing_period_end` | TIMESTAMP | Period end date |

### Performance (2 fields)

| Field | Type | Use |
|-------|------|-----|
| `impressions_delivered` | BIGINT | How many impressions in this billing period |
| `cpi_rate` | NUMERIC | CPI rate used for this invoice |

### Financial (7 fields)

| Field | Type | Use |
|-------|------|-----|
| `amount` | NUMERIC | Total invoice amount |
| `deposit_amount` | NUMERIC | Deposit amount (for deposit invoices) |
| `outstanding_amount` | NUMERIC | Amount still owed |
| `discount_amount` | NUMERIC | Discount applied |
| `tax_amount` | NUMERIC | Tax amount |
| `refund_amount` | NUMERIC | Refund amount |
| `invoice_pdf_url` | VARCHAR(500) | Link to PDF invoice |

### Payment (4 fields)

| Field | Type | Use |
|-------|------|-----|
| `status` | VARCHAR(50) | Status: pending, paid, overdue, cancelled |
| `payment_transaction_id` | VARCHAR(255) | Payment gateway transaction ID |
| `paid_at` | TIMESTAMP | When payment received |
| `payment_method` | VARCHAR(50) | Method: bank_transfer, card, mobile_money, etc. |

### Timestamps (2 fields)

| Field | Type | Use |
|-------|------|-----|
| `created_at` | TIMESTAMP | Record created |
| `updated_at` | TIMESTAMP | Record updated |

**Billing Flow:**
1. **Deposit Invoice:** 20% upfront before campaign starts
2. **Billing Cycle Invoices:** Every N impressions (e.g., every 1,000)
3. **Final Settlement Invoice:** Remaining balance at campaign end

**Example:**
- Campaign budget: 10,000 Birr
- CPI: 0.25 Birr
- Deposit (20%): 2,000 Birr → Invoice #1
- Cycle 1 (1,000 impressions): 250 Birr → Invoice #2
- Cycle 2 (1,000 impressions): 250 Birr → Invoice #3
- ... continues until budget exhausted or campaign ends
- Final settlement: Any remaining balance

---

## campaign_media (13 fields) - Media Files

**Purpose:** Stores all campaign media files (images, videos). Single source of truth for media.

### Core (4 fields)

| Field | Type | Use |
|-------|------|-----|
| `id` | INTEGER | Unique media ID |
| `campaign_id` | INTEGER | FK to campaign_profile |
| `brand_id` | INTEGER | FK to advertiser_brands |
| `advertiser_id` | INTEGER | FK to users |

### File Info (5 fields)

| Field | Type | Use |
|-------|------|-----|
| `media_type` | VARCHAR(50) | Type: image, video |
| `file_url` | VARCHAR(500) | Backblaze B2 URL |
| `file_name` | VARCHAR(255) | Original filename |
| `file_size` | BIGINT | File size in bytes |
| `content_type` | VARCHAR(100) | MIME type (image/jpeg, video/mp4, etc.) |

### Placement (2 fields)

| Field | Type | Use |
|-------|------|-----|
| `placement` | VARCHAR(50) | Where used: widget, popup, placeholder, insession |
| `folder_path` | VARCHAR(500) | Backblaze folder path |

### Timestamps (2 fields)

| Field | Type | Use |
|-------|------|-----|
| `created_at` | TIMESTAMP | When uploaded |
| `updated_at` | TIMESTAMP | When updated |

**File Storage Structure:**
```
Backblaze B2:
/campaigns/
  /{campaign_id}/
    /widget/
      - image1.jpg
      - video1.mp4
    /popup/
      - image2.jpg
    /placeholder/
      - banner.jpg
```

**Note:** Each campaign can have MULTIPLE media files for different placements.

---

## Helper Views (Convenience)

These views combine data from multiple tables for easy querying.

### 1. campaign_with_media (49 fields)

**Purpose:** Campaign + its media files in one query

**Additional fields beyond campaign_profile:**
- `first_image_url` - First uploaded image
- `first_video_url` - First uploaded video
- `all_media` - JSON array of all media files

**Usage:**
```sql
SELECT * FROM campaign_with_media WHERE id = 3;
```

### 2. campaign_with_payment_summary (54 fields)

**Purpose:** Campaign + payment/billing summary

**Additional fields beyond campaign_profile:**
- `total_invoices` - Number of invoices
- `total_impressions_billed` - Total impressions billed
- `total_paid` - Total amount paid
- `total_outstanding` - Total amount owed
- `deposit_paid` - Whether deposit paid (boolean)
- `final_settlement_paid` - Whether final payment made
- `last_billed_at` - Most recent billing date
- `invoices` - JSON array of all invoices

**Usage:**
```sql
SELECT * FROM campaign_with_payment_summary WHERE id = 3;
```

### 3. campaign_with_full_metrics (62 fields) ⭐ MOST USEFUL

**Purpose:** Campaign + ALL calculated metrics

**Additional fields beyond campaign_profile:**

**Impression Metrics:**
- `impressions` - Total impressions
- `impressions_delivered` - Charged impressions
- `reach` - Unique users reached
- `clicks` - Total clicks
- `conversions` - Total conversions

**Social Engagement:**
- `likes` - Total likes
- `shares` - Total shares
- `comments` - Total comments
- `saves` - Total saves
- `followers` - Total followers/bookmarks

**Calculated Rates:**
- `viewability_rate` - % viewable
- `click_through_rate` - CTR %
- `conversion_rate` - CVR %
- `engagement_rate` - Overall engagement %

**Advanced Metrics:**
- `frequency` - Avg impressions per user
- `marketing_efficiency_ratio` - Conversions per dollar spent

**Usage:**
```sql
-- Get campaign with all metrics
SELECT * FROM campaign_with_full_metrics WHERE id = 3;

-- Get top performing campaigns
SELECT
    id, name, impressions, conversions, conversion_rate
FROM campaign_with_full_metrics
WHERE status = 'active'
ORDER BY conversion_rate DESC
LIMIT 10;
```

---

## Helper Functions

### 1. get_campaign_payment_status(campaign_id)

**Returns:** Payment status string

**Values:**
- `no_invoices` - No invoices yet
- `fully_paid` - All invoices paid
- `deposit_pending` - Deposit not paid
- `partially_paid` - Some invoices unpaid

**Usage:**
```sql
SELECT get_campaign_payment_status(3);
```

### 2. has_user_engaged(campaign_id, user_id, engagement_type)

**Returns:** Boolean (TRUE if user engaged, FALSE otherwise)

**Usage:**
```sql
-- Check if user liked campaign
SELECT has_user_engaged(3, 123, 'like');

-- Check if user commented
SELECT has_user_engaged(3, 123, 'comment');
```

### 3. get_campaign_engagement_counts(campaign_id)

**Returns:** Record with engagement counts

**Fields:**
- `likes_count` - Total likes
- `shares_count` - Total shares
- `comments_count` - Total comments
- `saves_count` - Total saves
- `bookmarks_count` - Total bookmarks
- `total_engagements` - Sum of all

**Usage:**
```sql
SELECT * FROM get_campaign_engagement_counts(3);
```

---

## Data Relationships

```
campaign_profile (1)
  ├─── campaign_impressions (many) - Every impression event
  ├─── campaign_engagement (many) - Every social interaction
  ├─── campaign_invoices (many) - Every billing record
  └─── campaign_media (many) - Every media file

advertiser_brands (1)
  └─── campaign_profile (many)

users (1)
  ├─── campaign_profile.advertiser_id (many)
  ├─── campaign_profile.cancelled_by_user_id (many)
  └─── campaign_profile.status_by (many)
```

---

## Summary

### What Lives Where?

| Data Type | Table | Why |
|-----------|-------|-----|
| Campaign configuration | campaign_profile | What the campaign IS |
| Impression events | campaign_impressions | What HAPPENED |
| Social interactions | campaign_engagement | What USERS DID |
| Billing records | campaign_invoices | What's OWED |
| Media files | campaign_media | What's SHOWN |

### Key Principles

1. **Single Source of Truth:** Each piece of data lives in exactly ONE place
2. **No Duplicates:** No redundant fields across tables
3. **Calculate, Don't Store:** Metrics calculated from raw data (always accurate)
4. **Clear Separation:** Each table has a clear, distinct purpose
5. **Referential Integrity:** Foreign keys maintain data consistency

### campaign_profile Philosophy

**What it IS:** Configuration and metadata storage
**What it's NOT:** Analytics dashboard or transaction log

**Stores:**
- WHO created campaign (advertiser_id, brand_id)
- WHAT the campaign is (name, description, objective)
- WHO to target (target_audiences, target_regions, target_placements)
- WHEN to run (start_date, end_date)
- HOW MUCH to spend (budget, CPI rate, billing frequency)
- CURRENT STATE (status, verification, financial tracking)

**Does NOT store:**
- ❌ How many impressions served (that's in campaign_impressions)
- ❌ How many likes/shares (that's in campaign_engagement)
- ❌ Billing history (that's in campaign_invoices)
- ❌ Media files (that's in campaign_media)
- ❌ Any calculated metrics (use views for that)

---

## Quick Reference

**Total Fields:**
- campaign_profile: 46
- campaign_impressions: 25
- campaign_engagement: 14
- campaign_invoices: 27
- campaign_media: 13

**Total Tables:** 5 core tables + 3 helper views + 4 backup tables

**Fields Removed During Cleanup:** 36 (from original 82 in campaign_profile)

**Architecture:** Clean, normalized, single source of truth ✅
