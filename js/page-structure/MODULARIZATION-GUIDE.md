# Page Structure Modularization Guide

## Overview

The page-structure files have been **fully modularized** into specialized managers. This allows any page to import only the specific functionality it needs, improving performance and maintainability.

## 🎯 Modular Architecture

### **Old Approach** (Monolithic)
```html
<!-- Load everything, even if you don't need it -->
<script src="../js/page-structure/page-structure-1.js"></script> <!-- 449 lines -->
<script src="../js/page-structure/page-structure-3.js"></script> <!-- 604 lines -->
<script src="../js/page-structure/page-structure-4.js"></script> <!-- 173 lines -->
```

### **New Approach** (Modular)
```html
<!-- Import only what you need -->
<script src="../js/page-structure/stateManager.js"></script>
<script src="../js/page-structure/utilsManager.js"></script>
<script src="../js/page-structure/profileFunctionsManager.js"></script>
<!-- etc. -->
```

---

## 📦 Available Managers

### **1. stateManager.js** *(Core - Required by most features)*
**What it does:** Global STATE and CONFIG objects
**Use when:** You need global state management
**Exports:**
- `window.CONFIG` - Animation & realtime update settings
- `window.STATE` - Global state (videos, blogs, notifications, etc.)

**Example:**
```javascript
// Access global state
console.log(STATE.videos);
STATE.currentTheme = 'dark';
```

---

### **2. utilsManager.js** *(Core - Highly recommended)*
**What it does:** Utility functions used across the app
**Use when:** You need toast notifications or date formatting
**Exports:**
- `Utils.showToast(message, type)` - Show notifications
- `Utils.formatDate(date)` - Format dates ("2 days ago", etc.)

**Example:**
```javascript
Utils.showToast("✅ Profile saved!", "success");
const formattedDate = Utils.formatDate(new Date());
```

---

### **3. profileFunctionsManager.js**
**What it does:** Profile and schedule editing functions
**Use when:** Your page has profile editing or schedule modals
**Exports:**
- `window.saveSchedule()` - Save schedule form
- `window.saveProfile()` - Save profile form
- `window.addLocation()` - Add location field
- `window.removeLocation()` - Remove location field
- `window.addSocialMedia()` - Add social media field
- `window.removeSocial()` - Remove social media field
- `window.syncGoogleCalendar()` - Google Calendar integration
- `window.syncOutlookCalendar()` - Outlook Calendar integration

**Example:**
```html
<button onclick="saveProfile()">Save Profile</button>
<button onclick="syncGoogleCalendar()">Connect Google Calendar</button>
```

---

### **4. contentFilterManager.js**
**What it does:** Filter functions for content types
**Use when:** Your page has filterable content (jobs, videos, blogs, podcasts)
**Exports:**
- `window.filterJobs(filter)` - Filter job posts
- `window.filterPodcasts(filter)` - Filter podcasts
- `window.filterVideos(filter)` - Filter videos
- `window.filterBlogs(filter)` - Filter blog posts
- `window.filterClubs(filter)` - Filter clubs
- `window.filterMyProducts(filter)` - Filter products

**Example:**
```html
<button onclick="filterVideos('published')">Published Videos</button>
<button onclick="filterBlogs('draft')">Draft Blogs</button>
```

---

### **5. modalActionsManager.js**
**What it does:** Functions to open various modals
**Use when:** Your page has modal dialogs
**Exports:**
- `window.openCreateJobModal()` - Open job creation modal
- `window.openStoreSetup()` - Open store setup wizard
- `window.uploadBook()` - Open book upload modal
- `window.openCreateClubModal()` - Open club creation modal
- `window.openMyClassesModal()` - Open classes modal
- `window.openConnectModal()` - Open connection modal
- `window.openClassModal()` - Open class creation modal
- `window.openJobModal()` - Open job posting modal
- `window.openJobDetailModal(jobId)` - Open job details
- `window.createGroup()` - Open group creation modal

**Example:**
```html
<button onclick="openCreateJobModal()">Post a Job</button>
<button onclick="uploadBook()">Upload Book</button>
```

---

