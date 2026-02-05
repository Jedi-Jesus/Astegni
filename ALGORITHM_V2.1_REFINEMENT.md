# Market Pricing Algorithm v2.1 - Refinement Summary

## Overview
Refined the market pricing algorithm based on user feedback to clarify the distinction between student count and experience, and to add platform tenure as a weighting factor.

**Version:** 2.1 Refined
**Date:** 2026-01-20
**Status:** ✅ Implemented
**Previous Version:** 2.0 Enhanced

---

## What Changed from v2.0 to v2.1

### 1. Simplified Experience Definition

**v2.0 (OLD):**
```python
# Experience was a composite score
experience_score = min(100, (
    student_count * 2 +
    cert_count * 5 +
    total_credentials * 3
))
```

**v2.1 (NEW):**
```python
# Experience = credentials ONLY
experience_score = min(100, credentials_count * 5)
```

**User's Requirement:**
> "all in all experience = credentials"

**Impact:**
- Experience now purely reflects teaching certifications and achievements
- Each credential contributes 5 points to the 0-100 scale
- Simpler, more intuitive metric

---

### 2. Student Count as Separate Factor

**v2.0:** Student count was part of the composite experience score (30% weight total)

**v2.1:** Student count is now an independent factor with its own weight (20%)

**User's Requirement:**
> "student count should be with itself for clarification"

**Why This Matters:**
- Student count represents **current teaching load** (active engagement)
- Experience represents **credentials/achievements** (qualifications)
- These are distinct qualities that deserve separate consideration

**Calculation:**
```python
# Student count similarity (0-1 scale)
student_diff = abs(student_count - market_tutor_student_count)
student_similarity = 1 - min(student_diff / max(student_count, market_tutor_student_count, 1), 1.0)
```

---

### 3. Added Account Age Factor (NEW)

**User's Requirement:**
> "weighting should also include time when the tutor joined in our system"

**Implementation:**
```python
# Calculate account age in days
account_age_days = (datetime.now() - created_at).days if created_at else 0

# Account age similarity (0-1 scale)
age_diff = abs(account_age_days - market_tutor_age_days)
max_age = max(account_age_days, market_tutor_age_days, 1)
age_similarity = 1 - min(age_diff / max_age, 1.0)
```

**What It Measures:**
- Platform tenure (how long tutor has been on Astegni)
- Indicator of platform familiarity and established presence
- Helps match tutors with similar experience levels on the platform

**Example Values:**
- New tutor (30 days): ~0.08 years
- Mid-tenure (1 year): 1.0 years
- Established (5 years): 5.0 years

---

### 4. Updated Weight Distribution

| Factor | v2.0 Weight | v2.1 Weight | What It Measures |
|--------|------------|------------|------------------|
| **Rating** | 35% | **30%** | Reputation & student satisfaction |
| **Completion Rate** | 30% | **25%** | Reliability & session quality |
| **Student Count** | (part of experience) | **20%** | Current teaching load (NEW SEPARATE) |
| **Experience** | 25% (composite) | **15%** | Credentials only (SIMPLIFIED) |
| **Account Age** | 0% | **10%** | Platform tenure (NEW FACTOR) |

**Total:** 100%

**Rationale:**
- **Rating (30%)**: Reputation still most important, but not overwhelming
- **Completion Rate (25%)**: Quality/reliability is critical
- **Student Count (20%)**: Active teaching load shows current demand
- **Experience (15%)**: Credentials show qualifications
- **Account Age (10%)**: Platform familiarity adds context

---

## Algorithm Flow (v2.1 Refined)

### Step 1: Get Tutor Profile Data
```sql
SELECT
    tp.id,
    COALESCE(ta.average_rating, 3.5) as rating,
    COALESCE(ta.success_rate, 0.0) as completion_rate,
    COALESCE(ta.total_students, 0) as student_count,
    COALESCE(
        (SELECT COUNT(*) FROM credentials WHERE user_id = tp.user_id),
        0
    ) as credentials_count,
    tp.created_at
FROM tutor_profiles tp
LEFT JOIN tutor_analysis ta ON tp.id = ta.tutor_id
WHERE tp.user_id = ?
```

### Step 2: Calculate Derived Metrics
```python
# Experience score = credentials only (0-100 scale)
experience_score = min(100, credentials_count * 5)

# Account age in days
account_age_days = (datetime.now() - created_at).days if created_at else 0
```

### Step 3: Query Market Data
Same query structure applied to all market tutors in the time period.

