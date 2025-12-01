# Featured Reviews System - Complete Implementation

## Overview
The Featured Reviews System allows admins to select platform reviews and display them as testimonials across different pages (parent-profile, student-profile, tutor-profile, home, etc.) in ad-placeholder sections.

## Complete Workflow

### 1. Admin Selects Reviews
1. Navigate to **System Settings** → **Manage Reviews**
2. Browse or filter reviews (by role or rating)
3. Check the checkboxes next to reviews you want to feature
4. Selection toolbar appears showing count of selected reviews
5. Choose target location from dropdown (All Pages, Parent Profile, Student Profile, Tutor Profile, Home)
6. Click **"Feature Reviews"** button
7. Reviews are saved to `featured_reviews` table

### 2. Display on Pages
Reviews automatically appear in ad-placeholder sections on the selected pages as rotating testimonials.

## Database Schema

### `featured_reviews` Table
```sql
CREATE TABLE featured_reviews (
    id SERIAL PRIMARY KEY,
    review_id INTEGER NOT NULL REFERENCES astegni_reviews(id) ON DELETE CASCADE,
    display_location VARCHAR(100) DEFAULT 'all',
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    featured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    featured_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(review_id, display_location)
);
```

**Key Fields:**
- `review_id` - Links to the actual review
- `display_location` - Where to show ('all', 'parent-profile', 'student-profile', etc.)
- `display_order` - Order in which reviews appear
- `is_active` - Toggle visibility without deletion

## Backend API Endpoints

### 1. Feature Reviews (Admin)
```http
POST /api/admin/reviews/feature
Content-Type: application/json

{
    "review_ids": [1, 5, 12, 23],
    "display_location": "parent-profile"
}
```

**Response:**
```json
{
    "message": "Successfully featured 4 reviews",
    "count": 4,
    "location": "parent-profile"
}
```

### 2. Unfeature Review (Admin)
```http
DELETE /api/admin/reviews/feature/5?location=parent-profile
```

**Response:**
```json
{
    "message": "Review unfeatured successfully",
    "review_id": 5
}
```

### 3. Get Featured Reviews (Public)
```http
GET /api/featured-reviews?location=parent-profile&limit=6
```

**Response:**
```json
[
    {
        "id": 5,
        "reviewer_id": 112,
        "reviewer_name": "Abebe Bekele",
        "reviewer_profile_picture": "https://...",
        "reviewer_role": "parent",
        "review": "Excellent platform! Found a great tutor for my son.",
        "rating": 5,
        "review_type": "platform",
        "created_at": "2025-10-10T16:21:58",
        "display_location": "parent-profile",
        "display_order": 0
    }
]
```

**Query Parameters:**
- `location` - Filter by page location (default: 'all')
- `limit` - Max number of reviews (default: 6, max: 20)

## Frontend Components

### 1. Enhanced Review Selection (Admin)

**File:** `js/admin-pages/manage-reviews.js`

**New Features:**
- Checkboxes on each review card
- Selection state management with Set()
- Dynamic toolbar that appears when reviews are selected
- Location dropdown for targeting specific pages
- Feature/Clear selection actions

**Key Methods:**
```javascript
ManageReviews.toggleSelection(reviewId)    // Toggle checkbox
ManageReviews.featureSelected()            // POST selected to API
ManageReviews.clearSelection()             // Clear all checkboxes
```

### 2. Testimonials Widget

**Files:**
- `js/root/testimonials-widget.js` - Widget logic
- `css/root/testimonials-widget.css` - Widget styles

**Features:**
- Auto-rotating carousel (5 seconds interval)
- Manual navigation (previous/next buttons)
- Dot indicators for quick jumping
- Star ratings display
- Reviewer info with avatar and role
- Responsive design

**Initialization:**
```javascript
// In any page's script
document.addEventListener('DOMContentLoaded', () => {
    // Initialize widget for parent-profile location
    TestimonialsWidget.init('ad-placeholder-1', 'parent-profile', 6);
});
```

**Parameters:**
- `containerId` - HTML element ID where widget renders
- `location` - Page location to fetch reviews for
- `limit` - Number of testimonials to display

## Integration Guide

### Adding Testimonials to Any Page

**Step 1: Add CSS & JS includes**
```html
<head>
    <!-- Add testimonials widget styles -->
    <link rel="stylesheet" href="../css/root/testimonials-widget.css">
</head>

<body>
    <!-- Your page content -->

    <!-- Add testimonials widget script -->
    <script src="../js/root/testimonials-widget.js"></script>

    <script>
        // Initialize widget when page loads
        document.addEventListener('DOMContentLoaded', () => {
            TestimonialsWidget.init(
                'ad-placeholder-testimonials',  // Container ID
                'parent-profile',                // Location
                6                                 // Limit
            );
        });
    </script>
</body>
```

**Step 2: Add container in HTML**
```html
<!-- Inside ad-placeholder or any section -->
<div id="ad-placeholder-testimonials"></div>
```

**Step 3: The widget auto-renders**
- Fetches featured reviews from API
- Displays carousel with navigation
- Auto-rotates every 5 seconds
- Shows reviewer info and ratings

### Example: Parent Profile Integration

```html
<!-- profile-pages/parent-profile.html -->
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="../css/root/testimonials-widget.css">
</head>
<body>
    <!-- Existing content -->

    <!-- Right sidebar ad-placeholder -->
    <aside class="right-widgets">
        <div class="ad-placeholder">
            <div id="parent-testimonials"></div>
        </div>
    </aside>

    <script src="../js/root/testimonials-widget.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            TestimonialsWidget.init('parent-testimonials', 'parent-profile', 6);
        });
    </script>
</body>
</html>
```

