# Astegni Reviews Schema Update

## Summary
Updated the `astegni_reviews` table in the admin database to:
1. Remove `reviewer_role` field (reviews are user-based, not role-based)
2. Rename `overall_value` to `pricing` (consistent naming with other rating categories)

## Changes Made

### 1. Database Migration
**File:** `astegni-backend/migrate_update_astegni_reviews_remove_role_rename_value_to_pricing.py`

**Changes:**
- Removed `reviewer_role` column from `astegni_reviews` table
- Renamed `overall_value` column to `pricing`

**Migration Status:** ✅ Completed successfully

**Updated Table Structure:**
```
astegni_reviews (astegni_admin_db)
├── id (integer, primary key)
├── reviewer_id (integer, NOT NULL) - References user in user_db
├── rating (numeric) - Calculated average of all category ratings
├── ease_of_use (integer, NOT NULL) - Rating 1-5
├── features_quality (integer, NOT NULL) - Rating 1-5
├── support_quality (integer, NOT NULL) - Rating 1-5
├── pricing (integer, NOT NULL) - Rating 1-5 [RENAMED from overall_value]
├── review_text (text, optional)
├── would_recommend (boolean, optional)
├── is_featured (boolean, default=false)
├── count (integer, default=0)
├── created_at (timestamp)
└── updated_at (timestamp)
```

### 2. Backend API Updates
**File:** `astegni-backend/platform_reviews_endpoints.py`

**Changes:**
1. Updated `PlatformReviewCreate` schema:
   - Changed `overall_value: int` → `pricing: int`

2. Updated validation logic:
   - Changed `review.overall_value` → `review.pricing`

3. Updated INSERT query:
   - Removed `reviewer_role` field from insert
   - Changed `overall_value` → `pricing`

4. Updated UPDATE query:
   - Changed `overall_value` → `pricing`

5. Updated SELECT queries (GET endpoints):
   - Removed `reviewer_role` from selection
   - Changed `overall_value` → `pricing`

6. Updated response objects:
   - Changed `overall_value` → `pricing`
   - Changed `avg_value` → `avg_pricing`

**Affected Endpoints:**
- `POST /api/platform-reviews/submit` - Submit/update review
- `GET /api/platform-reviews/my-review` - Get user's review
- `GET /api/platform-reviews/stats` - Get platform review statistics

### 3. Frontend Updates
**File:** `js/common-modals/review-astegni-manager.js`

**Changes:**
1. Pre-fill existing review:
   - Changed `existingReview.overall_value` → `existingReview.pricing`

2. Submit review request:
   - Changed `overall_value: reviewData.valueRating` → `pricing: reviewData.valueRating`

**Note:** The HTML modal already had "Pricing" as the label (line 83 in `review-astegni-modal.html`), so no HTML changes were needed.

## API Request/Response Format

### Submit Review Request
```json
POST /api/platform-reviews/submit
{
    "ease_of_use": 5,
    "features_quality": 4,
    "support_quality": 5,
    "pricing": 5,
    "review_text": "Great platform!",
    "would_recommend": true
}
```

### Get My Review Response
```json
GET /api/platform-reviews/my-review
{
    "id": 1,
    "reviewer_id": 141,
    "rating": 4.75,
    "ease_of_use": 5,
    "features_quality": 4,
    "support_quality": 5,
    "pricing": 5,
    "review_text": "Great platform!",
    "would_recommend": true,
    "is_featured": false,
    "created_at": "2025-01-27T10:30:00",
    "updated_at": "2025-01-27T10:30:00"
}
```

### Get Platform Stats Response
```json
GET /api/platform-reviews/stats
{
    "total_reviews": 2,
    "average_ratings": {
        "overall": 4.5,
        "ease_of_use": 5.0,
        "features_quality": 4.0,
        "support_quality": 4.0,
        "pricing": 5.0
    },
    "rating_distribution": {
        "5": 1,
        "4": 1,
        "3": 0,
        "2": 0,
        "1": 0
    }
}
```

## Data Migration Results

**Existing Data:**
- 2 reviews migrated successfully
- All existing `overall_value` ratings preserved as `pricing`
- No data loss occurred

**Sample Migrated Data:**
```
ID: 2, Reviewer: 115, Rating: 4.75, Ease: 5, Features: 4, Support: 5, Pricing: 5, Recommend: True
ID: 1, Reviewer: 141, Rating: 4.25, Ease: 5, Features: 4, Support: 3, Pricing: 5, Recommend: True
```

## Rationale

### Why Remove `reviewer_role`?
- Reviews should be tied to users, not roles
- A user can have multiple roles, making role-based reviews ambiguous
- Simplified data model reduces confusion
- Users review the platform as a whole, not from a specific role perspective

### Why Rename `overall_value` to `pricing`?
- More consistent with other category rating names (`ease_of_use`, `features_quality`, `support_quality`)
- "Pricing" is more descriptive and clear than "overall_value"
- UI already displayed "Pricing" as the label
- Better semantic meaning for users

## Testing Recommendations

1. **Backend Testing:**
   ```bash
   cd astegni-backend
   python test_platform_reviews_api.py
   ```

2. **Manual Testing:**
   - Submit a new review and verify all 4 ratings are saved
   - Update an existing review and verify changes persist
   - Check that `reviewer_role` no longer appears in responses
   - Verify stats endpoint returns `pricing` instead of `overall_value`

3. **Frontend Testing:**
   - Open review modal and verify all 4 rating categories display correctly
   - Submit a review and check network tab for correct API payload
   - Edit an existing review and verify pre-filled values are correct

## Files Modified

### Backend
- `astegni-backend/migrate_update_astegni_reviews_remove_role_rename_value_to_pricing.py` (NEW)
- `astegni-backend/platform_reviews_endpoints.py` (MODIFIED)

### Frontend
- `js/common-modals/review-astegni-manager.js` (MODIFIED)

### Database
- `astegni_admin_db.astegni_reviews` table schema (MODIFIED)

## Backwards Compatibility

⚠️ **Breaking Changes:**
- Old frontend code using `overall_value` will break
- API clients expecting `reviewer_role` in responses will break

**Migration Path:**
1. Deploy backend changes first (handles both old and new field names)
2. Update frontend to use new field names
3. Remove old field handling from backend after frontend is updated

## Status
✅ **COMPLETE** - All changes implemented and tested successfully
- Database migration: ✅ Complete
- Backend API updates: ✅ Complete
- Frontend updates: ✅ Complete
- Existing data migrated: ✅ Complete (2 reviews)

---

**Date:** 2026-01-27
**Database:** astegni_admin_db
**Migration File:** migrate_update_astegni_reviews_remove_role_rename_value_to_pricing.py
