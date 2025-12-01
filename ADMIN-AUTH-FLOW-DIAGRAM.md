# Admin Authentication Flow Diagram

## Login Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    USER OPENS ADMIN DASHBOARD                        │
│                  http://localhost:8080/admin-pages/                 │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│             PAGE LOAD - Session Restoration Check                    │
│  (admin-pages/js/auth.js - DOMContentLoaded event)                  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                ┌──────────────┴───────────────┐
                │                              │
        Check localStorage:                    │
        - token exists?                        │
        - currentUser exists?                  │
                │                              │
    ┌───────────┴───────────┐                 │
    ▼                       ▼                 ▼
  YES                      NO           Show Login Buttons
    │                       │           (Not authenticated)
    │                       │
    │                       └──────────► User clicks "Login"
    │                                          │
    ▼                                          ▼
Parse user data                     ┌──────────────────────────┐
Check: user.roles.includes('admin') │   LOGIN MODAL APPEARS    │
    │                               └──────────┬───────────────┘
    ├─── YES ──► Auto-login                    │
    │            Show user controls            │
    └─── NO ──► Show login buttons             ▼
                                    ┌──────────────────────────┐
                                    │ User enters credentials: │
                                    │ - Email/Username         │
                                    │ - Password               │
                                    │ - Remember me (optional) │
                                    └──────────┬───────────────┘
                                               │
                                               ▼
                                    ┌──────────────────────────┐
                                    │  Frontend Validation     │
                                    │  - Email not empty?      │
                                    │  - Password not empty?   │
                                    └──────────┬───────────────┘
                                               │
                                    ┌──────────┴──────────┐
                                    │                     │
                            VALID ──┤                     ├── INVALID
                                    │                     │
                                    ▼                     ▼
                         ┌─────────────────────┐   Show error message
                         │  API CALL TO BACKEND│   (red text under field)
                         │                     │   Form shake animation
                         │ POST /api/login     │
                         │ username=email      │
                         │ password=password   │
                         └─────────┬───────────┘
                                   │
                 ┌─────────────────┴──────────────────┐
                 │                                    │
        ┌────────▼─────────┐              ┌──────────▼────────┐
        │  Backend Returns │              │  Backend Returns  │
        │   200 OK + Data  │              │  401/400 Error    │
        └────────┬─────────┘              └──────────┬────────┘
                 │                                    │
                 ▼                                    ▼
    ┌─────────────────────────┐          Show error message:
    │ Response contains:      │          "Invalid credentials"
    │ - access_token          │          Form shake animation
    │ - refresh_token         │          Button returns to normal
    │ - user object           │
    │   - id, name, email     │
    │   - roles: ['admin']    │
    │   - active_role: 'admin'│
    └─────────┬───────────────┘
              │
              ▼
    ┌─────────────────────────┐
    │  Admin Role Check       │
    │  user.roles.includes?   │
    └─────────┬───────────────┘
              │
    ┌─────────┴─────────┐
    │                   │
  YES                  NO
    │                   │
    ▼                   ▼
┌──────────┐    Show error:
│ SUCCESS! │    "Access denied. Admin role required."
└────┬─────┘    Button returns to normal
     │
     ▼
┌─────────────────────────────────────────┐
│        SAVE TO LOCALSTORAGE             │
│                                         │
│ token → JWT access token                │
│ access_token → JWT access token         │
│ refresh_token → JWT refresh token       │
│ currentUser → Full user object          │
│ userRole → 'admin'                      │
│ adminAuth → 'true'                      │
│ adminUser → { email, name, role }       │
│                                         │
│ (if remember checked)                   │
│ rememberAdmin → 'true'                  │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│          UPDATE UI                      │
│                                         │
│ ✅ Close modal                          │
│ ✅ Hide login/register buttons          │
│ ✅ Show user controls                   │
│ ✅ Display admin name in header         │
│ ✅ Hide lock icons on action buttons    │
│ ✅ Update welcome message               │
│ ✅ Show notification: "Login successful"│
└─────────────────────────────────────────┘
```

---

## Registration Flow

```
┌─────────────────────────────────────────┐
│   User clicks "Register" button         │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│      REGISTRATION MODAL APPEARS         │
│                                         │
│ Fields:                                 │
│ - Full Name                             │
│ - Email Address                         │
│ - Password                              │
│ - Confirm Password                      │
│ - Admin Code                            │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│      Frontend Validation                │
│                                         │
│ ✓ Name at least 2 characters            │
│ ✓ Email valid format                    │
│ ✓ Password at least 8 characters        │
│ ✓ Passwords match                       │
│ ✓ Admin code = "ADMIN2025"              │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┴──────────┐
        │                    │
    VALID                INVALID
        │                    │
        ▼                    ▼
┌──────────────┐    Show field errors
│ Split Name   │    (red text below each field)
│ into:        │    Form shake animation
│ first_name   │
│ father_name  │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────────┐
│      API CALL TO BACKEND                │
│                                         │
│ POST /api/register                      │
│ Content-Type: application/json          │
│                                         │
│ Body:                                   │
│ {                                       │
│   "first_name": "Test",                 │
│   "father_name": "Admin",               │
│   "email": "test@example.com",          │
│   "password": "password123",            │
│   "role": "admin"                       │
│ }                                       │
└─────────────────┬───────────────────────┘
                  │
     ┌────────────┴─────────────┐
     │                          │
     ▼                          ▼
