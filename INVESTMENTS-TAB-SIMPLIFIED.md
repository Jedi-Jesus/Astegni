# Investments Tab Simplified - Summary

## Changes Made

The investments tab in `profile-pages/tutor-profile.html` has been simplified to show only essential ad investment metrics.

### Summary Cards (Top Section)
**Changed from 4 cards to 3 cards:**

1. **Total Investment** - Total amount invested in ETB
2. **Total Impressions** - Total number of impressions/views across all ads
3. **CPM (Cost Per Mille)** - Average cost per 1000 impressions

**Removed:**
- Current Value card
- Return on Investment (ROI) card
- Active Investments card

### Investment Portfolio List
**Simplified card-based list showing essential ad metrics:**

Each investment card displays:
1. **Ad Title & Type** - Name and type of the ad campaign
2. **Content** - Description/content of the ad (if available)
3. **Invested** - Amount invested in ETB with date
4. **Total Impressions** - Number of impressions/views for that ad
   - **CPM (sub-text)** - Cost per 1000 impressions shown below impressions

**Removed:**
- Risk level indicators
- Current value
- ROI percentage
- Maturity dates
- Status badges

## Files Modified

### 1. `profile-pages/tutor-profile.html` (lines 2870-2915)
- Updated summary cards grid from 4 columns to 3 columns
- Changed card IDs: `total-invested`, `total-impressions`, `average-cpm`
- Kept investments as list format with container ID `investments-list`
- List items display as cards with hover effects

### 2. `js/tutor-profile/earnings-investments-manager.js`
- **Updated `updateInvestmentsSummaryUI()` method (lines 728-735)**
  - Now updates only 3 fields: `total-invested`, `total-impressions`, `average-cpm`
  - Calculates average CPM: `(total_invested / total_impressions) * 1000`

- **Updated `renderInvestmentsList()` method (lines 740-784)**
  - Renders card-based list items instead of table rows
  - Each card shows:
    - Ad name and type at the top
    - Content field (if available)
    - 2-column grid: Invested amount | Total Impressions
    - CPM displayed as sub-text under impressions
  - Calculates CPM per investment: `(amount / impressions) * 1000`
  - Shows "Advertisement" as default if `investment_name` is missing
  - Shows "Ad Campaign" as default if `investment_type` is missing

## Data Structure Expected

The backend API should return investment data with these fields:

```javascript
{
  total_invested: 5000.00,        // Total ETB invested
  total_impressions: 150000,      // Total impressions across all ads
  investments: [
    {
      amount: 2500.00,            // Amount invested in this ad
      investment_name: "Math Tutorial Ad",  // Name of the ad
      investment_type: "Video Ad",          // Type of ad
      content: "Promote advanced calculus courses for university students",  // Ad description/content
      impressions: 75000,                   // Impressions for this ad
      investment_date: "2025-01-15"         // Date invested
    },
    // ... more investments
  ]
}
```

## CPM Calculation

**CPM (Cost Per Mille)** = (Total Cost / Total Impressions) × 1000

- **Average CPM** (in summary): Uses total invested / total impressions
- **Individual CPM** (in table): Uses specific ad amount / specific ad impressions

Example:
- Investment: 2,500 ETB
- Impressions: 50,000
- CPM = (2,500 / 50,000) × 1000 = **50 ETB per 1,000 impressions**

## Testing

To test the changes:

1. Open `profile-pages/tutor-profile.html` in browser
2. Navigate to **Earnings & Investments** panel
3. Click on **Investments** tab
4. You should see:
   - 3 summary cards (Total Investment, Total Impressions, CPM)
   - Table with 4 columns showing investment details
   - "No investments yet" message if no data

## Backend Integration Required

The backend endpoint `/api/tutor/investments/summary` should be updated to include:
- `total_impressions` field in the summary
- `impressions` field for each investment object

Current implementation expects these fields for proper CPM calculation.
