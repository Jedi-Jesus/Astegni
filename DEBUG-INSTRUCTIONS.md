# Counter Flip Animation Debug Guide

## Quick Start

### Option 1: Use the Debug Tool (Recommended)

1. Open `debug-flip-animation.html` in your browser
2. Follow the instructions on the page
3. Copy the debug script
4. Open https://astegni.com in a new tab
5. Press **F12** to open Developer Tools
6. Go to the **Console** tab
7. Paste the script and press **Enter**
8. Review the output

### Option 2: Copy Script Directly

1. Open `debug-script.js` in a text editor
2. Copy the entire contents
3. Open https://astegni.com
4. Press **F12** → Go to **Console** tab
5. Paste the script and press **Enter**

### Option 3: Quick One-Liner Test

Open astegni.com, press F12, go to Console, and paste:

```javascript
console.log('Cards:', document.querySelectorAll('.counter-flip-card').length, 'Animation:', window.getComputedStyle(document.querySelector('.counter-flip-inner')).animationName);
```

Expected output: `Cards: 3 Animation: autoFlipCounter`

## What the Debug Script Tests

1. ✅ **DOM Structure** - Checks if 3 counter-flip-card elements exist
2. ✅ **CSS Loading** - Verifies hero-section.css is loaded
3. ✅ **Animation Application** - Checks if animations are applied to cards
4. ✅ **Keyframes Definition** - Verifies @keyframes autoFlipCounter exists
5. ✅ **CSS Conflicts** - Looks for common issues
6. ✅ **3D Transform Setup** - Checks backface-visibility and transform-style
7. ✅ **Manual Test** - Provides command to manually trigger flip

## Common Issues & Solutions

### Issue 1: Animation name is "none"
**Problem:** CSS animation rules aren't being applied
**Solution:**
- Check if hero-section.css loaded correctly
- Verify no CSS specificity conflicts
- Check browser console for CSS errors

### Issue 2: Cards don't exist (0 found)
**Problem:** HTML structure is missing or incorrect
**Solution:**
- Verify index.html has been deployed
- Check if JavaScript is removing elements
- Hard refresh the page (Ctrl+Shift+R)

### Issue 3: @keyframes not found
**Problem:** The animation definition is missing
**Solution:**
- Verify hero-section.css contains @keyframes autoFlipCounter
- Check if CSS file is being cached
- Verify the file deployed correctly (check line count: should be 441 lines)

### Issue 4: transform-style is not "preserve-3d"
**Problem:** 3D transforms won't work without this property
**Solution:**
- Check if another CSS rule is overriding it
- Verify .counter-flip-inner has transform-style: preserve-3d

### Issue 5: Cloudflare/CDN Cache
**Problem:** Old CSS is being served from cache
**Solution:**
- Version number should be v=2.1.4
- Wait a few minutes for CDN cache to expire
- Or purge Cloudflare cache manually

## Manual Animation Test

After running the debug script, test if the flip mechanism works:

```javascript
// Flip the first card
document.querySelector('.counter-flip-inner').style.transform = 'rotateY(180deg)';

// Reset after 3 seconds
setTimeout(() => {
    document.querySelector('.counter-flip-inner').style.transform = 'rotateY(0deg)';
}, 3000);
```

**If this works:** CSS animation definition is the issue
**If this doesn't work:** 3D transform setup is the issue

## Expected Animation Behavior

- **Card 1**: Flips every 12 seconds (starts immediately at 0s)
- **Card 2**: Flips every 12 seconds (starts after 4s delay)
- **Card 3**: Flips every 12 seconds (starts after 8s delay)
- **Hover**: Pauses the animation
- **Each flip**: Shows back side for ~5.4 seconds

## Verify CSS Deployment

Check if the correct CSS is deployed:

```bash
# Check line count (should be 441)
curl -s "https://astegni.com/css/index/hero-section.css?v=2.1.4" | wc -l

# Check for animation (should find 4 occurrences)
curl -s "https://astegni.com/css/index/hero-section.css?v=2.1.4" | grep -c "autoFlipCounter"

# View the animation definition
curl -s "https://astegni.com/css/index/hero-section.css?v=2.1.4" | grep -A 15 "@keyframes autoFlipCounter"
```

## Compare Local vs Production

Test on both to find differences:

1. **Local (http://localhost:8081)**
   - Run debug script
   - Note the results

2. **Production (https://astegni.com)**
   - Run debug script
   - Compare results

Differences will help identify if it's a deployment issue or a browser-specific issue.

## Need More Help?

If the debug script shows everything is correct but animations still don't work:

1. Check browser compatibility (CSS 3D transforms require modern browser)
2. Check if hardware acceleration is enabled
3. Try a different browser
4. Check for browser extensions blocking animations
5. Look for JavaScript errors in console that might be affecting CSS

## Debug Output Example

Expected output when everything is working:

```
🔍 COUNTER FLIP ANIMATION DEBUGGER
================================================================================

[TEST 1] Checking Counter Flip Card Elements
Found 3 counter-flip-card elements
✅ SUCCESS: Counter flip cards found

[TEST 2] Checking CSS Files
✅ hero-section.css is loaded: https://astegni.com/css/index/hero-section.css?v=2.1.4

[TEST 3] Checking Computed Styles
  Card 1 (.counter-flip-inner) styles:
    animation: 12s infinite 0s normal none running autoFlipCounter
    animation-name: autoFlipCounter
    ✅ Animation detected: autoFlipCounter

[TEST 4] Checking CSS Animation Keyframes
✅ Found @keyframes autoFlipCounter

[TEST 5] Checking for CSS Conflicts
✅ No obvious CSS conflicts detected

[TEST 6] Checking Flip Card Face Visibility
✅ backface-visibility correctly set

📊 DIAGNOSIS SUMMARY
Cards Found: ✅ YES
CSS Loaded: ✅ YES
Animation Applied: ✅ YES
```