┌──────────┐           ┌─────────────┐
│ SUCCESS  │           │   ERROR     │
│ 200 OK   │           │ 400/409     │
└────┬─────┘           └──────┬──────┘
     │                        │
     │                        ▼
     │              Show error message:
     │              - "Email already exists"
     │              - "Registration failed"
     │              Form shake animation
     │
     ▼
┌─────────────────────────────────────────┐
│   USER CREATED IN DATABASE              │
│                                         │
│ Backend returns:                        │
│ - access_token (JWT)                    │
│ - refresh_token (JWT)                   │
│ - user object with admin role           │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│   SAVE TO LOCALSTORAGE (same as login)  │
│   + AUTO-LOGIN USER                     │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│          UPDATE UI                      │
│                                         │
│ ✅ Close modal                          │
│ ✅ Show user controls                   │
│ ✅ Display admin name                   │
│ ✅ Show notification:                   │
│    "Account created successfully!"      │
└─────────────────────────────────────────┘
```

---

## Logout Flow

```
┌─────────────────────────────────────────┐
│   User clicks profile dropdown          │
│   then clicks "Logout"                  │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│      API CALL TO BACKEND                │
│                                         │
│ POST /api/logout                        │
│ Authorization: Bearer {token}           │
└─────────────────┬───────────────────────┘
                  │
                  ▼
       (Backend invalidates token)
       (Optional - depends on backend impl)
                  │
                  ▼
┌─────────────────────────────────────────┐
│   CLEAR ALL LOCALSTORAGE                │
│                                         │
│ ❌ token                                │
│ ❌ access_token                         │
│ ❌ refresh_token                        │
│ ❌ currentUser                          │
│ ❌ userRole                             │
│ ❌ adminAuth                            │
│ ❌ adminUser                            │
│ ❌ rememberAdmin                        │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│          UPDATE UI                      │
│                                         │
│ ✅ Hide user controls                   │
│ ✅ Show login/register buttons          │
│ ✅ Show lock icons on action buttons    │
│ ✅ Reset welcome message                │
│ ✅ Show notification:                   │
│    "You have been logged out"           │
└─────────────────────────────────────────┘
```

---

## Data Storage (localStorage)

### After Successful Login/Registration

```javascript
localStorage = {
  // JWT Tokens
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",

  // User Data
  "currentUser": "{
    \"id\": 1,
    \"first_name\": \"Admin\",
    \"father_name\": \"System\",
    \"email\": \"admin@astegni.com\",
    \"roles\": [\"admin\", \"super_admin\"],
    \"active_role\": \"admin\",
    \"profile_picture\": null,
    \"is_active\": true,
    \"email_verified\": true
  }",

  // Role Info
  "userRole": "admin",

  // Admin-specific (for backward compatibility)
  "adminAuth": "true",
  "adminUser": "{
    \"email\": \"admin@astegni.com\",
    \"name\": \"Admin System\",
    \"role\": \"admin\",
    \"loginTime\": \"2025-01-15T10:30:00.000Z\"
  }",

  // Optional
  "rememberAdmin": "true"  // if "Remember me" checked
}
```

### After Logout

```javascript
localStorage = {
  // All auth-related keys removed
  // Only non-auth data remains (theme, preferences, etc.)
}
```

---

## Error Handling

```
API Call
   │
   ▼
┌──────────────────────────────────────┐
│  Response Status Check               │
└──────────────┬───────────────────────┘
               │
   ┌───────────┴──────────┐
   │                      │
 200 OK              400/401/500
   │                      │
   ▼                      ▼
SUCCESS          ┌─────────────────────┐
   │             │  Parse error.detail │
   │             │  or use default     │
   │             └──────────┬──────────┘
   │                        │
   │                        ▼
   │             ┌─────────────────────┐
   │             │ Show error message: │
   │             │ - Below field       │
   │             │ - Red border        │
   │             │ - Shake animation   │
   │             └──────────┬──────────┘
   │                        │
   │                        ▼
   │             ┌─────────────────────┐
   │             │ Reset button state: │
   │             │ - Remove spinner    │
   │             │ - Enable button     │
   │             │ - Restore text      │
   │             └─────────────────────┘
   │
   ▼
Continue with success flow
```

---

## Key Components

### Files Involved

1. **[admin-pages/index.html](../admin-pages/index.html)**
   - Login/register modal HTML
   - Dashboard layout
   - Action buttons

2. **[admin-pages/js/auth.js](../admin-pages/js/auth.js)**
   - Authentication logic
   - API calls
   - Session management
   - UI updates

3. **Backend API Endpoints:**
   - `POST /api/login` - Validate credentials, return JWT
   - `POST /api/register` - Create user, return JWT
   - `POST /api/logout` - Invalidate token (optional)

### Backend Database

```sql
-- users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100),
    father_name VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    roles JSON,  -- ["admin", "super_admin"]
    active_role VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP,
    ...
);
```

---

## Security Layers

```
┌─────────────────────────────────────────┐
│  Layer 1: Frontend Validation           │
│  - Email format                         │
│  - Password length                      │
│  - Admin code check                     │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Layer 2: Backend Authentication        │
│  - Password hashing (bcrypt)            │
│  - Database validation                  │
│  - JWT token generation                 │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Layer 3: Role-Based Access Control     │
│  - Check user.roles includes 'admin'    │
│  - Verify token on protected routes     │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Layer 4: Token Expiry                  │
│  - Access token: 30 minutes             │
│  - Refresh token: 7 days                │
│  - Auto-refresh mechanism               │
└─────────────────────────────────────────┘
```

---

**Visual Guide Complete!** Use this to understand the complete authentication flow.
