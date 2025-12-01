# View Tutor Packages - Dynamic Loading from Database (ENHANCED)

## Summary

The packages panel in `view-tutor.html` has been **fully enhanced** to load dynamically from the `tutor_packages` table with comprehensive package information including:

✅ **Courses/Subjects** taught
✅ **Schedule type** with specific days and times
✅ **Payment frequency** (Monthly, Bi-weekly, etc.)
✅ **Multi-tier discounts** (1 Month, 6 Months, 1 Year)
✅ **Session duration** and total sessions
✅ **Beautiful discount badges** with color coding
✅ **Smart feature extraction** from database fields

## Changes Made

### 1. HTML Changes (`view-profiles/view-tutor.html`)

**Before:**
- Hardcoded single "Basic Package" card
- Static price, features, and button

**After:**
- Empty container with "Loading packages..." message
- Dynamically populated by JavaScript from database

```html
<div class="packages-grid grid grid-cols-1 md:grid-cols-3 gap-4">
    <!-- Packages will be populated dynamically from database via view-tutor-db-loader.js -->
    <div style="text-align: center; padding: 2rem; color: var(--text-muted); font-style: italic; grid-column: 1 / -1;">
        Loading packages...
    </div>
</div>
```

### 2. JavaScript Changes (`js/view-tutor/view-tutor-db-loader.js`)

**Enhanced `populatePackagesPanel()` method (Lines 1121-1274):**

**NEW FEATURES ADDED:**
1. **📚 Courses Display**
   - Shows all subjects/courses taught in the package
   - Handles both string and array formats
   - Example: "Algebra, Geometry, Trigonometry"

2. **📅 Schedule Type with Days and Times**
   - **Recurring schedules**: Shows specific days (e.g., "Monday, Wednesday, Friday")
   - **Time ranges**: Displays start and end times (e.g., "14:00 - 15:30")
   - **Flexible schedules**: Shows "Flexible" label
   - **Days per week**: Falls back to count if specific days not available

3. **💳 Payment Frequency**
   - Monthly
   - Bi-weekly (2-weeks)
   - Other custom frequencies

4. **🎁 Multi-Tier Discount Badges**
   - **1 Month discount**: Green badge
   - **6 Month discount**: Blue badge
   - **1 Year discount**: Purple badge
   - Beautiful color-coded badges with emoji
   - "🔥 DISCOUNTS" ribbon in top-right corner when discounts available

**Display Features:**
- Package name
- Session price (ETB)
- Discount badges (color-coded)
- Description
- Smart features list with icons:
  - 📚 Courses
  - ✔ Session duration
  - 📅 Schedule (days + times)
  - ✔ Total sessions
  - ✔ Session format (Online/In-person/Both)
  - ✔ Grade level
  - 💳 Payment frequency
- "Request Session" button
- Empty state with friendly message

**Key Features:**
- Automatically formats duration (converts minutes to "X hours Y min")
- Shows session format (Online, In-person, Both)
- Displays recurring schedule information with specific days and times
- Shows all discount tiers with beautiful badges
- Smart feature extraction from all available fields
- Hover effects on cards and buttons
- Theme-aware styling using CSS variables

### 3. Backend Endpoint (ENHANCED)

**Endpoint:** `GET /api/view-tutor/{tutor_id}/packages`

**File:** `astegni-backend/view_tutor_endpoints.py` (Lines 454-512)

**ENHANCEMENTS MADE:**
- ✅ Added `hours_per_day` field
- ✅ Added `payment_frequency` field
- ✅ Added `discount_12_month` field (1 year discount)
- ✅ Added `days_per_week` to response
- ✅ Improved price calculations using hours_per_day

**Returns:**
```json
{
  "packages": [
    {
      "id": 1,
      "name": "Mathematics Complete Package",
      "grade_level": "Grade 9-10",
      "courses": "Algebra, Geometry, Trigonometry",
      "description": "Comprehensive mathematics package covering all Grade 9-10 topics",
      "session_format": "both",
      "schedule_type": "recurring",
      "recurring_days": ["Monday", "Wednesday", "Friday"],
      "start_time": "14:00:00",
      "end_time": "15:30:00",
      "session_duration": 1.5,
      "duration_minutes": 90,
      "hours_per_day": 1.5,
      "days_per_week": 3,
      "payment_frequency": "monthly",
      "total_sessions": 12,
      "session_price": 375.00,
      "package_price": 4500.00,
      "discount_1_month": 0,
      "discount_3_month": 10,
      "discount_6_month": 15,
      "discount_12_month": 20,
      "is_active": true
    }
  ]
}
```

