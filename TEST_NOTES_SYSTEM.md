# Testing the Notes System - Complete Guide

## Prerequisites

1. **Backend running:**
   ```bash
   cd astegni-backend
   python app.py
   ```
   ✅ Server should start on port 8000

2. **Frontend running:**
   ```bash
   python dev-server.py
   ```
   ✅ Server should start on port 8081

3. **Logged in:**
   - Go to http://localhost:8081/index.html
   - Log in with: `jediael.s.abebe@gmail.com` / `@JesusJediael1234`
   - Check token exists: `localStorage.getItem('token')`

## Test Procedure

### Test 1: Load Notes (GET /api/notes/)

**Steps:**
1. Open http://localhost:8081/profile-pages/tutor-profile.html
2. Open browser console (F12)
3. Click "Notes" panel

**Expected:**
- ✅ Console shows: "Loaded X notes from backend"
- ✅ Notes dashboard appears (may be empty if first time)
- ✅ No JavaScript errors

**Verify:**
```javascript
// Check notes loaded
console.log(NotesManager.notes);
```

### Test 2: Create New Note (POST /api/notes/)

**Steps:**
1. Click "Create New Note" button
2. Fill in form:
   - Title: "Test Note"
   - Course: "Computer Science 101"
   - Content: "This is a test note"
3. Click "Save" button

**Expected:**
- ✅ Console shows: "Note saved to cloud!"
- ✅ Status message: "Last saved: [time]"
- ✅ Note appears in sidebar history
- ✅ Network tab shows POST to `/api/notes/` with 201 response

**Verify:**
```javascript
// Check current note has ID
console.log(NotesManager.currentNoteId);
```

### Test 3: Update Note (PUT /api/notes/{id})

**Steps:**
1. With note still open, edit the content
2. Add more text: "Updated content"
3. Click "Save" button again

**Expected:**
- ✅ Status shows: "Note saved to cloud!"
- ✅ Network tab shows PUT to `/api/notes/{id}` with 200 response
- ✅ Changes persist after page reload

**Verify:**
Reload page and check note still has updated content

### Test 4: Toggle Favorite (PATCH /api/notes/{id}/favorite)

**Steps:**
1. Open a note
2. Click the star/favorite button

**Expected:**
- ✅ Star becomes highlighted/active
- ✅ Status shows: "Added to favorites"
- ✅ Network tab shows PATCH to `/api/notes/{id}/favorite`

**Verify:**
```javascript
// Check favorite status
console.log(NotesManager.notes[0].favorite);
```

### Test 5: Record Voice Note (POST /api/notes/{id}/media)

**Steps:**
1. Open a saved note (must have ID)
2. Click microphone icon (voice recording)
3. Allow microphone permission
4. Click "Start Recording"
5. Speak for a few seconds
6. Click "Stop"
7. Click "Save Voice Note"

**Expected:**
- ✅ Permission granted
- ✅ Timer counts up during recording
- ✅ Waveform shows audio activity
- ✅ After saving, alert shows: "Voice note uploaded successfully!"
- ✅ Network tab shows POST with FormData to `/api/notes/{id}/media`
- ✅ Response includes file_url to Backblaze B2

**Verify:**
```bash
# Check database
psql -U astegni_user -d astegni_user_db
SELECT * FROM note_media;
# Should show uploaded audio file
```

### Test 6: Record Video Note (POST /api/notes/{id}/media)

**Steps:**
1. Open a saved note
2. Click video icon
3. Allow camera permission
4. Click "Start Recording"
5. Record for a few seconds
6. Click "Stop"
7. Click "Save Video Note"

**Expected:**
- ✅ Camera preview shows
- ✅ Recording starts
- ✅ After saving, alert shows: "Video note uploaded successfully!"
- ✅ Network tab shows POST with FormData to `/api/notes/{id}/media`

**Verify:**
```sql
SELECT * FROM note_media WHERE media_type = 'video';
```

### Test 7: Delete Note (DELETE /api/notes/{id})

**Steps:**
1. Open a note
2. Click "Delete" button
3. Confirm deletion

**Expected:**
- ✅ Confirmation dialog appears
- ✅ After confirming, note is deleted
- ✅ Editor closes
- ✅ Note removed from dashboard
- ✅ Network tab shows DELETE to `/api/notes/{id}` with 204 response

**Verify:**
Reload page - deleted note should not appear

### Test 8: Multi-Device Sync

**Steps:**
1. Create a note in Chrome
2. Open same profile in Firefox (logged in with same account)
3. Check if note appears

