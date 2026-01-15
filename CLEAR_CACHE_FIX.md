# URGENT: Clear Cache to Fix Index.html CSS Errors

## What's Happening

Your browser console shows these errors:
```
root.css:1  Failed to load resource: 404
index.css:1  Failed to load resource: 404
hero-section.css:1  Failed to load resource: 404
...
```

**These are CSS files from index.html!** They shouldn't be loading on the tutor profile page.

## Root Cause

The modal loader has **cached** a version of the whiteboard modal that includes index.html content. Even though we fixed the code, your browser is using the cached (broken) version.

## Fix: Clear ALL Caches

### 1. Clear Browser Cache (Critical!)

**Chrome/Edge:**
1. Press `Ctrl + Shift + Delete`
2. Select "All time" as time range
3. Check these boxes:
   - ✅ Cached images and files
   - ✅ Cookies and other site data
4. Click "Clear data"
5. Close ALL browser windows
6. Reopen and test

**Or use Incognito/Private mode:**
- `Ctrl + Shift + N` (Chrome)
- `Ctrl + Shift + P` (Firefox/Edge)
- Test in incognito to bypass cache

### 2. Clear Nginx Server Cache

```bash
ssh root@218.140.122.215
sudo rm -rf /var/cache/nginx/*
sudo systemctl reload nginx
```

### 3. Force Reload on Profile Pages

Add cache-busting to the modal loader:

**File:** `modals/tutor-profile/modal-loader.js` (line ~249)

Change:
```javascript
const url = modalPath + filename;
```

To:
```javascript
// Add cache-busting timestamp to force fresh fetch
const cacheBuster = new Date().getTime();
const url = `${modalPath}${filename}?v=${cacheBuster}`;
```

This forces the browser to fetch fresh modal files instead of using cache.

### 4. Clear LocalStorage (Modal Cache)

Open browser console on production and run:
```javascript
// Clear modal loader cache
localStorage.clear();

// Or specifically clear modal cache if stored
for (let key in localStorage) {
    if (key.includes('modal') || key.includes('whiteboard')) {
        localStorage.removeItem(key);
    }
}

// Reload page
location.reload(true);
```

### 5. Verify Cache is Cleared

After clearing, check the Network tab (F12):
1. Go to Network tab
2. Check "Disable cache" checkbox
3. Reload page (`Ctrl + Shift + R`)
4. Look for requests to `whiteboard-modal.html`
5. Should show `200 OK` with fresh content

## Prevention

Add cache-busting to all modal loads permanently:

**File:** `modals/tutor-profile/modal-loader.js`

```javascript
// Configuration
const CONFIG = {
    modalPath: '../modals/tutor-profile/',
    containerId: 'modal-container',
    cache: false,  // ❌ DISABLE CACHE temporarily to test
    preloadOnInit: true,
    cacheBusting: true  // ✅ Add this
};
```

And in the fetch function:
```javascript
async function load(modalIdentifier) {
    // ... existing code ...

    // Fetch modal HTML
    let url = modalPath + filename;

    // Add cache-busting if enabled
    if (CONFIG.cacheBusting) {
        const separator = url.includes('?') ? '&' : '?';
        url = `${url}${separator}v=${Date.now()}`;
    }

    try {
        console.log(`[ModalLoader] Fetching: ${url}`);
        const response = await fetch(url, {
            cache: 'no-store'  // Force no cache
        });
        // ... rest of code
    }
}
```

## Test After Clearing

1. **Hard refresh:** `Ctrl + Shift + R`
2. **Check console:** Should NOT see index.html CSS errors
3. **Check Network tab:** All requests should be fresh (not from cache)
4. **Check footer:** Should NOT see index.html content below footer

## If Still Broken After Cache Clear

Then the issue is the modal file on the server is actually corrupted. Check:

```bash
ssh root@218.140.122.215
cd /var/www/astegni

# Check if modal has index.html content
head -50 modals/common-modals/whiteboard-modal.html

# Should start with: <!-- Modal: whiteboardModal -->
# Should NOT have: <!DOCTYPE html> or <link href="css/index.css">

# If corrupted, re-deploy
git fetch origin
git reset --hard origin/main
```
