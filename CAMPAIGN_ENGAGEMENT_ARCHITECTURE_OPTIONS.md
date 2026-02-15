# Campaign Engagement Architecture - Two Options

## Current State

### campaign_profile has 14 aggregate metric fields to remove:

**Impression/Analytics Metrics (11 fields):**
1. `impressions` - Total impressions count
2. `viewability_rate` - Percentage of viewable impressions
3. `click_through_rate` - CTR percentage
4. `conversions` - Total conversions count
5. `conversion_rate` - Conversion percentage
6. `engagement_rate` - Overall engagement percentage
7. `reach` - Unique users reached
8. `impressions_delivered` - Charged impressions count
9. `impressions_charged` - Same as impressions_delivered
10. `cost_per_impression` - **KEEP** (pricing configuration)
11. `total_impressions_planned` - **KEEP** (campaign planning)

**Social Engagement Metrics (3 fields):**
12. `likes` - Total likes count
13. `shares` - Total shares count
14. `comments` - Total comments count

**Total to remove:** 12 fields (9 impression metrics + 3 social metrics)

---

## Option 1: Add Social Fields to campaign_impressions

### Concept
Treat social engagements (likes, shares, comments) as **actions on an impression**. When a user sees a campaign ad (impression), they can like it, share it, or comment on it.

### Schema Changes

#### campaign_impressions (25 → 28 columns)
Add 3 social engagement fields:

```sql
ALTER TABLE campaign_impressions
ADD COLUMN liked BOOLEAN DEFAULT FALSE,
ADD COLUMN shared BOOLEAN DEFAULT FALSE,
ADD COLUMN commented BOOLEAN DEFAULT FALSE;
```

**Rationale:**
- Like/share/comment are actions taken on a specific impression
- User sees ad → can click, convert, like, share, or comment
- All these actions are tied to the same impression event
- Single source of truth: one table for ALL impression-related events

### Final Structure

```
campaign_impressions (28 columns)
├─ Impression tracking: is_unique_impression, is_viewable, viewable_duration
├─ Click tracking: clicked, clicked_at
├─ Conversion tracking: converted, converted_at
├─ Social engagement:
│   ├─ liked (NEW)
│   ├─ shared (NEW)
│   └─ commented (NEW)
├─ User context: user_id, profile_id, profile_type, device_type, location
├─ Placement: placement, audience, region
├─ Charging: cpi_rate, charged, charged_at
└─ Technical: ip_address, user_agent, session_id, created_at
```

### Calculating Aggregate Metrics

```sql
-- Total likes for campaign
SELECT COUNT(*) FROM campaign_impressions
WHERE campaign_id = 3 AND liked = TRUE;

-- Total shares for campaign
SELECT COUNT(*) FROM campaign_impressions
WHERE campaign_id = 3 AND shared = TRUE;

-- Total comments for campaign
SELECT COUNT(*) FROM campaign_impressions
WHERE campaign_id = 3 AND commented = TRUE;

-- Engagement rate (clicks + conversions + likes + shares + comments)
SELECT
    COUNT(CASE WHEN clicked OR converted OR liked OR shared OR commented THEN 1 END)::FLOAT
    / NULLIF(COUNT(*), 0) * 100 as engagement_rate
FROM campaign_impressions
WHERE campaign_id = 3;
```

### Pros
✅ Single source of truth - one table for everything
✅ Simpler architecture - fewer tables
✅ Easy to query - all data in one place
✅ Social actions tied to specific impression
✅ Can analyze correlations (e.g., clicks vs likes)
✅ Fewer JOINs needed

### Cons
❌ Limited social data - just boolean flags
❌ No comment content stored
❌ Can't track who liked/shared (only that it happened)
❌ Can't track when social action happened (separate from impression)
❌ Sparse data - most impressions won't have social engagement

---

## Option 2: Create Separate campaign_engagement Table

### Concept
Treat social engagements as **separate events** that happen after an impression. User sees ad → later they might like/share/comment on it.

### Schema Changes

#### Create new table: campaign_engagement (15 columns)

