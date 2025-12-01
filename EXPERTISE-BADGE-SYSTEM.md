# Expertise Badge System - Complete Documentation

## Overview

The Expertise Badge System automatically assigns badges to tutors based on a comprehensive **100-point scoring system** that considers multiple performance metrics.

## Badge Levels

| Badge | Score Range | Description | Example Profile |
|-------|-------------|-------------|-----------------|
| **Expert Educator** | 70-100 points | Top-tier tutors with exceptional track records | 10+ years, 4.5+ rating, many reviews, verified |
| **Intermediate Educator** | 40-69 points | Experienced tutors with solid performance | 3-9 years, 4.0+ rating, good reviews |
| **Beginner Educator** | 15-39 points | New tutors building their reputation | 0-2 years, few reviews, developing |
| **Tutor** | 0-14 points | Entry-level tutors just starting out | New account, no reviews or experience |

## Scoring System (Total: 100 Points)

### 1. Experience Points (0-30 points)
- **Formula**: `Experience (years) × 3 points`
- **Maximum**: 30 points (10 years or more)
- **Rationale**: Teaching experience is the foundation of expertise

**Examples:**
- 0 years → 0 points
- 3 years → 9 points
- 10 years → 30 points (max)

### 2. Rating Points (0-30 points)
- **Formula**: `Average Rating × 6 points`
- **Maximum**: 30 points (5.0 star rating)
- **Rationale**: Student satisfaction is a key indicator of teaching quality

**Examples:**
- 0.0 stars → 0 points
- 4.0 stars → 24 points
- 4.5 stars → 27 points
- 5.0 stars → 30 points (max)

**Note**: Rating is calculated from the `tutor_reviews` table:
```sql
AVG(tutor_reviews.rating)
```

### 3. Review Count Points (0-20 points)
- **Formula**: `Number of Reviews × 0.5 points`
- **Maximum**: 20 points (40+ reviews)
- **Rationale**: More reviews indicate consistent teaching and student engagement

**Examples:**
- 0 reviews → 0 points
- 10 reviews → 5 points
- 40 reviews → 20 points (max)

**Note**: Review count is the proxy for "students taught" since `students_taught` column doesn't exist yet.

### 4. Courses Created Points (0-15 points)
- **Formula**: `Number of Courses × 3 points`
- **Maximum**: 15 points (5+ courses)
- **Rationale**: Creating courses shows curriculum development expertise

**Examples:**
- 0 courses → 0 points
- 3 courses → 9 points
- 5 courses → 15 points (max)

### 5. Verification Bonus (+5 points)
- **Formula**: `+5 points if verified`
- **Rationale**: Verified tutors have passed identity and credential checks

**Examples:**
- Not verified → 0 points
- Verified → +5 points

---

## Real Examples from Database

### Expert Educator (80.89 points)
```
Email: abebe.alemu2@astegni.com
- Experience: 15 years → 30 pts
- Rating: 4.6/5.0 (7 reviews) → 27.4 pts
- Review Count: 7 reviews → 3.5 pts
- Courses: 31 created → 15 pts
- Verified: Yes → +5 pts
Total: 80.89 points → Expert Educator
```

### Intermediate Educator (58.36 points)
```
Email: birtukan.negash8@astegni.com
- Experience: 5 years → 15 pts
- Rating: 4.4/5.0 (4 reviews) → 26.4 pts
- Review Count: 4 reviews → 2 pts
- Courses: 6 created → 15 pts
- Verified: No → 0 pts
Total: 58.36 points → Intermediate Educator
```

### Beginner Educator (31.93 points)
```
Email: jediael.s.abebe@gmail.com
- Experience: 0 years → 0 pts
- Rating: 4.7/5.0 (8 reviews) → 27.9 pts
- Review Count: 8 reviews → 4 pts
- Courses: 0 created → 0 pts
- Verified: No → 0 pts
Total: 31.93 points → Beginner Educator
```

### Tutor (0 points)
```
Email: kushstudios16@gmail.com
- Experience: 0 years → 0 pts
- Rating: 0.0/5.0 (0 reviews) → 0 pts
- Review Count: 0 reviews → 0 pts
- Courses: 0 created → 0 pts
- Verified: No → 0 pts
Total: 0 points → Tutor
```

---

## Current Distribution (41 Tutors)

From dry-run test:
- **Expert Educator**: 12 tutors (29%)
- **Intermediate Educator**: 27 tutors (66%)
- **Beginner Educator**: 1 tutor (2%)
- **Tutor**: 1 tutor (2%)

---

## Usage Instructions

### 1. Dry Run (Preview Changes)
```bash
cd astegni-backend
python auto_assign_expertise_badges.py
```

This will:
- Show what badges would be assigned
- Display detailed scoring breakdown for each tutor
- Show before/after comparison
- **NOT modify the database**

### 2. Live Run (Apply Changes)
```bash
cd astegni-backend
python auto_assign_expertise_badges.py --live
```

This will:
- Prompt for confirmation
- Calculate scores for all tutors
- Update the `expertise_badge` field in `tutor_profiles` table
- Commit changes to database

**Warning**: Always run dry-run first to review changes before applying them!

---

## Database Schema

### Tables Used

**`tutor_profiles` (Read & Write)**
- `id` - Tutor ID
- `user_id` - User ID
- `experience` - Years of teaching experience
- `courses_created` - Number of courses created
- `is_verified` - Verification status
- `expertise_badge` - **Updated by script** (Expert, Intermediate, Beginner, Tutor)

**`tutor_reviews` (Read Only)**
- `tutor_id` - Foreign key to tutor_profiles
- `rating` - Overall rating (0-5 stars)
- Used to calculate average rating and review count

