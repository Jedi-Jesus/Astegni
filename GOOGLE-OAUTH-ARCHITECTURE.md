# Google OAuth Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ASTEGNI PLATFORM                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐              ┌───────────────────┐            │
│  │   FRONTEND       │              │   BACKEND         │            │
│  │  (index.html)    │              │   (FastAPI)       │            │
│  │                  │              │                   │            │
│  │  - Login Modal   │◄────────────►│  - OAuth Router   │            │
│  │  - Register Modal│              │  - Token Verify   │            │
│  │  - Google Button │              │  - User Creation  │            │
│  │                  │              │                   │            │
│  │  google-oauth.js │              │  google_oauth_    │            │
│  │  - Initialize    │              │  endpoints.py     │            │
│  │  - Handle Login  │              │                   │            │
│  │  - Store Tokens  │              │                   │            │
│  └────────┬─────────┘              └─────────┬─────────┘            │
│           │                                  │                       │
│           │                                  │                       │
└───────────┼──────────────────────────────────┼───────────────────────┘
            │                                  │
            │                                  │
            ▼                                  ▼
   ┌────────────────┐              ┌────────────────────┐
   │  GOOGLE APIs   │              │  DATABASE          │
   │                │              │                    │
   │  - Sign-In API │              │  - users           │
   │  - Token Info  │              │  - student_profiles│
   │  - User Info   │              │  - tutor_profiles  │
   └────────────────┘              │  - parent_profiles │
                                   └────────────────────┘
```

---

## Component Breakdown

### 1. Frontend Components

**Files:**
- `index.html` - Imports Google OAuth script
- `js/root/google-oauth.js` - Google OAuth handler class
- `modals/index/login-modal.html` - Login UI with Google button
- `modals/index/register-modal.html` - Register UI with Google button

**Responsibilities:**
1. Load Google Sign-In JavaScript library
2. Initialize Google OAuth client
3. Handle "Continue with Google" button clicks
4. Receive Google ID token
5. Send token to backend
6. Store access/refresh tokens
7. Navigate to profile page

**Key Functions:**
```javascript
// Initialize Google OAuth
await googleOAuthManager.initialize()

// Trigger sign-in popup
window.socialLogin('google')

// Handle Google response (automatic)
handleCredentialResponse(response)

// Send to backend
authenticateWithBackend(idToken, role)
```

---

### 2. Backend Components

**Files:**
- `astegni-backend/google_oauth_endpoints.py` - OAuth endpoints
- `astegni-backend/app.py` - Router registration
- `astegni-backend/.env` - Google credentials

**Responsibilities:**
1. Receive Google ID token from frontend
2. Verify token with Google
3. Extract user information
4. Check if user exists (by email)
5. Login existing user OR register new user
6. Create role-specific profile
7. Generate Astegni access + refresh tokens
8. Return tokens and user data

**Key Functions:**
```python
# Verify Google token
verify_google_token(id_token) -> dict

# Parse name to Ethiopian format
parse_ethiopian_name(google_name) -> dict

# Create role profile
create_profile_for_role(db, user_id, role) -> int

# Main endpoint
@router.post("/api/oauth/google")
async def google_oauth_login(...)
```

---

## Data Flow Diagram

### Registration Flow (New User)

```
┌─────────┐
│  USER   │
└────┬────┘
     │ 1. Clicks "Register with Google"
     ▼
┌──────────────────┐
│  Login Modal     │
│  (Google Button) │
└────┬─────────────┘
     │ 2. Triggers Google Sign-In popup
     ▼
┌──────────────────┐
│  Google Sign-In  │
│  Popup           │
└────┬─────────────┘
     │ 3. User selects Google account
     ▼
┌──────────────────┐
│  Google OAuth    │
│  Server          │
└────┬─────────────┘
     │ 4. Returns ID token (JWT)
     ▼
┌──────────────────────────────────────────────────┐
│  Frontend (google-oauth.js)                      │
│  - Receives: { credential: "eyJhbGci..." }      │
│  - Extracts: id_token                            │
│  - Determines: role (from register form)         │
└────┬─────────────────────────────────────────────┘
     │ 5. POST /api/oauth/google
     │    { id_token, role: "student" }
     ▼
┌──────────────────────────────────────────────────┐
│  Backend (google_oauth_endpoints.py)             │
│  Step 1: Verify token with Google               │
│  Step 2: Extract user info (email, name, pic)   │
│  Step 3: Check if email exists in database      │
│  Step 4: Email NOT found → Register new user    │
│  Step 5: Create user record                     │
│  Step 6: Create role-specific profile           │
│  Step 7: Generate access + refresh tokens       │
└────┬─────────────────────────────────────────────┘
     │ 6. Returns:
     │    {
     │      access_token: "...",
     │      refresh_token: "...",
     │      user: { id, email, roles, ... }
     │    }
     ▼
