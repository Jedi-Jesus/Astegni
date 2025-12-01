# Student Profile Quick Reference Card

**Fast Lookup for IDs, Classes, and Functions**

---

## CRITICAL IDS (Dynamic Content)

### Profile Header Elements
| ID | Purpose | Type |
|---|---|---|
| `#cover-img` | Cover photo image | `<img>` |
| `#profile-avatar` | Profile picture image | `<img>` |
| `#studentName` | Student's full name | `<h1>` |
| `#student-rating` | Rating value (e.g., "4.5") | `<span>` |
| `#rating-stars` | Star display | `<div>` |
| `#rating-count` | Review count | `<span>` |
| `#rating-tooltip` | Hover rating breakdown | `<div>` |
| `#student-location` | Location text | `<span>` |
| `#student-school` | School name (optional) | `<span>` |
| `#student-gender` | Gender (optional) | `<span>` |
| `#student-subjects` | Subject list (optional) | `<span>` |
| `#student-email` | Email (optional) | `<span>` |
| `#student-phone` | Phone (optional) | `<span>` |
| `#student-grade` | Grade level | `<span>` |
| `#student-joined` | Join date | `<span>` |
| `#student-bio` | Biography paragraph | `<p>` |
| `#student-quote` | Motivational quote | `<span>` |
| `#connections-count` | Total connections | `<div>` |
| `#classmates-count` | Classmate count | `<div>` |
| `#tutors-count` | Tutor count | `<div>` |

### Statistics Elements
| ID | Purpose | Type |
|---|---|---|
| `#stat-total-courses` | Total courses stat | `<p>` |
| `#stat-active-courses` | Active courses stat | `<p>` |
| `#stat-completion-rate` | Completion rate % | `<p>` |
| `#stat-tutors` | Tutor count stat | `<p>` |
| `#stat-tutors-list` | Tutor names list | `<span>` |
| `#stat-assignments` | Assignments completed | `<p>` |
| `#stat-avg-performance` | Average performance | `<p>` |
| `#stat-assessment-count` | Assessment count | `<span>` |
| `#stat-study-hours` | Study hours | `<span>` |
| `#stat-gpa` | GPA value | `<span>` |

### Modal Elements
| ID | Purpose | Type |
|---|---|---|
| `#edit-profile-modal` | Edit profile modal container | `<div>` |
| `#editStudentProfileForm` | Edit form | `<form>` |
| `#editFirstName` | First name input | `<input>` |
| `#editFatherName` | Father name input | `<input>` |
| `#editGrandFatherName` | Grandfather name input | `<input>` |
| `#editUsername` | Username input | `<input>` |
| `#editGender` | Gender select | `<select>` |
| `#editEmail` | Email input | `<input>` |
| `#editPhone` | Phone input | `<input>` |
| `#editGradeLevel` | Grade level input | `<input>` |
| `#editSubjects` | Subjects input | `<input>` |
| `#editLanguages` | Languages input | `<input>` |
| `#editLocation` | Location input | `<input>` |
| `#editBio` | Bio textarea | `<textarea>` |
| `#editQuote` | Quote input | `<input>` |

### Upload Modal Elements
| ID | Purpose | Type |
|---|---|---|
| `#coverUploadModal` | Cover upload modal | `<div>` |
| `#coverInput` | Cover file input | `<input>` |
| `#coverPreviewContainer` | Preview container | `<div>` |
| `#coverPreview` | Preview image | `<img>` |
| `#coverFileName` | File name display | `<span>` |
| `#coverFileSize` | File size display | `<span>` |
| `#coverUploadProgress` | Progress container | `<div>` |
| `#coverProgressFill` | Progress bar fill | `<div>` |
| `#coverProgressText` | Progress text | `<p>` |
| `#profileUploadModal` | Profile upload modal | `<div>` |
| `#profileInput` | Profile file input | `<input>` |
| `#profilePreviewContainer` | Preview container | `<div>` |
| `#profilePreview` | Preview image | `<img>` |
| `#profileFileName` | File name display | `<span>` |
| `#profileFileSize` | File size display | `<span>` |
| `#profileUploadProgress` | Progress container | `<div>` |
| `#profileProgressFill` | Progress bar fill | `<div>` |
| `#profileProgressText` | Progress text | `<p>` |

