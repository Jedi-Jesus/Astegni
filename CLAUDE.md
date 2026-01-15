# CLAUDE.md

## Project Overview

Astegni is an educational platform connecting students, tutors, parents, and institutions. Currently serving Ethiopia with plans for global expansion (Africa → Worldwide). Features IP-protected Digital Whiteboard and Digital Lab technologies.

**Tech Stack:**
- Frontend: HTML/CSS/JavaScript (no build process), TailwindCSS CDN
- Backend: FastAPI, dual PostgreSQL databases, Backblaze B2 storage
- Architecture: 50+ specialized managers, WebSocket support, AES-256 encryption
- Version: 2.1.0

**Core Features:**
1. Tutor Marketplace - 4-factor rating system (Subject Matter, Communication, Discipline, Punctuality), verified reviews
2. Google OAuth + Email/Password authentication, multi-role system (student/tutor/parent/advertiser)
3. Digital Whiteboard - IP-protected, 7 tools, multi-page canvas, live chat (Phase 1 complete, Phase 2: WebRTC, real-time sync)
4. Chat System - AES-256 encryption, 35+ endpoints, rich media support
5. Educational Content - Videos, blogs, coursework, documents, credentials, reels
6. Community - Clubs, events, connections (profile-based)
7. Parent-Child Management - Multi-parent support, co-parent invitations

## Quick Development Workflow

### Start Servers
```bash
# Backend
cd astegni-backend && python app.py  # Port 8000

# Frontend (new terminal)
python dev-server.py  # Port 8081 (cache-disabled, RECOMMENDED)
# OR: python -m http.server 8080
```

### Access
- Frontend: http://localhost:8081
- API: http://localhost:8000/docs
- Whiteboard: http://localhost:8081/test-whiteboard.html

### Environment Setup (.env in astegni-backend/)
```bash
# Dual Database (CRITICAL)
DATABASE_URL=postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db
ADMIN_DATABASE_URL=postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db

# JWT
SECRET_KEY=your_jwt_secret_key
REFRESH_SECRET_KEY=your_refresh_secret_key
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Chat Encryption (run: python setup_chat_encryption.py)
CHAT_ENCRYPTION_KEY=generated_key_here

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_secret
GOOGLE_REDIRECT_URI=http://localhost:8081

# Backblaze B2
BACKBLAZE_KEY_ID=your_key_id
BACKBLAZE_APPLICATION_KEY=your_key
BACKBLAZE_BUCKET_NAME=astegni-media
```

### Common Commands
```bash
cd astegni-backend

# Setup
pip install -r requirements.txt
python init_db.py  # User database
python init_admin_db.py  # Admin database
python seed_tutor_data.py  # 17,000+ Ethiopian tutors

# Migrations (one-time)
python migrate_to_dual_databases.py  # Single → Dual DB migration
python migrate_create_whiteboard_tables.py
python seed_whiteboard_data.py
python setup_chat_encryption.py

# Testing
python test_connection.py
python test_chat_encryption.py
```

## Architecture

### Dual Database System (CRITICAL)
**astegni_user_db** (70+ tables): Users, profiles, content, educational data, chat, whiteboard
**astegni_admin_db** (13 tables): Admin users, settings, moderation, analytics, audit logs

**Migration:** `python migrate_to_dual_databases.py`

### Backend Structure
- `app.py` - Main entry point
- `app.py modules/models.py` - User DB models
- `app.py modules/admin_models.py` - Admin DB models
- `app.py modules/routes.py` - Core endpoints
- 30+ endpoint modules: `chat_endpoints.py`, `whiteboard_endpoints.py`, `blog_endpoints.py`, etc.

### Frontend Structure
- **No Build Process** - Pure HTML/CSS/JS
- **Modular JS**: Root → Feature → Page → Components
- **50+ Managers**: Advanced manager pattern
- **Global State**: `js/root/app.js` + localStorage
- **Modals**: 16 common (`modals/common-modals/`) + 64 profile-specific
- **Modal Loader**: `js/root/modal-loader.js` - Intelligent multi-path resolution

### Key Patterns

**State Management:**
```javascript
// js/root/app.js
let user = null;
let token = null;
let theme = localStorage.getItem('theme') || 'light';

// js/root/auth.js
const authManager = new AuthenticationManager();
authManager.initialize();
```

**API Config:**
```javascript
const API_BASE_URL = 'http://localhost:8000';
```

**CSS:**
- Use CSS variables from `css/root/theme.css` (never hardcode colors)
- Each style in one location only
- Import hierarchy: `css/root.css` → page-specific stylesheets

## API Endpoints (203+ Total)

### Authentication
- `POST /api/register`, `/api/login`, `/api/refresh`, `/api/logout`
- `POST /api/send-otp`, `/api/verify-otp`
- `POST /api/oauth/google` - Google OAuth login/register

