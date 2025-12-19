# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Astegni is a comprehensive educational platform initially designed for the Ethiopian market that connects students with tutors, parents, and educational institutions. Currently serving Ethiopia exclusively, Astegni's scalable architecture and **IP-protected innovations** (Digital Whiteboard and Digital Lab) position it to expand across Africa and eventually serve every country and every school in the world.

### Global Vision
- **Phase 1 (Current)**: Ethiopia - Launch market with complete tutor-student-parent ecosystem
- **Phase 2 (Planned)**: Pan-African Expansion - Kenya, Nigeria, Ghana, South Africa, Rwanda, Tanzania, Uganda, etc.
- **Phase 3 (Future)**: Global Reach - Every country, every school in the world (190+ countries)

**Why Astegni Can Go Global:**
- **IP-Protected Innovations**: Proprietary Digital Whiteboard and Digital Lab technologies
- **Curriculum Agnostic**: Adapts to any educational system (British, American, IB, local curriculums)
- **Multi-Language**: Supports 100+ languages with real-time translation
- **Multi-Currency**: Seamless currency conversion for global pricing
- **Cultural Adaptation**: Localizes to each country's educational context and culture
- **Scalable Architecture**: Built to handle millions of concurrent users worldwide

### The Problem We're Solving: Ethiopian Market Gap

**Why We Started with Tutors-Students-Parents (Not Schools)**

In Ethiopia, there is a **massive market gap** in the private tutoring sector:

**The Current Problem:**
- Many Ethiopian parents hire private tutors for their children (large existing market)
- **Finding quality tutors is extremely difficult** and unreliable:
  - Parents rely on **billboards posted on electric poles** (no vetting, no reviews)
  - Parents go to **agents or social media channels** claiming to provide tutors (no transparency)
  - **Tutors are not reviewed** - parents have no idea about their teaching quality, communication skills, or reliability
  - Parents have **no choice but to accept whoever is available** (blind trust)

**Real Story from Our Research:**
> *"I once wanted a tutor for my children, so I went to a university to ask for a teacher. They gave me someone. When the teacher came, my children told me that his communication skills were so low that the children knew more than him. We had to let him go and start searching all over again."*
> — Parent from Addis Ababa (User Research, 2024)

**Our Solution - The Tutor Rating System:**

To solve this exact problem, Astegni introduced a **comprehensive 4-factor tutor rating system**:

1. **Subject Matter Expertise** - Does the tutor truly know the subject?
2. **Communication Skills** - Can the tutor explain concepts clearly?
3. **Discipline** - Is the tutor professional and well-organized?
4. **Punctuality** - Does the tutor show up on time and respect schedules?

**Rating System Features:**
- Students and parents rate tutors after each session
- **Verified ratings** (only students who booked sessions can rate)
- Public tutor profiles with average ratings and reviews
- Filter tutors by rating (2-5 stars)
- Read detailed reviews from other parents and students
- See tutor response to reviews (transparency)

**Why This Matters:**
- **Empowers parents** to make informed decisions (no more blind trust)
- **Empowers students** to choose tutors that match their learning style
- **Rewards quality tutors** with better visibility and more bookings
- **Drives tutor excellence** through accountability and feedback

**From Seed Problem to Global Platform:**

What started as solving a **simple tutoring marketplace problem** has evolved into a comprehensive educational ecosystem:

1. **Phase 1 (Current)**: Tutor marketplace with ratings → Solved the trust and quality problem
2. **Phase 2 (Evolved)**: Added progress tracking, digital whiteboard, session management → Enhanced teaching effectiveness
3. **Phase 3 (Next)**: Institute integration, Digital Lab, IoT → Complete educational transformation
4. **Phase 4 (Future)**: Global expansion → Solve the same problem in every country

**The Bigger Vision:**

The Ethiopian tutoring market gap exists **worldwide**:
- Parents in Kenya, Nigeria, India, USA face the same problem (finding quality tutors)
- The trust and transparency issues are universal
- Our rating system and platform can solve this globally

But we're not stopping at tutors. Next, we're bringing schools onto the platform to solve institutional education challenges with the same transparency, accountability, and innovation.

### Core Features

**1. Tutor Marketplace (Solving the Trust & Quality Problem)**
- Advanced search and filtering system for finding tutors
- **4-Factor Rating System** (Subject Matter, Communication, Discipline, Punctuality)
- **Verified reviews** from students and parents who booked sessions
- Public tutor profiles with ratings, reviews, and credentials
- Filters by language (English, Amharic, Oromo, Gurage), grade level, subject, pricing (50-500 ETB), session format (online/in-person/hybrid), course, gender, rating, school, and location
- **Personalized matching** based on student's search history, grade level, and interested courses from their profile
- Location-based tutor discovery
- **Transparency and accountability** - no more blind trust in unverified tutors

**2. Authentication & User Management**
- **Google OAuth Sign-In** (NEW!): One-click login/registration with Google account
  - No password required for Google users
  - Auto-verified email addresses
  - Profile picture imported from Google
  - Seamless account creation or login
  - Secure OAuth 2.0 standard
- **Multi-Role System**: One user can be a Student, a Tutor, a Parent, and an Advertiser
- Each role has dedicated profile pages and functionality
- Ability to switch between roles for users with multiple profiles
- **Profile-based connections**: Connections use `profile_id` + `profile_type` for universal compatibility
- Traditional email/password authentication also available

**3. Digital Whiteboard (The "Holy Grail" Feature - IP-Protected)**
- **IP-Protected Innovation**: Proprietary collaborative whiteboard platform with patent-pending technology
- **Phase 1 (COMPLETE)**: Full-featured whiteboard with save/load functionality
- **Bi-directional collaboration**: Students can write and draw on the whiteboard when granted permission
- **Permission control system**: Tutors can grant/revoke student drawing permissions (can_draw, can_write, can_erase)
- Complete collaborative teaching platform
- 7 drawing tools (pen, eraser, text, line, rectangle, circle, arrow)
- Multi-page canvas support (unlimited pages with navigation)
- Session management (scheduled → in-progress → completed)
- Keyboard shortcuts for efficiency
- Canvas data persistence to database
- **Real-time messaging**: Built-in chat system for tutor-student communication during sessions
- File upload/import capabilities (images, PDFs, documents)
- Export functionality (save sessions as PDFs, images, shareable files)
- **Phase 2 (PLANNED - Advanced Features)**:
  - Real-time WebSocket sync (instant stroke sharing across all participants)
  - WebRTC video integration (live video calls)
  - Zero-latency synchronization
  - Session recording and playback (review past lessons)
  - Handwriting recognition (convert handwriting to text)
  - Deck creation (create reusable teaching decks/presentations)
  - LaTeX math equation support
  - Collaborative simultaneous editing
  - Mobile touch optimization

**4. Chat System with End-to-End Encryption (NEW!)**
- **AES-256 Encryption**: All messages encrypted at rest using Fernet symmetric encryption
- **Direct & Group Conversations**: One-on-one and group chat support
- **Message Types**: Text, image, audio, video, file, location, GIF
- **Rich Features**: Reactions, replies, pinning, read receipts, typing indicators
- **Call Logs**: Video/audio call history tracking
- **Blocking/Unblocking**: User privacy controls
- **Multi-Role Support**: Chat across all profile types (tutor, student, parent, advertiser)
- **35+ API Endpoints**: Complete chat infrastructure in `chat_endpoints.py`
- **Database Tables (6)**:
  - `conversations` - Chat conversations
  - `conversation_participants` - Participant tracking
  - `messages` - Encrypted messages (AES-256)
  - `message_reactions` - Reactions to messages
  - `blocked_contacts` - Blocked users
  - `call_logs` - Video/audio call records
- **Encryption Service** (`encryption_service.py`):
  - `encrypt_message()` - Encrypt chat messages
  - `decrypt_message()` - Decrypt messages
  - `is_encrypted()` - Check encryption status
  - `generate_new_key()` - Generate encryption keys

**5. Educational Content**
- **Tutor content creation**: Tutors can upload videos, images, blogs, stories, and advertisements
- **Blog System**: Full blog creation and publishing platform
- Playlist creation and management
- **Coursework System** (formerly quiz system): Assignments, quizzes, projects with auto-correction
- **Document Management**: PDFs, presentations, worksheets (teaching/learning materials)
- **Credentials System**: Student achievements, certifications, experience tracking (separate from documents)
- **Progress tracking system** for monitoring student learning analytics

**6. Session Management**
- Book tutoring sessions
- Track session history
- Real-time WebSocket support for live interactions
- Session recordings and whiteboard data persistence
- **Enrolled Students**: Track tutor-student enrollments

**7. Reels (Short-Form Educational Content)**
- TikTok/Instagram-style vertical short videos (15-60 seconds)
- Educational content in bite-sized format
- Swipe-up navigation for endless learning
- Tutor-created quick lessons and tips
- Subject-based categorization and trending content
- Like, comment, share, save functionality
- Algorithm-driven personalized discovery
- Mobile-first and optimized for Gen-Z learners
- Low-bandwidth friendly for Ethiopian internet

**8. Communication & Social Features**
- **Real-time live video interaction** (one-on-one and group video calls)
- **End-to-end encrypted chat** (AES-256)
- Real-time chat messaging with rich media support
- Notifications system with real-time updates
- **Universal connection system** between all profile types (profile_id + profile_type)
- Group chat functionality
- Call logs and history

**9. Community Features (NEW!)**
- **Clubs System**: Create and join educational clubs
  - Club members tracking
  - Club-specific discussions and activities
- **Events System**: Event management with attendees
  - Event creation and scheduling
  - Attendee tracking and notifications
  - Event categories and types
