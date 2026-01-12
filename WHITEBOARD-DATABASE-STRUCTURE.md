# Whiteboard System - Complete Database & Architecture Analysis

## Overview
The Whiteboard system is a comprehensive IP-protected digital teaching platform with **8 database tables** and **34+ API endpoints**. This document provides a complete picture for debugging.

---

## Database Tables (8 Total)

### 1. **whiteboard** (10 rows)
Main whiteboard configuration and metadata table.

**Columns:**
- `id` (INTEGER, PK) - Unique whiteboard ID
- `session_id` (INTEGER) - Links to whiteboard_sessions
- `actual_start` (TIMESTAMP) - When whiteboard was actually opened
- `actual_end` (TIMESTAMP) - When whiteboard was closed
- `coursework_id` (INTEGER) - Associated coursework
- `canvas_id` (INTEGER) - Canvas reference
- `notes_id` (INTEGER) - Session notes reference
- `student_permission` (JSONB) - Permission object: `{"can_draw": false, "can_erase": false, "can_write": false}`
- `is_recording` (BOOLEAN, DEFAULT false) - Recording status
- `recording_id` (INTEGER) - Active recording reference
- `status` (VARCHAR(50), DEFAULT 'scheduled') - Status: scheduled/active/ended
- `lab_id` (INTEGER) - Digital Lab reference
- `created_at`, `updated_at` (TIMESTAMP)

**Purpose:** Central whiteboard configuration and state management.

---

### 2. **whiteboard_sessions** (76 rows)
Core session tracking table (profile-based, not user-based).

**Columns:**
- `id` (INTEGER, PK) - Session ID
- `booking_id` (INTEGER, NULLABLE) - Links to tutor_student_bookings (optional)
- `session_title` (VARCHAR(300)) - Session name
- `session_description` (TEXT) - Session details
- `scheduled_start`, `scheduled_end` (TIMESTAMP) - Planned time
- `actual_start`, `actual_end` (TIMESTAMP) - Real time
- `status` (VARCHAR(50), DEFAULT 'scheduled') - scheduled/active/completed/cancelled
- `student_permissions` (JSONB) - `{"can_draw": false, "can_erase": false, "can_write": false}`
- `session_notes` (TEXT) - Post-session notes
- `attendance_status` (VARCHAR(50), DEFAULT 'pending') - pending/attended/missed
- `is_recording` (BOOLEAN, DEFAULT false)
- `recording_started_at` (TIMESTAMP)
- `has_recordings` (BOOLEAN, DEFAULT false)
- **`tutor_profile_id`** (INTEGER) - Tutor's profile ID
- **`student_profile_ids`** (ARRAY) - Array of student profile IDs
- **`host_profile_id`** (INTEGER) - Session host profile ID
- **`host_profile_type`** (VARCHAR(20)) - 'tutor' or 'student'
- **`participant_profile_ids`** (ARRAY) - All participant profile IDs
- **`participant_profile_types`** (ARRAY) - Corresponding profile types
- `created_at`, `updated_at` (TIMESTAMP)

**Purpose:** Session lifecycle management. Uses **profile_id** system (not user_id).

**Note:** `whiteboard_sessions_legacy_backup_20260110_101940` contains old schema with `tutor_id`, `student_id` (76 rows).

---

### 3. **whiteboard_pages** (94 rows)
Multi-page canvas system.

**Columns:**
- `id` (INTEGER, PK) - Page ID
- `session_id` (INTEGER, NOT NULL) - Parent session
- `page_number` (INTEGER, NOT NULL, DEFAULT 1) - Page order
- `page_title` (VARCHAR(200)) - Page name
- `background_color` (VARCHAR(20), DEFAULT '#FFFFFF') - Page background
- `background_image` (VARCHAR(500)) - Background image URL
- `is_active` (BOOLEAN, DEFAULT false) - Currently active page
- `created_at`, `updated_at` (TIMESTAMP)

**Purpose:** Multi-page whiteboard support. Each session can have multiple pages.

---

### 4. **whiteboard_canvas_data** (300 rows)
Stores all drawing strokes and elements (profile-based).

