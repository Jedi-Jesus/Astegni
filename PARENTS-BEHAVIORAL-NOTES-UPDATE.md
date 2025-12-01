# Parents & Behavioral Notes Panel Update - Implementation Guide

## Task Overview

Update view-student.html to:
1. ✅ **Remove sections from parents panel** (completed)
2. ⏳ **Move overall rating section** to behavioral notes panel (in progress)
3. ⏳ **Update rating breakdown** to show behavioral categories instead of star ratings
4. ⏳ **Database changes** - rename `overall_rating` to `rating` in student_reviews table
5. ⏳ **Backend changes** - calculate rating as average of 4 behavioral categories
6. ⏳ **Frontend changes** - fetch and display reviews from student_reviews table

---

## ✅ COMPLETED: Task A - Parents Panel Cleanup

### What Was Removed:
1. **Overall Rating Section** (`.overall-rating-section`) - Lines 2294-2383
2. **Parent Stats Section** (`.parent-stats-section`) - Lines 2386-2434
3. **Parent Reviews Section** (`.parent-reviews-section`) - Lines 2437-2590

### Result:
- Parents panel now only shows the two parent cards (father and mother)
- Clean, simple design matching page theme
- All removed sections will be moved/reimplemented in behavioral notes panel

---

## ⏳ TODO: Task B - Behavioral Notes Panel Updates

### Current Behavioral Notes Structure:
Located at line 2361 (`#behavioral-notes-panel`)

**Current sections:**
1. Overall Behavior Summary (lines 2599-2617)
2. Behavior Categories (lines 2619-2774)
3. Recent Behavioral Notes (lines 2776+)

### Required Changes:

#### 1. Replace "Overall Behavior Summary" with "Overall Rating Section"

**Remove:**
```html
<!-- Overall Behavior Summary -->
<div style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.1)...">
    <h3>Overall Behavior Rating</h3>
    <div>4.5 / 5.0</div>
    <p>Sarah demonstrates excellent behavior...</p>
</div>
```

**Replace with:** Overall Rating Section from parents panel (modified for behavioral categories)

#### 2. Update Rating Breakdown

**Change from star-based (5 stars, 4 stars, etc.) to behavioral categories:**

**OLD (Star-based):**
- 5 stars: 82% (37 reviews)
- 4 stars: 13% (6 reviews)
- 3 stars: 4% (2 reviews)
- 2 stars: 0% (0 reviews)
- 1 star: 0% (0 reviews)

**NEW (Behavioral categories):**
- **Subject Matter Expertise**: X.X / 5.0 (average from reviews)
- **Communication Skills**: X.X / 5.0 (average from reviews)
- **Discipline**: X.X / 5.0 (average from reviews)
- **Punctuality**: X.X / 5.0 (average from reviews)

Each bar shows the average rating for that category across all reviews.

#### 3. Remove Existing "Behavior Categories" Section

The current hardcoded behavior categories (Attendance, Class Participation, etc.) should be **removed entirely** and replaced by the rating breakdown above.

---

## ⏳ TODO: Task C - Database Migration

### Table: `student_reviews`

**Current schema (assumed):**
```sql
CREATE TABLE student_reviews (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    tutor_id INTEGER REFERENCES users(id),
    overall_rating DECIMAL(2,1),  -- ❌ RENAME THIS
    subject_matter_expertise DECIMAL(2,1),
    communication_skills DECIMAL(2,1),
    discipline DECIMAL(2,1),
    punctuality DECIMAL(2,1),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Required change:**
```sql
ALTER TABLE student_reviews RENAME COLUMN overall_rating TO rating;
```

### Migration Script:

```python
# astegni-backend/migrate_rename_overall_rating.py
import psycopg
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

conn = psycopg.connect(DATABASE_URL)
cur = conn.cursor()

try:
    print("Renaming overall_rating to rating in student_reviews table...")
    cur.execute("""
        ALTER TABLE student_reviews
        RENAME COLUMN overall_rating TO rating;
    """)

    conn.commit()
    print("✅ Column renamed successfully!")

except Exception as e:
    print(f"❌ Error: {e}")
    conn.rollback()
finally:
    cur.close()
    conn.close()