- **Community Panel**: Centralized hub for clubs, events, and connections
  - Real-time badge counts (auto-updating)
  - Activity feed and notifications

**10. Parent-Child Management (ENHANCED!)**
- **Multi-Parent Support**: Students can have multiple parents (parent_id array)
- **Co-Parent Invitations**: Invite other parents to join and monitor children
  - OTP verification for security
  - Invitation tracking and status management
  - Table: `parent_invitations`
- **Multi-Child Management**: Parents can track multiple children from one account (children_ids array)
- **Parent Reviews**: 4-factor rating system for parents
- **Access Controls**: Parents have view-only access to their children's data

**11. Ethiopian Market Context (Current Phase)**
- Follows the Ethiopian educational system (KG through University)
- Tutors available for certification programs
- Multi-language support (English, Amharic, Oromo, Gurage, French) using Google Translate
- Pricing in Ethiopian Birr (ETB)
- Localized for Ethiopian universities, schools, and educational institutions

### Future Features

**Expansion Beyond Education:**

**Find Jobs (Job Marketplace)**:
- Job listings for education sector and beyond (tutor jobs, student jobs, internships, part-time work)
- Resume builder and application tracking
- Skills matching and career guidance
- Employer profiles and salary insights
- Job alerts and personalized recommendations
- Interview preparation resources

**Bookstore (Educational Materials Marketplace)**:
- Buy, sell, and rent textbooks (new and used)
- Digital books and e-learning materials
- School supplies and stationery
- Verified sellers and secure transactions
- Price comparison and student discounts
- Book exchange community

**News (Educational News Hub)**:
- Ethiopian education news and updates (expanding to global news in Phase 2/3)
- University news, scholarship alerts, exam schedules
- Success stories and industry trends
- Personalized news feed based on interests
- Breaking educational policy updates
- Career guidance articles and study tips

**Market (General Marketplace)**:
- Buy, sell, rent educational materials, electronics, and school supplies
- Tutoring packages and study materials
- Peer-to-peer marketplace for students and educators
- Secure payments and delivery options
- Rating and review system
- Local pickup and delivery coordination

**Expansion to Every Discipline**:
- From K-12 education to universal knowledge platform
- Professional development, technical skills, creative arts
- Health & wellness, languages, life skills
- **Goal**: Every subject, every skill, lifelong learning hub

**Digital Lab (Interactive Science Laboratory)** - **IP-Protected Innovation**:
- **IP-Protected Technology**: Proprietary virtual laboratory platform with patent-pending interactive simulation engine
- Virtual laboratory where tutors and students conduct experiments together in real-time
- **Subject-specific labs**:
  - **Chemistry Lab**: Interactive periodic table, molecular building, chemical reactions with visual animations (e.g., drag H₂ + O → creates H₂O)
  - **Physics Lab**: Mechanics simulations, circuit building, wave experiments, optics demonstrations
  - **Biology Lab**: Microscope simulations, dissection simulations, cell structure exploration, genetics experiments
  - **Mathematics Lab**: 3D graphing, geometry visualization, calculus demonstrations, probability simulations
  - **Computer Science Lab**: Algorithm visualization, code execution environments, data structure simulations
- Real-time collaborative experiments with permission controls (similar to whiteboard)
- Seamless integration with digital whiteboard for annotations and note-taking
- Safe exploration of dangerous reactions and experiments virtually
- Lab equipment library (beakers, test tubes, microscopes, circuit components, etc.)
- Experiment recording and playback
- Pre-built experiment templates and custom experiment creation
- Cost-effective alternative to physical labs for schools worldwide
- **Global Impact**: Makes advanced lab education accessible to schools in developing countries

**Institute Integration (School-to-Student-to-Parent Ecosystem)**:
- **Current State**: Astegni connects tutors ↔ students ↔ parents with full-featured ecosystem
- **Next Phase**: Astegni will connect schools ↔ students ↔ parents with complete institutional integration
- **School Registration and Onboarding**:
  - Educational institutions register on the platform (primary schools, secondary schools, universities)
  - School profile creation with branding, curriculum, faculty, and course offerings
  - Multi-tier access control (administrators, teachers, department heads, staff)
- **Teaching via Platform**:
  - Schools teach their entire curriculum using Astegni's platform
  - Digital Whiteboard and Digital Lab integration for all classes
  - Live classes, recorded lectures, assignments, and assessments
  - Course management system (create, schedule, manage courses)
- **Progress Tracking and Analytics**:
  - **Comprehensive student progress monitoring** across all subjects and courses
  - Real-time performance analytics and reporting dashboards
  - Grade tracking, attendance monitoring, assignment completion rates
  - Predictive analytics for identifying at-risk students
  - Teacher performance metrics and teaching effectiveness insights
- **Data Security and Privacy**:
  - **End-to-end encryption** for all school data and student information
  - **School-specific data isolation** - each institution's data is completely private and encrypted
  - GDPR, FERPA, and international data protection compliance
  - Role-based access control (students only see their data, teachers see their classes, admins see school-wide)
  - Secure parent portals with view-only access to their children's data
- **Parent Access and Involvement**:
  - **Parents gain full access to their children's progress** across all subjects
  - Real-time notifications about grades, attendance, assignments, and behavior
  - Parent-teacher communication channels
  - Progress reports and analytics dashboards for parents
  - Multi-child management (parents can track multiple children from one account)
- **IoT Integration (Future)**:
  - Smart classroom devices (attendance tracking, environmental monitoring)
  - Wearable devices for student safety and activity tracking
  - Connected lab equipment for Digital Lab integration
  - Smart ID cards and access control systems
  - Real-time location tracking for student safety (with parent consent)
- **Administrative Tools**:
  - Bulk enrollment and student management
  - Fee management and payment processing
  - Timetable creation and resource allocation
  - Report card generation and transcript management
  - School-wide announcements and communication system

**Global Expansion**:
- **Phase 2**: Pan-African expansion (Kenya, Nigeria, Ghana, South Africa, Rwanda, etc.)
- **Phase 3**: Global reach (Asia, Latin America, Middle East, Europe, North America)
- Multi-currency support, 100+ languages, 190+ countries
- Localization for each country's curriculum and culture
- Goal: **Every country, every school in the world**

### Technology Stack
The platform uses a modern tech stack with:
- **Frontend**: Multi-page HTML/CSS/JavaScript application with modular architecture (No build process - pure HTML/CSS/JS with TailwindCSS CDN)
- **Backend**: Python FastAPI application with dual PostgreSQL databases and Backblaze B2 cloud storage
- **Architecture**: Modular MVC pattern with 50+ specialized managers, WebSocket support, multi-role authentication, and end-to-end encryption
- **Version**: App version 2.1.0 (as of latest update)

## Quick Development Workflow

### 1. Start Backend Server
```bash
cd astegni-backend
python app.py  # Starts on http://localhost:8000
```

### 2. Start Frontend Server (Development Mode - RECOMMENDED)
```bash
# From project root (new terminal)
python dev-server.py  # Serves on http://localhost:8081 with cache disabled
```

**OR use the legacy method:**
```bash
# From project root (new terminal)
python -m http.server 8080  # Serves on http://localhost:8080
```

### 3. Access Application
- **Main site (dev mode)**: http://localhost:8081
- Main site (legacy): http://localhost:8080
- API docs: http://localhost:8000/docs
- Admin pages: http://localhost:8081/admin-pages/ (or 8080)
- **Digital Whiteboard**: http://localhost:8081/test-whiteboard.html

## Quick Start: Digital Whiteboard

The whiteboard system is the **"holy grail, pinnacle"** feature of Astegni!

```bash
# 1. Setup database (one-time)
cd astegni-backend
python migrate_create_whiteboard_tables.py
python seed_whiteboard_data.py

# 2. Start servers (if not running)
python app.py  # Backend (terminal 1)
cd .. && python dev-server.py  # Frontend (terminal 2)

# 3. Test it!
# Open: http://localhost:8081/test-whiteboard.html
# Click: "Launch Whiteboard" button
```

**Features:** 7 drawing tools, multi-page canvas, live chat, session management, keyboard shortcuts (P, E, T, L, R, C, A)
**Documentation:** See `WHITEBOARD-QUICK-START.md` for complete guide
**Achievement Report:** See `WHITEBOARD-ACHIEVEMENT-SUMMARY.md` for Phase 1 complete vs Phase 2 missing features

## Detailed Commands

### Backend Operations
```bash
cd astegni-backend

# Environment setup
pip install -r requirements.txt  # Install: fastapi, uvicorn, sqlalchemy, psycopg3, PyJWT, bcrypt, b2sdk, slowapi, cryptography

# Development server
python app.py                     # Simple start
uvicorn app:app --reload --host 0.0.0.0 --port 8000  # With auto-reload

# Database initialization (NEW SETUP - Dual Databases!)
python init_db.py                 # Create tables in astegni_user_db
python init_admin_db.py           # Create admin tables in astegni_admin_db (NEW!)
python seed_student_data.py       # Add sample student data
python seed_tutor_data.py         # Add 17,000+ Ethiopian tutor records

# Database migrations (CRITICAL - Dual Database Migration!)
python migrate_to_dual_databases.py  # IMPORTANT: Migrate from single to dual database (ONE-TIME)
python create_otp_table.py           # Add OTP verification table
python migrate_email_phone_optional.py  # Make email/phone optional
python migrate_tutor_enhancements.py    # Add tutor profile fields
python migrate_profile_id_connections.py  # Migrate connections to profile-based system

# Digital Whiteboard System (Phase 1 Complete!)
python migrate_create_whiteboard_tables.py  # Create whiteboard tables (5 tables)
python seed_whiteboard_data.py              # Add sample sessions (9 sessions)

# Chat System Setup (NEW!)
python setup_chat_encryption.py     # Generate encryption key for chat messages

# Backblaze B2 management
python setup_b2_folders.py        # Initialize folder structure
python list_b2_files.py           # List all uploaded files
python cleanup_b2_folders.py      # Remove empty folders
python reset_b2_folders.py        # DESTRUCTIVE - Reset to clean state

# Database utilities
python test_connection.py         # Verify PostgreSQL connection
python reset_db.py                # DESTRUCTIVE - Drop and recreate all tables (both databases)

# Testing
python test_otp_endpoints.py      # Test OTP endpoints
python test_chat_encryption.py    # Test chat encryption/decryption
```

