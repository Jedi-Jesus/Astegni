# Student Profile HTML Structure Blueprint

**Complete Structural Analysis of `student-profile.html`**
**File Location**: `c:\Users\zenna\Downloads\Astegni-v-1.1\profile-pages\student-profile.html`
**Total Lines**: 3363
**Purpose**: This document provides a complete structural blueprint for creating `user-profile.html` with the EXACT same structure as `student-profile.html`

---

## Table of Contents
1. [DOCTYPE and Head Section](#1-doctype-and-head-section)
2. [Body Structure Overview](#2-body-structure-overview)
3. [Navigation Bar](#3-navigation-bar)
4. [Advertisement Section](#4-advertisement-section)
5. [Sidebar](#5-sidebar)
6. [Main Content Structure](#6-main-content-structure)
7. [Profile Header Section](#7-profile-header-section)
8. [Panel System](#8-panel-system)
9. [Right Sidebar Widgets](#9-right-sidebar-widgets)
10. [Bottom Widgets](#10-bottom-widgets)
11. [Modals](#11-modals)
12. [Footer](#12-footer)
13. [JavaScript Imports](#13-javascript-imports)
14. [Floating Action Button (FAB)](#14-floating-action-button-fab)

---

## 1. DOCTYPE and Head Section

### DOCTYPE Declaration
```html
<!DOCTYPE html>
<html lang="en" data-theme="light">
```

### Head Section (Lines 4-969)

#### Meta Tags
```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ASTEGNI - Student Profile</title>
```

#### External Resources
1. **TailwindCSS CDN**
   ```html
   <script src="https://cdn.tailwindcss.com"></script>
   ```

2. **Animate.css**
   ```html
   <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css" />
   ```

3. **Font Awesome Icons**
   ```html
   <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
   ```

#### CSS Imports (in order)
```html
<!-- Custom Styles -->
<link rel="stylesheet" href="../css/root.css">
<link rel="stylesheet" href="../css/admin-profile/admin.css">
<link rel="stylesheet" href="../css/admin-pages/shared/admin-layout-fix.css">
<link rel="stylesheet" href="../css/tutor-profile/tutor-profile.css">
<link rel="stylesheet" href="../css/find-tutors/hero-section.css">

<!-- Shared Modal Styles -->
<link rel="stylesheet" href="../css/common-modals/coming-soon-modal.css">
<link rel="stylesheet" href="../css/common-modals/ad-modal.css">
```

#### Inline Styles (Lines 25-968)
**Major Style Sections**:
1. Body padding compensation (lines 27-29)
2. Profile header overflow fixes (lines 31-129)
3. Enhanced profile header section styles (lines 131-663)
4. Study tips ticker animation (lines 717-785)
5. Sidebar fix styles (lines 787-799)
6. Upload modal styles (lines 801-967)

**Key Style Classes**:
- `.profile-header-section` - Main profile container
- `.cover-image-container` - Cover photo area
- `.profile-main-info` - Profile info wrapper
- `.profile-avatar-container` - Avatar with upload button
- `.profile-details-section` - Name, badges, rating
- `.rating-tooltip` - Hover rating breakdown
- `.profile-info-grid` - About me section
- `.profile-quote` - Motivational quote
- `.profile-connections` - Connections stats
- `.profile-actions` - Action buttons
- `.activity-ticker-container` - Animated ticker
- `.upload-cover-modal` - Cover upload modal
- `.upload-profile-modal` - Profile pic upload modal

---

## 2. Body Structure Overview

```
<body class="font-sans">
  ├── Navigation Bar
  ├── Top Advertisement
  ├── Sidebar (Left)
  ├── Main Content Section
  │   ├── Hero Section
  │   └── Content Grid
  │       ├── Left Content Area (Panels)
  │       └── Right Sidebar Widgets
  ├── Bottom Widgets Section
  ├── Modals
  │   ├── Edit Profile Modal
  │   ├── Cover Upload Modal
  │   └── Profile Upload Modal
  ├── Footer
  ├── JavaScript Imports
  └── Floating Action Button (FAB)
</body>
```

---

## 3. Navigation Bar

**Structure** (Lines 974-1038):
```html
<nav class="navbar" role="navigation" aria-label="Main navigation">
  <div class="nav-container">
    <!-- Left: Brand & Hamburger -->
    <div class="nav-brand">
      <button class="sidebar-toggle" id="hamburger">
        <span class="hamburger">
          <span></span> <!-- 3 bars -->
        </span>
      </button>
      <a href="../profile-pages/student-profile.html" class="logo-container">
        <div class="logo-text">
          <span class="logo-main">Astegni</span>
          <span class="logo-sub">Student</span>
        </div>
        <span class="logo-badge">Beta</span>
      </a>
    </div>

    <!-- Center: Navigation Menu -->
    <div class="nav-menu">
      <div class="nav-items">
        <a class="nav-link" href="../index.html">🏠 Home</a>
        <a class="nav-link" onclick="handleNavLinkClick(event, 'news')">📰 News</a>
        <a class="nav-link" href="../branch/find-tutors.html">👨‍🏫 Find Tutors</a>
        <a class="nav-link" href="../branch/reels.html">🎬 Reels</a>
        <a class="nav-link" onclick="handleNavLinkClick(event, 'store')">📚 Bookstore</a>
        <a class="nav-link" onclick="handleNavLinkClick(event, 'find-jobs')">💼 Find a Job</a>
      </div>
    </div>

    <!-- Right: Actions -->
    <div class="nav-actions">
      <!-- Notification Button -->
      <button class="icon-btn" aria-label="Notifications">
        <svg>...</svg>
        <span class="notification-badge">3</span>
      </button>

      <!-- Theme Toggle -->
      <button id="theme-toggle-btn" class="icon-btn">
        <svg>...</svg>
      </button>
    </div>
  </div>
</nav>
```

**Key Features**:
- Responsive hamburger menu
- Logo with badge
- 6 navigation links (3 direct, 3 with onclick handlers)
- Notification counter badge
- Theme toggle button

---

## 4. Advertisement Section

**Structure** (Lines 1040-1059):
```html
<div class="ad-container premium-ad" style="margin-top: 2rem;" onclick="openAdAnalyticsModal()">
  <div class="ad-animation">
    <div class="pulse-ring"></div>
    <div class="pulse-ring"></div>
  </div>
  <div class="ad-content">
    <span class="ad-label">Advertisement</span>
    <h3 class="ad-title">Unlock Your Full Potential</h3>
    <p class="ad-text">Premium tutoring available</p>
    <button class="ad-cta" onclick="openAdAnalyticsModal()">Learn More</button>
  </div>
  <div class="ad-visual">
    <div class="ad-circles">
      <div class="circle circle-1"></div>
      <div class="circle circle-2"></div>
      <div class="circle circle-3"></div>
    </div>
  </div>
</div>
```

---

## 5. Sidebar

**Structure** (Lines 1062-1171):
```html
<aside id="sidebar" class="sidebar-container">
  <div class="sidebar-content">
    <div class="sidebar-nav">
      <h3>Student Dashboard</h3>

      <!-- Navigation Links (15 total) -->
      <a onclick="switchPanel('dashboard')" class="sidebar-link active">
        <span class="sidebar-icon">🏠</span>
        <span>Dashboard</span>
      </a>

      <a onclick="switchPanel('ai-insights')" class="sidebar-link">
        <span class="sidebar-icon">🧠</span>
        <span>AI Study Assistant</span>
        <span class="badge-new">New</span>
      </a>

      <a onclick="switchPanel('my-tutors')" class="sidebar-link">
        <span class="sidebar-icon">👨‍🏫</span>
        <span>My Tutors</span>
        <span class="badge-count">3</span>
      </a>

      <!-- ... more sidebar links ... -->

      <!-- Quick Stats Section -->
      <div class="mt-6 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
        <h4>📊 Quick Stats</h4>
        <div class="space-y-3">
          <div class="stat">📚 Active Courses: <span>6</span></div>
          <div class="stat">📈 Overall Progress: <span>85%</span></div>
          <div class="stat">⏱️ Study Hours: <span>24</span></div>
        </div>
      </div>
    </div>
  </div>
</aside>
```

**Sidebar Links** (15 total):
1. Dashboard (active by default)
2. AI Study Assistant (with "New" badge)
3. My Tutors (with count: 3)
4. My Courses (with count: 6)
5. My Schedule
6. Learning Tools
7. My Resources
8. Blog (with count: 7)
9. Grades & Certifications
10. My Requests
11. Parent Portal
12. Ratings & Reviews
13. Become a Tutor
14. Notes (external link)
15. Purchase History
16. Settings

---

## 6. Main Content Structure

**Structure** (Lines 1173-2505):
```html
<section class="py-8" style="padding-top: 1rem;">
  <div class="container mx-auto px-4">

    <!-- Hero Section -->
    <section class="hero-section animate__animated animate__fadeIn">
      <h2 class="hero-title">
        <span id="typedText">Empowering My Future Through Learning</span>
        <span id="cursor" class="cursor-blink">|</span>
      </h2>
      <p id="hero-subtitle" class="hero-subtitle">...</p>
      <div class="hero-stats">
        <div class="stat-item" data-target="6">Active Courses</div>
        <div class="stat-item" data-target="24">Study Hours</div>
        <div class="stat-item" data-target="3.8" data-decimal="1">GPA</div>
      </div>
    </section>

    <!-- Main Content with Widgets -->
    <div class="flex gap-6">
      <!-- Left Content Area -->
      <div class="flex-1" style="min-width: 0;">
        <div class="panels-container">
          <!-- All panels go here -->
        </div>
      </div>

      <!-- Right Sidebar Widgets -->
      <div class="sidebar-right" style="width: 350px; flex-shrink: 0;">
        <!-- Widgets go here -->
      </div>
    </div>

  </div>
</section>
```

**Hero Section Components**:
- Typed text effect with cursor blink
- Hero subtitle
- 3 animated stat counters (using IntersectionObserver)

---

## 7. Profile Header Section

**Structure** (Lines 1209-1434):
```html
<!-- Profile Header Section (Only visible in Dashboard Panel) -->
<section class="profile-header-section mb-8">

  <!-- Cover Image Container -->
  <div class="cover-image-container relative">
    <img id="cover-img" src="..." alt="Cover" class="cover-img">
    <div class="cover-overlay"></div>
    <button onclick="openCoverUploadModal()" class="cover-upload-btn">
      <svg>...</svg> <!-- Camera icon -->
    </button>
  </div>

  <!-- Profile Main Info -->
  <div class="profile-main-info">
    <div class="profile-info-wrapper">

      <!-- Avatar Section -->
      <div class="profile-avatar-container">
        <img id="profile-avatar" src="..." class="profile-avatar">
        <span class="online-indicator"></span>
        <button onclick="openProfileUploadModal()" class="avatar-upload-btn">
          <svg>...</svg>
        </button>
      </div>

      <!-- Profile Details Section -->
      <div class="profile-details-section">

        <!-- Name Row -->
        <div class="profile-name-row">
          <h1 class="profile-name" id="studentName">Student Name</h1>
          <div class="badges-row">
            <span class="profile-badge verified">✔ Verified Student</span>
            <span class="profile-badge school">📚 Grade 12</span>
            <span class="profile-badge expert">⭐ Honor Roll Student</span>
          </div>
        </div>

        <!-- Rating Section with Tooltip -->
        <div class="rating-section">
          <div class="rating-wrapper" id="rating-hover-trigger">
            <span class="rating-value" id="student-rating">4.5</span>
            <div class="rating-stars">★★★★★</div>
            <span class="rating-count">(12 reviews)</span>

            <!-- Rating Tooltip (Hover) -->
            <div class="rating-tooltip" id="rating-tooltip">
              <h4>Rating Breakdown</h4>
              <div class="rating-metric">
                <div class="metric-header">
                  <span>Class Activity</span>
                  <span>4.6</span>
                </div>
                <div class="metric-bar">
                  <div class="metric-fill" style="width: 92%"></div>
                </div>
              </div>
              <!-- 5 metrics total: Class Activity, Discipline, Punctuality, Communication, Subject Intake -->
            </div>
          </div>
        </div>

        <!-- Location Info -->
        <div class="profile-location">
          <span>📍</span>
          <span id="student-location">Addis Ababa, Ethiopia | 12th Grade</span>
        </div>

        <!-- Optional Info Fields (initially hidden) -->
        <div class="profile-location" id="school-container" style="display: none;">
          <span>🏫</span>
          <span id="student-school">School Name</span>
        </div>

        <div class="profile-location" id="gender-container" style="display: none;">
          <span>👤</span>
          <span id="student-gender">Gender</span>
        </div>

        <div class="profile-location" id="subjects-container" style="display: none;">
          <span>📚</span>
          <span id="student-subjects">Mathematics, Physics, Chemistry</span>
        </div>

        <div class="profile-location" id="email-container" style="display: none;">
          <span>✉️</span>
          <span id="student-email">email@example.com</span>
        </div>

        <div class="profile-location" id="phone-container" style="display: none;">
          <span>📞</span>
          <span id="student-phone">+251 912 345 678</span>
        </div>

        <!-- About Me Info Grid -->
        <div class="profile-info-grid">
          <div class="info-item">
            <span class="info-label">Grade Level:</span>
            <span class="info-value" id="student-grade">Grade 12</span>
          </div>
          <div class="info-item">
            <span class="info-label">Joined:</span>
            <span class="info-value" id="student-joined">January 2020</span>
          </div>
          <div class="info-description">
            <p id="student-bio">Passionate about learning and technology...</p>
          </div>
        </div>

        <!-- Profile Quote -->
        <div class="profile-quote">
          <span id="student-quote">"Knowledge is power. Learning never stops."</span>
        </div>

        <!-- Connections Section -->
        <div class="profile-connections">
          <div class="connections-header">
            <h4>👥 Connections</h4>
            <button onclick="openCommunityModal()">View All</button>
          </div>
          <div class="connections-stats">
            <div class="stat-box">
              <div id="connections-count">234</div>
              <div>Connections</div>
            </div>
            <div class="stat-box">
              <div id="classmates-count">45</div>
              <div>Classmates</div>
            </div>
            <div class="stat-box">
              <div id="tutors-count">3</div>
              <div>Tutors</div>
            </div>
          </div>
        </div>

        <!-- Profile Actions -->
        <div class="profile-actions">
          <button onclick="openEditProfileModal()" class="btn-primary">
            <span>✏️</span> Edit Profile
          </button>
          <button onclick="shareProfile()" class="btn-secondary">
            <span>🔗</span> Share Profile
          </button>
        </div>

      </div>
    </div>
  </div>
</section>
```

**Profile Header ID/Class Summary**:
- `#cover-img` - Cover photo
- `#profile-avatar` - Avatar image
- `#studentName` - Student name
- `#student-rating` - Rating value
- `#rating-tooltip` - Rating breakdown (hover)
- `#student-location` - Location text
- `#student-school`, `#student-gender`, `#student-subjects`, `#student-email`, `#student-phone` - Optional fields
- `#student-grade`, `#student-joined`, `#student-bio` - Info grid
- `#student-quote` - Motivational quote
- `#connections-count`, `#classmates-count`, `#tutors-count` - Connection stats

---

## 8. Panel System

**Panel Container** (Lines 1205-2500):
```html
<div class="panels-container">
  <!-- Panel 1: Dashboard (Default - Active) -->
  <div id="dashboard-panel" class="panel-content active">
    <!-- Profile Header Section -->
    <!-- Page Header -->
    <!-- Achievements Section -->
    <!-- Statistics Cards (8 cards) -->
    <!-- Reviews Section -->
  </div>

  <!-- Panel 2: AI Insights -->
  <div id="ai-insights-panel" class="panel-content hidden">...</div>

  <!-- Panel 3: My Courses -->
  <div id="my-courses-panel" class="panel-content hidden">...</div>

  <!-- Panel 4: My Tutors -->
  <div id="my-tutors-panel" class="panel-content hidden">...</div>

  <!-- Panel 5: Schedule -->
  <div id="schedule-panel" class="panel-content hidden">...</div>

  <!-- Panel 6: Learning Tools -->
  <div id="learning-tools-panel" class="panel-content hidden">...</div>

  <!-- Panel 7: Learning Resources -->
  <div id="learning-resources-panel" class="panel-content hidden">...</div>

  <!-- Panel 8: Blog -->
  <div id="blog-panel" class="panel-content hidden">...</div>

  <!-- Panel 9: Grades -->
  <div id="grades-panel" class="panel-content hidden">...</div>

  <!-- Panel 10: My Requests -->
  <div id="my-requests-panel" class="panel-content hidden">...</div>

  <!-- Panel 11: Parent Portal -->
  <div id="parent-portal-panel" class="panel-content hidden">...</div>

  <!-- Panel 12: Ratings and Reviews -->
  <div id="ratings-and-reviews-panel" class="panel-content hidden">...</div>

  <!-- Panel 13: Become Tutor -->
  <div id="become-tutor-panel" class="panel-content hidden">...</div>

  <!-- Panel 14: Purchase -->
  <div id="purchase-panel" class="panel-content hidden">...</div>

  <!-- Panel 15: Settings -->
  <div id="settings-panel" class="panel-content hidden">...</div>
</div>
```

### Dashboard Panel Components

**1. Page Header**:
```html
<div class="mb-8 animate-fadeIn">
  <h1 class="text-3xl font-bold mb-2">Student Dashboard</h1>
  <p class="text-gray-600">Overview of your academic activities...</p>
</div>
```

**2. Achievements Section**:
```html
<div class="card p-6 mb-8">
  <h3 class="text-xl font-semibold mb-4">Achievements & Certifications</h3>
  <div class="grid grid-cols-3 md:grid-cols-6 gap-4">
    <div class="text-center">
      <div class="text-3xl mb-2">🏆</div>
      <div class="text-sm">Top Student</div>
      <div class="text-xs text-gray-500">Q4 2024</div>
    </div>
    <!-- 6 achievement badges total -->
  </div>
</div>
```

**3. Statistics Cards (8 cards in dashboard-grid)**:
```html
<div class="dashboard-grid mb-8">
  <!-- Card 1: Total Courses -->
  <div class="card p-4">
    <div class="flex items-center gap-3 mb-2">
      <span class="text-3xl">📚</span>
      <h3>Total Courses</h3>
    </div>
    <p class="text-2xl font-bold" id="stat-total-courses">0</p>
    <span class="text-sm text-gray-500">All time</span>
  </div>

  <!-- Card 2: Active Courses -->
  <!-- Card 3: Completion Rate -->
  <!-- Card 4: My Tutors -->
  <!-- Card 5: Assignments Completed -->
  <!-- Card 6: Average Performance -->
  <!-- Card 7: Study Hours -->
  <!-- Card 8: GPA -->
</div>
```

**4. Reviews Section**:
```html
<div class="card p-6 mb-8">
  <h3 class="text-xl font-semibold mb-4">Recent Feedback from Tutors</h3>
  <div class="space-y-4">
    <div class="border-l-4 border-blue-500 pl-4">
      <div class="flex justify-between items-start mb-2">
        <div>
          <h4 class="font-semibold">Excellent Progress in Mathematics</h4>
          <p class="text-sm text-gray-600">From: Math Tutor</p>
        </div>
        <div class="flex items-center">
          <span class="text-yellow-400">★★★★★</span>
        </div>
      </div>
      <p class="text-gray-700">Review text...</p>
      <p class="text-xs text-gray-500 mt-2">3 days ago</p>
    </div>
    <!-- 3 review cards total -->
  </div>
</div>
```

### Other Panel Structures

**AI Insights Panel**:
- Title and description
- 4 AI feature cards (Smart Recommendations, Performance Analytics, AI Tutor, Study Plan Generator)

**My Courses Panel**:
- Panel header with "Add Course" button
- Filter chips (All, Active, Completed, Upcoming)
- Courses grid (dynamically loaded)

**My Tutors Panel**:
- Panel header with "Find New Tutor" button
- Tutors grid (dynamically loaded)

**Schedule Panel**:
- Panel header with "Schedule Session" button
- Schedule calendar (dynamically loaded)

**Learning Tools Panel**:
- Lab Simulator card
- Digital Whiteboard card
- Feature lists for each tool

**Learning Resources Panel**:
- Upload resource button
- Resource filters (All, Notes, Assignments, Textbooks, etc.)
- Resource stats (4 stat cards)
- Resources grid with sample files

---

## 9. Right Sidebar Widgets

**Structure** (Lines 2506-2933):
```html
<div class="sidebar-right" style="width: 350px; flex-shrink: 0;">

  <!-- Study Tips Widget (Animated Ticker) -->
  <div class="sidebar-widget study-tips-widget card">
    <h3>💡 Study Tips</h3>
    <div class="activity-ticker-container">
      <div class="activity-ticker">
        <div class="activity-item">
          <span>🎯</span>
          <div>
            <h4>Stay Organized</h4>
            <p>Keep track of deadlines and prioritize tasks...</p>
          </div>
        </div>
        <!-- 6 tips total with auto-scroll animation -->
      </div>
    </div>
  </div>

  <!-- Weather Widget -->
  <div class="sidebar-widget weather-widget card">
    <div class="weather-header">
      <h3>🌤️ Weather Forecast</h3>
      <button>View Details</button>
    </div>
    <div class="weather-current">
      <div class="weather-icon">☀️</div>
      <div class="weather-temp">24°C</div>
      <div class="weather-condition">Sunny</div>
    </div>
    <div class="weather-details">
      <div>💧 Humidity: 45%</div>
      <div>💨 Wind: 12 km/h</div>
    </div>
    <div class="weather-forecast-grid">
      <!-- 7-day forecast (Mon-Sun) -->
    </div>
  </div>

  <!-- News Widget (Carousel) -->
  <div class="sidebar-widget news-widget card">
    <div class="widget-header">
      <h3>📰 Latest News</h3>
      <a href="#" onclick="openComingSoonModal('news')">View All</a>
    </div>
    <div class="news-carousel">
      <div class="news-card-container" id="newsCardContainer">
        <div class="news-card active" data-news-index="0">
          <div class="news-card-header">
            <span class="news-category-badge">Education</span>
            <span class="news-time">2h ago</span>
          </div>
          <div class="news-card-image">
            <img src="...">
          </div>
          <div class="news-card-content">
            <h4>News Title</h4>
            <p>News excerpt...</p>
            <div class="news-stats">
              <span>🔥 Trending</span>
              <span>👁️ 1.2k views</span>
              <span>💬 45 comments</span>
            </div>
          </div>
        </div>
        <!-- 3 news cards total -->
      </div>
    </div>
  </div>

  <!-- Market Trends Widget -->
  <div class="sidebar-widget market-widget card">
    <div class="widget-header">
      <h3>💹 Market Trends</h3>
      <a onclick="openComingSoonModal('market')">Details</a>
    </div>
    <div class="market-sections">
      <!-- Ethiopian Stock Exchange Section -->
      <div class="market-section">
        <h4>Ethiopian Stock Exchange (ESX)</h4>
        <div class="exchange-item">
          <div>🏦 Banking Sector</div>
          <div>
            <span class="rate">1,245.67</span>
            <span class="change up">↑ 2.34%</span>
          </div>
        </div>
        <div class="exchange-item">
          <div>📱 Telecom Sector</div>
          <div>
            <span class="rate">892.45</span>
            <span class="change up">↑ 1.87%</span>
          </div>
        </div>
      </div>

      <!-- Forex Exchange Section -->
      <div class="market-section">
        <h4>Forex Exchange</h4>
        <div class="exchange-item">
          <div>🇺🇸 USD/ETB</div>
          <div>
            <span class="rate">56.85</span>
            <span class="change up">↑ 0.25%</span>
          </div>
        </div>
        <div class="exchange-item">
          <div>🇪🇺 EUR/ETB</div>
          <div>
            <span class="rate">61.23</span>
            <span class="change up">↑ 0.18%</span>
          </div>
        </div>
      </div>
    </div>
  </div>

</div>
```

**Right Sidebar Widget Summary**:
1. **Study Tips Widget** - Animated vertical ticker with 6 rotating tips
2. **Weather Widget** - Current weather + 7-day forecast
3. **News Widget** - Carousel with 3 rotating news cards
4. **Market Trends Widget** - Ethiopian Stock Exchange (ESX) + Forex rates

---

## 10. Bottom Widgets

**Structure** (Lines 2507-2933):
```html
<!-- Bottom Widgets Section -->
<section class="bottom-widgets" style="margin-top: 3rem; margin-bottom: 3rem;">
  <div class="container mx-auto px-4">
    <div class="bottom-widgets-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem;">

      <!-- Weather Widget (Duplicate from right sidebar) -->
      <div class="bottom-widget weather-widget" data-weather-theme="royal-blue">
        <!-- Same structure as right sidebar weather widget -->
      </div>

      <!-- Additional bottom widgets can be added here -->

    </div>
  </div>
</section>
```

**Note**: Bottom widgets section is a duplicate of the weather widget for responsive design purposes.

---

## 11. Modals

### 11.1 Edit Profile Modal

**Structure** (Lines 2939-3027):
```html
<div id="edit-profile-modal" class="modal hidden">
  <div class="modal-overlay" onclick="closeEditProfileModal()"></div>
  <div class="modal-content enhanced-modal">

    <div class="modal-header">
      <h2>Edit Profile</h2>
      <button class="modal-close" onclick="closeEditProfileModal()">×</button>
    </div>

    <div class="modal-body">
      <form id="editStudentProfileForm">

        <!-- Row 1: First Name + Father Name -->
        <div class="form-row">
          <div class="form-group">
            <label>First Name *</label>
            <input type="text" id="editFirstName" class="form-input" required>
          </div>
          <div class="form-group">
            <label>Father Name *</label>
            <input type="text" id="editFatherName" class="form-input" required>
          </div>
        </div>

        <!-- Grand Father Name -->
        <div class="form-group">
          <label>Grand Father Name *</label>
          <input type="text" id="editGrandFatherName" class="form-input" required>
        </div>

        <!-- Username -->
        <div class="form-group">
          <label>Username *</label>
          <input type="text" id="editUsername" class="form-input" required>
        </div>

        <!-- Gender -->
        <div class="form-group">
          <label>Gender</label>
          <select id="editGender" class="form-select">
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        <!-- Row 2: Email + Phone -->
        <div class="form-row">
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="editEmail" class="form-input">
          </div>
          <div class="form-group">
            <label>Phone Number</label>
            <input type="tel" id="editPhone" class="form-input">
          </div>
        </div>

        <!-- Grade Level -->
        <div class="form-group">
          <label>Grade Level</label>
          <input type="text" id="editGradeLevel" class="form-input">
        </div>

        <!-- Subjects -->
        <div class="form-group">
          <label>Subjects (comma-separated)</label>
          <input type="text" id="editSubjects" class="form-input">
          <small class="form-hint">Separate multiple subjects with commas</small>
        </div>

        <!-- Preferred Languages -->
        <div class="form-group">
          <label>Preferred Languages (comma-separated)</label>
          <input type="text" id="editLanguages" class="form-input">
          <small class="form-hint">Languages you prefer to study in</small>
        </div>

        <!-- Location -->
        <div class="form-group">
          <label>Location</label>
          <input type="text" id="editLocation" class="form-input">
        </div>

        <!-- About Me -->
        <div class="form-group">
          <label>About Me</label>
          <textarea id="editBio" class="form-input" rows="4"></textarea>
        </div>

        <!-- Favorite Quote -->
        <div class="form-group">
          <label>Favorite Quote</label>
          <input type="text" id="editQuote" class="form-input">
        </div>

      </form>
    </div>

    <div class="modal-footer">
      <button class="btn-secondary" onclick="closeEditProfileModal()">Cancel</button>
      <button class="btn-primary" onclick="saveStudentProfile()">Save Changes</button>
    </div>

  </div>
</div>
```

**Form Field IDs**:
- `#editFirstName` - First name
- `#editFatherName` - Father name
- `#editGrandFatherName` - Grand father name
- `#editUsername` - Username
- `#editGender` - Gender select
- `#editEmail` - Email
- `#editPhone` - Phone number
- `#editGradeLevel` - Grade level
- `#editSubjects` - Subjects (comma-separated)
- `#editLanguages` - Preferred languages
- `#editLocation` - Location
- `#editBio` - About me textarea
- `#editQuote` - Favorite quote

### 11.2 Cover Upload Modal

**Structure** (Lines 2358-2407):
```html
<div class="upload-cover-modal" id="coverUploadModal" style="display: none;">
  <div class="modal-content">
    <div class="modal-inner">

      <div class="modal-header">
        <h2 class="modal-title">Upload Cover Photo</h2>
        <button class="modal-close" onclick="closeCoverUploadModal()">&times;</button>
      </div>

      <div class="upload-area" id="coverUploadArea" onclick="document.getElementById('coverInput').click()">
        <span class="upload-icon">📷</span>
        <p class="upload-text">Click to upload or drag and drop</p>
        <p class="upload-hint">Recommended: 1200x300px (PNG, JPG up to 5MB)</p>
      </div>

      <input type="file" id="coverInput" class="upload-input" accept="image/*">

      <div id="coverPreviewContainer" class="preview-container" style="display: none;">
        <img id="coverPreview" class="preview-image">
        <div class="preview-info">
          <div class="file-info">
            <span>File Name:</span>
            <span id="coverFileName">-</span>
          </div>
          <div class="file-info">
            <span>File Size:</span>
            <span id="coverFileSize">-</span>
          </div>
        </div>
      </div>

      <div id="coverUploadProgress" class="upload-progress" style="display: none;">
        <div class="progress-bar">
          <div class="progress-fill" id="coverProgressFill" style="width: 0%"></div>
        </div>
        <p class="progress-text" id="coverProgressText">Uploading... 0%</p>
      </div>

      <div class="upload-actions">
        <button class="btn-upload secondary" onclick="resetUpload('cover')">Change Image</button>
        <button class="btn-upload primary" onclick="uploadImage('cover')">Upload Cover</button>
      </div>

    </div>
  </div>
</div>
```

### 11.3 Profile Upload Modal

**Structure** (Lines 2410-2459):
```html
<div class="upload-profile-modal" id="profileUploadModal" style="display: none;">
  <div class="modal-content">
    <div class="modal-inner">

      <div class="modal-header">
        <h2 class="modal-title">Upload Profile Picture</h2>
        <button class="modal-close" onclick="closeProfileUploadModal()">&times;</button>
      </div>

      <div class="upload-area" id="profileUploadArea" onclick="document.getElementById('profileInput').click()">
        <span class="upload-icon">👤</span>
        <p class="upload-text">Click to upload or drag and drop</p>
        <p class="upload-hint">Recommended: 400x400px (PNG, JPG up to 5MB)</p>
      </div>

      <input type="file" id="profileInput" class="upload-input" accept="image/*">

      <div id="profilePreviewContainer" class="preview-container" style="display: none;">
        <img id="profilePreview" class="preview-image">
        <div class="preview-info">
          <div class="file-info">
            <span>File Name:</span>
            <span id="profileFileName">-</span>
          </div>
          <div class="file-info">
            <span>File Size:</span>
            <span id="profileFileSize">-</span>
          </div>
        </div>
      </div>

      <div id="profileUploadProgress" class="upload-progress" style="display: none;">
        <div class="progress-bar">
          <div class="progress-fill" id="profileProgressFill" style="width: 0%"></div>
        </div>
        <p class="progress-text" id="profileProgressText">Uploading... 0%</p>
      </div>

      <div class="upload-actions">
        <button class="btn-upload secondary" onclick="resetUpload('profile')">Change Image</button>
        <button class="btn-upload primary" onclick="uploadImage('profile')">Upload Profile</button>
      </div>

    </div>
  </div>
</div>
```

---

## 12. Footer

**Structure** (Lines 3029-3176):
```html
<footer class="footer-section" id="footer" role="contentinfo">

  <!-- Animated Wave SVG -->
  <div class="footer-wave" aria-hidden="true">
    <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
      <defs>
        <linearGradient id="wave-gradient">...</linearGradient>
      </defs>
      <path class="wave-fill" d="..."></path>
      <path class="wave-line" d="..."></path>
    </svg>
  </div>

  <div class="container">
    <div class="footer-content">

      <!-- Section 1: About Astegni -->
      <div class="footer-section-item">
        <h3 class="footer-title">About Astegni</h3>
        <p class="footer-description">Ethiopia's premier educational platform...</p>
        <div class="footer-stats">
          <div class="stat-item">
            <span class="stat-number">10k+</span>
            <span class="stat-label">Active Users</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">500+</span>
            <span class="stat-label">Courses</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">95%</span>
            <span class="stat-label">Success Rate</span>
          </div>
        </div>
      </div>

      <!-- Section 2: Quick Links -->
      <div class="footer-section-item">
        <h3 class="footer-title">Quick Links</h3>
        <ul class="footer-links">
          <li><a href="#" class="footer-link">About Us</a></li>
          <li><a href="#" class="footer-link">How It Works</a></li>
          <li><a href="#" class="footer-link">Pricing</a></li>
          <li><a href="#" class="footer-link">Success Stories</a></li>
          <li><a href="#" class="footer-link">Blog</a></li>
          <li><a href="#" class="footer-link">Careers</a></li>
        </ul>
      </div>

      <!-- Section 3: Support -->
      <div class="footer-section-item">
        <h3 class="footer-title">Support</h3>
        <ul class="footer-links">
          <li><a href="#" class="footer-link">Help Center</a></li>
          <li><a href="#" class="footer-link">Contact Us</a></li>
          <li><a href="#" class="footer-link">FAQs</a></li>
          <li><a href="#" class="footer-link">Terms of Service</a></li>
          <li><a href="#" class="footer-link">Privacy Policy</a></li>
          <li><a href="#" class="footer-link">Safety</a></li>
        </ul>
      </div>

      <!-- Section 4: Connect With Us -->
      <div class="footer-section-item">
        <h3 class="footer-title">Connect With Us</h3>
        <div class="social-links">
          <a href="#" class="social-link">Facebook</a>
          <a href="#" class="social-link">Twitter</a>
          <a href="#" class="social-link">LinkedIn</a>
          <a href="#" class="social-link">Instagram</a>
          <a href="https://www.youtube.com/@Astegni" class="social-link">YouTube</a>
        </div>

        <div class="newsletter-signup">
          <h4>Subscribe to Newsletter</h4>
          <form class="newsletter-form" id="newsletterForm">
            <input type="email" class="newsletter-input" id="emailInput" required>
            <button type="submit" class="newsletter-btn">Subscribe</button>
            <div class="newsletter-feedback" id="feedback"></div>
          </form>
        </div>
      </div>

    </div>

    <!-- Footer Bottom Content -->
    <div class="footer-bottom-content">
      <div class="footer-badges">
        <span>From the deep of™ Eshtaol</span>
        <a href="tel:+251935244245">
          <span>📞 +251-935-24-42-45</span>
          <span>+251-997-40-98-66</span>
        </a>
      </div>
      <div class="footer-badges">
        <p class="copyright">© 2025 Astegni. All rights reserved.</p>
      </div>
      <div class="footer-badges">
        <span class="badge glow">🔒 SSL Secured</span>
        <span class="badge">✓ Verified Platform</span>
        <span class="badge">🏆 Future Awards Winner</span>
      </div>
    </div>

  </div>
</footer>
```

---

## 13. JavaScript Imports

**Structure** (Lines 3180-3252):

### Core Page Structure Scripts
```html
<!-- Core Page Structure Scripts -->
<script src="../js/page-structure/loadingManager.js"></script>
<script src="../js/admin-pages/shared/sidebar-fix.js"></script>
<script src="../js/page-structure/adManager.js"></script>
<script src="../js/page-structure/footerManager.js"></script>
<script src="../js/page-structure/settingsManager.js"></script>
<script src="../js/page-structure/badgeManager.js"></script>
<script src="../js/page-structure/notificationManager.js"></script>
<script src="../js/page-structure/videoPlayerManager.js"></script>
<script src="../js/page-structure/bottomWidgetManager.js"></script>
<script src="../js/page-structure/rightSidebarManager.js"></script>
<script src="../js/page-structure/leftSidebarManager.js"></script>
<script src="../js/page-structure/profileDropdownManager.js"></script>
<script src="../js/page-structure/comingSoonManager.js"></script>
<script src="../js/page-structure/editProfileManager.js"></script>
<script src="../js/page-structure/followerModalManager.js"></script>
<script src="../js/page-structure/shareModalManager.js"></script>
<script src="../js/page-structure/initializationManager.js"></script>
```

### Profile System
```html
<script src="../js/root/profile-system.js?v=20251003"></script>
```

### Common Modals
```html
<script src="../js/common-modals/coming-soon-modal.js"></script>
<script src="../js/common-modals/ad-modal.js"></script>
```

### Stats Counter
```html
<script src="../js/find-tutors/stats-counter.js"></script>
```

### Student Profile Modules (Load Order Important!)
```html
<!-- 1. State Management (Must load first) -->
<script src="../js/student-profile/state-manager.js"></script>

<!-- 1.5 Resource Manager -->
<script src="../js/student-profile/resource-manager.js"></script>

<!-- 2. API Service -->
<script src="../js/student-profile/api-service.js"></script>

<!-- 3. UI Manager -->
<script src="../js/student-profile/ui-manager.js"></script>

<!-- 4. Modal Manager -->
<script src="../js/student-profile/modal-manager.js"></script>

<!-- 5. Upload Handler -->
<script src="../js/student-profile/upload-handler.js"></script>

<!-- 6. Main Controller -->
<script src="../js/student-profile/profile-controller.js"></script>

<!-- 7. Global Functions (for HTML onclick handlers) -->
<script src="../js/student-profile/global-functions.js"></script>

<!-- 8. Additional Features -->
<script src="../js/student-profile/weather-manager.js"></script>

<!-- 9. Backend Integration Modules -->
<script src="../js/student-profile/profile-data-loader.js"></script>
<script src="../js/student-profile/image-upload-handler.js"></script>
<script src="../js/student-profile/profile-edit-handler.js"></script>
<script src="../js/student-profile/upload-modal-handler.js"></script>

<!-- 10. Shared Utilities -->
<script src="../js/admin-pages/shared/sidebar-fix.js"></script>

<!-- 11. Initialize (MUST BE LAST) -->
<script src="../js/student-profile/init.js"></script>
```

**Total JavaScript Files**: 38 files

---

## 14. Floating Action Button (FAB)

**Structure** (Lines 3254-3360):
```html
<div class="fab-container" style="position: fixed; bottom: 2rem; right: 2rem; z-index: 1000;">

  <!-- Main FAB Button -->
  <button class="fab-main" id="fabMain" onclick="toggleFabMenu()">
    <span id="fabIcon">⚡</span>
  </button>

  <!-- FAB Menu Items -->
  <div class="fab-menu" id="fabMenu" style="display: none;">

    <!-- Resources -->
    <div class="fab-item" onclick="navigateToContent('learning-resources')">
      <span>Resources</span>
      <div>📖</div>
    </div>

    <!-- Schedule -->
    <div class="fab-item" onclick="navigateToContent('schedule')">
      <span>Schedule</span>
      <div>📅</div>
    </div>

    <!-- Tutors -->
    <div class="fab-item" onclick="navigateToContent('my-tutors')">
      <span>Tutors</span>
      <div>👨‍🏫</div>
    </div>

    <!-- Courses -->
    <div class="fab-item" onclick="navigateToContent('my-courses')">
      <span>Courses</span>
      <div>📚</div>
    </div>

  </div>
</div>

<!-- FAB Styles -->
<style>
  @keyframes fadeInUp { ... }
  .fab-main:hover { ... }
  .fab-main:active { ... }
  .fab-item:hover { ... }
  .fab-item div:hover { ... }
</style>

<!-- FAB JavaScript -->
<script>
  let fabOpen = false;

  function toggleFabMenu() {
    const fabMenu = document.getElementById('fabMenu');
    const fabIcon = document.getElementById('fabIcon');
    const fabMain = document.getElementById('fabMain');

    fabOpen = !fabOpen;

    if (fabOpen) {
      fabMenu.style.display = 'flex';
      fabIcon.textContent = '✕';
      fabMain.style.transform = 'rotate(180deg)';
    } else {
      fabMenu.style.display = 'none';
      fabIcon.textContent = '⚡';
      fabMain.style.transform = 'rotate(0deg)';
    }
  }

  // Close FAB menu when clicking outside
  document.addEventListener('click', function(event) {
    const fabContainer = document.querySelector('.fab-container');
    if (fabOpen && !fabContainer.contains(event.target)) {
      toggleFabMenu();
    }
  });
</script>
```

**FAB Menu Items**:
1. Resources (📖)
2. Schedule (📅)
3. Tutors (👨‍🏫)
4. Courses (📚)

---

## Summary: Key Interactive Elements

### Buttons and onclick Handlers

**Navigation**:
- `handleNavLinkClick(event, 'news')` - News link
- `handleNavLinkClick(event, 'store')` - Bookstore link
- `handleNavLinkClick(event, 'find-jobs')` - Find a Job link

**Sidebar Panel Switching**:
- `switchPanel('dashboard')` - Dashboard panel
- `switchPanel('ai-insights')` - AI Insights panel
- `switchPanel('my-tutors')` - My Tutors panel
- `switchPanel('my-courses')` - My Courses panel
- `switchPanel('schedule')` - Schedule panel
- ... (15 panels total)

**Profile Actions**:
- `openEditProfileModal()` - Edit profile
- `shareProfile()` - Share profile
- `openCoverUploadModal()` - Upload cover photo
- `openProfileUploadModal()` - Upload profile picture

**Upload Modals**:
- `closeCoverUploadModal()` - Close cover upload modal
- `closeProfileUploadModal()` - Close profile upload modal
- `resetUpload('cover')` - Reset cover upload
- `resetUpload('profile')` - Reset profile upload
- `uploadImage('cover')` - Upload cover image
- `uploadImage('profile')` - Upload profile image

**Edit Modal**:
- `closeEditProfileModal()` - Close edit modal
- `saveStudentProfile()` - Save profile changes

**Coming Soon Modal**:
- `openComingSoonModal('feature-name')` - Open coming soon modal for various features

**FAB Navigation**:
- `toggleFabMenu()` - Toggle FAB menu
- `navigateToContent('panel-name')` - Navigate to panel

**Ad Modal**:
- `openAdAnalyticsModal()` - Open advertisement modal

### Forms and Inputs

**Edit Profile Form** (`#editStudentProfileForm`):
- 13 input fields
- 1 select dropdown (gender)
- 1 textarea (bio)
- All fields support dynamic population and validation

**Upload Forms**:
- Cover image upload with preview and progress
- Profile image upload with preview and progress
- Drag-and-drop support

**Newsletter Form** (`#newsletterForm`):
- Email subscription with feedback

### Theme and Settings

- Theme toggle button (`#theme-toggle-btn`)
- Data attribute: `data-theme="light"` on `<html>` element

---

## Creating user-profile.html: Checklist

To create `user-profile.html` with the EXACT same structure as `student-profile.html`, follow this checklist:

### 1. Copy Head Section
- [ ] Copy DOCTYPE and html tag with `data-theme="light"`
- [ ] Copy all meta tags
- [ ] Copy all external CSS/JS CDN links
- [ ] Copy all custom CSS imports (in same order)
- [ ] Copy entire inline `<style>` block (lines 25-968)

### 2. Copy Body Structure
- [ ] Copy navigation bar (adjust logo text from "Student" to "User")
- [ ] Copy advertisement section
- [ ] Copy sidebar (adjust title from "Student Dashboard" to "User Dashboard")
- [ ] Copy main content wrapper with hero section

### 3. Copy Profile Header Section
- [ ] Copy entire profile header section (lines 1209-1434)
- [ ] Adjust ID names from `student-*` to `user-*`
- [ ] Keep all badge types and rating tooltip structure
- [ ] Keep all optional field containers

### 4. Copy Panel System
- [ ] Copy all 15 panel containers
- [ ] Keep panel switching onclick handlers
- [ ] Adjust panel content for "User" context where needed
- [ ] Keep dashboard panel as default active panel

### 5. Copy Right Sidebar Widgets
- [ ] Copy all 4 widgets (Study Tips, Weather, News, Market)
- [ ] Keep all animations and carousel logic

### 6. Copy Bottom Widgets
- [ ] Copy bottom widgets section with weather widget

### 7. Copy Modals
- [ ] Copy edit profile modal (adjust form field IDs from `editStudent*` to `editUser*`)
- [ ] Copy cover upload modal
- [ ] Copy profile upload modal

### 8. Copy Footer
- [ ] Copy entire footer section with wave animation

### 9. Copy JavaScript Imports
- [ ] Copy all page structure scripts
- [ ] Replace `student-profile` folder with `user-profile` folder in script paths
- [ ] Keep initialization order (init.js must be last)

### 10. Copy FAB
- [ ] Copy floating action button section
- [ ] Copy FAB styles and scripts

### 11. Search and Replace
- [ ] Replace "Student" → "User" in titles and labels
- [ ] Replace `student-` → `user-` in IDs and variable names
- [ ] Replace `/js/student-profile/` → `/js/user-profile/` in script paths
- [ ] Adjust role-specific content (e.g., "Honor Roll Student" → appropriate user badge)

### 12. Verify Structure
- [ ] Check all modal IDs are unique
- [ ] Verify all onclick handlers are defined
- [ ] Ensure all CSS classes match the imported stylesheets
- [ ] Test panel switching functionality
- [ ] Test modal open/close functionality

---

## File Dependencies

**Required Directories**:
- `js/user-profile/` - Must be created with same module structure as `js/student-profile/`
- `css/` - All existing CSS files are shared

**Required JavaScript Modules** (to be created in `js/user-profile/`):
1. `state-manager.js`
2. `resource-manager.js`
3. `api-service.js`
4. `ui-manager.js`
5. `modal-manager.js`
6. `upload-handler.js`
7. `profile-controller.js`
8. `global-functions.js`
9. `weather-manager.js`
10. `profile-data-loader.js`
11. `image-upload-handler.js`
12. `profile-edit-handler.js`
13. `upload-modal-handler.js`
14. `init.js`

---

## End of Blueprint

This blueprint provides a complete structural reference for creating `user-profile.html` with the EXACT same architecture as `student-profile.html`. All section numbers, line references, and structural details are documented for precision replication.
