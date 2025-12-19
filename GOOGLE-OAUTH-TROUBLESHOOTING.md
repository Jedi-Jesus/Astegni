# Google OAuth "Can't continue with google.com" Error - TROUBLESHOOTING

## Problem
You're seeing this error popup when clicking "Continue with Google":
```
Can't continue with google.com
Something went wrong
```

## Root Cause
Google is blocking the OAuth flow because your **JavaScript origin is not authorized** in Google Cloud Console.

## Solution (Step-by-Step)

### Step 1: Verify Google Cloud Console Settings

1. Go to: https://console.cloud.google.com/apis/credentials
2. Find your OAuth 2.0 Client ID: `342728116165-5gi97m9fvlv7q9vbjemkafmeh8kcau83.apps.googleusercontent.com`
3. Click on it to edit

### Step 2: Check Authorized JavaScript Origins

**CRITICAL:** You MUST have BOTH of these in "Authorized JavaScript origins":

```
http://localhost:8081
http://localhost:8080
```

**Screenshot of what it should look like:**
```
Authorized JavaScript origins
┌────────────────────────────────────┐
│ http://localhost:8081              │  ← Main dev server (dev-server.py)
│ http://localhost:8080              │  ← Legacy server (python -m http.server)
└────────────────────────────────────┘
```

### Step 3: Check Authorized Redirect URIs

You should also have these in "Authorized redirect URIs":

```
http://localhost:8081
http://localhost:8080
```

### Step 4: Wait for Propagation

**IMPORTANT:** After saving changes in Google Console:
- Wait **5-10 minutes** for changes to propagate
- Don't test immediately after saving!

### Step 5: Clear Browser Cache

Even after waiting, your browser might have cached the old configuration:

**Option A: Use Incognito/Private Mode** (Easiest)
- Chrome: Ctrl+Shift+N
- Firefox: Ctrl+Shift+P
- Edge: Ctrl+Shift+N
- Open: http://localhost:8081/test-google-oauth.html

**Option B: Clear Specific Cache**
1. Open DevTools (F12)
2. Right-click the refresh button → "Empty Cache and Hard Reload"
3. Or go to: chrome://settings/siteData
4. Search for "google.com" and delete

**Option C: Clear All Cache**
1. Chrome: Settings → Privacy → Clear browsing data
2. Select: "Cookies and other site data" + "Cached images and files"
3. Time range: "Last hour"
4. Clear data

### Step 6: Test Again

1. Make sure backend is running:
   ```bash
   cd astegni-backend
   python app.py
   ```

2. Make sure dev server is running:
   ```bash
   python dev-server.py  # Port 8081
   ```

3. Open in **incognito mode**:
   ```
   http://localhost:8081/test-google-oauth.html
   ```

4. Click "Test Google Sign-In"

5. You should now see the Google account picker popup instead of the error!

## Still Not Working?

### Check Console for Specific Errors

Open DevTools (F12) → Console tab. Look for errors like:

**Error 1: "Not a valid origin"**
```
[GSI_LOGGER]: The given origin is not allowed for the given client ID.
```
**Fix:** Add `http://localhost:8081` to Authorized JavaScript origins in Google Cloud Console

**Error 2: "idpiframe_initialization_failed"**
```
Cookies are not enabled in current environment.
```
**Fix:** Enable third-party cookies for Google:
- Chrome: Settings → Privacy → Cookies → "Allow all cookies"
- Or add exception for `[*.]google.com`

**Error 3: "popup_closed_by_user"**
```
The popup has been closed by the user before finalizing the operation.
```
**Fix:** This is normal if you close the popup. Try again and select an account.

### Verify Your .env Configuration

Your backend `.env` should have:
```env
GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:8081
```

Get your credentials from Google Cloud Console.

### Test Backend Directly

```bash
curl http://localhost:8000/api/oauth/google/config
```

Should return:
```json
{
  "client_id": "342728116165-5gi97m9fvlv7q9vbjemkafmeh8kcau83.apps.googleusercontent.com",
  "redirect_uri": "http://localhost:8081"
}
```

✅ **This works!**

## What Changed?

According to Google's policy (as of 2023), **all OAuth origins must be explicitly authorized**. Previously, `localhost` was allowed by default, but now you MUST add it manually.

## Quick Checklist

- [ ] Added `http://localhost:8081` to Authorized JavaScript origins
- [ ] Added `http://localhost:8080` to Authorized JavaScript origins (if using legacy server)
- [ ] Added corresponding redirect URIs
- [ ] Saved changes in Google Console
- [ ] Waited 5-10 minutes after saving
- [ ] Cleared browser cache or used incognito mode
- [ ] Backend is running (`python app.py`)
- [ ] Dev server is running (`python dev-server.py`)
- [ ] Tested at `http://localhost:8081/test-google-oauth.html`

## Expected Flow (When Working)

1. Click "Continue with Google" → Google account picker appears
2. Select your Google account → Google asks for permissions
3. Click "Allow" → Redirects back to your app
4. Backend verifies the ID token → Creates/logs in user
5. Success! Redirects to profile page

## Common Mistakes

❌ **Using `http://127.0.0.1:8081`** instead of `http://localhost:8081`
- Google treats these as different origins!
- Use `localhost`, not `127.0.0.1`

❌ **Including trailing slash** like `http://localhost:8081/`
- Don't include the slash!
- Use `http://localhost:8081` (no trailing slash)

❌ **Testing immediately after saving**
- Google needs 5-10 minutes to propagate changes
- Be patient!

❌ **Not clearing browser cache**
- Your browser caches Google's OAuth config
- Use incognito mode to bypass

## Production Deployment

When deploying to production (astegni.com), you'll need to add:

**Authorized JavaScript origins:**
```
https://astegni.com
https://www.astegni.com
```

**Authorized redirect URIs:**
```
https://astegni.com
https://www.astegni.com
```

And update your `.env`:
```env
GOOGLE_REDIRECT_URI=https://astegni.com
```

## Need More Help?

Check Google's official documentation:
- https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid
- https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow

Or check the detailed error logs in the test page at:
http://localhost:8081/test-google-oauth.html