### Frontend Operations
```bash
# No build process required - pure HTML/CSS/JavaScript

# Serve options (from project root)
python dev-server.py              # RECOMMENDED - Cache-disabled development server (port 8081)
python -m http.server 8080        # Legacy - Python built-in server
npx serve . -p 8080               # Node.js serve package
# Or open index.html directly in browser (limited functionality)

# No linting/formatting configured - use editor extensions
```

### Environment Setup
Create `.env` file in `astegni-backend/` with the following required variables:

```
# Dual Database Configuration (CRITICAL - NEW!)
DATABASE_URL=postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db
ADMIN_DATABASE_URL=postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db

# JWT Configuration (Generate new keys for production!)
SECRET_KEY=your_jwt_secret_key_here
REFRESH_SECRET_KEY=your_refresh_secret_key_here
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
REMEMBER_ME_EXPIRE_DAYS=30

# Chat Encryption (CRITICAL - NEW!)
CHAT_ENCRYPTION_KEY=5zf-FXAq1ZyjHtrEmn1_wqY2jf-3n4kVgCLzvqkaefI=  # Generate with setup_chat_encryption.py

# Google OAuth Configuration (NEW!)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8081

# Backblaze B2 Storage (for file uploads)
BACKBLAZE_KEY_ID=your_key_id
BACKBLAZE_APPLICATION_KEY=your_application_key
BACKBLAZE_BUCKET_NAME=astegni-media
BACKBLAZE_ENDPOINT=https://s3.eu-central-003.backblazeb2.com

# Optional Redis Cache Configuration
REDIS_URL=redis://localhost:6379/0  # Optional for caching
CACHE_TTL=300  # Cache time-to-live in seconds (default: 5 minutes)

# App Configuration
APP_VERSION=2.1.0
PORT=8000  # Backend port
FRONTEND_PORT=8081  # Dev server port (for dev-server.py)
```

### Development Credentials & Server Access

**CRITICAL: These are development credentials. NEVER commit these to version control or use in production!**

#### Local Database Credentials
- **Database Password**: `Astegni2025`
- **Database User**: `astegni_user`
- **User Database**: `astegni_user_db`
- **Admin Database**: `astegni_admin_db`
- Connection string example:
  ```
  postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db
  postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db
  ```

#### Hetzner Production Server
- **SSH Access**: `ssh root@218.140.122.215`
- **Root Password**: `UVgkFmAsh4N4`
- **Server IP**: `218.140.122.215`
- **Usage**: Production deployment server

#### Test User Account (Multi-Database Access)
- **Email**: `jediael.s.abebe@gmail.com`
- **Password**: `@JesusJediael1234`
- **Access**:
  - User account (astegni_user_db)
  - Admin account (astegni_admin_db)
- **Note**: This account exists in both databases with the same credentials, allowing you to test both user and admin functionality

#### Security Notes
- **Development Only**: These credentials are for local development and testing
- **Production**: Generate new, secure credentials for production deployment
- **Password Policy**: Use strong, unique passwords for production
- **SSH Access**: Consider using SSH keys instead of password authentication for production
- **Database Access**: Restrict database access to localhost in production
- **Admin Access**: Implement IP whitelisting for admin panel access

## Architecture Overview

### CRITICAL: Dual Database Architecture (NEW!)

**The platform now uses TWO separate PostgreSQL databases:**

1. **astegni_user_db** (Main Application Database)
   - User data, profiles (students, tutors, parents, advertisers)
   - Content (videos, blogs, playlists, reels, documents, credentials)
   - Educational data (courses, schedules, sessions, coursework)
   - Social features (connections, chat, clubs, events)
   - Whiteboard system data
   - **70+ tables** for core functionality

2. **astegni_admin_db** (Admin/System Database)
   - Admin panel users and authentication
   - System settings and configuration
   - Moderation queue and user reports
   - Platform analytics and metrics
   - Feature flags and announcements
   - Audit trail and activity logs
   - Support ticket system
   - **13 admin-specific tables**

**Admin Database Tables:**
- `admin_users` - Admin panel users
- `admin_activity_logs` - Audit trail for admin actions
- `system_settings` - Platform configuration
- `moderation_queue` - Content moderation
- `user_reports` - User-submitted reports
- `platform_analytics` - Aggregated analytics
- `feature_flags` - Feature toggles
- `announcements` - Platform announcements
- `email_templates` - System email templates
- `scheduled_jobs` - Background jobs
- `audit_trail` - Data change tracking
- `support_tickets` - User support system
- `support_ticket_messages` - Ticket conversations

**Migration:**
- Run `python migrate_to_dual_databases.py` to migrate from single to dual database
- Update `.env` with `ADMIN_DATABASE_URL`
- SQL schema: `create_admin_tables.sql`

**Benefits:**
- **Separation of concerns**: User data isolated from admin data
- **Security**: Admin operations don't affect user database
- **Performance**: Reduced load on main database
- **Scalability**: Independent scaling of admin and user databases
- **Data isolation**: Admin analytics don't impact user queries

### Recent Refactoring (Important!)
The backend has been massively refactored from a monolithic `app.py`:
- `app.py` - Main entry point with modern FastAPI lifespan management
- `app.py modules/config.py` - CORS, middleware, app configuration
- `app.py modules/models.py` - SQLAlchemy models and Pydantic schemas (user_db)
- `app.py modules/admin_models.py` - SQLAlchemy models for admin_db (NEW!)
- `app.py modules/routes.py` - Core API endpoints

**30+ Endpoint Modules (NEW!):**
- `chat_endpoints.py` - Chat system (35+ endpoints)
- `encryption_service.py` - AES-256 encryption utilities
- `admin_db_endpoints.py` - Admin database operations
- `admin_courses_endpoints.py` - Course management (dual DB)
- `admin_schools_endpoints.py` - School management (dual DB)
- `admin_advertisers_endpoints.py` - Brand/campaign management
- `admin_admins_endpoints.py` - Admin user management
- `admin_leave_endpoints.py` - Leave request management
- `parent_invitation_endpoints.py` - Co-parent invitations
- `student_credentials_endpoints.py` - Student achievements
- `credentials_endpoints.py` - Unified credentials system
- `documents_endpoints.py` - Teaching/learning materials
- `blog_endpoints.py` - Blog system
- `clubs_events_endpoints.py` - Clubs and events
- `coursework_endpoints.py` - Coursework/assignments
- `partner_request_endpoints.py` - Partnership requests
- `whiteboard_endpoints.py` - Digital whiteboard (15 endpoints)
- And 10+ more specialized endpoint modules

This modular structure makes the codebase maintainable but requires checking multiple files when debugging endpoints.

### High-Level Architecture

**Frontend Architecture:**
- **No Build Process**: Pure HTML/CSS/JavaScript with TailwindCSS via CDN
- **Modular JavaScript**: Four-tier module system (root → feature → page → components)
- **50+ Specialized Managers**: Advanced manager pattern for complex features
- **Global State Management**: Centralized in `js/root/app.js` with localStorage persistence
- **Theme System**: CSS variables-based dark/light mode from `css/root/theme.css`
- **Modal System** (REORGANIZED!):
  - `modals/common-modals/` - 16 shared modals across all profiles
  - `modals/tutor-profile/` - 33 tutor-specific modals
  - `modals/student-profile/` - Student-specific modals
  - `modals/parent-profile/` - Parent-specific modals
  - `modals/view-*/` - View page modals
  - `modal-loader.js` - Intelligent multi-path modal loading system
- **Entry Points**: Main pages in root (`index.html`, `branch/*.html`), profile pages in `profile-pages/`, view pages in `view-profiles/`
- **Real-time Updates**: Auto-updating badge counts, live connection status, WebSocket integration

**Backend Architecture:**
- **Dual Database FastAPI**: Separate connections for user_db and admin_db
- **Modern Lifespan Management**: FastAPI `@asynccontextmanager` for app lifecycle
- **Multi-Role Auth**: JSON-based roles (student, tutor, admin, parent, advertiser, institute)
- **Dual JWT System**: Access tokens (30min) + refresh tokens (7 days) with separate secret keys
- **PostgreSQL + psycopg3**: Modern async driver with automatic URL format conversion
- **AES-256 Encryption**: Chat messages encrypted at rest via `encryption_service.py`
- **Rate Limiting**: Tiered limits - auth: 5/min, upload: 10/min, default: 100/min
- **WebSocket Support**: Real-time features via `websocket_manager.py`
- **Redis Caching**: Optional Redis cache with automatic fallback when unavailable (`cache.py`)
- **Backblaze B2 Storage**:
  - User-separated file organization: `{type}/{category}/user_{id}/{file}`
  - Organized folders: images (posts, chat, profile, cover, thumbnails, blog, news), audio (lectures, podcasts, chat), videos (ad, lectures, story, chat, programs), documents (chat, resources)
  - Enhanced `backblaze_service.py` with user file management methods
- **200+ API Endpoints**: Comprehensive REST API across 30+ endpoint modules

