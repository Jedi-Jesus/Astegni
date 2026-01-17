# Notes Media Storage - Voice & Video Recordings

## Storage Location: Backblaze B2 Cloud Storage ☁️

Voice and video recordings from notes are **NOT stored locally** or in the PostgreSQL database. They are uploaded to **Backblaze B2 cloud storage** (similar to AWS S3).

## How It Works

### 1. Recording Process

**Frontend** ([advanced-notes.js](js/common-modals/advanced-notes.js)):
- User records voice/video in browser using MediaRecorder API
- Recording is stored temporarily in browser memory as a Blob
- When user clicks "Save", the Blob is sent to backend

### 2. Upload to Backblaze B2

**Backend** ([notes_endpoints.py](astegni-backend/notes_endpoints.py) line 422-433):

```python
# Upload to Backblaze B2
file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'webm'
unique_filename = f"notes/{media_type}/{current_user.id}/{uuid.uuid4()}.{file_extension}"

try:
    b2_service = get_backblaze_service()
    file_url = b2_service.upload_file(file_content, unique_filename, file.content_type)
except Exception as e:
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"Failed to upload file: {str(e)}"
    )
```

### 3. Database Record

**Database** (`note_media` table):
- Only metadata is stored in PostgreSQL:
  - `file_url` - URL to file in Backblaze B2
  - `media_type` - "audio" or "video"
  - `file_size` - Size in bytes
  - `duration` - Duration in seconds (optional)
  - `mime_type` - e.g., "audio/webm", "video/webm"

**The actual audio/video file is in Backblaze B2, not the database!**

## File Organization in Backblaze B2

### Bucket Structure:

```
astegni-media/  (bucket name)
└── notes/
    ├── audio/
    │   ├── 1/  (user_id)
    │   │   ├── a1b2c3d4-e5f6-7890-abcd-ef1234567890.webm
    │   │   ├── b2c3d4e5-f6a7-8901-bcde-f12345678901.webm
    │   │   └── ...
    │   ├── 2/
    │   │   └── ...
    │   └── ...
    └── video/
        ├── 1/
        │   ├── c3d4e5f6-a7b8-9012-cdef-123456789012.webm
        │   └── ...
        └── ...
```

### File Path Format:

```
notes/{media_type}/{user_id}/{uuid}.{extension}
```

**Examples:**
- `notes/audio/1/a1b2c3d4-e5f6-7890-abcd-ef1234567890.webm`
- `notes/video/3/c3d4e5f6-a7b8-9012-cdef-123456789012.mp4`

### File Naming:

- **Unique ID:** Each file gets a UUID (universally unique identifier)
- **No name collisions:** UUID ensures files never overwrite each other
- **User isolation:** Files organized by user_id folder

## Supported File Formats

### Audio (Voice Notes):
- ✅ `audio/webm` - WebM audio (default from browser)
- ✅ `audio/mp3` - MP3
- ✅ `audio/wav` - WAV
- ✅ `audio/ogg` - Ogg Vorbis

### Video:
- ✅ `video/webm` - WebM video (default from browser)
- ✅ `video/mp4` - MP4
- ✅ `video/mov` - QuickTime MOV

## Backblaze B2 Configuration

### Environment Variables (.env):

```bash
BACKBLAZE_KEY_ID=your_key_id
BACKBLAZE_APPLICATION_KEY=your_application_key
BACKBLAZE_BUCKET_NAME=astegni-media
```

### Service File:

**Location:** `astegni-backend/backblaze_service.py`

**Key Functions:**
- `get_backblaze_service()` - Returns configured B2 client
- `upload_file(file_content, file_path, content_type)` - Uploads file and returns public URL

## Data Flow

### Upload Flow:

```
1. User records voice/video in browser
   ↓
2. Frontend sends Blob to POST /api/notes/{id}/media
   ↓
3. Backend receives file
   ↓
4. Backend generates unique filename with UUID
   ↓
5. Backend uploads to Backblaze B2
   ↓
6. Backblaze returns public URL
   ↓
7. Backend saves URL to note_media table
   ↓
8. Frontend receives URL and displays success
```

### Playback Flow:

```
1. User opens note with media
   ↓
2. Frontend fetches note data (includes media URLs)
   ↓
3. Browser loads media directly from Backblaze B2 URL
   ↓
4. User plays audio/video
```

## Database Schema

### `note_media` Table:

