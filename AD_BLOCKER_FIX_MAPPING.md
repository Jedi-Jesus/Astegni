# Ad Blocker Fix - Comprehensive Naming Mapping

**Date:** February 5, 2026
**Issue:** Ad blockers hiding elements with "ad-" prefixes on production (astegni.com)
**Solution:** Rename all "ad-" prefixed classes/IDs/files to "promo-" or "sponsor-" prefixes

---

## NAMING CONVENTION MAPPING

### Core Principle
Replace all "ad-" and "ads-" prefixes with ad-blocker-safe alternatives:
- **"ad-"** → **"promo-"** (promotional content)
- **"ads-"** → **"promos-"** (plural promotional)
- **"advert-"** → **"sponsor-"** (sponsorship)

---

## 1. CLASS NAME MAPPINGS (95+ Classes)

### High-Frequency Classes (10+ occurrences)

| Old Name | New Name | Purpose | Occurrences |
|----------|----------|---------|-------------|
| `.ad-content` | `.promo-content` | Main content wrapper | 73 |
| `.ad-label` | `.promo-label` | Label/badge text | 63 |
| `.ad-visual` | `.promo-visual` | Visual elements | 62 |
| `.ad-title` | `.promo-title` | Headline | 62 |
| `.ad-text` | `.promo-text` | Body text | 62 |
| `.ad-cta` | `.promo-cta` | Call-to-action button | 62 |
| `.ad-circles` | `.promo-circles` | Animated circles | 62 |
| `.ad-animation` | `.promo-animation` | Animation container | 62 |
| `.ad-slide` | `.promo-slide` | Carousel slide | 45 |
| `.ad-stat-info` | `.promo-stat-info` | Analytics stat | 20 |
| `.ad-stat-icon` | `.promo-stat-icon` | Analytics icon | 20 |
| `.ad-stat-card` | `.promo-stat-card` | Analytics card | 20 |
| `.ad-message` | `.promo-message` | Rotating message | 16 |
| `.ad-slide.active` | `.promo-slide.active` | Active slide | 16 |
| `.ad-container.premium-ad` | `.promo-container.premium-promo` | Premium container | 17 |

### Medium-Frequency Classes (5-9 occurrences)

| Old Name | New Name | Occurrences |
|----------|----------|-------------|
| `.ad-stats-grid` | `.promo-stats-grid` | 5 |
| `.ad-placeholder` | `.promo-placeholder` | 4 |
| `.ad-packages` | `.promo-packages` | 4 |
| `.ad-message-user` | `.promo-message-user` | 8 |
| `.ad-message-student` | `.promo-message-student` | 8 |
| `.modal-content.ad-analytics-modal` | `.modal-content.promo-analytics-modal` | 8 |

### Low-Frequency Classes (1-4 occurrences)

| Old Name | New Name | Occurrences |
|----------|----------|-------------|
| `.ad-message-tutor` | `.promo-message-tutor` | 4 |
| `.ad-message-parent` | `.promo-message-parent` | 4 |
| `.ad-message-advertiser` | `.promo-message-advertiser` | 4 |
| `.ad-placeholder-section` | `.promo-placeholder-section` | 1 |
| `.ad-carousel-widget` | `.promo-carousel-widget` | 6 |
| `.ad-subtitle` | `.promo-subtitle` | 5 |
| `.ad-primary-btn` | `.promo-primary-btn` | 2 |
| `.ad-secondary-btn` | `.promo-secondary-btn` | 4 |
| `.ad-visual-content` | `.promo-visual-content` | 3 |
| `.ad-content-wrapper` | `.promo-content-wrapper` | 3 |
| `.ad-tag` | `.promo-tag` | 2 |
| `.ad-headline` | `.promo-headline` | 2 |
| `.ad-description` | `.promo-description` | 2 |
| `.ad-buttons` | `.promo-buttons` | 2 |
| `.ad-badge` | `.promo-badge` | 2 |
| `.ad-backdrop` | `.promo-backdrop` | 2 |
| `.ad-gradient` | `.promo-gradient` | 1 |
| `.ad-content-main` | `.promo-content-main` | 1 |
| `.ad-banner` | `.promo-banner` | 1 |
| `.ad-indicators` | `.promo-indicators` | 2 |
| `.ad-indicator` | `.promo-indicator` | 2 |
| `.ad-indicator-progress` | `.promo-indicator-progress` | 3 |
| `.ad-timer` | `.promo-timer` | 1 |
| `.ad-text-content` | `.promo-text-content` | 2 |
| `.ad-panel-header` | `.promo-panel-header` | 1 |
| `.ad-panel-content` | `.promo-panel-content` | 1 |
| `.ad-panel-footer` | `.promo-panel-footer` | 1 |
| `.ad-close-btn` | `.promo-close-btn` | 1 |
| `.ad-placement-selection` | `.promo-placement-selection` | 1 |
| `.ad-placement-checkboxes` | `.promo-placement-checkboxes` | 1 |
| `.sidebar-widget.ad-widget` | `.sidebar-widget.promo-widget` | 3 |
| `.whiteboard-ad-panel` | `.whiteboard-promo-panel` | 1 |
| `.premium-ad` | `.premium-promo` | 17 |

