# Credential Card Border Highlight Fix

## Issue
When clicking between Achievement and Academic Credentials cards, the colored border ring (ring-4) was not being removed from the previously selected card, causing both cards to show active borders simultaneously.

## Root Cause
The JavaScript code was looking for elements with class `.credential-type-card` to remove the ring styles, but the student-profile.html cards only have IDs (`cred-card-achievement`, `cred-card-academic`) without that class.

## Solution

### File Changed
`js/common-modals/credential-manager.js` (line 297-335)

### Before
```javascript
// Update active card styling
document.querySelectorAll('.credential-type-card').forEach(card => {
    card.classList.remove('active', 'ring-4');
    // ... conditional ring color removal
});
```

This would find **zero elements** in student-profile.html because the cards don't have the `credential-type-card` class.

### After
```javascript
// Remove active styling from ALL credential cards by ID
const allCards = ['achievement', 'academic', 'experience'];
allCards.forEach(type => {
    const card = document.getElementById(`cred-card-${type}`);
    if (card) {
        card.classList.remove('active', 'ring-4', 'ring-yellow-400', 'ring-blue-400', 'ring-green-400');
    }
});

// Also try the old selector for backward compatibility (tutor profile)
document.querySelectorAll('.credential-type-card').forEach(card => {
    card.classList.remove('active', 'ring-4', 'ring-yellow-400', 'ring-blue-400', 'ring-green-400');
});

// Add active styling to the selected card
const activeCard = document.getElementById(`cred-card-${credentialType}`);
if (activeCard) {
    activeCard.classList.add('active', 'ring-4');
    if (credentialType === 'achievement') {
        activeCard.classList.add('ring-yellow-400');
    } else if (credentialType === 'academic') {
        activeCard.classList.add('ring-blue-400');
    } else if (credentialType === 'experience') {
        activeCard.classList.add('ring-green-400');
    }
}
```

## How It Works Now

### Card Structure (student-profile.html)
```html
<!-- Achievements Card -->
<div id="cred-card-achievement" class="card p-6 cursor-pointer hover:shadow-lg transition-shadow">
    ...
</div>

<!-- Academic Credentials Card -->
<div id="cred-card-academic" class="card p-6 cursor-pointer hover:shadow-lg transition-shadow">
    ...
</div>
```

### Click Flow

**1. User clicks Achievement card:**
- Remove `ring-4`, `ring-yellow-400`, `ring-blue-400`, `ring-green-400` from `cred-card-achievement`
- Remove `ring-4`, `ring-yellow-400`, `ring-blue-400`, `ring-green-400` from `cred-card-academic`
- Remove `ring-4`, `ring-yellow-400`, `ring-blue-400`, `ring-green-400` from `cred-card-experience`
- Add `ring-4` and `ring-yellow-400` to `cred-card-achievement`
- **Result**: Only Achievement card has yellow border

**2. User clicks Academic card:**
- Remove `ring-4`, `ring-yellow-400`, `ring-blue-400`, `ring-green-400` from `cred-card-achievement`
- Remove `ring-4`, `ring-yellow-400`, `ring-blue-400`, `ring-green-400` from `cred-card-academic`
- Remove `ring-4`, `ring-yellow-400`, `ring-blue-400`, `ring-green-400` from `cred-card-experience`
- Add `ring-4` and `ring-blue-400` to `cred-card-academic`
- **Result**: Only Academic card has blue border

## Border Ring Classes

Each credential type has its own color:
- **Achievement** (`ring-yellow-400`): Yellow/amber border for awards and honors
- **Academic** (`ring-blue-400`): Blue border for academic certificates
- **Experience** (`ring-green-400`): Green border for work experience (tutor only)

## Cache-Busting Update

Updated student-profile.html script tag from:
```html
<script src="../js/common-modals/credential-manager.js?v=20260131-sectionfix"></script>
```

To:
```html
<script src="../js/common-modals/credential-manager.js?v=20260131-borderfix"></script>
```

## Testing

### Before Fix
1. Click Achievement card → Yellow border appears
2. Click Academic card → Blue border appears, BUT yellow border stays on Achievement card
3. **Problem**: Both cards have borders

### After Fix
1. Click Achievement card → Yellow border appears, Academic card has no border
2. Click Academic card → Blue border appears, Achievement card border disappears
3. Click Achievement card → Yellow border appears, Academic card border disappears
4. **Success**: Only one card has a border at a time

## Verification

Hard refresh the page (Ctrl+Shift+R) and test:
- ✅ Only the clicked card should show a colored border ring
- ✅ Previously selected card should have no border
- ✅ Border color matches the credential type (yellow for achievements, blue for academic)
- ✅ Smooth visual feedback when switching between cards

## Compatibility

This fix maintains backward compatibility with tutor-profile.html which uses the `.credential-type-card` class selector. Both approaches are now supported:
- **By ID**: `cred-card-achievement`, `cred-card-academic`, `cred-card-experience` (student profile)
- **By Class**: `.credential-type-card` (tutor profile)