### **6. contentActionsManager.js**
**What it does:** Actions for content items (edit, publish, view, etc.)
**Use when:** Your page has content management features
**Exports:**
- `window.editJob(jobId)` - Edit job post
- `window.publishJob(jobId)` - Publish job post
- `window.viewApplicants(jobId)` - View job applicants
- `window.viewClubDetails(clubId)` - View club details
- `window.manageClub(clubId)` - Manage club
- `window.continueProduct(productId)` - Continue course
- `window.launchProduct(productId)` - Launch software
- `window.viewProduct(productId)` - View product details
- `window.uploadVideo()` - Upload video
- `window.previewThumbnail(event)` - Preview image upload

**Example:**
```html
<button onclick="editJob('job-123')">Edit Job</button>
<button onclick="publishJob('job-123')">Publish</button>
```

---

### **7. navigationManager.js**
**What it does:** Navigation and routing functions
**Use when:** Your page needs navigation helpers
**Exports:**
- `window.navigateToStore()` - Go to store page
- `window.shareProfile()` - Share profile via Web Share API
- `window.toggleSidebar()` - Toggle sidebar visibility
- `window.startAdvertising()` - Navigate to advertising signup

**Example:**
```html
<button onclick="shareProfile()">Share Profile</button>
<button onclick="toggleSidebar()">Toggle Sidebar</button>
```

---

### **8. adPackageFunctionsManager.js**
**What it does:** Ad package selection and analytics
**Use when:** You're building an advertiser profile
**Exports:**
- `window.selectPackage(packageId)` - Select ad package
- `window.showPackageType(type)` - Show package category
- `window.submitCustomPackage()` - Submit custom package request
- `window.switchMetric(metric)` - Switch analytics metric
- `window.viewAllEvents()` - View all scheduled events

**Example:**
```html
<button onclick="selectPackage('premium')">Select Premium</button>
<button onclick="switchMetric('views')">Show Views</button>
```

---

### **9. aiInsightsManager.js**
**What it does:** AI-powered insights for content creators
**Use when:** You're building a journalist/content creator profile
**Exports:**
- `window.AIInsights` - AI insights system
- `window.switchAITab(tabName)` - Switch AI tabs
- `window.refreshAIInsights()` - Refresh insights
- `window.openAISettingsModal()` - Open AI settings
- `window.startArticleWithTopic(topic)` - Start article
- `window.viewTopicResearch(topic)` - View topic research
- `window.schedulePost(time)` - Schedule post
- `window.viewTimingAnalytics()` - View timing analytics
- `window.openHeadlineOptimizer()` - Open headline optimizer
- `window.openSEOAnalyzer()` - Open SEO analyzer
- `window.openAIWriter()` - Open AI writer
- `window.openAIResearch()` - Open AI research
- `window.openAIFactChecker()` - Open fact checker
- `window.openAITranslator()` - Open translator

**Example:**
```html
<button onclick="refreshAIInsights()">Refresh Insights</button>
<button onclick="openHeadlineOptimizer()">Optimize Headline</button>
```

---

### **10. deliveryManager.js**
**What it does:** Delivery tracking functionality
**Use when:** You're building a delivery/courier profile
**Exports:**
- `window.checkActiveDelivery()` - Check for active deliveries
- `window.loadMockDeliveryData()` - Load delivery data

**Example:**
```javascript
checkActiveDelivery(); // On page load
```

---

### **11. initializationManager.js** *(Recommended - Loads last)*
**What it does:** Auto-initializes all loaded managers
**Use when:** You want automatic setup of managers
**Exports:**
- `window.InitializationManager` - Initialization class

**Features:**
- Auto-initializes ModalsManager, AnalyticsManager, WeatherManager, etc.
- Sets up modal event handlers
- Ensures modal styles
- Exports manager classes globally

**Example:**
```html
<!-- Load this LAST, after all other managers -->
<script src="../js/page-structure/initializationManager.js"></script>
```

---

## 📋 Usage Examples

### Example 1: Tutor Profile (Minimal)
```html
<!-- Only what a tutor needs -->
<script src="../js/page-structure/stateManager.js"></script>
<script src="../js/page-structure/utilsManager.js"></script>
<script src="../js/page-structure/modalManager.js"></script>
<script src="../js/page-structure/profileFunctionsManager.js"></script>
<script src="../js/page-structure/navigationManager.js"></script>
<script src="../js/page-structure/initializationManager.js"></script>
```

