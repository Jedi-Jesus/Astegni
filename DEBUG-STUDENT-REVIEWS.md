# Debug Guide - Student Reviews Not Loading

## Problem
The `recent-feedback-container` in student-profile.html is showing "Loading feedback..." and not displaying actual reviews.

## Debugging Steps

### 1. Check Console Logs
Open browser DevTools (F12) and check the Console tab for these messages:

**Expected logs (if working correctly):**
```
✅ student-profile-reviews.js loaded
🔄 loadRecentFeedback called
👤 User found: [username]
📊 Fetching reviews for student_id: [number]
📦 Reviews data received: [data object]
✨ Displaying [number] recent reviews
🎨 displayRecentFeedback called with [number] reviews
✅ Container found: [element]
✨ Setting container innerHTML with [number] characters
✅ Reviews displayed successfully
✅ Recent feedback loaded
```

**If you see this warning:**
```
⚠️ loadRecentFeedback function not found
```
→ The script isn't loading. Check if the script tag is in the HTML.

**If you see this error:**
```
❌ Recent feedback container not found in DOM
```
→ The `id="recent-feedback-container"` is missing or misspelled in HTML.

**If you see this:**
```
❌ Reviews API failed: 404
```
→ The API endpoint doesn't exist or student doesn't have reviews.

### 2. Check if Script is Loaded
In the Console, type:
```javascript
typeof window.loadRecentFeedback
```

**Expected result:** `"function"`
**If result is:** `"undefined"` → Script not loaded correctly

### 3. Check if Container Exists
In the Console, type:
```javascript
document.getElementById('recent-feedback-container')
```

**Expected result:** HTML element
**If result is:** `null` → Container ID is missing or wrong

### 4. Manually Call the Function
In the Console, try calling the function manually:
```javascript
await window.loadRecentFeedback()
```

Watch the console for errors or success messages.

### 5. Check API Endpoint
In the Console, test the API directly:
```javascript
// Get your token and student profile
const token = localStorage.getItem('token');
const response = await fetch('http://localhost:8000/api/student/profile', {
    headers: { 'Authorization': `Bearer ${token}` }
});
const profile = await response.json();
console.log('Student ID:', profile.id);

// Test reviews endpoint
const reviewsResponse = await fetch(`http://localhost:8000/api/student-reviews/${profile.id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
});
const reviews = await reviewsResponse.json();
console.log('Reviews:', reviews);
```

### 6. Check Backend is Running
1. Verify backend is running on http://localhost:8000
2. Test API docs: http://localhost:8000/docs
3. Check if `/api/student-reviews/{student_id}` endpoint exists

## Common Issues & Solutions

### Issue 1: Script Not Loading
**Symptom:** `loadRecentFeedback function not found`

**Solution:**
1. Check if script tag exists in `profile-pages/student-profile.html`:
   ```html
   <script src="../js/student-profile/student-profile-reviews.js"></script>
   ```
2. Verify the script is loaded before `init.js`
3. Check browser Network tab to see if script loaded (200 status)

### Issue 2: Container Not Found
**Symptom:** `Recent feedback container not found in DOM`

**Solution:**
1. Search for `id="recent-feedback-container"` in student-profile.html
2. Make sure it's in the Dashboard panel (not hidden in another panel)
3. Check if the ID is spelled correctly (no typos)

### Issue 3: API Returns 404
**Symptom:** `Failed to fetch reviews: 404`

**Solution:**
1. Check backend logs for errors
2. Verify the endpoint exists in `astegni-backend/app.py modules/routes.py`
3. Make sure you're using the correct student_id
4. Check if student has any reviews in the database:
   ```sql
   SELECT * FROM student_reviews WHERE student_id = [your_student_id];
   ```

### Issue 4: API Returns Empty Reviews
**Symptom:** Shows "No Feedback Yet" message

**Solution:**
This is expected if the student has no reviews. To test with data:
1. Add sample reviews to the database
2. Or test with a student who has existing reviews (e.g., student_id = 28)

### Issue 5: Function Called But Nothing Happens
**Symptom:** Logs show function called but UI doesn't update

**Solution:**
1. Check if there are JavaScript errors after the function call
2. Verify the HTML is being injected:
   ```javascript
   console.log(document.getElementById('recent-feedback-container').innerHTML);
   ```
3. Check CSS - the container might be hidden or have `display: none`

## Quick Test

Run this in the browser console to test everything:
```javascript
// Test 1: Check if script loaded
console.log('Script loaded:', typeof window.loadRecentFeedback === 'function' ? '✅' : '❌');

// Test 2: Check if container exists
console.log('Container exists:', document.getElementById('recent-feedback-container') ? '✅' : '❌');

// Test 3: Check if user is authenticated
console.log('Token exists:', localStorage.getItem('token') ? '✅' : '❌');

// Test 4: Check if backend is running
fetch('http://localhost:8000/api/student/profile', {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
})
.then(r => r.ok ? console.log('API working: ✅') : console.log('API failed: ❌'))
.catch(() => console.log('Backend not running: ❌'));

// Test 5: Manually call the function
if (typeof window.loadRecentFeedback === 'function') {
    window.loadRecentFeedback().then(() => {
        console.log('Function completed - check for reviews above');
    });
}
```

## What to Report

If you're still having issues, provide:
1. **Console logs** - Copy all messages from console
2. **Network tab** - Check if API calls are being made
3. **Student ID** - What student_id is being used
4. **Backend status** - Is backend running? Any errors?
5. **Browser** - Which browser are you using?

## Files to Check

1. **HTML:** `profile-pages/student-profile.html` (Line 1864 - container, Line 5505 - script)
2. **JavaScript:** `js/student-profile/student-profile-reviews.js` (Full file)
3. **Init:** `js/student-profile/init.js` (Lines 69-74)
4. **Backend:** `astegni-backend/app.py modules/routes.py` (Search for `/api/student-reviews/`)

## Next Steps

Once you've identified the issue from the console logs, you can:
1. Fix the script loading if it's not loading
2. Fix the container ID if it's not found
3. Fix the API endpoint if it's returning errors
4. Add sample data if there are no reviews

Good luck debugging! 🐛