┌──────────────────────────────────────────────────┐
│  Frontend (google-oauth.js)                      │
│  - Stores tokens in localStorage                │
│  - Updates AuthManager state                    │
│  - Shows success message                        │
│  - Navigates to profile page                    │
└────┬─────────────────────────────────────────────┘
     │ 7. Redirect to profile
     ▼
┌─────────────────┐
│  Student/Tutor  │
│  Profile Page   │
└─────────────────┘
```

---

### Login Flow (Existing User)

```
User → "Continue with Google" → Google Popup → ID Token
  ↓
Frontend sends token to backend
  ↓
Backend verifies with Google
  ↓
Backend finds existing user by email
  ↓
Backend updates profile picture (if changed)
  ↓
Backend generates new tokens
  ↓
Frontend stores tokens
  ↓
User redirected to profile
```

---

## Security Architecture

### Token Flow

```
┌────────────────┐
│  GOOGLE        │
│  - Issues JWT  │
│  - Signs token │
└───────┬────────┘
        │ ID Token (JWT)
        │ Header: { alg: "RS256", kid: "..." }
        │ Payload: { email, name, picture, exp, aud }
        │ Signature: RS256(header + payload, Google's private key)
        ▼
┌──────────────────────┐
│  ASTEGNI BACKEND     │
│  1. Verify signature │
│  2. Check audience   │
│  3. Check expiration │
│  4. Extract claims   │
└───────┬──────────────┘
        │ Verified user data
        │ { email, name, picture, email_verified }
        ▼
┌──────────────────────┐
│  USER DATABASE       │
│  - Create/update user│
│  - Link profiles     │
└───────┬──────────────┘
        │
        ▼
┌──────────────────────┐
│  ASTEGNI JWT         │
│  - access_token      │
│  - refresh_token     │
│  - Signed with       │
│    SECRET_KEY        │
└───────┬──────────────┘
        │
        ▼
┌──────────────────────┐
│  FRONTEND            │
│  - localStorage      │
│  - AuthManager       │
└──────────────────────┘
```

### Security Layers

1. **Google Token Verification**
   - Signature validated with Google's public keys
   - Audience checked (must match our Client ID)
   - Expiration validated
   - Issuer verified (accounts.google.com)

2. **Backend Validation**
   - Token verification endpoint: `https://oauth2.googleapis.com/tokeninfo`
   - Client Secret never exposed to frontend
   - Email verification status checked

3. **Astegni Token Generation**
   - Access token: 30 minutes expiry
   - Refresh token: 7 days expiry
   - Signed with SECRET_KEY
   - Includes role_ids for authorization

4. **Storage**
   - Tokens in localStorage (client-side)
   - No passwords for OAuth users (random hash)
   - Email marked as verified

---

## Database Schema

### User Record (OAuth)

```sql
-- New user created via Google OAuth

users
├── id: 123
├── first_name: "John"          -- From Google name
├── father_name: "Doe"          -- Parsed from Google name
├── grandfather_name: "Doe"     -- Generated/parsed
├── email: "john@gmail.com"     -- From Google (unique)
├── phone: NULL                 -- Google doesn't provide
├── hashed_password: "random"   -- Random hash (OAuth only)
├── roles: ["student"]          -- Selected during registration
├── active_role: "student"
├── profile_picture: "https://lh3.googleusercontent.com/..."
├── email_verified: true        -- Auto-verified by Google
├── is_active: true
└── created_at: "2025-01-15T10:30:00"

student_profiles
├── id: 456                     -- Role-specific ID
├── user_id: 123                -- Links to users table
├── grade_level: NULL           -- To be filled by user
├── subjects: []
└── ...
```

### Linking Google Account to Existing User

If email already exists:
- No new user created
- Existing user logged in
- Profile picture updated (if changed)
- Email verified flag set to true

---

## API Endpoint Details

### POST /api/oauth/google

**Purpose:** Login or register user with Google ID token

**Request:**
```http
POST /api/oauth/google HTTP/1.1
Content-Type: application/json

{
  "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjY...",
  "role": "student"
}
```

**Response (Success):**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 123,
    "first_name": "John",
    "father_name": "Doe",
    "grandfather_name": "Doe",
    "email": "john.doe@gmail.com",
    "phone": null,
    "roles": ["student"],
    "active_role": "student",
    "profile_picture": "https://lh3.googleusercontent.com/a/...",
    "email_verified": true,
    "is_active": true,
    "created_at": "2025-01-15T10:30:00.000Z",
    "role_ids": {
      "student": 456,
      "tutor": null,
      "parent": null,
      "advertiser": null
    }
  }
}
```

**Response (Error):**
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "detail": "Invalid Google token"
}
```

---

### GET /api/oauth/google/config

**Purpose:** Get Google Client ID for frontend initialization

**Response:**
```json
{
  "client_id": "1234567890-abcdef.apps.googleusercontent.com",
  "redirect_uri": "http://localhost:8081"
}
```

---