```sql
CREATE TABLE note_media (
    id SERIAL PRIMARY KEY,
    note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,

    -- Media details
    media_type VARCHAR(20) NOT NULL,  -- 'audio' or 'video'
    file_url TEXT NOT NULL,  -- URL to media file in Backblaze B2
    file_size INTEGER,  -- File size in bytes
    duration INTEGER,  -- Duration in seconds
    mime_type VARCHAR(100),  -- e.g., 'audio/webm', 'video/webm'

    -- Metadata
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Optional transcription
    transcription TEXT,
    transcription_language VARCHAR(10),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Example Record:

```json
{
  "id": 1,
  "note_id": 42,
  "media_type": "audio",
  "file_url": "https://f004.backblazeb2.com/file/astegni-media/notes/audio/1/a1b2c3d4-e5f6-7890-abcd-ef1234567890.webm",
  "file_size": 524288,
  "duration": 30,
  "mime_type": "audio/webm",
  "recorded_at": "2026-01-16T10:30:00Z",
  "transcription": null,
  "transcription_language": null,
  "created_at": "2026-01-16T10:30:05Z"
}
```

## Why Backblaze B2?

### Advantages:

1. **Scalable** - No storage limits
2. **Fast** - CDN delivery for quick playback
3. **Reliable** - 99.999999999% durability
4. **Cost-effective** - Cheaper than AWS S3
5. **Professional** - Industry-standard object storage
6. **No server disk space** - Doesn't fill up your server

### Compared to Local Storage:

| Feature | Local Storage | Backblaze B2 |
|---------|--------------|--------------|
| **Scalability** | Limited by disk | Unlimited |
| **Cost** | Free but limited | Pay per GB (cheap) |
| **Speed** | Fast local, slow remote | Fast CDN globally |
| **Reliability** | Single point of failure | 99.999999999% durability |
| **Backup** | Manual | Automatic |
| **Server Load** | High | Minimal |

## Accessing Media Files

### From Frontend:

```javascript
// Media URLs are included in note response
const note = await fetch('/api/notes/42');
const data = await note.json();

// Get media
data.media.forEach(media => {
  console.log('Media URL:', media.file_url);
  console.log('Type:', media.media_type);

  // Play directly
  if (media.media_type === 'audio') {
    const audio = new Audio(media.file_url);
    audio.play();
  } else if (media.media_type === 'video') {
    const video = document.createElement('video');
    video.src = media.file_url;
    video.play();
  }
});
```

### Direct Browser Access:

You can open the Backblaze B2 URL directly in browser:
```
https://f004.backblazeb2.com/file/astegni-media/notes/audio/1/a1b2c3d4-e5f6-7890-abcd-ef1234567890.webm
```

## File Size Limits

**Current Limits:**
- Maximum upload size: Configured in FastAPI (default: no explicit limit)
- Recommended max: 50MB per file
- Backblaze B2 limit: 10GB per file (way more than needed)

**Browser Recording:**
- Voice notes: ~100KB per minute (depends on quality)
- Video notes: ~5MB per minute (depends on resolution/quality)

**Example:**
- 5-minute voice note ≈ 500KB
- 5-minute video note ≈ 25MB

## Cost Estimate

**Backblaze B2 Pricing (as of 2026):**
- Storage: $0.005 per GB/month
- Download: $0.01 per GB

**Example:**
- 1000 voice notes (5 min each, 500KB) = 500MB ≈ $0.0025/month
- 100 video notes (5 min each, 25MB) = 2.5GB ≈ $0.0125/month

**Very affordable!**

## Security

### Access Control:

- ✅ Files are public URLs (anyone with URL can access)
- ✅ URLs contain UUIDs - hard to guess
- ✅ Database enforces note ownership (user can only see their own media URLs)
- ⚠️ If someone gets the URL, they can access the file

### For Private Media:

If you need private media (not accessible via direct URL):
1. Use signed URLs with expiration
2. Proxy media through backend
3. Configure bucket as private (requires authentication)

**Current Setup:** Public URLs (simpler, faster, good for most use cases)

## Deleting Media

When a note is deleted:
1. Database record in `note_media` is deleted (CASCADE)
2. ⚠️ **File remains in Backblaze B2**

**To clean up orphaned files:**
- Run periodic cleanup script
- Check database for file URLs
- Delete files not referenced in database

**Note:** This is a future enhancement. For now, deleted media files remain in B2 (small cost impact).

## Monitoring

### Check Storage Usage:

Login to Backblaze B2 dashboard:
- https://www.backblaze.com/b2/cloud-storage.html
- View bucket: `astegni-media`
- See total size and file count

### Database Queries:

```sql
-- Total media files
SELECT COUNT(*) FROM note_media;

-- Total storage used (from file_size)
SELECT
  media_type,
  COUNT(*) as count,
  SUM(file_size) / (1024*1024) as total_mb
FROM note_media
GROUP BY media_type;

-- Media per user
SELECT
  notes.profile_id,
  COUNT(*) as media_count,
  SUM(note_media.file_size) / (1024*1024) as total_mb
FROM note_media
JOIN notes ON note_media.note_id = notes.id
GROUP BY notes.profile_id;
```

## Summary

🎤 **Voice Notes:** Uploaded to `notes/audio/{user_id}/{uuid}.webm` in Backblaze B2

🎥 **Video Notes:** Uploaded to `notes/video/{user_id}/{uuid}.webm` in Backblaze B2

💾 **Database:** Only stores metadata (URL, size, type) in `note_media` table

☁️ **Cloud Storage:** Backblaze B2 provides scalable, fast, reliable storage

🌐 **Access:** Direct public URLs for streaming in browser

💰 **Cost:** Very affordable (~$0.005 per GB/month)

---

**Storage Location:** Backblaze B2 Cloud Storage
**Bucket:** `astegni-media`
**Path Format:** `notes/{audio|video}/{user_id}/{uuid}.{ext}`