### Panel Elements
| ID | Purpose | Type |
|---|---|---|
| `#dashboard-panel` | Dashboard panel | `<div>` |
| `#ai-insights-panel` | AI insights panel | `<div>` |
| `#my-courses-panel` | Courses panel | `<div>` |
| `#my-tutors-panel` | Tutors panel | `<div>` |
| `#schedule-panel` | Schedule panel | `<div>` |
| `#learning-tools-panel` | Tools panel | `<div>` |
| `#learning-resources-panel` | Resources panel | `<div>` |
| `#blog-panel` | Blog panel | `<div>` |
| `#grades-panel` | Grades panel | `<div>` |
| `#my-requests-panel` | Requests panel | `<div>` |
| `#parent-portal-panel` | Parent portal panel | `<div>` |
| `#ratings-and-reviews-panel` | Ratings panel | `<div>` |
| `#become-tutor-panel` | Become tutor panel | `<div>` |
| `#purchase-panel` | Purchase panel | `<div>` |
| `#settings-panel` | Settings panel | `<div>` |

### Other Important IDs
| ID | Purpose | Type |
|---|---|---|
| `#sidebar` | Left sidebar | `<aside>` |
| `#hamburger` | Sidebar toggle button | `<button>` |
| `#theme-toggle-btn` | Theme toggle button | `<button>` |
| `#fabMain` | FAB main button | `<button>` |
| `#fabMenu` | FAB menu container | `<div>` |
| `#fabIcon` | FAB icon | `<span>` |
| `#footer` | Footer section | `<footer>` |
| `#newsletterForm` | Newsletter form | `<form>` |
| `#emailInput` | Newsletter email | `<input>` |
| `#newsCardContainer` | News carousel | `<div>` |

---

## CRITICAL CLASSES

### Layout Classes
| Class | Purpose |
|---|---|
| `.navbar` | Navigation bar |
| `.nav-container` | Nav inner container |
| `.nav-brand` | Logo section |
| `.nav-menu` | Nav links |
| `.nav-actions` | Right-side actions |
| `.sidebar-container` | Sidebar wrapper |
| `.sidebar-content` | Sidebar inner |
| `.sidebar-nav` | Sidebar navigation |
| `.sidebar-link` | Sidebar link |
| `.sidebar-right` | Right sidebar widgets |
| `.panels-container` | Panel container |
| `.panel-content` | Individual panel |
| `.panel-header` | Panel header |
| `.container` | Max-width container |

### Profile Header Classes
| Class | Purpose |
|---|---|
| `.profile-header-section` | Main profile container |
| `.cover-image-container` | Cover photo wrapper |
| `.cover-img` | Cover image |
| `.cover-overlay` | Cover gradient overlay |
| `.cover-upload-btn` | Cover upload button |
| `.profile-main-info` | Profile info wrapper |
| `.profile-info-wrapper` | Info flex container |
| `.profile-avatar-container` | Avatar wrapper |
| `.profile-avatar` | Avatar image |
| `.online-indicator` | Green online dot |
| `.avatar-upload-btn` | Avatar upload button |
| `.profile-details-section` | Details container |
| `.profile-name-row` | Name section |
| `.profile-name` | Name heading |
| `.badges-row` | Badge container |
| `.profile-badge` | Badge element |
| `.rating-section` | Rating container |
| `.rating-wrapper` | Rating hover area |
| `.rating-value` | Rating number |
| `.rating-stars` | Star display |
| `.rating-count` | Review count |
| `.rating-tooltip` | Hover tooltip |
| `.profile-location` | Location row |
| `.profile-info-grid` | Info grid |
| `.info-item` | Info row |
| `.info-label` | Info label |
| `.info-value` | Info value |
| `.profile-quote` | Quote section |
| `.profile-connections` | Connections section |
| `.connections-stats` | Stats grid |
| `.stat-box` | Stat card |
| `.profile-actions` | Action buttons |

