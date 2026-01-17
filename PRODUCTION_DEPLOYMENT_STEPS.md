# Google OAuth Production Deployment - Manual Steps

## Prerequisites
- SSH access to production server: `root@128.140.122.215`
- Password: `UVgkFmAsh4N4`
- Google Cloud Console access

---

## Step 1: Configure Google Cloud Console (Do This First!)

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/apis/credentials
   - Select your project

2. **Click on your OAuth 2.0 Client ID**
   - Client ID: `342728116165-5gi97m9fvlv7q9vbjemkafmeh8kcau83.apps.googleusercontent.com`

3. **Add Authorized JavaScript origins**
   ```
   http://localhost:8081
   https://astegni.com
   https://www.astegni.com
   ```

4. **Add Authorized redirect URIs**
   ```
   http://localhost:8081
   https://astegni.com
   https://www.astegni.com
   ```

5. **Click SAVE** and wait 5 minutes for changes to propagate

---

## Step 2: Update Production Server

### Connect to Server
```bash
ssh root@128.140.122.215
# Password: UVgkFmAsh4N4
```

### Navigate to Backend Directory
```bash
cd /var/www/astegni/astegni-backend
```

### Backup .env File
```bash
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
ls -lah .env*
```

### Edit .env File
```bash
nano .env
```

### Update These Lines
Find and update:
```env
# OLD
GOOGLE_REDIRECT_URI=http://localhost:8081
ENVIRONMENT=development

# NEW
GOOGLE_REDIRECT_URI=https://astegni.com
ENVIRONMENT=production
```

**Save:** `Ctrl + O`, `Enter`, `Ctrl + X`

---

## Step 3: Restart Backend Service

### Restart Service
```bash
systemctl restart astegni-backend
```

### Check Status
```bash
systemctl status astegni-backend
```

**Expected:** Should show "active (running)" in green

### View Live Logs (Optional)
```bash
journalctl -u astegni-backend -f
```

Press `Ctrl + C` to stop viewing logs

---

## Step 4: Verify Configuration

### Test OAuth Config Endpoint
```bash
curl https://api.astegni.com/api/oauth/google/config
```

**Expected Response:**
```json
{
  "client_id": "342728116165-5gi97m9fvlv7q9vbjemkafmeh8kcau83.apps.googleusercontent.com",
  "redirect_uri": "https://astegni.com"
}
```

### Test OAuth Status Endpoint
```bash
curl https://api.astegni.com/api/oauth/google/status
```

**Expected Response:**
```json
{
  "configured": true,
  "client_id_set": true,
  "client_secret_set": true,
  "redirect_uri": "https://astegni.com",
  "environment": "production"
}
```

---

## Step 5: Deploy Updated Code from Git

### On Production Server
```bash
cd /var/www/astegni
git pull origin main
systemctl restart astegni-backend
```

---

## Step 6: Test on Live Site

1. **Open Browser** (use Incognito/Private mode)
2. **Go to** https://astegni.com
3. **Open DevTools** (F12)
4. **Click** "Continue with Google" button
5. **Watch Console** for:
   ```
   [GoogleOAuth] Fetching OAuth config from backend...
   [GoogleOAuth] Client ID received
   [GoogleOAuth] Google library loaded
   [GoogleOAuth] Initialized successfully
   ```
6. **Sign in with Google**
7. **Verify** successful login and redirect to profile page

---

## Troubleshooting

### Issue: "redirect_uri_mismatch" Error
**Cause:** Google Cloud Console not updated
**Fix:**
- Go back to Step 1
- Ensure ALL domains are added
- Wait 5-10 minutes for Google to propagate changes
- Clear browser cache and try again

### Issue: Backend won't start
**Check logs:**
```bash
journalctl -u astegni-backend -n 100 --no-pager
```

**Common causes:**
- Syntax error in .env file
- Missing environment variable
- Port already in use

### Issue: "Invalid Google token"
**Cause:** Client ID mismatch
**Fix:**
```bash
# Verify client ID in .env
grep GOOGLE_CLIENT_ID /var/www/astegni/astegni-backend/.env

# Should match Google Cloud Console client ID
```

### Issue: Service won't restart
**Force restart:**
```bash
systemctl stop astegni-backend
systemctl start astegni-backend
systemctl status astegni-backend
```

---

## Rollback (If Something Goes Wrong)

```bash
cd /var/www/astegni/astegni-backend

# List backups
ls -lah .env.backup.*

# Restore latest backup
cp .env.backup.20250117_XXXXXX .env

# Restart service
systemctl restart astegni-backend
systemctl status astegni-backend
```

---

## Quick Reference

### Important URLs
- **Production Site:** https://astegni.com
- **API Base:** https://api.astegni.com
- **OAuth Config:** https://api.astegni.com/api/oauth/google/config
- **OAuth Status:** https://api.astegni.com/api/oauth/google/status
- **Google Console:** https://console.cloud.google.com/apis/credentials

### Important Paths
- **Backend:** `/var/www/astegni/astegni-backend/`
- **Frontend:** `/var/www/astegni/`
- **.env File:** `/var/www/astegni/astegni-backend/.env`
- **Logs:** `journalctl -u astegni-backend -f`

### Important Commands
```bash
# Restart backend
systemctl restart astegni-backend

# Check status
systemctl status astegni-backend

# View logs
journalctl -u astegni-backend -f

# Test API
curl https://api.astegni.com/api/oauth/google/status

# Git pull
cd /var/www/astegni && git pull origin main
```

---

## Success Criteria

✅ Google Cloud Console shows production domains
✅ Production .env has `ENVIRONMENT=production`
✅ Production .env has `GOOGLE_REDIRECT_URI=https://astegni.com`
✅ Backend service is running
✅ `/api/oauth/google/config` returns `https://astegni.com`
✅ `/api/oauth/google/status` shows `"configured": true`
✅ Google Sign-In works on https://astegni.com
✅ Users can login successfully
✅ No console errors in browser DevTools

---

## Timeline

1. **Google Cloud Console Update:** 2 minutes + 5 minutes propagation
2. **Server Configuration:** 5 minutes
3. **Testing:** 5 minutes
4. **Total:** ~15-20 minutes

---

## Support

If issues persist after following all steps:

1. **Check backend logs:**
   ```bash
   journalctl -u astegni-backend -n 200 --no-pager | grep -i oauth
   ```

2. **Check browser console:**
   - F12 → Console tab
   - Look for errors

3. **Verify Google Cloud Console:**
   - Go to "Logs" tab in Google Cloud Console
   - Check OAuth API requests

4. **Test locally first:**
   - Ensure it works on localhost before production
   - Compare configurations

---

## Notes

- Changes to Google Cloud Console take 5-10 minutes to propagate
- Always backup .env before making changes
- Test in Incognito mode to avoid caching issues
- The backend now auto-detects environment based on request origin
- Frontend already uses dynamic API_BASE_URL (js/config.js)
