# Astegni Reviews - Clean Database Schema

## Overview
The `astegni_reviews` table has been recreated with a clean, streamlined structure. All old columns have been removed and replaced with the new schema that matches the frontend UI.

## Database Table: `astegni_reviews`

**Location:** `astegni_admin_db.astegni_reviews`

### Table Structure

```sql
CREATE TABLE astegni_reviews (
    -- Primary key
    id SERIAL PRIMARY KEY,

    -- Reviewer information
    reviewer_id INTEGER NOT NULL,
    reviewer_role VARCHAR(50),

    -- Calculated overall rating (average of 4 categories)
    rating DECIMAL(3, 2),

    -- 4 Required category ratings (1-5)
    ease_of_use INTEGER NOT NULL CHECK (ease_of_use >= 1 AND ease_of_use <= 5),
    features_quality INTEGER NOT NULL CHECK (features_quality >= 1 AND features_quality <= 5),
    support_quality INTEGER NOT NULL CHECK (support_quality >= 1 AND support_quality <= 5),
    overall_value INTEGER NOT NULL CHECK (overall_value >= 1 AND overall_value <= 5),

    -- Optional fields
    review_text TEXT,
    would_recommend BOOLEAN,

    -- Admin fields
    is_featured BOOLEAN DEFAULT FALSE,
    count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Ensure one review per user
    CONSTRAINT unique_reviewer UNIQUE (reviewer_id)
);
```

### Indexes

- `idx_astegni_reviews_reviewer` - on `reviewer_id`
- `idx_astegni_reviews_rating` - on `rating`
- `idx_astegni_reviews_created` - on `created_at`
- `idx_astegni_reviews_featured` - on `is_featured`

## Frontend Labels (UI)

The modal shows these user-friendly labels:

1. **Ease of Use** → `ease_of_use` (DB field)
2. **Features & Tools** → `features_quality` (DB field)
3. **Customer Support** → `support_quality` (DB field)
4. **Pricing** → `overall_value` (DB field)

## Backend API

### Endpoints

#### 1. Submit/Update Review
**POST** `/api/platform-reviews/submit`

**Request Body:**
```json
{
  "ease_of_use": 5,
  "features_quality": 4,
  "support_quality": 5,
  "overall_value": 4,
  "review_text": "Great platform! Very easy to use.",
  "would_recommend": true
}
```

**Response:**
```json
{
  "message": "Review submitted successfully",
  "review": {
    "id": 1,
    "rating": 4.5,
    "ease_of_use": 5,
    "features_quality": 4,
    "support_quality": 5,
    "overall_value": 4,
    "review_text": "Great platform! Very easy to use.",
    "would_recommend": true,
    "created_at": "2025-01-15T10:30:00",
    "updated_at": "2025-01-15T10:30:00"
  }
}
```

#### 2. Get My Review
**GET** `/api/platform-reviews/my-review`

Returns the current user's review if it exists, or `null` if they haven't submitted one.

#### 3. Get Platform Statistics
**GET** `/api/platform-reviews/stats`

**Response:**
```json
{
  "total_reviews": 150,
  "average_ratings": {
    "overall": 4.35,
    "ease_of_use": 4.5,
    "features_quality": 4.2,
    "support_quality": 4.4,
    "overall_value": 4.3
  },
  "rating_distribution": {
    "5": 80,
    "4": 50,
    "3": 15,
    "2": 3,
    "1": 2
  }
}
```

## Migration History

### Files

1. **migrate_recreate_astegni_reviews.py** - Drops old table and creates fresh structure
2. **platform_reviews_endpoints.py** - Updated to use new column names
3. **review-astegni-modal.html** - Frontend modal with correct labels
4. **review-astegni-manager.js** - JavaScript handling review submission

### Old Columns (REMOVED)

- ❌ `customer_service` → replaced by `support_quality`
- ❌ `platform_satisfaction` → replaced by `ease_of_use`
- ❌ `employee_satisfaction` → replaced by `features_quality`
- ❌ `value_rating` → replaced by `overall_value`

### New Clean Schema

- ✅ Only 14 columns total
- ✅ 4 required category ratings with CHECK constraints
- ✅ Calculated `rating` field (average of 4 categories)
- ✅ Optional text review and recommendation
- ✅ Admin fields for featured reviews
- ✅ Unique constraint per reviewer

## How Rating is Calculated

The overall `rating` is automatically calculated as the average of the 4 required categories:

```python
overall_rating = (ease_of_use + features_quality + support_quality + overall_value) / 4.0
```

**Example:**
- Ease of Use: 5 stars
- Features & Tools: 4 stars
- Customer Support: 5 stars
- Pricing: 4 stars
- **Overall Rating: 4.5 stars** (18 / 4 = 4.5)

## Validation Rules

### Backend Validation
- All 4 category ratings must be between 1-5 (enforced by CHECK constraint)
- Each user can only submit one review (enforced by UNIQUE constraint)
- Overall rating is auto-calculated (users don't input this)

### Frontend Validation
- All 4 category ratings required before submission
- Review text limited to 1000 characters
- Submit button disabled until all 4 ratings provided
- Recommendation (Yes/No) is optional

## Key Features

1. **Update Existing Reviews** - Users can update their review anytime
2. **Pre-fill Existing** - Modal auto-fills with existing review data
3. **Character Counter** - Shows remaining characters (0/1000)
4. **Star Rating UI** - Interactive 5-star rating for each category
5. **Recommendation Toggle** - Yes/No buttons with visual feedback
6. **Success Screen** - Shows thank you message with social sharing options

## Database Location

- **Database:** `astegni_admin_db`
- **Table:** `astegni_reviews`
- **Connection:** Uses `ADMIN_DATABASE_URL` from `.env`

## Migration Command

To recreate the table:

```bash
cd astegni-backend
python migrate_recreate_astegni_reviews.py
```

**Warning:** This drops all existing reviews! Only run if you want to start fresh.

## Status

✅ **Database:** Clean schema created
✅ **Backend:** Updated to use new column names
✅ **Frontend:** Modal labels match database fields
✅ **API:** All 3 endpoints working correctly
✅ **Migration:** Successfully executed

---

**Last Updated:** January 15, 2025
**Version:** 1.0 (Clean Schema)
