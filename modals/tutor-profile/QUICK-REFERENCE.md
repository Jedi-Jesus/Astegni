# Modal Extraction Quick Reference

## Files Created

- **48 Modal Files** in `modals/tutor-profile/`
- **modal-loader.js** - JavaScript utility for loading modals
- **INTEGRATION-GUIDE.md** - Complete integration documentation
- **00-EXTRACTION-SUMMARY.txt** - Detailed extraction report
- **tutor-profile-refactored.html** - Original file with modals replaced by comments

## Quick Start (Copy & Paste)

### Step 1: Add to HTML

Add before closing `</body>` tag in `tutor-profile.html`:

```html
<!-- Modal Container -->
<div id="modal-container"></div>

<!-- Modal Loader -->
<script src="modals/tutor-profile/modal-loader.js"></script>
```

### Step 2: Choose Loading Strategy

**Option A: Preload All (Simple, slower initial load)**

```javascript
document.addEventListener('DOMContentLoaded', () => {
    ModalLoader.preloadAll();
});
```

**Option B: Load on Demand (Recommended, faster initial load)**

```javascript
// Update your existing modal open functions:
async function openEditProfileModal() {
    if (!ModalLoader.isLoaded('edit-profile-modal')) {
        await ModalLoader.loadById('edit-profile-modal');
    }
    document.getElementById('edit-profile-modal').classList.remove('hidden');
}
```

**Option C: Preload Critical Modals Only**

```javascript
document.addEventListener('DOMContentLoaded', async () => {
    // Load frequently used modals
    await ModalLoader.load('edit-profile-modal.html');
    await ModalLoader.load('coming-soon-modal.html');
    await ModalLoader.load('community-modal.html');
});
```

## Modal Categories

### Profile Management (5 modals)
- `edit-profile-modal.html` - Edit tutor profile
- `verify-personal-info-modal.html` - Verify personal information
- `otp-confirmation-modal.html` - OTP confirmation
- `otp-verification-modal.html` - OTP code entry
- `custom-filter-modal.html` - Custom search filters

### Media Upload (3 modals)
- `cover-upload-modal.html` - Cover photo upload
- `profile-upload-modal.html` - Profile picture upload
- `story-upload-modal.html` - Story upload

### Subscription Management (7 modals)
- `subscription-modal.html` - Subscription plans
- `plan-details-modal.html` - Plan details
- `switch-subscription-modal.html` - Switch plans
- `payment-method-modal.html` - Payment setup
- `unsubscribe-1-modal.html` - Unsubscribe reason
- `unsubscribe-confirm1-modal.html` - First confirmation
- `unsubscribe-confirm2-modal.html` - Fee confirmation
- `unsubscribe-password-modal.html` - Password confirmation
- `unsubscribe-final-modal.html` - Farewell message

### Account Deletion (5 modals)
- `leave-astegni-modal.html` - Leave platform
- `delete-1-modal.html` - Deletion reason
- `delete-verify-modal.html` - Deletion verification
- `delete-subscription-check-modal.html` - Subscription check
- `delete-password-modal.html` - Password confirmation
- `delete-final-modal.html` - Farewell message

### Credentials & Verification (8 modals)
- `certificationModal` - `certification-modal.html` - Add certification
- `achievementModal` - `achievement-modal.html` - Add achievement
- `experienceModal` - `experience-modal.html` - Add experience
- `viewCertificationModal` - `view-certification-modal.html` - View certification
- `viewAchievementModal` - `view-achievement-modal.html` - View achievement
- `viewExperienceModal` - `view-experience-modal.html` - View experience
- `verificationFeeModal` - `verification-fee-modal.html` - Verification fee
- `verificationModal` - `verification-modal.html` - Verification application

### Scheduling & Sessions (3 modals)
- `scheduleModal` - `schedule-modal.html` - Create schedule
- `viewScheduleModal` - `view-schedule-modal.html` - View schedule
- `viewRequestModal` - `view-request-modal.html` - View session request

