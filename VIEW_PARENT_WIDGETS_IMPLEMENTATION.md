# View Parent Widgets Implementation

## Overview

Implemented dynamic data population for admin-right-widgets in [view-parent.html](view-profiles/view-parent.html), displaying real-time parent statistics from the `parent_reviews` table and parent profile data.

## Implementation Summary

### Files Created/Modified

1. **Created:** [js/view-parent/view-parent-widgets.js](js/view-parent/view-parent-widgets.js)
   - New widget manager for dynamically updating admin-right-widgets
   - Listens to `parentDataLoaded` event from view-parent-loader.js
   - Updates 3 widgets with real data

2. **Modified:** [view-profiles/view-parent.html](view-profiles/view-parent.html)
   - Added script tag for view-parent-widgets.js (line 1291)

## Widgets Updated

### 1. Parent Statistics Widget
**Location:** `.admin-widget-card:nth-of-type(2)` (4-metric grid widget)

**Metrics Updated:**
- **Children Count** - From `parentData.total_children` or `parentData.children_ids.length`
- **Engagement Rate** - Calculated from 3 review factors: `(engagement_with_tutor_avg + engagement_with_child_avg + responsiveness_avg) / 3`
- **Parent Rating** - From `parentData.rating` (1-5 scale, displayed as decimal)

**Data Sources:**
- Parent data from `/api/parent/{parent_id}`
- Review stats from `/api/parent/reviews/stats/{parent_id}`

### 2. Payment Punctuality Widget
**Location:** `.admin-widget-card:nth-of-type(3)` (circular progress widget)

**Metrics Updated:**
- **Circular Progress** - Percentage calculated from `payment_consistency_avg` (0-5 scale → 0-100%)
- **Percentage Display** - Shows payment punctuality as percentage
- **Paid on Time** - Estimated from `total_reviews * 2 * (payment_percent / 100)`
- **Late Payments** - Calculated as `totalPayments - onTimePayments`

**Calculation:**
```javascript
const paymentConsistency = stats.payment_consistency_avg || 0; // 0-5 scale
const paymentPercent = Math.round((paymentConsistency / 5) * 100); // Convert to 0-100%
```

**Note:** Payment stats are currently estimated. In production, these should be fetched from actual payment records via a dedicated API endpoint.

### 3. Children Overview Widget
**Location:** `.admin-widget-card:nth-of-type(4)` (timeline widget)

**Features:**
- Displays up to 5 children from `parentData.children_info` array
- Shows child name (formatted from `first_name` + `father_name`)
- Shows grade level and school name (`grade_level` • `studying_at`)
- Fade effect for visual hierarchy (opacity decreases for each child)
- Shows "+X more children" indicator if more than 5 children
- Empty state message if no children added

**Data Structure (from backend):**
```javascript
children_info: [
  {
    id: student_profile.id,
    user_id: user.id,
    name: "Full Name",
    first_name: "First",
    father_name: "Father",
    grade_level: "Grade 10",
    studying_at: "School Name",
    profile_picture: "url",
    // ... other fields
  }
]
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ view-parent-loader.js                                            │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 1. Fetches parent data: /api/parent/{parent_id}           │   │
│ │ 2. Fetches review stats: /api/parent/reviews/stats/{id}   │   │
│ │ 3. Dispatches 'parentDataLoaded' event with:              │   │
│ │    - parentData (includes children_info)                  │   │
│ │    - reviewStats (4-factor averages)                      │   │
│ └───────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ view-parent-widgets.js                                           │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Listens to 'parentDataLoaded' event                       │   │
│ │ Updates:                                                  │   │
│ │  - Parent Statistics Widget (children, engagement, rating)│   │
│ │  - Payment Punctuality Widget (circle, stats)             │   │
│ │  - Children Overview Widget (list, timeline)              │   │
│ └───────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Review Stats Structure

From `/api/parent/reviews/stats/{parent_id}`:

```javascript
{
  total_reviews: 15,              // Number of reviews
  average_rating: 4.5,            // Overall rating (1-5)
  engagement_with_tutor_avg: 4.7, // Factor 1 average
  engagement_with_child_avg: 4.8, // Factor 2 average
  responsiveness_avg: 4.3,        // Factor 3 average
  payment_consistency_avg: 4.6    // Factor 4 average
}
```

## Engagement Rate Calculation

```javascript
calculateEngagementRate() {
  if (!this.reviewStats || this.reviewStats.total_reviews === 0) {
    return 0;
  }

  // Average of 3 engagement-related factors
  const avg = (
    this.reviewStats.engagement_with_tutor_avg +
    this.reviewStats.engagement_with_child_avg +
    this.reviewStats.responsiveness_avg
  ) / 3;

  // Convert from 0-5 scale to 0-100 percentage
  return Math.round((avg / 5) * 100);
}
```

**Formula:** `((Factor1 + Factor2 + Factor3) / 3) / 5 * 100`

**Example:**
- engagement_with_tutor_avg: 4.5
- engagement_with_child_avg: 4.7
- responsiveness_avg: 4.3
- Average: (4.5 + 4.7 + 4.3) / 3 = 4.5
- Percentage: (4.5 / 5) * 100 = 90%

## Backend API Endpoints

### Get Parent Data
```
GET /api/parent/{parent_id}
```

**Response includes:**
```javascript
{
  id: 123,
  user_id: 456,
  name: "Parent Name",
  rating: 4.5,
  rating_count: 15,
  total_children: 3,
  children_ids: [1, 2, 3],
  children_info: [
    {
      id: 1,
      user_id: 789,
      name: "Child Name",
      first_name: "Child",
      father_name: "Name",
      grade_level: "Grade 10",
      studying_at: "High School",
      // ... other fields
    }
  ],
  // ... other profile fields
}
```

### Get Review Stats
```
GET /api/parent/reviews/stats/{parent_id}
```

**Response:**
```javascript
{
  total_reviews: 15,
  average_rating: 4.5,
  engagement_with_tutor_avg: 4.7,
  engagement_with_child_avg: 4.8,
  responsiveness_avg: 4.3,
  payment_consistency_avg: 4.6
}
```

## Widget Locations in HTML

### Parent Statistics Widget
```html
<div class="admin-widget-card" style="...">
  <h3>📊 Parent Statistics</h3>
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
    <!-- Children Count -->
    <div style="background: linear-gradient(135deg, rgba(59,130,246,0.1), rgba(37,99,235,0.05));">
      <div>3</div> <!-- UPDATED BY JS -->
      <div>Children</div>
    </div>
    <!-- Engagement Rate -->
    <div style="background: linear-gradient(135deg, rgba(34,197,94,0.1), rgba(22,163,74,0.05));">
      <div>92%</div> <!-- UPDATED BY JS -->
      <div>Engagement</div>
    </div>
    <!-- Parent Rating -->
    <div style="background: linear-gradient(135deg, rgba(245,158,11,0.1), rgba(217,119,6,0.05));">
      <div>4.8</div> <!-- UPDATED BY JS -->
      <div>Tutor Rating</div>
    </div>
  </div>
