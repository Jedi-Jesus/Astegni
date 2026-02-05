# Test Guide: Parent Profile Widgets

## Quick Test Steps

### 1. Start Backend Server
```bash
cd astegni-backend
python app.py
```
Backend should be running on: http://localhost:8000

### 2. Start Frontend Server
```bash
python dev-server.py
```
Frontend should be running on: http://localhost:8081

### 3. Open Parent Profile
Navigate to:
```
http://localhost:8081/view-profiles/view-parent.html?id=PARENT_ID
```
Replace `PARENT_ID` with an actual parent profile ID from your database.

### 4. Check Browser Console
Open DevTools (F12) and check console for:
```
✅ Parent Statistics Widget updated: {children: 3, engagement: "92%", rating: "4.8"}
✅ Payment Punctuality Widget updated: {percent: "92%", onTime: "27/30", late: 3}
✅ Children Overview Widget updated: {count: 3, displayed: 3}
```

### 5. Visual Verification

Check the right sidebar widgets:

**Widget 1: Parent Statistics (4 metrics grid)**
- ✓ Children count shows correct number
- ✓ Engagement rate shows percentage (0-100%)
- ✓ Parent rating shows decimal (0.0-5.0)

**Widget 2: Payment Punctuality (green circular)**
- ✓ Circular progress shows correct percentage
- ✓ Percentage number matches circle fill
- ✓ "Paid on Time" shows ratio (e.g., "27/30")
- ✓ "Late Payments" shows count

**Widget 3: Children Overview (purple timeline)**
- ✓ Shows up to 5 children
- ✓ Each child shows: Name • Grade • School
- ✓ If >5 children, shows "+X more" indicator
- ✓ If 0 children, shows empty state message

## Test Scenarios

### Scenario 1: Parent with Multiple Children
**Setup:** Parent with 3+ children and reviews
**Expected:**
- Children count: 3
- Engagement: Calculated from reviews
- Rating: From parent_reviews average
- Children list: Shows all children with grades

### Scenario 2: Parent with No Children
**Setup:** Parent with empty children_ids array
**Expected:**
- Children count: 0
- Engagement: 0% (if no reviews)
- Rating: 0.0 (if no reviews)
- Children list: "No children added yet" message

### Scenario 3: Parent with Many Children (6+)
**Setup:** Parent with 6+ children
**Expected:**
- Shows first 5 children
- Bottom shows: "+2 more children" (if 7 total)

### Scenario 4: Parent with No Reviews
**Setup:** Parent with children but no reviews
**Expected:**
- Children count: Shows correct count
- Engagement: 0%
- Rating: 0.0
- Payment punctuality: 0%

## Common Issues & Solutions

### Issue 1: Widgets Not Updating
**Symptoms:** Widgets show hardcoded values (e.g., "3 Children", "92%")
**Solution:**
1. Check browser console for errors
2. Verify view-parent-widgets.js is loaded
3. Check if `parentDataLoaded` event is firing
4. Verify parent ID is valid

**Debug:**
```javascript
// In browser console
console.log(window.viewParentWidgets);
console.log(window.currentParentData);
```

### Issue 2: No Children Showing
**Symptoms:** Children Overview shows empty even with children_ids
**Solution:**
1. Check if children_info is populated in API response
2. Verify student profiles exist for children_ids
3. Check console for errors in widget rendering

**Debug:**
```javascript
// In browser console
console.log(window.currentParentData.children_info);
```

### Issue 3: Incorrect Engagement Rate
**Symptoms:** Engagement shows wrong percentage
**Solution:**
1. Verify review stats API returns correct averages
2. Check calculation: `((avg1 + avg2 + avg3) / 3) / 5 * 100`
3. Ensure review stats exist

**Debug:**
```javascript
// Check review stats
fetch('http://localhost:8000/api/parent/reviews/stats/PARENT_ID')
  .then(r => r.json())
  .then(d => console.log(d));
```

## Sample Test Data

