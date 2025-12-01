# Ad Campaigns Table - Complete Field Reference

## Overview
Complete list of all fields in the `ad_campaigns` table after migration on 2025-10-20.

**Total Fields: 44**

---

## Field Categories

### 1. Primary & Foreign Keys (2 fields)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | Integer | Yes | Primary key, auto-increment |
| `advertiser_id` | Integer | Yes | Foreign key to `advertiser_profiles.id` |

---

### 2. Campaign Details (3 fields)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | String | Yes | - | Campaign name |
| `description` | Text | No | NULL | Detailed campaign description |
| `objective` | String | No | NULL | Campaign objective: brand_awareness, lead_generation, conversions, engagement |

---

### 3. Verification & Status (2 fields)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `is_verified` | Boolean | No | FALSE | Quick verification flag |
| `verification_status` | String | No | 'pending' | Status: pending, verified, rejected, suspended |

---

### 4. Budget & Spend (4 fields)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `budget` | Float | No | 0.0 | Total campaign budget |
| `spent` | Float | No | 0.0 | Amount already spent |
| `daily_budget` | Float | No | NULL | Daily spending limit |
| `currency` | String | No | 'ETB' | Currency code (Ethiopian Birr) |

---

### 5. Campaign Duration (2 fields)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `start_date` | Date | Yes | - | Campaign start date |
| `end_date` | Date | Yes | - | Campaign end date |

---

### 6. Status Tracking Dates ⏰ (3 fields) **NEW**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `submitted_date` | DateTime | No | NULL | When campaign was submitted for review |
| `rejected_date` | DateTime | No | NULL | When campaign was rejected |
| `suspended_date` | DateTime | No | NULL | When campaign was suspended |

---

### 7. Rejection & Suspension Reasons (2 fields) **NEW**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `rejected_reason` | Text | No | NULL | Detailed reason for rejection |
| `suspended_reason` | Text | No | NULL | Detailed reason for suspension |

---

### 8. Targeting (3 fields)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `target_audience` | JSON | No | `{}` | Demographics, interests, locations |
| `age_range` | JSON | No | `{}` | Min/max age: `{"min": 18, "max": 65}` |
| `locations` | JSON | No | `[]` | Array of target locations |

---

### 9. Performance Metrics 📊 (7 fields)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `impressions` | Integer | No | 0 | Total ad impressions |
| `clicks` | Integer | No | 0 | Total clicks |
| `conversions` | Integer | No | 0 | Total conversions |
| `likes` | Integer | No | 0 | Total likes |
| `shares` | Integer | No | 0 | Total shares |
| `comments` | Integer | No | 0 | Total comments |
| `followers` | Integer | No | 0 | Followers gained |

---

### 10. Calculated Metrics (5 fields)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `ctr` | Float | No | 0.0 | Click-through rate (clicks/impressions) |
| `conversion_rate` | Float | No | 0.0 | Conversion rate (conversions/clicks) |
| `cost_per_click` | Float | No | 0.0 | Average cost per click |
| `cost_per_conversion` | Float | No | 0.0 | Average cost per conversion |
| `engagement_rate` | Float | No | 0.0 | Overall engagement rate |

---

### 11. Creative Assets 🎨 (6 fields)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `ad_type` | String | No | NULL | Type: video, image, carousel, text |
| **`creative_urls`** | **JSON** | No | `[]` | **Array of Backblaze B2 URLs for images/videos** ✅ |
| `ad_copy` | Text | No | NULL | Main advertising text/copy |
| `call_to_action` | String | No | NULL | CTA text: "Learn More", "Sign Up", "Buy Now", etc. |
| `landing_page_url` | String | No | NULL | Destination URL when ad is clicked |
| **`campaign_socials`** | **JSON** | No | `{}` | **Social media links** `{"facebook": "url", "twitter": "url"}` ✅ |

---

### 12. Performance Grade (1 field)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `performance` | String | No | 'pending' | Grade: excellent, good, average, poor, pending |

---

### 13. Platform Distribution (1 field)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `platforms` | JSON | No | `[]` | Array: web, mobile, social_media, etc. |

---

### 14. Timestamps (3 fields)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `created_at` | DateTime | Yes | `NOW()` | When campaign was created |
| `updated_at` | DateTime | Yes | `NOW()` | Last update timestamp (auto-updated) |
| `last_activity` | DateTime | No | NULL | Last activity/interaction timestamp |

---

## Backblaze B2 Integration

### Media Storage Fields

**`creative_urls`** - Stores Backblaze B2 URLs for campaign media:

```json
{
  "creative_urls": [
    "https://s3.eu-central-003.backblazeb2.com/astegni-media/videos/ad/user_123/campaign_video_20250120_143022.mp4",
    "https://s3.eu-central-003.backblazeb2.com/astegni-media/images/thumbnails/user_123/campaign_thumb_20250120_143022.jpg"
  ]
}
```

**File Organization Pattern:**
```
{type}/{category}/user_{advertiser_id}/{filename}_{timestamp}.{ext}

Examples:
- videos/ad/user_123/summer_sale_20250120_143022.mp4
- images/ad/user_123/banner_20250120_143022.jpg
```

**Supported Media Types:**
- Images: JPG, PNG, GIF, WEBP
- Videos: MP4, WEBM, MOV
- Carousels: Multiple images in array

---

## Status Flow & Date Tracking

