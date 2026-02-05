# Review Astegni Modal - Data Fetch Flow

## ✅ YES - Modal Fetches Data from Database on Open

When the modal opens, it automatically checks if the user has already submitted a review and pre-fills the form with their existing data.

## Complete Flow When Modal Opens

```
USER CLICKS "Review Astegni" Card
       |
       v
┌─────────────────────────────────────────────────────────────┐
│  openReviewAstegniModal() - Line 23                         │
│  Location: js/common-modals/review-astegni-manager.js       │
│                                                              │
│  Step 1: Reset form to blank state                          │
│    resetReviewForm()                                        │
│                                                              │
│  Step 2: Fetch user's existing review from database         │
│    checkExistingReview() ← FETCHES FROM DB                  │
│                                                              │
│  Step 3: Show modal                                         │
│    modal.style.display = 'flex'                             │
└─────────────────────────────────────────────────────────────┘
       |
       v
┌─────────────────────────────────────────────────────────────┐
│  checkExistingReview() - Line 184                           │
│  Async function that fetches data from database             │
│                                                              │
│  1. Get JWT token from localStorage                         │
│     const token = localStorage.getItem('access_token')      │
│                                                              │
│  2. Call API endpoint to get user's review                  │
│     GET /api/platform-reviews/my-review                     │
│     Authorization: Bearer {token}                           │
│                                                              │
│  3. If review exists, pre-fill form:                        │
│     ✓ Show "You've already submitted a review" banner      │
│     ✓ Fill ease_of_use rating (1-5 stars)                  │
│     ✓ Fill features_quality rating (1-5 stars)             │
│     ✓ Fill support_quality rating (1-5 stars)              │
│     ✓ Fill pricing rating (1-5 stars)                      │
│     ✓ Fill review_text (textarea)                          │
│     ✓ Fill would_recommend (Yes/No buttons)                │
└─────────────────────────────────────────────────────────────┘
       |
       v
┌─────────────────────────────────────────────────────────────┐
│  BACKEND API: GET /api/platform-reviews/my-review           │
│  Location: astegni-backend/platform_reviews_endpoints.py    │
│                                                              │
│  Query executed:                                            │
│  SELECT id, reviewer_id, rating,                            │
│         ease_of_use, features_quality, support_quality,     │
│         pricing, review_text, would_recommend,              │
│         is_featured, created_at, updated_at                 │
│  FROM astegni_reviews                                       │
│  WHERE reviewer_id = {current_user.id}                      │
│                                                              │
│  Returns JSON:                                              │
│  {                                                          │
│    "id": 1,                                                 │
│    "reviewer_id": 141,                                      │
│    "rating": 4.75,                                          │
│    "ease_of_use": 5,                                        │
│    "features_quality": 4,                                   │
│    "support_quality": 5,                                    │
│    "pricing": 5,                                            │
│    "review_text": "Great platform!",                        │
│    "would_recommend": true,                                 │
│    "is_featured": false,                                    │
│    "created_at": "2025-01-27T10:30:00",                     │
│    "updated_at": "2025-01-27T10:30:00"                      │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
       |
       v
┌─────────────────────────────────────────────────────────────┐
│  DATABASE: astegni_admin_db.astegni_reviews                 │
│                                                              │
│  Table Query:                                               │
│  WHERE reviewer_id = 141                                    │
│                                                              │
│  Returns single row if exists:                              │
│  id=1, reviewer_id=141, rating=4.75,                        │
│  ease_of_use=5, features_quality=4,                         │
│  support_quality=5, pricing=5,                              │
│  review_text="Great platform!",                             │
│  would_recommend=true                                       │
└─────────────────────────────────────────────────────────────┘
       |
       v
┌─────────────────────────────────────────────────────────────┐
│  MODAL DISPLAY                                              │
│                                                              │
│  IF EXISTING REVIEW FOUND:                                  │
│  ┌────────────────────────────────────────────────┐        │
│  │ ℹ️  You've already submitted a review.        │        │
│  │    You can update it below.                    │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
│  Ease of Use:        ★★★★★ (5 stars filled)                │
│  Features & Tools:   ★★★★☆ (4 stars filled)                │
│  Customer Support:   ★★★★★ (5 stars filled)                │
│  Pricing:            ★★★★★ (5 stars filled)                │
│                                                              │
│  Tell us more:                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │ Great platform!                                │        │
│  │                                                │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
│  Would you recommend Astegni?                               │
│  [ Yes ✓ ] [ No ]                                          │
│                                                              │
│  [Submit Review] ← Button enabled                          │
│                                                              │
│  IF NO EXISTING REVIEW:                                     │
│  - Banner hidden                                            │
│  - All fields blank                                         │
│  - Submit button disabled until ratings provided            │
└─────────────────────────────────────────────────────────────┘
```

## Code Breakdown

