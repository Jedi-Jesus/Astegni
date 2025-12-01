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

**2. Multi-Role System**
- One user can be a Student, a Tutor, a Parent, and an Advertiser
- Each role has dedicated profile pages and functionality
- Ability to switch between roles for users with multiple profiles

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

**4. Educational Content**
- **Tutor content creation**: Tutors can upload videos, images, blogs, stories, and advertisements
- Playlist creation and management
- Quiz system with **automatic correction** and instant feedback
- Document sharing (PDFs, presentations, worksheets)
- **Progress tracking system** for monitoring student learning analytics

**5. Session Management**
- Book tutoring sessions
- Track session history
- Real-time WebSocket support for live interactions
- Session recordings and whiteboard data persistence

**6. Reels (Short-Form Educational Content)**
- TikTok/Instagram-style vertical short videos (15-60 seconds)
- Educational content in bite-sized format
- Swipe-up navigation for endless learning
- Tutor-created quick lessons and tips
- Subject-based categorization and trending content
- Like, comment, share, save functionality
- Algorithm-driven personalized discovery
- Mobile-first and optimized for Gen-Z learners
- Low-bandwidth friendly for Ethiopian internet

**7. Communication & Social Features**
- **Real-time live video interaction** (one-on-one and group video calls)
- Real-time chat messaging
- Notifications system
- Connection/following system between users
- Group chat functionality

**8. Ethiopian Market Context (Current Phase)**
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
- **Backend**: Python FastAPI application with PostgreSQL database and Backblaze B2 cloud storage
- **Architecture**: Modular MVC pattern with 20+ specialized managers, WebSocket support, and multi-role authentication

## Quick Development Workflow

### 1. Start Backend Server
```bash
cd astegni-backend
python app.py  # Starts on http://localhost:8000
```

### 2. Start Frontend Server
```bash
# From project root (new terminal)
python -m http.server 8080  # Serves on http://localhost:8080
```

### 3. Access Application
- Main site: http://localhost:8080
- API docs: http://localhost:8000/docs
- Admin pages: http://localhost:8080/admin-pages/
- **Digital Whiteboard:** http://localhost:8080/test-whiteboard.html (NEW!)

## Quick Start: Digital Whiteboard (NEW!)

The whiteboard system is the **"holy grail, pinnacle"** feature of Astegni!

```bash
# 1. Setup database (one-time)
cd astegni-backend
python migrate_create_whiteboard_tables.py
python seed_whiteboard_data.py

# 2. Start servers (if not running)
python app.py  # Backend (terminal 1)
cd .. && python -m http.server 8080  # Frontend (terminal 2)

# 3. Test it!
# Open: http://localhost:8080/test-whiteboard.html
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
pip install -r requirements.txt  # Install: fastapi, uvicorn, sqlalchemy, psycopg3, PyJWT, bcrypt, b2sdk, slowapi

# Development server
python app.py                     # Simple start
uvicorn app:app --reload --host 0.0.0.0 --port 8000  # With auto-reload

# Database initialization (run in order for new setup)
python init_db.py                 # Create tables and schema
python seed_student_data.py       # Add sample student data
python seed_tutor_data.py         # Add 17,000+ Ethiopian tutor records

# Database migrations (run if upgrading existing database)
python create_otp_table.py        # Add OTP verification table
python migrate_email_phone_optional.py  # Make email/phone optional
python migrate_tutor_enhancements.py    # Add tutor profile fields

# Digital Whiteboard System (NEW - Phase 1 Complete!)
python migrate_create_whiteboard_tables.py  # Create whiteboard tables (5 tables)
python seed_whiteboard_data.py              # Add sample sessions (9 sessions)

# Backblaze B2 management
python setup_b2_folders.py        # Initialize folder structure
python list_b2_files.py           # List all uploaded files
python cleanup_b2_folders.py      # Remove empty folders
python reset_b2_folders.py        # DESTRUCTIVE - Reset to clean state

# Database utilities
python test_connection.py         # Verify PostgreSQL connection
python reset_db.py                # DESTRUCTIVE - Drop and recreate all tables

# Testing
python test_otp_endpoints.py      # Test OTP endpoints
```

### Frontend Operations
```bash
# No build process required - pure HTML/CSS/JavaScript

# Serve options (from project root)
python -m http.server 8080        # Python built-in server
npx serve . -p 8080               # Node.js serve package
# Or open index.html directly in browser (limited functionality)

# No linting/formatting configured - use editor extensions
```