### Key JavaScript Patterns

**Core State Management:**
```javascript
// js/root/app.js - Global state variables
let user = null;
let token = null;
let theme = localStorage.getItem('theme') || 'light';
let notifications = JSON.parse(localStorage.getItem('notifications')) || [];

// js/root/auth.js - Singleton AuthenticationManager
const authManager = new AuthenticationManager();
authManager.initialize(); // Restores session from localStorage
```

**Module Initialization Pattern:**
```javascript
// Every page imports and initializes core modules
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();  // From js/root/app.js
    // Page-specific initialization here
});
```

**API Configuration:**
```javascript
// Defined in js/index.js and js/root/auth.js
const API_BASE_URL = 'http://localhost:8000';
// All API calls use this base URL
```

**Modal Loading Pattern (NEW!):**
```javascript
// Intelligent modal loading from multiple directories
modalLoader.loadModal('create-event-modal.html');  // Auto-finds in common-modals/
modalLoader.loadModal('whiteboard-modal.html');     // Auto-finds in tutor-profile/
```

### CSS Architecture

**Import Hierarchy:**
1. `css/root.css` - Main stylesheet importing shared modules from `css/root/`
2. Page-specific stylesheets import their own modules (e.g., `css/index.css` → `css/index/*`)
3. Always use CSS variables from `css/root/theme.css` for colors/theming

**New CSS Modules:**
- `css/common-modals/` - Shared modal styles (16 modals)
- `css/chat/` - Chat interface styles
- `css/clubs-events/` - Community feature styles
- `css/coursework/` - Coursework system styles

**Key Rules:**
- Never hardcode colors - use theme variables for dark/light mode support
- Each style exists in only one location (no-redundancy principle)
- Profile pages: `*-profile.css`, View pages: `view-*.css`

## API Endpoints

### Authentication
- `POST /api/register` - User registration (traditional email/password)
- `POST /api/login` - User login (returns access + refresh tokens)
- `POST /api/refresh` - Refresh access token
- `POST /api/logout` - User logout
- `POST /api/send-otp` - Send OTP verification code
- `POST /api/verify-otp` - Verify OTP code

### Google OAuth (NEW!)
- `POST /api/oauth/google` - Login or register with Google ID token
- `GET /api/oauth/google/config` - Get Google OAuth client configuration
- `GET /api/oauth/google/status` - Check if Google OAuth is configured

### User Management
- `GET /api/me` - Get current user info
- `GET /api/my-roles` - Get user roles
- `POST /api/switch-role` - Switch active role

### Tutor System
- `GET /api/tutors?page=1&limit=15` - Search/filter tutors with pagination
- `GET /api/tutor/{id}` - Get specific tutor
- `GET /api/tutor/profile` - Get tutor's own profile
- `PUT /api/tutor/profile` - Update tutor profile
- `GET /api/tutor/sessions` - Get tutor sessions
- `GET /api/tutor/enrolled-students` - Get enrolled students

### Student System
- `GET /api/student/profile` - Get student's own profile
- `PUT /api/student/profile` - Update student profile
- `GET /api/student/{id}` - Get specific student
- `GET /api/student/credentials` - Get student achievements

### Parent System (ENHANCED!)
- `GET /api/parent/profile` - Get parent's own profile
- `PUT /api/parent/profile` - Update parent profile
- `GET /api/parent/{id}` - Get specific parent
- `POST /api/parent/invite-coparent` - Invite co-parent
- `GET /api/parent/invitations` - Get co-parent invitations
- `POST /api/parent/accept-invitation` - Accept co-parent invitation

### Chat System (NEW! - 35+ Endpoints)
- `POST /api/chat/conversations` - Create conversation
- `GET /api/chat/conversations` - List conversations
- `GET /api/chat/conversations/{id}` - Get conversation details
- `POST /api/chat/conversations/{id}/messages` - Send message (auto-encrypted)
- `GET /api/chat/conversations/{id}/messages` - Get messages (auto-decrypted)
- `POST /api/chat/messages/{id}/react` - React to message
- `PUT /api/chat/messages/{id}/read` - Mark as read
- `POST /api/chat/messages/{id}/pin` - Pin message
- `POST /api/chat/block` - Block user
- `DELETE /api/chat/block` - Unblock user
- `POST /api/chat/call-logs` - Create call log
- And 20+ more chat endpoints

### Content
- `GET /api/videos` - Get videos
- `GET /api/blog/posts` - Get blog posts (NEW!)
- `POST /api/blog/posts` - Create blog post (NEW!)
- `GET /api/playlists` - Get playlists
- `GET /api/documents` - Get teaching/learning materials (NEW!)
- `GET /api/credentials` - Get achievements/certifications (NEW!)

### Community (NEW!)
- `POST /api/clubs` - Create club
- `GET /api/clubs` - List clubs
- `POST /api/clubs/{id}/join` - Join club
- `POST /api/events` - Create event
- `GET /api/events` - List events
- `POST /api/events/{id}/attend` - Attend event

### Coursework (NEW!)
- `POST /api/coursework` - Create coursework/assignment
- `GET /api/coursework` - List coursework
- `POST /api/coursework/{id}/submit` - Submit answer
- `GET /api/coursework/{id}/answers` - View submissions

### Connections (ENHANCED! - Profile-based)
- `POST /api/connections/request` - Send connection request (requires profile_id + profile_type)
- `GET /api/connections` - List connections (filtered by role)
- `POST /api/connections/{id}/accept` - Accept connection
- `POST /api/connections/{id}/reject` - Reject connection

### File Upload
- `POST /api/upload/profile-picture` - Upload profile pic with user separation
- `POST /api/upload/video` - Upload video with user separation
- `POST /api/upload/chat-file` - Upload chat files (auto-categorized)
- `POST /api/upload/document` - Upload teaching/learning materials
- Files stored as: `{type}/{category}/user_{user_id}/{filename}_{timestamp}.{ext}`

### Digital Whiteboard (15 Endpoints)
- `GET /api/whiteboard/bookings` - Get tutor-student bookings
- `GET /api/whiteboard/sessions` - Get whiteboard sessions
- `POST /api/whiteboard/sessions` - Create session
- `PUT /api/whiteboard/sessions/{id}/start` - Start session
- `PUT /api/whiteboard/sessions/{id}/end` - End session
- `GET /api/whiteboard/sessions/{id}/pages` - Get pages
- `POST /api/whiteboard/sessions/{id}/pages` - Create page
- `POST /api/whiteboard/canvas/save` - Save canvas data
- `GET /api/whiteboard/canvas/{session_id}/{page_id}` - Load canvas
- `POST /api/whiteboard/chat` - Send chat message
- `GET /api/whiteboard/chat/{session_id}` - Get chat messages
- And more...

### Admin Database Endpoints (NEW!)
- `GET /api/admin-db/courses` - Get courses from admin_db
- `POST /api/admin-db/courses` - Create course in admin_db
- `GET /api/admin-db/schools` - Get schools from admin_db
- `GET /api/admin-db/analytics` - Get platform analytics
- `GET /api/admin-db/audit-trail` - Get audit logs
- And 10+ more admin endpoints

### WebSocket
- `ws://localhost:8000/ws` - Real-time updates

## Database Schema

### User Database (astegni_user_db) - 70+ Tables

**Core Tables:**
- `users` - Multi-role authentication with JSON roles field
- `students` - Student profiles (includes parent_id array for multi-parent support)
- `tutors` - Tutor profiles (includes 4-factor rating columns)
- `parents` - Parent profiles (includes children_ids array)
- `advertisers` - Advertiser/brand profiles

**Profile Enhancement Tables:**
- `tutor_reviews` - 4-factor tutor ratings
- `student_reviews` - Student feedback
- `parent_reviews` - Parent ratings (NEW!)
- `tutor_sessions` - Tutoring sessions
- `enrolled_students` - Student enrollments (NEW!)

**Content Tables:**
- `videos` - Video content
- `blogs` - Blog posts (NEW!)
- `playlists` - Video collections
- `documents` - Teaching/learning materials (PDFs, presentations)
- `credentials` - Achievements, certifications, experience (formerly documents)
- `reels` - Short-form videos

**Educational Tables:**
- `courses` - Course catalog
- `schedules` - Teaching schedules (formerly teaching_schedules)
- `coursework` - Assignments/quizzes (formerly quiz)
- `coursework_answers` - Student submissions

**Social Tables:**
- `connections` - Universal profile-based connections (profile_id + profile_type)
- `notifications` - User notifications

**Chat System Tables (NEW! - 6 Tables):**
- `conversations` - Chat conversations
- `conversation_participants` - Participant tracking
- `messages` - Encrypted messages (AES-256)
- `message_reactions` - Reactions to messages
- `blocked_contacts` - Blocked users
- `call_logs` - Video/audio call records

**Community Tables (NEW!):**
- `clubs` - Educational clubs
- `club_members` - Club membership
- `events` - Events and activities
- `event_attendees` - Event attendance

**Parent-Child Tables (NEW!):**
- `parent_invitations` - Co-parent invitations with OTP verification

**Whiteboard Tables (5 Tables):**
- `tutor_student_bookings` - Student enrollments
- `whiteboard_sessions` - Session tracking
- `whiteboard_pages` - Multi-page canvas
- `whiteboard_canvas_data` - Drawing/text strokes
- `whiteboard_chat_messages` - Session chat

**Other Tables:**
- `otp_verifications` - OTP codes for verification
- `partner_requests` - Partnership proposals (NEW!)

### Admin Database (astegni_admin_db) - 13 Tables (NEW!)

