# Enhanced Tutor Scoring System

## Overview

The Astegni platform uses a comprehensive **point-based scoring system** to rank tutors in search results. This system combines **existing factors** with **5 new scoring factors** to provide more accurate, personalized tutor recommendations.

---

## 📊 Complete Scoring Breakdown

### **Maximum Possible Score: ~1,615 points** (up from ~1,175 points)

---

## 🎯 Primary Factors (Core Ranking)

### 1. **Subscription Plan Visibility** (0-500 points)
The primary visibility factor based on tutor's subscription tier.

| Tier | Plan ID | Monthly Cost | Score | Description |
|------|---------|--------------|-------|-------------|
| **Premium** | 9 | 5,000 ETB | **500** | Highest visibility |
| **Standard+** | 8 | 2,800 ETB | **400** | High visibility |
| **Standard** | 7 | 1,500 ETB | **300** | Boosted visibility |
| **Basic+** | 6 | 700 ETB | **200** | Better visibility |
| **Basic** | 5 | 500 ETB | **200** | Better visibility |
| **Free** | 16 | 0 ETB | **0** | Baseline |

**Notes:**
- Expired subscriptions drop to Free tier (0 points)
- Subscription score is the foundation of ranking

---

### 2. **Trending Score** (0-200+ points)
Popularity boost based on search frequency and views.

| Trending Score | Base Points | Search Count Bonus | Total |
|----------------|-------------|-------------------|-------|
| ≥ 100 | 200 | Up to +100 | **300** |
| 50-99 | 100-200 (scaled) | Up to +50 | **250** |
| < 50 | 0-100 (scaled) | Up to +25 | **125** |
| 0 | 0 | 0 | **0** |

**Search Count Bonuses:**
- **≥ 1,000 searches**: +100 (viral tutor)
- **≥ 500 searches**: +50 (very popular)
- **≥ 100 searches**: +25 (popular)

---

## ✨ NEW Scoring Factors (440 points total)

### 3. **Interest/Hobby Matching** ⭐ NEW (0-150 points)
Matches student's learning interests and hobbies with tutor's courses and hobbies.

**Calculation:**
```
Perfect interest match (course name):     +100 points
Partial interest match (category/tags):   +50 points
Hobby match:                              +50 points
Multiple matches bonus:
  - 3+ matches:                           +50 points
  - 2 matches:                            +25 points
Maximum:                                  150 points
```

**Example:**
```
Student interests: ["Mathematics", "Physics"]
Student hobbies: ["Reading", "Chess"]

Tutor teaches: Mathematics (perfect match) → +100 points
Tutor hobbies: ["Reading", "Music"] → +50 points
Multiple matches (2): → +25 points
TOTAL: 175 points (capped at 150)
```

**Data Sources:**
- Student interests: `student_profiles.interested_in`
- Student hobbies: `users.hobbies`
- Tutor courses: `tutor_packages` + `courses`
- Tutor hobbies: `users.hobbies`

---

### 4. **Total Students** ⭐ NEW (0-100 points)
Based on number of students taught (from `enrolled_students` table).

| Students Taught | Score |
|----------------|-------|
| 100+ | **100** |
| 50-99 | **75** |
| 20-49 | **50** |
| 10-19 | **30** |
| 5-9 | **15** |
| 1-4 | **5** |
| 0 | **0** |

**Example:**
```
Tutor has taught 45 students → 50 points
```

---

### 5. **Completion Rate** ⭐ NEW (0-80 points)
Percentage of enrolled sessions completed successfully.

| Completion Rate | Score |
|----------------|-------|
| ≥ 95% | **80** |
| 90-94% | **70** |
| 85-89% | **60** |
| 80-84% | **50** |
| 75-79% | **40** |
| 70-74% | **30** |
| < 70% | **10** |
| No data | **0** |

**Calculation:**
```
Completion Rate = (Active Enrollments / Total Enrollments) × 100
```

**Example:**
```
Total enrollments: 50
Active/Completed: 47
Completion rate: 94% → 70 points
```

---

### 6. **Response Time** ⭐ NEW (0-60 points)
How quickly tutor responds to messages and session requests.

