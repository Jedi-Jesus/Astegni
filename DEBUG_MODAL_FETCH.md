# Why Modal Fetch Might Be Failing in Production

## Possible Reasons (Ranked by Likelihood)

### 1. **File Not Deployed to Production Server** ⭐ MOST LIKELY
The `whiteboard-modal.html` file exists locally and is tracked by git, but might not have been pushed/deployed to production.

**Diagnostic:**
```bash
ssh root@128.140.122.215
cd /var/www/astegni

# Check if file exists on server
ls -lh modals/common-modals/whiteboard-modal.html

# If missing, check git status
git status
git log --oneline -5
```

**Fix if missing:**
```bash
# Pull latest changes
cd /var/www/astegni
git pull origin main

# If that doesn't work, check which commit is deployed
git log -1 --oneline
# Compare with local: git log -1 --oneline (on your machine)

# Verify file is now there
ls -lh modals/common-modals/whiteboard-modal.html
```

---

### 2. **File Permissions Issue on Server**
The file exists but isn't readable by the web server.

**Diagnostic:**
```bash
ssh root@128.140.122.215
cd /var/www/astegni

# Check file permissions
ls -la modals/common-modals/whiteboard-modal.html
# Should show: -rw-r--r-- (readable by everyone)

# Check directory permissions
ls -la modals/common-modals/
ls -la modals/
```

**Fix if wrong permissions:**
```bash
# Fix file permissions
chmod 644 modals/common-modals/whiteboard-modal.html

# Fix directory permissions (should be 755)
chmod 755 modals/
chmod 755 modals/common-modals/

# Fix ownership (should be www-data or your web user)
chown -R www-data:www-data modals/
```

---

### 3. **Nginx Configuration Blocking .html Files in Subdirectories**
Nginx might have a configuration that blocks direct access to .html files in the modals directory.

**Diagnostic:**
```bash
ssh root@128.140.122.215

# Check Nginx configuration
cat /etc/nginx/sites-enabled/astegni

# Look for location blocks that might block modals/
# Common culprits:
# - location ~ /modals/ { deny all; }
# - location ~ \.html$ { deny all; }
```

**Test directly in browser:**
Try accessing: `https://astegni.com/modals/common-modals/whiteboard-modal.html`

**Expected:**
- ✅ Shows modal HTML content
- ❌ 404 Not Found → File missing on server
- ❌ 403 Forbidden → Permissions/Nginx blocking issue

**Fix if blocked:**
```nginx
# In /etc/nginx/sites-enabled/astegni
location ~ ^/modals/.*\.html$ {
    # Allow access to modal files
    allow all;
}
```

---

### 4. **Wrong Path in Modal Loader**
The path calculation might be wrong for production URLs.

**Current path logic:**
```javascript
modalPath = '../modals/common-modals/'
filename = 'whiteboard-modal.html'
url = '../modals/common-modals/whiteboard-modal.html'
```

**From tutor-profile.html:**
- File location: `profile-pages/tutor-profile.html`
- Fetch URL: `../modals/common-modals/whiteboard-modal.html`
- Resolves to: `modals/common-modals/whiteboard-modal.html` ✅ Correct!

**Diagnostic - Add logging:**
Open browser console on production and check:
```javascript
console.log('Current URL:', window.location.href);
console.log('Trying to fetch:', new URL('../modals/common-modals/whiteboard-modal.html', window.location.href).href);
```

---

### 5. **Deployment Script Not Copying Modal Files**
Your auto-deployment might have a filter that excludes modal files.

**Check deployment configuration:**
```bash
ssh root@128.140.122.215
cd /var/www/astegni

# Check if there's a deployment script
ls -la deploy.sh .github/workflows/*.yml

# Check if .gitattributes or .git/info/exclude blocks modals
cat .gitattributes 2>/dev/null
cat .git/info/exclude 2>/dev/null
```

---

### 6. **Cached 404 Response**
The server or CDN cached a 404 response from when the file was missing.

