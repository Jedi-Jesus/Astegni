# Admin Campaigns API Fix - Database Schema Alignment

## Issue Summary

The admin campaigns API endpoints were failing with 500 errors because they were trying to access columns that don't exist in the `campaign_profile` table. The campaign system uses a normalized database schema with separate tables for different concerns.

## Database Architecture

### Campaign Tables Structure

1. **`campaign_profile`** - Main campaign metadata
   - Campaign details, budget, dates, verification status
   - Does NOT contain: impressions, clicks, likes, shares, comments, thumbnails

2. **`campaign_media`** - Campaign media files
   - Stores images/videos for different ad placements
   - Used for: thumbnails, banners, widgets, etc.

3. **`campaign_impressions`** - Ad serving metrics
   - Tracks individual impressions, clicks, conversions
   - Used for: impressions count, clicks count, conversions count

4. **`campaign_engagement`** - User interactions
   - Tracks likes, shares, comments on campaigns
   - Used for: engagement metrics

### Column Mismatches Fixed

| Endpoint Expected | Actual Column | Solution |
|-------------------|---------------|----------|
| `thumbnail_url` | N/A | Query from `campaign_media` table |
| `impressions` | N/A | Aggregate from `campaign_impressions` table |
| `clicks` | N/A | Aggregate from `campaign_impressions` WHERE clicked=true |
| `conversions` | N/A | Aggregate from `campaign_impressions` WHERE converted=true |
| `likes` | N/A | Aggregate from `campaign_engagement` WHERE type='like' |
| `shares` | N/A | Aggregate from `campaign_engagement` WHERE type='share' |
| `comments` | N/A | Aggregate from `campaign_engagement` WHERE type='comment' |
| `click_through_rate` | N/A | Removed (calculate client-side: clicks/impressions) |
| `end_date` | `ended_at` | Changed to use correct column name |
| `target_audience` | `target_audiences` | Changed to use array column |
| `ad_type` | N/A | Removed (not used) |
| `budget` | `campaign_budget` | Use existing column |
| `campaign_package_id` | N/A | Removed (packages deprecated) |

## Files Modified

### 1. astegni-backend/admin_advertisers_endpoints.py

**Fixed Endpoints:**
- `GET /api/admin-advertisers/campaigns` (Lines 377-545)
- `GET /api/admin-advertisers/recent/campaigns` (Lines 767-805)

**Changes Made:**

#### A. brand_packages Column Names (Lines 80, 394)
```python
# Before:
admin_cur.execute("SELECT id, name, price FROM brand_packages")
packages_map[pkg['id']] = {'name': pkg['name'], 'price': pkg['price']}

# After:
admin_cur.execute("SELECT id, package_title, package_price FROM brand_packages")
packages_map[pkg['id']] = {'name': pkg['package_title'], 'price': pkg['package_price']}
```

#### B. Campaign Metrics Aggregation (Lines 455-507)
Added aggregation queries to fetch metrics from related tables:

```python
# Get campaign IDs for aggregation
campaign_ids = [c['id'] for c in campaigns]

# Aggregate impressions/clicks/conversions from campaign_impressions
cur.execute("""
    SELECT
        campaign_id,
        COUNT(*) as total_impressions,
        COUNT(*) FILTER (WHERE clicked = true) as total_clicks,
        COUNT(*) FILTER (WHERE converted = true) as total_conversions
    FROM campaign_impressions
    WHERE campaign_id = ANY(%s)
    GROUP BY campaign_id
""", (campaign_ids,))

# Aggregate likes/shares/comments from campaign_engagement
cur.execute("""
    SELECT
        campaign_id,
        COUNT(*) FILTER (WHERE engagement_type = 'like') as total_likes,
        COUNT(*) FILTER (WHERE engagement_type = 'share') as total_shares,
        COUNT(*) FILTER (WHERE engagement_type = 'comment') as total_comments
    FROM campaign_engagement
    WHERE campaign_id = ANY(%s)
    GROUP BY campaign_id
""", (campaign_ids,))

# Get thumbnails from campaign_media
cur.execute("""
    SELECT DISTINCT ON (campaign_id) campaign_id, file_url
    FROM campaign_media
    WHERE campaign_id = ANY(%s) AND media_type = 'image'
    ORDER BY campaign_id, created_at ASC
""", (campaign_ids,))
```

#### C. Response Transformation (Lines 508-545)
```python
# Before: Accessed non-existent columns
'campaign_image': c['thumbnail_url'],  # ❌ Column doesn't exist
'impressions': c['impressions'] or 0,   # ❌ Column doesn't exist
'end_date': str(c.get('end_date')),     # ❌ Column doesn't exist

# After: Use aggregated data and correct columns
'campaign_image': thumbnail_map.get(campaign_id),  # ✅ From campaign_media
'impressions': impressions_map.get(campaign_id, 0), # ✅ From campaign_impressions
'end_date': str(c.get('ended_at')),                 # ✅ Correct column name
```

