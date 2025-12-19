# Google OAuth Setup Guide

This guide will walk you through setting up Google Sign-In for Astegni.

## Overview

Google OAuth allows users to:
- ✅ Sign in with their Google account (no password needed)
- ✅ Register new accounts using Google
- ✅ Automatic email verification (Google verifies emails)
- ✅ Profile picture imported from Google account

## Prerequisites

- Google account (for Google Cloud Console)
- Running Astegni backend server
- Running Astegni frontend server

---

## Step 1: Create Google Cloud Project

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create New Project**
   - Click "Select a project" at the top
   - Click "NEW PROJECT"
   - Project name: `Astegni` (or any name you prefer)
   - Click "CREATE"

3. **Wait for project creation**
   - This may take a few seconds
   - You'll see a notification when ready

---

## Step 2: Enable Google+ API

1. **Navigate to APIs & Services**
   - In left sidebar: APIs & Services → Library
   - Or direct link: https://console.cloud.google.com/apis/library

2. **Enable Required APIs**
   - Search for: **"Google+ API"**
   - Click on it
   - Click **"ENABLE"** button

   - Also enable: **"People API"** (recommended)
   - Search for it and click **"ENABLE"**

---

## Step 3: Configure OAuth Consent Screen

1. **Go to OAuth consent screen**
   - Left sidebar: APIs & Services → OAuth consent screen
   - Or: https://console.cloud.google.com/apis/credentials/consent

2. **Choose User Type**
   - Select: **"External"** (for public app)
   - Click **"CREATE"**

3. **Fill App Information**

   **App information:**
   - App name: `Astegni`
   - User support email: `contact@astegni.com` (or your email)
   - App logo: Upload Astegni logo (optional, 120x120px PNG/JPG)

   **App domain (optional for development):**
   - Application home page: `https://astegni.com`
   - Privacy policy: `https://astegni.com/privacy`
   - Terms of service: `https://astegni.com/terms`

   **Authorized domains:**
   - Add: `astegni.com`
   - Add: `localhost` (for development)

   **Developer contact information:**
   - Email: `contact@astegni.com`

   Click **"SAVE AND CONTINUE"**

4. **Scopes**
   - Click **"ADD OR REMOVE SCOPES"**
   - Select:
     - ✅ `.../auth/userinfo.email`
     - ✅ `.../auth/userinfo.profile`
     - ✅ `openid`
   - Click **"UPDATE"**
   - Click **"SAVE AND CONTINUE"**

5. **Test users (for development)**
   - Add your email address for testing
   - Click **"ADD USERS"**
   - Enter your Gmail address
   - Click **"SAVE AND CONTINUE"**

6. **Summary**
   - Review everything
   - Click **"BACK TO DASHBOARD"**

---

## Step 4: Create OAuth 2.0 Credentials

1. **Go to Credentials**
   - Left sidebar: APIs & Services → Credentials
   - Or: https://console.cloud.google.com/apis/credentials

2. **Create OAuth Client ID**
   - Click **"+ CREATE CREDENTIALS"**
   - Select **"OAuth client ID"**

3. **Configure OAuth Client**

   **Application type:** `Web application`

   **Name:** `Astegni Web Client`

   **Authorized JavaScript origins:**
   ```
   http://localhost:8081
   http://localhost:8080
   https://astegni.com
   https://www.astegni.com
   ```

   **Authorized redirect URIs:**
   ```
   http://localhost:8081
   http://localhost:8080
   https://astegni.com
   https://www.astegni.com
   ```

   Click **"CREATE"**

4. **Save Your Credentials**
   - A popup will show your credentials
   - **Client ID**: `1234567890-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com`
   - **Client Secret**: `GOCSPX-AbCdEfGhIjKlMnOpQrStUvWxYz`

   ⚠️ **IMPORTANT**: Copy these now! You'll need them for the next step.

   Click **"OK"**

---

## Step 5: Configure Astegni Backend

1. **Open `.env` file**
   - Location: `astegni-backend/.env`

