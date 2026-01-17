# Notes Backend System Documentation

## Overview

Complete database backend for the notes panel with rich text editing, voice/video recording, and comprehensive API support.

## Database Schema

### Tables Created

#### 1. `notes` - Main notes table
```sql
- id: SERIAL PRIMARY KEY
- user_id: INTEGER (FK to users.id)
- title: VARCHAR(500) NOT NULL
- content: TEXT (Rich HTML content)
- date: TIMESTAMP WITH TIME ZONE
- course: VARCHAR(200)
- tutor: VARCHAR(200)
- tags: TEXT (comma-separated)
- background: VARCHAR(50) (theme name or 'custom')
- background_url: TEXT (custom background URL)
- is_favorite: BOOLEAN DEFAULT FALSE
- word_count: INTEGER DEFAULT 0
- has_media: BOOLEAN DEFAULT FALSE
- created_at: TIMESTAMP WITH TIME ZONE
- updated_at: TIMESTAMP WITH TIME ZONE
- last_modified: TIMESTAMP WITH TIME ZONE
- search_vector: tsvector (for full-text search)
```

**Indexes:**
- `idx_notes_user_id` on `user_id`
- `idx_notes_favorite` on `(user_id, is_favorite)`
- `idx_notes_created_at` on `created_at DESC`
- `idx_notes_course` on `course`
- `idx_notes_search` GIN index on `search_vector`

**Triggers:**
- `notes_search_vector_trigger` - Auto-updates search vector
- `update_notes_timestamp_trigger` - Auto-updates timestamps

#### 2. `note_media` - Voice/video recordings
```sql
- id: SERIAL PRIMARY KEY
- note_id: INTEGER (FK to notes.id)
- media_type: VARCHAR(20) ('audio' or 'video')
- file_url: TEXT (URL to Backblaze B2)
- file_size: INTEGER (bytes)
- duration: INTEGER (seconds)
- mime_type: VARCHAR(100)
- recorded_at: TIMESTAMP WITH TIME ZONE
- transcription: TEXT (optional)
- transcription_language: VARCHAR(10)
- created_at: TIMESTAMP WITH TIME ZONE
```

**Indexes:**
- `idx_note_media_note_id` on `note_id`
- `idx_note_media_type` on `media_type`

#### 3. `note_exports` - Export tracking
```sql
- id: SERIAL PRIMARY KEY
- note_id: INTEGER (FK to notes.id)
- user_id: INTEGER (FK to users.id)
- export_format: VARCHAR(20) ('pdf', 'word', 'markdown', 'html')
- file_url: TEXT (optional)
- exported_at: TIMESTAMP WITH TIME ZONE
```

**Indexes:**
- `idx_note_exports_note_id` on `note_id`
- `idx_note_exports_user_id` on `user_id`

## API Endpoints

### Notes CRUD

#### `POST /api/notes/` - Create note
**Request Body:**
```json
{
  "title": "Introduction to Calculus",
  "content": "<h3>Key Concepts</h3><p>Understanding derivatives...</p>",
  "date": "2024-01-15T10:00:00Z",
  "course": "Mathematics 101",
  "tutor": "Dr. Alice Johnson",
  "tags": "calculus, derivatives, exam",
  "background": "math",
  "background_url": null,
  "is_favorite": false,
  "word_count": 156
}
```

**Response:** `201 Created` with `NoteResponse`

#### `GET /api/notes/` - Get all notes
**Query Parameters:**
- `skip` (int, default=0): Pagination offset
- `limit` (int, default=50, max=100): Results per page
- `sort_by` (string): `date_desc`, `date_asc`, `title`, `course`, `created`
- `filter_favorite` (bool): Filter by favorite status
- `filter_course` (string): Filter by course name
- `filter_has_media` (bool): Filter by media presence
- `search` (string): Full-text search

**Response:** `200 OK` with `List[NoteListResponse]`

#### `GET /api/notes/{note_id}` - Get specific note
**Response:** `200 OK` with `NoteResponse` (includes media)

#### `PUT /api/notes/{note_id}` - Update note
**Request Body:** `NoteUpdate` (all fields optional)
**Response:** `200 OK` with `NoteResponse`

#### `PATCH /api/notes/{note_id}/favorite` - Toggle favorite
**Response:** `200 OK` with `NoteResponse`

#### `DELETE /api/notes/{note_id}` - Delete note
**Response:** `204 No Content`

#### `POST /api/notes/{note_id}/duplicate` - Duplicate note
**Response:** `201 Created` with `NoteResponse`

### Stats & Metadata

#### `GET /api/notes/stats` - Get user statistics
**Response:**
```json
{
  "total_notes": 42,
  "total_words": 15234,
  "total_courses": 8,
  "recent_notes": 12,
  "favorite_notes": 7,
  "notes_with_media": 5
}
```

