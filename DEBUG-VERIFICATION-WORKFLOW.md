# Debug Guide: Verification Workflow Not Opening

## Issue
When clicking submit buttons on Achievement/Certification/Experience forms, the verification fee modal doesn't open.

## Debugging Steps

### Step 1: Open Browser Console
1. Go to `http://localhost:8080/profile-pages/tutor-profile.html`
2. Press `F12` to open Developer Tools
3. Go to "Console" tab

### Step 2: Check if Forms Are Found
When the page loads, you should see these console messages:

```
🚀 INITIALIZING TUTOR PROFILE PAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 Setting up form event listeners...
🔍 Looking for certificationForm: FOUND ✅
✅ Setting up certificationForm submit listener
🔍 Looking for experienceForm: FOUND ✅
✅ Setting up experienceForm submit listener
🔍 Looking for achievementForm: FOUND ✅
✅ Setting up achievementForm submit listener
📝 Form event listeners setup complete
```

### Step 3: If Forms NOT FOUND
If you see "NOT FOUND ❌", it means `TutorProfileController.init()` is running **before** the forms exist in the DOM.

**Solution**: The forms are inside modals that might be rendered later. We need to attach event listeners AFTER modals are opened, not during page load.

### Step 4: Test Modal Functions Manually
In browser console, run:

```javascript
// Test if functions exist
console.log(typeof openVerificationFeeModal); // Should be "function"
console.log(typeof closeCertificationModal); // Should be "function"

// Test opening the fee modal directly
openVerificationFeeModal();
```

If the modal opens, the functions work. The issue is just the event listener timing.

### Step 5: Test Form Submission Manually
```javascript
// Simulate form submission
const certForm = document.getElementById('certificationForm');
console.log('Form found:', certForm);

if (certForm) {
    certForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}
```

## The Real Issue: Event Listener Timing

The problem is that `setupEventListeners()` runs during page initialization, but the modal forms might not exist yet in the DOM at that time.

## Solution: Attach Listeners When Modal Opens

Instead of attaching listeners during init, we should attach them when each modal opens.

### Option 1: Modify Modal Open Functions
Add event listener setup inside modal open functions.

### Option 2: Use Event Delegation
Attach listeners to the document and use event delegation.

### Option 3: Delay Listener Setup
Use a small delay or MutationObserver to wait for modals to be in DOM.

## Quick Fix Implementation

I'll implement **Option 1** - attach listeners when modals open.