2. **Add Google OAuth credentials**

   Replace these lines:
   ```env
   GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_google_client_secret_here
   GOOGLE_REDIRECT_URI=http://localhost:8081
   ```

   With your actual credentials:
   ```env
   GOOGLE_CLIENT_ID=1234567890-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-AbCdEfGhIjKlMnOpQrStUvWxYz
   GOOGLE_REDIRECT_URI=http://localhost:8081
   ```

3. **Save the file**

---

## Step 6: Restart Astegni Backend

1. **Stop the backend server**
   - Press `Ctrl+C` in the terminal running `python app.py`

2. **Start it again**
   ```bash
   cd astegni-backend
   python app.py
   ```

3. **Verify Google OAuth is configured**
   - You should see logs indicating successful startup
   - No errors related to Google OAuth

---

## Step 7: Test Google Sign-In

### Test on Development Server

1. **Start frontend server**
   ```bash
   python dev-server.py
   ```
   - Frontend: http://localhost:8081

2. **Open Astegni**
   - Go to: http://localhost:8081

3. **Click Login**
   - Click **"Login"** button in navbar
   - Login modal should appear

4. **Click "Continue with Google"**
   - Blue Google button should appear
   - Click it

5. **Google Sign-In Popup**
   - Google account selection popup should appear
   - Choose your Google account
   - Click **"Continue"** or **"Allow"**

6. **Success!**
   - You should be logged in automatically
   - Redirected to your profile page
   - Welcome message should appear

### Test Registration

1. **Click Register**
   - Click **"Register"** button in navbar

2. **Select Role**
   - Choose role: Student, Tutor, Parent, or Advertiser
   - This determines your profile type

3. **Click "Register with Google"**
   - Same Google Sign-In flow
   - Account created automatically

4. **Success!**
   - New account created with Google data
   - Email automatically verified
   - Profile picture imported from Google

---

## Troubleshooting

### Issue: "Google OAuth not configured on server"

**Solution:**
1. Check `.env` file has correct credentials
2. Restart backend server
3. Check backend logs for errors

### Issue: "Invalid Google token"

**Solution:**
1. Verify Client ID matches in Google Console and `.env`
2. Check authorized JavaScript origins in Google Console
3. Clear browser cache and cookies
4. Try incognito mode

### Issue: "redirect_uri_mismatch"

**Solution:**
1. Go to Google Cloud Console → Credentials
2. Edit your OAuth client
3. Add redirect URI: `http://localhost:8081`
4. Save changes
5. Wait 5 minutes for Google to propagate changes

### Issue: Google Sign-In button doesn't appear

**Solution:**
1. Check browser console for JavaScript errors
2. Verify `google-oauth.js` is loaded in index.html
3. Check network tab for blocked requests
4. Disable ad blockers (they sometimes block Google Sign-In)

### Issue: "This app is not verified"

**Solution:**
This is normal for development apps. Click **"Advanced"** → **"Go to Astegni (unsafe)"**

For production:
1. Go through Google's app verification process
2. Submit for review: https://console.cloud.google.com/apis/credentials/consent
3. Can take 4-6 weeks for approval

---

## Production Deployment

### Update .env for Production

```env
GOOGLE_CLIENT_ID=your_production_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_production_client_secret
GOOGLE_REDIRECT_URI=https://astegni.com
```

### Update Google Console

1. Edit OAuth client in Google Console
2. Add production origins:
   ```
   https://astegni.com
   https://www.astegni.com
   ```
3. Add production redirect URIs:
   ```
   https://astegni.com
   https://www.astegni.com
   ```

### Verify App (Production)

For production, submit app for verification:
1. Go to OAuth consent screen
2. Click "PUBLISH APP"
3. Submit for verification
4. Provide required documentation
5. Wait for Google approval (4-6 weeks)

Without verification, users will see "This app is not verified" warning (but can still proceed).

---

## API Endpoints

### Backend Endpoints

