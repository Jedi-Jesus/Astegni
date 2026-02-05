# Market Price Frontend Updates - v2.3

## Summary

Updated the frontend UI components to display separated **Experience Score** (years) and **Credentials Score** (count) in the market pricing analysis, matching the backend v2.3 algorithm changes.

## Files Modified

### 1. [market-trend-functions.js](js/tutor-profile/market-trend-functions.js)

#### Score Cards (marketPriceResult)
**Before:** 6 cards
- Rating, Completion Rate, Active Students, Session Format, Experience Score, Platform Tenure

**After:** 7 cards
- Rating, Completion Rate, Active Students, Session Format
- **Experience (Years)**: Shows years + score (e.g., "5 yrs (25/100)")
- **Credentials Count**: Shows count + score (e.g., "8 (40/100)")
- Platform Tenure

#### Price Breakdown
**Updated weight distribution:**
```
Algorithm v2.3 weights:
- Rating 22%
- Completion 18%
- Students 16%
- Format 15%
- Experience 12%
- Credentials 10%
- Tenure 7%
```

**Breakdown list items:**
- "Your experience: 5 years (score: 25/100)"
- "Your credentials: 8 uploaded (score: 40/100)"

#### Aggregate Function
**Updated `aggregateDataByRating()`:**
```javascript
// v2.3 SEVEN FACTORS (separated experience and credentials)
avgExperienceScore: // Experience score (0-100)
avgExperienceYears: // Years from credentials
avgCredentialsScore: // Credentials score (0-100)
avgCredentialsCount: // Number of credentials
```

#### Table Population
**Updated `populateMarketTable()`:**
```javascript
// v2.3: Display 7 factors + price
row.innerHTML = `
    <td>${data.rating}⭐</td>
    <td>${completionRate}%</td>
    <td>${data.avgStudentCount}</td>
    <td>${data.avgExperienceYears || 0} yrs</td>
    <td>${data.avgCredentialsCount || 0}</td>
    <td>${accountAgeYears} yrs</td>
    <td>${data.avgPrice} ETB</td>
`;
```

### 2. [package-management-modal.html](modals/tutor-profile/package-management-modal.html)

#### Table Headers
**Before:** 6 columns
- Rating, Completion Rate, Student Count, Experience Score, Account Age, Avg Price

**After:** 7 columns
- Rating, Completion Rate, Student Count
- **Experience (Yrs)**: "Years of teaching experience from credentials (v2.3 factor - 12% weight)"
- **Credentials**: "Number of uploaded credentials (v2.3 factor - 10% weight)"
- Account Age, Avg Price

**Updated tooltips:**
- Completion Rate: 18% weight (was 20%)
- Student Count: 16% weight (was 18%)
- Account Age: 7% weight (was 8%)

#### Error Messages
- Updated colspan from 6 to 7 for all error/empty state messages

## Visual Changes

### Score Cards Layout
Grid now displays 7 cards with responsive layout:
```css
grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
```

Each card shows:
- **Label** (e.g., "Experience (Years)")
- **Main value** (e.g., "5 yrs")
- **Score in parentheses** (e.g., "(25/100)")

### Table Layout
Table now has 7 data columns showing:
| Rating | Completion | Students | Experience | Credentials | Tenure | Price |
|--------|-----------|----------|------------|-------------|--------|-------|
| 4.5⭐  | 85%       | 12       | 5.2 yrs    | 8          | 2.5 yrs| 150 ETB|

## Testing

To test the updates:

1. **Start servers:**
```bash
cd astegni-backend
python app.py

# In new terminal
python dev-server.py  # Port 8081
```

2. **Test in browser:**
- Go to http://localhost:8081
- Login as tutor
- Open Package Management Modal
- Navigate to "Pricing Trends" tab
- Click "Make an Estimate" to see price suggestion
- Switch to "Data Table" view to see 7-column table

3. **Expected results:**
- Price suggestion shows 7 score cards
- Breakdown shows separate experience and credentials
- Algorithm version shows "v2.3"
- Weights show 7 factors (22%, 18%, 16%, 15%, 12%, 10%, 7%)
- Table displays 7 columns with separate experience/credentials data

## Backward Compatibility

✅ **Fully backward compatible:**
- Legacy fields maintained in aggregate function
- Falls back to 0 if experience_years or credentials_count missing
- Old API responses with combined experience score still work (shows 0 for years)

## Version Info

- **Frontend Version**: 2.3.1
- **Backend Version**: 2.3_separated_scores
- **Algorithm**: Market Price Similarity v2.3

---

**Last Updated**: 2026-01-22
**Related**: [MARKET_PRICE_V2.3_SEPARATED_SCORES.md](MARKET_PRICE_V2.3_SEPARATED_SCORES.md)