## Widget Display Locations

Configure where reviews appear by setting `display_location`:

| Location Value | Display Page(s) |
|----------------|----------------|
| `all` | All pages (fallback) |
| `parent-profile` | Parent profile pages |
| `student-profile` | Student profile pages |
| `tutor-profile` | Tutor profile pages |
| `home` | Home/Index page |
| `find-tutors` | Find tutors page |

**Note:** Reviews with `location='all'` appear everywhere. Page-specific reviews override 'all' reviews.

## Admin Workflow Example

### Scenario: Feature reviews for parent profile

1. **Navigate:** System Settings → Manage Reviews
2. **Filter:** Click "Parent Reviews" stat card (shows only parent reviews)
3. **Select High Ratings:** Click "5 Stars" button
4. **Choose Best Reviews:** Check 3-4 excellent reviews
5. **Configure:** Select "Parent Profile" from location dropdown
6. **Feature:** Click "Feature Reviews" button
7. **Confirm:** Success message appears
8. **Verify:** Navigate to parent-profile.html to see testimonials

### Managing Featured Reviews

**To Change Featured Reviews:**
1. Feature new reviews (old ones remain if still selected)
2. Reviews automatically reorder based on selection order

**To Remove Featured Reviews:**
- Currently: Delete the review entirely (removes from featured)
- Future: Add "Unfeature" button in manage panel

## File Structure

```
astegni-backend/
├── migrate_featured_reviews.py              # Create featured_reviews table
├── astegni_reviews_endpoints.py             # All review & featuring endpoints
└── app.py                                   # Routes included

js/
├── admin-pages/
│   └── manage-reviews.js                    # Enhanced with selection
└── root/
    └── testimonials-widget.js               # Public testimonial widget

css/
├── admin-pages/
│   └── manage-reviews.css                   # Selection toolbar styles
└── root/
    └── testimonials-widget.css              # Widget display styles
```

## Features Implemented

### Admin Panel (manage-reviews)
✅ Checkbox selection on review cards
✅ Bulk selection state management
✅ Dynamic selection toolbar with count
✅ Location dropdown targeting
✅ Feature reviews API integration
✅ Visual feedback (selected cards highlighted)
✅ Clear selection button

### Testimonials Widget
✅ Auto-rotating carousel (5s interval)
✅ Manual navigation (prev/next)
✅ Dot indicators
✅ Star rating display
✅ Reviewer avatar & info
✅ Role icons
✅ Responsive design
✅ Empty & error states
✅ Smooth animations

### Backend
✅ `featured_reviews` table with indexes
✅ POST endpoint to feature reviews
✅ DELETE endpoint to unfeature
✅ GET public endpoint for display
✅ Location-based filtering
✅ Display order management
✅ Cascading deletes

## Testing

### Backend API Tests

```bash
# Wait for server to start
ping -n 3 127.0.0.1 >nul

# Feature some reviews
curl -X POST http://localhost:8000/api/admin/reviews/feature \
  -H "Content-Type: application/json" \
  -d '{
    "review_ids": [4, 5, 6],
    "display_location": "parent-profile"
  }'

# Get featured reviews
curl "http://localhost:8000/api/featured-reviews?location=parent-profile&limit=6"

# Get all featured (any location)
curl "http://localhost:8000/api/featured-reviews?location=all"

# Unfeature a review
curl -X DELETE "http://localhost:8000/api/admin/reviews/feature/4?location=parent-profile"
```

### Frontend Testing

1. **Admin Selection:**
   - Open: http://localhost:8080/admin-pages/manage-system-settings.html
   - Click: "Manage Reviews" in sidebar
   - Check: Multiple review checkboxes
   - Verify: Toolbar appears with count
   - Select: Location from dropdown
   - Click: "Feature Reviews"
   - Confirm: Success message

2. **Widget Display:**
   - Add widget code to parent-profile.html
   - Open: http://localhost:8080/profile-pages/parent-profile.html
   - Verify: Testimonials appear in carousel
   - Test: Previous/Next navigation
   - Test: Dot indicators
   - Wait: Auto-rotation after 5 seconds

## Next Steps / Enhancements

1. **Admin Improvements:**
   - View list of currently featured reviews
   - Drag-and-drop to reorder featured reviews
   - Quick "Unfeature" button next to each review
   - Preview widget before featuring

2. **Widget Enhancements:**
   - Pause auto-rotate on hover
   - Swipe gestures for mobile
   - Lazy loading for performance
   - Transition animations (fade/slide)

3. **Analytics:**
   - Track testimonial impressions
   - Click-through rates
   - Most effective reviews
   - A/B testing different combinations

4. **Content Management:**
   - Schedule featuring (start/end dates)
   - Automatic rotation of featured reviews
   - Seasonal/campaign-specific testimonials

## Success Criteria

✅ Admins can select reviews with checkboxes
✅ Selection toolbar shows count and actions
✅ Reviews can be targeted to specific pages
✅ Featured reviews save to database
✅ Public endpoint returns featured reviews
✅ Testimonials widget displays reviews
✅ Auto-rotation works smoothly
✅ Navigation controls functional
✅ Responsive on all devices
✅ API endpoints tested and working
✅ Complete documentation provided

## Summary

You can now:
1. **Select reviews** in the admin panel using checkboxes
2. **Feature them** for specific pages (parent-profile, student-profile, etc.)
3. **Display them** automatically as beautiful rotating testimonials in ad-placeholder sections
4. **Manage them** with full CRUD operations via API

The system is ready to showcase your best user reviews across the Astegni platform! 🌟