### Widget Classes
| Class | Purpose |
|---|---|
| `.sidebar-widget` | Widget container |
| `.study-tips-widget` | Study tips widget |
| `.activity-ticker-container` | Ticker wrapper |
| `.activity-ticker` | Ticker content |
| `.activity-item` | Ticker item |
| `.weather-widget` | Weather widget |
| `.news-widget` | News widget |
| `.news-carousel` | News carousel |
| `.news-card` | News card |
| `.market-widget` | Market widget |
| `.bottom-widgets` | Bottom section |
| `.bottom-widget` | Bottom widget |

### Modal Classes
| Class | Purpose |
|---|---|
| `.modal` | Modal wrapper |
| `.modal-overlay` | Dark backdrop |
| `.modal-content` | Modal box |
| `.modal-header` | Modal header |
| `.modal-body` | Modal body |
| `.modal-footer` | Modal footer |
| `.modal-close` | Close button |
| `.modal-title` | Modal title |
| `.enhanced-modal` | Enhanced styling |
| `.upload-cover-modal` | Cover upload modal |
| `.upload-profile-modal` | Profile upload modal |
| `.upload-area` | Drop zone |
| `.upload-icon` | Upload icon |
| `.upload-text` | Upload text |
| `.upload-hint` | Upload hint |
| `.upload-input` | File input |
| `.preview-container` | Preview wrapper |
| `.preview-image` | Preview img |
| `.preview-info` | File info |
| `.upload-progress` | Progress wrapper |
| `.progress-bar` | Progress track |
| `.progress-fill` | Progress fill |
| `.progress-text` | Progress text |
| `.upload-actions` | Upload buttons |

### Form Classes
| Class | Purpose |
|---|---|
| `.form-row` | Two-column row |
| `.form-group` | Form field group |
| `.form-input` | Input/textarea |
| `.form-select` | Select dropdown |
| `.form-hint` | Hint text |

### Button Classes
| Class | Purpose |
|---|---|
| `.btn-primary` | Primary button |
| `.btn-secondary` | Secondary button |
| `.btn-upload` | Upload button |
| `.icon-btn` | Icon button |
| `.cta-button` | CTA button |
| `.filter-chip` | Filter chip |
| `.fab-main` | FAB main button |
| `.fab-item` | FAB menu item |

### Card Classes
| Class | Purpose |
|---|---|
| `.card` | Card container |
| `.dashboard-grid` | Stats grid |
| `.hero-section` | Hero section |
| `.hero-title` | Hero title |
| `.hero-subtitle` | Hero subtitle |
| `.hero-stats` | Hero stats |
| `.stat-item` | Stat item |
| `.stat-number` | Stat number |
| `.stat-label` | Stat label |

### Utility Classes
| Class | Purpose |
|---|---|
| `.hidden` | Display none |
| `.active` | Active state |
| `.animate__animated` | Animate.css |
| `.animate__fadeIn` | Fade in |
| `.animate__fadeInUp` | Fade in up |
| `.badge-new` | "New" badge |
| `.badge-count` | Count badge |

---

## GLOBAL JAVASCRIPT FUNCTIONS

### Navigation & Panels
| Function | Parameters | Purpose |
|---|---|---|
| `switchPanel()` | `panelName` | Switch active panel |
| `handleNavLinkClick()` | `event, feature` | Nav link handler |

### Profile Management
| Function | Parameters | Purpose |
|---|---|---|
| `openEditProfileModal()` | - | Open edit modal |
| `closeEditProfileModal()` | - | Close edit modal |
| `saveStudentProfile()` | - | Save profile changes |
| `shareProfile()` | - | Share profile |

### Upload Management
| Function | Parameters | Purpose |
|---|---|---|
| `openCoverUploadModal()` | - | Open cover upload |
| `closeCoverUploadModal()` | - | Close cover upload |
| `openProfileUploadModal()` | - | Open profile upload |
| `closeProfileUploadModal()` | - | Close profile upload |
| `uploadImage()` | `type` | Upload image |
| `resetUpload()` | `type` | Reset upload |

### Modal Management
| Function | Parameters | Purpose |
|---|---|---|
| `openComingSoonModal()` | `feature` | Coming soon modal |
| `openAdAnalyticsModal()` | - | Ad analytics modal |
| `openCommunityModal()` | - | Community modal |