```sql
CREATE TABLE campaign_engagement (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES campaign_profile(id) ON DELETE CASCADE,
    impression_id INTEGER REFERENCES campaign_impressions(id) ON DELETE SET NULL,
    brand_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    profile_id INTEGER NOT NULL,
    profile_type VARCHAR(50) NOT NULL,

    -- Engagement type
    engagement_type VARCHAR(20) NOT NULL, -- 'like', 'share', 'comment', 'save', 'bookmark'

    -- Comment-specific data
    comment_text TEXT,
    parent_comment_id INTEGER REFERENCES campaign_engagement(id) ON DELETE CASCADE,

    -- Metadata
    device_type VARCHAR(50),
    location VARCHAR(100),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CHECK (engagement_type IN ('like', 'share', 'comment', 'save', 'bookmark')),
    CHECK (engagement_type != 'comment' OR comment_text IS NOT NULL)
);

CREATE INDEX idx_campaign_engagement_campaign ON campaign_engagement(campaign_id);
CREATE INDEX idx_campaign_engagement_user ON campaign_engagement(user_id, profile_id);
CREATE INDEX idx_campaign_engagement_type ON campaign_engagement(engagement_type);
CREATE INDEX idx_campaign_engagement_impression ON campaign_engagement(impression_id);
```

### Final Structure

```
campaign_impressions (25 columns - unchanged)
├─ Impression tracking: is_unique_impression, is_viewable, viewable_duration
├─ Click tracking: clicked, clicked_at
├─ Conversion tracking: converted, converted_at
├─ User context: user_id, profile_id, profile_type, device_type, location
├─ Placement: placement, audience, region
├─ Charging: cpi_rate, charged, charged_at
└─ Technical: ip_address, user_agent, session_id, created_at

campaign_engagement (15 columns - NEW)
├─ Identification: id, campaign_id, impression_id (optional), brand_id
├─ User: user_id, profile_id, profile_type
├─ Engagement: engagement_type (like/share/comment/save/bookmark)
├─ Comment data: comment_text, parent_comment_id (for replies)
├─ Context: device_type, location
└─ Timestamps: created_at, updated_at
```

### Calculating Aggregate Metrics

```sql
-- Total likes for campaign
SELECT COUNT(*) FROM campaign_engagement
WHERE campaign_id = 3 AND engagement_type = 'like';

-- Total shares for campaign
SELECT COUNT(*) FROM campaign_engagement
WHERE campaign_id = 3 AND engagement_type = 'share';

-- Total comments for campaign
SELECT COUNT(*) FROM campaign_engagement
WHERE campaign_id = 3 AND engagement_type = 'comment';

-- Get all comments with text
SELECT user_id, profile_id, comment_text, created_at
FROM campaign_engagement
WHERE campaign_id = 3 AND engagement_type = 'comment'
ORDER BY created_at DESC;

-- Users who both clicked and liked
SELECT DISTINCT ci.user_id
FROM campaign_impressions ci
JOIN campaign_engagement ce ON ce.impression_id = ci.id
WHERE ci.campaign_id = 3 AND ci.clicked = TRUE AND ce.engagement_type = 'like';
```

### Pros
✅ Rich social data - full engagement details
✅ Comment content stored (text, replies, threads)
✅ Track who engaged (user_id, profile_id)
✅ Track when engagement happened (separate timestamp)
✅ Extensible - easy to add new engagement types (save, bookmark, etc.)
✅ Can link engagement to specific impression (optional)
✅ Efficient - no sparse data in impressions table
✅ Follows existing pattern (video_engagements, video_comments tables exist)

### Cons
❌ More complex - additional table to manage
❌ Requires JOINs for combined analytics
❌ More database space (but only when engagements exist)

---

## Recommendation: **Option 2 (Separate Table)**

### Why Option 2 is Better

1. **Richer Data Model**
   - Store comment text, replies, threads
   - Track engagement timing separately from impression
   - Know who liked/shared (not just that it happened)

2. **Scalability**
   - Only stores data when engagement happens (no sparse columns)
   - Easy to add new engagement types in future
   - Can paginate comments efficiently

3. **Follows Existing Pattern**
   - You already have `video_engagements` and `video_comments` tables
   - Consistent architecture across the platform
   - Reusable patterns for developers

4. **Business Value**
   - Can build comment threads/discussions on campaign ads
   - Can notify advertisers when users engage
   - Can identify top engagers for retargeting
   - Can analyze engagement patterns over time

5. **Flexibility**
   - User can like/share without seeing impression (shared by friend)
   - Can track re-shares, comment replies
   - Can add sentiment analysis to comments later
   - Can track engagement sources (direct, shared, etc.)

---

## Migration Plan (Option 2)

### Step 1: Create campaign_engagement Table

```sql
-- See CREATE TABLE statement above
```

### Step 2: Migrate Existing Aggregate Data (if needed)

Since current data in campaign_profile is just totals (likes, shares, comments counts), we can't migrate individual engagements. The counts will reset to 0, and new engagements will be tracked going forward.

```sql
-- No migration needed - start fresh with new tracking
```

### Step 3: Remove Aggregate Fields from campaign_profile