### Environment Setup
Create `.env` file in `astegni-backend/` with the following required variables:
```
# Database Configuration
DATABASE_URL=postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db

# JWT Configuration (Generate new keys for production!)
SECRET_KEY=your_jwt_secret_key_here
REFRESH_SECRET_KEY=your_refresh_secret_key_here

# Backblaze B2 Storage (for file uploads)
BACKBLAZE_KEY_ID=your_key_id
BACKBLAZE_APPLICATION_KEY=your_application_key
BACKBLAZE_BUCKET_NAME=astegni-media
BACKBLAZE_ENDPOINT=https://s3.eu-central-003.backblazeb2.com

# Optional Redis Cache Configuration
REDIS_URL=redis://localhost:6379/0  # Optional for caching
CACHE_TTL=300  # Cache time-to-live in seconds (default: 5 minutes)
```

## Architecture Overview

### Recent Refactoring (Important!)
The backend has been refactored from a monolithic `app.py` into modules:
- `app.py` - Main entry point (minimal, just imports and starts server)
- `app.py modules/config.py` - CORS, middleware, app configuration
- `app.py modules/models.py` - All SQLAlchemy models and Pydantic schemas
- `app.py modules/routes.py` - All API endpoints (1400+ lines)

This modular structure makes the codebase more maintainable but requires checking multiple files when debugging endpoints.

### High-Level Architecture

**Frontend Architecture:**
- **No Build Process**: Pure HTML/CSS/JavaScript with TailwindCSS via CDN
- **Modular JavaScript**: Four-tier module system (root → feature → page → components)
- **Global State Management**: Centralized in `js/root/app.js` with localStorage persistence
- **Theme System**: CSS variables-based dark/light mode from `css/root/theme.css`
- **Manager Pattern**: 20+ specialized managers in `js/page-structure/` for complex features
- **Entry Points**: Main pages in root (`index.html`, `branch/*.html`), profile pages in `profile-pages/`, view pages in `view-profiles/`

**Backend Architecture:**
- **Refactored FastAPI**: Main `app.py` imports from `app.py modules/` directory containing:
  - `config.py`: Application configuration and CORS setup
  - `models.py`: SQLAlchemy models and database schemas
  - `routes.py`: All API endpoints and route handlers
- **Multi-Role Auth**: JSON-based roles (student, tutor, admin, parent, advertiser, institute)
- **Dual JWT System**: Access tokens (30min) + refresh tokens (7 days) with separate secret keys
- **PostgreSQL + psycopg3**: Modern async driver with automatic URL format conversion
- **Rate Limiting**: Tiered limits - auth: 5/min, upload: 10/min, default: 100/min
- **WebSocket Support**: Real-time features via `websocket_manager.py`
- **Redis Caching**: Optional Redis cache with automatic fallback when unavailable (`cache.py`)
- **Backblaze B2 Storage**:
  - User-separated file organization: `{type}/{category}/user_{id}/{file}`
  - Organized folders: images (posts, chat, profile, cover, thumbnails, blog, news), audio (lectures, podcasts, chat), videos (ad, lectures, story, chat, programs), documents (chat, resources)
  - Enhanced `backblaze_service.py` with user file management methods

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

### CSS Architecture

**Import Hierarchy:**
1. `css/root.css` - Main stylesheet importing shared modules from `css/root/`
2. Page-specific stylesheets import their own modules (e.g., `css/index.css` → `css/index/*`)
3. Always use CSS variables from `css/root/theme.css` for colors/theming

**Key Rules:**
- Never hardcode colors - use theme variables for dark/light mode support
- Each style exists in only one location (no-redundancy principle)
- Profile pages: `*-profile.css`, View pages: `view-*.css`

## API Endpoints

**Authentication:**
- `POST /api/register` - User registration
- `POST /api/login` - User login (returns access + refresh tokens)
- `POST /api/refresh` - Refresh access token
- `POST /api/logout` - User logout

**User Management:**
- `GET /api/me` - Get current user info
- `GET /api/my-roles` - Get user roles
- `POST /api/switch-role` - Switch active role

**Tutor System:**
- `GET /api/tutors?page=1&limit=15` - Search/filter tutors with pagination
- `GET /api/tutor/{id}` - Get specific tutor
- `GET /api/tutor/profile` - Get tutor's own profile
- `PUT /api/tutor/profile` - Update tutor profile

**Content:**
- `GET /api/videos` - Get videos
- `GET /api/blog/posts` - Get blog posts
- `GET /api/playlists` - Get playlists

**File Upload:**
- `POST /api/upload/profile-picture` - Upload profile pic with user separation
- `POST /api/upload/video` - Upload video with user separation
- `POST /api/upload/chat-file` - Upload chat files (auto-categorized)
- Files stored as: `{type}/{category}/user_{user_id}/{filename}_{timestamp}.{ext}`

**WebSocket:**
- `ws://localhost:8000/ws` - Real-time updates

## Database Schema