### Step 4: Calculate Similarity (v2.1 REFINED)
```python
# 1. Rating similarity (0-5 scale)
rating_diff = abs(rating - market_rating)
rating_similarity = 1 - min(rating_diff / 5.0, 1.0)

# 2. Completion rate similarity (0-1 scale)
comp_rate_diff = abs(completion_rate - market_completion_rate)
comp_rate_similarity = 1 - comp_rate_diff

# 3. Student count similarity (count-based) - NEW SEPARATE FACTOR
student_diff = abs(student_count - market_student_count)
student_similarity = 1 - min(student_diff / max(student_count, market_student_count, 1), 1.0)

# 4. Experience similarity (0-100 scale) - SIMPLIFIED
market_exp_score = min(100, market_credentials_count * 5)
exp_diff = abs(experience_score - market_exp_score)
exp_similarity = 1 - min(exp_diff / max(experience_score, market_exp_score, 1), 1.0)

# 5. Account age similarity (days-based) - NEW FACTOR
age_diff = abs(account_age_days - market_age_days)
age_similarity = 1 - min(age_diff / max(account_age_days, market_age_days, 1), 1.0)

# Combined similarity score (v2.1)
similarity = (
    rating_similarity * 0.30 +      # 30% - Reputation
    comp_rate_similarity * 0.25 +   # 25% - Quality/reliability
    student_similarity * 0.20 +     # 20% - Teaching load (NEW)
    exp_similarity * 0.15 +         # 15% - Credentials (SIMPLIFIED)
    age_similarity * 0.10           # 10% - Platform tenure (NEW)
)
```

### Step 5-7: Same as v2.0
- Apply weighted average
- Apply time-based adjustment
- Apply confidence bounds

---

## API Response Changes (v2.1)

### New Fields in Response

```json
{
  "suggested_price": 235.0,
  "factors": {
    "tutor_rating": 4.5,
    "completion_rate": 0.95,
    "student_count": 25,              // NEW: Separate factor
    "experience_score": 60,            // CHANGED: Credentials only
    "credentials_count": 12,           // NEW: Raw credential count
    "account_age_days": 730,           // NEW: Days on platform
    "algorithm_version": "2.1_refined", // UPDATED version
    "weights": {                       // UPDATED weights
      "rating": "30%",
      "completion_rate": "25%",
      "student_count": "20%",          // NEW
      "experience": "15%",
      "account_age": "10%"             // NEW
    },
    "note": "Experience = credentials only. Student count is separate factor."
  }
}
```

---

## Frontend Changes

### Enhanced Display (5 Factors)

**v2.0 (4 factors):**
```
[Rating: 4.5 ⭐] [Completion: 95%]
```

**v2.1 (5 factors):**
```
[Rating: 4.5 ⭐] [Completion: 95%] [Students: 25] [Experience: 60/100] [Tenure: 2.5 yrs]
```

### Detailed Breakdown

**Before (v2.0):**
```
- Your experience score: 78/100 (25 students + 10 credentials)
- Algorithm weights: Rating 35%, Completion 30%, Experience 25%, Certs 10%
```

**After (v2.1):**
```
- Your experience score: 60/100 (12 credentials - teaching certifications & achievements)
- Your active student count: 25 students (current teaching load)
- Platform tenure: 2.0 years on Astegni
- Algorithm v2.1 weights: Rating 30%, Completion 25%, Students 20%, Experience 15%, Tenure 10%
```

