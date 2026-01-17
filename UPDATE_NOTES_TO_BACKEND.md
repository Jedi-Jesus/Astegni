# Quick Update: Notes Panel to Backend API

## What This Does

Removes localStorage dependency and connects notes panel to backend database in all profile pages.

## Changes Summary

**Before:** Notes stored in browser localStorage (device-specific, lost on cache clear)

**After:** Notes stored in backend database (cloud-synced, persistent, multi-device)

## Files Changed

- ✅ Backend already complete (migration run, endpoints registered)
- 📝 Frontend: `js/common-modals/advanced-notes.js` (needs updates)
- ✅ Profile pages: No changes needed (they already use advanced-notes.js)

## Quick Instructions

### Option 1: Use Pre-Made File (Recommended)

I've created a backend-ready version with key methods updated:

1. **Backup original:**
   ```bash
   cp js/common-modals/advanced-notes.js js/common-modals/advanced-notes-BACKUP.js
   ```

2. **Review the migration guide:**
   Open `NOTES_FRONTEND_MIGRATION_GUIDE.md`

3. **Apply changes manually** following the guide, OR

4. **Use the reference file:**
   I created `js/common-modals/advanced-notes-backend.js` with the API integration layer

### Option 2: Manual Migration (Step-by-Step)

Follow `NOTES_FRONTEND_MIGRATION_GUIDE.md` which provides:
- Exact code replacements
- Before/After comparisons
- Testing checklist
- Rollback plan

## Key Code Changes

### 1. Add API Configuration
```javascript
API_BASE_URL: window.location.hostname === 'localhost'
  ? 'http://localhost:8000'
  : 'https://api.astegni.com',
```

### 2. Replace loadNotes()
```javascript
async loadNotes() {
  const token = localStorage.getItem('token');
  const response = await fetch(`${this.API_BASE_URL}/api/notes/`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  this.notes = await response.json();
}
```

### 3. Replace saveNote()
```javascript
async saveNote() {
  const token = localStorage.getItem('token');
  const method = this.currentNoteId ? 'PUT' : 'POST';
  const url = this.currentNoteId
    ? `${this.API_BASE_URL}/api/notes/${this.currentNoteId}`
    : `${this.API_BASE_URL}/api/notes/`;

  await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(noteData)
  });
}
```

### 4. Media Upload (Voice/Video)
```javascript
async saveVoiceNote() {
  const formData = new FormData();
  formData.append('file', this.recordedBlob, 'voice.webm');

  const token = localStorage.getItem('token');
  await fetch(`${this.API_BASE_URL}/api/notes/${this.currentNoteId}/media?media_type=audio`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
}
```

## Methods to Update

| Method | Change |
|--------|--------|
| `loadNotes()` | Fetch from `/api/notes/` |
| `saveNote()` | POST/PUT to `/api/notes/` |
| `deleteCurrentNote()` | DELETE to `/api/notes/{id}` |
| `toggleFavorite()` | PATCH to `/api/notes/{id}/favorite` |
| `duplicateNote()` | POST to `/api/notes/{id}/duplicate` |
| `saveVoiceNote()` | POST FormData to `/api/notes/{id}/media` |
| `saveVideoNote()` | POST FormData to `/api/notes/{id}/media` |
| `setupAutocomplete()` | GET from `/api/notes/courses` & `/api/notes/tutors` |
| `updateStats()` | GET from `/api/notes/stats` |
| `init()` | Make `async`, `await this.loadNotes()` |

## What Stays the Same

- All UI rendering methods (renderDashboard, renderHistorySidebar, etc.)
- All rich text formatting (formatText, etc.)
- All modal opening/closing
- Speech-to-text transcription
- Text-to-speech
- Export functions (PDF, Word, etc.)
- Keyboard shortcuts
- Event listeners

**Only the data persistence layer changes!**

## Testing

1. **Start backend:**
   ```bash
   cd astegni-backend
   python app.py
   ```

2. **Open profile page:**
   - Go to tutor-profile.html (or any profile)
   - Open notes panel
   - Check browser console for errors

3. **Test operations:**
   - Create new note → Check it saves to backend
   - Edit note → Check updates save
   - Delete note → Check it deletes from backend
   - Toggle favorite → Check it updates
   - Record voice → Check it uploads

4. **Verify multi-device sync:**
   - Open same profile in different browser
   - Notes should be synced

## Benefits After Migration

✅ **Cloud Sync** - Access notes from any device
✅ **Persistent** - Notes never lost (database backed up)
✅ **Searchable** - Full-text search across all notes
✅ **Scalable** - No browser storage limits
✅ **Secure** - JWT authentication, user-scoped
✅ **Analytics** - Track usage patterns
✅ **Media Storage** - Voice/video in Backblaze B2 (not browser)

## Troubleshooting

### "Failed to load notes"
- Check backend is running (http://localhost:8000)
- Check token exists: `localStorage.getItem('token')`
- Check API endpoint: http://localhost:8000/docs

### "Unauthorized" errors
- Token might be expired - log in again
- Check Authorization header is sent

### Notes not saving
- Open browser console
- Check for error messages
- Verify token is valid

### Media upload fails
- Check file size (max 50MB)
- Check MIME type (audio/webm, video/webm, etc.)
- Check Backblaze B2 is configured in backend

## Rollback

If issues occur, restore backup:
```bash
cp js/common-modals/advanced-notes-BACKUP.js js/common-modals/advanced-notes.js
```

## Next Steps

1. Apply changes to `advanced-notes.js`
2. Test in tutor-profile
3. Test in student-profile
4. Test in parent-profile
5. Test in advertiser-profile
6. Deploy to production

## Summary

- Backend: ✅ Complete (database, API, migration all done)
- Frontend: 📝 Update `advanced-notes.js` with API calls
- Profile Pages: ✅ No changes needed
- Result: Cloud-synced notes across all devices!

See `NOTES_FRONTEND_MIGRATION_GUIDE.md` for detailed step-by-step instructions.
