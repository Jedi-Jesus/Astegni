# Featured Reviews - What Does "Featured" Mean?

## Overview

**"Featured"** is a boolean flag (`is_featured`) in the `tutor_reviews` table that marks certain reviews as **highlighted/showcase reviews**. These are the **best, most impressive, or most representative reviews** that should be prominently displayed to prospective students.

## Purpose

Featured reviews serve as **social proof** and **marketing material** to:

1. **Showcase tutor quality** - Display the most compelling testimonials
2. **Build trust** - Show real success stories from satisfied students
3. **Highlight achievements** - Feature reviews that mention specific improvements
4. **First impression** - Give visitors an immediate positive impression

## Where Featured Reviews Appear

### 1. **Student Success Stories Section** (Dashboard - Main Panel)
- **Location:** Dashboard tab, below quick stats
- **Display:** Up to **4 featured reviews** in colored cards
- **Filter:** `is_featured = true`
- **Purpose:** Prominently showcase tutor's best testimonials
- **Visual:** Colored left border (blue, green, purple, orange), student name, 5-star rating, quote

```javascript
// js/view-tutor/view-tutor-db-loader.js:806
populateSuccessStoriesSection() {
    const reviews = this.data.reviews.filter(r => r.is_featured).slice(0, 4);
    // Shows ONLY featured reviews
}
```

**Screenshot Location:** Main dashboard, labeled "🌟 Student Success Stories"

### 2. **NOT** Used in Reviews Panel
- **Location:** Reviews tab
- **Display:** All reviews (featured AND non-featured)
- **Filter:** No filter - shows all reviews
- **Purpose:** Complete review history

```javascript
// js/view-tutor/view-tutor-db-loader.js:837
populateReviewsPanel() {
    const reviews = this.data.reviews.slice(0, 10);
    // Shows ALL reviews, not just featured
}
```

### 3. **NOT** Used in Success Widget (Sidebar)
- **Location:** Right sidebar
- **Display:** High-rated reviews (rating ≥ 4 stars)
- **Filter:** `rating >= 4` (NOT is_featured)
- **Purpose:** Show positive feedback in ticker format

```javascript
// js/view-tutor/view-tutor-db-loader.js:1048
populateSuccessWidget() {
    const reviews = this.data.reviews.filter(r => r.rating >= 4).slice(0, 6);
    // Uses rating filter, NOT featured filter
}
```

## Featured vs Non-Featured Reviews

### Featured Reviews (`is_featured = true`)
- **Criteria:** Manually selected by admins or automatically based on quality
- **Quality indicators:**
  - High rating (typically ≥ 4.5 stars)
  - Detailed, well-written content
  - Specific examples of improvement
  - Verified students
  - High helpful_count
- **Display:** Prominently in "Success Stories" section
- **Count:** Limited selection (currently 30 out of 190 = 15.8%)

### Non-Featured Reviews (`is_featured = false`)
- **Criteria:** All other reviews
- **Quality:** May be lower rated, shorter, or less impactful
- **Display:** Only in Reviews Panel (all reviews tab)
- **Count:** Majority of reviews

## How Reviews Get Featured

### Current Implementation (Automated)
The `mark_featured_reviews.py` script automatically features reviews based on:

```sql
-- Top 30 reviews based on these criteria:
SELECT id FROM tutor_reviews
WHERE rating >= 4.5
ORDER BY
    rating DESC,           -- Highest ratings first
    helpful_count DESC,    -- Most helpful reviews
    created_at DESC        -- Recent reviews prioritized
LIMIT 30
```

### Manual Curation (Admin Feature - Future)
In a production system, admins would typically:

1. **Review moderation dashboard** - Admin views all reviews
2. **Quality assessment** - Admin reads review content
3. **Feature selection** - Admin toggles `is_featured` flag
4. **Criteria considered:**
   - Writing quality (detailed, specific examples)
   - Impact stories (grade improvement, exam success)
   - Verified students only
   - No spam or inappropriate content
   - Diverse representation (different subjects, grade levels)

## Database Schema

```sql
CREATE TABLE tutor_reviews (
    id SERIAL PRIMARY KEY,
    tutor_id INTEGER REFERENCES tutor_profiles(id),
    student_id INTEGER REFERENCES users(id),

    -- Review content
    rating NUMERIC(2,1),           -- 1.0 to 5.0
    title VARCHAR(200),
    review_text TEXT,

    -- Detailed ratings
    retention_rating NUMERIC(2,1),
    discipline_rating NUMERIC(2,1),
    punctuality_rating NUMERIC(2,1),
    subject_matter_rating NUMERIC(2,1),
    communication_rating NUMERIC(2,1),

    -- Metadata
    is_verified BOOLEAN DEFAULT FALSE,    -- Student identity verified
    helpful_count INTEGER DEFAULT 0,       -- Number of "helpful" votes
    is_featured BOOLEAN DEFAULT FALSE,     -- ⭐ Featured flag

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## API Support

The backend API supports filtering by featured status:

```python
# Get only featured reviews
GET /api/view-tutor/{tutor_id}/reviews?featured_only=true

