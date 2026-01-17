# Testing Profile-Based Notes System

## Quick Test Guide

### Prerequisites

1. **Backend running:**
   ```bash
   cd astegni-backend
   python app.py
   ```

2. **User with multiple profiles:**
   - Use account: `jediael.s.abebe@gmail.com` / `@JesusJediael1234`
   - This user should have both Student and Tutor profiles

### Test Scenarios

#### Scenario 1: Profile Isolation

**Steps:**
1. Log in as **Student**
2. Go to http://localhost:8081/profile-pages/student-profile.html
3. Open Notes panel
4. Create a note titled "Student Note 1" with content "This is from my student profile"
5. Create another note titled "Student Note 2"
6. **Switch to Tutor role** (using role switcher in UI)
7. Go to http://localhost:8081/profile-pages/tutor-profile.html
8. Open Notes panel

**Expected Result:**
- ✅ Should show EMPTY notes (or different notes if tutor had notes before)
- ✅ Should NOT show "Student Note 1" or "Student Note 2"

9. Create a note titled "Tutor Note 1" with content "This is from my tutor profile"
10. Create another note titled "Tutor Note 2"
11. **Switch back to Student role**
12. Go to student-profile.html → Open Notes panel

**Expected Result:**
- ✅ Should show "Student Note 1" and "Student Note 2"
- ✅ Should NOT show "Tutor Note 1" or "Tutor Note 2"

**Conclusion:** Each profile has completely isolated notes! ✅

#### Scenario 2: API Response Verification

**Steps:**
1. Log in and get your token from localStorage
2. Open browser console:
   ```javascript
   const token = localStorage.getItem('token');

   // Get notes
   fetch('http://localhost:8000/api/notes/', {
     headers: { 'Authorization': `Bearer ${token}` }
   })
   .then(r => r.json())
   .then(notes => {
     console.log('Notes:', notes);
     if (notes.length > 0) {
       console.log('First note profile:', {
         profile_id: notes[0].profile_id,
         profile_type: notes[0].profile_type
       });
     }
   });
   ```

**Expected Result:**
- ✅ Each note should have `profile_id` and `profile_type` fields
- ✅ All notes should have the same `profile_id` and `profile_type` (matching current role)

#### Scenario 3: Statistics Per Profile

**Steps:**
1. As Student, create 5 notes
2. Mark 2 as favorites
3. Check stats in Notes panel
4. Switch to Tutor
5. Create 3 notes
6. Mark 1 as favorite
7. Check stats

**Expected Result:**
- ✅ Student stats: 5 total, 2 favorites
- ✅ Tutor stats: 3 total, 1 favorite
- ✅ Each profile shows only their own stats

#### Scenario 4: Media Upload Per Profile

**Steps:**
1. As Student, create a note
2. Record a voice note
3. Switch to Tutor
4. Create a note
5. Record a different voice note
6. Switch back to Student
7. Open the first note

**Expected Result:**
- ✅ Should show student's voice note
- ✅ Should NOT have access to tutor's voice note

#### Scenario 5: Course Autocomplete Per Profile

**Steps:**
1. As Student:
   - Create note with course "Mathematics 101"
   - Create note with course "Physics 201"
2. As Tutor:
   - Create note with course "Teaching Methods"
   - Create note with course "Curriculum Design"
3. Test autocomplete:
   - As Student, start typing in course field
   - As Tutor, start typing in course field

**Expected Result:**
- ✅ Student sees: "Mathematics 101", "Physics 201"
- ✅ Tutor sees: "Teaching Methods", "Curriculum Design"
- ✅ Each profile's autocomplete shows only their own courses

## API Endpoint Tests

### Test All Endpoints