### User Management
- `GET /api/me`, `/api/my-roles`
- `POST /api/switch-role`

### Tutors/Students/Parents
- `GET /api/tutors?page=1&limit=15`, `GET /api/tutor/{id}`
- `PUT /api/tutor/profile`, `/api/student/profile`, `/api/parent/profile`
- `POST /api/parent/invite-coparent`

### Chat (35+ endpoints)
- `POST /api/chat/conversations`, `GET /api/chat/conversations`
- `POST /api/chat/conversations/{id}/messages` - Auto-encrypted
- `GET /api/chat/conversations/{id}/messages` - Auto-decrypted
- `POST /api/chat/messages/{id}/react`, `/api/chat/block`

### Whiteboard (15 endpoints)
- `GET /api/whiteboard/bookings`, `/api/whiteboard/sessions`
- `POST /api/whiteboard/sessions/{id}/start`, `/end`
- `POST /api/whiteboard/canvas/save`
- `GET /api/whiteboard/canvas/{session_id}/{page_id}`

### Community
- `POST /api/clubs`, `GET /api/clubs`, `POST /api/clubs/{id}/join`
- `POST /api/events`, `GET /api/events`

### File Upload
- `POST /api/upload/profile-picture`, `/video`, `/chat-file`, `/document`
- Files: `{type}/{category}/user_{user_id}/{filename}_{timestamp}.{ext}`

## Database Schema

### User DB (astegni_user_db)
**Core:** users, students, tutors, parents, advertisers
**Profiles:** tutor_reviews (4-factor), student_reviews, parent_reviews, tutor_sessions, enrolled_students
**Content:** videos, blogs, playlists, documents, credentials, reels
**Educational:** courses, schedules, coursework, coursework_answers
**Social:** connections (profile_id + profile_type), notifications
**Chat (6 tables):** conversations, conversation_participants, messages (AES-256), message_reactions, blocked_contacts, call_logs
**Community:** clubs, club_members, events, event_attendees
**Whiteboard (5 tables):** tutor_student_bookings, whiteboard_sessions, whiteboard_pages, whiteboard_canvas_data, whiteboard_chat_messages
**Other:** otp_verifications, partner_requests, parent_invitations

### Admin DB (astegni_admin_db)
admin_users, admin_activity_logs, system_settings, moderation_queue, user_reports, platform_analytics, feature_flags, announcements, email_templates, scheduled_jobs, audit_trail, support_tickets, support_ticket_messages

### Breaking Changes
- `tutor_connections` → `connections` (profile-based: `profile_id` + `profile_type`)
- `quiz` → `coursework`
- `teaching_schedules` → `schedules`
- Old `documents` → `credentials` (achievements)
- New `documents` (teaching materials)

**API Changes:**
- Connections require `profile_id` + `profile_type` (not `user_id`)
- Chat requires `CHAT_ENCRYPTION_KEY` in .env
- Admin endpoints split between user_db and admin_db

## Development Patterns

### Adding New Features
1. Create directory: `js/feature-name/`
2. Separate: API, UI, Controller, State
3. Use manager pattern
4. CSS variables from `css/root/theme.css`
5. Add CSS in `css/feature-name/`

### Adding New API Endpoint
1. Choose database (user_db or admin_db)
2. Create `feature_endpoints.py`
3. Add models in `app.py modules/models.py` or `admin_models.py`
4. Import in `app.py`
5. Test at http://localhost:8000/docs
6. Update frontend

### Creating New Modal
1. Determine: common or profile-specific
2. Create in `modals/common-modals/` or `modals/[profile]/`
3. Create CSS in `css/common-modals/` or `css/[profile]/`
4. Load: `modalLoader.loadModal('modal-name.html')`

### Working with Dual Databases
```python
# User database
from app.py modules.models import SessionLocal, Student
db = SessionLocal()
students = db.query(Student).all()

# Admin database
from app.py modules.admin_models import AdminSessionLocal, SystemSettings
admin_db = AdminSessionLocal()
settings = admin_db.query(SystemSettings).all()
```

## Important Gotchas

### Backend
- **Dual Databases**: Use correct SessionLocal (user_db vs admin_db)
- **psycopg3**: Auto-converts `postgresql://` to `postgresql+psycopg://`
- **Rate Limits**: Auth 5/min, uploads 10/min, default 100/min
- **File uploads**: Always pass `user_id`
- **Chat encryption**: Set `CHAT_ENCRYPTION_KEY` in .env
- **Connections**: Use `profile_id` + `profile_type`, not `user_id`

### Frontend
- **No jQuery**: Vanilla JS only
- **Global functions**: Required for HTML `onclick` handlers
- **API Base URL**: `http://localhost:8000` (hardcoded in multiple files)
- **Theme**: Always use CSS variables, never hardcode colors
- **No ES6 modules**: Use script tags with proper ordering
- **Dev server**: Use `dev-server.py` (port 8081) for cache-disabled development