### Campaign Lifecycle

```
1. CREATED (created_at set)
   ↓
2. SUBMITTED (submitted_date set) → verification_status = 'pending'
   ↓
   ├─→ APPROVED (verified_date) → verification_status = 'verified'
   │   ↓
   │   └─→ SUSPENDED (suspended_date + reason) → verification_status = 'suspended'
   │
   └─→ REJECTED (rejected_date + reason) → verification_status = 'rejected'
```

### Status Change Examples

**When Rejecting:**
```json
{
  "verification_status": "rejected",
  "rejected_date": "2025-10-20T14:30:00Z",
  "rejected_reason": "Campaign content violates community guidelines"
}
```

**When Suspending:**
```json
{
  "verification_status": "suspended",
  "suspended_date": "2025-10-20T15:45:00Z",
  "suspended_reason": "Budget exceeded without approval"
}
```

---

## JSON Field Schemas

### `target_audience` Structure
```json
{
  "demographics": ["students", "teachers", "parents"],
  "interests": ["education", "technology", "languages"],
  "locations": ["Addis Ababa", "Bahir Dar", "Hawassa"]
}
```

### `age_range` Structure
```json
{
  "min": 18,
  "max": 65
}
```

### `locations` Structure
```json
["Addis Ababa", "Dire Dawa", "Mekelle", "Bahir Dar", "Hawassa"]
```

### `platforms` Structure
```json
["web", "mobile", "social_media", "email"]
```

### `campaign_socials` Structure
```json
{
  "facebook": "https://facebook.com/campaign-page",
  "twitter": "https://twitter.com/campaign-handle",
  "instagram": "https://instagram.com/campaign-profile",
  "linkedin": "https://linkedin.com/company/campaign",
  "youtube": "https://youtube.com/channel/campaign"
}
```

---

## Migration History

### Applied Migrations

1. **`migrate_campaign_verification.py`** (Oct 9, 2025)
   - Added: `is_verified`, `verification_status`
   - Status values: pending, verified, rejected, suspended

2. **`migrate_add_campaign_socials.py`** (Oct 20, 2025)
   - Added: `campaign_socials` (JSONB)

3. **`migrate_add_campaign_dates_reasons.py`** (Oct 20, 2025) ✨ **NEW**
   - Added: `submitted_date`, `rejected_date`, `suspended_date`
   - Added: `rejected_reason`, `suspended_reason`

---

## Database Constraints

### Check Constraints

**Verification Status:**
```sql
CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended'))
```

### Foreign Keys

**Advertiser:**
```sql
FOREIGN KEY (advertiser_id) REFERENCES advertiser_profiles(id)
```

---

## Usage Examples

### Creating a Campaign
```python
campaign = AdCampaign(
    advertiser_id=123,
    name="Summer Learning Campaign",
    description="Promote online courses for summer break",
    objective="lead_generation",
    start_date="2025-06-01",
    end_date="2025-08-31",
    ad_type="video",
    creative_urls=[
        "https://s3.backblazeb2.com/.../promo_video.mp4",
        "https://s3.backblazeb2.com/.../thumbnail.jpg"
    ],
    campaign_socials={
        "facebook": "https://facebook.com/summer-learning",
        "instagram": "https://instagram.com/summer-learning"
    },
    submitted_date=datetime.now()
)
```

### Rejecting a Campaign
```python
campaign.verification_status = "rejected"
campaign.rejected_date = datetime.now()
campaign.rejected_reason = "Campaign content needs revision. Please update imagery to be more educational-focused."
```

### Suspending a Campaign
```python
campaign.verification_status = "suspended"
campaign.suspended_date = datetime.now()
campaign.suspended_reason = "Budget exceeded. Please add funds to continue campaign."
```

---

## Frontend Integration

### Expected API Response Format

```json
{
  "id": 1,
  "advertiser_id": 123,
  "name": "Summer Learning Campaign",
  "description": "Promote online courses",
  "objective": "lead_generation",
  "verification_status": "pending",
  "submitted_date": "2025-10-20T10:00:00Z",
  "rejected_date": null,
  "rejected_reason": null,
  "suspended_date": null,
  "suspended_reason": null,
  "start_date": "2025-06-01",
  "end_date": "2025-08-31",
  "ad_type": "video",
  "creative_urls": [
    "https://s3.backblazeb2.com/.../video.mp4"
  ],
  "campaign_socials": {
    "facebook": "https://facebook.com/campaign"
  },
  "created_at": "2025-10-20T09:00:00Z",
  "updated_at": "2025-10-20T10:00:00Z"
}
```

---

## Summary

### New Fields Added (Oct 20, 2025)

✅ **5 new fields** for complete campaign lifecycle tracking:

1. `submitted_date` - Track when campaigns are submitted
2. `rejected_date` - Track when campaigns are rejected
3. `rejected_reason` - Document why campaigns were rejected
4. `suspended_date` - Track when campaigns are suspended
5. `suspended_reason` - Document why campaigns were suspended

### Total Fields: **44**

### Backblaze B2 Connected Fields:
- `creative_urls` - Main campaign media (images/videos)

### Social Media Integration:
- `campaign_socials` - Campaign-specific social media links

---

**Migration Status:** ✅ Complete
**Backend Models Updated:** ✅ Yes
**Frontend Support:** ✅ Already implemented in manage-campaigns.html
**Database Schema:** ✅ Up to date