**Core Tables:**
- `users`: Multi-role authentication with JSON roles field
- `students`: Student profiles with grade level, subjects
- `tutors`: Tutor profiles with subjects, rates, languages
- `videos`: Video content with categories and metadata
- `playlists`: Video collections
- `connections`: User relationships
- `chat_messages`: Real-time messaging
- `notifications`: User notifications

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

### Key Files
- `admin-pages/ADMIN-MODULAR-STRUCTURE.md`: Complete documentation of the admin modular system
- Panel switching preserves state in URL (e.g., `?panel=verified`)
- All admin pages support ESC key for closing modals/sidebar

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

## WebSocket Real-Time Features

The `websocket_manager.py` implements:
- **Connection Management**: User-based and room-based connections
- **Real-time Chat**: Direct messaging and group chat support
- **Live Notifications**: Push notifications to connected users
- **Live Sessions**: Support for educational live streaming/sessions
- **Connection Types**: Multiple connections per user supported

## Testing & Debugging

### Backend Testing
```bash
cd astegni-backend
python test_connection.py   # Test database connection

# Test API endpoints manually
curl http://localhost:8000/api/tutors
curl http://localhost:8000/api/videos

# Check WebSocket connection
wscat -c ws://localhost:8000/ws
```

### Frontend Testing
- **Test Pages**: `test_functions.html` (function tests), `test_search.html` (search functionality)
- **Browser DevTools**: Network tab for API monitoring, Console for JavaScript errors
- **No automated tests**: Project uses manual testing approach

### Debugging Tips
- Backend logs to console by default (uvicorn logging)
- Check `.env` file for missing configuration
- Redis cache failures are non-blocking (automatic fallback)
- WebSocket disconnections auto-retry with exponential backoff

## Common Issues & Solutions

**Database Connection:**
- psycopg3 automatically converts `postgresql://` to `postgresql+psycopg://`
- Default credentials: astegni_user:Astegni2025

**CORS Issues:**
- Backend configured for localhost:8080 (frontend) and localhost:8000 (backend)
- Check `app.py modules/config.py` for CORS origins

**Authentication:**
- Access tokens expire in 30 minutes
- Refresh tokens last 7 days
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

## Common Development Tasks

### Adding a New API Endpoint
1. Define the route in `astegni-backend/app.py modules/routes.py`
2. Add models/schemas in `astegni-backend/app.py modules/models.py` if needed
3. Test with FastAPI docs at http://localhost:8000/docs
4. Update frontend API calls (usually in feature-specific modules)

### Creating a New Admin Page
1. Copy `admin-pages/admin-page-template.html` as starting point
2. Create page-specific JS in `js/admin-pages/[page-name].js`
3. Create page-specific CSS in `css/admin-pages/[page-name].css`
4. Import shared modules from `js/admin-pages/shared/`
5. Follow the panel switching pattern for multi-view pages

### Adding a New Feature Module
1. Create directory: `js/[feature-name]/`
2. Split into files: `api.js`, `ui.js`, `state.js`, `controller.js`, `init.js`
3. Create corresponding CSS: `css/[feature-name]/`
4. Follow the find-tutors pattern as reference

### Working with Authentication
- Tokens stored in localStorage: `token` (access) and `refreshToken` (refresh)
- Auto-refresh handled by `js/root/auth.js`
- Check authentication with: `authManager.isAuthenticated()`
- Get current user: `authManager.getCurrentUser()`

## Important Gotchas

### Backend
- **PostgreSQL URL**: psycopg3 auto-converts `postgresql://` to `postgresql+psycopg://`
- **JSON fields**: Use PostgreSQL JSON operators carefully in SQLAlchemy queries
- **Rate limiting**: Different limits for auth (5/min), uploads (10/min), default (100/min)
- **File uploads**: Always pass `user_id` for proper file organization in B2

### Frontend
- **No jQuery**: Project uses vanilla JavaScript only
- **Global functions**: Required for HTML `onclick` handlers (see `global-functions.js` pattern)
- **API Base URL**: Hardcoded to `http://localhost:8000` in multiple files
- **Theme variables**: Always use CSS variables from `css/root/theme.css`, never hardcode colors
- **Module loading**: No ES6 modules - use script tags with proper ordering

## Critical Files Reference

### Backend Core
- `astegni-backend/app.py`: Main entry point
- `astegni-backend/app.py modules/routes.py`: ALL API endpoints (1400+ lines)
- `astegni-backend/app.py modules/models.py`: Database models and schemas
- `astegni-backend/app.py modules/config.py`: CORS and app configuration
- `astegni-backend/utils.py`: JWT, password hashing, utilities
- `astegni-backend/backblaze_service.py`: File upload with user separation
- `astegni-backend/websocket_manager.py`: WebSocket implementation