### GET /api/oauth/google/status

**Purpose:** Check if Google OAuth is configured

**Response:**
```json
{
  "configured": true,
  "client_id_set": true,
  "client_secret_set": true,
  "redirect_uri": "http://localhost:8081"
}
```

---

## Environment Variables

### Backend (.env)

```env
# Required for Google OAuth
GOOGLE_CLIENT_ID=1234567890-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-AbCdEfGhIjKlMnOpQrSt
GOOGLE_REDIRECT_URI=http://localhost:8081

# Also required (existing)
SECRET_KEY=your_jwt_secret_key
REFRESH_SECRET_KEY=your_refresh_secret_key
DATABASE_URL=postgresql://...
```

### Frontend (Automatic)

No configuration needed in frontend code!
- Client ID fetched from backend at runtime
- Google library loaded dynamically
- All configuration server-side

---

## Error Handling

### Frontend Errors

```javascript
// Google library failed to load
if (!window.google) {
  showError("Google Sign-In not available")
}

// User cancelled sign-in
if (notification.isSkippedMoment()) {
  // User closed popup - no action needed
}

// Backend error
catch (error) {
  showError(error.message)
}
```

### Backend Errors

```python
# Invalid token
raise HTTPException(
    status_code=401,
    detail="Invalid Google token"
)

# Token expired
raise HTTPException(
    status_code=401,
    detail="Token has expired"
)

# Wrong audience
raise HTTPException(
    status_code=401,
    detail="Token not issued for this application"
)

# Network error
raise HTTPException(
    status_code=503,
    detail="Failed to verify Google token"
)
```

---

## Testing Strategy

### Unit Tests (Backend)

```python
# Test token verification
def test_verify_google_token():
    # Mock Google API response
    # Verify function extracts correct data

# Test name parsing
def test_parse_ethiopian_name():
    assert parse_ethiopian_name("John Doe") == {
        "first_name": "John",
        "father_name": "Doe",
        "grandfather_name": "Doe"
    }

# Test user creation
def test_create_oauth_user():
    # Create user with Google data
    # Verify profile created
    # Check email_verified = true
```

### Integration Tests

```python
# Test full OAuth flow
def test_google_oauth_registration():
    # Send valid ID token
    # Verify user created
    # Check tokens returned
    # Verify profile created

def test_google_oauth_login():
    # Create existing user
    # Send valid ID token
    # Verify login successful
    # Check tokens returned
```

### Manual Tests

- [ ] Login with existing Google account
- [ ] Register new account with Google
- [ ] Test with different roles
- [ ] Verify email marked as verified
- [ ] Check profile picture imported
- [ ] Test token refresh
- [ ] Test expired Google token
- [ ] Test invalid token

---

## Performance Considerations

### Frontend

- Google library loaded once (cached)
- Lazy initialization (only when needed)
- Minimal JavaScript overhead
- Token stored in localStorage (instant restore)

### Backend

- Google token verification: ~200ms
- Database queries: ~50ms
- Token generation: ~10ms
- **Total response time: ~300ms**

### Optimization Opportunities

1. **Cache Google public keys** (reduce verification time)
2. **Batch database queries** (reduce DB roundtrips)
3. **Use Redis for token storage** (faster than DB)
4. **Implement rate limiting** (prevent abuse)

---

## Future Enhancements

### Phase 1 (Current)
- ✅ Google Sign-In
- ✅ Login/Register flow
- ✅ Email verification
- ✅ Profile picture import

### Phase 2 (Planned)
- [ ] Account linking (link Google to existing password account)
- [ ] Multiple OAuth providers (Facebook, Microsoft, Apple)
- [ ] One Tap sign-in (auto sign-in)
- [ ] Social sharing (share via Google)

### Phase 3 (Future)
- [ ] Google Calendar integration (sync tutor schedules)
- [ ] Google Drive integration (store documents)
- [ ] Google Meet integration (video sessions)
- [ ] Gmail notifications

---

## Monitoring & Logging

### Backend Logs

```python
# Successful login
print(f"[GoogleOAuth] Existing user logged in: {user.email}")

# New registration
print(f"[GoogleOAuth] New user registered via Google: {user.email} as {role}")

# Token verification
print(f"[GoogleOAuth] Token verified for: {email}")

# Errors
print(f"[GoogleOAuth] Token verification failed: {error}")
```

### Frontend Logs

```javascript
// Initialization
console.log('[GoogleOAuth] Initialized successfully')

// Sign-in triggered
console.log('[GoogleOAuth] Received credential response')

// Backend response
console.log('[GoogleOAuth] Authentication successful')

// Errors
console.error('[GoogleOAuth] Authentication error:', error)
```

### Metrics to Track

- OAuth login success rate
- OAuth registration rate
- Average response time
- Error rate by type
- Most common errors
- User role distribution

---

**Architecture complete!** This design ensures secure, scalable, and user-friendly Google OAuth integration for Astegni.
