# Market Pricing v2.1 - Agreed Price Integration

## Status: ✅ IMPLEMENTATION COMPLETE

Market pricing now uses **actual agreed prices** from `enrolled_students.agreed_price` instead of listed prices from `tutor_packages.hourly_rate`. This reflects the **real market** - what students/parents actually agreed to pay.

---

## Why This Change Is Critical

### Before (Wrong Approach):
```
Source: tutor_packages.hourly_rate
- Tutor lists package at 300 ETB
- No students enroll (price too high)
- Algorithm suggests 300 ETB to other tutors ❌
```

### After (Correct Approach):
```
Source: enrolled_students.agreed_price
- Tutor lists package at 300 ETB
- Student negotiates down to 220 ETB
- Both agree, enrollment created with agreed_price = 220 ETB
- Algorithm uses 220 ETB (actual market rate) ✅
```

---

## How Pricing Works Now

### 1. Student/Parent Enrollment Flow
```
1. Student browses tutor packages
2. Student can:
   - Accept listed price (agreed_price = hourly_rate)
   - Propose different price (student suggests)
   - Parent proposes price (parent suggests)
3. Tutor accepts/rejects proposal
4. Once agreed → enrolled_students record created with agreed_price
```

### 2. Market Price Algorithm
```sql
-- Get tutors with ACTUAL agreed prices (not listed prices)
SELECT
    tp.id,
    ta.average_rating,
    ta.success_rate,
    ta.total_students,
    AVG(es.agreed_price) as avg_agreed_price,  -- ACTUAL MARKET PRICE
    credentials_count,
    tp.created_at
FROM tutor_profiles tp
INNER JOIN tutor_packages pkg ON tp.id = pkg.tutor_id
INNER JOIN enrolled_students es ON pkg.id = es.package_id  -- REQUIRED JOIN
WHERE es.agreed_price > 0
  AND es.enrolled_at >= cutoff_date
GROUP BY tp.id
```

**Key Point:** Only tutors who have **actual enrollments** with **agreed prices** are included in market pricing.

---

## Database Schema

### enrolled_students Table
```sql
CREATE TABLE enrolled_students (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    package_id INTEGER REFERENCES tutor_packages(id),
    agreed_price NUMERIC(10, 2),  -- ACTUAL AGREED PRICE (not listed price)
    enrolled_at TIMESTAMP,
    status VARCHAR(50),
    -- ... other fields
);
```

**agreed_price Field:**
- Student accepted listed price → `agreed_price = tutor_packages.hourly_rate`
- Student proposed price → `agreed_price = student's proposal` (if tutor accepts)
- Parent proposed price → `agreed_price = parent's proposal` (if tutor accepts)
- Can be higher or lower than listed price
- Represents **actual market transaction**

---

## Implementation Changes

### File Updated: `market_pricing_endpoints.py`

#### 1. Main Price Suggestion Endpoint (Lines 206-230)

**Before:**
```python
SELECT tp.id, ..., pkg.hourly_rate
FROM tutor_profiles tp
INNER JOIN tutor_packages pkg ON tp.id = pkg.tutor_id
WHERE pkg.hourly_rate > 0
```

**After:**
```python
SELECT tp.id, ..., AVG(es.agreed_price) as avg_agreed_price
FROM tutor_profiles tp
INNER JOIN tutor_packages pkg ON tp.id = pkg.tutor_id
INNER JOIN enrolled_students es ON pkg.id = es.package_id
WHERE es.agreed_price > 0
  AND es.enrolled_at >= cutoff_date
GROUP BY tp.id
```

#### 2. Fallback Query (Lines 234-259)

**Before:**
```python
WHERE pkg.hourly_rate > 0
  AND pkg.created_at >= cutoff_date
```

**After:**
```python
WHERE es.agreed_price > 0
  AND es.enrolled_at >= cutoff_date
GROUP BY tp.id
```

#### 3. Market Tutors Endpoint for Graphs/Tables (Lines 622-648)

**Before:**
```python
SELECT tp.id, ..., pkg.hourly_rate
FROM tutor_profiles tp
INNER JOIN tutor_packages pkg ON tp.id = pkg.tutor_id
WHERE pkg.hourly_rate > 0
```

