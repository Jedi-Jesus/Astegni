# Manage Reviews Feature - Complete Implementation Guide

## Overview
The Manage Reviews feature allows administrators to view and manage platform reviews given by users (students, tutors, parents, and advertisers) about Astegni's services through the admin system settings page.

## Implementation Summary

### 1. Database
**Table: `astegni_reviews`**
- `id` - Primary key
- `reviewer_id` - Foreign key to users table
- `review` - Text review content
- `rating` - Integer (1-5 stars)
- `review_type` - Type of review (default: 'platform')
- `created_at` - Timestamp
- `updated_at` - Timestamp

**Indexes:**
- `idx_astegni_reviews_reviewer` - On reviewer_id
- `idx_astegni_reviews_rating` - On rating
- `idx_astegni_reviews_created` - On created_at (DESC)

**Migration Script:** `astegni-backend/migrate_astegni_reviews.py`
**Seed Data Script:** `astegni-backend/seed_astegni_reviews.py`

### 2. Backend API Endpoints

**File:** `astegni-backend/astegni_reviews_endpoints.py`

**Endpoints:**
1. `GET /api/admin/reviews/stats` - Get review statistics
   - Returns: total_reviews, average_rating, counts by star rating, counts by user role

2. `GET /api/admin/reviews` - Get reviews with filters
   - Query params: `role`, `rating`, `page`, `limit`
   - Returns: Array of reviews with reviewer info

3. `GET /api/admin/reviews/count` - Get total count with filters
   - Query params: `role`, `rating`
   - Returns: Total count

4. `DELETE /api/admin/reviews/{review_id}` - Delete a review
   - Returns: Success message

**Integration:** Added to `app.py` as router import

### 3. Frontend Components

**JavaScript Module:** `js/admin-pages/manage-reviews.js`
- ManageReviews object with methods:
  - `init()` - Initialize the module
  - `loadStats()` - Fetch and display statistics
  - `loadReviews()` - Fetch and display reviews
  - `filterByRole(role)` - Filter by user role
  - `filterByRating(rating)` - Filter by star rating
  - `deleteReview(id)` - Delete a review

**CSS Styles:** `css/admin-pages/manage-reviews.css`
- Stats cards with gradients for each role
- Rating filter buttons
- Review cards with avatars
- Responsive design

**HTML Panel:** Added to `admin-pages/manage-system-settings.html`
- Sidebar link with ⭐ icon
- Panel ID: `manage-reviews-panel`
- Three main containers:
  - `review-stats-container` - Role-based stats cards
  - `rating-filters-container` - Star rating filter buttons
  - `reviews-list-container` - Reviews list

### 4. Panel Integration

**File:** `js/admin-pages/manage-system-settings-standalone.js`
- Added 'manage-reviews' to panels array
- Added initialization logic in `showPanel()` method
- Auto-initializes ManageReviews when panel is shown

## Features

### Role Filtering
Click on any role card to filter reviews:
- **All Reviews** - Total reviews with average rating
- **Student Reviews** - Reviews from students
- **Tutor Reviews** - Reviews from tutors
- **Parent Reviews** - Reviews from parents
- **Advertiser Reviews** - Reviews from advertisers

### Star Rating Filtering
Filter reviews by rating (1-5 stars):
- Shows count for each rating level
- Can be combined with role filters
- "All Ratings" button to clear rating filter

### Review Display
Each review card shows:
- Reviewer profile picture and name
- Reviewer role (with icon)
- Star rating (1-5 stars)
- Review text
- Timestamp (relative time: "2 hours ago", etc.)
- Delete button (admin action)

### Review Management
- **Delete Review**: Click trash icon to remove inappropriate reviews
- **Confirmation**: Prompts admin before deletion
- **Auto-refresh**: Stats and lists update after deletion

## Testing

### Backend Tests
```bash
# Test statistics endpoint
curl http://localhost:8000/api/admin/reviews/stats

# Test reviews list
curl "http://localhost:8000/api/admin/reviews?limit=10"

# Test role filter
curl "http://localhost:8000/api/admin/reviews?role=student"

# Test rating filter
curl "http://localhost:8000/api/admin/reviews?rating=5"

# Test combined filters
curl "http://localhost:8000/api/admin/reviews?role=tutor&rating=4"
```

### Frontend Access
1. Start backend: `cd astegni-backend && python app.py`
2. Start frontend: `python -m http.server 8080`
3. Navigate to: http://localhost:8080/admin-pages/manage-system-settings.html
4. Click "Manage Reviews" in sidebar

## Database Setup

### Initial Setup
```bash
cd astegni-backend

# Create the reviews table
python migrate_astegni_reviews.py

# Seed sample reviews data
python seed_astegni_reviews.py
```

### Sample Data
The seed script creates:
- 70+ sample reviews
- Various ratings (weighted: 40% 5-star, 30% 4-star, 15% 3-star, 10% 2-star, 5% 1-star)
- Reviews from different user roles
- Realistic Ethiopian context content

## File Structure

```
astegni-backend/
├── migrate_astegni_reviews.py          # Database migration
├── seed_astegni_reviews.py             # Sample data seeder
├── astegni_reviews_endpoints.py        # API endpoints
└── app.py                              # Includes reviews router

admin-pages/
└── manage-system-settings.html         # Panel added here

js/admin-pages/
├── manage-reviews.js                   # Main review management module
└── manage-system-settings-standalone.js # Panel integration

css/admin-pages/
└── manage-reviews.css                  # Styling
```

## API Response Examples

### Statistics Response
```json
{
  "total_reviews": 70,
  "average_rating": 3.71,
  "five_star": 25,
  "four_star": 19,
  "three_star": 11,
  "two_star": 11,
  "one_star": 4,
  "by_role": {
    "tutor": 61,
    "student": 9
  }
}
```

### Review Response
```json
{
  "id": 1,
  "reviewer_id": 112,
  "reviewer_name": "Abebe Bekele",
  "reviewer_profile_picture": "https://...",
  "reviewer_role": "student",
  "review": "Great platform!",
  "rating": 5,
  "review_type": "platform",
  "created_at": "2025-10-10T16:21:58.956811"
}
```

## Next Steps / Enhancements

1. **Pagination**: Add pagination controls for large review lists
2. **Search**: Add search functionality for review text
3. **Date Range**: Add date range filters
4. **Export**: Add ability to export reviews to CSV/PDF
5. **Moderation**: Add approve/flag functionality
6. **Response**: Allow admins to respond to reviews
7. **Analytics**: Add trends and sentiment analysis
8. **Notifications**: Notify admins of new low-rated reviews

## Notes

- Reviews are linked to users via `reviewer_id`
- Deleting a user cascades to delete their reviews
- All timestamps are in UTC
- Profile pictures fallback to default system images
- Frontend uses relative time formatting
- API supports pagination (default: 20 per page)
- All filters can be combined

## Success Criteria

✅ Database table created with proper indexes
✅ Backend endpoints working with filters
✅ Frontend displays stats, filters, and reviews
✅ Role-based filtering functional
✅ Star rating filtering functional
✅ Delete functionality working
✅ Responsive design
✅ Integration with admin panel system
✅ Sample data seeded
✅ All API tests passing
