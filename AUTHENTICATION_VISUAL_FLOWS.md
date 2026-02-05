# ASTEGNI AUTHENTICATION - VISUAL FLOW DIAGRAMS

## Account: jediael.s.abebe@gmail.com Analysis

---

## 🔄 FLOW 1: USER LOGIN

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER LOGIN FLOW                          │
└─────────────────────────────────────────────────────────────────┘

   Frontend                    Backend                   Database
   ────────                    ───────                   ────────
      │                           │                          │
      │  POST /api/login          │                          │
      │  email + password         │                          │
      ├─────────────────────────>│                          │
      │                           │                          │
      │                           │  Query by email          │
      │                           ├────────────────────────>│
      │                           │                          │
      │                           │  User found              │
      │                           │<────────────────────────┤
      │                           │                          │
      │                           │  Verify password         │
      │                           │  (bcrypt.checkpw)        │
      │                           │                          │
      │                           │  Get role_ids:           │
      │                           │  - student: 2            │
      │                           │  - tutor: 1              │
      │                           │  - parent: 3             │
      │                           │  - advertiser: 4         │
      │                           │                          │
      │                           │  Generate JWT tokens:    │
      │                           │  {                       │
      │                           │    sub: 1,               │
      │                           │    role: "student",      │
      │                           │    role_ids: {...}       │
      │                           │  }                       │
      │                           │                          │
      │                           │  Store refresh token     │
      │                           ├────────────────────────>│
      │                           │                          │
      │  200 OK                   │                          │
      │  {                        │                          │
      │    access_token,          │                          │
      │    refresh_token,         │                          │
      │    user: {                │                          │
      │      id: 1,               │                          │
      │      active_role: "student",                         │
      │      roles: [...],        │                          │
      │      role_ids: {...}      │                          │
      │    }                      │                          │
      │  }                        │                          │
      │<─────────────────────────┤                          │
      │                           │                          │
      │  Store in localStorage:   │                          │
      │  - token                  │                          │
      │  - refresh_token          │                          │
      │  - currentUser            │                          │
      │  - userRole: "student"    │                          │
      │                           │                          │
      │  Navigate to:             │                          │
      │  /student-profile.html    │                          │
      │                           │                          │
```

### Database State After Login:
```sql
-- users table
id=1, email='jediael.s.abebe@gmail.com'
roles=['tutor', 'advertiser', 'student', 'parent', 'user']
active_role='student'  ✅

-- refresh_tokens table
token='eyJhbG...', user_id=1, expires_at=7_days_from_now
```

---

## 🔄 FLOW 2: SWITCH ROLE (student → tutor)

```
┌─────────────────────────────────────────────────────────────────┐
│                      ROLE SWITCH FLOW                            │
└─────────────────────────────────────────────────────────────────┘

   Frontend                    Backend                   Database
   ────────                    ───────                   ────────
      │                           │                          │
      │  Currently: student       │                          │
      │  Want to: tutor           │                          │
      │                           │                          │
      │  POST /api/switch-role    │                          │
      │  { role: "tutor" }        │                          │
      ├─────────────────────────>│                          │
      │                           │                          │
      │                           │  Verify user has role    │
      │                           │  "tutor" ∈ roles? ✅     │
      │                           │                          │
      │                           │  UPDATE users            │
      │                           │  SET active_role='tutor' │
      │                           │  WHERE id=1              │
      │                           ├────────────────────────>│
      │                           │                          │
      │                           │  Generate NEW JWT:       │
      │                           │  {                       │
      │                           │    sub: 1,               │
      │                           │    role: "tutor", ⬅ CHANGED
      │                           │    role_ids: {...}       │
      │                           │  }                       │
      │                           │                          │
      │  200 OK                   │                          │
      │  {                        │                          │
      │    access_token: NEW,     │                          │
      │    refresh_token: NEW,    │                          │
      │    active_role: "tutor"   │                          │
      │  }                        │                          │
      │<─────────────────────────┤                          │
      │                           │                          │
      │  Update ALL state:        │                          │
      │  1. localStorage.token    │                          │
      │  2. localStorage.userRole │                          │
      │  3. AuthManager.token     │                          │
      │  4. currentUser.role      │                          │
      │                           │                          │
      │  Set grace period:        │                          │
      │  role_switch_timestamp    │                          │
      │  role_switch_target       │                          │
      │                           │                          │
      │  Navigate to:             │                          │
      │  /tutor-profile.html      │                          │
      │                           │                          │
      ▼                           ▼                          ▼

   Page Load:
      │                           │                          │
      │  Restore session          │                          │
      │  Check grace period       │                          │
      │  (within 10 seconds?)     │                          │
      │  YES ✅                   │                          │
      │  Force role to "tutor"    │                          │
      │                           │                          │
      │  GET /api/me              │                          │
      │  (verify role switch)     │                          │
      ├─────────────────────────>│                          │
      │                           │                          │
      │  { active_role: "tutor" } │                          │
      │<─────────────────────────┤                          │
      │                           │                          │
      │  ✅ Confirmed!            │                          │