## Critical Files

### Backend
- `app.py`, `app.py modules/routes.py`, `app.py modules/models.py`, `app.py modules/admin_models.py`
- `utils.py`, `encryption_service.py`, `backblaze_service.py`, `websocket_manager.py`
- `chat_endpoints.py`, `whiteboard_endpoints.py`

### Frontend
- `js/root/app.js`, `js/root/auth.js`, `js/root/modal-loader.js`
- `css/root/theme.css`, `css/root.css`
- `index.html`, `dev-server.py`
- `branch/find-tutors.html` (advanced modular example)

### Profile Pages
- `profile-pages/tutor-profile.html`, `student-profile.html`, `parent-profile.html`
- `view-profiles/view-tutor.html`, `view-student.html`, `view-parent.html`

## Production Deployment

### Auto-Deployment System
Git push → GitHub webhook → Production server auto-pulls + restarts

**Production Server (Hetzner):**
- IP: `128.140.122.215`
- SSH: `ssh root@128.140.122.215` (Password: `UVgkFmAsh4N4`)
- Location: `/var/www/astegni/`
- URLs: https://astegni.com, https://api.astegni.com

**Deploy Workflow:**
```bash
# 1. Test locally
python dev-server.py && cd astegni-backend && python app.py

# 2. Commit and push (triggers auto-deployment)
git add . && git commit -m "Description" && git push origin main

# 3. Verify (via SSH)
ssh root@128.140.122.215
systemctl status astegni-backend
curl https://api.astegni.com/health
```

**What's Automated:**
- Code deployment, backend restart, frontend update, dependency installation

**Manual Steps Required:**
- Database migrations (SSH + run migration scripts)
- Database backups (`pg_dump astegni_user_db > backup.sql`)
- Environment variable updates (edit `/var/www/astegni/astegni-backend/.env`)
- SSL certificate renewal

**Production Stack:**
Nginx (80/443) → FastAPI (8000) → PostgreSQL (5432)

**Environment Detection (Auto):**
```javascript
// js/config.js
const isProduction = ['astegni.com', 'www.astegni.com'].includes(window.location.hostname);
const API_BASE_URL = isProduction ? 'https://api.astegni.com' : 'http://localhost:8000';
```

### Database Migration on Production
```bash
ssh root@128.140.122.215
cd /var/www/astegni/astegni-backend
source venv/bin/activate

# BACKUP FIRST!
pg_dump astegni_user_db > /var/backups/user_db_$(date +%Y%m%d_%H%M%S).sql
pg_dump astegni_admin_db > /var/backups/admin_db_$(date +%Y%m%d_%H%M%S).sql

# Run migration
python migrate_your_migration.py
systemctl restart astegni-backend
journalctl -u astegni-backend -f
```

### Rollback
```bash
ssh root@128.140.122.215
cd /var/www/astegni
git revert HEAD
systemctl restart astegni-backend
```

## Testing & Debugging

### Backend
```bash
cd astegni-backend
python test_connection.py  # Test both databases
curl http://localhost:8000/api/tutors
python test_chat_encryption.py
wscat -c ws://localhost:8000/ws
```

### Frontend
- Test pages: `test-whiteboard.html`, `debug-modals.html`, `check-backend.html`
- Browser DevTools: Network tab, Console
- No automated tests (manual testing)

### Common Issues
- **Database**: Ensure both `DATABASE_URL` and `ADMIN_DATABASE_URL` in .env
- **CORS**: Backend configured for localhost:8080 and localhost:8081
- **Auth**: Access tokens (30min), refresh tokens (7 days), localStorage
- **Chat**: Generate key with `python setup_chat_encryption.py`
- **Modals**: Check `modal-loader.js` path resolution

## Credentials (DEVELOPMENT ONLY)

**Local Database:**
- User: `astegni_user`, Password: `Astegni2025`
- Databases: `astegni_user_db`, `astegni_admin_db`

**Test User:**
- Email: `jediael.s.abebe@gmail.com`, Password: `@JesusJediael1234`

**Production Server:**
- SSH: `root@128.140.122.215`, Password: `UVgkFmAsh4N4`

**⚠️ NEVER use these in production! Generate new credentials.**

## Summary

- **Databases**: 2 (83+ tables total)
- **API Endpoints**: 203+ across 31+ modules
- **Backend**: 150+ Python files, 100+ migrations
- **Frontend**: 40+ pages, 80+ modals, 50+ JS managers, 60+ CSS modules
- **Production**: Hetzner, auto-deployment, astegni.com
- **Version**: 2.1.0

Ethiopian educational platform with IP-protected Digital Whiteboard/Lab, dual-database architecture, Google OAuth, AES-256 chat encryption, 203+ API endpoints, and automated production deployment.
