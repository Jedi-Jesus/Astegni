# Email & Phone Placeholder Text - Always Show Cards

## Change Summary
Updated tutor profile pages to **always display email and phone cards**, even when data is missing. Shows placeholder text instead of hiding cards.

## Files Updated

### ✅ JavaScript Files

1. **[js/tutor-profile/profile-data-loader.js:815-842](js/tutor-profile/profile-data-loader.js#L815-L842)**
   - Updated `updateContactInfo()` function
   - Always shows both email and phone cards
   - Displays placeholder text when data is missing

2. **[js/view-tutor/view-tutor-db-loader.js:456-483](js/view-tutor/view-tutor-db-loader.js#L456-L483)**
   - Updated `updateContactInfo()` function
   - Same behavior as tutor-profile

## Behavior Changes

### Before
- **With Data:** Shows email and phone cards
- **Without Email:** Email card hidden completely
- **Without Phone:** Phone card hidden completely
- **Both Missing:** Shows "No contact information available" message

### After
- **With Data:** Shows email and phone cards with actual values (normal text color)
- **Without Email:** Shows email card with placeholder "Email will be displayed here" (muted color, italic)
- **Without Phone:** Shows phone card with placeholder "Phone will be displayed here" (muted color, italic)
- **Both Missing:** Shows both cards with placeholders

## Visual Design

### With Data
```
┌─────────────────────────────────────┐
│ 📧 Email                            │
│    user@example.com                 │  ← Normal color, regular font
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 📱 Phone                            │
│    +251 912 345 678                 │  ← Normal color, regular font
└─────────────────────────────────────┘
```

### Without Data (Placeholder)
```
┌─────────────────────────────────────┐
│ 📧 Email                            │
│    Email will be displayed here     │  ← Muted color, italic
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 📱 Phone                            │
│    Phone will be displayed here     │  ← Muted color, italic
└─────────────────────────────────────┘
```

## Code Implementation

### Dynamic Styling
The JavaScript uses conditional styling based on data availability:

```javascript
// Email card - always shown
const emailHTML = `
    <div id="email-container" style="...">
        <span style="font-size: 1.25rem;">📧</span>
        <div style="flex: 1; overflow: hidden;">
            <div style="font-size: 0.75rem; color: var(--text-muted);">Email</div>
            <div id="tutor-email" style="
                color: ${profile.email ? 'var(--text)' : 'var(--text-muted)'};
                ${!profile.email ? 'font-style: italic;' : ''}
            ">
                ${profile.email || 'Email will be displayed here'}
            </div>
        </div>
    </div>
`;

// Phone card - always shown
const phoneHTML = `
    <div id="phone-container" style="...">
        <span style="font-size: 1.25rem;">📱</span>
        <div style="flex: 1;">
            <div style="font-size: 0.75rem; color: var(--text-muted);">Phone</div>
            <div id="tutor-phone" style="
                color: ${profile.phone ? 'var(--text)' : 'var(--text-muted)'};
                ${!profile.phone ? 'font-style: italic;' : ''}
            ">
                ${profile.phone || 'Phone will be displayed here'}
            </div>
        </div>
    </div>
`;

contactContainer.innerHTML = emailHTML + phoneHTML;
```

## Styling Details

### When Data Exists
- **Text Color:** `var(--text)` (normal primary text)
- **Font Style:** Regular (not italic)
- **Content:** Actual email/phone value

### When Data Missing
- **Text Color:** `var(--text-muted)` (muted/secondary text)
- **Font Style:** Italic
- **Content:** Placeholder text
  - Email: "Email will be displayed here"
  - Phone: "Phone will be displayed here"

## Benefits

### User Experience
1. **Consistent Layout:** Cards always present, no layout shift when data is added
2. **Clear Expectations:** Users know what fields are available
3. **Visual Feedback:** Italic muted text clearly indicates missing data
4. **Professional Look:** No empty spaces or hidden sections

### Developer Experience
1. **No Conditional Hiding:** Simpler logic, always render both cards
2. **Easier Testing:** Can test with/without data easily
3. **Accessibility:** Screen readers always announce both fields
4. **Maintainability:** Single code path for all scenarios

## Dark Mode Support
- `var(--text)` and `var(--text-muted)` automatically adjust in dark mode
- Placeholder text remains visible but subtle in both themes

## Applies To

### Pages with JS Updates
- ✅ **tutor-profile.html** (own profile)
- ✅ **view-tutor.html** (viewing other tutor's profile)

### Pages Not Affected (Static HTML)
- ⚪ **parent-profile.html** (no JS override)
- ⚪ **student-profile.html** (no JS override)
- ⚪ **view-student.html** (no JS override)

*Note: If you want the same placeholder behavior for parent/student profiles, we need to add similar logic to their HTML or create JS handlers.*

## Testing Scenarios

### Test Case 1: Both Email and Phone Present
- ✅ Both cards show with normal text color
- ✅ No italic styling
- ✅ Actual values displayed

### Test Case 2: Only Email Present
- ✅ Email card shows actual email (normal color)
- ✅ Phone card shows "Phone will be displayed here" (muted, italic)

### Test Case 3: Only Phone Present
- ✅ Email card shows "Email will be displayed here" (muted, italic)
- ✅ Phone card shows actual phone (normal color)

### Test Case 4: Both Missing
- ✅ Email card shows placeholder (muted, italic)
- ✅ Phone card shows placeholder (muted, italic)
- ✅ Layout remains consistent

## Alternative Placeholder Texts

If you want different placeholder messages, you can easily modify:

```javascript
// Current placeholders
${profile.email || 'Email will be displayed here'}
${profile.phone || 'Phone will be displayed here'}

// Alternative options:
${profile.email || 'No email provided'}
${profile.phone || 'No phone provided'}

${profile.email || 'Add your email'}
${profile.phone || 'Add your phone'}

${profile.email || 'Email not available'}
${profile.phone || 'Phone not available'}
```

## Summary

**What Changed:**
- Email and phone cards now **always visible**
- Missing data shows **placeholder text** instead of hiding
- Placeholders styled with **muted color and italic** font

**Why It's Better:**
- Consistent layout
- Clear user expectations
- Professional appearance
- Better accessibility

**Where Applied:**
- tutor-profile.html
- view-tutor.html

✅ **Ready for testing!**