### Quiz System (5 modals)
- `quizMainModal` - `quiz-main-modal.html` - Quiz main menu
- `quizGiveModal` - `quiz-give-modal.html` - Give quiz
- `quizMyQuizzesModal` - `quiz-my-quizzes-modal.html` - My quizzes
- `quizViewAnswersModal` - `quiz-view-answers-modal.html` - View answers
- `quizViewDetailsModal` - `quiz-view-details-modal.html` - View details

### Content Management (4 modals)
- `uploadDocumentModal` - `upload-document-modal.html` - Upload document
- `package-management-modal` - Package management
- `adAnalyticsModal` - `ad-analytics-modal.html` - Ad analytics
- `studentDetailsModal` - `student-details-modal.html` - Student details

### Community & Events (4 modals)
- `communityModal` - `community-modal.html` - Community management
- `create-event-modal` - Create event
- `create-club-modal` - Create club
- `storyViewerModal` - `story-viewer-modal.html` - Story viewer

### Utility (1 modal)
- `coming-soon-modal` - Feature announcement

## Common Code Snippets

### Load Modal by ID

```javascript
await ModalLoader.loadById('edit-profile-modal');
```

### Load Modal by Filename

```javascript
await ModalLoader.load('edit-profile-modal.html');
```

### Check if Modal is Loaded

```javascript
if (ModalLoader.isLoaded('edit-profile-modal')) {
    // Modal is already in DOM
}
```

### Get All Available Modals

```javascript
const modals = ModalLoader.getAvailableModals();
console.log(modals); // Array of all modal filenames
```

### Clear All Modals

```javascript
ModalLoader.clearAll(); // Remove all from DOM
ModalLoader.clearCache(); // Clear cache
```

## Integration Checklist

- [ ] Backup original `tutor-profile.html`
- [ ] Add `<div id="modal-container"></div>` to HTML
- [ ] Add `<script src="modals/tutor-profile/modal-loader.js"></script>`
- [ ] Choose loading strategy (preload vs on-demand)
- [ ] Update modal opening functions (if using on-demand)
- [ ] Test each modal category
- [ ] Verify no 404 errors in console
- [ ] Check modal open/close functionality
- [ ] Test on different screen sizes
- [ ] Verify all event handlers still work

## Testing Script

```javascript
// Test all modals load correctly
async function testAllModals() {
    console.log('Starting modal test...');
    const modals = ModalLoader.getAvailableModals();
    let passed = 0;
    let failed = 0;

    for (const modal of modals) {
        try {
            await ModalLoader.load(modal);
            console.log(`✓ ${modal}`);
            passed++;
        } catch (error) {
            console.error(`✗ ${modal}:`, error);
            failed++;
        }
    }

    console.log(`\nTest Complete: ${passed} passed, ${failed} failed`);
    return { passed, failed };
}

// Run test
testAllModals();
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Modal not appearing | Check if loaded with `ModalLoader.isLoaded('modal-id')` |
| 404 errors | Verify `modalPath` configuration and file locations |
| Modal loads but won't open | Ensure existing open/close functions still work |
| Styles not working | Verify CSS is still linked in main HTML |
| JavaScript errors | Check console, ensure all scripts load in correct order |

## File Size Comparison

- **Original tutor-profile.html**: ~530KB
- **Refactored tutor-profile.html**: ~250KB (52% reduction)
- **Modals directory total**: ~280KB
- **Benefit**: Better organization, easier maintenance, selective loading

## Performance Tips

1. **Preload critical modals** (edit-profile, coming-soon, community)
2. **Lazy load rarely used modals** (verification, deletion flows)
3. **Enable caching** (enabled by default in modal-loader.js)
4. **Monitor network tab** to see which modals are loading

## Next Steps

1. Review full `INTEGRATION-GUIDE.md` for detailed instructions
2. Check `00-EXTRACTION-SUMMARY.txt` for extraction report
3. Test in development environment
4. Consider applying same pattern to other profile pages
5. Update team documentation

---

**Quick Links:**
- [Complete Integration Guide](INTEGRATION-GUIDE.md)
- [Extraction Summary](00-EXTRACTION-SUMMARY.txt)
- [Modal Loader Source](modal-loader.js)