**File:** [js/tutor-profile/market-trend-functions.js:586-632](js/tutor-profile/market-trend-functions.js#L586-L632)

---

## Key Improvements

### 1. Clearer Factor Definitions

| Factor | v2.0 Definition | v2.1 Definition |
|--------|----------------|----------------|
| Experience | Composite (students + certs + credentials) | Credentials ONLY |
| Student Count | Part of experience | **Independent factor** |
| Account Age | Not tracked | **New factor** |

### 2. Better Conceptual Model

**v2.0:** Mixed concepts (experience included current activity)
**v2.1:** Clean separation:
- **Experience** = What you know (credentials)
- **Student Count** = What you're doing (teaching load)
- **Account Age** = How long you've been here (tenure)

### 3. More Accurate Matching

Adding student count and account age as separate factors provides:
- 5 dimensions of similarity instead of 4
- More granular matching
- Better price accuracy

---

## Testing Scenarios

### Scenario 1: Experienced Tutor with Many Students
**Input:**
- Rating: 4.7
- Completion rate: 96%
- Student count: 40
- Credentials: 15 (experience score: 75/100)
- Account age: 3 years (1095 days)

**Expected Behavior:**
- High rating similarity (30% weight)
- High completion rate similarity (25% weight)
- High student count (20% weight prioritizes active tutors)
- High experience score (15% weight)
- Established tenure (10% weight)
- **Result:** Should match with top-tier tutors, highest price bracket

### Scenario 2: New Tutor with Credentials
**Input:**
- Rating: 4.0 (few reviews)
- Completion rate: 85% (still building track record)
- Student count: 5
- Credentials: 8 (experience score: 40/100)
- Account age: 2 months (60 days)

**Expected Behavior:**
- Moderate rating (lower due to fewer reviews)
- Moderate completion rate
- Low student count
- **Good credentials** despite being new
- Short tenure
- **Result:** Should match with other qualified but newer tutors

### Scenario 3: Veteran Tutor, Few Credentials
**Input:**
- Rating: 4.8
- Completion rate: 98%
- Student count: 50
- Credentials: 3 (experience score: 15/100)
- Account age: 5 years (1825 days)

**Expected Behavior:**
- Very high rating and completion rate (55% combined)
- Very high student count (20%)
- **Low credentials** (15%)
- Long tenure (10%)
- **Result:** High price due to reputation, reliability, and demand, despite low credentials

---

## Comparison: v2.0 vs v2.1

| Aspect | v2.0 Enhanced | v2.1 Refined |
|--------|--------------|-------------|
| **Factors** | 4 | 5 |
| **Experience Definition** | Composite (students + certs + credentials) | Credentials only |
| **Student Count** | Part of experience | Separate factor (20%) |
| **Account Age** | Not tracked | New factor (10%) |
| **Weight Distribution** | 35/30/25/10 | 30/25/20/15/10 |
| **Conceptual Clarity** | Mixed concepts | Clean separation |
| **User Alignment** | Partial | Fully aligned with user's mental model |

---

## Migration Notes

### No Breaking Changes
- All v2.0 API endpoints remain unchanged
- Response format is backward compatible (added fields only)
- Old clients will ignore new fields
- Database queries use same tables

### Database Requirements
Same as v2.0 - no new migrations needed:
- Uses `tutor_analysis` table
- Uses `credentials` table
- Uses `tutor_profiles.created_at` (existing column)

---

## User Feedback Addressed

### Feedback #1 (Implemented in v2.0)
> "completion rate is forgotten and also experience means current student count + credentials?"

**Resolution:** Added completion rate (30% weight), made experience composite

### Feedback #2 (Implemented in v2.1)
> "weighting should also include time when the tutor joined in our system, also student count should be with itself for clarification. certification should be under credentials. all in all experience = credentials"

**Resolution:**
- ✅ Added account age (10% weight)
- ✅ Separated student count (20% weight)
- ✅ Clarified certifications are part of credentials umbrella
- ✅ Simplified experience to be credentials only

---

## Files Changed (v2.1)

### Backend
- ✅ [astegni-backend/market_pricing_endpoints.py](astegni-backend/market_pricing_endpoints.py)
  - Lines 143-158: Updated query to get credentials_count and created_at
  - Lines 173-178: Simplified experience score calculation
  - Lines 206-221: Updated market query with same changes
  - Lines 319-331: New 5-factor similarity calculation
  - Lines 392-408: Enhanced response with new factors

### Frontend
- ✅ [js/tutor-profile/market-trend-functions.js](js/tutor-profile/market-trend-functions.js)
  - Lines 586-607: Enhanced UI with 5 factor cards (added student count, account age)
  - Lines 623-632: Detailed breakdown with clarified definitions

### Documentation
- ✅ [ALGORITHM_V2.1_REFINEMENT.md](ALGORITHM_V2.1_REFINEMENT.md) (this file)

---

## Summary

The v2.1 algorithm refinement provides:
- ✅ **5 distinct factors** (rating, completion rate, student count, experience, account age)
- ✅ **Clearer definitions** (experience = credentials only)
- ✅ **Separate student count** (20% weight for teaching load)
- ✅ **Platform tenure tracking** (10% weight for account age)
- ✅ **Better conceptual alignment** with user's mental model
- ✅ **No breaking changes** (backward compatible)
- ✅ **No database migration** required

**Result:** More intuitive, accurate, and user-aligned price suggestions that clearly separate qualifications (credentials), activity (student count), and tenure (account age).

---

**Version:** 2.1 Refined
**Status:** ✅ Ready for Testing
**Next Steps:** Restart backend and test with real tutor data

---

## Quick Reference

### Algorithm Weights (v2.1)
```
Rating:          30% (Reputation)
Completion Rate: 25% (Quality/Reliability)
Student Count:   20% (Teaching Load) ← NEW SEPARATE
Experience:      15% (Credentials Only) ← SIMPLIFIED
Account Age:     10% (Platform Tenure) ← NEW
```

### Experience Calculation
```python
# v2.1: Simple and clear
experience_score = min(100, credentials_count * 5)
```

### New Factors Displayed
- Active Students: Direct count
- Platform Tenure: Years with 1 decimal (e.g., "2.5 yrs")
- Experience Score: Now clearly labeled as credentials-based

---

**User Requirements Fully Addressed:** ✅
