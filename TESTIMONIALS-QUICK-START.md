# Testimonials Widget - Quick Start Guide

## How It Works (Simple Explanation)

1. **Admin selects reviews** → Check boxes next to good reviews
2. **Admin clicks "Feature Reviews"** → Reviews saved to database
3. **Widget automatically displays them** → Shows in ad-placeholder on pages

## Add to Any Page (3 Steps)

### Step 1: Add CSS (in `<head>`)
```html
<link rel="stylesheet" href="../css/root/testimonials-widget.css">
```

### Step 2: Add Container (where you want testimonials to appear)
```html
<div id="testimonials-container"></div>
```

### Step 3: Add JavaScript (before `</body>`)
```html
<script src="../js/root/testimonials-widget.js"></script>
<script>
    document.addEventListener('DOMContentLoaded', () => {
        TestimonialsWidget.init('testimonials-container', 'parent-profile', 6);
    });
</script>
```

## Example: Parent Profile Integration

### Find the ad-placeholder section:
```html
<!-- In profile-pages/parent-profile.html -->
<aside class="right-widgets">
    <div class="ad-placeholder">
        <!-- OLD: Static ad or empty -->

        <!-- NEW: Add this container -->
        <div id="parent-testimonials"></div>
    </div>
</aside>
```

### Add the scripts before `</body>`:
```html
<!-- Before closing </body> tag -->
<script src="../js/root/testimonials-widget.js"></script>
<script>
    document.addEventListener('DOMContentLoaded', () => {
        TestimonialsWidget.init(
            'parent-testimonials',     // Container ID
            'parent-profile',          // Page location
            6                          // Max testimonials
        );
    });
</script>
```

### Add CSS in `<head>`:
```html
<head>
    <!-- Existing CSS -->
    <link rel="stylesheet" href="../css/root/testimonials-widget.css">
</head>
```

## Location Values

Use these for the second parameter:

| Value | Where It Shows |
|-------|---------------|
| `'all'` | All pages |
| `'parent-profile'` | Parent profile pages |
| `'student-profile'` | Student profile pages |
| `'tutor-profile'` | Tutor profile pages |
| `'home'` | Home/index page |

## Admin Workflow

### To Feature Reviews:

1. Go to: **System Settings** → **Manage Reviews**
2. Filter reviews (optional):
   - Click role cards (Students, Tutors, Parents, Advertisers)
   - Click star buttons (5★, 4★, etc.)
3. Check the boxes next to great reviews (3-6 recommended)
4. Select location from dropdown:
   - "All Pages" - Shows everywhere
   - "Parent Profile" - Shows only on parent pages
   - etc.
5. Click **"Feature Reviews"** button
6. Success! Reviews now appear on that page

### To See Them Live:

1. Open the page (e.g., `parent-profile.html`)
2. Testimonials automatically load in the container
3. They auto-rotate every 5 seconds
4. Click prev/next arrows to navigate manually

## What You Get

✅ Beautiful carousel with star ratings
✅ Auto-rotating testimonials (every 5 seconds)
✅ Manual navigation (prev/next arrows)
✅ Dot indicators for quick jumping
✅ Reviewer name, photo, and role
✅ Fully responsive design
✅ Smooth animations

## Troubleshooting

**Problem:** Testimonials don't appear
- **Check:** Backend server is running (`python app.py`)
- **Check:** You featured some reviews in admin panel
- **Check:** Container ID matches in HTML and JavaScript
- **Check:** Browser console for errors (F12)

**Problem:** Wrong testimonials showing
- **Check:** Location parameter matches page type
- **Example:** Use `'parent-profile'` for parent pages

**Problem:** No reviews to feature
- **Solution:** Seed some reviews first:
  ```bash
  cd astegni-backend
  python seed_astegni_reviews.py
  ```

## Full Example (Copy-Paste Ready)

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Parent Profile</title>
    <!-- Your existing CSS -->
    <link rel="stylesheet" href="../css/root/testimonials-widget.css">
</head>
<body>
    <!-- Your page content -->

    <!-- Right sidebar with testimonials -->
    <aside class="right-widgets">
        <div class="ad-placeholder">
            <div id="parent-testimonials"></div>
        </div>
    </aside>

    <!-- Your existing scripts -->
    <script src="../js/root/testimonials-widget.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            TestimonialsWidget.init('parent-testimonials', 'parent-profile', 6);
        });
    </script>
</body>
</html>
```

That's it! You're done! 🎉

## API Endpoints (For Reference)

**Feature reviews (admin):**
```http
POST /api/admin/reviews/feature
{
    "review_ids": [4, 5, 6],
    "display_location": "parent-profile"
}
```

**Get featured reviews (public):**
```http
GET /api/featured-reviews?location=parent-profile&limit=6
```

Response shows reviewer name, photo, role, rating, and review text - everything the widget needs!