# Response:
{
  "reviews": [
    {
      "id": 123,
      "rating": 4.9,
      "title": "Best Tutor I've Had",
      "review_text": "Transformed my understanding of calculus...",
      "is_featured": true,    # ⭐ Featured review
      "is_verified": true,
      "helpful_count": 15
    }
  ],
  "total": 5
}
```

```python
# Get all reviews (featured + non-featured)
GET /api/view-tutor/{tutor_id}/reviews

# Response includes both:
{
  "reviews": [
    { "is_featured": true, ... },   # Featured reviews first (sorted)
    { "is_featured": false, ... },  # Then non-featured
    { "is_featured": false, ... }
  ],
  "total": 50
}
```

**Sorting:** Featured reviews always appear first:
```sql
ORDER BY is_featured DESC, created_at DESC
```

## Real-World Example

### Scenario: Math Tutor with 50 Reviews

**All Reviews (50 total):**
- 10 five-star reviews (detailed, verified)
- 15 four-star reviews (positive but brief)
- 20 three-star reviews (average)
- 5 two-star reviews (critical feedback)

**Featured Reviews (5 selected):**
- ⭐ "Raised my grade from D to A in 3 months!" (5 stars, verified)
- ⭐ "Helped me pass university entrance exam" (5 stars, verified)
- ⭐ "Patient teacher who truly cares" (5 stars, 25 helpful votes)
- ⭐ "Complex topics made simple" (4.9 stars, verified)
- ⭐ "Best investment in my education" (5 stars, verified)

**What Visitors See:**

1. **Dashboard → Success Stories Section:**
   - Shows ONLY the 5 featured reviews
   - Immediate positive impression
   - Compelling testimonials

2. **Reviews Tab → All Reviews:**
   - Shows all 50 reviews (good and bad)
   - Transparent, complete picture
   - Builds trust through honesty

3. **Sidebar → Success Widget:**
   - Shows 25 high-rated reviews (≥4 stars)
   - Includes featured + other high-rated reviews
   - Ticker animation

## Benefits of Featured System

### For Tutors
✅ Showcase best testimonials
✅ Control first impression
✅ Highlight specific strengths
✅ Build professional reputation

### For Students (Visitors)
✅ Quickly assess tutor quality
✅ See real success stories
✅ Get detailed testimonials upfront
✅ Still access complete review history for transparency

### For Platform (Astegni)
✅ Quality curation without censorship
✅ Better user experience
✅ Encourages quality teaching
✅ Provides admin control

## How to Feature/Unfeature Reviews

### Method 1: SQL Update (Current)
```sql
-- Feature a specific review
UPDATE tutor_reviews
SET is_featured = TRUE
WHERE id = 123;

-- Unfeature a review
UPDATE tutor_reviews
SET is_featured = FALSE
WHERE id = 456;
```

### Method 2: Python Script (Automated)
```bash
cd astegni-backend
python mark_featured_reviews.py
```

### Method 3: Admin Dashboard (Future Enhancement)
In the admin management interface:
1. Navigate to "Manage Reviews"
2. Click on a review
3. Toggle "Featured" checkbox
4. Save changes

## Best Practices

### ✅ DO Feature:
- High-rating reviews (≥4.5 stars)
- Detailed, well-written testimonials
- Verified student reviews
- Reviews with specific examples
- Diverse subjects/grade levels
- Recent reviews (keep it fresh)

### ❌ DON'T Feature:
- Low-rated reviews (< 4 stars)
- Generic "good teacher" comments
- Unverified or suspicious reviews
- Duplicate content
- Overly promotional language
- Outdated reviews (> 2 years old)

### 📊 Recommended Distribution:
- **Featured:** 10-20% of total reviews
- **High-rated:** 60-70% of total reviews
- **All reviews:** 100% transparent access

**Current Status:**
- Total: 190 reviews
- Featured: 30 (15.8%) ✅ Good ratio
- High-rated: 190 (100%) ✅ Excellent quality

## Summary

**"Featured"** means:
- ⭐ **Handpicked/curated** best reviews
- 🎯 **Displayed prominently** in Success Stories section
- 📊 **Limited selection** (10-20% of total)
- ✨ **Quality signal** for prospective students
- 🔍 **Transparent** - all reviews still accessible

It's similar to:
- Amazon's "Top Customer Reviews"
- Netflix's "Featured Titles"
- App Store's "Editor's Choice"

**NOT** censorship - just **smart curation** to help visitors quickly assess tutor quality while maintaining full transparency.