## Database Table

**Table:** `tutor_packages`

**Key Columns:**
- `id` - Package ID
- `tutor_id` - Foreign key to users table
- `name` - Package name
- `grade_level` - Target grade level
- `courses` - Subjects covered (string or JSON)
- `description` - Package description
- `session_format` - "online", "in-person", "both"
- `schedule_type` - "recurring", "flexible"
- `schedule_days` - Comma-separated days
- `start_time` - Session start time
- `end_time` - Session end time
- `session_duration` - Duration in hours (float)
- `hourly_rate` - Price per hour
- `days_per_week` - Number of days per week
- `discount_1_month` - 1-month discount percentage
- `discount_3_month` - 3-month discount percentage
- `discount_6_month` - 6-month discount percentage
- `is_active` - Package availability

## Testing Instructions

### 1. Ensure Backend is Running

```bash
cd astegni-backend
python app.py
```

Backend should be running on `http://localhost:8000`

### 2. Seed Sample Packages (if needed)

```bash
cd astegni-backend
python seed_tutor_packages.py
```

This creates sample packages for existing tutors.

### 3. Start Frontend Server

```bash
# From project root
python -m http.server 8080
```

### 4. View Tutor Profile

Open browser to:
```
http://localhost:8080/view-profiles/view-tutor.html?id=1
```

Replace `1` with an actual tutor ID from your database.

### 5. Navigate to Packages Panel

1. Click on "Packages" in the navigation tabs
2. You should see package cards loaded from the database

### 6. Expected Results

**If packages exist:**
- Multiple package cards in a 3-column grid (responsive)
- Each card shows:
  - Package name
  - Price in ETB
  - Description (if available)
  - Feature list with checkmarks
  - "Request Session" button

**If no packages exist:**
- Friendly empty state message:
  - 📦 icon
  - "No packages available"
  - "This tutor hasn't created any packages yet."

**Loading state:**
- While data loads, shows "Loading packages..." message

## Troubleshooting

### Packages not loading

1. **Check browser console** for errors:
   - Press F12 → Console tab
   - Look for network errors or JavaScript errors

2. **Verify backend endpoint**:
   - Open `http://localhost:8000/api/view-tutor/1/packages`
   - Should return JSON with packages array

3. **Check database**:
   ```sql
   SELECT * FROM tutor_packages WHERE tutor_id = 1 AND is_active = TRUE;
   ```

4. **Verify tutor ID**:
   - Make sure you're using a valid tutor ID in the URL
   - Check: `SELECT id FROM users WHERE roles::jsonb ? 'tutor' LIMIT 10;`

### Styling issues

- Make sure `view-tutor.html` loads the CSS files correctly
- Check that CSS variables are defined in `css/root/theme.css`
- Clear browser cache (Ctrl+Shift+R)

### "Request Session" button not working

- Check if `openRequestModal()` function is defined
- Look for JavaScript errors in console
- Verify the function is accessible globally

## Additional Features

### Smart Feature Display

The code intelligently builds features based on available data:

1. **Session Duration**: "1 hour 30 min" or "60 minutes"
2. **Sessions/Month**: "12 sessions/month"
3. **Session Format**: "Online & In-person" or "Online" or "In-person"
4. **Grade Level**: Direct display
5. **Courses**: Comma-separated list
6. **Schedule Type**: "3 days/week" or "Flexible schedule"
7. **Discounts**: "10% off for 3 months"

Only shows features that have data, making each card clean and informative.

### Theme Support

All colors use CSS variables for automatic dark/light mode support:
- `var(--card-bg)` - Card background
- `var(--heading)` - Headings color
- `var(--text)` - Body text
- `var(--text-muted)` - Secondary text
- `var(--border-color)` - Borders

### Responsive Design

Uses Tailwind CSS grid classes:
- Desktop: 3 columns (`md:grid-cols-3`)
- Tablet: 1-2 columns (auto-adjusts)
- Mobile: 1 column (`grid-cols-1`)

## Success Criteria

✅ Hardcoded HTML removed from view-tutor.html
✅ Dynamic container with loading state added
✅ `populatePackagesPanel()` method enhanced with beautiful styling
✅ Packages load from `tutor_packages` table via API
✅ Empty state handled gracefully
✅ Theme-aware styling implemented
✅ Responsive grid layout maintained
✅ Feature extraction logic implemented
✅ Hover effects on cards and buttons

