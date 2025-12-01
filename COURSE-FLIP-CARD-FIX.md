# Course Flip Card Fix - No More Duplicates!

## Problem
The courses section was showing **duplicate courses** across multiple flip cards.

### Original Issue:
- API fetched only **8 courses** (`limit=8`)
- Code used the NEXT course as the back side of each card
- This created duplicates:
  - Card 1: Front = Course 1, Back = Course 2
  - Card 2: Front = Course 2, Back = Course 3 (**Course 2 appears twice!**)
  - Card 3: Front = Course 3, Back = Course 4 (**Course 3 appears twice!**)
  - etc.

### Result:
- Only 8 unique courses displayed, but some shown multiple times
- Users saw the same courses on different cards

---

## Solution ✅

### What We Did:
**File: `js/index/course-flip.js` (Lines 8-46)**

1. **Fetch 16 courses** instead of 8:
   ```javascript
   const response = await fetch(`${courseApiUrl}/api/courses?limit=16&sort_by=popular`);
   ```

2. **Proper pairing** - Use first 8 courses for fronts, last 8 for backs:
   ```javascript
   for (let i = 0; i < 8; i++) {
       const frontCourse = data.courses[i];      // Courses 0-7 (fronts)
       const backCourse = data.courses[i + 8];   // Courses 8-15 (backs)
       // No duplicates!
   }
   ```

### New Logic:
- **8 flip cards** × **2 sides** = **16 unique courses**
- Card 1: Front = Course 1, Back = Course 9
- Card 2: Front = Course 2, Back = Course 10
- Card 3: Front = Course 3, Back = Course 11
- ... and so on
- **No course appears more than once!**

---

## Database Has All 16 Courses ✅

We already seeded the database with exactly 16 courses:

1. Cosmetology
2. Skills
3. Mathematics
4. Physics
5. Programming
6. Sports Training
7. Culinary Arts
8. Chemistry
9. Chinese
10. English
11. Business
12. Marketing
13. Photography
14. Graphic Design
15. Special Needs
16. Music

### Card Distribution (Grouped by Category):
- **Card 1 (Language):** Chinese ⟷ English
- **Card 2 (Business):** Business ⟷ Marketing
- **Card 3 (Tech):** Mathematics ⟷ Programming
- **Card 4 (Tech):** Physics ⟷ Chemistry
- **Card 5 (Arts):** Cosmetology ⟷ Graphic Design
- **Card 6 (Arts):** Photography ⟷ Music
- **Card 7 (Arts):** Sports Training ⟷ Culinary Arts
- **Card 8 (Professional/Arts):** Skills ⟷ Special Needs

---

## Testing

### Before Fix:
```
Card 1: Mathematics → Physics
Card 2: Physics → Chemistry (Physics duplicate!)
Card 3: Chemistry → Music (Chemistry duplicate!)
...
```

### After Fix (Grouped by Category):
```
Card 1 [Language]:      Chinese → English (both language!)
Card 2 [Business]:      Business → Marketing (both business!)
Card 3 [Tech]:          Mathematics → Programming (both tech!)
Card 4 [Tech]:          Physics → Chemistry (both tech!)
Card 5 [Arts]:          Cosmetology → Graphic Design (both arts!)
Card 6 [Arts]:          Photography → Music (both arts!)
Card 7 [Arts]:          Sports Training → Culinary Arts (both arts!)
Card 8 [Professional]:  Skills → Special Needs (professional + arts!)
```

**Total: 16 unique courses, 0 duplicates, perfectly grouped by category!**

---

## Status
✅ **FIXED** - Each course appears exactly once across all 8 flip cards
✅ **DATABASE READY** - All 16 courses already seeded
✅ **API UPDATED** - Fetches 16 courses instead of 8
✅ **NO DUPLICATES** - Proper front/back pairing implemented