#### `GET /api/notes/courses` - Get user's courses (autocomplete)
**Response:** `List[str]` of unique course names

#### `GET /api/notes/tutors` - Get user's tutors (autocomplete)
**Response:** `List[str]` of unique tutor names

### Media Management

#### `POST /api/notes/{note_id}/media` - Upload media
**Form Data:**
- `media_type`: "audio" or "video"
- `file`: UploadFile (audio/video file)
- `transcription` (optional): Transcribed text
- `transcription_language` (optional): Language code (e.g., "en-US")

**Supported Formats:**
- **Audio:** audio/webm, audio/mp3, audio/wav, audio/ogg
- **Video:** video/webm, video/mp4, video/mov

**Response:** `201 Created` with `NoteMediaResponse`

**Notes:**
- Files uploaded to Backblaze B2 at: `notes/{media_type}/{user_id}/{uuid}.{ext}`
- Automatically updates `note.has_media` flag

#### `GET /api/notes/{note_id}/media` - Get all media for note
**Response:** `List[NoteMediaResponse]`

#### `DELETE /api/notes/{note_id}/media/{media_id}` - Delete media
**Response:** `204 No Content`

### Export Tracking

#### `POST /api/notes/{note_id}/export` - Track export
**Request Body:**
```json
{
  "export_format": "pdf",
  "file_url": "optional_url_if_stored"
}
```

**Response:** `201 Created` with `NoteExportResponse`

#### `GET /api/notes/{note_id}/exports` - Get export history
**Response:** `List[NoteExportResponse]`

## Migration & Setup

### 1. Run Migration
```bash
cd astegni-backend
python migrate_create_notes_tables.py
```

This creates:
- 3 tables (notes, note_media, note_exports)
- 8 indexes for optimal query performance
- 2 triggers for auto-updating search vectors and timestamps

### 2. Verify Tables
```sql
-- Check tables
SELECT tablename FROM pg_tables
WHERE tablename IN ('notes', 'note_media', 'note_exports');

-- Check indexes
SELECT indexname FROM pg_indexes
WHERE tablename IN ('notes', 'note_media', 'note_exports');

-- Check triggers
SELECT tgname FROM pg_trigger WHERE tgname LIKE '%notes%';
```

## Frontend Integration

### Current State
- Notes stored in `localStorage` with key `'astegni_notes'`
- No backend sync
- Device-specific, lost on cache clear

### Migration Steps

1. **Add API configuration**
   ```javascript
   // js/config.js
   const API_BASE_URL = isProduction ? 'https://api.astegni.com' : 'http://localhost:8000';
   ```

2. **Update NotesManager methods**
   - `loadNotes()` → Fetch from `GET /api/notes/`
   - `saveNote()` → `POST /api/notes/` or `PUT /api/notes/{id}`
   - `deleteNote()` → `DELETE /api/notes/{id}`
   - `saveVoiceNote()` → `POST /api/notes/{id}/media` with FormData
   - `saveVideoNote()` → `POST /api/notes/{id}/media` with FormData

3. **Add authentication headers**
   ```javascript
   const headers = {
     'Authorization': `Bearer ${token}`,
     'Content-Type': 'application/json'
   };
   ```

4. **Handle media uploads**
   ```javascript
   async saveVoiceNote() {
     if (!this.recordedBlob) return;

     const formData = new FormData();
     formData.append('file', this.recordedBlob, 'voice.webm');
     formData.append('media_type', 'audio');

     const response = await fetch(`${API_BASE_URL}/api/notes/${noteId}/media`, {
       method: 'POST',
       headers: { 'Authorization': `Bearer ${token}` },
       body: formData
     });

     const media = await response.json();
     this.closeVoiceRecorder();
   }
   ```