### Frontend Core
- `js/root/app.js`: Global state and initialization
- `js/root/auth.js`: Authentication manager
- `css/root/theme.css`: Theme variables (dark/light mode)
- `css/root.css`: Main CSS entry point
- `index.html`: Landing page
- `branch/find-tutors.html`: Most complex feature implementation

### Documentation
- `astegni-backend/B2_FOLDER_STRUCTURE.md`: Cloud storage organization
- `astegni-backend/USER_FILE_ORGANIZATION.md`: File separation strategy
- `admin-pages/ADMIN-MODULAR-STRUCTURE.md`: Admin pages architecture

## Recent Additions & Migrations

**OTP/Authentication System:**
- OTP verification system with email/phone support
- Table: `otp_verifications` (5-minute expiry)
- Migration: `create_otp_table.py`
- Endpoints: `POST /api/send-otp`, `POST /api/verify-otp`
- Optional email/phone: `migrate_email_phone_optional.py`

**Student Profile Enhancements:**
- Full CRUD operations for student profiles
- Enhanced fields: grade_level, subjects (JSON), bio, location, preferred_languages (JSON)
- Frontend: `profile-pages/student-profile.html` with edit modal
- Endpoints: `GET /api/student/profile`, `PUT /api/student/profile`, `GET /api/student/{id}`

**Tutor Profile Enhancements:**
- Extended tutor fields: education_level, certifications, teaching_experience
- Availability schedules support
- Migration: `migrate_tutor_enhancements.py`
- Seeding: 17,000+ Ethiopian tutor records via `seed_tutor_data.py`

**Profile Pages:**
- All profile pages use centralized `authManager` from `js/root/auth.js`
- Edit modals with field validation and data persistence
- Responsive design with proper state management
- Profile header updates dynamically after edits

**Digital Whiteboard System (Phase 1 - COMPLETE!):**
- **The "Holy Grail" Feature** - Complete collaborative teaching platform
- **Database (5 tables):**
  - `tutor_student_bookings` - Student enrollments with tutors
  - `whiteboard_sessions` - Individual class sessions with status tracking
  - `whiteboard_pages` - Multi-page canvas support (like a notebook)
  - `whiteboard_canvas_data` - Drawing/text stroke storage (JSON)
  - `whiteboard_chat_messages` - Session-specific chat messages
- **Backend (15 API endpoints):**
  - `whiteboard_endpoints.py` - Complete RESTful API (734 lines)
  - Booking management, session management, canvas operations, chat, pages
  - Permission system (can_draw, can_write, can_erase)
  - Session lifecycle (create → start → in-progress → end → completed)
- **Frontend (Complete UI):**
  - `css/tutor-profile/whiteboard-modal.css` - Beautiful 3-column layout (800+ lines)
  - `js/tutor-profile/whiteboard-manager.js` - Full functionality (900+ lines)
  - **Drawing Tools (7):** Pen, Eraser, Text, Line, Rectangle, Circle, Arrow
  - **Features:** Color picker, stroke width, undo, clear, save
  - **Multi-page:** Unlimited pages with Previous/Next navigation
  - **Collaboration:** Live chat, video placeholder, session history sidebar
  - **Keyboard Shortcuts:** P, E, T, L, R, C, A, Ctrl+Z, ESC
- **Sample Data:** 9 sessions (3 bookings × 3 sessions each: completed, in-progress, scheduled)
- **Test Page:** `test-whiteboard.html` - Visual demo page
- **Documentation (5 files):**
  - `WHITEBOARD-SYSTEM-GUIDE.md` - Complete reference (70+ sections)
  - `WHITEBOARD-QUICK-START.md` - 5-minute setup guide
  - `WHITEBOARD-VISUAL-GUIDE.md` - Visual diagrams and flows
  - `WHITEBOARD-IMPLEMENTATION-SUMMARY.md` - Technical summary
  - `WHITEBOARD-TLDR.md` - Quick reference
  - `TEST-WHITEBOARD-NOW.md` - Testing instructions
- **Access:** Click "Digital Whiteboard" card in `profile-pages/tutor-profile.html`
- **Migration:** `migrate_create_whiteboard_tables.py`
- **Seeding:** `seed_whiteboard_data.py`
- **Status:** ✅ Production-ready, fully functional
- **What's Missing (Phase 2):**
  - ❌ Real-time WebSocket sync (strokes broadcast live to all participants)
  - ❌ WebRTC video chat (requires STUN/TURN servers)
  - ❌ Session recording and playback (review past lessons)
  - ❌ File uploads and exports (PDF export of whiteboard pages, image import to canvas)
  - ❌ Handwriting recognition (convert handwriting to text)
  - ❌ Deck creation (create reusable teaching decks/presentations)
  - ❌ LaTeX math equation support
  - ❌ Collaborative simultaneous editing
  - ❌ Mobile touch optimization