### Create Test Parent with Reviews
```sql
-- Insert test parent
INSERT INTO parent_profiles (user_id, children_ids, rating, rating_count)
VALUES (123, ARRAY[1, 2, 3], 4.5, 15);

-- Insert test reviews
INSERT INTO parent_reviews (
  parent_id, reviewer_id, user_role, rating,
  engagement_with_tutor_rating, engagement_with_child_rating,
  responsiveness_rating, payment_consistency_rating,
  review_text
) VALUES
  (1, 10, 'tutor', 4.5, 4.5, 4.7, 4.3, 4.6, 'Great parent!'),
  (1, 11, 'tutor', 4.8, 4.8, 4.9, 4.7, 4.8, 'Very engaged!'),
  (1, 12, 'tutor', 4.3, 4.2, 4.4, 4.0, 4.5, 'Good communication.');
```

### Verify Data
```sql
-- Check parent data
SELECT * FROM parent_profiles WHERE id = 1;

-- Check review stats
SELECT
  COUNT(*) as total_reviews,
  AVG(rating) as average_rating,
  AVG(engagement_with_tutor_rating) as engagement_tutor_avg,
  AVG(engagement_with_child_rating) as engagement_child_avg,
  AVG(responsiveness_rating) as responsiveness_avg,
  AVG(payment_consistency_rating) as payment_avg
FROM parent_reviews
WHERE parent_id = 1;
```

## Expected Console Output

### Successful Load
```
Loaded parent data: {id: 123, name: "Parent Name", ...}
Loaded review stats: {total_reviews: 15, average_rating: 4.5, ...}
✅ Parent Statistics Widget updated: {children: 3, engagement: "92%", rating: "4.5"}
✅ Payment Punctuality Widget updated: {percent: "92%", onTime: "27/30", late: 3}
✅ Children Overview Widget updated: {count: 3, displayed: 3}
```

### With Errors
```
❌ Error fetching parent data: 404 Not Found
❌ Parent profile not found
```

## API Endpoint Testing

### Test Parent Data Endpoint
```bash
curl http://localhost:8000/api/parent/123
```

**Expected Response:**
```json
{
  "id": 123,
  "user_id": 456,
  "name": "Parent Name",
  "rating": 4.5,
  "rating_count": 15,
  "total_children": 3,
  "children_ids": [1, 2, 3],
  "children_info": [
    {
      "id": 1,
      "name": "Child One",
      "grade_level": "Grade 10",
      "studying_at": "High School"
    }
  ]
}
```

### Test Review Stats Endpoint
```bash
curl http://localhost:8000/api/parent/reviews/stats/123
```

**Expected Response:**
```json
{
  "total_reviews": 15,
  "average_rating": 4.5,
  "engagement_with_tutor_avg": 4.7,
  "engagement_with_child_avg": 4.8,
  "responsiveness_avg": 4.3,
  "payment_consistency_avg": 4.6
}
```

## Performance Checks

### Load Time
- Widget update should be instant after parent data loads
- No visible delay between data fetch and widget update
- Console logs should appear immediately after data load

### Browser Compatibility
- ✓ Chrome/Edge (latest)
- ✓ Firefox (latest)
- ✓ Safari (latest)

### Responsive Design
- Widgets should adapt to screen size
- Check on mobile viewport (F12 → Toggle device toolbar)

## Cleanup After Testing

### Remove Test Data
```sql
-- Delete test reviews
DELETE FROM parent_reviews WHERE parent_id = 1;

-- Delete test parent (if created for testing)
DELETE FROM parent_profiles WHERE id = 1;
```

## Next Steps After Testing

1. ✓ Verify all widgets update correctly
2. ✓ Test with various parent profiles
3. ✓ Check edge cases (no children, no reviews)
4. ✓ Verify console shows success messages
5. ✓ Test on different browsers
6. ✓ Review with real production data

## Support

If issues persist:
1. Check [VIEW_PARENT_WIDGETS_IMPLEMENTATION.md](VIEW_PARENT_WIDGETS_IMPLEMENTATION.md) for details
2. Review browser console for errors
3. Verify backend is running and endpoints respond
4. Check database has valid parent and review data