```

### Why New JWT Token?
```javascript
// OLD TOKEN (before switch)
{
  "sub": 1,
  "role": "student",  ⬅ Stale
  "role_ids": {...}
}

// NEW TOKEN (after switch)
{
  "sub": 1,
  "role": "tutor",    ⬅ Updated
  "role_ids": {...}
}

// Backend endpoints check token.role for authorization
// Must match database active_role
```

---

## 🔄 FLOW 3: DEACTIVATE ROLE

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEACTIVATE ROLE FLOW                          │
└─────────────────────────────────────────────────────────────────┘

   Frontend                    Backend                   Database
   ────────                    ───────                   ────────
      │                           │                          │
      │  User clicks:             │                          │
      │  "Manage Role" →          │                          │
      │  "Deactivate Advertiser"  │                          │
      │                           │                          │
      │  Modal: Enter password    │                          │
      │  Input: @JesusJediael1234 │                          │
      │                           │                          │
      │  POST /api/role/deactivate│                          │
      │  {                        │                          │
      │    role: "advertiser",    │                          │
      │    password: "..."        │                          │
      │  }                        │                          │
      ├─────────────────────────>│                          │
      │                           │                          │
      │                           │  Verify password         │
      │                           │  bcrypt.checkpw() ✅     │
      │                           │                          │
      │                           │  Check role exists       │
      │                           │  "advertiser" ∈ roles ✅ │
      │                           │                          │
      │                           │  Find profile:           │
      │                           │  SELECT * FROM           │
      │                           │  advertiser_profiles     │
      │                           │  WHERE user_id=1         │
      │                           ├────────────────────────>│
      │                           │                          │
      │                           │  Profile found (ID: 4)   │
      │                           │<────────────────────────┤
      │                           │                          │
      │                           │  UPDATE                  │
      │                           │  advertiser_profiles     │
      │                           │  SET is_active = FALSE   │
      │                           │  WHERE id = 4            │
      │                           ├────────────────────────>│
      │                           │                          │
      │                           │  ✅ DEACTIVATED          │
      │                           │  (data preserved)        │
      │                           │                          │
      │                           │  IF was active_role:     │
      │                           │    SET active_role=NULL  │
      │                           │  (wasn't active in       │
      │                           │   this case)             │
      │                           │                          │
      │  200 OK                   │                          │
      │  {                        │                          │
      │    deactivated_role:      │                          │
      │      "advertiser",        │                          │
      │    new_current_role: null,│                          │
      │    remaining_active_roles:│                          │
      │      ["tutor", "student", │                          │
      │       "parent"]           │                          │
      │  }                        │                          │
      │<─────────────────────────┤                          │
      │                           │                          │
      │  Clear localStorage       │                          │
      │  (if was active)          │                          │
      │                           │                          │
      │  Redirect to:             │                          │
      │  /index.html              │                          │
      │  (user chooses next role) │                          │
      │                           │                          │
```

### Database State After Deactivation:
```sql
-- advertiser_profiles table
id=4, user_id=1, is_active=FALSE  ⬅ DEACTIVATED
company_name='...'  ⬅ DATA PRESERVED
created_at='...'    ⬅ DATA PRESERVED

-- users table
roles=['tutor', 'advertiser', 'student', 'parent', 'user']  ⬅ STILL IN ARRAY
active_role='student'  ⬅ Unchanged (wasn't active)
```

### What Happens in UI:
```javascript
// GET /api/my-roles response:
{
  "user_roles": ["tutor", "student", "parent"],  ⬅ No "advertiser"
  "active_role": "student"
}

// Profile dropdown shows only:
// - Tutor
// - Student
// - Parent
// (Advertiser hidden)
```

---

## ⚠️ FLOW 4: REACTIVATE ROLE (BROKEN)

