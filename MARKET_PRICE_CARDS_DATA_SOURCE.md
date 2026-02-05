# Market Price Score Cards - Deep Data Source Analysis

## Overview
The market price suggestion displays 9 score cards showing different factors that influence pricing. This document traces the complete data flow from database to frontend display.

---

## 🔄 Complete Data Flow Architecture

```
Database (PostgreSQL)
    ↓
Backend Query (market_pricing_endpoints.py)
    ↓
API Response (JSON)
    ↓
Frontend JavaScript (market-trend-functions.js)
    ↓
HTML Display (Score Cards)
```

---

## 📊 Card-by-Card Deep Analysis

### 1. ⭐ Your Rating Card

**Display Location:** `market-trend-functions.js` lines 885-889

```javascript
<div>
    <div>⭐ Your Rating</div>
    <div>${data.factors.tutor_rating?.toFixed(1) || 'N/A'} / 5.0</div>
    <div>Weight: 20%</div>
</div>
```

**Data Source Chain:**

1. **Database Tables:**
   - Primary: `tutor_reviews` table
   - Aggregated in: `tutor_analysis` table
   ```sql
   -- Reviews stored here (4-factor ratings)
   tutor_reviews (
       id, tutor_id, student_id,
       subject_understanding_rating,  -- 1-5
       communication_rating,          -- 1-5
       discipline_rating,            -- 1-5
       punctuality_rating,           -- 1-5
       rating,                       -- Overall average
       created_at
   )

   -- Aggregated average stored here
   tutor_analysis (
       tutor_id,
       average_rating,              -- Average of all reviews
       total_reviews,
       avg_subject_understanding_rating,
       avg_communication_rating,
       avg_discipline_rating,
       avg_punctuality_rating
   )
   ```

2. **Backend Query:** `market_pricing_endpoints.py` line 287
   ```python
   SELECT
       COALESCE(ta.average_rating, 2.0) as rating,  # Fallback to 2.0 if no reviews
       ...
   FROM tutor_profiles tp
   LEFT JOIN tutor_analysis ta ON tp.id = ta.tutor_id
   ```

3. **Response Assignment:** `market_pricing_endpoints.py` line 673
   ```python
   factors={
       "tutor_rating": tutor_rating,  # From query above
       ...
   }
   ```

4. **Calculation Logic:**
   - If tutor has reviews: `AVG(rating)` from `tutor_reviews`
   - If no reviews: Default `2.0` (set in migration: `migrate_set_default_rating_2_0.py`)

**Default Value:** `2.0` (for new tutors without reviews)

**Weight in Pricing:** 20% (highest weight)

---

### 2. ✅ Completion Rate Card

**Display Location:** `market-trend-functions.js` lines 890-894

```javascript
<div>
    <div>✅ Completion Rate</div>
    <div>${((data.factors.completion_rate || 0) * 100).toFixed(0)}%</div>
    <div>Weight: 16%</div>
</div>
```

**Data Source Chain:**

1. **Database Table:**
   - `tutor_analysis` table
   ```sql
   tutor_analysis (
       tutor_id,
       success_rate,  -- Decimal 0.0-1.0 (e.g., 0.85 = 85%)
       total_sessions_completed,
       total_sessions_started
   )
   ```

2. **Backend Query:** `market_pricing_endpoints.py` line 288
   ```python
   SELECT
       COALESCE(ta.success_rate, 0.0) as completion_rate,
       ...
   FROM tutor_profiles tp
   LEFT JOIN tutor_analysis ta ON tp.id = ta.tutor_id
   ```

3. **Response Assignment:** `market_pricing_endpoints.py` line 674
   ```python
   factors={
       "completion_rate": completion_rate,  # 0.0-1.0 decimal
       ...
   }
   ```

4. **Frontend Conversion:**
   ```javascript
   (data.factors.completion_rate || 0) * 100  // Convert 0.85 → 85
   ```

**Calculation Logic:**
```
completion_rate = total_sessions_completed / total_sessions_started
```

**Default Value:** `0.0` (0% for new tutors)

**Weight in Pricing:** 16%

---

### 3. 📍 Location Match Card

**Display Location:** `market-trend-functions.js` lines 895-899

```javascript
<div style="border: 2px solid rgba(59, 130, 246, 0.4);">  // Special blue border
    <div>📍 Location Match</div>
    <div>${data.factors.country || data.factors.location || 'Not Set'}</div>
    <div>Weight: 15% - Market Economics</div>
</div>
```