**`users` (Read Only)**
- `id` - User ID
- `email` - User email
- Used for display purposes only

---

## How Badges are Displayed

### Frontend (JavaScript)
File: `js/tutor-profile/profile-data-loader.js` (lines 295-314)

The expertise badge is read from the API response:
```javascript
const expertiseBadge = document.getElementById('expertise-badge');
const badgeText = data.expertise_badge || 'Tutor';
let badgeIcon = '🎓'; // Expert
// ... chooses icon based on badge level
expertiseBadge.textContent = `${badgeIcon} ${badgeText}`;
```

### Backend (API)
File: `astegni-backend/app.py modules/routes.py` (line 3448)

The expertise badge is returned in the API response:
```python
"expertise_badge": tutor.expertise_badge or "Tutor"
```

### CSS Styles
File: `css/tutor-profile/profile-specific-fix.css` (lines 387-396)

Each badge has a unique gradient style:
```css
.profile-badge.expert {
    background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}
```

---

## Badge Icons

The JavaScript automatically assigns icons based on badge text:

| Badge | Icon | Logic |
|-------|------|-------|
| Expert Educator | 🎓 | `includes('expert')` |
| Intermediate Educator | 📚 | `includes('intermediate')` |
| Beginner Educator | 📖 | `includes('beginner')` |
| Tutor | 🎓 | Default |

---

## Automation Strategy

### Option 1: Scheduled Cron Job (Recommended)
Run the script weekly to keep badges up-to-date:

```bash
# Add to crontab (every Sunday at 2 AM)
0 2 * * 0 cd /path/to/astegni-backend && python auto_assign_expertise_badges.py --live >> /var/log/expertise_badges.log 2>&1
```

### Option 2: Manual Updates
Run the script manually when needed:
- After importing new tutors
- After major rating updates
- Monthly maintenance

### Option 3: Trigger-Based (Future)
Create a PostgreSQL trigger to recalculate badges when:
- A new review is added
- Experience is updated
- A tutor gets verified

---

## Adjusting the Scoring System

To change thresholds, edit `auto_assign_expertise_badges.py`:

### Change Badge Thresholds
```python
def get_expertise_badge(score):
    if score >= 70:  # Expert (currently 70+)
        return "Expert Educator"
    elif score >= 40:  # Intermediate (currently 40-69)
        return "Intermediate Educator"
    elif score >= 15:  # Beginner (currently 15-39)
        return "Beginner Educator"
    else:  # Tutor (currently 0-14)
        return "Tutor"
```

### Change Point Allocation
```python
def calculate_expertise_score(tutor_data):
    # Experience (0-30 points)
    experience_points = min(experience_years * 3, 30)

    # Rating (0-30 points)
    rating_points = rating * 6

    # Review Count (0-20 points)
    review_points = min(review_count * 0.5, 20)

    # Courses Created (0-15 points)
    courses_points = min(courses_created * 3, 15)

    # Verification (+5 bonus)
    if is_verified:
        score += 5
```

---

## Future Enhancements

### 1. Add `students_taught` Column
Currently using review count as a proxy. In the future:
```sql
ALTER TABLE tutor_profiles ADD COLUMN students_taught INTEGER DEFAULT 0;
```

Then update scoring:
```python
students_points = min(students_taught * 0.2, 20)
```

### 2. Add `total_hours` Column
Track total teaching hours:
```sql
ALTER TABLE tutor_profiles ADD COLUMN total_hours INTEGER DEFAULT 0;
```

Then add to scoring:
```python
hours_points = min(total_hours * 0.015, 15)
```

### 3. Dynamic Badge Display
Show score breakdown on hover:
```javascript
tooltipContent = `
    Score: ${score}/100
    - Experience: ${exp_pts} pts
    - Rating: ${rating_pts} pts
    - Reviews: ${review_pts} pts
    - Courses: ${course_pts} pts
    - Verified: ${verified_pts} pts
`;
```

### 4. Badge History Tracking
Create a table to track badge changes over time:
```sql
CREATE TABLE tutor_badge_history (
    id SERIAL PRIMARY KEY,
    tutor_id INTEGER REFERENCES tutor_profiles(id),
    old_badge VARCHAR(50),
    new_badge VARCHAR(50),
    score FLOAT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Troubleshooting

### Issue: All tutors showing "Tutor" badge
**Solution**: Run the auto-assignment script:
```bash
python auto_assign_expertise_badges.py --live
```

### Issue: Badge not updating in UI after database change
**Solution**:
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R)
3. Check API response in Network tab

### Issue: Wrong badge displayed
**Solution**: Check console logs in browser:
```javascript
console.log(`✅ Expertise badge loaded: ${badgeText}`);
```

### Issue: Script fails with "column does not exist"
**Solution**: The script only uses these columns:
- `experience`
- `courses_created`
- `is_verified`
- `expertise_badge`

If error persists, check database schema:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'tutor_profiles';
```

---

## Files Modified

1. **`astegni-backend/auto_assign_expertise_badges.py`** - Main script
2. **`js/tutor-profile/profile-data-loader.js`** - Frontend display logic
3. **`css/tutor-profile/profile-specific-fix.css`** - Badge styles
4. **Database**: `tutor_profiles.expertise_badge` column

---

## Conclusion

The Expertise Badge System provides **transparent, data-driven** badges that:
- Reward experienced, high-performing tutors
- Help students identify quality educators
- Incentivize tutors to improve ratings and create courses
- Build trust through verification bonuses

**Next Steps:**
1. Run dry-run to preview: `python auto_assign_expertise_badges.py`
2. Review the output
3. Apply changes: `python auto_assign_expertise_badges.py --live`
4. Set up weekly cron job for automatic updates
