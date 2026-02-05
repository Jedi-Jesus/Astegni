# How "Make an Estimate" and "Suggested Price" Work - Complete Guide

## Overview

Both features use the **same API endpoint** (`/api/market-pricing/suggest-price`) but behave differently based on the `session_format` parameter sent to the backend.

---

## 🎯 Feature Comparison Table

| Feature | Location | Radio Button | Session Format Sent | Default if No Selection |
|---------|----------|--------------|---------------------|------------------------|
| **Make an Estimate** | Package Editor | `universalSessionFormat` | Online/In-person/Hybrid | `'Online'` |
| **Suggested Price** | Market Trend Panel | `universalSessionFormat` | Online/In-person/Hybrid | `'Online'` |

**Key Point:** After the fix, BOTH features now use the SAME radio button and send the SAME session format.

---

## 📡 API Endpoint: `/api/market-pricing/suggest-price`

**File:** `astegni-backend/market_pricing_endpoints.py`

### Request Format:
```json
POST /api/market-pricing/suggest-price
{
  "time_period_months": 3,
  "course_ids": [1, 2, 3],        // Optional
  "grade_level": ["Grade 10"],     // Optional
  "session_format": "Online"       // Can be: "Online", "In-person", "Hybrid", or null
}
```

### Response Format:
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
  "factors": { ... },
  "time_period_months": 3
}
```

---

## 🔀 Backend Logic Flow

### Step 1: Check if Tutor is New

```python
# market_pricing_endpoints.py line 371-373
tutor_is_new = (
    (student_count == 0 or tutor_rating <= 2.5) and
    (datetime.now() - created_at).days < 30
)
```

**Criteria for "New Tutor":**
- Has 0 students OR rating ≤ 2.5
- AND account created within last 30 days

---

### Step 2A: New Tutor Path (Uses Base Price Rules)

**When:** Tutor is new OR no market data available

**Code:** `market_pricing_endpoints.py` lines 464-509

```python
if len(market_data) == 0 or tutor_is_new:
    # Use base price rules
    base_price, price_source = get_base_price_for_tutor(
        subject_category="all",
        session_format=request.session_format or "all",  # ← KEY LINE
        credentials_count=credentials_count,
        experience_years=account_age_days / 365.0
    )

    suggested_price = base_price
    confidence = "medium" if tutor_is_new else "low"
```

**Base Price Matching Logic:**

The `get_base_price_for_tutor()` function searches the `base_price_rules` table:

```python
# Tries to match in priority order:
1. Exact match: subject_category + session_format + country
2. Partial match: subject_category + session_format
3. Fallback: "all" + session_format
4. Last resort: "all" + "all"
```

---

### Step 2B: Regular Tutor Path (Uses Market Data)

**When:** Tutor has experience AND market data available

**Code:** `market_pricing_endpoints.py` lines 511-670

```python
# Calculate weighted similarity with market tutors (9 factors)
# - Rating: 20%
# - Completion Rate: 16%
# - Location: 15%
# - Student Count: 13%
# - Session Format: 12%  ← Filtered here
# - Grade Level: 10%
# - Experience: 8%
# - Credentials: 4%
# - Account Age: 2%

# Filter market tutors by session format if specified
if request.session_format:
    market_data = [t for t in market_data if t.session_format == request.session_format]