5. **Migrate localStorage data (optional)**
   ```javascript
   async migrateLocalStorageNotes() {
     const localNotes = JSON.parse(localStorage.getItem('astegni_notes') || '[]');

     for (const note of localNotes) {
       await fetch(`${API_BASE_URL}/api/notes/`, {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${token}`,
           'Content-Type': 'application/json'
         },
         body: JSON.stringify(note)
       });
     }

     // Clear localStorage after migration
     localStorage.removeItem('astegni_notes');
   }
   ```

## Features Supported

### ✅ Implemented in Backend
- Full CRUD operations
- Rich HTML content storage
- Voice/video recording storage (Backblaze B2)
- Full-text search with weighted relevance
- Filtering (favorite, course, media)
- Sorting (date, title, course, created)
- Pagination
- Statistics dashboard
- Course/tutor autocomplete
- Export tracking
- Media transcription storage
- Duplicate notes
- Toggle favorite

### 📝 Frontend Needs to Implement
- API integration (replace localStorage calls)
- Authentication headers
- Media upload with FormData
- Error handling
- Loading states
- Offline support (optional)
- Sync conflict resolution (optional)

## Security

- **Authentication:** All endpoints require valid JWT token (`get_current_user` dependency)
- **Authorization:** Users can only access their own notes (filtered by `user_id`)
- **File Upload:**
  - Validated MIME types
  - Size limits enforced by FastAPI
  - Unique filenames with UUID
  - Secure storage in Backblaze B2
- **SQL Injection:** Protected by SQLAlchemy ORM
- **XSS:** Content stored as-is (HTML sanitization should be done on frontend)

## Performance

- **Indexes:** Optimized for common queries (user_id, favorite, course, search)
- **Pagination:** Default 50 items, max 100 per page
- **Full-Text Search:** PostgreSQL tsvector with weighted fields
- **Cascade Delete:** Media and exports deleted automatically when note deleted
- **Eager Loading:** Media included in note detail endpoint

## Testing

### Manual Testing with curl

```bash
# 1. Get auth token
TOKEN=$(curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  | jq -r '.access_token')

# 2. Create note
NOTE_ID=$(curl -X POST http://localhost:8000/api/notes/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Note",
    "content": "<p>This is a test</p>",
    "course": "Mathematics 101",
    "word_count": 4
  }' | jq -r '.id')

# 3. Get all notes
curl -X GET "http://localhost:8000/api/notes/?limit=10" \
  -H "Authorization: Bearer $TOKEN"

# 4. Get stats
curl -X GET http://localhost:8000/api/notes/stats \
  -H "Authorization: Bearer $TOKEN"

# 5. Upload voice note
curl -X POST "http://localhost:8000/api/notes/$NOTE_ID/media" \
  -H "Authorization: Bearer $TOKEN" \
  -F "media_type=audio" \
  -F "file=@voice.webm"

# 6. Toggle favorite
curl -X PATCH "http://localhost:8000/api/notes/$NOTE_ID/favorite" \
  -H "Authorization: Bearer $TOKEN"

# 7. Delete note
curl -X DELETE "http://localhost:8000/api/notes/$NOTE_ID" \
  -H "Authorization: Bearer $TOKEN"
```

## Troubleshooting

### Migration fails
```bash
# Check database connection
python astegni-backend/test_connection.py

# Run migration with verbose output
python astegni-backend/migrate_create_notes_tables.py
```

### Import errors
```bash
# Ensure models are imported correctly
cd astegni-backend
python -c "from app.py modules.models import Note, NoteMedia, NoteExport"
```

### Endpoints not working
```bash
# Check if endpoints registered
curl http://localhost:8000/docs
# Look for /api/notes/ endpoints

# Check logs
tail -f astegni-backend/logs/app.log
```

## Future Enhancements

- **Collaborative Notes:** Share notes with other users
- **Real-time Sync:** WebSocket updates for multi-device editing
- **Note Templates:** Pre-formatted templates for different subjects
- **AI Features:** Auto-summarization, grammar check, content suggestions
- **Tags System:** Separate table for tags with autocomplete
- **Note Folders:** Organize notes into folders/categories
- **Version History:** Track note changes over time
- **Export Queue:** Background job for generating PDF/Word exports
- **OCR:** Extract text from uploaded images
- **Speech-to-Text API:** Server-side transcription for media files

## Related Files

**Backend:**
- `/astegni-backend/migrate_create_notes_tables.py` - Migration script
- `/astegni-backend/app.py modules/models.py` - SQLAlchemy models (lines 2582-2768)
- `/astegni-backend/notes_endpoints.py` - API endpoints
- `/astegni-backend/app.py` - Main app (lines 406-408)

**Frontend:**
- `/js/common-modals/notes-manager.js` - Notes manager (localStorage version)
- `/js/common-modals/advanced-notes.js` - Advanced notes manager
- `/modals/common-modals/notes-modal.html` - Notes editor modal
- `/css/common-modals/advanced-notes.css` - Notes styling

## Summary

Complete backend infrastructure for notes system with:
- ✅ 3 database tables with optimal indexes
- ✅ 20+ API endpoints for full CRUD + media + exports
- ✅ Full-text search with PostgreSQL
- ✅ Voice/video storage in Backblaze B2
- ✅ User statistics and analytics
- ✅ Export tracking
- ✅ Autocomplete support for courses/tutors
- ✅ Security with JWT authentication
- ✅ Pagination and filtering
- ✅ Comprehensive documentation

**Next Step:** Update frontend to use these APIs instead of localStorage!