**After:**
```python
SELECT tp.id, ..., AVG(es.agreed_price) as avg_agreed_price
FROM tutor_profiles tp
INNER JOIN tutor_packages pkg ON tp.id = pkg.tutor_id
INNER JOIN enrolled_students es ON pkg.id = es.package_id
WHERE es.agreed_price > 0
  AND es.enrolled_at >= cutoff_date
GROUP BY tp.id
```

---

## How the Algorithm Now Works

### Step-by-Step Example

**Requesting Tutor:**
- Rating: 4.5⭐
- Completion Rate: 95%
- Active Students: 25
- Experience Score: 60/100
- Platform Tenure: 2 years
- Wants to know: "What should I charge?"

**Market Query:**
```sql
-- Find tutors with similar profiles who have ACTUAL enrollments
SELECT AVG(es.agreed_price) as price
FROM tutor_profiles tp
JOIN tutor_packages pkg ON tp.id = pkg.tutor_id
JOIN enrolled_students es ON pkg.id = es.package_id
WHERE es.enrolled_at >= (NOW() - INTERVAL '6 months')
  AND es.agreed_price > 0
  -- Calculate similarity based on 5 factors...
```

**Market Data Found:**
```
Tutor A: 4.6⭐, 96%, 28 students, 65 exp, 2.2 yrs
  - Listed price: 300 ETB
  - Actual enrollments:
    * Student 1: agreed_price = 280 ETB
    * Student 2: agreed_price = 290 ETB
    * Student 3: agreed_price = 270 ETB
  - Average agreed_price: 280 ETB ✅ (used in algorithm)

Tutor B: 4.4⭐, 94%, 23 students, 58 exp, 1.8 yrs
  - Listed price: 250 ETB
  - Actual enrollments:
    * Student 1: agreed_price = 250 ETB (accepted listed)
    * Student 2: agreed_price = 240 ETB (negotiated)
  - Average agreed_price: 245 ETB ✅ (used in algorithm)

Tutor C: 4.5⭐, 95%, 26 students, 62 exp, 2.1 yrs
  - Listed price: 350 ETB
  - NO ENROLLMENTS → Excluded from algorithm ❌
```

**Result:**
```json
{
  "suggested_price": 265.00,  // Based on actual agreed prices (280, 245, ...)
  "price_range": { "min": 220, "max": 310 },
  "similar_tutors_count": 18,
  "confidence": "high",
  "note": "Prices based on actual student/parent agreements"
}
```

---

## Benefits of Using Agreed Prices

### 1. **Real Market Signal**
- Shows what students/parents actually PAY, not what tutors WANT
- Automatically adjusts for overpriced listings
- Reflects negotiation outcomes

### 2. **Demand Validation**
- Only includes tutors who have enrollments (proven demand)
- Filters out tutors with unrealistic pricing (no enrollments)
- Shows market-clearing prices

### 3. **More Accurate**
```
Example:
- Tutor lists 500 ETB (too high)
- No enrollments for 6 months
- Old algorithm: Would consider 500 ETB ❌
- New algorithm: Tutor excluded (no agreed_price data) ✅
```

### 4. **Reflects Negotiation**
- Students can propose lower prices
- Parents can propose different prices
- Tutors can accept/reject
- Final agreed_price represents market consensus

### 5. **Time-Based Filtering**
```sql
WHERE es.enrolled_at >= (NOW() - INTERVAL '6 months')
```
- Only recent agreements
- Reflects current market conditions
- Excludes outdated pricing

---

## Edge Cases Handled

### Case 1: Tutor Has Multiple Enrollments
```sql
AVG(es.agreed_price) as avg_agreed_price
```
- Takes average of all agreed prices
- Example: 220 + 240 + 230 = 230 ETB average

### Case 2: Tutor Has No Enrollments
- Tutor excluded from market data
- Makes sense: No proven market demand
- Old pricing may be unrealistic

### Case 3: Not Enough Data
```python
if len(market_data) < 5:
    # Fallback to broader criteria (all courses/grades)
    # Still uses agreed_price, just wider search
```

### Case 4: Zero Market Data
```python
if len(market_data) == 0:
    return {
        "suggested_price": 150.0,  # Default fallback
        "confidence_level": "low",
        "note": "Insufficient market data"
    }
```