**Google OAuth Login/Register:**
```http
POST /api/oauth/google
Content-Type: application/json

{
  "id_token": "eyJhbGciOiJSUzI1NiIs...",
  "role": "student"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": 123,
    "first_name": "John",
    "father_name": "Doe",
    "email": "john.doe@gmail.com",
    "email_verified": true,
    "profile_picture": "https://lh3.googleusercontent.com/...",
    "roles": ["student"],
    "active_role": "student"
  }
}
```

**Get Google Config:**
```http
GET /api/oauth/google/config
```

**Check Status:**
```http
GET /api/oauth/google/status
```

---

## Security Considerations

### Client Secret Protection

⚠️ **NEVER** expose `GOOGLE_CLIENT_SECRET` in frontend code!

- ✅ Stored in backend `.env` file only
- ✅ Only used in backend API endpoints
- ✅ Frontend only sends Google ID token to backend

### Token Validation

All Google ID tokens are verified by the backend:
1. Token signature validated with Google
2. Audience (client ID) checked
3. Expiration time verified
4. Email extraction and validation

### User Data

- Email automatically verified by Google
- Profile pictures loaded from Google's CDN
- No passwords stored for Google OAuth users (random hash generated)
- Users can still add a password later if needed

---

## Features

### Automatic Features

When a user signs in with Google:

1. ✅ **Email Verification**: Automatic (Google verifies)
2. ✅ **Profile Picture**: Imported from Google
3. ✅ **Name Parsing**: Google name → Ethiopian format (First, Father, Grandfather)
4. ✅ **Account Linking**: Existing email? Auto-login. New email? Auto-register.
5. ✅ **Role Selection**: User chooses role during registration
6. ✅ **Token Management**: Same token system as regular login

### User Experience

- One-click sign-in (no password typing)
- Faster registration (pre-filled data from Google)
- Secure authentication (OAuth 2.0 standard)
- Seamless integration with Astegni's multi-role system

---

## Testing Checklist

- [ ] Backend server running with Google OAuth configured
- [ ] Frontend server running
- [ ] Google Cloud project created
- [ ] OAuth consent screen configured
- [ ] OAuth credentials created and added to `.env`
- [ ] Test login with existing Google account
- [ ] Test registration with new Google account
- [ ] Verify email is marked as verified
- [ ] Check profile picture imported correctly
- [ ] Test role selection (student, tutor, parent, advertiser)
- [ ] Verify tokens stored in localStorage
- [ ] Test navigation to profile page after login
- [ ] Test both login and register modals

---

## Support

If you encounter issues:

1. **Check backend logs**: Look for error messages in terminal
2. **Check browser console**: Look for JavaScript errors
3. **Verify credentials**: Double-check `.env` file
4. **Google Console**: Verify OAuth client settings
5. **Network tab**: Check API request/response

For more help:
- Google OAuth Documentation: https://developers.google.com/identity/protocols/oauth2
- Astegni Discord: (coming soon)
- Email: contact@astegni.com

---

## Files Modified/Created

### Backend Files

- ✅ `astegni-backend/google_oauth_endpoints.py` - OAuth endpoints
- ✅ `astegni-backend/app.py` - Router registration
- ✅ `astegni-backend/.env` - Google credentials

### Frontend Files

- ✅ `js/root/google-oauth.js` - Google Sign-In handler
- ✅ `index.html` - Script import
- ✅ `modals/index/login-modal.html` - Google button (already exists)
- ✅ `modals/index/register-modal.html` - Google button (already exists)

### Documentation

- ✅ `GOOGLE-OAUTH-SETUP.md` - This file

---

## Next Steps

After successful setup:

1. **Test thoroughly** in development
2. **Update production `.env`** when deploying
3. **Submit for Google verification** (production only)
4. **Monitor user feedback** on Google Sign-In experience
5. **Consider adding other OAuth providers** (Facebook, Microsoft, etc.)

---

**Setup completed!** 🎉

Users can now sign in with Google on Astegni!