</div>
```

### Payment Punctuality Widget
```html
<div class="admin-widget-card" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
  <h3>💳 Payment Punctuality</h3>
  <div>
    <svg>
      <circle /> <!-- Progress circle - UPDATED BY JS -->
    </svg>
    <div>100%</div> <!-- UPDATED BY JS -->
  </div>
  <div>
    <span>Paid on Time</span>
    <span>20/20</span> <!-- UPDATED BY JS -->
  </div>
  <div>
    <span>Late Payments</span>
    <span>0</span> <!-- UPDATED BY JS -->
  </div>
</div>
```

### Children Overview Widget
```html
<div class="admin-widget-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
  <h3>👥 Children Overview</h3>
  <div class="timeline-content">
    <!-- Children list - DYNAMICALLY GENERATED BY JS -->
    <div class="timeline-item">
      <div class="timeline-dot"></div>
      <div>
        <p>Child Name</p>
        <p>Grade 10 • School Name</p>
      </div>
    </div>
    <!-- ... more children ... -->
  </div>
</div>
```

## Testing

### Test Data Requirements

1. **Parent with children:** Test with parent profile that has `children_ids` populated
2. **Parent with reviews:** Test with parent that has reviews in `parent_reviews` table
3. **Various scenarios:**
   - Parent with 0 children (empty state)
   - Parent with 1-5 children (normal display)
   - Parent with 6+ children (overflow indicator)
   - Parent with no reviews (0% engagement, 0 rating)
   - Parent with high engagement (90%+ engagement rate)

### Test URL
```
http://localhost:8081/view-profiles/view-parent.html?id=123
```

Replace `123` with actual parent profile ID.

### Verification Steps

1. Open view-parent.html with valid parent ID
2. Check browser console for:
   ```
   ✅ Parent Statistics Widget updated: {children: 3, engagement: "92%", rating: "4.8"}
   ✅ Payment Punctuality Widget updated: {percent: "92%", onTime: "27/30", late: 3}
   ✅ Children Overview Widget updated: {count: 3, displayed: 3}
   ```
3. Verify widgets display correct data:
   - Children count matches database
   - Engagement rate is calculated correctly
   - Rating matches parent rating
   - Children list shows correct names and grades
   - Payment stats reflect review data

## Future Enhancements

1. **Real Payment Data:**
   - Create dedicated API endpoint for actual payment records
   - Replace estimated payment stats with real data from database
   - Track payment dates, amounts, and status

2. **Interactive Children Cards:**
   - Add click handler to navigate to child's profile
   - Show child's profile picture in timeline
   - Display more child stats (rating, sessions, etc.)

3. **Dynamic Refresh:**
   - Add refresh button to reload widget data
   - Auto-refresh on data updates
   - Real-time updates via WebSocket

4. **Additional Widgets:**
   - Active sessions widget
   - Recent activities widget
   - Upcoming appointments widget
   - Communication history widget

## Notes

- Widgets update automatically when parent data loads
- No manual initialization required - listens to global event
- Handles missing data gracefully with default values
- Console logs show successful updates for debugging
- Compatible with existing parent profile loader system

## Related Files

- [view-profiles/view-parent.html](view-profiles/view-parent.html) - Main parent profile page
- [js/view-parent/view-parent-loader.js](js/view-parent/view-parent-loader.js) - Loads parent data
- [js/view-parent/view-parent-reviews.js](js/view-parent/view-parent-reviews.js) - Manages reviews
- [js/view-parent/view-parent-children.js](js/view-parent/view-parent-children.js) - Manages children list
- [astegni-backend/parent_endpoints.py](astegni-backend/parent_endpoints.py) - Backend API endpoints