---

## 2. ID NAME MAPPINGS (56+ IDs)

### Profile-Specific Container IDs

| Old Name | New Name | Location |
|----------|----------|----------|
| `#ad-container-user` | `#promo-container-user` | user-profile.html |
| `#ad-container-student` | `#promo-container-student` | student-profile.html |
| `#ad-container-tutor` | `#promo-container-tutor` | tutor-profile.html |
| `#ad-container-parent` | `#promo-container-parent` | parent-profile.html |
| `#ad-container-advertiser` | `#promo-container-advertiser` | advertiser-profile.html |
| `#ad-container` | `#promo-container` | view-*.html (4 files) |

### Message Container IDs

| Old Name | New Name | Occurrences |
|----------|----------|-------------|
| `#ad-message-container` | `#promo-message-container` | 4 |
| `#ad-message-container-user` | `#promo-message-container-user` | 2 |
| `#ad-message-container-student` | `#promo-message-container-student` | 2 |
| `#ad-message-container-tutor` | `#promo-message-container-tutor` | 1 |
| `#ad-message-container-parent` | `#promo-message-container-parent` | 1 |
| `#ad-message-container-advertiser` | `#promo-message-container-advertiser` | 1 |

### Ticker (Scrolling Text) IDs

| Old Name | New Name | Occurrences |
|----------|----------|-------------|
| `#ad-ticker` | `#promo-ticker` | 4 |
| `#ad-ticker-user` | `#promo-ticker-user` | 2 |
| `#ad-ticker-student` | `#promo-ticker-student` | 2 |
| `#ad-ticker-tutor` | `#promo-ticker-tutor` | 1 |
| `#ad-ticker-parent` | `#promo-ticker-parent` | 1 |
| `#ad-ticker-advertiser` | `#promo-ticker-advertiser` | 1 |
| `#ad-ticker-content` | `#promo-ticker-content` | 4 |
| `#ad-ticker-content-user` | `#promo-ticker-content-user` | 2 |
| `#ad-ticker-content-student` | `#promo-ticker-content-student` | 2 |
| `#ad-ticker-content-tutor` | `#promo-ticker-content-tutor` | 1 |
| `#ad-ticker-content-parent` | `#promo-ticker-content-parent` | 1 |
| `#ad-ticker-content-advertiser` | `#promo-ticker-content-advertiser` | 1 |

### Analytics Modal IDs

| Old Name | New Name |
|----------|----------|
| `#adAnalyticsModal` | `#promoAnalyticsModal` |
| `#ad-videos-panel` | `#promo-videos-panel` |
| `#ad-placeholder-testimonials` | `#promo-placeholder-testimonials` |

---

## 3. FILE NAME MAPPINGS

### CSS Files

| Old Path | New Path |
|----------|----------|
| `css/root/ad-placeholder.css` | `css/root/promo-placeholder.css` |
| `css/common-modals/ad-modal.css` | `css/common-modals/promo-modal.css` |
| `css/index/index-ad.css` | `css/index/index-promo.css` |
| `css/reels/grid-ad-section.css` | `css/reels/grid-promo-section.css` |
| `admin-pages/css/root/ad-placeholder.css` | `admin-pages/css/root/promo-placeholder.css` |

### JavaScript Files

