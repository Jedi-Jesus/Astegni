# Backblaze B2 Folder Structure

## Overview
The Astegni platform uses Backblaze B2 for file storage with an organized folder structure to keep different types of media separated and easily manageable.

## Folder Structure

### Images (`images/`)
- **`images/posts/`** - Images uploaded as posts
- **`images/chat/`** - Images shared in chat conversations
- **`images/profile/`** - User profile pictures (organized by profile_id)
- **`images/cover/`** - Profile cover photos (organized by profile_id)
- **`images/thumbnails/`** - Video thumbnails
- **`images/blog/`** - Blog post images
- **`images/news/`** - News article images
- **`images/stories/`** - Image stories (organized by profile_id)

### Audio (`audio/`)
- **`audio/lectures/`** - Lecture audio recordings
- **`audio/podcasts/`** - Podcast episodes
- **`audio/chat/`** - Voice messages and audio files from chat

### Videos (`videos/`)
- **`videos/ad/`** - Advertisement videos
- **`videos/lectures/`** - Lecture video recordings
- **`videos/chat/`** - Videos shared in chat
- **`videos/programs/`** - Program/course videos
- **`videos/stories/`** - Video stories (organized by profile_id)

### Documents (`documents/`)
- **`documents/chat/`** - Documents shared through chat
- **`documents/resources/`** - Educational resources and materials
- **`documents/files/`** - Student/Tutor files (achievements, academic certificates, extracurricular activities, organized by profile_id)

## Usage Examples

### Python Backend Usage

```python
from backblaze_service import get_backblaze_service

# Get the service instance
b2_service = get_backblaze_service()

# Upload a profile picture
with open('user_photo.jpg', 'rb') as f:
    result = b2_service.upload_file(
        file_data=f.read(),
        file_name='user_photo.jpg',
        file_type='profile'  # Will go to images/profile/
    )

# Upload a lecture video
with open('math_lecture.mp4', 'rb') as f:
    result = b2_service.upload_file(
        file_data=f.read(),
        file_name='math_lecture.mp4',
        file_type='lecture_video'  # Will go to videos/lectures/
    )

# Upload a voice message
with open('voice_message.mp3', 'rb') as f:
    result = b2_service.upload_file(
        file_data=f.read(),
        file_name='voice_message.mp3',
        file_type='voice_message'  # Will go to audio/chat/
    )

# Upload a chat document
with open('assignment.pdf', 'rb') as f:
    result = b2_service.upload_file(
        file_data=f.read(),
        file_name='assignment.pdf',
        file_type='chat_document'  # Will go to documents/chat/
    )

# Upload an ad video
with open('promo.mp4', 'rb') as f:
    result = b2_service.upload_file(
        file_data=f.read(),
        file_name='promo.mp4',
        file_type='ad'  # Will go to videos/ad/
    )
```

### File Type Mappings

Use these file type strings when uploading:

#### Images
- `'profile'` → `images/profile/` (organized by profile_id)
- `'cover'` → `images/cover/` (organized by profile_id)
- `'thumbnail'` → `images/thumbnails/`
- `'post_image'` → `images/posts/`
- `'chat_image'` → `images/chat/`
- `'blog_image'` → `images/blog/`
- `'news_image'` → `images/news/`
- `'story_image'` → `images/stories/` (organized by profile_id)

#### Audio
- `'lecture_audio'` → `audio/lectures/`
- `'podcast'` → `audio/podcasts/`
- `'chat_audio'` or `'voice_message'` → `audio/chat/`

#### Videos
- `'ad'` or `'ad_video'` → `videos/ad/`
- `'lecture_video'` → `videos/lectures/`
- `'chat_video'` → `videos/chat/`
- `'program'` or `'program_video'` → `videos/programs/`
- `'story_video'` or `'story'` → `videos/stories/` (organized by profile_id)

#### Documents
- `'chat_document'` → `documents/chat/`
- `'resource'` or `'resource_document'` → `documents/resources/`
- `'files'` or `'student_files'` → `documents/files/` (student/tutor files, organized by profile_id)

### Story Upload Examples

```python
# Upload a video story (tutor, student, parent, advertiser, etc.)
with open('my_story.mp4', 'rb') as f:
    result = b2_service.upload_file(
        file_data=f.read(),
        file_name='my_story.mp4',
        file_type='story_video',  # Will go to videos/stories/user_profile_{id}/
        user_id='profile_123'  # Profile ID with 'profile_' prefix
    )
# Result path: videos/stories/user_profile_123/my_story_20240115_143022.mp4

# Upload an image story
with open('my_story.jpg', 'rb') as f:
    result = b2_service.upload_file(
        file_data=f.read(),
        file_name='my_story.jpg',
        file_type='story_image',  # Will go to images/stories/user_profile_{id}/
        user_id='profile_123'  # Profile ID with 'profile_' prefix
    )
# Result path: images/stories/user_profile_123/my_story_20240115_143022.jpg
```

### Student/Tutor File Upload Example

```python
# Upload a student achievement certificate
with open('achievement_certificate.pdf', 'rb') as f:
    result = b2_service.upload_file(
        file_data=f.read(),
        file_name='achievement_certificate.pdf',
        file_type='files',  # Will go to documents/files/user_{student_profile_id}/
        user_id='28'  # Student profile ID (from student_profiles table)
    )
# Result path: documents/files/user_28/achievement_certificate_20240115_143022.pdf
```

### Default Behavior

If no specific file type is provided, files will be automatically organized based on their extension:
- Image files (jpg, png, etc.) → `images/posts/`
- Video files (mp4, avi, etc.) → `videos/programs/`
- Audio files (mp3, wav, etc.) → `audio/lectures/`
- Document files (pdf, doc, etc.) → `documents/resources/`

## API Endpoint Examples

When implementing file upload endpoints, specify the file type:

```python
@app.post("/api/upload/profile-picture")
async def upload_profile_picture(file: UploadFile):
    content = await file.read()
    result = b2_service.upload_file(
        file_data=content,
        file_name=file.filename,
        file_type='profile'
    )
    return {"url": result['url']}

@app.post("/api/upload/chat-file")
async def upload_chat_file(file: UploadFile):
    content = await file.read()

    # Determine type based on file extension
    ext = file.filename.split('.')[-1].lower()
    if ext in ['jpg', 'png', 'gif']:
        file_type = 'chat_image'
    elif ext in ['mp4', 'avi', 'mov']:
        file_type = 'chat_video'
    elif ext in ['mp3', 'wav', 'ogg', 'm4a']:
        file_type = 'chat_audio'
    else:
        file_type = 'chat_document'

    result = b2_service.upload_file(
        file_data=content,
        file_name=file.filename,
        file_type=file_type
    )
    return {"url": result['url']}
```

## Maintenance

To recreate or update the folder structure:
```bash
cd astegni-backend
python setup_b2_folders.py
```

To test uploads:
```bash
python setup_b2_folders.py --test
```