**Data Source Chain:**

1. **Database Table:**
   - `users` table (NOT tutor_profiles!)
   ```sql
   users (
       id,
       email,
       first_name,
       last_name,
       location,  -- Format: "City, Sub-city, City, Country"
                  -- Example: "Megenagna, Yeka, Addis Ababa, Ethiopia"
       created_at
   )
   ```

2. **Backend Query:** `market_pricing_endpoints.py` line 300
   ```python
   SELECT
       u.location,  -- Full location string
       ...
   FROM tutor_profiles tp
   LEFT JOIN users u ON tp.user_id = u.id
   ```

3. **Backend Processing:** `market_pricing_endpoints.py` lines 324, 331-334
   ```python
   tutor_location = tutor_location or ""  # Line 324

   # Extract country from location (Line 331-334)
   tutor_country = ""
   if tutor_location:
       parts = tutor_location.split(',')
       tutor_country = parts[-1].strip().upper()  # Get last part, uppercase
       # "Megenagna, Yeka, Addis Ababa, Ethiopia" → "ETHIOPIA"
   ```

4. **Response Assignment:** `market_pricing_endpoints.py` lines 676-677
   ```python
   factors={
       "location": tutor_location,     # Full: "Megenagna, Yeka, Addis Ababa, Ethiopia"
       "country": tutor_country,       # Extracted: "ETHIOPIA"
       ...
   }
   ```

5. **Frontend Display Priority:**
   ```javascript
   data.factors.country          // First choice: "ETHIOPIA"
   || data.factors.location      // Fallback: Full location
   || 'Not Set'                  // If empty
   ```

