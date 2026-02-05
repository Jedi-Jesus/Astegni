# Tutor Card Deep Analysis

## Architecture Overview

The tutor card system in Find Tutors page is built with a **modular, data-driven approach** that separates concerns between JavaScript card creation and CSS styling.

---

## File Structure

### 1. JavaScript Card Creator
**Location**: `js/find-tutors/tutor-card-creator.js`

#### Data Processing (Lines 6-105)
- **Name Construction**: Handles both Ethiopian (first_name + father_name) and International (first_name + last_name) naming conventions
- **Profile Picture**: Uses tutor's picture or generates default avatar based on first name
- **Rating System**: 4-factor breakdown (Subject Matter, Communication, Discipline, Punctuality)
- **Experience**: Counts credentials from database
- **Languages & Grades**: Array handling with fallback to "Not specified"
- **Session Format**: Online/In-person/Hybrid
- **Subjects**: From courses table (max 3 displayed)
- **Connection States**: Tracks favorites, saved, connected, pending, incoming requests

#### Card HTML Structure (Lines 107-365)

##### **Section 1: Header** (Lines 110-191)
```
.tutor-header
├── .tutor-avatar-row (Row 1)
│   ├── .tutor-avatar-container
│   │   └── img.tutor-avatar
│   └── .tutor-actions-top
│       ├── button.favorite-btn
│       └── button.save-btn
├── h3.tutor-name (Row 2)
│   └── span.tutor-education
├── .tutor-meta-row (Row 3)
│   ├── span.tutor-gender
│   └── span.tutor-location
└── .tutor-rating-row (Row 4)
    ├── .tutor-rating
    │   ├── .stars-tooltip-wrapper
    │   │   ├── .stars
    │   │   └── .rating-breakdown-tooltip (hover tooltip)
    │   ├── span.rating-number
    │   └── span.rating-count
    └── span.verified-badge
```

##### **Section 2: Quote** (Lines 193-203)
```
.tutor-quote
└── div.flex
    ├── svg (sparkle icon)
    └── em (quote text)
```

##### **Section 3: Content** (Lines 205-297)
```
.tutor-content
├── .subjects-section
│   ├── h4.detail-label
│   └── p.detail-value
├── .tutor-details-grid (2-column)
│   ├── .detail-item (Languages)
│   └── .detail-item (Grade Level)
├── .additional-details
│   ├── .detail-item (Experience)
│   ├── .detail-item (Session Format)
│   └── .detail-item (Teaches At)
├── .specialization-section (conditional)
└── .bio-section
    ├── h4.detail-label
    └── p.detail-value
```

##### **Section 4: Price** (Lines 299-309)
```
.price-section
└── .tutor-price
    ├── .price-amount (Currency + Amount)
    └── .price-period ("per session")
```

##### **Section 5: Actions** (Lines 311-363)
```
.tutor-actions
├── button.message-btn
└── button (conditional)
    ├── .connect-btn
    ├── .connected-btn (disabled)
    ├── .pending-btn (disabled)
    └── .accept-btn
```

---

## CSS Styling System

### 2. Tutor Card Styles
**Location**: `css/find-tutors/tutor-card.css`

#### Grid Container (Lines 18-63)
- **Default**: `repeat(auto-fit, minmax(350px, 1fr))`
- **Mobile (<768px)**: 1 column
- **Tablet (769-1199px)**: 2 columns
- **Desktop (1200+)**: 3 columns
- **Large (1600+)**: 4 columns

#### Card Base Styles (Lines 65-112)
- Background: `var(--card-bg)`
- Border radius: `1rem`
- Shadow: `var(--tutor-card-shadow)`
- Hover effect: `translateY(-4px)` with enhanced shadow
- Top accent bar: 3px colored line on hover

#### Component Styling