```
┌─────────────────────────────────────────────────────────────────┐
│                REACTIVATE ROLE FLOW (CURRENT - BROKEN)           │
└─────────────────────────────────────────────────────────────────┘

   Frontend                    Backend                   Database
   ────────                    ───────                   ────────
      │                           │                          │
      │  User wants to            │                          │
      │  reactivate advertiser    │                          │
      │                           │                          │
      │  POST /api/register       │                          │
      │  {                        │                          │
      │    email: "jediael...",   │                          │
      │    password: "...",       │                          │
      │    role: "advertiser"     │                          │
      │  }                        │                          │
      ├─────────────────────────>│                          │
      │                           │                          │
      │                           │  Query user by email     │
      │                           ├────────────────────────>│
      │                           │                          │
      │                           │  User found              │
      │                           │<────────────────────────┤
      │                           │                          │
      │                           │  Check:                  │
      │                           │  "advertiser" ∈ roles?   │
      │                           │  YES ✅                  │
      │                           │                          │
      │                           │  ❌ ERROR:               │
      │                           │  User already has role   │
      │                           │                          │
      │                           │  (Doesn't check          │
      │                           │   is_active status!)     │
      │                           │                          │
      │  400 BAD REQUEST          │                          │
      │  {                        │                          │
      │    detail: "User already  │                          │
      │             has advertiser│                          │
      │             role"         │                          │
      │  }                        │                          │
      │<─────────────────────────┤                          │
      │                           │                          │
      │  ❌ REACTIVATION FAILED   │                          │
      │                           │                          │
```

### The Problem:
```python
# In /api/register endpoint (routes.py:215-219)

if existing_user.roles and user_data.role in existing_user.roles:
    raise HTTPException(
        detail=f"User already has {user_data.role} role"
    )
    # ❌ Doesn't check if role is deactivated!
```

### Expected Behavior:
```python
# Should be:

if existing_user.roles and user_data.role in existing_user.roles:
    # Check if role is deactivated
    profile = get_role_profile(existing_user, user_data.role)
    if profile and not profile.is_active:
        # Reactivate!
        profile.is_active = True
        existing_user.active_role = user_data.role
        db.commit()
        return generate_tokens(existing_user)
    else:
        raise HTTPException(detail="User already has active role")
```

---

## 🔄 FLOW 5: TOKEN REFRESH

```
┌─────────────────────────────────────────────────────────────────┐
│                    TOKEN REFRESH FLOW                            │
└─────────────────────────────────────────────────────────────────┘

   Frontend                    Backend                   Database
   ────────                    ───────                   ────────
      │                           │                          │
      │  User browsing...         │                          │
      │  (30 min passes)          │                          │
      │                           │                          │
      │  API request fails:       │                          │
      │  GET /api/me              │                          │
      ├─────────────────────────>│                          │
      │                           │                          │
      │                           │  Decode JWT              │
      │                           │  Check exp: EXPIRED ❌   │
      │                           │                          │
      │  401 UNAUTHORIZED         │                          │
      │<─────────────────────────┤                          │
      │                           │                          │
      │  Intercept 401:           │                          │
      │  Auto-refresh token       │                          │
      │                           │                          │
      │  POST /api/refresh        │                          │
      │  {                        │                          │
      │    refresh_token: "..."   │                          │
      │  }                        │                          │
      ├─────────────────────────>│                          │
      │                           │                          │
      │                           │  Verify refresh token    │
      │                           │  Check in database       │
      │                           ├────────────────────────>│
      │                           │                          │
      │                           │  Token valid ✅          │
      │                           │  Not expired ✅          │
      │                           │<────────────────────────┤
      │                           │                          │
      │                           │  Generate NEW            │
      │                           │  access_token            │
      │                           │  (30 min expiry)         │
      │                           │                          │
      │  200 OK                   │                          │
      │  {                        │                          │
      │    access_token: NEW      │                          │
      │  }                        │                          │
      │<─────────────────────────┤                          │
      │                           │                          │
      │  Update localStorage      │                          │
      │  Update AuthManager       │                          │
      │                           │                          │
      │  RETRY original request:  │                          │
      │  GET /api/me              │                          │
      ├─────────────────────────>│                          │
      │                           │                          │
      │  200 OK ✅                │                          │
      │<─────────────────────────┤                          │
      │                           │                          │
      │  User continues           │                          │
      │  (seamless!)              │                          │
      │                           │                          │
```

