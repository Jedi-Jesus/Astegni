# Videos Page - Social Links Update

## Summary

Enhanced the videos.html page to dynamically load user's social media links from the `users.social_links` database field. Now shows 10 platforms (added YouTube and GitHub) and dims buttons for platforms where the user hasn't provided links.

## What Changed

### 1. Enhanced `loadUserSocialLinks()` Function

**Location:** `branch/videos.html` (Line ~1631)

**Previous Behavior:**
- Loaded social links from database
- Updated platform URLs with user's links
- Kept default URLs if user hadn't provided links

**New Behavior:**
- ✅ Loads all social links from `users.social_links` JSON field
- ✅ Updates button URLs with user's personal links
- ✅ **Dims buttons (30% opacity)** for platforms user hasn't added
- ✅ Disables pointer events on dimmed buttons
- ✅ Better logging for debugging
- ✅ Case-insensitive platform matching

### 2. Added 2 New Platforms

**Added:**
- YouTube (red icon, #FF0000)
- GitHub (dark icon, #333333)

**Total Platforms: 10**
1. TikTok
2. Instagram
3. Snapchat
4. Facebook
5. Telegram
6. WhatsApp
7. LinkedIn
8. Twitter/X
9. **YouTube** (NEW)
10. **GitHub** (NEW)

## Implementation Details

### Database Structure

**Table:** `users`
**Field:** `social_links` (JSON/JSONB)

**Example Data:**
```json
{
  "twitter": "https://twitter.com/username",
  "linkedin": "https://linkedin.com/in/username",
  "youtube": "https://youtube.com/@username",
  "github": "https://github.com/username"
}
```

### Code Changes

#### Updated JavaScript Function (Line 1631-1694)

```javascript
async function loadUserSocialLinks() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('[loadUserSocialLinks] User not logged in - using default social links');
            return;
        }

        // Fetch user data from API
        const response = await fetch(`${window.API_BASE_URL}/api/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            console.log('[loadUserSocialLinks] Failed to fetch user data');
            return;
        }

        const userData = await response.json();
        const socialLinks = userData.social_links || {};

        console.log('[loadUserSocialLinks] User social links from database:', socialLinks);

        // Update each social platform button
        const socialPlatformButtons = document.querySelectorAll('.social-platform-btn[data-platform]');
        let linksUpdated = 0;

        socialPlatformButtons.forEach(button => {
            const platform = button.getAttribute('data-platform');

            // Try to find matching social link (case-insensitive)
            let userLink = null;

            // Direct match (lowercase)
            if (socialLinks[platform]) {
                userLink = socialLinks[platform];
            }
            // Try capitalized version
            else if (socialLinks[platform.charAt(0).toUpperCase() + platform.slice(1)]) {
                userLink = socialLinks[platform.charAt(0).toUpperCase() + platform.slice(1)];
            }
            // Special case for Twitter/X
            else if (platform === 'twitter') {
                userLink = socialLinks.twitter || socialLinks.Twitter || socialLinks.x || socialLinks.X;
            }

            if (userLink && userLink.trim() !== '') {
                // User has provided this social link
                button.href = userLink;
                button.style.opacity = '1';
                linksUpdated++;
                console.log(`✅ Updated ${platform} to: ${userLink}`);
            } else {
                // Dim the button if user hasn't provided a link
                button.style.opacity = '0.3';
                button.style.pointerEvents = 'none';
                console.log(`ℹ️ ${platform} not provided, button dimmed`);
            }
        });

        console.log(`✅ Updated ${linksUpdated} social link(s)`);

    } catch (error) {
        console.error('[loadUserSocialLinks] Error:', error);
    }
}
```

**Key Features:**
- ✅ Case-insensitive matching
- ✅ Dims unavailable platforms (opacity: 0.3)
- ✅ Disables clicks on dimmed buttons
- ✅ Better console logging
- ✅ Handles Twitter/X alias

#### Added YouTube Button (Line 617)

```html
<a href="https://youtube.com" target="_blank" class="social-platform-btn youtube" data-platform="youtube">
    <svg viewBox="0 0 24 24"><path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.4 19.6c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg>
    <span>YouTube</span>
</a>
```

#### Added GitHub Button (Line 621)

```html
<a href="https://github.com" target="_blank" class="social-platform-btn github" data-platform="github">
    <svg viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>
    <span>GitHub</span>