- `admin_users` - Admin panel authentication
- `admin_activity_logs` - Audit trail
- `system_settings` - Platform configuration
- `moderation_queue` - Content moderation
- `user_reports` - User-submitted reports
- `platform_analytics` - Aggregated analytics
- `feature_flags` - Feature toggles
- `announcements` - Platform announcements
- `email_templates` - System email templates
- `scheduled_jobs` - Background jobs
- `audit_trail` - Data change tracking
- `support_tickets` - User support system
- `support_ticket_messages` - Ticket conversations

### Breaking Changes & Deprecations (IMPORTANT!)

**Renamed Tables:**
- `tutor_connections` → `connections` (now universal, profile-based)
- `quiz` → `coursework`
- `teaching_schedules` → `schedules`
- Old `documents` → `credentials` (achievements)
- New `documents` table created (teaching materials)

**Removed Fields:**
- `parent_profiles.coparent_ids` (use student_profiles.parent_id array instead)
- `parent_profiles.child_id` (use children_ids array)
- `parent_profiles.education_focus`, `active_children`, `currency`
- Various deprecated fields from student/tutor profiles

**API Changes:**
- Connection endpoints now require `profile_id` + `profile_type` (not user_id)
- Chat endpoints require encryption key setup in .env
- Admin endpoints split between user_db and admin_db

## Find-Tutors Advanced Architecture

The find-tutors feature demonstrates the most advanced modular pattern:

### Module Structure
```javascript
// Core modules in js/find-tutors/
api-config-&-util.js    // FindTutorsAPI class, FindTutorsState management
UI-management-new.js    // FindTutorsUI with comprehensive filter system
tutor-card-creator.js   // TutorCardCreator with Ethiopian data generation
main-controller.js      // FindTutorsController MVC pattern
pagination-manager.js   // PaginationManager with database integration
sidebar-manager.js      // SidebarManager for responsive sidebar
stats-counter.js        // StatsCounter with IntersectionObserver
global-functions.js     // Window functions for HTML onclick events
preference-Management.js // PreferencesManager for localStorage
helper.js               // Notification system, utilities
websocket.js            // Real-time WebSocket management
init.js                 // Module coordination
```

### Filter System
```javascript
FindTutorsState.filters = {
    search: '',           // Debounced search (300ms)
    language: '',         // "English, Amharic, Oromo, Gurage"
    gradeLevel: '',       // "Grade 1-6, University Level"
    courseType: '',       // "Academic", "Professional", "Both"
    gender: '',           // "Male", "Female" (checkboxes)
    sessionFormat: '',    // "Online", "In-person", "Hybrid"
    rating: '',           // 2-5 stars
    minPrice: '',         // 50-500 ETB range
    maxPrice: '',         // Based on rating tiers
    sortBy: 'rating'      // Various sorting options
};
```

## Ethiopian Context Integration

**Educational System:**
- Grade levels: KG, Elementary (1-6), Grade 7-8, Grade 9-10, Grade 11-12, University
- Languages: English, Amharic, Oromo, Gurage, French
- Universities: Addis Ababa, Jimma, Bahir Dar, Hawassa, Mekelle Universities
- Pricing: 50-500 ETB per session (beginners: 50-200, experienced: 200-500)

**Data Generation:**
- Use Ethiopian names, institutions, cities when creating sample data
- Include realistic combinations of languages
- Follow Ethiopian educational grade structure
- Price in ETB with realistic ranges

## Admin Pages Architecture

The admin pages (`admin-pages/*.html`) implement a sophisticated modular system:

### Structure
- **Shared Modules**: `js/admin-pages/shared/` contains reusable components (panel-manager, sidebar-manager, modal-manager)
- **Page-Specific Logic**: Each admin page has its own module (e.g., `manage-tutors.js`, `manage-courses.js`)
- **Consistent Layout**: 2-column card grid, panel switching, responsive sidebar
- **Templates Available**: `admin-page-template.html` and `admin-modals-template.html` for creating new pages
- **Dual Database Integration**: Admin pages can query both user_db and admin_db

### Key Files
- `admin-pages/ADMIN-MODULAR-STRUCTURE.md`: Complete documentation of the admin modular system
- Panel switching preserves state in URL (e.g., `?panel=verified`)
- All admin pages support ESC key for closing modals/sidebar

### New Admin Pages
- `manage-credentials.html` - Verify student achievements/certifications
- `manage-system-settings.html` - Platform configuration
- `manage-admins.html` - Admin user management (dual DB)
- Enhanced: `manage-courses.html`, `manage-schools.html`, `manage-advertisers.html`

## Development Patterns

### Adding New Features
Follow the find-tutors modular pattern:
1. Create dedicated directory: `js/feature-name/`
2. Separate concerns: API, UI, Controller, State in different files
3. Use manager pattern for complex functionality
4. Always use CSS variables from `css/root/theme.css`
5. Create `init.js` for module coordination
6. Add corresponding CSS modules in `css/feature-name/`

### File Organization
**Local Storage:**
- System assets: `system_images/`, `system_videos/`, `system_documents/`, `system_audio/`
- User uploads: `user_images/`, `user_videos/`, `user_documents/`, `user_audio/`

**Backblaze B2 Storage (Production):**
- User-separated paths: `{type}/{category}/user_{user_id}/{filename}_{timestamp}.{ext}`
- Key methods in `backblaze_service.py`:
  - `upload_file(file_data, file_name, file_type, user_id)` - Upload with user separation
  - `list_user_files(user_id, file_type)` - List specific user's files
  - `delete_user_file(user_id, file_path)` - Delete with ownership verification
  - `get_user_storage_stats(user_id)` - Get storage breakdown by type

**CSS Module Structure:**
- Root styles: `css/root/*.css` (imported by `css/root.css`)
- Page-specific: `css/[page-name]/*.css` (imported by `css/[page-name].css`)
- Profile pages: `css/*-profile/*.css`
- View pages: `css/view-*/*.css`
- Common modals: `css/common-modals/*.css` (NEW!)

### API Error Handling
- Always implement fallback mechanisms for API failures
- Use client-side sample data matching API response structure
- Ensure features work offline when possible
- Handle JSON field queries carefully in PostgreSQL
- Check for 401 errors and trigger re-authentication

### Performance Optimization
- Use IntersectionObserver for scroll-triggered animations
- Implement debouncing (300ms) for text inputs
- Use requestAnimationFrame for smooth animations
- Implement proper loading states for API calls
- Lazy load images and videos
- **Auto-updating badge counts** for real-time community stats

## WebSocket Real-Time Features

The `websocket_manager.py` implements:
- **Connection Management**: User-based and room-based connections
- **Real-time Chat**: Direct messaging and group chat support (with encryption)
- **Live Notifications**: Push notifications to connected users
- **Live Sessions**: Support for educational live streaming/sessions
- **Connection Types**: Multiple connections per user supported
- **Auto-updating UI**: Badge counts, connection status, community stats

## Testing & Debugging

### Backend Testing
```bash
cd astegni-backend
python test_connection.py   # Test database connection (both databases)

# Test API endpoints manually
curl http://localhost:8000/api/tutors
curl http://localhost:8000/api/videos
curl http://localhost:8000/api/chat/conversations -H "Authorization: Bearer <token>"

# Test chat encryption
python test_chat_encryption.py

# Check WebSocket connection
wscat -c ws://localhost:8000/ws
```

### Frontend Testing
- **Test Pages**:
  - `test_functions.html` - Function tests
  - `test_search.html` - Search functionality
  - `test-whiteboard.html` - Whiteboard demo
  - `debug-modals.html` - Modal system testing (NEW!)
  - `debug-session-request.html` - Session request testing (NEW!)
  - `check-backend.html` - Backend connectivity check (NEW!)
- **Browser DevTools**: Network tab for API monitoring, Console for JavaScript errors
- **No automated tests**: Project uses manual testing approach

### Debugging Tips
- Backend logs to console by default (uvicorn logging)
- Check `.env` file for missing configuration (especially ADMIN_DATABASE_URL and CHAT_ENCRYPTION_KEY)
- Redis cache failures are non-blocking (automatic fallback)
- WebSocket disconnections auto-retry with exponential backoff
- Admin database queries logged separately
- Chat encryption errors logged to console

## Common Issues & Solutions

**Database Connection:**
- psycopg3 automatically converts `postgresql://` to `postgresql+psycopg://`
- Default credentials: astegni_user:Astegni2025
- **IMPORTANT**: Ensure both DATABASE_URL and ADMIN_DATABASE_URL are set in .env
- Run `migrate_to_dual_databases.py` if migrating from single database

**CORS Issues:**
- Backend configured for localhost:8080 and localhost:8081 (dev server)
- Check `app.py modules/config.py` for CORS origins

**Authentication:**
- Access tokens expire in 30 minutes
- Refresh tokens last 7 days
- Remember me tokens last 30 days
- Session restored from localStorage on page reload

**Rate Limiting:**
- Auth endpoints: 5 requests/minute
- Upload endpoints: 10 requests/minute
- Default: 100 requests/minute

**File Uploads:**
- Configured for Backblaze B2 storage with user separation
- Check `.env` for BACKBLAZE_KEY_ID and BACKBLAZE_APPLICATION_KEY
- Max sizes: Images 5MB, Videos 200MB, Documents 10MB
- Files organized by user: `images/profile/user_12345/avatar_20240115_143022.jpg`
- See `USER_FILE_ORGANIZATION.md` for detailed file organization strategy

**Chat Encryption:**
- Requires `CHAT_ENCRYPTION_KEY` in .env
- Generate key with: `python setup_chat_encryption.py`
- Messages automatically encrypted/decrypted by API
- Check encryption status with `encryption_service.is_encrypted()`

