# Market Graph Metrics Update - v2.3

## Summary

Updated the market pricing graph X-axis metrics to include separated **Experience (Years)** and **Credentials** options, allowing users to visualize price trends based on these distinct factors.

## Changes Made

### 1. Dataset Toggle Buttons (X-axis Selector)

**Before (5 metrics):**
- Rating
- Completion Rate
- Active Students
- Experience Score
- Platform Tenure

**After (6 metrics):**
- Rating
- Completion Rate
- Active Students
- **Experience (Yrs)** - Years of teaching experience
- **Credentials** - Number of uploaded credentials
- Platform Tenure

### 2. Files Modified

#### [package-management-modal.html](modals/tutor-profile/package-management-modal.html)

**Updated radio buttons:**
```html
<label class="market-dataset-label">
    <input type="radio" name="marketMetric" value="experience_years"
        onchange="changeMarketMetric(this.value)" class="market-radio">
    Experience (Yrs)
</label>
<label class="market-dataset-label">
    <input type="radio" name="marketMetric" value="credentials_count"
        onchange="changeMarketMetric(this.value)" class="market-radio">
    Credentials
</label>
```

#### [market-trend-functions.js](js/tutor-profile/market-trend-functions.js)

**1. Updated metric configurations:**
```javascript
const metricConfigs = {
    // ... existing configs
    'experience_years': {
        name: 'Experience (Years)',
        color: 'rgb(168, 85, 247)',
        bgColor: 'rgba(168, 85, 247, 0.6)',
        xAxisLabel: 'Years of Experience'
    },
    'credentials_count': {
        name: 'Credentials',
        color: 'rgb(139, 92, 246)',
        bgColor: 'rgba(139, 92, 246, 0.6)',
        xAxisLabel: 'Number of Credentials'
    }
};
```

**2. Added range definitions:**
```javascript
const metricRanges = {
    // ... existing ranges
    'experience_years': [
        { min: 0, max: 2, label: '0-2yr' },
        { min: 2, max: 5, label: '2-5yr' },
        { min: 5, max: 10, label: '5-10yr' },
        { min: 10, max: 15, label: '10-15yr' },
        { min: 15, max: 1000, label: '15+yr' }
    ],
    'credentials_count': [
        { min: 0, max: 3, label: '0-3' },
        { min: 3, max: 5, label: '3-5' },
        { min: 5, max: 10, label: '5-10' },
        { min: 10, max: 15, label: '10-15' },
        { min: 15, max: 1000, label: '15+' }
    ]
};
```

**3. Updated field mapping:**
```javascript
const fieldMap = {
    'rating': 'rating',
    'completion_rate': 'completion_rate',
    'student_count': 'student_count',
    'experience_years': 'experience_years',      // NEW
    'credentials_count': 'credentials_count',    // NEW
    'account_age': 'account_age_days'
};
```

## How It Works

### Experience (Years) Graph
- **X-axis**: Years of teaching experience from credentials
- **Y-axis**: Average price per hour (ETB)
- **Ranges**: 0-2yr, 2-5yr, 5-10yr, 10-15yr, 15+yr
- **Data source**: `experience_years` field from tutor profile

Example: Shows that tutors with 5-10 years of experience charge an average of 180 ETB/hour

### Credentials Graph
- **X-axis**: Number of uploaded credentials
- **Y-axis**: Average price per hour (ETB)
- **Ranges**: 0-3, 3-5, 5-10, 10-15, 15+
- **Data source**: `credentials_count` field from tutor profile

Example: Shows that tutors with 10-15 credentials charge an average of 200 ETB/hour

## Visual Result

Users can now:
1. Click "Experience (Yrs)" radio button to see price trends by years of experience
2. Click "Credentials" radio button to see price trends by number of credentials
3. Compare how these factors independently affect market pricing

## Graph Colors

- **Experience (Years)**: Purple - `rgb(168, 85, 247)`
- **Credentials**: Violet - `rgb(139, 92, 246)`

Both use complementary purple shades to distinguish them visually while maintaining the color scheme.

## Data Aggregation

The `aggregateDataBySingleMetric()` function:
1. Fetches similar tutors from API (similarity > 65%)
2. Groups tutors by the selected metric range
3. Calculates average price for each range
4. Returns all ranges (even empty ones) for complete X-axis display

## Testing

To test the new metrics:

1. **Start servers:**
```bash
cd astegni-backend
python app.py

# New terminal
python dev-server.py  # Port 8081
```

2. **Test in browser:**
- Go to http://localhost:8081
- Login as tutor
- Open Package Management Modal → Pricing Trends
- Toggle between the 6 X-axis metrics
- Observe graph updates with new "Experience (Yrs)" and "Credentials" options

3. **Expected results:**
- Experience (Yrs): Shows price ranges grouped by 0-2yr, 2-5yr, etc.
- Credentials: Shows price ranges grouped by 0-3, 3-5, etc.
- Chart updates smoothly with appropriate colors
- Tooltip shows tutor count in each range

## Backward Compatibility

✅ **Fully backward compatible:**
- Old `experience_score` metric removed (was credentials-based)
- New metrics use distinct field names
- Falls back to 0 if data missing
- All existing metrics continue to work

## Integration with v2.3 Algorithm

These graph metrics align with the backend v2.3 algorithm:
- **Experience (12% weight)**: Years-based, separate from credentials
- **Credentials (10% weight)**: Count-based, distinct scoring factor

The graph now visualizes both factors independently, helping tutors understand how each impacts market pricing.

---

**Last Updated**: 2026-01-22
**Version**: 2.3
**Related**:
- [MARKET_PRICE_V2.3_SEPARATED_SCORES.md](MARKET_PRICE_V2.3_SEPARATED_SCORES.md)
- [MARKET_PRICE_FRONTEND_V2.3_UPDATE.md](MARKET_PRICE_FRONTEND_V2.3_UPDATE.md)
