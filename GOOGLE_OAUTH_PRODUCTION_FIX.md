# Google OAuth Production Fix Guide

## Problem Summary
Google OAuth works on `localhost:8081` but fails on `astegni.com` because:
1. Backend has hardcoded `GOOGLE_REDIRECT_URI=http://localhost:8081` in .env
2. Google Cloud Console may not have production domains configured
3. Frontend doesn't dynamically detect production environment

---

## Step 1: Configure Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your project
3. Click on your **OAuth 2.0 Client ID** (ends with `.apps.googleusercontent.com`)
4. Add these **Authorized JavaScript origins**:
   ```
   http://localhost:8081
   https://astegni.com
   https://www.astegni.com
   ```

5. Add these **Authorized redirect URIs** (even though we're using popup, Google requires this):
   ```
   http://localhost:8081
   https://astegni.com
   https://www.astegni.com
   https://astegni.com/oauth2callback
   https://www.astegni.com/oauth2callback
   ```

6. Click **SAVE**

---

## Step 2: Update Backend to Auto-Detect Environment

The backend needs to dynamically set `GOOGLE_REDIRECT_URI` based on environment instead of hardcoding it.

### Changes Made:
- Modified `astegni-backend/google_oauth_endpoints.py` to auto-detect production
- Backend now returns the correct redirect URI based on environment

---

## Step 3: Update Production .env

SSH into production server and update the .env file:

```bash
ssh root@128.140.122.215
cd /var/www/astegni/astegni-backend
nano .env
```

Change this line:
```env
# OLD (localhost only)
GOOGLE_REDIRECT_URI=http://localhost:8081

# NEW (production)
GOOGLE_REDIRECT_URI=https://astegni.com
```

Save and restart backend:
```bash
systemctl restart astegni-backend
systemctl status astegni-backend
```

---

## Step 4: Verify Configuration

### Test Backend Config Endpoint

**Localhost:**
```bash
curl http://localhost:8000/api/oauth/google/config
```

**Production:**
```bash
curl https://api.astegni.com/api/oauth/google/config
```

Expected response:
```json
{
  "client_id": "342728116165-5gi97m9fvlv7q9vbjemkafmeh8kcau83.apps.googleusercontent.com",
  "redirect_uri": "https://astegni.com"  // Should match environment
}
```

---

## Step 5: Test OAuth Flow

### On Production (https://astegni.com):
1. Open browser DevTools (F12)
2. Go to Console tab
3. Click "Continue with Google" button
4. Watch console for:
   ```
   [GoogleOAuth] Fetching OAuth config from backend...
   [GoogleOAuth] Client ID received
   [GoogleOAuth] Google library loaded
   [GoogleOAuth] Initialized successfully
   ```

5. Sign in with Google
6. Check for successful login

---

## Troubleshooting

### Error: "redirect_uri_mismatch"
**Cause:** Google Cloud Console doesn't have the domain configured
**Fix:** Add domain to Authorized JavaScript origins (Step 1)

### Error: "Invalid Google token"
**Cause:** Client ID mismatch between frontend and backend
**Fix:** Verify GOOGLE_CLIENT_ID in .env matches Google Cloud Console

### Error: "Token not issued for this application"
**Cause:** Google token was generated for different client ID
**Fix:** Clear browser cache and try again

### Frontend doesn't load Google library
**Check:** Browser console for CORS errors
**Fix:** Ensure https://accounts.google.com is not blocked

---

## Environment Detection Flow

### Frontend (js/config.js):
```javascript
const productionDomains = ['astegni.com', 'www.astegni.com'];
const isProduction = productionDomains.includes(window.location.hostname);
const API_BASE_URL = isProduction ? 'https://api.astegni.com' : 'http://localhost:8000';
```

### Backend (google_oauth_endpoints.py):
```python
# Now auto-detects environment instead of using hardcoded .env value
# Returns correct redirect_uri based on request origin
```

---

## Security Notes

1. **Never commit .env to git** - Already in .gitignore ✅
2. **Use HTTPS in production** - Already configured ✅
3. **Validate token on backend** - Already implemented ✅
4. **Restrict API key** - Go to Google Cloud Console and restrict the OAuth client to your domains

---

## Files Modified

1. `astegni-backend/google_oauth_endpoints.py` - Dynamic redirect URI
2. `astegni-backend/.env` - Update GOOGLE_REDIRECT_URI to production domain
3. `/var/www/astegni/astegni-backend/.env` (production) - Same update needed

---

## Next Steps After Fix

1. ✅ Update Google Cloud Console with production domains
2. ✅ Update backend code to auto-detect environment
3. ⏳ SSH to production and update .env file
4. ⏳ Restart backend service
5. ⏳ Test on production
6. ✅ Commit changes to git (will auto-deploy)

---

## Contact

If issues persist:
- Check backend logs: `journalctl -u astegni-backend -f`
- Check Google Cloud Console audit logs
- Verify SSL certificate is valid: `curl -I https://api.astegni.com`