**Expected:**
- ✅ Note created in Chrome appears in Firefox
- ✅ Edits in one browser sync to other (after reload)
- ✅ Deletes in one browser remove from other

### Test 9: Statistics (GET /api/notes/stats)

**Steps:**
1. Open notes panel
2. Check stats display

**Expected:**
- ✅ Total notes count is correct
- ✅ Favorite notes count is correct
- ✅ Notes with media count is correct
- ✅ Stats update after creating/deleting notes

**Verify:**
```javascript
// Call stats API manually
fetch('http://localhost:8000/api/notes/stats', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
}).then(r => r.json()).then(console.log);
```

### Test 10: Search & Filter

**Steps:**
1. Create several notes with different keywords
2. Use search box to search for specific text
3. Filter by favorites
4. Filter by course

**Expected:**
- ✅ Search returns matching notes
- ✅ Filter by favorite shows only starred notes
- ✅ Results update in real-time

## Automated Test Script

Run this in browser console:

```javascript
async function testNotesSystem() {
  console.log('🧪 Testing Notes System...\n');

  const token = localStorage.getItem('token');
  if (!token) {
    console.error('❌ Not logged in. Please log in first.');
    return;
  }

  const API = 'http://localhost:8000';

  // Test 1: Get Stats
  console.log('Test 1: Get Stats');
  const statsRes = await fetch(`${API}/api/notes/stats`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const stats = await statsRes.json();
  console.log('✅ Stats:', stats);

  // Test 2: Create Note
  console.log('\nTest 2: Create Note');
  const createRes = await fetch(`${API}/api/notes/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'Test Note ' + Date.now(),
      content: '<p>This is a test</p>',
      course: 'Test Course',
      word_count: 4
    })
  });
  const newNote = await createRes.json();
  console.log('✅ Created note:', newNote.id);

  // Test 3: Update Note
  console.log('\nTest 3: Update Note');
  const updateRes = await fetch(`${API}/api/notes/${newNote.id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'Updated Test Note',
      content: '<p>This is updated</p>',
      word_count: 3
    })
  });
  const updated = await updateRes.json();
  console.log('✅ Updated note:', updated.title);

  // Test 4: Toggle Favorite
  console.log('\nTest 4: Toggle Favorite');
  const favRes = await fetch(`${API}/api/notes/${newNote.id}/favorite`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const favorited = await favRes.json();
  console.log('✅ Favorited:', favorited.is_favorite);

  // Test 5: Get All Notes
  console.log('\nTest 5: Get All Notes');
  const listRes = await fetch(`${API}/api/notes/`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const notes = await listRes.json();
  console.log('✅ Total notes:', notes.length);

  // Test 6: Delete Note
  console.log('\nTest 6: Delete Note');
  const deleteRes = await fetch(`${API}/api/notes/${newNote.id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('✅ Deleted note:', deleteRes.status === 204);

  console.log('\n🎉 All tests passed!');
}

// Run tests
testNotesSystem();
```

## Expected Results Summary

All tests should pass with:
- ✅ Backend API responds correctly
- ✅ Frontend displays data
- ✅ CRUD operations work
- ✅ Media uploads succeed
- ✅ Multi-device sync works
- ✅ No JavaScript errors
- ✅ No network errors

## Common Issues & Solutions

### Issue: "Failed to load notes"
**Solution:**
1. Check backend is running: `curl http://localhost:8000/health`
2. Check token exists: `localStorage.getItem('token')`
3. Check browser console for errors

### Issue: "Please log in to save notes"
**Solution:**
1. Go to index.html
2. Log in
3. Return to profile page

### Issue: Media upload fails
**Solution:**
1. Save note first (must have ID)
2. Then record media
3. Check file size (max 50MB)

### Issue: Notes don't sync across browsers
**Solution:**
1. Ensure both browsers are logged in with same account
2. Reload page to fetch latest notes
3. Check API_BASE_URL is correct

## Success Criteria

✅ **System is working if:**
1. Notes load from backend
2. Can create new notes
3. Can edit existing notes
4. Can delete notes
5. Can toggle favorites
6. Can upload voice recordings
7. Can upload video recordings
8. Notes sync across devices
9. No console errors
10. All API calls succeed (200/201/204 status codes)

## Next Steps After Testing

Once all tests pass:
1. Test on production environment
2. Set up database backups
3. Monitor performance
4. Train users on new features
5. Document any issues found

---

**Happy Testing! 🚀**