**Modal Loading:**
- Modals organized by context (common vs profile-specific)
- `modal-loader.js` handles intelligent path resolution
- Check console for modal loading errors

## Common Development Tasks

### Adding a New API Endpoint
1. Determine which database: user_db or admin_db
2. Create endpoint file in `astegni-backend/` (e.g., `feature_endpoints.py`)
3. Add models/schemas in appropriate models file:
   - `app.py modules/models.py` for user_db
   - `app.py modules/admin_models.py` for admin_db
4. Import endpoints in `app.py`
5. Test with FastAPI docs at http://localhost:8000/docs
6. Update frontend API calls (usually in feature-specific modules)

### Creating a New Admin Page
1. Copy `admin-pages/admin-page-template.html` as starting point
2. Create page-specific JS in `js/admin-pages/[page-name].js`
3. Create page-specific CSS in `css/admin-pages/[page-name].css`
4. Import shared modules from `js/admin-pages/shared/`
5. Follow the panel switching pattern for multi-view pages
6. Consider dual database queries if needed

### Adding a New Feature Module
1. Create directory: `js/[feature-name]/`
2. Split into files: `api.js`, `ui.js`, `state.js`, `controller.js`, `init.js`
3. Create corresponding CSS: `css/[feature-name]/`
4. Follow the find-tutors pattern as reference
5. Add modals to `modals/common-modals/` if shared across profiles

### Creating a New Modal
1. Determine if common or profile-specific
2. Create HTML file in appropriate `modals/` subdirectory:
   - `modals/common-modals/` for shared modals (16+ modals)
   - `modals/[profile-type]/` for profile-specific modals
3. Create CSS in `css/common-modals/` or `css/[profile]/`
4. Load with: `modalLoader.loadModal('modal-name.html')`
5. Update `modal-loader.js` arrays if needed

### Working with Authentication
- Tokens stored in localStorage: `token` (access) and `refreshToken` (refresh)
- Auto-refresh handled by `js/root/auth.js`
- Check authentication with: `authManager.isAuthenticated()`
- Get current user: `authManager.getCurrentUser()`

### Working with Chat Encryption
- All chat messages automatically encrypted/decrypted by API
- Use standard chat endpoints - encryption is transparent
- Check encryption status: `encryption_service.is_encrypted(message)`
- Generate new key: `python setup_chat_encryption.py`

### Working with Dual Databases
- **User data queries**: Use standard SQLAlchemy with `SessionLocal` (user_db)
- **Admin data queries**: Use `AdminSessionLocal` from `admin_models.py`
- Example:
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
- **Dual Databases**: Always use correct SessionLocal (user_db vs admin_db)
- **PostgreSQL URL**: psycopg3 auto-converts `postgresql://` to `postgresql+psycopg://`
- **JSON fields**: Use PostgreSQL JSON operators carefully in SQLAlchemy queries
- **Rate limiting**: Different limits for auth (5/min), uploads (10/min), default (100/min)
- **File uploads**: Always pass `user_id` for proper file organization in B2
- **Chat encryption**: Ensure CHAT_ENCRYPTION_KEY is set in .env
- **Profile-based connections**: Use `profile_id` + `profile_type`, not `user_id`

### Frontend
- **No jQuery**: Project uses vanilla JavaScript only
- **Global functions**: Required for HTML `onclick` handlers (see `global-functions.js` pattern)
- **API Base URL**: Hardcoded to `http://localhost:8000` in multiple files
- **Theme variables**: Always use CSS variables from `css/root/theme.css`, never hardcode colors
- **Module loading**: No ES6 modules - use script tags with proper ordering
- **Modal paths**: Use `modal-loader.js` for intelligent path resolution
- **Dev server**: Use `dev-server.py` for cache-disabled development (port 8081)

## Critical Files Reference

### Backend Core
- `astegni-backend/app.py` - Main entry point with dual database setup
- `astegni-backend/app.py modules/routes.py` - Core API endpoints
- `astegni-backend/app.py modules/models.py` - User database models and schemas
- `astegni-backend/app.py modules/admin_models.py` - Admin database models (NEW!)
- `astegni-backend/app.py modules/config.py` - CORS and app configuration
- `astegni-backend/utils.py` - JWT, password hashing, utilities
- `astegni-backend/encryption_service.py` - AES-256 chat encryption (NEW!)
- `astegni-backend/backblaze_service.py` - File upload with user separation
- `astegni-backend/websocket_manager.py` - WebSocket implementation
- `astegni-backend/chat_endpoints.py` - Chat system (35+ endpoints) (NEW!)
- `astegni-backend/whiteboard_endpoints.py` - Digital whiteboard (15 endpoints)

### Frontend Core
- `js/root/app.js` - Global state and initialization
- `js/root/auth.js` - Authentication manager
- `js/root/modal-loader.js` - Multi-path modal loading system (NEW!)
- `css/root/theme.css` - Theme variables (dark/light mode)
- `css/root.css` - Main CSS entry point
- `index.html` - Landing page
- `dev-server.py` - Cache-disabled development server (NEW!)
- `branch/find-tutors.html` - Most complex feature implementation

### Profile Pages (40+ Pages)
- `profile-pages/tutor-profile.html` - 33 profile modals + 16 common modals
- `profile-pages/student-profile.html` - Full CRUD with documents panel
- `profile-pages/parent-profile.html` - Multi-child management with co-parent invitations
- `profile-pages/advertiser-profile.html` - Campaign management
- `view-profiles/view-tutor.html` - Dynamic tutor viewing
- `view-profiles/view-student.html` - Student details with reviews
- `view-profiles/view-parent.html` - Parent info with children

### Modals (80+ Modal Files)
- `modals/common-modals/` - 16 shared modals (NEW!)
  - `create-event-modal.html`, `create-club-modal.html`, `community-modal.html`
  - `coursework-main-modal.html`, `schedule-modal.html`, `subscription-modal.html`
  - And 10+ more shared modals
- `modals/tutor-profile/` - 33 tutor-specific modals
- `modals/student-profile/` - Student-specific modals
- `modals/parent-profile/` - Parent-specific modals

### Documentation (200+ Files)
- `astegni-backend/B2_FOLDER_STRUCTURE.md` - Cloud storage organization
- `astegni-backend/USER_FILE_ORGANIZATION.md` - File separation strategy
- `admin-pages/ADMIN-MODULAR-STRUCTURE.md` - Admin pages architecture
- `WHITEBOARD-QUICK-START.md` - Whiteboard setup guide
- `DUAL-DATABASE-GUIDE.md` - Dual database architecture (NEW!)
- `CHAT-SYSTEM-GUIDE.md` - Chat implementation guide (NEW!)
- `ENCRYPTION-SERVICE-GUIDE.md` - Encryption usage guide (NEW!)
- `MODAL-MIGRATION-SUMMARY.md` - Modal reorganization guide (NEW!)
- `DATABASE-MIGRATIONS-COMPLETE.md` - Migration reference (NEW!)

## Recent Additions & Migrations

### Google OAuth Authentication (NEW!)
- **One-click sign-in** with Google account (OAuth 2.0)
- No password required for Google users
- Auto-verified email addresses
- Profile picture imported from Google
- Seamless registration or login flow
- Backend: `google_oauth_endpoints.py` (500+ lines)
- Frontend: `js/root/google-oauth.js` (400+ lines)
- 3 API endpoints: `/api/oauth/google`, `/config`, `/status`
- Documentation: `GOOGLE-OAUTH-SETUP.md`, `GOOGLE-OAUTH-QUICKSTART.md`, `GOOGLE-OAUTH-ARCHITECTURE.md`
- Setup time: ~8 minutes (requires Google Cloud Console credentials)

### Dual Database Architecture (MAJOR!)
- **Two PostgreSQL databases**: astegni_user_db + astegni_admin_db
- Migration: `migrate_to_dual_databases.py`
- Admin models: `app.py modules/admin_models.py`
- 13 admin-specific tables for system management
- Separate SessionLocal for each database
- Enhanced security and performance

### Chat System with Encryption (MAJOR!)
- **AES-256 encryption** via `encryption_service.py`
- 35+ chat endpoints in `chat_endpoints.py`
- 6 new database tables (conversations, messages, reactions, etc.)
- Direct and group chat support
- Rich message types (text, image, audio, video, file, location, GIF)
- Reactions, replies, pinning, read receipts
- Call logs and blocking functionality
- Multi-role support (all profile types)

### Modal System Reorganization (MAJOR!)
- **16 common modals** in `modals/common-modals/` (shared across all profiles)
- Profile-specific modals organized by context
- Intelligent `modal-loader.js` with multi-path resolution
- 80+ total modal files across all contexts
- Enhanced modal loading performance

### Development Server (NEW!)
- `dev-server.py` - Cache-disabled development server
- Runs on port 8081 (avoids conflicts)
- Auto-refresh on file changes
- Recommended for development

### Community Features (NEW!)
- **Clubs System**: Create and join clubs with member tracking
- **Events System**: Event management with attendee tracking
- **Community Panel**: Centralized hub with auto-updating badge counts
- Tables: `clubs`, `club_members`, `events`, `event_attendees`
- Endpoints: `clubs_events_endpoints.py`

### Parent-Child Management (ENHANCED!)
- **Multi-parent support**: Students can have multiple parents (parent_id array)
- **Co-parent invitations**: Invite other parents with OTP verification
- **Multi-child management**: Parents track multiple children (children_ids array)
- **Parent reviews**: 4-factor rating system
- Table: `parent_invitations`
- Endpoints: `parent_invitation_endpoints.py`