| Component | Key Styles | Lines |
|-----------|-----------|-------|
| Avatar | 70px circle, 3px border, scale on hover | 128-149 |
| Name | 1.1rem, bold, clickable, underline on hover | 191-217 |
| Meta Row | Flex, gap, icons with colors | 219-251 |
| Rating | Stars (0.9rem yellow), number, count, tooltip | 253-305, 404-467 |
| Quote | Left border accent, italic, background tint | 702-731 |
| Subjects | Background tint, border, padding | 1424-1446 |
| Details Grid | 2-column flex, icons, labels, values | 218-242, 308-336 |
| Price | Gradient text, hover effects, shine animation | 629-651, 1337-1395 |
| Action Buttons | Gradients, shadows, hover animations | 983-1141 |

---

## Current Problem: List View Not Implemented

### Issue
The sort bar (line 690 in find-tutors.html) has view toggle buttons:
```html
<button class="view-toggle-btn active" data-view="grid">Grid</button>
<button class="view-toggle-btn" data-view="list">List</button>
```

**But**: No CSS exists to handle `data-view="list"` state on the grid container.

### Expected List View Layout
```
┌────────────────────────────────────────────────────────┐
│ [Avatar]   │ [Content Area]                  │ [Price]     │
│ [Buttons]  │ - Quote                         │ [Message]   │
│            │ - Subjects                      │ [Request]   │
│            │ - Details (Languages, etc.)     │             │
│            │ - Bio                           │             │
└────────────────────────────────────────────────────────┘
```

### Required Changes

1. **Grid Container**: Add list view styling
```css
.tutor-cards-grid[data-view="list"] {
    grid-template-columns: 1fr !important;
}
```

2. **Card Layout**: Change from vertical to horizontal
```css
.tutor-cards-grid[data-view="list"] .tutor-card {
    display: grid;
    grid-template-columns: auto 1fr auto;
    grid-template-rows: auto;
}
```

3. **Section Rearrangement**:
   - Left column: Avatar + Action buttons
   - Center column: Quote, Subjects, Details, Bio
   - Right column: Price + Message/Connect buttons

---

## Data Flow

```
Database → API Endpoint
    ↓
main-controller.js (fetchTutors)
    ↓
TutorCardCreator.createTutorCard(tutor)
    ↓
HTML String Generation
    ↓
DOM Insertion (#tutorCards)
    ↓
CSS Styling Applied
```

---

## Key Features

### 1. **4-Factor Rating System**
- Subject Matter
- Communication
- Discipline
- Punctuality
- Displayed in hover tooltip with progress bars

### 2. **Dynamic States**
- Favorite (heart icon, yellow when active)
- Saved (bookmark icon, blue when active)
- Connection states: Not connected, Pending, Connected, Incoming

### 3. **Responsive Design**
- Stacked layout on mobile
- 2-column grid on tablet
- 3-column grid on desktop
- 4-column grid on large screens

### 4. **Theme Support**
All colors use CSS variables:
- `var(--card-bg)`
- `var(--text)`
- `var(--heading)`
- `var(--button-bg)`
- `var(--border-color)`

### 5. **Animations**
- Card entrance: `cardEntry` keyframes with staggered delay
- Hover effects: translateY, scale, shadow
- Shimmer effect on price section
- Pulse animation on availability status

---

## Performance Considerations

1. **HTML String Generation**: Fast but requires full re-render on updates
2. **CSS Grid**: Hardware-accelerated layout
3. **Lazy Image Loading**: Could be implemented (currently not used)
4. **Animation Delays**: Staggered by `:nth-child()` selector

---

## Accessibility

- **ARIA Labels**: Present on buttons
- **Focus States**: `:focus-visible` with 3px outline
- **Keyboard Navigation**: All buttons clickable
- **Semantic HTML**: `<article>` for cards, proper heading hierarchy
- **Alt Text**: Images have descriptive alt attributes

---

## Missing Features (List View)

Currently, the list view toggle button exists but:
❌ No JavaScript to set `data-view` attribute
❌ No CSS to change layout when `data-view="list"`
❌ No rearrangement of card sections for horizontal layout

**Next Steps**: Implement list view styling and toggle functionality.
