# Trending Search System

## Overview
The Trending Search System tracks tutor popularity based on search/view activity and boosts popular tutors in search rankings, even if they have lower subscription tiers.

## How It Works

### 1. **Tracking System**
When tutors are displayed in search results or viewed:
- `search_count` increments by 1
- `last_search_increment` updates to current timestamp
- `trending_score` is recalculated based on time-weighted formula

### 2. **Trending Score Calculation**

**Formula**: `trending_score = search_count × time_weight`

**Time Weights**:
- Last 24 hours: `1.0` (very recent)
- 1-7 days ago: `0.7` (recent)
- 7-30 days ago: `0.3` (somewhat recent)
- Over 30 days: `0.1` (old searches)

**Example**:
```
Tutor A: 100 searches, last searched 1 hour ago
→ trending_score = 100 × 1.0 = 100

Tutor B: 500 searches, last searched 10 days ago
→ trending_score = 500 × 0.3 = 150

Tutor C: 1000 searches, last searched 40 days ago
→ trending_score = 1000 × 0.1 = 100
```

### 3. **Ranking Boost**

**Trending Score Points** (0-200 base + up to 100 bonus):

| Trending Score | Points Added | Description |
|----------------|--------------|-------------|
| ≥100 | 200 | Maximum trending bonus |
| 50-99 | 100-200 | Proportional (medium trending) |
| 1-49 | 2-100 | Proportional (low trending) |
| 0 | 0 | No trending bonus |

**Search Count Bonuses** (viral tutors):

| Search Count | Bonus Points | Label |
|-------------|--------------|-------|
| ≥1000 | +100 | Viral Tutor |
| 500-999 | +50 | Very Popular |
| 100-499 | +25 | Popular |
| <100 | 0 | - |

### 4. **Impact on Tier System**

**Before Trending** (subscription-only):
```
Tier 1 (20%): Premium (500pts), Standard+ (400pts)
Tier 2 (30%): Standard (300pts), Basic (200pts)
Tier 3 (50%): Free (0pts)
```

**After Trending** (with popularity):
```
Example: Free tutor with 100 trending score + 500 searches
Base: 0 (Free tier)
+ Trending: 200 (high trending)
+ Viral Bonus: 50 (500+ searches)
= 250 points total → moves to Tier 2!

Example: Standard tutor with 150 trending score + 1500 searches
Base: 300 (Standard tier)
+ Trending: 200 (very high trending)
+ Viral Bonus: 100 (1000+ searches)
= 600 points total → moves to Tier 1! (beats Premium without trending)
```

## Database Schema

### New Fields in `tutor_profiles` Table

```sql
ALTER TABLE tutor_profiles
ADD COLUMN search_count INTEGER DEFAULT 0,
ADD COLUMN trending_score FLOAT DEFAULT 0.0,
ADD COLUMN last_search_increment TIMESTAMP;

CREATE INDEX idx_tutor_search_count ON tutor_profiles(search_count DESC);
CREATE INDEX idx_tutor_trending_score ON tutor_profiles(trending_score DESC);
```

## API Endpoints

### 1. Track Tutor Views
```http
POST /api/tutors/track-views
Content-Type: application/json
Authorization: Bearer <token>

{
  "tutor_ids": [1, 2, 3, 4, 5]
}
```

**Response**:
```json
{
  "message": "Updated search tracking for 5 tutors",
  "updated": 5,
  "timestamp": "2025-01-19T10:30:00Z"
}
```

### 2. Get Trending Tutors
```http
GET /api/tutors/trending?limit=20&min_searches=5
```

**Response**:
```json
{
  "trending_tutors": [
    {
      "id": 42,
      "user_id": 123,
      "first_name": "Abebe",
      "father_name": "Tadesse",
      "search_count": 1250,
      "trending_score": 875.0,
      "last_searched": "2025-01-19T09:45:00Z"
    }
  ],
  "total": 20
}
```

### 3. Get Search Statistics
```http
GET /api/tutors/search-stats
```

**Response**:
```json
{
  "total_searches": 125000,
  "average_searches": 75.5,
  "total_tutors": 1656,
  "top_10_most_searched": [...]
}
```

