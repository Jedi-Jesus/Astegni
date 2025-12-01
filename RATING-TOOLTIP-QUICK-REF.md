# Rating Tooltip - Quick Reference Guide

## Visual Layout

```
┌─────────────────────────────────────────┐
│  ★★★★☆  4.1  (227 reviews)            │ ← Hover here
└─────────────────────────────────────────┘
                   ▲
                   │ (Arrow pointing up)
         ┌─────────────────┐
         │ Rating Breakdown │
         ├─────────────────┤
         │ Discipline   4.5 │
         │ ████████████░░░  │ (90% bar)
         │                  │
         │ Punctuality  4.9 │
         │ █████████████░░  │ (98% bar)
         │                  │
         │ Knowledge    4.6 │
         │ █████████████░░  │ (92% bar)
         │                  │
         │ Communication 4.4│
         │ ████████████░░░  │ (88% bar)
         └─────────────────┘
```

## CSS Class Structure

```css
.rating-section              /* Container */
  .rating-wrapper            /* Flex container, hover trigger */
    .rating-stars            /* ★★★★☆ */
    .rating-value            /* 4.1 */
    .rating-count            /* (227 reviews) */
    .rating-tooltip          /* Tooltip popup */
      .rating-metric         /* Each metric row */
        .metric-header       /* Score label + value */
          .metric-label      /* "Discipline" */
          .metric-score      /* "4.5" */
        .metric-bar          /* Progress bar container */
          .metric-fill       /* Colored fill (width: X%) */
```

## Database Field Mapping

| Database Field          | Display Label       | Example Value |
|------------------------|---------------------|---------------|
| `discipline`           | Discipline          | 4.5           |
| `punctuality`          | Punctuality         | 4.9           |
| `knowledge_level`      | Knowledge Level     | 4.6           |
| `communication_skills` | Communication Skills| 4.4           |

## Element IDs for Dynamic Updates

```html
<!-- Stars -->
<div id="rating-stars">★★★★☆</div>

<!-- Overall Rating -->
<span id="tutor-rating">4.1</span>
<span id="rating-count">(227 reviews)</span>

<!-- Tooltip Metrics -->
<span id="rating-discipline">4.5</span>
<div id="bar-discipline" style="width: 90%"></div>

<span id="rating-punctuality">4.9</span>
<div id="bar-punctuality" style="width: 98%"></div>

<span id="rating-knowledge">4.6</span>
<div id="bar-knowledge" style="width: 92%"></div>

<span id="rating-communication">4.4</span>
<div id="bar-communication" style="width: 88%"></div>
```

## Styling Values

| Property | Value | Purpose |
|----------|-------|---------|
| Stars font-size | `1.5rem` | Match tutor-profile |
| Stars letter-spacing | `2px` | Proper star spacing |
| Stars color | `#f59e0b` | Amber/gold color |
| Tooltip min-width | `280px` | Consistent width |
| Tooltip padding | `1rem` | Internal spacing |
| Tooltip border-radius | `12px` | Rounded corners |
| Tooltip z-index | `99999` | Always on top |
| Arrow size | `8px` | Triangle pointer |
| Progress bar height | `6px` | Slim bar |
| Metric margin-bottom | `0.75rem` | Spacing between metrics |

## Animation Timings

```css
opacity: 0 → 1          /* 0.3s ease */
visibility: hidden → visible
top: 110% → 100% + 10px
```

## Color Variables

| Theme | Variable | Value |
|-------|----------|-------|
| Light | `--card-bg` | White |
| Dark | `--card-bg` | `#1f2937` |
| Light | Border | `rgba(0,0,0,0.1)` |
| Dark | Border | `#374151` |

## JavaScript Functions

```javascript
// Update overall rating (stars, value, count)
updateRating(rating, ratingCount)

// Update tooltip breakdown from database
updateRatingBreakdown()
```

## Progress Bar Width Calculation

```javascript
// Score is out of 5
const percentage = (score / 5) * 100;

// Examples:
4.5 / 5 = 0.9  → 90%
4.9 / 5 = 0.98 → 98%
4.6 / 5 = 0.92 → 92%
4.4 / 5 = 0.88 → 88%
```

## Testing Checklist

- [ ] Stars have `letter-spacing: 2px`
- [ ] Stars color is `#f59e0b`
- [ ] Rating value is bold (font-weight: 700)
- [ ] Hover on wrapper shows tooltip
- [ ] Tooltip has arrow pointing up
- [ ] Tooltip fades in smoothly
- [ ] 4 metrics displayed
- [ ] Progress bars match scores
- [ ] Dark mode theme applies
- [ ] Data loads from database
- [ ] Console shows "Rating breakdown updated"

## Quick Debug Commands

```javascript
// Check if data loaded
console.log(tutorData.rating_breakdown);

// Check tooltip visibility
document.getElementById('rating-tooltip').style.opacity;

// Check bar widths
document.getElementById('bar-discipline').style.width;
```

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Tooltip not showing | Incorrect DOM structure | Ensure tooltip is sibling of stars |
| Tooltip clipped | Parent overflow:hidden | Add `overflow:visible !important` |
| Bar width 0% | Missing breakdown data | Check API returns `rating_breakdown` |
| Scores show NaN | Invalid data format | Verify JSON field names match |
| Dark mode broken | Missing CSS variables | Ensure `[data-theme="dark"]` rules exist |

## API Response Example

```json
{
  "id": 65,
  "rating": 4.1,
  "rating_count": 227,
  "rating_breakdown": {
    "discipline": 4.5,
    "punctuality": 4.9,
    "knowledge_level": 4.6,
    "communication_skills": 4.4,
    "retention": 4.7
  }
}
```

---

**🔗 Full Documentation:** `VIEW-TUTOR-RATING-STYLING-COMPLETE.md`