### Profile-Based Connections (BREAKING CHANGE!)
- Connections migrated from `user_id` to `profile_id` + `profile_type`
- Universal connection system across all roles
- Migration: `migrate_profile_id_connections.py`
- **Breaking API change**: Connection endpoints now require profile info

### Credentials vs Documents Split (BREAKING CHANGE!)
- Old `documents` table → `credentials` (achievements, certifications)
- New `documents` table created (teaching/learning materials)
- Separate endpoints: `credentials_endpoints.py` + `documents_endpoints.py`
- Clear separation of concerns

### Coursework System (ENHANCED!)
- Renamed from `quiz` to `coursework`
- Expanded beyond quizzes to assignments, projects
- Give coursework to students
- View submitted answers
- Auto-grading support
- Endpoints: `coursework_endpoints.py`

### Blog System (NEW!)
- Full blog creation and publishing
- Table: `blogs`
- Endpoints: `blog_endpoints.py`

### Partner Request System (NEW!)
- Partnership proposals and tracking
- Type and category support
- Engagement tracking
- Table: `partner_requests`
- Endpoints: `partner_request_endpoints.py`

### Student Credentials System (NEW!)
- Consolidated achievement management
- Featured credential toggle
- Edit functionality
- Endpoints: `student_credentials_endpoints.py`

### OTP/Authentication System
- OTP verification system with email/phone support
- Table: `otp_verifications` (5-minute expiry)
- Migration: `create_otp_table.py`
- Endpoints: `POST /api/send-otp`, `POST /api/verify-otp`
- Optional email/phone: `migrate_email_phone_optional.py`

### Student Profile Enhancements
- Full CRUD operations for student profiles
- Enhanced fields: grade_level, subjects (JSON), bio, location, preferred_languages (JSON)
- Frontend: `profile-pages/student-profile.html` with edit modal
- Endpoints: `GET /api/student/profile`, `PUT /api/student/profile`, `GET /api/student/{id}`

### Tutor Profile Enhancements
- Extended tutor fields: education_level, certifications, teaching_experience
- **4-factor rating columns**: subject_matter, communication, discipline, punctuality
- **Expertise badge**: Auto-assigned based on rating
- Availability schedules support
- Migration: `migrate_tutor_enhancements.py`
- Seeding: 17,000+ Ethiopian tutor records via `seed_tutor_data.py`

### Profile Pages
- All profile pages use centralized `authManager` from `js/root/auth.js`
- Edit modals with field validation and data persistence
- Responsive design with proper state management
- Profile header updates dynamically after edits
- Auto-updating community badge counts

### Digital Whiteboard System (Phase 1 - COMPLETE!)
- **The "Holy Grail" Feature** - Complete collaborative teaching platform
- **Database (5 tables)**:
  - `tutor_student_bookings` - Student enrollments with tutors
  - `whiteboard_sessions` - Individual class sessions with status tracking
  - `whiteboard_pages` - Multi-page canvas support (like a notebook)
  - `whiteboard_canvas_data` - Drawing/text stroke storage (JSON)
  - `whiteboard_chat_messages` - Session-specific chat messages
- **Backend (15 API endpoints)**:
  - `whiteboard_endpoints.py` - Complete RESTful API (734 lines)
  - Booking management, session management, canvas operations, chat, pages
  - Permission system (can_draw, can_write, can_erase)
  - Session lifecycle (create → start → in-progress → end → completed)
- **Frontend (Complete UI)**:
  - `css/tutor-profile/whiteboard-modal.css` - Beautiful 3-column layout (800+ lines)
  - `js/tutor-profile/whiteboard-manager.js` - Full functionality (900+ lines)
  - **Drawing Tools (7)**: Pen, Eraser, Text, Line, Rectangle, Circle, Arrow
  - **Features**: Color picker, stroke width, undo, clear, save
  - **Multi-page**: Unlimited pages with Previous/Next navigation
  - **Collaboration**: Live chat, video placeholder, session history sidebar
  - **Keyboard Shortcuts**: P, E, T, L, R, C, A, Ctrl+Z, ESC
- **Sample Data**: 9 sessions (3 bookings × 3 sessions each: completed, in-progress, scheduled)
- **Test Page**: `test-whiteboard.html` - Visual demo page
- **Documentation (5 files)**:
  - `WHITEBOARD-SYSTEM-GUIDE.md` - Complete reference (70+ sections)
  - `WHITEBOARD-QUICK-START.md` - 5-minute setup guide
  - `WHITEBOARD-VISUAL-GUIDE.md` - Visual diagrams and flows
  - `WHITEBOARD-IMPLEMENTATION-SUMMARY.md` - Technical summary
  - `WHITEBOARD-TLDR.md` - Quick reference
  - `TEST-WHITEBOARD-NOW.md` - Testing instructions
- **Access**: Click "Digital Whiteboard" card in `profile-pages/tutor-profile.html`
- **Migration**: `migrate_create_whiteboard_tables.py`
- **Seeding**: `seed_whiteboard_data.py`
- **Status**: ✅ Production-ready, fully functional
- **What's Missing (Phase 2)**:
  - ❌ Real-time WebSocket sync (strokes broadcast live to all participants)
  - ❌ WebRTC video chat (requires STUN/TURN servers)
  - ❌ Session recording and playback (review past lessons)
  - ❌ File uploads and exports (PDF export of whiteboard pages, image import to canvas)
  - ❌ Handwriting recognition (convert handwriting to text)
  - ❌ Deck creation (create reusable teaching decks/presentations)
  - ❌ LaTeX math equation support
  - ❌ Collaborative simultaneous editing
  - ❌ Mobile touch optimization

## Production Deployment & Auto-Update System

### Overview

Astegni uses a **custom Git-based webhook auto-deployment system** for continuous deployment to production. When you push code to GitHub, it automatically deploys to the production server with zero manual intervention.

### Auto-Deployment Architecture

```
Local Development (Windows)
        ↓
    git push origin main
        ↓
GitHub Repository (Jedi-Jesus/Astegni)
        ↓
    Webhook Trigger
        ↓
Production Server (Hetzner - 218.140.122.215)
        ↓
    Auto-Pull + Service Restart
        ↓
    Live on astegni.com
```

### Production Server Details

**Hetzner Production Server:**
- **Primary IP**: `218.140.122.215`
- **Alternate IP**: `128.140.122.215` (also configured)
- **SSH Access**: `ssh root@218.140.122.215`
- **Root Password**: `UVgkFmAsh4N4`
- **Server Location**: `/var/www/astegni/`
- **Backend Path**: `/var/www/astegni/astegni-backend`
- **Provider**: Hetzner (German hosting)

**Production URLs:**
- **Main Site**: `https://astegni.com`, `https://www.astegni.com`
- **API Endpoint**: `https://api.astegni.com`

### Deployment Workflow (Step-by-Step)

#### 1. Local Development
```bash
# Make your code changes
# Test locally:
python dev-server.py              # Frontend on port 8081
cd astegni-backend && python app.py  # Backend on port 8000
```

#### 2. Commit and Push (Triggers Auto-Deployment)
```bash
git add .
git commit -m "Your changes description"
git push origin main  # ⚡ This triggers automatic deployment!
```

#### 3. Automatic Server-Side Deployment
The production server automatically:
1. **Receives webhook** from GitHub
2. **Pulls latest code**: `git pull origin main`
3. **Installs dependencies** (if `requirements.txt` changed)
4. **Restarts backend service**: `systemctl restart astegni-backend` (or `pm2 restart`)
5. **Updates deployment timestamp** in `DEPLOYMENT.md`
6. **Frontend updates instantly** (static files replaced)

**Backend restart causes ~2-5 seconds downtime** (not zero-downtime yet)

#### 4. Verification
```bash
# Check deployment timestamp
cat DEPLOYMENT.md  # Shows: "Last deployed: Wed, Dec 17, 2025 8:33:17 PM"

# Check backend status (via SSH)
ssh root@218.140.122.215
systemctl status astegni-backend  # or: pm2 status astegni-backend

# Check API health
curl https://api.astegni.com/health
```

### Environment Auto-Detection

The frontend automatically detects production vs development:

**File**: `js/config.js`
```javascript
const productionDomains = ['astegni.com', 'www.astegni.com'];
const isProduction = productionDomains.includes(window.location.hostname);

const API_BASE_URL = isProduction
    ? 'https://api.astegni.com'      // Production
    : 'http://localhost:8000';        // Development
```

**This means:**
- Local development automatically uses `http://localhost:8000`
- Production automatically uses `https://api.astegni.com`
- No manual configuration switching needed!

### Production Server Stack

```
┌─────────────────────────────────────────┐
│       Nginx (Reverse Proxy)             │
│  - Port 80/443 → Backend Port 8000      │
│  - Serves frontend static files         │
│  - SSL/TLS termination                  │
│  - Domains: astegni.com, api.astegni.com│
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│   FastAPI Backend (Python 3.9+)         │
│  - uvicorn (production mode)            │
│  - Managed by systemd or pm2            │
│  - Port: 8000 (localhost only)          │
│  - Auto-restarts on code update         │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│    PostgreSQL Database                  │
│  - astegni_user_db (70+ tables)         │
│  - astegni_admin_db (13 tables)         │
│  - Port: 5432 (localhost only)          │
│  - Password: Astegni2025                │
└─────────────────────────────────────────┘
```

### What IS Automated (✅)

1. **Code Deployment** - Git push triggers auto-pull on production
2. **Backend Service Restart** - Automatic restart after code update
3. **Frontend Update** - Static files update instantly
4. **Environment Detection** - Frontend auto-detects production vs dev
5. **Deployment Tracking** - `DEPLOYMENT.md` updated with timestamp
6. **API URL Switching** - Automatic localhost ↔ production API switching
7. **Dependency Installation** - pip install runs if requirements.txt changed