### 4. Recalculate Trending Scores (Admin)
```http
POST /api/tutors/recalculate-trending
Authorization: Bearer <admin_token>
```

## Frontend Integration

### Auto-Tracking in Find-Tutors

**File**: `js/find-tutors/trending-tracker.js`

The system automatically tracks tutors when:
1. Search results are displayed
2. Page changes (pagination)
3. Filters are applied

**Tracking is debounced** (2-second delay) to avoid excessive API calls.

```javascript
// Automatic tracking in main-controller.js
if (tutors.length > 0 && typeof TrendingTracker !== 'undefined') {
    const tutorIds = tutors.map(t => t.id);
    TrendingTracker.queueTutorViews(tutorIds);
}
```

### Manual Tracking

For other pages (tutor profiles, recommendations):

```javascript
// Track single tutor view
TrendingTracker.trackSingleTutorView(tutorId);

// Track multiple tutors immediately
TrendingTracker.trackTutorViews([1, 2, 3, 4, 5]);

// Queue tutors (debounced)
TrendingTracker.queueTutorViews([1, 2, 3], 2000);
```

## Migration

Run the migration to add trending fields:

```bash
cd astegni-backend
python migrate_add_trending_fields.py
```

## Maintenance

### Periodic Score Recalculation

Run hourly via cron to keep trending scores fresh:

```bash
# Every hour
0 * * * * curl -X POST http://localhost:8000/api/tutors/recalculate-trending \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Or use system scheduler (Windows Task Scheduler, systemd timer, etc.)

## Benefits

1. **Meritocracy**: Popular tutors get visibility regardless of subscription
2. **Discovery**: New popular tutors can quickly rise in rankings
3. **Engagement**: Students discover trending, well-received tutors
4. **Revenue**: Popular tutors are incentivized to upgrade subscriptions for even higher visibility
5. **Fairness**: Time-weighting prevents old popularity from dominating forever

## Example Rankings

**Without Trending**:
```
1. Premium Tutor A (500pts) - Few searches
2. Premium Tutor B (500pts) - No searches
3. Standard+ Tutor C (400pts) - Medium searches
4. Free Tutor D (0pts) - 2000 searches! ← Buried despite popularity
```

**With Trending**:
```
1. Free Tutor D (450pts) - 2000 searches! ← Now in Tier 1!
   [0 base + 200 trending + 100 viral + 150 combo bonuses]
2. Premium Tutor A (550pts) - Few searches
   [500 base + 50 trending]
3. Standard+ Tutor C (475pts) - Medium searches
   [400 base + 75 trending]
4. Premium Tutor B (500pts) - No searches
   [500 base + 0 trending]
```

## Logging

The backend logs trending information in search results:

```
📊 Smart Ranking Results (Total: 1656 tutors)
   Top 5 tutors:
   1. [FREE] TREND(2000) Score: 450 - Abebe Tadesse
   2. [PREMIUM] TREND(25) Score: 550 - Hanan Mohammed
   3. [STD+] TREND(150) Score: 475 - Dawit Kebede
   4. [PREMIUM] Score: 500 - Meron Assefa
   5. [STD] BASIC HIST TREND(75) Score: 505 - Solomon Girma
```

## Testing

1. **Track some tutors**:
   ```bash
   curl -X POST http://localhost:8000/api/tutors/track-views \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"tutor_ids": [1, 2, 3, 1, 1]}'  # Tutor 1 gets 3 views
   ```

2. **Check trending tutors**:
   ```bash
   curl http://localhost:8000/api/tutors/trending?limit=10
   ```

3. **Verify rankings updated**:
   - Search for tutors on find-tutors page
   - Check console logs for trending scores
   - Observe popular tutors ranking higher

## Future Enhancements

1. **Click-Through Rate (CTR)**: Track which tutors are clicked vs just viewed
2. **Booking Rate**: Weight by actual bookings (stronger signal)
3. **Review Quality**: Incorporate recent review ratings
4. **Geographic Trending**: Different trends per city/region
5. **Subject Trending**: Popular tutors per subject
6. **Time-of-Day Trends**: Different rankings for morning/evening/weekend
