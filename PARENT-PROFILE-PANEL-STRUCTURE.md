# Parent Profile Panel Structure Guide

Complete analysis of the parent-profile.html panel system.

## All Panels with Line Numbers

| # | Panel ID | Start | End | Type | Purpose |
|---|----------|-------|-----|------|---------|
| 1 | dashboard-panel | 1335 | 1766 | Hero + Cards | Main dashboard |
| 2 | my-children-panel | 1767 | 1938 | Cards Grid | Children list |
| 3 | tutor-child-panel | 1939 | 1972 | Feature Cards | Teaching tools |
| 4 | progress-tracking-panel | 1973 | 2089 | Form + Charts | Progress monitoring |
| 5 | family-schedule-panel | 2092 | 2141 | Table/Calendar | Sessions & activities |
| 6 | parent-community-panel | 2142 | 2146 | Content | Community |
| 7 | parenting-blog-panel | 2147 | 2170 | Blog List | Articles |
| 8 | purchase-panel | 2171 | 2388 | Shop | Products |
| 9 | settings-panel | 2389 | 2396 | Form | Settings |
| 10 | my-requests-panel | 2397 | 2471 | Tabs + Cards | Requests |
| 11 | ratings-reviews-panel | 2472 | TBD | Filter + Cards | NEW PANEL |

## Example 1: my-children-panel Structure (Lines 1767-1938)

A CARD-GRID based panel:

<div id="my-children-panel" class="panel-content hidden">
    <div class="section-header">
        <h2 class="section-title">My Children</h2>
        <button class="btn-primary" onclick="openAddChildModal()">+ Add Child</button>
    </div>

    <div class="children-cards-grid">
        <div class="child-card">
            <div class="child-card-header">
                <img class="child-avatar">
                <div class="child-info">
                    <h3 class="child-name">Name</h3>
                    <p class="child-grade">Grade 10</p>
                </div>
            </div>
            <div class="child-stats">
                <!-- 4 stat items -->
            </div>
            <div class="child-progress-section">
                <!-- Progress bar -->
            </div>
            <div class="child-actions">
                <!-- Action buttons -->
            </div>
        </div>
    </div>
</div>

Key Features:
- class="panel-content hidden" on outer div
- Unique id attribute
- Section header with title and button
- Card grid with repeating items
- Each card: header, stats, progress, actions

## Example 2: progress-tracking-panel Structure (Lines 1973-2089)

A FORM + CONTENT based panel with TABS:

<div class="panel-content hidden" id="progress-tracking-panel">
    <div class="mb-8">
        <h1 class="text-3xl font-bold mb-2">Progress Tracking</h1>
        <p class="text-gray-600">Monitor progress and performance</p>
    </div>

    <!-- Search/Filter Input -->
    <div class="card p-4 mb-6">
        <label class="block text-sm font-semibold mb-2">Select Child</label>
        <input type="text" id="child-progress-search"
            class="w-full p-3 pl-12 border-2 rounded-lg"
            oninput="searchChildForProgress(this.value)">
        <div id="child-suggestions" class="mt-2 hidden">
            <!-- Dynamic suggestions -->
        </div>
    </div>

    <!-- Filter Tabs -->
    <div class="progress-filter-tabs mb-6"
        style="display: flex; gap: 1rem; border-bottom: 2px solid var(--border-color);">
        <button class="progress-filter-tab active" onclick="filterProgressBy('overview')">
            Overview
        </button>
        <button class="progress-filter-tab" onclick="filterProgressBy('subject')">
            By Subject
        </button>
        <button class="progress-filter-tab" onclick="filterProgressBy('time')">
            By Time
        </button>
    </div>

    <!-- Content Area with Multiple Sections -->
    <div id="progress-content-area">
        <!-- Default State -->
        <div id="no-child-selected" class="card p-12 text-center">
            <!-- Empty state -->
        </div>

        <!-- Main Content (Hidden) -->
        <div id="progress-report-display" class="hidden">
            <div id="overview-section" class="progress-section">
                <!-- Overview content -->
            </div>
            <div id="subject-section" class="progress-section hidden">
                <!-- Subject content -->
            </div>
            <div id="time-section" class="progress-section hidden">
                <!-- Time content -->
            </div>
        </div>
    </div>
</div>

Key Features:
- Hero title and description at top
- Search/filter input with dropdown
- Tab navigation buttons
- Multiple content sections (toggled with hidden class)
- Dynamic content loading

## WHERE TO INSERT NEW PANEL

Insertion Point: After line 2471, before line 2473

Current Code:
2471→                        </div>  <- Closing tag of my-requests-panel
2472→
2473→                        <!-- Other panels will be dynamically populated -->

INSERT HERE (replace line 2472):

<!-- Ratings & Reviews Panel -->
<div class="panel-content hidden" id="ratings-reviews-panel">
    <div class="mb-8">
        <h1 class="text-3xl font-bold mb-2">Tutor Ratings & Reviews</h1>
        <p class="text-gray-600">View and manage ratings and reviews of your children's tutors</p>
    </div>

    <!-- Filter Section -->
    <div class="card p-4 mb-6">
        <label class="block text-sm font-semibold mb-2 text-gray-700">Select Child</label>
        <select id="review-child-select"
            class="w-full p-3 border-2 rounded-lg focus:border-blue-500 focus:outline-none"
            onchange="loadTutorReviews(this.value)">
            <option value="">-- Choose a child --</option>
        </select>
    </div>

    <!-- Reviews Container -->
    <div id="tutor-reviews-container">
        <div class="text-center py-8 text-gray-500">
            <i class="fas fa-spinner fa-spin text-3xl mb-3"></i>
            <p>Loading tutor reviews...</p>
        </div>
    </div>
</div>

## Panel Switching (How it Works)

All panels have class="panel-content hidden" by default.
Dashboard-panel has class="panel-content active" (shown on load).

When sidebar button clicked, JavaScript:
1. Adds 'hidden' class to current panel
2. Removes 'hidden' class from new panel
3. Updates button styling

## Common CSS Classes

.panel-content - Main container
.hidden - Display: none (toggled by JS)
.active - Currently visible panel
.section-header - Title + button header
.section-title - Panel title
.card - Card container
.mb-8 - Margin bottom
.p-4, .p-6, .p-12 - Padding
.grid - CSS Grid
.gap-4, .gap-6 - Gap between items
.text-3xl - Font size
.font-bold - Font weight
.rounded-lg - Border radius
.border-2 - Border
.btn-primary - Primary button

## Implementation Checklist

- Insert panel HTML after line 2471
- Use class="panel-content hidden"
- Use unique id
- Add section header
- Add content container
- Create JavaScript functions for panel logic
- Create CSS file if needed
- Add sidebar button for panel
- Test panel toggle visibility
- Connect to API for data
- Implement dynamic rendering