suggested_price = calculate_weighted_average(market_data, similarity_scores)
```

---

## 💰 Base Price Rules (For New Tutors)

**Database:** `astegni_admin_db.base_price_rules`

### Current Rules:

| ID | Rule Name | Session Format | Base Price/Hour | Credential Bonus | Experience Bonus | Priority |
|----|-----------|----------------|-----------------|------------------|------------------|----------|
| 10 | New tutor online | `'Online'` | 100 ETB | 30 ETB | 30 ETB/year | 2 |
| 9 | New tutor in person | `'all'` | 200 ETB | 30 ETB | 30 ETB/year | 2 |

### Matching Examples:

#### Example 1: session_format = "Online"
```python
session_format = "Online"
# Matches: Rule ID 10 ("New tutor online")
# Base Price: 100 ETB
# + Credentials: 3 × 30 = 90 ETB
# + Experience: 0 years × 30 = 0 ETB
# = Total: 190 ETB
```

#### Example 2: session_format = "In-person"
```python
session_format = "In-person"
# Tries: "all" + "In-person" → No match
# Falls back: "all" + "all" → Matches Rule ID 9
# Base Price: 200 ETB
# + Credentials: 3 × 30 = 90 ETB
# + Experience: 0 years × 30 = 0 ETB
# = Total: 290 ETB
```

#### Example 3: session_format = "Hybrid"
```python
session_format = "Hybrid"
# Tries: "all" + "Hybrid" → No match
# Falls back: "all" + "all" → Matches Rule ID 9
# Base Price: 200 ETB
# + Credentials: 3 × 30 = 90 ETB
# + Experience: 0 years × 30 = 0 ETB
# = Total: 290 ETB
```

#### Example 4: session_format = null (Before Fix)
```python
session_format = None
# Backend converts to: "all"
# Matches: Rule ID 9 ("New tutor in person")
# Base Price: 200 ETB
# + Credentials: 3 × 30 = 90 ETB
# + Experience: 0 years × 30 = 0 ETB
# = Total: 290 ETB
```

---

## 🎬 Frontend Flow Diagrams

### 1️⃣ Make an Estimate (After Fix)

**File:** `js/tutor-profile/package-manager-clean.js`

```
User Action: Check "Make an Estimate" checkbox
    ↓
Event Listener Triggered (line 1390)
    ↓
Function: fetchAndApplyMarketPrice() (line 2865)
    ↓
Read Radio Button:
    const sessionFormatRadio = document.querySelector('input[name="universalSessionFormat"]:checked');
    const sessionFormat = sessionFormatRadio ? sessionFormatRadio.value : 'Online';
    ↓
API Call:
    POST /api/market-pricing/suggest-price
    {
        "time_period_months": 3,
        "session_format": sessionFormat  // "Online", "In-person", or "Hybrid"
    }
    ↓
Backend Processing:
    if tutor_is_new:
        → Use base_price_rules
    else:
        → Use market_data with similarity
    ↓
Response:
    { "suggested_price": 100.0 }
    ↓
Apply to Input:
    hourlyRateInput.value = suggestedPrice;  // Sets 100
    ↓
Trigger Calculator Update:
    hourlyRateInput.dispatchEvent(new Event('input'));
    ↓
Show Notification:
    "Market Price Applied! 100 ETB based on market data"
```

---

### 2️⃣ Market Trend - Suggest Price

**File:** `js/tutor-profile/market-trend-functions.js`

```
User Action: Click "Make an Estimate" button in Market Trend panel
    ↓
Function: suggestMarketPrice() (line 763)
    ↓
Read Radio Button:
    const sessionFormat = getUniversalSessionFormat();

    function getUniversalSessionFormat() {
        const sessionFormatRadio = document.querySelector('input[name="universalSessionFormat"]:checked');
        return sessionFormatRadio ? sessionFormatRadio.value : 'Online';
    }
    ↓
API Call:
    POST /api/market-pricing/suggest-price
    {
        "time_period_months": currentMarketTimePeriod,  // 3-12 months
        "session_format": sessionFormat  // "Online", "In-person", or "Hybrid"
    }
    ↓
Backend Processing:
    if tutor_is_new:
        → Use base_price_rules
    else:
        → Use market_data with similarity
    ↓
Response:
    {
        "suggested_price": 100.0,
        "factors": {
            "tutor_rating": 2.0,
            "completion_rate": 0.0,
            "student_count": 0,
            "location": "Megenagna, Yeka, Addis Ababa, Ethiopia",
            "country": "ETHIOPIA",
            ...
        }
    }
    ↓
Display Score Cards:
    - ⭐ Your Rating: 2.0 / 5.0
    - ✅ Completion Rate: 0%
    - 📍 Location Match: ETHIOPIA
    - 👥 Active Students: 0
    - 💻 Session Format: Online
    - 📚 Grade Level: Not Set
    - 📅 Experience: 0 yrs
    - 🎓 Credentials: 0
    - 🕐 Platform Tenure: New
    ↓
Display Suggested Price:
    "Your suggested hourly price: 100 ETB"
    (Based on 3-month market trends from 0 active tutors)
    MEDIUM Confidence (v2.4)