### What is NOT Automated (❌ - Manual Steps Required)

1. **Database Migrations** - Must run manually via SSH:
   ```bash
   ssh root@218.140.122.215
   cd /var/www/astegni/astegni-backend
   source venv/bin/activate
   python migrate_*.py  # Run specific migration
   systemctl restart astegni-backend
   ```

2. **Database Backups** - Manual backups before major migrations:
   ```bash
   pg_dump astegni_user_db > backup_user_$(date +%Y%m%d).sql
   pg_dump astegni_admin_db > backup_admin_$(date +%Y%m%d).sql
   ```

3. **Environment Variables** - Update `.env` on server manually:
   ```bash
   nano /var/www/astegni/astegni-backend/.env
   systemctl restart astegni-backend
   ```

4. **SSL Certificate Renewal** - Manual renewal (or use certbot auto-renew)

5. **Rollback** - Manual git revert/checkout:
   ```bash
   git revert HEAD  # or git checkout HEAD~1
   systemctl restart astegni-backend
   ```

### Production Database Configuration

**Production .env** (on server at `/var/www/astegni/astegni-backend/.env`):
```bash
# Dual Database Configuration
DATABASE_URL=postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db
ADMIN_DATABASE_URL=postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db

# Environment
ENVIRONMENT=production
DEBUG=False

# CORS
ALLOWED_ORIGINS=https://astegni.com,https://www.astegni.com,https://api.astegni.com

# JWT & Encryption (same keys as development for now)
SECRET_KEY=your_jwt_secret_key_here
REFRESH_SECRET_KEY=your_refresh_secret_key_here
CHAT_ENCRYPTION_KEY=5zf-FXAq1ZyjHtrEmn1_wqY2jf-3n4kVgCLzvqkaefI=

# Backblaze B2 (production credentials)
BACKBLAZE_KEY_ID=production_key_id
BACKBLAZE_APPLICATION_KEY=production_application_key
BACKBLAZE_BUCKET_NAME=astegni-media
```

### Deployment Artifacts

**Pre-Built Archives** (created for manual deployment if needed):
- `astegni-deploy.tar.gz` (1.2 MB) - Backend deployment package
- `astegni-frontend.tar.gz` (5.9 MB) - Frontend deployment package
- Created: Dec 17, 2025 7:18 PM

**Deployment Timestamp Tracking**:
- `DEPLOYMENT.md` - Auto-updated on each deployment
- Last deployment: Wed, Dec 17, 2025 8:33:17 PM

### Manual Deployment (Fallback Method)

If auto-deployment fails, deploy manually:

```bash
# 1. Create deployment archives locally
tar -czf astegni-deploy.tar.gz astegni-backend/
tar -czf astegni-frontend.tar.gz branch/ css/ js/ profile-pages/ index.html

# 2. Upload to server
scp astegni-deploy.tar.gz root@218.140.122.215:/var/www/
scp astegni-frontend.tar.gz root@218.140.122.215:/var/www/

# 3. SSH into server
ssh root@218.140.122.215

# 4. Extract and deploy
cd /var/www/astegni
tar -xzf ../astegni-deploy.tar.gz
tar -xzf ../astegni-frontend.tar.gz

# 5. Restart backend
systemctl restart astegni-backend

# 6. Verify
systemctl status astegni-backend
curl https://api.astegni.com/health
```

### Database Migration on Production

**Safe Migration Process**:

```bash
# 1. SSH into production server
ssh root@218.140.122.215

# 2. Navigate to backend directory
cd /var/www/astegni/astegni-backend

# 3. Activate virtual environment
source venv/bin/activate

# 4. IMPORTANT: Backup databases first!
pg_dump astegni_user_db > /var/backups/user_db_$(date +%Y%m%d_%H%M%S).sql
pg_dump astegni_admin_db > /var/backups/admin_db_$(date +%Y%m%d_%H%M%S).sql

# 5. Run migration script
python migrate_your_migration.py

# 6. Verify migration
psql astegni_user_db -c "\dt"  # List tables
psql astegni_admin_db -c "\dt"

# 7. Restart backend
systemctl restart astegni-backend

# 8. Monitor logs
journalctl -u astegni-backend -f  # or: pm2 logs astegni-backend
```

### Rollback Procedure

**If deployment breaks production:**

**Option A: Git Rollback**
```bash
ssh root@218.140.122.215
cd /var/www/astegni
git log --oneline -5  # Find last good commit
git revert HEAD  # or: git checkout <commit-hash>
systemctl restart astegni-backend
```

**Option B: Database Rollback**
```bash
# Restore from backup
ssh root@218.140.122.215
psql astegni_user_db < /var/backups/user_db_20251217_200000.sql
systemctl restart astegni-backend
```

**Option C: Full System Rollback**
```bash
# Restore code + database
git checkout HEAD~1
psql astegni_user_db < /var/backups/user_db_backup.sql
psql astegni_admin_db < /var/backups/admin_db_backup.sql
systemctl restart astegni-backend
```

### Monitoring Production

**Check Backend Status:**
```bash
ssh root@218.140.122.215

# systemd service
systemctl status astegni-backend
journalctl -u astegni-backend -f  # Follow logs

# OR pm2 (if using pm2)
pm2 status astegni-backend
pm2 logs astegni-backend --lines 100
```

**Check Database Status:**
```bash
psql -U astegni_user -d astegni_user_db -c "SELECT COUNT(*) FROM users;"
psql -U astegni_user -d astegni_admin_db -c "SELECT COUNT(*) FROM admin_users;"
```

**Check Nginx Status:**
```bash
systemctl status nginx
nginx -t  # Test configuration
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Production vs Development Differences

| Aspect | Development | Production |
|--------|-------------|------------|
| **Frontend Server** | `python dev-server.py` (port 8081) | Nginx (port 80/443) |
| **Backend Server** | `python app.py` (port 8000) | systemd/pm2 (port 8000) |
| **API URL** | `http://localhost:8000` | `https://api.astegni.com` |
| **Database Host** | `localhost` | `localhost` (same) |
| **Auto-Reload** | Enabled (uvicorn --reload) | Disabled |
| **Debug Mode** | `DEBUG=True` | `DEBUG=False` |
| **CORS** | `ALLOWED_ORIGINS=*` | Specific domains only |
| **SSL/TLS** | None (HTTP) | Enabled (HTTPS via Nginx) |
| **Cache** | Disabled (dev-server.py) | Enabled (Nginx caching) |
| **Deployment** | Manual restart | Auto-restart on git push |

### Recent Deployment History

**Latest Commits (Auto-Deployed):**
- `4bdd52e` (Jan 2025) - Add SEO files for Google Search indexing
- `6dbe2f6` (Jan 2025) - Fix accepting incoming connection requests in view-tutor.html
- `654e257` (Jan 2025) - Fix connection creation to populate profile IDs
- `017f08d` (Jan 2025) - Add cache-busting for student, parent, advertiser, user profile pages
- `b5c964d` (Dec 17, 2025) - Test auto-deployment webhook

**Deployment Timestamp:**
- Last deployed: Wed, Dec 17, 2025 8:33:17 PM
- Tracked in: `DEPLOYMENT.md`

### Best Practices for Production Deployment

1. **Always test locally first** before pushing to production
2. **Commit messages should be descriptive** (auto-deployment logs use these)
3. **Database migrations require manual execution** - Don't assume they auto-run
4. **Backup databases before major migrations**
5. **Monitor logs after deployment** to catch errors early
6. **Use feature flags** for risky features (disable in production if issues arise)
7. **Test rollback procedure** before you need it
8. **Keep production .env in sync** with new environment variables
9. **SSL certificates**: Check expiry dates monthly
10. **Monitor disk space**: Database and logs can grow quickly

### Troubleshooting Production Issues

**Backend Not Starting:**
```bash
ssh root@218.140.122.215
journalctl -u astegni-backend -n 50  # Last 50 log lines
systemctl restart astegni-backend
```

**Database Connection Errors:**
```bash
# Check PostgreSQL is running
systemctl status postgresql

# Check database credentials
psql -U astegni_user -d astegni_user_db -h localhost
```

**Frontend Not Loading:**
```bash
# Check Nginx configuration
nginx -t
systemctl restart nginx

# Check file permissions
ls -la /var/www/astegni/
```

**Auto-Deployment Not Working:**
```bash
# Check webhook listener logs
journalctl -u webhook-listener -f  # (if using systemd service)

# Manually pull latest code
cd /var/www/astegni
git pull origin main
systemctl restart astegni-backend
```

## Summary Statistics

- **Databases**: 2 (user_db: 70+ tables, admin_db: 13 tables)
- **Total Tables**: 83+ tables
- **API Endpoints**: 203+ endpoints across 31+ endpoint modules (includes Google OAuth)
- **Backend Files**: 150+ Python files
- **Migration Files**: 100+ migration scripts
- **Frontend Pages**: 40+ HTML pages
- **Modals**: 80+ modal files (16 common + 64 profile-specific)
- **JavaScript Modules**: 50+ JS modules (50+ managers)
- **CSS Modules**: 60+ CSS files
- **Documentation**: 200+ .md files
- **App Version**: 2.1.0
- **Production Server**: Hetzner (218.140.122.215)
- **Deployment Method**: Auto-deployment via Git webhook
- **Last Deployed**: Wed, Dec 17, 2025 8:33:17 PM

This represents a massive evolution from the original single-database architecture to a sophisticated dual-database platform with **Google OAuth authentication**, end-to-end encryption, comprehensive chat, extensive community features, 203+ API endpoints, and **automated production deployment** serving a complete educational ecosystem at astegni.com.