### FAB Functions
| Function | Parameters | Purpose |
|---|---|---|
| `toggleFabMenu()` | - | Toggle FAB menu |
| `navigateToContent()` | `panelName` | Navigate to panel |

### Resource Management
| Function | Parameters | Purpose |
|---|---|---|
| `openUploadResourceModal()` | - | Upload resource |
| `createFolder()` | - | Create folder |
| `filterResources()` | `type` | Filter resources |
| `viewResource()` | `id` | View resource |
| `downloadResource()` | `id` | Download resource |
| `toggleResourceMenu()` | `id` | Toggle menu |

### Learning Tools
| Function | Parameters | Purpose |
|---|---|---|
| `openLabSimulator()` | - | Lab simulator |
| `openDigitalWhiteboard()` | - | Digital whiteboard |

---

## CSS CUSTOM PROPERTIES (Variables)

### Theme Colors (from `css/root/theme.css`)
```css
--card-bg          /* Card background */
--text-primary     /* Primary text */
--text-secondary   /* Secondary text */
--text-muted       /* Muted text */
--heading          /* Heading color */
--button-bg        /* Button background */
--button-bg-rgb    /* Button RGB values */
--button-hover     /* Button hover */
--border           /* Border color */
--border-rgb       /* Border RGB values */
--highlight-bg     /* Highlight background */
--footer-accent    /* Footer accent */
--footer-hover     /* Footer hover */
```

### Spacing & Sizing
```css
--radius-sm        /* Small radius */
--radius-md        /* Medium radius */
--radius-lg        /* Large radius */
--transition-base  /* Base transition */
```

---

## ANIMATION KEYFRAMES

| Keyframe | Purpose | Duration |
|---|---|---|
| `tickerRoll` | Study tips vertical scroll | 18s |
| `pulse-indicator` | Online indicator pulse | 2s |
| `fadeInUp` | FAB items appear | 0.3s |
| `cursor-blink` | Hero cursor blink | 1s |

---

## ONCLICK HANDLER SUMMARY

### All onclick Attributes in HTML
```javascript
// Navigation
onclick="handleNavLinkClick(event, 'news')"
onclick="handleNavLinkClick(event, 'store')"
onclick="handleNavLinkClick(event, 'find-jobs')"

// Sidebar Panel Switching (15 instances)
onclick="switchPanel('dashboard'); return false;"
onclick="switchPanel('ai-insights'); return false;"
onclick="switchPanel('my-tutors'); return false;"
// ... etc for all 15 panels

// Profile Actions
onclick="openEditProfileModal()"
onclick="shareProfile()"
onclick="openCoverUploadModal()"
onclick="openProfileUploadModal()"

// Upload Modals
onclick="closeCoverUploadModal()"
onclick="closeProfileUploadModal()"
onclick="resetUpload('cover')"
onclick="resetUpload('profile')"
onclick="uploadImage('cover')"
onclick="uploadImage('profile')"
onclick="document.getElementById('coverInput').click()"
onclick="document.getElementById('profileInput').click()"

// Edit Modal
onclick="closeEditProfileModal()"
onclick="saveStudentProfile()"

// Coming Soon Modals
onclick="openComingSoonModal('feature-name')"

// FAB
onclick="toggleFabMenu()"
onclick="navigateToContent('panel-name')"

// Ads
onclick="openAdAnalyticsModal()"

// Other
onclick="openCommunityModal()"
onclick="openUploadResourceModal()"
onclick="createFolder()"
onclick="filterResources('type')"
onclick="viewResource(id)"
onclick="downloadResource(id)"
onclick="toggleResourceMenu(id)"
onclick="openLabSimulator()"
onclick="openDigitalWhiteboard()"
```

---

## RESPONSIVE BREAKPOINTS

| Breakpoint | Media Query | Changes |
|---|---|---|
| Mobile | `max-width: 768px` | Stack columns, center text, full-width buttons |
| Tablet | `768px - 1024px` | 2-column grids, adjusted spacing |
| Desktop | `> 1024px` | Full 3-column layout, side-by-side widgets |