| Old Path | New Path |
|----------|----------|
| `js/root/ad-placeholder.js` | `js/root/promo-placeholder.js` |
| `js/common-modals/ad-rotation-manager.js` | `js/common-modals/promo-rotation-manager.js` |
| `js/common-modals/ad-modal.js` | `js/common-modals/promo-modal.js` |
| `js/page-structure/adPackageManager.js` | `js/page-structure/promoPackageManager.js` |
| `js/page-structure/adPackageFunctionsManager.js` | `js/page-structure/promoPackageFunctionsManager.js` |
| `js/page-structure/ad-analitics.js` | `js/page-structure/promo-analytics.js` |
| `js/reels/ad-PackageManager.js` | `js/reels/promo-PackageManager.js` |
| `js/reels/ad-placeholder.js` | `js/reels/promo-placeholder.js` |
| `admin-pages/js/root/ad-placeholder.js` | `admin-pages/js/root/promo-placeholder.js` |

### Modal HTML Files

| Old Path | New Path |
|----------|----------|
| `modals/common-modals/ad-analytics-modal.html` | `modals/common-modals/promo-analytics-modal.html` |

---

## 4. JAVASCRIPT FUNCTION MAPPINGS

### Global Functions

| Old Function | New Function |
|--------------|--------------|
| `openAdAnalyticsModal()` | `openPromoAnalyticsModal()` |
| `openAdModal()` | `openPromoModal()` |
| `closeAdModal()` | `closePromoModal()` |
| `initAdRotation()` | `initPromoRotation()` |
| `startAdCarousel()` | `startPromoCarousel()` |
| `stopAdCarousel()` | `stopPromoCarousel()` |
| `showAdMessage()` | `showPromoMessage()` |
| `hideAdMessage()` | `hidePromoMessage()` |
| `updateAdStats()` | `updatePromoStats()` |
| `loadAdPackages()` | `loadPromoPackages()` |
| `selectAdPackage()` | `selectPromoPackage()` |

### Manager Classes

| Old Class | New Class |
|-----------|-----------|
| `AdRotationManager` | `PromoRotationManager` |
| `AdPackageManager` | `PromoPackageManager` |
| `AdPackageFunctionsManager` | `PromoPackageFunctionsManager` |
| `AdAnalyticsManager` | `PromoAnalyticsManager` |

---

## 5. CSS IMPORT STATEMENTS

### In root.css and profile CSS files

```css
/* OLD */
@import url('root/ad-placeholder.css');
@import url('common-modals/ad-modal.css');
@import url('index/index-ad.css');

/* NEW */
@import url('root/promo-placeholder.css');
@import url('common-modals/promo-modal.css');
@import url('index/index-promo.css');
```

---

## 6. HTML SCRIPT TAG UPDATES

### All HTML files that load ad-related JS

```html
<!-- OLD -->
<script src="../js/root/ad-placeholder.js"></script>
<script src="../js/common-modals/ad-rotation-manager.js"></script>
<script src="../js/common-modals/ad-modal.js"></script>

<!-- NEW -->
<script src="../js/root/promo-placeholder.js"></script>
<script src="../js/common-modals/promo-rotation-manager.js"></script>
<script src="../js/common-modals/promo-modal.js"></script>
```

---

## 7. HTML LINK TAG UPDATES

### All HTML files that load ad-related CSS

```html
<!-- OLD -->
<link rel="stylesheet" href="../css/root/ad-placeholder.css">
<link rel="stylesheet" href="../css/common-modals/ad-modal.css">

<!-- NEW -->
<link rel="stylesheet" href="../css/root/promo-placeholder.css">
<link rel="stylesheet" href="../css/common-modals/promo-modal.css">
```

---

## 8. ONCLICK HANDLER UPDATES

### HTML onclick attributes

```html
<!-- OLD -->
onclick="openAdAnalyticsModal()"
onclick="openComingSoonModal('Advertising')"

<!-- NEW -->
onclick="openPromoAnalyticsModal()"
onclick="openComingSoonModal('Advertising')" <!-- Keep as-is, not ad-related -->
```

---

## 9. QUERYSELECTOR UPDATES

### JavaScript querySelector/querySelectorAll

```javascript
// OLD
document.querySelector('.ad-container')
document.querySelectorAll('.ad-slide')
document.getElementById('ad-message-container-student')

// NEW
document.querySelector('.promo-container')
document.querySelectorAll('.promo-slide')
document.getElementById('promo-message-container-student')
```

---

## 10. EVENT LISTENER UPDATES

### JavaScript addEventListener