### Example 2: Journalist Profile (Content Creator)
```html
<!-- Journalist needs AI insights, content filters, etc. -->
<script src="../js/page-structure/stateManager.js"></script>
<script src="../js/page-structure/utilsManager.js"></script>
<script src="../js/page-structure/modalManager.js"></script>
<script src="../js/page-structure/profileFunctionsManager.js"></script>
<script src="../js/page-structure/contentFilterManager.js"></script>
<script src="../js/page-structure/contentActionsManager.js"></script>
<script src="../js/page-structure/aiInsightsManager.js"></script>
<script src="../js/page-structure/initializationManager.js"></script>
```

### Example 3: Advertiser Profile
```html
<!-- Advertiser needs ad packages and analytics -->
<script src="../js/page-structure/stateManager.js"></script>
<script src="../js/page-structure/utilsManager.js"></script>
<script src="../js/page-structure/modalManager.js"></script>
<script src="../js/page-structure/profileFunctionsManager.js"></script>
<script src="../js/page-structure/adPackageFunctionsManager.js"></script>
<script src="../js/page-structure/initializationManager.js"></script>
```

### Example 4: Institute Profile (Full Featured)
```html
<!-- Institute needs almost everything -->
<script src="../js/page-structure/stateManager.js"></script>
<script src="../js/page-structure/utilsManager.js"></script>
<script src="../js/page-structure/modalManager.js"></script>
<script src="../js/page-structure/profileFunctionsManager.js"></script>
<script src="../js/page-structure/contentFilterManager.js"></script>
<script src="../js/page-structure/contentActionsManager.js"></script>
<script src="../js/page-structure/modalActionsManager.js"></script>
<script src="../js/page-structure/navigationManager.js"></script>
<script src="../js/page-structure/initializationManager.js"></script>
```

---

## ⚡ Performance Benefits

| Profile Type | Old Size | New Size | Savings |
|--------------|----------|----------|---------|
| Tutor Profile | ~1,226 lines | ~350 lines | **71% reduction** |
| Journalist Profile | ~1,226 lines | ~800 lines | **35% reduction** |
| Advertiser Profile | ~1,226 lines | ~500 lines | **59% reduction** |

---

## 🔧 Backwards Compatibility

The original files are **still available** and will work:

```html
<!-- Old way - Still works for legacy pages -->
<script src="../js/page-structure/page-structure-1.js"></script>
<script src="../js/page-structure/page-structure-3.js"></script>
<script src="../js/page-structure/page-structure-4.js"></script>
```

These files now serve as **thin wrappers** that reference the modular managers.

---

## 📝 Best Practices

1. **Always load stateManager.js first** - Other managers depend on STATE and CONFIG
2. **Always load initializationManager.js last** - It auto-initializes other managers
3. **Load utilsManager.js early** - Many managers use `Utils.showToast()`
4. **Only import what you need** - Don't load unused managers
5. **Check dependencies** - Some managers depend on others (documented above)

---

## 🎓 Migration Guide

### Migrating from page-structure-1.js, 3.js, 4.js

**Before:**
```html
<script src="../js/page-structure/page-structure-1.js"></script>
<script src="../js/page-structure/page-structure-3.js"></script>
<script src="../js/page-structure/page-structure-4.js"></script>
```

**After:**
```html
<!-- Identify what your page actually uses, then import only those managers -->
<script src="../js/page-structure/stateManager.js"></script>
<script src="../js/page-structure/utilsManager.js"></script>
<!-- Add only the managers you need -->
<script src="../js/page-structure/initializationManager.js"></script>
```

**How to identify what you need:**
1. Search your HTML for `onclick="functionName()`
2. Check which manager exports that function (see list above)
3. Import that manager
4. Repeat for all onclick handlers

---

## 🚀 Quick Start

**Minimal setup for a new profile:**
```html
<!-- Minimum viable setup -->
<script src="../js/page-structure/stateManager.js"></script>
<script src="../js/page-structure/utilsManager.js"></script>
<script src="../js/page-structure/initializationManager.js"></script>
```

**Then add managers as needed:**
- Need profile editing? → Add `profileFunctionsManager.js`
- Need content filtering? → Add `contentFilterManager.js`
- Need modals? → Add `modalManager.js` + `modalActionsManager.js`
- etc.

---

## 📞 Support

If you're unsure which managers to import:
1. Check this guide
2. Look at tutor-profile.html (lines 2752-2791) for a working example
3. Check the function list in each manager file

**Created:** 2025
**Last Updated:** 2025
**Maintainer:** Astegni Development Team