**Fix:**
```bash
# Clear all caches
ssh root@128.140.122.215

# Nginx cache
sudo rm -rf /var/cache/nginx/*

# If using Varnish or other cache
sudo systemctl restart varnish

# Reload Nginx
sudo systemctl reload nginx
```

**Also clear browser cache:**
- Hard refresh: `Ctrl+Shift+R`
- Or try incognito mode

---

## Immediate Diagnostic Steps

Run this on production server to diagnose:

```bash
#!/bin/bash
echo "=== Modal Fetch Failure Diagnostic ==="
echo ""

# 1. Check if file exists
echo "1. File existence:"
if [ -f "/var/www/astegni/modals/common-modals/whiteboard-modal.html" ]; then
    echo "   ✅ File exists"
    ls -lh /var/www/astegni/modals/common-modals/whiteboard-modal.html
else
    echo "   ❌ File MISSING"
fi
echo ""

# 2. Check permissions
echo "2. File permissions:"
ls -la /var/www/astegni/modals/common-modals/whiteboard-modal.html 2>/dev/null || echo "   File not found"
echo ""

# 3. Check directory permissions
echo "3. Directory permissions:"
ls -lad /var/www/astegni/modals/
ls -lad /var/www/astegni/modals/common-modals/
echo ""

# 4. Check Nginx configuration for blocking
echo "4. Nginx configuration check:"
grep -r "modals" /etc/nginx/sites-enabled/ || echo "   No 'modals' directive found"
grep -r "deny" /etc/nginx/sites-enabled/ | grep -i "html" || echo "   No .html deny rules"
echo ""

# 5. Check git status
echo "5. Git deployment status:"
cd /var/www/astegni
git log -1 --oneline
git status --short
echo ""

# 6. Try to fetch file directly
echo "6. Direct file access test:"
curl -I http://localhost/modals/common-modals/whiteboard-modal.html 2>&1 | head -5
echo ""

# 7. Check file content (first 100 chars)
echo "7. File content preview:"
head -c 100 /var/www/astegni/modals/common-modals/whiteboard-modal.html 2>/dev/null
echo ""
echo "..."
```

Save as `diagnose_modal.sh`, then:
```bash
chmod +x diagnose_modal.sh
./diagnose_modal.sh
```

---

## Quick Fix While Investigating

Add this temporary logging to help debug:

**File:** `modals/tutor-profile/modal-loader.js` (line ~249)

```javascript
// Fetch modal HTML
const url = modalPath + filename;

// TEMPORARY DEBUG LOGGING
console.log(`[ModalLoader] 🔍 Debug Info:`);
console.log(`  - Filename: ${filename}`);
console.log(`  - Modal Path: ${modalPath}`);
console.log(`  - Full URL: ${url}`);
console.log(`  - Resolved URL: ${new URL(url, window.location.href).href}`);
console.log(`  - Current Page: ${window.location.href}`);

try {
    console.log(`[ModalLoader] Fetching: ${filename} from ${modalPath}`);
```

Deploy this and check the browser console on production to see exactly what URL is being fetched.

---

## Most Likely Solution

Based on the symptoms (works locally, fails in production, affects multiple profiles), I suspect:

1. **File not deployed** - Run `git pull` on production
2. **Cached 404** - Clear Nginx cache
3. **Permissions** - Fix with `chmod 644` and `chmod 755` on directories

Try these in order:
```bash
ssh root@128.140.122.215
cd /var/www/astegni

# 1. Update code
git pull origin main

# 2. Fix permissions
chmod -R 755 modals/
find modals/ -type f -exec chmod 644 {} \;

# 3. Clear cache
sudo rm -rf /var/cache/nginx/*
sudo systemctl reload nginx

# 4. Verify
ls -lh modals/common-modals/whiteboard-modal.html
curl -I https://astegni.com/modals/common-modals/whiteboard-modal.html
```