```javascript
// OLD
adContainer.addEventListener('click', ...)
document.querySelectorAll('.ad-cta').forEach(...)

// NEW
promoContainer.addEventListener('click', ...)
document.querySelectorAll('.promo-cta').forEach(...)
```

---

## 11. VARIABLE NAME UPDATES

### JavaScript variables

```javascript
// OLD
const adContainer = document.querySelector('.ad-container');
let adRotationInterval;
const adMessages = document.querySelectorAll('.ad-message');

// NEW
const promoContainer = document.querySelector('.promo-container');
let promoRotationInterval;
const promoMessages = document.querySelectorAll('.promo-message');
```

---

## 12. CSS VARIABLE UPDATES (if any)

```css
/* OLD */
--ad-primary-color: #F59E0B;
--ad-container-height: 250px;

/* NEW */
--promo-primary-color: #F59E0B;
--promo-container-height: 250px;
```

---

## 13. COMMENT UPDATES

### Update comments to reflect new naming

```javascript
// OLD
// Initialize ad rotation carousel
// Hide ad container when sidebar is active

// NEW
// Initialize promo rotation carousel
// Hide promo container when sidebar is active
```

---

## 14. IMPLEMENTATION ORDER

To minimize breaking changes, follow this order:

### Phase 1: CSS Files (Foundation)
1. Rename CSS files
2. Update all class/ID definitions in CSS
3. Update CSS imports in root files

### Phase 2: JavaScript Files (Logic)
1. Rename JS files
2. Update all querySelector/querySelectorAll
3. Update function names
4. Update class names
5. Update variable names
6. Update comments

### Phase 3: HTML Files (Structure)
1. Update script src attributes
2. Update link href attributes
3. Update class attributes
4. Update id attributes
5. Update onclick handlers

### Phase 4: Modal Files
1. Update modal HTML files
2. Update modal references in JS

### Phase 5: Testing
1. Test locally with dev-server.py
2. Test all profile pages
3. Test modals
4. Test carousel rotation
5. Test analytics display

---

## 15. FILES TO UPDATE COUNT

- **CSS Files:** 7 files
- **JavaScript Files:** 9 files
- **HTML Files:** 20+ files (profiles, views, branch pages)
- **Modal Files:** 1 file
- **Total:** 37+ files

---

## 16. CACHE BUSTING STRATEGY

After deployment, update version strings:

```html
<!-- OLD -->
<script src="../js/common-modals/ad-modal.js?v=20260205-comingsoon"></script>

<!-- NEW -->
<script src="../js/common-modals/promo-modal.js?v=20260205-adblocker-fix"></script>
```

---

## 17. TESTING CHECKLIST

### After Implementation:
- [ ] All promo containers visible on production (test with uBlock Origin enabled)
- [ ] Carousel rotation working (10-second intervals)
- [ ] Click handlers opening correct modals
- [ ] Analytics modal loading correctly
- [ ] Package pricing display working
- [ ] Profile-specific promo messages showing
- [ ] Ticker scrolling animation working
- [ ] Responsive design intact on mobile
- [ ] No console errors related to missing classes/IDs
- [ ] No broken CSS (missing styles)

---

## 18. ROLLBACK PLAN

If issues occur:
1. Keep old files as `.old` backups during transition
2. Use git to revert to previous commit
3. Clear browser cache on production
4. Restart frontend server

---

## 19. DOCUMENTATION UPDATES

Update these documentation files:
- `CLAUDE.md` - Update architecture references
- `AD_CONTAINER_COMING_SOON_FIX.md` - Update with new naming
- Create `AD_BLOCKER_FIX_COMPLETE.md` - Document completion

---

## 20. PRODUCTION DEPLOYMENT

### Steps:
1. Test all changes locally first
2. Commit with message: "Fix: Rename ad- prefixed classes to promo- to bypass ad blockers"
3. Push to GitHub (triggers auto-deployment)
4. SSH to production: `ssh root@128.140.122.215`
5. Verify deployment: `cd /var/www/astegni && git log -1`
6. Check backend status: `systemctl status astegni-backend`
7. Test on production with ad blocker enabled
8. Monitor for errors: `journalctl -u astegni-backend -f`

---

**Status:** Ready for Implementation
**Estimated Time:** 2-3 hours (automated replacement)
**Risk Level:** Medium (extensive changes, but systematic)
**Testing Required:** Yes (critical for production)