```

---

## 🔧 Session Format Behavior Matrix

### For New Tutors (Using Base Price Rules):

| Session Format Sent | Rule Matched | Base Price | Notes |
|---------------------|--------------|------------|-------|
| `"Online"` | Rule ID 10: "New tutor online" | **100 ETB** | Exact match |
| `"In-person"` | Rule ID 9: "New tutor in person" (all) | **200 ETB** | Falls back to "all" |
| `"Hybrid"` | Rule ID 9: "New tutor in person" (all) | **200 ETB** | Falls back to "all" |
| `null` (before fix) | Rule ID 9: "New tutor in person" (all) | **200 ETB** | Treated as "all" |
| `'Online'` (after fix) | Rule ID 10: "New tutor online" | **100 ETB** | Default value |

### For Experienced Tutors (Using Market Data):

| Session Format Sent | Behavior | Result |
|---------------------|----------|--------|
| `"Online"` | Filters market tutors to ONLY Online packages | Average price of online tutors |
| `"In-person"` | Filters market tutors to ONLY In-person packages | Average price of in-person tutors |
| `"Hybrid"` | Filters market tutors to ONLY Hybrid packages | Average price of hybrid tutors |
| `null` | No filtering (ALL tutors regardless of format) | Average of all tutors (mixed) |

---

## 🧮 Complete Calculation Example

### Scenario: New Tutor with Online Sessions

**Tutor Profile:**
- Account age: 7 days (new)
- Rating: 2.0 (default, no reviews)
- Students: 0
- Credentials: 3 uploaded
- Experience years: 0
- Session format selected: **Online**

**Step-by-Step:**

1. **Check if new:**
   ```python
   tutor_is_new = (0 == 0 or 2.0 <= 2.5) and (7 < 30)
   # Result: True → Use base price rules
   ```

2. **Match base price rule:**
   ```python
   session_format = "Online"
   # Searches base_price_rules table
   # Finds: Rule ID 10 ("New tutor online")
   base_price_per_hour = 100 ETB
   credential_bonus = 30 ETB
   experience_bonus_per_year = 30 ETB
   ```

3. **Calculate bonuses:**
   ```python
   credentials_bonus = 3 credentials × 30 ETB = 90 ETB
   experience_bonus = 0 years × 30 ETB = 0 ETB
   ```

4. **Final price:**
   ```python
   suggested_price = 100 + 90 + 0 = 190 ETB
   ```

5. **Response:**
   ```json
   {
     "suggested_price": 190.0,
     "confidence_level": "medium",
     "factors": {
       "note": "New tutor pricing. Base price rule: New tutor online",
       "is_new_tutor": true,
       "tutor_rating": 2.0,
       "completion_rate": 0.0,
       "student_count": 0,
       "credentials_count": 3,
       "credentials_score": 15,
       "experience_years": 0,
       "experience_score": 0,
       "location": "Megenagna, Yeka, Addis Ababa, Ethiopia",
       "country": "ETHIOPIA"
     }
   }
   ```

---

## 📊 Visual Flow Chart

```
┌─────────────────────────────────────────┐
│  User Interaction                       │
│  - Check "Make an Estimate" checkbox    │
│  OR                                     │
│  - Click "Make an Estimate" in Market   │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  Read Universal Session Format Radio    │
│  input[name="universalSessionFormat"]   │
│  - Online (default)                     │
│  - In-person                            │
│  - Hybrid                               │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  API Request                            │
│  POST /api/market-pricing/suggest-price │
│  {                                      │
│    "time_period_months": 3,             │
│    "session_format": "Online"           │
│  }                                      │
└───────────────┬─────────────────────────┘
                │
                ▼
        ┌───────────────┐
        │ Is Tutor New? │
        └───────┬───────┘
                │
        ┌───────┴────────┐
        │                │
    Yes │                │ No
        ▼                ▼
┌──────────────┐  ┌──────────────────┐
│ Base Price   │  │ Market Data      │
│ Rules Path   │  │ Similarity Path  │
└──────┬───────┘  └────────┬─────────┘
       │                   │
       ▼                   ▼
┌──────────────┐  ┌──────────────────┐
│ Match Rule:  │  │ Filter by Format │
│ - Online     │  │ Calculate 9      │
│   → 100 ETB  │  │ Factor Weights   │
│ - In-person  │  │ Weighted Average │
│   → 200 ETB  │  │ Price            │
│ - Hybrid     │  │                  │
│   → 200 ETB  │  │                  │
└──────┬───────┘  └────────┬─────────┘
       │                   │
       └─────────┬─────────┘
                 │
                 ▼
       ┌─────────────────┐
       │ Add Bonuses:    │
       │ + Credentials   │
       │ + Experience    │
       └────────┬────────┘
                │
                ▼
       ┌─────────────────┐
       │ Return Response │
       │ suggested_price │
       │ confidence      │
       │ factors         │
       └────────┬────────┘
                │
        ┌───────┴────────┐
        │                │
   Make │                │ Market
   Estimate             Trend
        │                │
        ▼                ▼
