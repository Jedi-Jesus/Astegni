# Market Price Algorithm v2.3 - Separated Experience & Credentials

## Summary

Updated the market pricing similarity score algorithm to **separate Experience Score and Credentials Score** as two distinct factors, providing more accurate tutor matching for price suggestions.

## What Changed

### Previous (v2.2):
- **Experience Score**: Combined both credentials count and years into a single metric
- Used credentials count only (5 points per credential)
- **6 factors total**

### Updated (v2.3):
- **Experience Score**: Based on **years of experience** from credentials (5 points per year, max 100)
- **Credentials Score**: Based on **count of credentials** (5 points per credential, max 100)
- **7 factors total** (separated experience and credentials)

## New Weight Distribution

The similarity score now includes 7 weighted factors:

| Factor | Weight | Description |
|--------|--------|-------------|
| **Rating** | 22% | Tutor reputation (0-5 scale) |
| **Completion Rate** | 18% | Session success rate (quality/reliability) |
| **Student Count** | 16% | Current teaching load |
| **Session Format** | 15% | Online vs In-person pricing |
| **Experience** | 12% | Years of experience from credentials |
| **Credentials** | 10% | Number of uploaded credentials |
| **Account Age** | 7% | Platform tenure |

**Total: 100%**

## Implementation Details

### Database Queries Updated

Both `/suggest-price` and `/market-tutors` endpoints now fetch:

```sql
COALESCE(
    (SELECT COUNT(*) FROM credentials WHERE user_id = tp.user_id),
    0
) as credentials_count,
COALESCE(
    (SELECT SUM(COALESCE(years, 0)) FROM credentials WHERE user_id = tp.user_id),
    0
) as total_experience_years
```

### Score Calculations

```python
# Credentials Score: Count-based
credentials_score = min(100, credentials_count * 5)  # Max 100 at 20+ credentials

# Experience Score: Years-based
experience_score = min(100, total_experience_years * 5)  # Max 100 at 20+ years
```

### Similarity Calculation

```python
# Experience similarity (years-based)
exp_diff = abs(market_experience_score - experience_score) / max(experience_score, market_experience_score, 100)
exp_similarity = 1 - min(exp_diff, 1.0)

# Credentials similarity (count-based)
cred_diff = abs(market_credentials_score - credentials_score) / max(credentials_score, market_credentials_score, 100)
cred_similarity = 1 - min(cred_diff, 1.0)

# Updated weighted similarity (v2.3)
similarity = (
    rating_similarity * 0.22 +
    comp_rate_similarity * 0.18 +
    student_similarity * 0.16 +
    session_format_similarity * 0.15 +
    exp_similarity * 0.12 +
    cred_similarity * 0.10 +
    age_similarity * 0.07
)
```

## API Response Updates

### `/api/market-pricing/suggest-price`

Response now includes:

```json
{
  "factors": {
    "credentials_score": 50,
    "credentials_count": 10,
    "experience_score": 75,
    "experience_years": 15,
    "algorithm_version": "2.3_separated_scores",
    "weights": {
      "rating": "22%",
      "completion_rate": "18%",
      "student_count": "16%",
      "session_format": "15%",
      "experience": "12%",
      "credentials": "10%",
      "account_age": "7%"
    },
    "note": "Experience score = years from credentials (5 pts/year, max 100). Credentials score = count of credentials (5 pts each, max 100)."
  }
}
```

### `/api/market-pricing/market-tutors`

Each tutor object now includes:

```json
{
  "id": 123,
  "experience_score": 75,
  "credentials_score": 50,
  "credentials_count": 10,
  "experience_years": 15,
  "similarity_score": 0.847
}
```

And requester profile includes:

```json
{
  "requester_profile": {
    "experience_score": 60,
    "credentials_score": 40,
    "credentials_count": 8,
    "experience_years": 12
  }
}
```

## Why This Change?

1. **More Accurate Matching**: Separating years of experience from number of credentials provides more nuanced similarity scoring
2. **Better Price Suggestions**: Tutors with similar experience levels AND similar credential counts are more comparable
3. **Clearer Metrics**: Frontend can now display both experience years and credentials count separately
4. **Fair Comparison**: A tutor with 15 years experience and 3 credentials is different from one with 5 years and 15 credentials

## Files Modified

- [market_pricing_endpoints.py](astegni-backend/market_pricing_endpoints.py)
  - Updated `suggest_market_price()` function
  - Updated `get_market_tutors()` function
  - Updated algorithm documentation

## Testing

Test the updated endpoint:

```bash
# Start backend
cd astegni-backend
python app.py

# Test in browser or Postman
POST http://localhost:8000/api/market-pricing/suggest-price
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "time_period_months": 3,
  "session_format": "online"
}
```

## Backward Compatibility

✅ **Fully backward compatible** - no breaking changes to API structure, only additional fields added.

## Version History

- **v2.1**: Initial refined algorithm with 5 factors
- **v2.2**: Added session format as 6th factor
- **v2.3**: Separated experience (years) and credentials (count) as distinct factors (7 total)

---

**Last Updated**: 2026-01-22
**Algorithm Version**: 2.3_separated_scores