**Columns:**
- `id` (INTEGER, PK) - Stroke ID
- `page_id` (INTEGER, NOT NULL) - Parent page
- `session_id` (INTEGER, NOT NULL) - Parent session
- `user_id` (INTEGER, NOT NULL) - Legacy field (still populated)
- **`profile_id`** (INTEGER) - Profile who created stroke
- **`profile_type`** (VARCHAR(20)) - 'tutor' or 'student'
- `stroke_type` (VARCHAR(50), NOT NULL) - pen/line/rectangle/circle/triangle/arrow/text/eraser
- `stroke_data` (JSONB, NOT NULL) - Drawing data: `{x, y, width, color, points, text, etc}`
- `stroke_order` (INTEGER, NOT NULL) - Z-index for layering
- `is_deleted` (BOOLEAN, DEFAULT false) - Soft delete for undo
- `created_at` (TIMESTAMP)

**Purpose:** Real-time canvas synchronization. All drawing data stored here.

---

### 5. **whiteboard_chat_messages** (23 rows)
In-whiteboard chat system.

**Columns:**
- `id` (INTEGER, PK) - Message ID
- `session_id` (INTEGER, NOT NULL) - Parent session
- `sender_id` (INTEGER, NOT NULL) - User who sent message
- `message_text` (TEXT, NOT NULL) - Message content
- `message_type` (VARCHAR(50), DEFAULT 'text') - text/file/image
- `file_url` (VARCHAR(500)) - Attached file URL
- `is_read` (BOOLEAN, DEFAULT false) - Read status
- `created_at` (TIMESTAMP)

**Purpose:** Live chat within whiteboard sessions (separate from main chat system).

---

### 6. **whiteboard_session_recordings** (6 rows)
Session recording metadata.

**Columns:**
- `id` (INTEGER, PK) - Recording ID
- `session_id` (INTEGER, NOT NULL) - Parent session
- `recording_title` (VARCHAR(255), NOT NULL) - Recording name
- `recording_type` (VARCHAR(50), DEFAULT 'video') - video/screen/audio
- `file_url` (TEXT) - Backblaze B2 URL
- `file_size_bytes` (BIGINT) - File size
- `duration_seconds` (INTEGER) - Recording length
- `thumbnail_url` (TEXT) - Preview thumbnail
- `board_snapshot` (JSONB) - Canvas state snapshot
- `recording_metadata` (JSONB) - Additional data
- `recording_date` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
- `is_processing` (BOOLEAN, DEFAULT false) - Processing status
- `is_available` (BOOLEAN, DEFAULT true) - Available to view
- `student_id` (ARRAY) - Students with access
- `created_at`, `updated_at` (TIMESTAMP)

**Purpose:** Recording storage and access control.

---

### 7. **whiteboard_call_history** (181 rows) - PROFILE-BASED
Video call tracking system (uses profile_id, not user_id).