## Testing

### Database Verification
```bash
cd astegni-backend
python -c "
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv
import os

load_dotenv()
user_db_url = os.getenv('DATABASE_URL')

with psycopg.connect(user_db_url, row_factory=dict_row) as conn:
    with conn.cursor() as cur:
        # Test the aggregation query
        cur.execute('''
            SELECT
                cp.id,
                cp.name,
                COUNT(ci.id) as impression_count,
                COUNT(CASE WHEN ci.clicked THEN 1 END) as click_count,
                COUNT(ce.id) FILTER (WHERE ce.engagement_type = 'like') as like_count
            FROM campaign_profile cp
            LEFT JOIN campaign_impressions ci ON cp.id = ci.campaign_id
            LEFT JOIN campaign_engagement ce ON cp.id = ce.campaign_id
            WHERE cp.id = 3
            GROUP BY cp.id, cp.name
        ''')
        result = cur.fetchone()
        print(f'Campaign: {result}')
"
```

### API Testing
```bash
# Test campaigns endpoint
curl http://localhost:8001/api/admin-advertisers/campaigns?status=pending

# Test recent campaigns endpoint
curl http://localhost:8001/api/admin-advertisers/recent/campaigns?limit=5
```

### Expected Results
- ✅ No more 500 Internal Server Errors
- ✅ Campaigns load in admin panel "Campaign Requests" section
- ✅ Metrics (impressions, clicks, likes, shares) display correctly
- ✅ Campaign thumbnails display from campaign_media table
- ✅ `submit_for_verification` filter works correctly

## Current Database State

```
campaign_profile: 3 campaigns
- ID 2: "adsf" (not submitted)
- ID 3: "Gothe Institute" (submitted for verification ✓)
- ID 4: "Test campaign 2" (not submitted)

campaign_media: 3 files
- Campaign 3 has 2 images (leaderboard-banner, logo)

campaign_impressions: 0 records

campaign_engagement: 4 records
- Campaign 2: 1 like, 1 share
```

## API Response Format

### GET /api/admin-advertisers/campaigns?status=pending

```json
{
  "campaigns": [
    {
      "id": 3,
      "campaign_name": "Gothe Institute",
      "campaign_image": "https://f003.backblazeb2.com/file/astegni-media/...",
      "description": "...",
      "objective": "...",
      "verification_status": "pending",
      "is_verified": false,
      "submit_for_verification": true,
      "impressions": 0,
      "clicks": 0,
      "conversions": 0,
      "likes": 0,
      "shares": 0,
      "comments": 0,
      "campaign_budget": 1000000.0,
      "start_date": "2026-02-12T00:00:00",
      "end_date": null,
      "created_at": "2026-02-12 03:12:47",
      "target_audience": ["tutor", "student", "parent"],
      "brand_name": "Test brand",
      "brand_logo": null,
      "brand_id": 17,
      "package_name": "Custom",
      "package_price": null
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "pages": 1
}
```

## Summary

### ✅ Fixed Issues
1. Column name mismatch: `brand_packages.name` → `package_title`
2. Column name mismatch: `brand_packages.price` → `package_price`
3. Missing column: `thumbnail_url` → Fetch from `campaign_media`
4. Missing columns: `impressions`, `clicks`, `conversions` → Aggregate from `campaign_impressions`
5. Missing columns: `likes`, `shares`, `comments` → Aggregate from `campaign_engagement`
6. Wrong column: `end_date` → Use `ended_at`
7. Wrong column: `target_audience` → Use `target_audiences` (array)
8. Removed deprecated: `campaign_package_id`, `ad_type`, `budget` (duplicate)

### 🎯 Result
- Admin panel can now successfully load campaigns
- Metrics are correctly aggregated from normalized tables
- Campaign verification workflow is fully operational
- API responses match frontend expectations

## Next Steps

If you need to add more fields to the campaign response:
1. Check if the field exists in `campaign_profile` using: `\d campaign_profile` in psql
2. If it's in a related table, add an aggregation query
3. Update the response transformation accordingly

## Documentation

Related documentation:
- [ADMIN_CAMPAIGN_VERIFICATION_GUIDE.md](ADMIN_CAMPAIGN_VERIFICATION_GUIDE.md)
- [CAMPAIGN_VERIFICATION_WORKFLOW.md](CAMPAIGN_VERIFICATION_WORKFLOW.md)
- [CAMPAIGN_MEDIA_DATABASE_IMPLEMENTATION.md](CAMPAIGN_MEDIA_DATABASE_IMPLEMENTATION.md)