```

---

## ⏳ TODO: Task D - Backend Updates

### File: `astegni-backend/app.py modules/routes.py` or new file `student_reviews_endpoints.py`

**New endpoint:**
```python
@router.get("/api/student/{student_id}/reviews")
async def get_student_reviews(student_id: int, current_user: dict = Depends(get_current_user)):
    """
    Get all reviews for a specific student with calculated rating
    Rating = average of (subject_matter_expertise + communication_skills + discipline + punctuality) / 4
    """
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        query = """
            SELECT
                sr.id,
                sr.student_id,
                sr.tutor_id,
                u.first_name || ' ' || u.last_name as tutor_name,
                u.profile_picture as tutor_picture,
                sr.subject_matter_expertise,
                sr.communication_skills,
                sr.discipline,
                sr.punctuality,
                sr.comment,
                sr.created_at,
                -- Calculate rating as average of 4 categories
                ROUND((sr.subject_matter_expertise + sr.communication_skills +
                       sr.discipline + sr.punctuality) / 4.0, 1) as rating
            FROM student_reviews sr
            JOIN users u ON sr.tutor_id = u.id
            WHERE sr.student_id = %s
            ORDER BY sr.created_at DESC
        """

        cur.execute(query, (student_id,))
        rows = cur.fetchall()

        reviews = []
        total_rating = 0
        category_sums = {
            'subject_matter_expertise': 0,
            'communication_skills': 0,
            'discipline': 0,
            'punctuality': 0
        }

        for row in rows:
            review = {
                "id": row[0],
                "student_id": row[1],
                "tutor_id": row[2],
                "tutor_name": row[3],
                "tutor_picture": row[4],
                "subject_matter_expertise": float(row[5]),
                "communication_skills": float(row[6]),
                "discipline": float(row[7]),
                "punctuality": float(row[8]),
                "comment": row[9],
                "created_at": row[10].isoformat() if row[10] else None,
                "rating": float(row[11])
            }
            reviews.append(review)

            total_rating += review["rating"]
            category_sums['subject_matter_expertise'] += review['subject_matter_expertise']
            category_sums['communication_skills'] += review['communication_skills']
            category_sums['discipline'] += review['discipline']
            category_sums['punctuality'] += review['punctuality']

        review_count = len(reviews)

        # Calculate averages
        overall_rating = round(total_rating / review_count, 1) if review_count > 0 else 0
        category_averages = {
            key: round(value / review_count, 1) if review_count > 0 else 0
            for key, value in category_sums.items()
        }

        return {
            "success": True,
            "reviews": reviews,
            "total": review_count,
            "overall_rating": overall_rating,
            "category_averages": category_averages
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    finally:
        cur.close()
        conn.close()
```

---

## ⏳ TODO: Task E - Frontend Updates

### File: `js/view-student/view-student-reviews.js` (create new file)

```javascript
const API_BASE_URL = 'http://localhost:8000';

/**
 * Load and display student reviews in behavioral notes panel
 */
async function loadStudentReviews(studentId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found');
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/student/${studentId}/reviews`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch reviews');
        }

        const data = await response.json();

        // Update overall rating section
        updateOverallRating(data.overall_rating, data.total);

        // Update rating breakdown with behavioral categories
        updateRatingBreakdown(data.category_averages);

        // Display reviews
        displayReviews(data.reviews);

    } catch (error) {
        console.error('Error loading student reviews:', error);
    }
}

/**
 * Update overall rating display
 */
function updateOverallRating(rating, reviewCount) {
    document.getElementById('overall-rating-value').textContent = rating.toFixed(1);
    document.getElementById('overall-rating-count').textContent =
        `Based on ${reviewCount} tutor review${reviewCount !== 1 ? 's' : ''}`;

    // Generate stars
    const stars = generateStars(rating);
    document.getElementById('overall-rating-stars').innerHTML = stars;
}

/**
 * Update rating breakdown with behavioral categories
 */
function updateRatingBreakdown(categoryAverages) {
    const categories = [
        { key: 'subject_matter_expertise', label: 'Subject Matter Expertise' },
        { key: 'communication_skills', label: 'Communication Skills' },
        { key: 'discipline', label: 'Discipline' },
        { key: 'punctuality', label: 'Punctuality' }
    ];

    const breakdownHTML = categories.map(category => {
        const value = categoryAverages[category.key];
        const percentage = (value / 5.0) * 100;

        return `
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span style="font-size: 0.875rem; width: 180px;">${category.label}</span>
                <div style="flex: 1; height: 8px; background: rgba(255,255,255,0.2); border-radius: 4px; overflow: hidden;">
                    <div style="height: 100%; width: ${percentage}%; background: white; border-radius: 4px;"></div>
                </div>
                <span style="font-size: 0.875rem; width: 40px; text-align: right;">${value.toFixed(1)}</span>
            </div>
        `;
    }).join('');

    document.getElementById('rating-breakdown').innerHTML = breakdownHTML;
}

/**
 * Generate star rating HTML
 */
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return '★'.repeat(fullStars) +
           (hasHalfStar ? '☆' : '') +
           '☆'.repeat(emptyStars);
}

/**
 * Display review cards
 */
function displayReviews(reviews) {
    const container = document.getElementById('reviews-container');

    if (reviews.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                <i class="fas fa-star" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                <p>No reviews yet</p>
            </div>
        `;
        return;
    }

    const reviewsHTML = reviews.map(review => `
        <div class="review-card" style="background: var(--card-bg); border-radius: 16px; padding: 2rem; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1.25rem;">
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <img src="${review.tutor_picture || '../uploads/system_images/system_profile_pictures/default-avatar.png'}"
                         alt="${review.tutor_name}"
                         style="width: 56px; height: 56px; border-radius: 50%; object-fit: cover;">
                    <div>
                        <h4 style="font-size: 1.125rem; font-weight: 600; margin: 0 0 0.25rem 0; color: var(--heading);">
                            ${review.tutor_name}
                        </h4>
                        <p style="font-size: 0.875rem; color: var(--text-muted); margin: 0 0 0.25rem 0;">
                            Tutor
                        </p>
                        <div style="color: #f59e0b; font-size: 1rem;">${generateStars(review.rating)}</div>
                    </div>
                </div>
                <span style="font-size: 0.875rem; color: var(--text-muted);">
                    ${formatDate(review.created_at)}
                </span>
            </div>

            <!-- Category ratings -->
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1rem;">
                <div>
                    <span style="font-size: 0.75rem; color: var(--text-secondary);">Subject Matter</span>
                    <div style="font-weight: 600;">${review.subject_matter_expertise.toFixed(1)} / 5.0</div>
                </div>
                <div>
                    <span style="font-size: 0.75rem; color: var(--text-secondary);">Communication</span>
                    <div style="font-weight: 600;">${review.communication_skills.toFixed(1)} / 5.0</div>
                </div>
                <div>
                    <span style="font-size: 0.75rem; color: var(--text-secondary);">Discipline</span>
                    <div style="font-weight: 600;">${review.discipline.toFixed(1)} / 5.0</div>
                </div>
                <div>
                    <span style="font-size: 0.75rem; color: var(--text-secondary);">Punctuality</span>
                    <div style="font-weight: 600;">${review.punctuality.toFixed(1)} / 5.0</div>
                </div>
            </div>

            <p style="color: var(--text); line-height: 1.7; margin: 0; font-size: 1rem;">
                "${review.comment}"
            </p>
        </div>
    `).join('');

    container.innerHTML = reviewsHTML;
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
}