**Columns:**
- `id` (INTEGER, PK) - Call ID
- **`caller_profile_id`** (INTEGER, NOT NULL) - Caller's profile ID
- **`caller_profile_type`** (VARCHAR(50), NOT NULL) - 'tutor' or 'student'
- `caller_user_id` (INTEGER, NOT NULL) - Caller's user ID (redundant)
- `caller_name` (VARCHAR(255)) - Caller name
- `caller_avatar` (TEXT) - Caller avatar URL
- **`callee_profile_id`** (INTEGER, NOT NULL) - Callee's profile ID
- **`callee_profile_type`** (VARCHAR(50), NOT NULL) - 'tutor' or 'student'
- `callee_user_id` (INTEGER) - Callee's user ID
- `callee_name` (VARCHAR(255)) - Callee name
- `callee_avatar` (TEXT) - Callee avatar URL
- `call_type` (VARCHAR(20), NOT NULL, DEFAULT 'video') - video/audio/screen
- `status` (VARCHAR(30), NOT NULL, DEFAULT 'initiated') - initiated/ringing/answered/ended/missed/rejected/failed
- `whiteboard_session_id` (INTEGER) - Associated whiteboard session
- `tutor_package_name` (VARCHAR(255)) - Package context
- `tutor_package_id` (INTEGER) - Package ID
- `enrollment_id` (INTEGER) - Enrollment reference
- `initiated_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
- `answered_at` (TIMESTAMP)
- `ended_at` (TIMESTAMP)
- `duration_seconds` (INTEGER, DEFAULT 0)
- `is_multi_party` (BOOLEAN, DEFAULT false) - Group call flag
- `participants` (JSONB) - Multi-party participant data
- `caller_seen` (BOOLEAN, DEFAULT true) - Caller viewed call
- `callee_seen` (BOOLEAN, DEFAULT false) - Callee viewed call
- `canvas_snapshot` (JSONB) - Whiteboard state at call end
- `recording_url` (TEXT) - Call recording URL
- `created_at`, `updated_at` (TIMESTAMP)

**Purpose:** Complete call history tracking. **CRITICAL:** Uses profile_id system, not user_id.

---

### 8. **tutor_student_bookings** (Referenced, not in whiteboard schema)
Pre-scheduling table for whiteboard sessions.

**Purpose:** Optional booking system. Sessions can be created with or without bookings.

---

## API Endpoints (34+ Total)

### Booking Endpoints (3)
1. `POST /api/whiteboard/bookings` - Create booking
2. `GET /api/whiteboard/bookings/my-students` - Tutor's student bookings
3. `GET /api/whiteboard/bookings/my-tutors` - Student's tutor bookings

### Session Management (5)
4. `GET /api/whiteboard/sessions` - Get sessions by student
5. `POST /api/whiteboard/sessions` - Create session
6. `POST /api/whiteboard/sessions/quick-create` - Quick session creation
7. `GET /api/whiteboard/sessions/{session_id}` - Get session details
8. `GET /api/whiteboard/sessions/history/{user_type}/{user_id}` - Session history

### Canvas & Drawing (1)
9. `POST /api/whiteboard/canvas/stroke` - Add drawing stroke

### Chat (2)
10. `POST /api/whiteboard/chat/send` - Send chat message
11. `GET /api/whiteboard/chat/{session_id}` - Get chat messages

### Page Management (2)
12. `POST /api/whiteboard/pages/create` - Create new page
13. `POST /api/whiteboard/pages/{page_id}/activate` - Switch to page

### Recording (5)
14. `POST /api/whiteboard/recordings/start` - Start recording
15. `POST /api/whiteboard/recordings/stop` - Stop recording
16. `POST /api/whiteboard/recordings` - Create recording metadata
17. `GET /api/whiteboard/recordings/session/{session_id}` - Get session recordings
18. `DELETE /api/whiteboard/recordings/{recording_id}` - Delete recording
19. `POST /api/whiteboard/recordings/upload` - Upload recording file

### Context Data (8)
20. `GET /api/whiteboard/context/enrolled-students` - Tutor's enrolled students
21. `GET /api/whiteboard/context/coursework` - Tutor's coursework
22. `GET /api/whiteboard/context/tutor-info` - Tutor info
23. `GET /api/whiteboard/context/files` - Files for whiteboard
24. `GET /api/whiteboard/context/enrolled-tutors` - Student's enrolled tutors
25. `GET /api/whiteboard/context/student-coursework` - Student's coursework
26. `GET /api/whiteboard/context/student-info` - Student info
27. `GET /api/whiteboard/context/session-participants/{session_id}` - Participants

### Online Status (2)
28. `GET /api/whiteboard/online-users` - Online users
29. `GET /api/whiteboard/online-status/{profile_type}/{profile_id}` - Check online status

### Call History (6)
30. `GET /api/whiteboard/call-history` - Get call history
31. `GET /api/whiteboard/call-history/missed` - Get missed calls
32. `POST /api/whiteboard/call-history` - Create call record
33. `PUT /api/whiteboard/call-history/{call_id}/end` - End call
34. `GET /api/whiteboard/call-history/{call_id}` - Get call details
35. `PUT /api/whiteboard/call-history/{call_id}/recording` - Update call recording

---

## Frontend Architecture

### Main Files
- **Modal:** `modals/common-modals/whiteboard-modal.html` (1,031 lines)
- **Manager:** `js/tutor-profile/whiteboard-manager.js` (12,671 lines!)
- **Backend:** `astegni-backend/whiteboard_endpoints.py` (3,501 lines)

### Key Features in Modal
1. **3-Panel Layout:** Left sidebar (students/files/coursework/lab/history/settings), Center (canvas), Right sidebar (video/chat/AI)
2. **7 Drawing Tools:** Pen, text, line, rectangle, circle, triangle, arrow, eraser
3. **Multi-page Canvas:** Navigate between pages, add/delete pages
4. **Live Video Grid:** Host + participants (2 students per row)
5. **Digital Lab:** 6 subjects (Biology, Physics, Chemistry, Math, Computer, Music, Visual Art) with 36+ tools
6. **Real-time Chat:** In-whiteboard messaging
7. **AI Assistant:** Teaching AI with quick actions
8. **Session Recording:** Video recording with playback
9. **Permission System:** Host controls who can draw/write
10. **Ad Panel:** Slides in at 28 minutes (monetization)

---

## Critical Migration Notes

### ⚠️ Profile-Based System
The whiteboard system was migrated from **user_id** to **profile_id + profile_type** system:

**Old Schema (Legacy):**
- `tutor_id`, `student_id` in whiteboard_sessions
- `user_id` only in whiteboard_canvas_data

**New Schema (Current):**
- `tutor_profile_id`, `student_profile_ids[]`, `host_profile_id`, `host_profile_type`, `participant_profile_ids[]`, `participant_profile_types[]` in whiteboard_sessions
- `profile_id`, `profile_type` in whiteboard_canvas_data (user_id still exists for legacy)
- `caller_profile_id`, `caller_profile_type`, `callee_profile_id`, `callee_profile_type` in whiteboard_call_history

**Migration File:** `migrate_whiteboard_to_profile_ids.py`

---

## Known Issues & Debug Points

### Common Problems:
1. **403 Permission Errors** - Check profile_id vs user_id mismatch
2. **404 Session Not Found** - Verify session_id exists in whiteboard_sessions
3. **Canvas Not Syncing** - Check WebSocket connection + stroke_data JSONB format
4. **Text Tool Issues** - Text typing not broadcasting correctly (see WHITEBOARD-TEXT-* docs)
5. **Call History Empty** - Verify profile_type matches ('tutor' or 'student', case-sensitive)

### Debug Queries:
```sql
-- Check session participants
SELECT id, session_title, host_profile_id, host_profile_type,
       participant_profile_ids, participant_profile_types