### Mobile Specific Changes
- Profile avatar: 140px → 120px
- Profile name: 2.25rem → 1.75rem
- Profile info: Centered alignment
- Connections stats: Single column
- Actions: Full width buttons
- Right sidebar: Stacks below main content

---

## FILE STRUCTURE REFERENCE

### Required Files (38 JavaScript files)
```
js/
├── page-structure/
│   ├── loadingManager.js
│   ├── adManager.js
│   ├── footerManager.js
│   ├── settingsManager.js
│   ├── badgeManager.js
│   ├── notificationManager.js
│   ├── videoPlayerManager.js
│   ├── bottomWidgetManager.js
│   ├── rightSidebarManager.js
│   ├── leftSidebarManager.js
│   ├── profileDropdownManager.js
│   ├── comingSoonManager.js
│   ├── editProfileManager.js
│   ├── followerModalManager.js
│   ├── shareModalManager.js
│   └── initializationManager.js
├── root/
│   └── profile-system.js
├── common-modals/
│   ├── coming-soon-modal.js
│   └── ad-modal.js
├── find-tutors/
│   └── stats-counter.js
├── admin-pages/shared/
│   └── sidebar-fix.js
└── student-profile/
    ├── state-manager.js
    ├── resource-manager.js
    ├── api-service.js
    ├── ui-manager.js
    ├── modal-manager.js
    ├── upload-handler.js
    ├── profile-controller.js
    ├── global-functions.js
    ├── weather-manager.js
    ├── profile-data-loader.js
    ├── image-upload-handler.js
    ├── profile-edit-handler.js
    ├── upload-modal-handler.js
    └── init.js (MUST BE LAST)
```

---

## SEARCH & REPLACE GUIDE

### Converting to user-profile.html

**Step 1: Text Replacements**
```
"Student" → "User"
"student-" → "user-"
"studentName" → "userName"
"Student Dashboard" → "User Dashboard"
"Honor Roll Student" → "Verified User" (or appropriate badge)
```

**Step 2: File Path Replacements**
```
"/js/student-profile/" → "/js/user-profile/"
"student-profile.html" → "user-profile.html"
```

**Step 3: Function Name Replacements**
```
"saveStudentProfile" → "saveUserProfile"
"editStudentProfileForm" → "editUserProfileForm"
```

**Step 4: Variable Replacements (in JavaScript)**
```
All student-specific variables to user-specific equivalents
```

---

## TESTING CHECKLIST

### Visual Tests
- [ ] Cover photo displays correctly
- [ ] Avatar displays correctly
- [ ] Online indicator pulses
- [ ] Rating tooltip appears on hover
- [ ] All badges render correctly
- [ ] Theme toggle works (light/dark)
- [ ] Responsive layout on mobile

### Functionality Tests
- [ ] Panel switching works (all 15 panels)
- [ ] Edit profile modal opens/closes
- [ ] Form fields populate correctly
- [ ] Save profile updates UI
- [ ] Cover upload works
- [ ] Profile upload works
- [ ] Progress bars animate
- [ ] FAB menu toggles
- [ ] Study tips ticker scrolls
- [ ] News carousel rotates
- [ ] Theme persists on reload

### Interaction Tests
- [ ] All onclick handlers work
- [ ] Sidebar collapse/expand
- [ ] Modal close on overlay click
- [ ] Modal close on ESC key
- [ ] FAB closes when clicking outside
- [ ] Form validation works
- [ ] File upload accepts correct formats

---

## COMMON ISSUES & SOLUTIONS

| Issue | Solution |
|---|---|
| Rating tooltip not showing | Check z-index (99999) and overflow: visible on parents |
| Panel not switching | Verify panel ID matches switchPanel() parameter |
| Upload not working | Check file input accept attribute and onclick handler |
| Theme not applying | Verify `data-theme` attribute on `<html>` tag |
| FAB menu stuck open | Check click outside event listener is registered |
| Modal overlay not covering | Check z-index (10000) on modal wrapper |
| Sidebar not toggling | Verify hamburger button ID is "hamburger" |
| Stats not animating | Check IntersectionObserver is loaded |

---

## END OF QUICK REFERENCE

Use this alongside the full blueprint and visual diagram for rapid development reference.