### Token Lifecycle:
```
┌──────────────────────────────────────────────────────────┐
│                    TOKEN LIFECYCLE                        │
└──────────────────────────────────────────────────────────┘

  Login/Register
       │
       ▼
  ┌─────────────┐
  │ Access Token│ ───────────────────┐
  │ (30 min)    │                    │
  └─────────────┘                    │
       │                             │
       │ Used for API calls          │
       ▼                             │
  Time passes...                     │
       │                             │
       ▼                             │
  ❌ EXPIRES (30 min)                │
       │                             │
       ▼                             │
  401 UNAUTHORIZED                   │
       │                             │
       ▼                             │
  Auto-refresh triggered ────────────┘
       │
       ▼
  ┌─────────────┐
  │Refresh Token│
  │ (7 days)    │
  └─────────────┘
       │
       ▼
  Still valid? ──YES──> NEW Access Token (30 min)
       │                      │
       NO                     ▼
       │                 Continue using API
       ▼
  Logout / Redirect to login
```

---

## 📊 DATABASE SCHEMA RELATIONSHIPS

```
┌──────────────────────────────────────────────────────────────┐
│                 DATABASE ARCHITECTURE                         │
└──────────────────────────────────────────────────────────────┘

┌─────────────────────┐
│      users          │ ◄──── Main auth table
├─────────────────────┤
│ id: 1               │
│ email: jediael@...  │
│ password_hash       │
│ roles: ARRAY        │ ◄──── ['tutor', 'student', 'parent', ...]
│ active_role: STRING │ ◄──── Current role (e.g., 'student')
│ profile_picture     │ ◄──── Centralized (not in role tables)
│ email_verified      │
│ is_active           │
└─────────────────────┘
         │
         │ user_id FK
         │
    ┌────┴─────┬─────────┬──────────┬──────────────┐
    │          │         │          │              │
    ▼          ▼         ▼          ▼              ▼
┌────────┐ ┌────────┐ ┌───────┐ ┌────────────┐ ┌──────┐
│student_│ │ tutor_ │ │parent_│ │advertiser_ │ │user_ │
│profiles│ │profiles│ │profiles│ │profiles   │ │profiles│
├────────┤ ├────────┤ ├───────┤ ├────────────┤ ├──────┤
│id: 2   │ │id: 1   │ │id: 3  │ │id: 4       │ │N/A   │
│user_id:│ │user_id:│ │user_id│ │user_id: 1  │ │      │
│  1     │ │  1     │ │  : 1  │ │is_active:  │ │      │
│is_     │ │is_     │ │is_    │ │  FALSE ❌  │ │      │
│active: │ │active: │ │active:│ │            │ │      │
│ TRUE ✅│ │ TRUE ✅│ │TRUE ✅│ │            │ │      │
└────────┘ └────────┘ └───────┘ └────────────┘ └──────┘
    │          │          │          │
    │          │          │          │ (deactivated)
    │          │          │          │
    └──────────┴──────────┴──────────┘
              │
              ▼
        Used in JWT:
        {
          "role_ids": {
            "student": 2,
            "tutor": 1,
            "parent": 3,
            "advertiser": 4
          }
        }
```

### Cascade Delete Example:
```sql
-- When role is DELETED (not deactivated):

DELETE FROM tutor_profiles WHERE id = 1;

-- CASCADE deletes:
├─ tutor_reviews (tutor_id FK)
├─ tutor_sessions (tutor_id FK)
├─ tutor_packages (tutor_id FK)
├─ enrolled_students (tutor_id FK)
├─ credentials (tutor_id FK)
└─ ...all related data

-- AND removes from users.roles:
UPDATE users SET roles = ARRAY_REMOVE(roles, 'tutor')
```

---

## 🔐 JWT TOKEN ANATOMY

```
┌──────────────────────────────────────────────────────────────┐
│                   JWT TOKEN STRUCTURE                         │
└──────────────────────────────────────────────────────────────┘

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIx...
│                                       │
│                                       │
▼                                       ▼
HEADER                                PAYLOAD
{                                     {
  "alg": "HS256",                       "sub": 1,         ◄─ User ID (users.id)
  "typ": "JWT"                          "role": "student", ◄─ Active role
}                                       "role_ids": {     ◄─ Profile IDs
                                          "student": 2,
                                          "tutor": 1,
                                          "parent": 3,
                                          "advertiser": 4
                                        },
                                        "exp": 1737820000 ◄─ Expiry (30 min)
                                      }
                                           │
                                           ▼
                                    SIGNATURE
                                    (HMAC-SHA256)
                                    HS256(
                                      base64(header) + "." +
                                      base64(payload),
                                      SECRET_KEY
                                    )

VERIFICATION PROCESS:
1. Decode base64 header + payload
2. Recompute signature with SECRET_KEY
3. Compare signatures → Match? ✅ Valid
4. Check exp timestamp → Not expired? ✅ Valid
5. Extract user_id from "sub" field
6. Query database for user permissions
```

---

**End of Visual Flow Diagrams**