FROM whiteboard_sessions WHERE id = ?;

-- Check canvas data
SELECT profile_id, profile_type, stroke_type, stroke_data
FROM whiteboard_canvas_data WHERE session_id = ? ORDER BY stroke_order;

-- Check call history
SELECT caller_profile_id, caller_profile_type,
       callee_profile_id, callee_profile_type, status
FROM whiteboard_call_history WHERE id = ?;

-- Check active pages
SELECT * FROM whiteboard_pages WHERE session_id = ? AND is_active = true;
```

---

## WebSocket System

**WebSocket Manager:** `astegni-backend/websocket_manager.py`

**Connection Format:**
- `ws://localhost:8000/ws?token={jwt_token}`

**Message Types:**
- `canvas_update` - New stroke added
- `page_change` - Page switched
- `permission_update` - Permissions changed
- `chat_message` - New chat message
- `session_start` - Session started
- `session_end` - Session ended
- `participant_joined` - New participant
- `participant_left` - Participant left

---

## File Storage

**Backblaze B2 Structure:**
```
astegni-media/
├── whiteboard/
│   ├── recordings/
│   │   └── session_{session_id}/video_{timestamp}.mp4
│   ├── canvas-snapshots/
│   │   └── session_{session_id}/snapshot_{page_id}.json
│   └── thumbnails/
│       └── recording_{recording_id}_thumb.jpg
```

---

## Performance Considerations

1. **Canvas Data:** 300 strokes across 94 pages in 76 sessions
2. **Call History:** 181 calls logged
3. **Real-time Sync:** WebSocket broadcasts to all session participants
4. **JSONB Indexing:** Consider indexing `stroke_data`, `student_permissions` for performance

---

## Summary

**Database:** 8 tables (83 total fields), profile-based architecture
**Backend:** 34+ endpoints, 3,501 lines of code
**Frontend:** 12,671 lines of JavaScript, 1,031 lines of HTML
**Features:** Multi-page canvas, live video, chat, AI, recording, Digital Lab
**Storage:** Backblaze B2 for recordings and snapshots
**Communication:** WebSocket for real-time sync

The whiteboard system is the most complex feature in Astegni, with IP-protected technology and comprehensive educational tools.

---

## Quick Debugging Checklist

- [ ] Check `profile_id` vs `user_id` usage
- [ ] Verify WebSocket connection established
- [ ] Confirm session exists in `whiteboard_sessions`
- [ ] Check active page in `whiteboard_pages`
- [ ] Verify permissions in `student_permissions` JSONB
- [ ] Check call history uses correct `profile_type`
- [ ] Confirm canvas strokes saved in `whiteboard_canvas_data`
- [ ] Verify JWT token includes profile info
- [ ] Check CORS settings for WebSocket
- [ ] Monitor browser console for WebSocket errors

---

**Generated:** 2026-01-10
**Database:** astegni_user_db (PostgreSQL)
**Version:** Astegni 2.1.0