---

## Graphs and Tables Impact

### Before:
```
Rating | Avg Price
4.5⭐  | 350 ETB  (includes overpriced listings with no enrollments)
```

### After:
```
Rating | Avg Agreed Price
4.5⭐  | 235 ETB  (only tutors with actual enrollments)
```

**Result:**
- Graphs show **realistic market prices**
- Tables display **actual transaction data**
- More accurate price trends

---

## Testing the Change

### 1. Check enrolled_students Data
```sql
-- See what agreed prices exist
SELECT
    es.id,
    es.agreed_price,
    es.enrolled_at,
    pkg.hourly_rate as listed_price,
    tp.id as tutor_id
FROM enrolled_students es
JOIN tutor_packages pkg ON es.package_id = pkg.id
JOIN tutor_profiles tp ON pkg.tutor_id = tp.id
WHERE es.agreed_price > 0
ORDER BY es.enrolled_at DESC
LIMIT 20;
```

### 2. Test Price Suggestion API
```bash
# Restart backend to load changes
cd astegni-backend
python app.py

# Test endpoint
curl -X POST http://localhost:8000/api/market-pricing/suggest-price \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "time_period_months": 6
  }'
```

### 3. Check Browser Console
```javascript
// Should see logs like:
"📊 Fetched 50 market tutors for 6-month period"
"✅ Using agreed prices from enrolled_students"
```

### 4. Verify Market Trends Graph/Table
- Login as tutor
- Go to Market Trends tab
- Check if prices seem realistic
- Should be lower than before (no overpriced listings)

---

## Expected Behavior Changes

### Scenario 1: New Platform (Few Enrollments)
**Before:** Many tutors with high listed prices included
**After:** Fewer tutors (only those with enrollments), but more accurate prices

### Scenario 2: Mature Platform (Many Enrollments)
**Before:** Mix of realistic and unrealistic prices
**After:** Only market-validated prices, highly accurate

### Scenario 3: Overpriced Tutor
**Before:** Tutor listing 1000 ETB included in market average
**After:** Tutor excluded (no enrollments at that price)

---

## Important Notes

### 1. **Requires Enrollments**
- Tutors must have at least one enrollment to influence pricing
- New tutors won't appear in market data until first enrollment
- This is **intentional** - proves market demand

### 2. **Time Period Matters**
```javascript
time_period_months: 6  // Only last 6 months of enrollments
```
- Recent enrollments weighted more heavily
- Reflects current market conditions
- Excludes old, outdated pricing

### 3. **Negotiation Flow**
For pricing to work correctly, ensure your frontend handles:
- Student price proposals
- Parent price proposals
- Tutor acceptance/rejection
- Recording agreed_price in enrolled_students table

### 4. **Data Integrity**
```sql
WHERE es.agreed_price > 0  -- Must be positive
  AND es.agreed_price IS NOT NULL
```
- Null or zero prices excluded
- Only valid transactions considered

---

## Migration Notes

### No Database Migration Required ✅
- `enrolled_students.agreed_price` already exists
- Just changed which column the algorithm reads from
- Backward compatible

### Potential Issues:
1. **If enrolled_students has no data:**
   - Algorithm will return default fallback (150 ETB)
   - Confidence level: "low"
   - This is correct behavior

2. **If agreed_price is null/zero:**
   - Those records excluded
   - Only valid prices considered
   - Check enrollment creation logic

---

## Summary

**What Changed:**
- Market pricing now uses `enrolled_students.agreed_price` instead of `tutor_packages.hourly_rate`
- Both main endpoints updated: `/suggest-price` and `/market-tutors`
- Only tutors with actual enrollments included in market data

**Why It's Better:**
- Reflects **actual market transactions**, not wishful thinking
- Validates demand (tutor must have enrollments)
- Accounts for negotiation between students/parents and tutors
- More accurate, realistic price suggestions

**Impact:**
- Suggested prices likely lower (more realistic)
- Market trends graphs/tables show actual transaction data
- Better guidance for new tutors setting prices

---

**Status:** ✅ IMPLEMENTATION COMPLETE
**Testing Required:** Yes - restart backend and test with real/sample data
**Version:** 2.1 Refined
**Date:** 2026-01-20