**Default Value:** `'Not Set'` (if user hasn't set location)

**Weight in Pricing:** 15% (market economics - critical for comparing tutors in same economic zone)

**Note:** This card has special styling (blue border instead of green) to highlight it as a newly added v2.4 feature.

---

### 4. 👥 Active Students Card

**Display Location:** `market-trend-functions.js` lines 900-904

```javascript
<div>
    <div>👥 Active Students</div>
    <div>${data.factors.student_count || 0}</div>
    <div>Weight: 13%</div>
</div>
```

**Data Source Chain:**

1. **Database Table:**
   - `tutor_analysis` table
   ```sql
   tutor_analysis (
       tutor_id,
       total_students,  -- Count of currently enrolled students
       updated_at
   )
   ```

2. **Backend Query:** `market_pricing_endpoints.py` line 289
   ```python
   SELECT
       COALESCE(ta.total_students, 0) as student_count,
       ...
   FROM tutor_profiles tp
   LEFT JOIN tutor_analysis ta ON tp.id = ta.tutor_id
   ```

3. **Response Assignment:** `market_pricing_endpoints.py` line 675
   ```python
   factors={
       "student_count": student_count,  # Integer count
       ...
   }
   ```

**Calculation Logic:**
- Counts students with active enrollments in `enrolled_students` table
- Updated when students enroll/unenroll

**Default Value:** `0` (for new tutors)

**Weight in Pricing:** 13% (current teaching load indicator)

---

### 5. 💻 Session Format Card

**Display Location:** `market-trend-functions.js` lines 905-909

```javascript
<div>
    <div>💻 Session Format</div>
    <div>${sessionFormat || 'Not Set'}</div>
    <div>Weight: 12%</div>
</div>
```

**Data Source Chain:**

1. **Source: Universal Filter (User Selection)**
   - NOT from database!
   - Selected by user via radio buttons in the UI

2. **Frontend Variable:** `market-trend-functions.js` line 801
   ```javascript
   const sessionFormat = getUniversalSessionFormat();
   ```

3. **Function Definition:** `market-trend-functions.js` lines 1382-1385
   ```javascript
   function getUniversalSessionFormat() {
       const sessionFormatRadio = document.querySelector('input[name="universalSessionFormat"]:checked');
       return sessionFormatRadio ? sessionFormatRadio.value : 'Online';
   }
   ```

4. **HTML Radio Buttons:** (In package-management-modal.html)
   ```html
   <input type="radio" name="universalSessionFormat" value="Online" checked>
   <input type="radio" name="universalSessionFormat" value="In-person">
   <input type="radio" name="universalSessionFormat" value="Hybrid">
   ```

5. **Sent to API:** `market-trend-functions.js` line 815
   ```javascript
   const requestBody = {
       session_format: sessionFormat  // "Online", "In-person", or "Hybrid"
   };
   ```

6. **Used in Backend:** For filtering market tutors, not returned in response
   - Backend uses it to filter which tutors to compare against
   - Frontend already knows the value (it sent it)

**Default Value:** `'Online'` (default radio selection)

**Weight in Pricing:** 12% (Online vs In-person pricing difference)

**Special Note:** This is the only card that displays user input, not database data.

---

### 6. 📚 Grade Level Card

**Display Location:** `market-trend-functions.js` lines 910-914

```javascript
<div style="border: 2px solid rgba(147, 51, 234, 0.4);">  // Special purple border
    <div>📚 Grade Level</div>
    <div>${data.factors.grade_levels?.join(', ') || 'Not Set'}</div>
    <div>Complexity: ${data.factors.grade_complexity ? data.factors.grade_complexity.toFixed(1) : 'N/A'}/14 (Weight: 10%)</div>
</div>
```

**Data Source Chain:**

1. **Database Table:**
   - `tutor_packages` table
   ```sql
   tutor_packages (
       id,
       tutor_id,
       name,
       grade_level,      -- ARRAY of text (PostgreSQL array)
                         -- Example: ['Grade 10', 'Grade 11', 'Grade 12']
       is_active,
       created_at
   )
   ```

2. **Backend Query:** `market_pricing_endpoints.py` lines 301-304
   ```python
   SELECT
       COALESCE(
           (SELECT grade_level FROM tutor_packages
            WHERE tutor_id = tp.id AND is_active = TRUE
            ORDER BY created_at DESC LIMIT 1),  # Get most recent package
           ARRAY[]::text[]  # Empty array if no packages
       ) as grade_levels
   FROM tutor_profiles tp
   ```

3. **Backend Processing:** `market_pricing_endpoints.py` lines 336-347
   ```python
   # Define grade level numeric mapping
   grade_level_map = {
       'Grade 1': 1, 'Grade 2': 2, ..., 'Grade 12': 12,
       'University': 13, 'Certification': 14
   }

   # Calculate complexity (average of all grades)
   tutor_grade_complexity = 7  # Default (middle complexity)
   if tutor_grade_levels:
       numeric_grades = [grade_level_map.get(g, 7) for g in tutor_grade_levels]
       tutor_grade_complexity = sum(numeric_grades) / len(numeric_grades)
       # Example: ['Grade 10', 'Grade 11', 'Grade 12'] → (10+11+12)/3 = 11.0
   ```

4. **Response Assignment:** `market_pricing_endpoints.py` lines 678-679
   ```python
   factors={
       "grade_levels": tutor_grade_levels,        # Array: ['Grade 10', 'Grade 11']
       "grade_complexity": tutor_grade_complexity, # Float: 11.0
       ...
   }
   ```

5. **Frontend Display:**
   ```javascript
   data.factors.grade_levels?.join(', ')  // "Grade 10, Grade 11, Grade 12"
   data.factors.grade_complexity.toFixed(1)  // "11.0"
   ```

**Complexity Scale:**
- 1.0 = Grade 1 (easiest)
- 7.0 = Grade 7 (middle)
- 12.0 = Grade 12 (high school)
- 13.0 = University (advanced)
- 14.0 = Certification (most complex)

**Default Value:**
- `grade_levels`: Empty array `[]` → displays "Not Set"
- `grade_complexity`: `7.0` (middle complexity)

**Weight in Pricing:** 10% (teaching complexity factor)

**Note:** Purple border highlights this as a v2.4 feature.

---

### 7. 📅 Experience Card

**Display Location:** `market-trend-functions.js` lines 915-919

```javascript
<div>
    <div>📅 Experience</div>
    <div>${data.factors.experience_years || 0} yrs
         <span>(${data.factors.experience_score || 0}/100)</span>
    </div>
    <div>Weight: 8%</div>
</div>
```

**Data Source Chain:**

1. **Database Table:**
   - `credentials` table
   ```sql
   credentials (
       id,
       user_id,
       credential_type,  -- 'education', 'certification', 'experience', etc.
       title,
       institution,
       years,           -- Duration in years (can be NULL)
       created_at
   )
   ```

2. **Backend Query:** `market_pricing_endpoints.py` lines 294-297
   ```python
   SELECT
       COALESCE(
           (SELECT SUM(COALESCE(years, 0))
            FROM credentials
            WHERE user_id = tp.user_id),  # Sum all years from credentials
           0
       ) as total_experience_years
   FROM tutor_profiles tp
   ```

3. **Backend Processing:** `market_pricing_endpoints.py` lines 355-358
   ```python
   # Convert years to score (0-100 scale)
   credentials_score = min(100, credentials_count * 5)  # 5 points per credential
   experience_score = min(100, total_experience_years * 5)  # 5 points per year
   ```

4. **Response Assignment:** `market_pricing_endpoints.py` lines 682-683
   ```python
   factors={
       "experience_score": experience_score,        # 0-100 (5 pts/year, max 100)
       "experience_years": total_experience_years,  # Actual years (e.g., 3)
       ...
   }
   ```

**Calculation Logic:**
```python
experience_years = SUM(credentials.years WHERE user_id = X)
experience_score = min(100, experience_years * 5)

Examples:
- 0 years → 0/100 score
- 3 years → 15/100 score
- 10 years → 50/100 score
- 20+ years → 100/100 score (capped)
```

**Default Value:** `0 yrs (0/100)` for new tutors

**Weight in Pricing:** 8%

---

### 8. 🎓 Credentials Card

**Display Location:** `market-trend-functions.js` lines 920-924

```javascript
<div>
    <div>🎓 Credentials</div>
    <div>${data.factors.credentials_count || 0}
         <span>(${data.factors.credentials_score || 0}/100)</span>
    </div>
    <div>Weight: 4%</div>
</div>
```

**Data Source Chain:**

1. **Database Table:**
   - `credentials` table
   ```sql
   credentials (
       id,
       user_id,
       credential_type,
       title,
       institution,
       file_url,       -- Uploaded document
       is_verified,    -- Admin verification status
       created_at
   )
   ```

2. **Backend Query:** `market_pricing_endpoints.py` lines 290-293
   ```python
   SELECT
       COALESCE(
           (SELECT COUNT(*)
            FROM credentials
            WHERE user_id = tp.user_id),  # Count all credentials
           0
       ) as credentials_count
   FROM tutor_profiles tp
   ```

3. **Backend Processing:** `market_pricing_endpoints.py` line 357
   ```python
   credentials_score = min(100, credentials_count * 5)  # 5 points per credential
   ```

4. **Response Assignment:** `market_pricing_endpoints.py` lines 680-681
   ```python
   factors={
       "credentials_score": credentials_score,    # 0-100 (5 pts each)
       "credentials_count": credentials_count,    # Count (e.g., 3)
       ...
   }
   ```

**Calculation Logic:**
```python
credentials_count = COUNT(*) FROM credentials WHERE user_id = X
credentials_score = min(100, credentials_count * 5)

Examples:
- 0 credentials → 0/100 score
- 3 credentials → 15/100 score
- 10 credentials → 50/100 score
- 20+ credentials → 100/100 score (capped)
```

**Default Value:** `0 (0/100)` for new tutors

**Weight in Pricing:** 4%

---

### 9. 🕐 Platform Tenure Card

**Display Location:** `market-trend-functions.js` lines 925-929

```javascript
<div>
    <div>🕐 Platform Tenure</div>
    <div>${data.factors.account_age_days ?
           (data.factors.account_age_days / 365).toFixed(1) + ' yrs' :
           'New'}</div>
    <div>Weight: 2%</div>
</div>
```

**Data Source Chain:**

1. **Database Table:**
   - `tutor_profiles` table
   ```sql
   tutor_profiles (
       id,
       user_id,
       created_at,  -- Timestamp when tutor profile was created
       updated_at
   )
   ```

2. **Backend Query:** `market_pricing_endpoints.py` line 298
   ```python
   SELECT
       tp.created_at,  -- Timestamp
       ...
   FROM tutor_profiles tp
   ```

3. **Backend Processing:** `market_pricing_endpoints.py` line 328
   ```python
   from datetime import datetime

   account_age_days = (datetime.now() - created_at).days if created_at else 0
   # Example: Created 2024-01-01, Today 2026-01-28 → 758 days
   ```

4. **Response Assignment:** `market_pricing_endpoints.py` line 684
   ```python
   factors={
       "account_age_days": account_age_days,  # Integer days (e.g., 758)
       ...
   }
   ```

5. **Frontend Conversion:**
   ```javascript
   (data.factors.account_age_days / 365).toFixed(1)  // 758 / 365 = 2.1 yrs
   ```

**Calculation Logic:**
```python
account_age_days = (NOW() - tutor_profiles.created_at).days

Examples:
- Created today → 0 days → "New"
- Created 6 months ago → 180 days → "0.5 yrs"
- Created 2 years ago → 730 days → "2.0 yrs"
```

**Default Value:** `0 days` → displays "New"

**Weight in Pricing:** 2% (lowest weight)

---

## 📡 API Endpoint Details

**Endpoint:** `POST /api/market-pricing/suggest-price`

**File:** `astegni-backend/market_pricing_endpoints.py`

**Request:**
```json
{
  "time_period_months": 3,
  "course_ids": [1, 2, 3],        // Optional
  "grade_level": ["Grade 10"],     // Optional
  "session_format": "Online"       // Optional
}
```

**Response:**
```json
{
  "suggested_price": 150.0,
  "market_average": 145.0,
  "price_range": {
    "min": 105.0,
    "max": 225.0,
    "suggested_min": 135.0,
    "suggested_max": 165.0
  },
  "tutor_count": 1500,
  "similar_tutors_count": 45,
  "confidence_level": "high",
  "factors": {
    "tutor_id": 1,
    "first_name": "Jediael",
    "tutor_rating": 2.0,
    "completion_rate": 0.0,
    "student_count": 0,
    "location": "Megenagna, Yeka, Addis Ababa, Ethiopia",
    "country": "ETHIOPIA",
    "grade_levels": ["Grade 10", "Grade 11"],
    "grade_complexity": 10.5,
    "credentials_score": 15,
    "credentials_count": 3,
    "experience_score": 15,
    "experience_years": 3,
    "account_age_days": 7,
    "algorithm_version": "2.4_grade_location",
    "weights": { ... },
    "filters_applied": { ... }
  },
  "time_period_months": 3
}
```

---

## 🎯 Summary Table

| Card | Data Source | Database Table | Backend Field | Default | Weight |
|------|-------------|----------------|---------------|---------|--------|
| ⭐ Rating | Database | `tutor_analysis.average_rating` | `tutor_rating` | 2.0 | 20% |
| ✅ Completion | Database | `tutor_analysis.success_rate` | `completion_rate` | 0.0 | 16% |
| 📍 Location | Database | `users.location` | `country` / `location` | 'Not Set' | 15% |
| 👥 Students | Database | `tutor_analysis.total_students` | `student_count` | 0 | 13% |
| 💻 Format | User Input | (Radio button) | From UI | 'Online' | 12% |
| 📚 Grade Level | Database | `tutor_packages.grade_level` | `grade_levels` / `grade_complexity` | [] / 7.0 | 10% |
| 📅 Experience | Database | `SUM(credentials.years)` | `experience_years` / `experience_score` | 0 / 0 | 8% |
| 🎓 Credentials | Database | `COUNT(credentials)` | `credentials_count` / `credentials_score` | 0 / 0 | 4% |
| 🕐 Tenure | Database | `tutor_profiles.created_at` | `account_age_days` | 0 | 2% |

**Total Weight:** 100%

---

## 🔧 Key Files

1. **Frontend Display:**
   - `js/tutor-profile/market-trend-functions.js` (lines 883-930)

2. **Backend API:**
   - `astegni-backend/market_pricing_endpoints.py` (lines 246-720)

3. **Database Tables:**
   - `users` (location)
   - `tutor_profiles` (created_at)
   - `tutor_analysis` (rating, completion_rate, student_count)
   - `tutor_packages` (grade_level)
   - `credentials` (count, years)
   - `tutor_reviews` (for calculating average rating)

---

## 💡 Important Notes

1. **New Tutor vs Regular Tutor:**
   - New tutors (or those without market data) now get the SAME factors object as regular tutors
   - This was fixed in the recent update to include location/country for new tutors

2. **Database-Driven:**
   - All cards (except Session Format) read directly from database
   - No hardcoded values (except defaults for new tutors)

3. **Real-Time Calculation:**
   - Backend calculates scores on-the-fly
   - No cached values (except in `tutor_analysis` which updates periodically)

4. **Version 2.4 Features:**
   - Location card (blue border)
   - Grade Level card (purple border)
   - These are newer additions with special highlighting