### 1. Modal Opens (Line 23-41)
```javascript
window.openReviewAstegniModal = function() {
    console.log('🔵 Opening Review Astegni Modal...');

    // Reset form to blank
    resetReviewForm();

    // Fetch existing review from database (if exists)
    checkExistingReview();  // ← THIS FETCHES FROM DB

    // Show modal
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
};
```

### 2. Fetch Existing Review (Line 184-229)
```javascript
async function checkExistingReview() {
    try {
        // Get auth token
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        if (!token) return;

        // API CALL TO DATABASE
        const response = await fetch(`${API_BASE_URL}/api/platform-reviews/my-review`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const existingReview = await response.json();
            if (existingReview && existingReview.id) {
                // Show banner
                document.getElementById('existing-review-banner')?.classList.remove('hidden');

                // Pre-fill all form fields with database data
                if (existingReview.ease_of_use) {
                    setCategoryRating('ease', existingReview.ease_of_use);
                }
                if (existingReview.features_quality) {
                    setCategoryRating('features', existingReview.features_quality);
                }
                if (existingReview.support_quality) {
                    setCategoryRating('support', existingReview.support_quality);
                }
                if (existingReview.pricing) {
                    setCategoryRating('value', existingReview.pricing);
                }
                if (existingReview.would_recommend !== null) {
                    setRecommendation(existingReview.would_recommend);
                }
                if (existingReview.review_text) {
                    const textarea = document.getElementById('review-text');
                    if (textarea) {
                        textarea.value = existingReview.review_text;
                        updateCharCount();
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error checking existing review:', error);
    }
}
```

### 3. Backend API (Line 170-212 in platform_reviews_endpoints.py)
```python
@router.get("/api/platform-reviews/my-review")
async def get_my_platform_review(
    current_user = Depends(get_current_user)
):
    """
    Get current user's review for Astegni (if exists)
    """
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cur:
                # QUERY DATABASE FOR USER'S REVIEW
                cur.execute("""
                    SELECT id, reviewer_id, rating,
                           ease_of_use, features_quality, support_quality, pricing,
                           review_text, would_recommend, is_featured, created_at, updated_at
                    FROM astegni_reviews
                    WHERE reviewer_id = %s
                """, (current_user.id,))

                review = cur.fetchone()

                if not review:
                    return None  # No review found

                # Return review data
                return {
                    "id": review['id'],
                    "reviewer_id": review['reviewer_id'],
                    "rating": round(float(review['rating']), 2),
                    "ease_of_use": review['ease_of_use'],
                    "features_quality": review['features_quality'],
                    "support_quality": review['support_quality'],
                    "pricing": review['pricing'],
                    "review_text": review['review_text'],
                    "would_recommend": review['would_recommend'],
                    "is_featured": review['is_featured'],
                    "created_at": review['created_at'].isoformat(),
                    "updated_at": review['updated_at'].isoformat()
                }
    except Exception as e:
        print(f"Error fetching user review: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
```

## What Happens in Different Scenarios

### Scenario 1: User Has Never Submitted a Review
```
1. Modal opens
2. checkExistingReview() runs
3. API returns null/empty
4. Form remains blank
5. Banner stays hidden
6. Submit button disabled (no ratings yet)
```

### Scenario 2: User Has Already Submitted a Review
```
1. Modal opens
2. checkExistingReview() runs
3. API fetches review from database:
   - ease_of_use: 5
   - features_quality: 4
   - support_quality: 5
   - pricing: 5
   - review_text: "Great platform!"
   - would_recommend: true
4. Form auto-fills with existing data
5. Banner appears: "You've already submitted a review"
6. Submit button enabled (all ratings present)
7. User can edit and re-submit to update
```

### Scenario 3: User Not Logged In
```
1. Modal opens
2. checkExistingReview() runs
3. No token found in localStorage
4. Function returns early (no API call)
5. Form remains blank
6. User can still fill out form
7. Submit will prompt to log in
```

## Database Query Details

**Table:** `astegni_admin_db.astegni_reviews`
**Query:** `SELECT * FROM astegni_reviews WHERE reviewer_id = {user_id}`
**Returns:** Single row or NULL

**Important:**
- ✅ Uses `reviewer_id` (user-based, not role-based)
- ✅ Returns `pricing` field (not `overall_value`)
- ✅ Does NOT return `reviewer_role` (column removed)

## Summary

**Q: Does modal fetch data from DB when it opens?**
**A: ✅ YES**

**How it works:**
1. User clicks "Review Astegni" card
2. `openReviewAstegniModal()` is called
3. `checkExistingReview()` immediately fetches from database via API
4. If review exists, form is pre-filled with existing data
5. User sees their previous ratings/text
6. User can edit and re-submit to update

**API Endpoint:** `GET /api/platform-reviews/my-review`
**Database Query:** `WHERE reviewer_id = {current_user.id}`
**Fields Fetched:** ease_of_use, features_quality, support_quality, **pricing**, review_text, would_recommend

---

**Last Updated:** 2026-01-27
**Status:** Verified and working correctly
