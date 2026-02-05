# Feature Assignment Layout Update

## Overview
Updated the Assign Features modal to use a left-right split layout with improved UX. Plans list now hides after selection, and the interface is more intuitive.

## Changes Made

### 1. Layout Restructure

**Before:**
- Step 1: Search, Filter, Plans List, Selected Plan Display (all stacked vertically)
- Step 2: Feature Assignment (below Step 1)
- Submit buttons at bottom

**After:**
- **Left Column (1/3 width):**
  - Select Plan heading
  - Selected Plan Display (appears after selection)
  - Search by Name input
  - Filter by Role dropdown
  - Available Plans list (scrollable, hides after selection)

- **Right Column (2/3 width):**
  - Empty state (when no plan selected)
  - Feature Assignment section (when plan selected)
    - Role tabs
    - Feature panels (scrollable)

- Submit buttons at bottom (Save button hidden until plan selected)

### 2. Interaction Flow

**Initial State:**
- Left: Search, Filter, Plans List visible
- Right: Empty state showing "Select a Plan" message
- Save button: Hidden

**After Selecting Plan:**
- Left:
  - Selected plan card appears at top (highlighted in indigo)
  - Plans list HIDES
  - Search and Filter remain visible
- Right:
  - Empty state HIDES
  - Feature assignment section appears
  - Role tabs visible
  - First role (Tutor) automatically selected
- Save button: Visible

**After Clicking "Change" on Selected Plan:**
- Left: Plans list shows again
- Right: Empty state shows again
- Save button: Hidden
- Features cleared

### 3. Visual Improvements

#### Plan Cards (Compact Design)
- Reduced padding (p-2.5 instead of p-3)
- Smaller text (text-sm for name, text-xs for price)
- Smaller icons (text-sm)
- Truncated long plan names
- "POPULAR" badge changed to "HOT" for space
- Hover effects: bg-indigo-50, border-indigo-300

#### Selected Plan Display
- Now shows at TOP of left column
- Displays plan name AND price
- Highlighted with indigo border (border-2 border-indigo-300)
- Indigo background (bg-indigo-50)
- "Change" button with icon

#### Empty State
- Centered on right side
- Large hand pointer icon (text-4xl)
- Clear message: "Select a Plan"
- Subtext: "Choose a subscription plan from the left to assign features"

### 4. JavaScript Changes

#### `selectPlanForFeatures()` Updated
```javascript
// Now also:
- Sets plan price in selected display
- HIDES plans list
- Shows empty state transition
- Shows save button
```

#### `clearSelectedPlan()` Updated
```javascript
// Now also:
- SHOWS plans list again
- Shows empty state
- Hides save button
```

#### `openAssignFeaturesModal()` Updated
```javascript
// Now also:
- Shows plans list initially
- Shows empty state initially
- Hides save button initially
```

#### Plan Card Rendering Updated
- Compact card design
- Better truncation for long names
- Smaller badges and icons

### 5. HTML Structure

```html
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
  <!-- LEFT: 1/3 width -->
  <div class="lg:col-span-1">
    <div class="sticky top-0">
      <!-- Selected Plan Display -->
      <!-- Search Input -->
      <!-- Filter Dropdown -->
      <!-- Plans List (hides after selection) -->
    </div>
  </div>

  <!-- RIGHT: 2/3 width -->
  <div class="lg:col-span-2">
    <!-- Empty State (initial) -->
    <!-- Feature Assignment Section (after selection) -->
  </div>
</div>
```

## Benefits

### 1. Better Space Utilization
- Left sidebar for selection (always accessible)
- Right area for detailed work (2x the space)
- No need to scroll past plan list to see features

### 2. Improved Workflow
- Plan list hides after selection (reduces clutter)
- Selected plan always visible at top
- Easy to change plan without scrolling
- Search/filter always accessible

### 3. Visual Clarity
- Clear left-right separation
- Empty state guides user
- Selected plan prominently displayed
- Save button only shown when relevant

### 4. Mobile Responsive
- `grid-cols-1` on mobile (stacked)
- `lg:grid-cols-3` on large screens (side-by-side)
- Sticky positioning on left column

## Files Modified

1. **admin-pages/manage-system-settings.html**
   - Restructured modal body with grid layout
   - Added `selected-plan-price` element
   - Added `feature-assignment-empty-state` element
   - Added `save-features-btn` with hidden class
   - Moved plans list inside left column
   - Added max-height with scrolling to both sides

2. **admin-pages/js/admin-pages/feature-assignment-manager.js**
   - Updated `selectPlanForFeatures()` to hide plans list
   - Updated `clearSelectedPlan()` to show plans list
   - Updated `openAssignFeaturesModal()` for initial state
   - Updated plan card rendering (compact design)
   - Added plan price to selected display

## Testing Checklist

- [x] Modal opens with plans list visible
- [x] Empty state shows on right initially
- [x] Save button hidden initially
- [x] Selecting plan hides plans list
- [x] Selecting plan shows selected card at top
- [x] Selecting plan shows feature assignment
- [x] Selecting plan shows save button
- [x] Selected plan displays name and price
- [x] "Change" button shows plans list again
- [x] "Change" button hides features
- [x] "Change" button hides save button
- [x] Search works when plan selected
- [x] Filter works when plan selected
- [x] Role tabs switch correctly
- [x] Compact plan cards render correctly
- [x] Layout responsive on mobile
- [x] Scrolling works on both columns

## Summary

The updated layout provides a cleaner, more intuitive interface for assigning features to subscription plans. The left-right split keeps selection controls accessible while providing ample space for feature management. The plans list intelligently hides after selection to reduce clutter while remaining accessible via the "Change" button.

Key improvements:
- Plans list hides after selection
- Selected plan always visible at top
- Empty state guides users
- Save button only shown when needed
- Compact plan cards for better scanning
- Better space utilization with 1/3 - 2/3 split
