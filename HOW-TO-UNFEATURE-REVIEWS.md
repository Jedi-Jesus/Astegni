# How to Remove Testimonials from Featured Reviews

## Simple Answer

**There are 2 ways to remove (unfeature) testimonials:**

### Method 1: Using the "Unfeature" Button (Recommended)

1. Go to **System Settings** → **Manage Reviews**
2. Browse the reviews - featured ones will have a **gold badge** at the top saying "Featured on: [location]"
3. Click the **"Unfeature"** button (gold button with star icon) on any featured review
4. Confirm the removal
5. Done! The review is removed from testimonials

### Method 2: Using the Database/API Directly

If you need to remove reviews programmatically:

```bash
# Remove review #5 from parent-profile
curl -X DELETE "http://localhost:8000/api/admin/reviews/feature/5?location=parent-profile"

# Remove from all locations
curl -X DELETE "http://localhost:8000/api/admin/reviews/feature/5?location=all"
```

## Visual Guide

### What You'll See in the Admin Panel

**Featured Review (has gold badge):**
```
┌─────────────────────────────────────────────────┐
│ ⭐ Featured on: parent-profile                  │ ← Gold Badge
├─────────────────────────────────────────────────┤
│ ☐ [Avatar] John Doe - Parent                   │
│                        ⭐⭐⭐⭐⭐                  │
│                        [Unfeature] [Delete]     │ ← Unfeature Button
│                                                 │
│ "Great platform! My child loves it..."          │
│                                                 │
│ 🕐 2 days ago                                   │
└─────────────────────────────────────────────────┘
```

**Normal Review (no badge):**
```
┌─────────────────────────────────────────────────┐
│ ☐ [Avatar] Jane Smith - Student                │
│                        ⭐⭐⭐⭐                    │
│                        [Delete]                 │ ← Only Delete
│                                                 │
│ "Good service, works well..."                   │
│                                                 │
│ 🕐 1 week ago                                   │
└─────────────────────────────────────────────────┘
```

## Step-by-Step Instructions

### To Remove a Single Review from Featured:

1. **Open Admin Panel**
   - Navigate to: http://localhost:8080/admin-pages/manage-system-settings.html
   - Click "Manage Reviews" in the sidebar

2. **Find the Featured Review**
   - Featured reviews have a **gold badge** at the top
   - Badge shows where it's featured (e.g., "Featured on: parent-profile")

3. **Click "Unfeature" Button**
   - The button is **gold** with a star icon
   - Located next to the delete button

4. **Confirm Removal**
   - A confirmation dialog appears
   - Click "OK" to confirm

5. **Review Removed**
   - Success message appears
   - Gold badge disappears
   - Review stays in the list but is no longer featured
   - Testimonials on that page will update automatically

### To Remove Multiple Reviews:

Simply repeat the process for each review you want to unfeature.

## Important Notes

### What Happens When You Unfeature:
- ✅ Review stays in the database (not deleted)
- ✅ Review still appears in "Manage Reviews" list
- ✅ You can feature it again later if you want
- ❌ It won't appear in testimonials widget on that page anymore

### Unfeaturing vs. Deleting:
- **Unfeature**: Removes from testimonials but keeps the review
- **Delete**: Completely removes the review from the database

### Location-Specific Unfeaturing:
- If a review is featured on multiple pages (e.g., "all" and "parent-profile")
- The unfeature button removes it from the first location shown
- To remove from all locations, you may need to unfeature multiple times

## API Reference

### Endpoint
```
DELETE /api/admin/reviews/feature/{review_id}?location={location}
```

### Parameters
- `review_id` (required): The ID of the review to unfeature
- `location` (optional): Where to remove from (default: 'all')
  - `'all'` - Remove from everywhere
  - `'parent-profile'` - Remove from parent profile pages
  - `'student-profile'` - Remove from student profile pages
  - `'tutor-profile'` - Remove from tutor profile pages
  - `'home'` - Remove from home page

### Example Responses

**Success:**
```json
{
    "message": "Review unfeatured successfully",
    "review_id": 5
}
```

**Error (not found):**
```json
{
    "detail": "Featured review not found"
}
```

## Troubleshooting

### Problem: Can't Find the Unfeature Button
**Solution:** The button only appears on reviews that are currently featured. Look for reviews with the gold "Featured on:" badge.

### Problem: Unfeature Button Doesn't Work
**Solution:**
- Check that the backend server is running
- Open browser console (F12) to see any errors
- Refresh the page and try again

### Problem: Review Still Appears in Testimonials
**Solution:**
- The testimonials widget caches data for a short time
- Refresh the page where testimonials are displayed
- Clear browser cache if needed

### Problem: Want to Feature the Review Again
**Solution:**
- Just select it with the checkbox
- Choose location from dropdown
- Click "Feature Reviews" button
- It will be featured again!

## Quick Recap

1. **Find:** Look for reviews with gold badges
2. **Click:** Press the gold "Unfeature" button
3. **Confirm:** Click OK in the dialog
4. **Done:** Review removed from testimonials!

That's it! Simple and straightforward. 😊
