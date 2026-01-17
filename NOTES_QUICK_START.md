# Notes System - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Run Migration (2 minutes)

```bash
cd astegni-backend
python migrate_create_notes_tables.py
```

**Expected Output:**
```
Creating notes tables...
✓ Notes tables created successfully
✓ Indexes created successfully
✓ Triggers created successfully

=== Migration Summary ===
Tables created: 3
Indexes created: 8
Triggers created: 2

Notes system is ready to use!
```

### Step 2: Test Backend (2 minutes)

```bash
# Start backend server
python app.py
```

Visit **http://localhost:8000/docs** and look for `/api/notes/` endpoints.

Or test with curl:
```bash
# Login first
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jediael.s.abebe@gmail.com","password":"@JesusJediael1234"}'

# Copy the access_token from response, then test:
curl -X GET http://localhost:8000/api/notes/stats \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Step 3: Update Frontend (30 minutes)

#### Option A: Quick Test (Keep localStorage + Add Backend)
Add backend sync while keeping localStorage as fallback:

```javascript
// In js/common-modals/advanced-notes.js

// Add at top
const API_BASE_URL = 'http://localhost:8000';

// Update loadNotes() method
async loadNotes() {
  // Try to load from backend
  try {
    const token = localStorage.getItem('token');
    if (token) {
      const response = await fetch(`${API_BASE_URL}/api/notes/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        this.notes = await response.json();
        return;
      }
    }
  } catch (error) {
    console.error('Failed to load from backend:', error);
  }

  // Fallback to localStorage
  const stored = localStorage.getItem('astegni_notes');
  if (stored) {
    this.notes = JSON.parse(stored);
  }
}

// Update saveNote() method
async saveNote() {
  const noteData = this.collectNoteData();

  // Save to backend
  try {
    const token = localStorage.getItem('token');
    if (token) {
      const method = this.currentNoteIndex !== null ? 'PUT' : 'POST';
      const url = this.currentNoteIndex !== null
        ? `${API_BASE_URL}/api/notes/${this.notes[this.currentNoteIndex].id}`
        : `${API_BASE_URL}/api/notes/`;

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(noteData)
      });

      if (response.ok) {
        const savedNote = await response.json();

        if (this.currentNoteIndex !== null) {
          this.notes[this.currentNoteIndex] = savedNote;
        } else {
          this.notes.unshift(savedNote);
          this.currentNoteIndex = 0;
        }

        this.showSaveStatus('success', 'Note saved to cloud!');
        this.renderHistorySidebar(this.currentNoteIndex);
        return;
      }
    }
  } catch (error) {
    console.error('Failed to save to backend:', error);
  }

  // Fallback to localStorage
  if (this.currentNoteIndex !== null) {
    this.notes[this.currentNoteIndex] = noteData;
  } else {
    this.notes.unshift(noteData);
    this.currentNoteIndex = 0;
  }

  this.saveNotesToStorage();
  this.showSaveStatus('success', 'Note saved locally');
  this.renderHistorySidebar(this.currentNoteIndex);
}
```

#### Option B: Full Migration (See NOTES_BACKEND_DOCUMENTATION.md)

## 📝 What You Get

After completing all steps:

1. **Cloud Storage** - Notes synced across devices
2. **Search** - Full-text search across all notes
3. **Media** - Voice/video recordings stored securely
4. **Stats** - Usage analytics dashboard
5. **Backup** - Automatic database backups
6. **Scale** - Unlimited notes (not limited by browser)

## 🎯 Verification Checklist

- [ ] Migration runs without errors
- [ ] Backend shows notes endpoints at /docs
- [ ] Can create note via API
- [ ] Can retrieve notes via API
- [ ] Frontend loads notes from backend
- [ ] Frontend saves notes to backend
- [ ] Media upload works
- [ ] Stats endpoint returns data

## 🐛 Troubleshooting

### Migration fails
```bash
# Check database connection
python test_connection.py

# Check if tables already exist
psql astegni_user_db -c "\dt notes*"
```

### Endpoints not found
```bash
# Check if import is correct in app.py
grep "notes_endpoints" app.py

# Restart server
python app.py
```

### CORS errors in frontend
```javascript
// Check API_BASE_URL matches backend
// Check token is being sent
// Check browser console for detailed error
```

### Authentication errors
```javascript
// Verify token exists
console.log(localStorage.getItem('token'));

// Check token is valid
jwt_decode(localStorage.getItem('token'));
```

## 📚 Resources

- **Full API Reference:** [NOTES_BACKEND_DOCUMENTATION.md](NOTES_BACKEND_DOCUMENTATION.md)
- **Implementation Summary:** [NOTES_SYSTEM_SUMMARY.md](NOTES_SYSTEM_SUMMARY.md)
- **API Docs (when running):** http://localhost:8000/docs
- **Test User:** `jediael.s.abebe@gmail.com` / `@JesusJediael1234`

## 💡 Pro Tips

1. **Test in production mode:** Use `python dev-server.py` (port 8081) for frontend
2. **Monitor logs:** `tail -f astegni-backend/logs/*.log` for debugging
3. **Use FastAPI docs:** Interactive API testing at http://localhost:8000/docs
4. **Check database:** `psql astegni_user_db` to inspect tables
5. **Backup first:** Before migration, backup your database

## 🎉 Success!

Once complete, your notes system will be:
- ✅ Database-backed
- ✅ Cloud-synced
- ✅ Searchable
- ✅ Secure
- ✅ Scalable
- ✅ Production-ready

**Ready to go!** 🚀