| Avg Response Time | Score | Category |
|-------------------|-------|----------|
| < 5 minutes | **60** | Instant ⚡ |
| 5-15 minutes | **50** | Very fast 🚀 |
| 15-30 minutes | **40** | Fast ⏱️ |
| 30-60 minutes | **30** | Good ✅ |
| 1-2 hours | **20** | Moderate ⏳ |
| 2-6 hours | **10** | Slow 🐌 |
| > 6 hours | **5** | Very slow 🐢 |
| No data | **0** | Unknown ❓ |

**Data Sources:**
1. **Chat messages**: Time between student's first message and tutor's response
2. **Connection requests**: Time between `requested_at` and `connected_at`

**Calculation:**
```
Average Response Time = (All chat responses + All connection responses) / Total responses
```

**Example:**
```
Chat responses: 20 messages, avg 12 minutes
Connection responses: 5 requests, avg 25 minutes
Combined avg: 15.5 minutes → 40 points (Fast)
```

---

### 7. **Experience** ⭐ NEW (0-50 points) - RESTORED
Measures tutor's experience through account age and credentials.

**Components:**
1. **Account Age** (0-30 points):
   - 1 point per month
   - Max 30 points at 30+ months (2.5 years)

2. **Credentials** (0-20 points):
   - 5 points per credential
   - Max 20 points at 4+ credentials

**Calculation:**
```
Account age: 18 months → 18 points
Credentials: 3 certificates → 15 points
TOTAL: 33 points
```

**Data Sources:**
- Account age: `tutor_profiles.created_at`
- Credentials: `documents` table where `document_type = 'credential'`

---

## 🔄 Existing Factors (Continue to Apply)

### 8. **Search History Match** (0-50 points)
Tutor appears in user's previous searches.
- In search history: **+50 points**

---

### 9. **Legacy Basic Flag** (0-100 points)
Legacy field for "basic" tutors (may be deprecated).
- Is basic: **+100 points**

---

### 10. **New Tutor Bonus** (0-50 points)
Boost for recently joined tutors.

| Account Age | Score |
|-------------|-------|
| ≤ 7 days | **50** |
| 8-30 days | **30** |
| > 30 days | **0** |

---

### 11. **Verification** (0-25 points)
Profile complete + KYC verified.
- Verified: **+25 points**

---

### 12. **Combo Bonuses** (0-150 points)
Exponential bonuses for matching multiple criteria.

| Combo | Score |
|-------|-------|
| New + Basic + Search History | **150** |
| Basic + Search History | **80** |
| New + Search History | **60** |
| New + Basic | **50** |

---

## 📈 Score Distribution Examples

### Example 1: Premium Tutor with High Engagement
```
Subscription (Premium):           500 points
Trending (150+ searches):         200 points
Interest/Hobby Match:             120 points ⭐ NEW
Total Students (85):               75 points ⭐ NEW
Completion Rate (92%):             70 points ⭐ NEW
Response Time (8 min):             50 points ⭐ NEW
Experience (22 months, 2 creds):   32 points ⭐ NEW
Verification:                      25 points
─────────────────────────────────────────────
TOTAL:                          1,072 points
```

### Example 2: Free Tier Tutor with Great Performance
```
Subscription (Free):                0 points
Trending (viral, 1200 searches):  300 points
Interest/Hobby Match:             150 points ⭐ NEW
Total Students (120):             100 points ⭐ NEW
Completion Rate (96%):             80 points ⭐ NEW
Response Time (4 min):             60 points ⭐ NEW
Experience (36 months, 5 creds):   50 points ⭐ NEW
New Tutor Bonus (15 days):         30 points
Verification:                      25 points
─────────────────────────────────────────────
TOTAL:                            795 points
```
**Note:** This free tier tutor still ranks high due to excellent performance metrics!

---

## 🎲 Additional Ranking Behaviors

### Shuffling (80% probability on page 1)
- **Purpose**: Provide variety while maintaining quality
- **Application**: Random shuffle of first page results
- **Probability**: 80% chance on page load
- **Impact**: Prevents stagnation, gives all tutors exposure

### Tiered Matching (When Enabled)
When `tiered=true`, tutors are organized into 3 tiers:

1. **Tier 1**: Interest matches (via student's `interested_in`)
2. **Tier 2**: Hobby matches (via student's `hobbies`)
3. **Tier 3**: All other tutors

Within each tier, smart ranking (all scoring factors) applies, then shuffled.

---

## 🛠️ Implementation Details

### Files Created/Modified:

1. **`tutor_scoring.py`** (NEW) - Scoring calculator class
   - `TutorScoringCalculator` class
   - Individual calculation methods for each new factor
   - Combined scoring method

2. **`app.py modules/routes.py`** (MODIFIED)
   - Integrated `TutorScoringCalculator` into `calculate_tutor_score()`
   - Updated score documentation
   - Added error handling for new scoring

3. **`test_tutor_scoring.py`** (NEW) - Test script
   - Tests all 5 new scoring functions
   - Provides detailed output
   - Can test specific tutors

### Frontend Changes:

1. **`find-tutors.html`** (MODIFIED)
   - Removed "Smart Matching" checkbox from filters
   - Tiered matching now always enabled

2. **`api-config-&-util.js`** (MODIFIED)
   - Set `tiered: true` as default
   - Maintained tiered matching on reset

3. **`UI-management-new.js`** (MODIFIED)
   - Removed tiered checkbox event listeners
   - Cleaned up filter handling

---

## 🧪 Testing

### Run All Tests:
```bash
cd astegni-backend
python test_tutor_scoring.py
```

### Test Specific Tutor:
```bash
python test_tutor_scoring.py 123
```

### Expected Output:
```
🧪 Testing Tutor Scoring System with 5 tutors
================================================================================

📊 Tutor: Abebe Tadesse (ID: 1)
--------------------------------------------------------------------------------

1️⃣ Interest/Hobby Matching (0-150 points):
   Score: 120 points
   Details: {'interest_matches': [...], 'hobby_matches': [...]}

2️⃣ Total Students (0-100 points):
   Score: 50 points
   Details: {'total_students': 35, 'score_tier': '35 students → 50 points'}

... (more output)

✅ All scoring functions tested successfully!
```

---

## 📊 Monitoring & Analytics

### Recommended Monitoring:

1. **Score Distribution**:
   - Track average scores per subscription tier
   - Identify outliers (free tier tutors with very high scores)

2. **Factor Impact**:
   - Monitor which factors contribute most to rankings
   - A/B test weight adjustments

3. **Conversion Metrics**:
   - Click-through rate by score range
   - Booking rate vs. tutor score

4. **New Factor Performance**:
   - Interest/hobby match effectiveness
   - Response time impact on bookings
   - Completion rate correlation with success

---

## 🔮 Future Enhancements

### Potential Additions:

1. **Review Rating Score** (0-50 points) - Currently disabled
   - Average of 4-factor rating system
   - Based on `tutor_reviews` table

2. **Student Satisfaction** (0-40 points)
   - Net Promoter Score from reviews
   - Recommendation likelihood

3. **Availability Score** (0-30 points)
   - Based on schedule flexibility
   - Available time slots

4. **Specialization Depth** (0-25 points)
   - Number of courses in primary subject
   - Credentials in specific field

5. **Teaching Style Match** (0-20 points)
   - Match student's learning style preferences
   - Based on profile questionnaire

---

## 📝 Notes

- **Maximum possible score** is theoretical - actual scores typically range 200-1,200
- **Subscription tier** remains the primary factor but can be overcome by excellent performance
- **New factors add 440 points** - a 37% increase in total scoring capacity
- **Interest matching** is most impactful new factor for personalized results
- **Response time** encourages quick tutor engagement
- **System is backward compatible** - old tutors without new data still rank fairly

---

## 🎓 Summary

The enhanced scoring system provides:

✅ **More personalized** results through interest/hobby matching
✅ **Better quality signals** through completion rate and response time
✅ **Fairer ranking** by rewarding performance, not just subscription
✅ **Data-driven insights** through comprehensive metrics
✅ **Improved student outcomes** by matching with right tutors

**Total Impact**: Students see more relevant tutors. High-performing tutors get better visibility. Platform quality improves overall.

---

**Last Updated**: January 20, 2026
**Version**: 2.1.0
**Status**: ✅ Implemented & Ready for Testing