## Next Steps (Optional Enhancements)

1. **Add package filtering**: Filter by grade level, price range, or subject
2. **Add sorting**: Sort by price, popularity, or rating
3. **Add package comparison**: Side-by-side comparison feature
4. **Add favorite packages**: Let students save favorite packages
5. **Add package reviews**: Show reviews specific to each package
6. **Add promotional badges**: "Popular", "Best Value", "New" badges
7. **Add calendar integration**: Show available time slots for each package
8. **Add package bundles**: Group related packages together

## Visual Example

### Package Card Display

Each package card now displays:

```
┌─────────────────────────────────────────────┐
│                         🔥 DISCOUNTS         │ (if discounts available)
│                                              │
│  Mathematics Complete Package                │ (Package Name)
│  ETB 375/session                            │ (Price)
│                                              │
│  🎁 10% OFF - 6 Months  🎁 20% OFF - 1 Year│ (Discount Badges)
│                                              │
│  Comprehensive mathematics package...        │ (Description)
│                                              │
│  📚 Courses: Algebra, Geometry, Trig        │
│  ✔ 1 hour 30 min per session                │
│  📅 Schedule: Mon, Wed, Fri (14:00-15:30)   │
│  ✔ 12 sessions/month                        │
│  ✔ Online & In-person                       │
│  ✔ Grade 9-10                               │
│  💳 Payment: Monthly                         │
│                                              │
│  ┌─────────────────────────────────────┐    │
│  │      Request Session                │    │ (Button)
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

### Discount Badge Colors

- **Green** (#10b981): 1 Month discount
- **Blue** (#3b82f6): 6 Month discount
- **Purple** (#8b5cf6): 1 Year discount

### Schedule Display Examples

1. **Recurring with specific days:**
   - `📅 Schedule: Monday, Wednesday, Friday (14:00 - 15:30)`

2. **Recurring with day count:**
   - `📅 Schedule: 3 days/week`

3. **Flexible schedule:**
   - `📅 Schedule: Flexible`

### Payment Frequency Display

- `monthly` → **Monthly**
- `2-weeks` → **Bi-weekly**
- Custom values displayed with capitalization

## Files Modified

### 1. Backend
✅ `astegni-backend/view_tutor_endpoints.py` - Lines 461-510
   - Added `hours_per_day`, `payment_frequency`, `discount_12_month` to query
   - Updated response mapping with new fields
   - Improved price calculations

### 2. Frontend
✅ `view-profiles/view-tutor.html` - Lines 1173-1184
   - Removed hardcoded package HTML
   - Added dynamic container with `.packages-grid` class

✅ `js/view-tutor/view-tutor-db-loader.js` - Lines 1121-1274
   - Enhanced `populatePackagesPanel()` method
   - Added courses display
   - Added schedule with days and times
   - Added payment frequency
   - Added multi-tier discount badges
   - Added "DISCOUNTS" ribbon

## Files Already in Place (No changes needed)

1. ✅ `astegni-backend/seed_tutor_packages.py` - Sample data script exists
2. ✅ Database table `tutor_packages` - Already created with all required fields

---

**Status:** ✅ **FULLY ENHANCED** and ready for testing
**Last Updated:** 2025-10-24

## Summary of Enhancements

| Feature | Status | Description |
|---------|--------|-------------|
| Courses Display | ✅ | Shows all subjects taught |
| Schedule Type | ✅ | Recurring/Flexible with specific days |
| Schedule Times | ✅ | Start and end times (e.g., 14:00-15:30) |
| Payment Frequency | ✅ | Monthly, Bi-weekly, etc. |
| 1 Month Discount | ✅ | Green badge |
| 6 Month Discount | ✅ | Blue badge |
| 1 Year Discount | ✅ | Purple badge |
| Discount Ribbon | ✅ | "🔥 DISCOUNTS" corner badge |
| Session Duration | ✅ | Hours and minutes display |
| Total Sessions | ✅ | Sessions per month |
| Session Format | ✅ | Online/In-person/Both |
| Grade Level | ✅ | Target grade display |
| Dynamic Loading | ✅ | From database via API |
| Empty State | ✅ | Friendly message when no packages |
| Theme Support | ✅ | Dark/Light mode compatible |
| Responsive Design | ✅ | Mobile, tablet, desktop |
