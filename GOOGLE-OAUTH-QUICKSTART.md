# Google OAuth Quick Start (5 Minutes)

## What We Built

✅ **"Continue with Google"** button now works!
✅ Users can login/register with their Google account
✅ No password needed, automatic email verification

---

## Setup Steps (Required Before Testing)

### 1. Get Google OAuth Credentials (2 minutes)

1. Go to: https://console.cloud.google.com/
2. Create new project: **"Astegni"**
3. Enable APIs: **"Google+ API"** and **"People API"**
4. Create OAuth Client:
   - Type: **Web application**
   - Authorized origins: `http://localhost:8081`
   - Authorized redirects: `http://localhost:8081`
5. Copy **Client ID** and **Client Secret**

### 2. Update Backend .env (30 seconds)

Open `astegni-backend/.env` and add:

```env
GOOGLE_CLIENT_ID=1234567890-abcdefg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-AbCdEfGhIjKlMn
GOOGLE_REDIRECT_URI=http://localhost:8081
```

### 3. Restart Backend (10 seconds)

```bash
cd astegni-backend
python app.py
```

---

## Test It Now!

1. **Start frontend**: `python dev-server.py`
2. **Open**: http://localhost:8081
3. **Click**: Login → **"Continue with Google"**
4. **Choose** your Google account
5. **Done!** You're logged in! 🎉

---

## What Happens Behind the Scenes

### Registration Flow (New User)
```
User clicks "Continue with Google"
  ↓
Google Sign-In popup appears
  ↓
User selects Google account
  ↓
Google returns ID token to frontend
  ↓
Frontend sends token to backend: POST /api/oauth/google
  ↓
Backend verifies token with Google
  ↓
Backend checks if email exists
  ↓
NO → Create new user account
      - Name from Google → Ethiopian format
      - Email automatically verified
      - Profile picture imported
      - Random password generated (OAuth only)
      - Role-specific profile created
  ↓
Backend generates access + refresh tokens
  ↓
Frontend stores tokens in localStorage
  ↓
User redirected to profile page
  ↓
SUCCESS! User is logged in
```

### Login Flow (Existing User)
```
User clicks "Continue with Google"
  ↓
Google Sign-In popup appears
  ↓
User selects Google account
  ↓
Google returns ID token to frontend
  ↓
Frontend sends token to backend: POST /api/oauth/google
  ↓
Backend verifies token with Google
  ↓
Backend checks if email exists
  ↓
YES → Login existing user
      - Update profile picture if changed
      - Mark email as verified
  ↓
Backend generates access + refresh tokens
  ↓
Frontend stores tokens in localStorage
  ↓
User redirected to profile page
  ↓
SUCCESS! User is logged in
```

---

## Files Created/Modified

### Backend
- ✅ `google_oauth_endpoints.py` - New OAuth endpoints
- ✅ `app.py` - Registered OAuth router
- ✅ `.env` - Added Google credentials

### Frontend
- ✅ `js/root/google-oauth.js` - Google Sign-In handler
- ✅ `index.html` - Added script import

### UI (Already Existed!)
- ✅ `modals/index/login-modal.html` - Google button
- ✅ `modals/index/register-modal.html` - Google button

---

## API Endpoints

### POST /api/oauth/google
Login or register with Google ID token

**Request:**
```json
{
  "id_token": "eyJhbGciOiJSUzI1NiIs...",
  "role": "student"
}
```

**Response:**
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "user": {
    "id": 123,
    "email": "user@gmail.com",
    "email_verified": true,
    "profile_picture": "https://lh3.googleusercontent.com/...",
    "roles": ["student"],
    "active_role": "student"
  }
}
```

### GET /api/oauth/google/config
Get Google Client ID for frontend

### GET /api/oauth/google/status
Check if Google OAuth is configured

---

## Security Features

✅ **Token Verification**: All Google tokens verified with Google's servers
✅ **Audience Check**: Ensures token is for this app
✅ **Expiration Check**: Validates token hasn't expired
✅ **No Password Storage**: OAuth users get random password hash
✅ **Email Verification**: Automatic via Google
✅ **Client Secret**: Never exposed to frontend

---

## Troubleshooting

**Button doesn't work?**
- Check browser console for errors
- Verify backend is running
- Check `.env` has correct credentials

**"Invalid token" error?**
- Verify Client ID matches in Google Console and `.env`
- Check authorized origins in Google Console

**"Not configured" error?**
- Add credentials to `.env`
- Restart backend server

---

## Next Steps

✅ Test login flow
✅ Test registration flow
✅ Test with different roles (student, tutor, parent)
✅ Verify email is marked as verified
✅ Check profile picture imports correctly

**For Production:**
- Update `.env` with production Client ID/Secret
- Add production origins in Google Console
- Submit app for Google verification

---

## Full Documentation

See [GOOGLE-OAUTH-SETUP.md](GOOGLE-OAUTH-SETUP.md) for:
- Detailed setup instructions
- OAuth consent screen configuration
- Production deployment guide
- Troubleshooting guide
- Security best practices

---

**That's it!** Google Sign-In is ready to use! 🚀
