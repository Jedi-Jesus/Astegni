# Earnings Section Toggle - Implementation Complete

## Overview
Implemented clickable stat cards in the Earnings & Investments panel that toggle between different earnings sections, allowing users to view specific income streams individually or all combined.

## What Was Implemented

### 1. **Clickable Stat Cards** ✅
All four stat cards in the earnings tab are now clickable:
- **Total Earnings** (Green) - Shows all earnings combined
- **Direct Affiliate** (Blue) - Shows only direct affiliate earnings
- **Indirect Affiliate** (Purple) - Shows only indirect affiliate earnings
- **Tutoring Sessions** (Orange) - Shows only tutoring session earnings

**Visual Indicators:**
- `cursor-pointer` class for hover cursor change
- `hover:shadow-lg` for elevation on hover
- "Click to view" text on each card
- Active card shows blue ring (`ring-2 ring-blue-500`)
- Active card scales up slightly (`transform: scale(1.02)`)

### 2. **Total Earnings Section** ✅
Created a new comprehensive section that shows all earnings combined:

**Features:**
- **Single-line Chart** showing total earnings trend:
  - Solid green line (thick) with filled area
  - Clean, focused visualization
  - No legend (single line doesn't need one)
- Interactive chart with hover tooltips
- Combines data from all three sources (direct affiliate, indirect affiliate, tutoring)
- Sorted by date (newest first)
- Color-coded icons to distinguish earning types:
  - 👥 Blue circle for Direct Affiliate
  - 🔗 Purple circle for Indirect Affiliate
  - 📚 Orange circle for Tutoring Sessions
- Period selector (1, 3, 6, 12 months)
- Maximum 50 items from each source

**Location:** First section shown by default

### 3. **Section Visibility Toggle** ✅
Implemented intelligent section switching:

**Behavior:**
- Only ONE section visible at a time
- Clicking a stat card hides all other sections
- Active card gets visual highlight (ring + scale)
- Smooth fade-in animation (0.3s) when section appears
- Total Earnings section shown by default on panel load

**Sections:**
- `total-earnings-section` - Combined view
- `direct-affiliate-section` - Direct affiliate only
- `indirect-affiliate-section` - Indirect affiliate only
- `tutoring-earnings-section` - Tutoring sessions only

### 4. **JavaScript Functions** ✅

**New Functions Added:**
```javascript
toggleEarningsSection(section)
```
- Handles card clicks and section visibility
- Updates active state styling
- Manages section show/hide logic

```javascript
initializeTotalEarningsChart()
```
- Creates single-line Chart.js chart showing total earnings trend
- Solid green line with filled area
- Interactive tooltips with ETB formatting
- No legend (clean single-line design)
- Responsive and updates on period change

```javascript
loadTotalEarningsData()
```
- Fetches data from all three endpoints in parallel
- Calls `renderTotalEarningsList()`
- Reloads chart when period selector changes

```javascript
renderTotalEarningsList(directData, indirectData, tutoringData)
```
- Combines and sorts all earnings by date
- Renders unified list with type indicators
- Handles empty states

**Updated Functions:**
- `EarningsInvestmentsManager.init()` - Now loads total earnings data and chart
- `EarningsInvestmentsManager.initializeCharts()` - Added total earnings chart initialization
- `loadEarningsDetails()` - Added total earnings data loading
- Panel initialization - Automatically shows total section on load

### 5. **CSS Styling** ✅

**Added to `css/tutor-profile/tutor-profile.css`:**
```css
.active-earnings-card - Scales and elevates active card
.earnings-section - Fade-in animation for sections
@keyframes fadeIn - Smooth appearance animation
```

**Features:**
- Smooth transitions (0.3s ease)
- Hover effects on stat cards
- Scale transform on active card
- Dark theme support
- Responsive design maintained

## Files Modified

### 1. `profile-pages/tutor-profile.html`
- ✅ Added `onclick="toggleEarningsSection()"` to all stat cards
- ✅ Added `cursor-pointer` and hover classes
- ✅ Created Total Earnings section with period selector
- ✅ Added `id` and `hidden` class to all sections
- ✅ Added "Click to view" text hints

### 2. `js/tutor-profile/earnings-investments-manager.js`
- ✅ Added `currentSection` state tracking
- ✅ Added `total` to `currentPeriod` object
- ✅ Created `loadTotalEarningsData()` method
- ✅ Created `renderTotalEarningsList()` method
- ✅ Added global `toggleEarningsSection()` function
- ✅ Added global `loadTotalEarningsData()` function
- ✅ Updated initialization to show total section by default

### 3. `css/tutor-profile/tutor-profile.css`
- ✅ Added earnings section toggle styles
- ✅ Added active card styling
- ✅ Added fade-in animation
- ✅ Added dark theme support

## How It Works

### User Flow:
1. User navigates to Earnings & Investments panel
2. **Total Earnings section** shown by default with all earnings
3. User clicks on any stat card (Direct, Indirect, or Tutoring)
4. Only that specific section is shown with its chart and list
5. Previously active section is hidden
6. Clicked card shows blue ring indicator
7. Section fades in with smooth animation

### Data Flow:
```
Panel Load
  ↓
Load Summary (API: /api/tutor/earnings/summary)
  ↓
Load All Details in Parallel:
  - Total Earnings (combines all 3 sources)
  - Direct Affiliate (API: /api/tutor/earnings/direct-affiliate)
  - Indirect Affiliate (API: /api/tutor/earnings/indirect-affiliate)
  - Tutoring Sessions (API: /api/tutor/earnings/tutoring)
  ↓
Show Total Earnings Section by default
  ↓
User clicks card → Toggle section visibility
```

## Testing Checklist

- [ ] Click Total Earnings card - should show combined chart and list
- [ ] Verify Total Earnings chart shows single green line with filled area
- [ ] Hover over chart to see interactive tooltips with ETB values
- [ ] Test Total Earnings period selector - chart should update
- [ ] Verify no legend on Total Earnings chart (clean design)
- [ ] Click Direct Affiliate card - should show only direct affiliate section with graph
- [ ] Click Indirect Affiliate card - should show only indirect section with graph
- [ ] Click Tutoring Sessions card - should show only tutoring section with graph
- [ ] Verify only one section visible at a time
- [ ] Check active card has blue ring indicator
- [ ] Test period selectors in each section
- [ ] Verify smooth animations
- [ ] Test in dark mode
- [ ] Check responsive design on mobile

## API Endpoints Used

1. **Summary Data:**
   - `GET /api/tutor/earnings/summary?months=6`
   - Updates stat card values

2. **Total Earnings (Combined):**
   - `GET /api/tutor/earnings/direct-affiliate?limit=50`
   - `GET /api/tutor/earnings/indirect-affiliate?limit=50`
   - `GET /api/tutor/earnings/tutoring?limit=50`
   - Fetched in parallel, combined and sorted

3. **Individual Sections:**
   - Same endpoints as above but with limit=20-25
   - Used when viewing specific sections

## Key Features

### Visual Indicators
- 💰 **Green card** = Total Earnings (all sources)
- 👥 **Blue card** = Direct Affiliate only
- 🔗 **Purple card** = Indirect Affiliate only
- 📚 **Orange card** = Tutoring Sessions only

### Total Earnings Chart
The chart displays a single clean line:
- **Solid green line (thick, filled area)** - Total Earnings trend

**Chart Features:**
- Interactive tooltips on hover showing exact amounts
- No legend (clean single-line design)
- ETB currency formatting on Y-axis
- Responsive height (300px - taller than individual charts)
- Smooth curves (tension: 0.4)
- Point markers with white borders for each data point
- Y-axis grid lines only (cleaner look)

### Total Earnings List Format
Each item shows:
- Type indicator icon (in colored circle)
- Profile picture (for direct affiliate & tutoring)
- Name and relationship info
- Earning type label
- Date earned
- Amount in ETB
- Commission percentage (for affiliates)
- Status badge (completed/pending)

### Section Organization
```
Earnings Tab Content
├── Stat Cards (4 clickable cards)
└── Sections (only 1 visible at a time)
    ├── Total Earnings Section (default)
    ├── Direct Affiliate Section
    ├── Indirect Affiliate Section
    └── Tutoring Earnings Section
```

## Benefits

1. **Better UX** - Users can focus on specific income streams
2. **Clear Overview** - Total earnings section provides complete picture
3. **Visual Feedback** - Active card clearly indicated with ring
4. **Smooth Transitions** - Professional fade-in animations
5. **Responsive** - Works on all screen sizes
6. **Consistent** - Follows existing design patterns
7. **Accessible** - Click targets are large and clear

## Implementation Notes

- Default view shows Total Earnings (most useful for overview)
- Each section maintains its own period selector
- Charts remain in individual sections (not in total view)
- All data cached after initial load for fast switching
- Empty states handled gracefully
- Error handling included for API failures

## Next Steps (Optional Enhancements)

1. Add "View All" button in each section to jump to Total view
2. Remember last viewed section in localStorage
3. Add keyboard shortcuts (1, 2, 3, 4 for sections)
4. Add export functionality for earnings data
5. Add date range picker for custom periods
6. Add comparison mode (compare months/years)
7. Add earnings trends/insights cards

---

**Status:** ✅ Complete and Ready for Testing
**Date:** 2025-10-28
**Impact:** Significant UX improvement for earnings tracking