// Make function available globally
window.loadStudentReviews = loadStudentReviews;
```

### Add script tag to view-student.html:
```html
<script src="../js/view-student/view-student-reviews.js"></script>
```

### Update view-student-loader.js to call loadStudentReviews:
```javascript
// In the init() method, after loading other data
if (typeof window.loadStudentReviews === 'function' && this.studentData.id) {
    await window.loadStudentReviews(this.studentData.id);
    console.log('✅ Initialized student reviews for student_id:', this.studentData.id);
}
```

---

## Summary of Remaining Work

1. ✅ Remove sections from parents panel - **DONE**
2. ⏳ Move/recreate overall rating section in behavioral notes panel - **HTML update needed**
3. ⏳ Update rating breakdown HTML to show 4 behavioral categories - **HTML update needed**
4. ⏳ Remove existing hardcoded "Behavior Categories" section - **HTML update needed**
5. ⏳ Create database migration script - **Python script needed**
6. ⏳ Run migration to rename column - **Execute migration**
7. ⏳ Create backend endpoint - **Python/FastAPI code needed**
8. ⏳ Create frontend JavaScript module - **JS file needed**
9. ⏳ Integrate with view-student-loader - **Update existing JS**
10. ⏳ Test end-to-end - **Manual testing**

**Estimated time:** 2-3 hours remaining