```sql
-- Backup first
CREATE TABLE campaign_profile_engagement_backup AS
SELECT
    id as campaign_id,
    likes,
    shares,
    comments,
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

-- Remove aggregate fields
ALTER TABLE campaign_profile
DROP COLUMN likes,
DROP COLUMN shares,
DROP COLUMN comments,
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

### Step 4: Create Helper View

```sql
CREATE OR REPLACE VIEW campaign_with_full_metrics AS
SELECT
    c.*,

    -- Impression metrics
    (SELECT COUNT(*) FROM campaign_impressions WHERE campaign_id = c.id) as impressions,
    (SELECT COUNT(*) FROM campaign_impressions WHERE campaign_id = c.id AND charged = TRUE) as impressions_delivered,
    (SELECT COUNT(DISTINCT user_id) FROM campaign_impressions WHERE campaign_id = c.id) as reach,

    -- Click/conversion metrics
    (SELECT COUNT(*) FROM campaign_impressions WHERE campaign_id = c.id AND clicked = TRUE) as clicks,
    (SELECT COUNT(*) FROM campaign_impressions WHERE campaign_id = c.id AND converted = TRUE) as conversions,

    -- Social engagement metrics
    (SELECT COUNT(*) FROM campaign_engagement WHERE campaign_id = c.id AND engagement_type = 'like') as likes,
    (SELECT COUNT(*) FROM campaign_engagement WHERE campaign_id = c.id AND engagement_type = 'share') as shares,
    (SELECT COUNT(*) FROM campaign_engagement WHERE campaign_id = c.id AND engagement_type = 'comment') as comments,

    -- Calculated rates
    (SELECT ROUND(COUNT(CASE WHEN is_viewable THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2)
     FROM campaign_impressions WHERE campaign_id = c.id) as viewability_rate,
    (SELECT ROUND(COUNT(CASE WHEN clicked THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2)
     FROM campaign_impressions WHERE campaign_id = c.id) as click_through_rate,
    (SELECT ROUND(COUNT(CASE WHEN converted THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2)
     FROM campaign_impressions WHERE campaign_id = c.id) as conversion_rate,

    -- Total engagement rate (clicks + conversions + social)
    (SELECT ROUND(
        (COUNT(CASE WHEN clicked OR converted THEN 1 END) +
         COALESCE((SELECT COUNT(*) FROM campaign_engagement WHERE campaign_id = c.id), 0))::NUMERIC
        / NULLIF(COUNT(*), 0) * 100, 2)
     FROM campaign_impressions WHERE campaign_id = c.id) as engagement_rate

FROM campaign_profile c;
```

### Step 5: Update Backend Endpoints

Create new endpoints:

```python
# campaign_engagement_endpoints.py

@app.post("/api/campaigns/{campaign_id}/engage")
async def engage_with_campaign(
    campaign_id: int,
    engagement_type: str,  # 'like', 'share', 'comment', 'save', 'bookmark'
    comment_text: Optional[str] = None,
    impression_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """User engages with campaign ad"""
    # Create engagement record
    pass

@app.get("/api/campaigns/{campaign_id}/comments")
async def get_campaign_comments(campaign_id: int, page: int = 1, limit: int = 20):
    """Get comments for campaign"""
    pass

@app.get("/api/campaigns/{campaign_id}/engagements")
async def get_campaign_engagements(
    campaign_id: int,
    engagement_type: Optional[str] = None
):
    """Get all engagements for campaign"""
    pass
```

---

## Summary

### Option 1 (Add to campaign_impressions)
- **Use when:** Social actions are ALWAYS tied to viewing an ad
- **Best for:** Simple like/share tracking without details
- **Simpler:** Single table, fewer JOINs

### Option 2 (Separate table) ⭐ **RECOMMENDED**
- **Use when:** Social actions need rich data (comments, replies, timing)
- **Best for:** Building social features around campaigns
- **More powerful:** Comment threads, engagement analytics, user insights

**Recommended:** Option 2 (campaign_engagement table) because it:
- Stores comment content and threads
- Tracks engagement timing separately
- Follows existing platform patterns
- Enables rich social features
- More flexible for future features

---

## Final Column Counts

### Option 1:
- campaign_profile: 66 → 54 columns (12 removed, 2 kept)
- campaign_impressions: 25 → 28 columns (3 added)
- campaign_invoices: 27 columns (unchanged)

### Option 2 (Recommended):
- campaign_profile: 66 → 54 columns (12 removed, 2 kept)
- campaign_impressions: 25 columns (unchanged)
- campaign_engagement: 15 columns (NEW)
- campaign_invoices: 27 columns (unchanged)

**Which option would you prefer?**