┌──────────────┐  ┌──────────────────┐
│ Apply to     │  │ Display Cards +  │
│ Hourly Rate  │  │ Suggested Price  │
│ Input        │  │                  │
└──────────────┘  └──────────────────┘
```

---

## 🐛 Common Issues and Solutions

### Issue 1: Different Prices Between Features
**Symptom:** Make an Estimate shows 200 ETB, Market Trend shows 100 ETB

**Cause:** Make an Estimate was using wrong radio button selector

**Solution:** Fixed to use `universalSessionFormat` (✅ Fixed)

---

### Issue 2: "Not Set" in Location Card
**Symptom:** Location card shows "Not Set" even though location is in database

**Cause:** New tutor response didn't include location/country fields

**Solution:** Added location/country to new tutor response path (✅ Fixed)

---

### Issue 3: No Rules for In-person or Hybrid
**Symptom:** In-person and Hybrid both give 200 ETB

**Cause:** Only "Online" and "all" rules exist in database

**Solution (Optional):** Add specific rules:
```sql
INSERT INTO base_price_rules (rule_name, subject_category, session_format, base_price_per_hour, credential_bonus, experience_bonus_per_year, priority, is_active, country, currency)
VALUES
('New tutor in-person', 'all', 'In-person', 200.00, 30.00, 30.00, 2, true, 'ET', 'ETB'),
('New tutor hybrid', 'all', 'Hybrid', 150.00, 30.00, 30.00, 2, true, 'ET', 'ETB');
```

---

## 🎯 Testing Guide

### Test 1: Make an Estimate with Different Formats

1. Open package management modal
2. Select **Online** in universal session format
3. Check "Make an Estimate" checkbox
4. **Expected:** Shows suggested price (e.g., 190 ETB for new tutor with 3 credentials)
5. Repeat with **In-person** and **Hybrid**

**Expected Results:**
- Online: 100 + bonuses
- In-person: 200 + bonuses
- Hybrid: 200 + bonuses

---

### Test 2: Market Trend Consistency

1. Open Market Trend panel
2. Select **Online** in universal session format
3. Click "Make an Estimate"
4. Note the suggested price (e.g., 190 ETB)
5. Go back to package editor
6. Select **Online** in universal session format
7. Check "Make an Estimate" checkbox
8. **Expected:** SAME price as Market Trend (190 ETB) ✅

---

### Test 3: Browser Console Verification

```javascript
// In browser console
fetch('http://localhost:8000/api/market-pricing/suggest-price', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        time_period_months: 3,
        session_format: 'Online'
    })
})
.then(r => r.json())
.then(data => {
    console.log('Online Price:', data.suggested_price);
    console.log('Is New:', data.factors.is_new_tutor);
    console.log('Note:', data.factors.note);
});

// Then test In-person
fetch('http://localhost:8000/api/market-pricing/suggest-price', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        time_period_months: 3,
        session_format: 'In-person'
    })
})
.then(r => r.json())
.then(data => {
    console.log('In-person Price:', data.suggested_price);
});
```

**Expected Console Output:**
```
Online Price: 190
Is New: true
Note: "New tutor pricing. Base price rule: New tutor online"

In-person Price: 290
```

---

## 📝 Summary

### Both Features Now Work Identically:

1. **Read** the same radio button (`universalSessionFormat`)
2. **Send** the same session format to API
3. **Get** the same response
4. **Display** the same price

### Session Format Impact:

| Format | New Tutor Base | With 3 Credentials | With 5 Years Experience |
|--------|----------------|-------------------|------------------------|
| Online | 100 ETB | 190 ETB | 250 ETB |
| In-person | 200 ETB | 290 ETB | 350 ETB |
| Hybrid | 200 ETB | 290 ETB | 350 ETB |
| null (old bug) | 200 ETB | 290 ETB | 350 ETB |

### Key Takeaways:

✅ Both features use the SAME API endpoint
✅ Both features use the SAME radio button (after fix)
✅ Session format affects which base price rule is matched
✅ Online is cheaper (100 ETB) than In-person (200 ETB)
✅ Bonuses apply on top of base price (+30 ETB per credential, +30 ETB per year)