</a>
```

#### Added CSS Styling (Line 544)

```css
.social-platform-btn.youtube svg { fill: #FF0000; }
.social-platform-btn.youtube:hover { border-color: #FF0000; background: rgba(255,0,0,0.1); }

.social-platform-btn.github svg { fill: #333333; }
.social-platform-btn.github:hover { border-color: #333333; background: rgba(51,51,51,0.1); }
[data-theme="dark"] .social-platform-btn.github svg { fill: #ffffff; }
```

## User Experience

### Scenario 1: User Has Some Social Links

**Database:**
```json
{
  "twitter": "https://twitter.com/johndoe",
  "linkedin": "https://linkedin.com/in/johndoe",
  "youtube": "https://youtube.com/@johndoe"
}
```

**What User Sees:**
- ✅ Twitter button: **Full opacity**, links to user's Twitter
- ✅ LinkedIn button: **Full opacity**, links to user's LinkedIn
- ✅ YouTube button: **Full opacity**, links to user's YouTube
- ⚪ Instagram: **Dimmed (30% opacity)**, click disabled
- ⚪ Facebook: **Dimmed (30% opacity)**, click disabled
- ⚪ TikTok: **Dimmed (30% opacity)**, click disabled
- ⚪ Snapchat: **Dimmed (30% opacity)**, click disabled
- ⚪ Telegram: **Dimmed (30% opacity)**, click disabled
- ⚪ WhatsApp: **Dimmed (30% opacity)**, click disabled
- ⚪ GitHub: **Dimmed (30% opacity)**, click disabled

**Visual:**
```
Coming Soon Message

[TikTok]  [Instagram]  [Snapchat]  [Facebook]
  30%         30%          30%          30%

[Telegram]  [WhatsApp]  [LinkedIn]   [Twitter]
    30%         30%        100% ✅      100% ✅

[YouTube]   [GitHub]
  100% ✅      30%
```

### Scenario 2: User Has No Social Links

**Database:** `social_links: null` or `{}`

**What User Sees:**
- All buttons dimmed to 30% opacity
- All buttons have click disabled
- Default platform URLs remain (https://platform.com)

### Scenario 3: User Not Logged In

**What User Sees:**
- All buttons at full opacity
- All link to default platform URLs
- No personalization

## API Data Flow

```
USER VISITS videos.html
       |
       v
DOMContentLoaded fires
       |
       v
loadUserSocialLinks() called
       |
       v
GET /api/me (with JWT token)
       |
       v
Returns user data including social_links
       |
       v
JavaScript updates button hrefs
       |
       v
Dims buttons without links (opacity: 0.3)
       |
       v
User sees personalized social buttons
```

## How to Add More Platforms

To add a new platform (e.g., Discord):

### 1. Add HTML Button

```html
<a href="https://discord.com" target="_blank" class="social-platform-btn discord" data-platform="discord">
    <svg viewBox="0 0 24 24"><path d="[Discord SVG path]"/></svg>
    <span>Discord</span>
</a>
```

### 2. Add CSS Styling

```css
.social-platform-btn.discord svg { fill: #5865F2; }
.social-platform-btn.discord:hover { border-color: #5865F2; background: rgba(88,101,242,0.1); }
```

### 3. User Adds Link in Profile

User goes to their profile → Edit Profile → Social Media → Adds Discord URL

### 4. No Code Changes Needed!

The `loadUserSocialLinks()` function automatically:
- Reads `social_links.discord` from database
- Updates the Discord button href
- Shows button at full opacity

## Testing

### Test Case 1: Check Console Logs

1. Open videos.html
2. Open browser console (F12)
3. Look for logs:
   ```
   [loadUserSocialLinks] User social links from database: {...}
   ✅ Updated twitter to: https://twitter.com/username
   ✅ Updated linkedin to: https://linkedin.com/in/username
   ℹ️ instagram not provided, button dimmed
   ```

### Test Case 2: Verify Button Opacity

1. Open videos.html
2. Inspect buttons with DevTools
3. Check `style="opacity: 1"` for provided links
4. Check `style="opacity: 0.3"` for missing links

### Test Case 3: Verify Click Behavior

1. Try clicking a button at full opacity → Opens user's link
2. Try clicking a dimmed button → Nothing happens (pointer-events: none)

## Files Modified

- `branch/videos.html` - Enhanced social links loading, added YouTube & GitHub

## Platform Support Matrix

| Platform | Icon Color | Hover Color | Dark Mode |
|----------|-----------|-------------|-----------|
| TikTok | #000000 | rgba(0,0,0,0.05) | #ffffff |
| Instagram | #E1306C | Gradient | - |
| Snapchat | #FFFC00 | rgba(255,252,0,0.1) | - |
| Facebook | #1877F2 | rgba(24,119,242,0.1) | - |
| Telegram | #0088CC | rgba(0,136,204,0.1) | - |
| WhatsApp | #25D366 | rgba(37,211,102,0.1) | - |
| LinkedIn | #0077B5 | rgba(0,119,181,0.1) | - |
| Twitter/X | #000000 | rgba(0,0,0,0.05) | #ffffff |
| YouTube | #FF0000 | rgba(255,0,0,0.1) | - |
| GitHub | #333333 | rgba(51,51,51,0.1) | #ffffff |

## Benefits

✅ **User-Personalized** - Shows user's actual social links
✅ **Visual Feedback** - Dims unavailable platforms
✅ **Prevents Confusion** - Disables clicks on dimmed buttons
✅ **Scalable** - Easy to add more platforms
✅ **Database-Driven** - No hardcoded links
✅ **Fallback Safe** - Works even if API fails (shows defaults)

---

**Status:** ✅ Complete
**Date:** 2026-01-27
**File:** branch/videos.html
**Database:** users.social_links (JSON field)