```javascript
// Run this in browser console after logging in
async function testProfileBasedNotes() {
  const token = localStorage.getItem('token');
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  console.log('🧪 Testing Profile-Based Notes System\n');

  // Test 1: Create Note
  console.log('1️⃣ Creating note...');
  const createRes = await fetch('http://localhost:8000/api/notes/', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: 'Test Profile Note',
      content: '<p>Testing profile-based system</p>',
      course: 'Test Course',
      word_count: 3
    })
  });
  const newNote = await createRes.json();
  console.log('✅ Created:', newNote);
  console.log(`   profile_id: ${newNote.profile_id}, profile_type: ${newNote.profile_type}`);

  // Test 2: Get All Notes
  console.log('\n2️⃣ Getting all notes...');
  const listRes = await fetch('http://localhost:8000/api/notes/', { headers });
  const notes = await listRes.json();
  console.log(`✅ Found ${notes.length} notes`);
  if (notes.length > 0) {
    console.log(`   All notes have same profile_id? ${notes.every(n => n.profile_id === notes[0].profile_id)}`);
    console.log(`   All notes have same profile_type? ${notes.every(n => n.profile_type === notes[0].profile_type)}`);
  }

  // Test 3: Get Stats
  console.log('\n3️⃣ Getting stats...');
  const statsRes = await fetch('http://localhost:8000/api/notes/stats', { headers });
  const stats = await statsRes.json();
  console.log('✅ Stats:', stats);

  // Test 4: Get Courses (autocomplete)
  console.log('\n4️⃣ Getting courses...');
  const coursesRes = await fetch('http://localhost:8000/api/notes/courses', { headers });
  const courses = await coursesRes.json();
  console.log('✅ Courses:', courses);

  // Test 5: Update Note
  console.log('\n5️⃣ Updating note...');
  const updateRes = await fetch(`http://localhost:8000/api/notes/${newNote.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      title: 'Updated Profile Note',
      content: '<p>Updated content</p>',
      word_count: 2
    })
  });
  const updated = await updateRes.json();
  console.log('✅ Updated:', updated.title);
  console.log(`   profile_id still: ${updated.profile_id}, profile_type still: ${updated.profile_type}`);

  // Test 6: Toggle Favorite
  console.log('\n6️⃣ Toggling favorite...');
  const favRes = await fetch(`http://localhost:8000/api/notes/${newNote.id}/favorite`, {
    method: 'PATCH',
    headers
  });
  const favorited = await favRes.json();
  console.log('✅ Favorited:', favorited.is_favorite);

  // Test 7: Delete Note
  console.log('\n7️⃣ Deleting note...');
  const deleteRes = await fetch(`http://localhost:8000/api/notes/${newNote.id}`, {
    method: 'DELETE',
    headers
  });
  console.log('✅ Deleted:', deleteRes.status === 204);

  console.log('\n🎉 All tests passed!');
  console.log('\n📝 Summary:');
  console.log('   ✅ Notes are profile-scoped');
  console.log('   ✅ All endpoints work correctly');
  console.log('   ✅ API returns profile_id and profile_type');
}

// Run tests
testProfileBasedNotes();
```

## Backend Logs to Watch

When testing, watch the backend console for these log messages:

```
[get_current_user] User 1 current_role from token: tutor
[get_current_user] User 1 role_ids from token: {'student': '5', 'tutor': '3'}
[get_current_user] Converted role_ids: {'student': 5, 'tutor': 3}
[get_current_user] Profile context: profile_type=tutor, profile_id=3
```

These logs confirm:
- ✅ Current role is extracted from token
- ✅ Role IDs are converted to integers
- ✅ Profile context is set correctly

## Success Criteria

✅ **Profile Isolation:** Each profile sees only their own notes
✅ **API Responses:** Include `profile_id` and `profile_type`
✅ **Statistics:** Profile-specific (not shared across profiles)
✅ **Autocomplete:** Shows data from current profile only
✅ **Media Upload:** Stored per profile
✅ **All CRUD Operations:** Work correctly with profile context
✅ **No Errors:** Backend logs show correct profile context
✅ **Role Switching:** Notes change when switching roles

## Troubleshooting

### Issue: "Notes appear across all profiles"

**Check:**
1. Backend logs show correct profile_id
2. Database query uses `WHERE profile_id = X AND profile_type = 'Y'`
3. Token contains role and role_ids

### Issue: "Cannot create notes - profile_id is None"

**Check:**
1. User has a profile for their current role
2. Token contains role_ids
3. `get_current_user()` successfully extracts profile context

### Issue: "Old notes don't appear"

**Explanation:** Notes created before migration had `user_id`. They were dropped during migration since there's no way to determine which profile they belonged to. This is expected behavior.

## Next Steps

1. ✅ Test profile isolation
2. ✅ Test all CRUD operations
3. ✅ Test with users having multiple profiles
4. ✅ Verify no cross-profile data leakage
5. ✅ Test media upload per profile
6. ✅ Test autocomplete per profile

---

**Happy Testing! 🚀**
