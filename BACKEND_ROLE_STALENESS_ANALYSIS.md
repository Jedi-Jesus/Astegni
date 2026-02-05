# Backend Role Staleness - Root Cause Analysis

## Problem

After a successful role switch (e.g., student → tutor), the role reverts back to the old role approximately 15 seconds later. Frontend logs show the role switch API succeeds, localStorage is updated correctly, and grace period protection works initially. However, the role mysteriously reverts after the grace period expires.

## Root Cause Discovered

The issue is **NOT a database transaction problem**. The database is being updated correctly. The issue is a **session caching problem in SQLAlchemy**.

### The Flow

```
T+0ms:    User clicks "Switch to Tutor"
T+100ms:  POST /api/switch-role
          - Fresh user queried from DB
          - fresh_user.active_role = 'tutor'
          - db.commit() succeeds
          - Database now has active_role = 'tutor' ✅
          - Returns new JWT token with role = 'tutor' ✅

T+200ms:  Frontend updates localStorage
          - localStorage.userRole = 'tutor' ✅
          - Grace period flags set ✅

T+300ms:  Navigation to tutor-profile.html

T+400ms:  Page loads
          - AuthManager.restoreSession() runs
          - Grace period detected ✅
          - Forces role to 'tutor' ✅
          - Profile loads successfully ✅

T+10000ms: Grace period expires
          - Flags cleared naturally ✅

T+15000ms: Some script calls fetchCurrentUserData()
          - Calls GET /api/me
          - Uses get_current_user() dependency
          - ❌ RETURNS OLD ROLE FROM SQLALCHEMY CACHE!
          - localStorage.userRole = 'student' (overwritten)
          - Role validation runs
          - Redirect to index.html
```

## Technical Deep Dive

### `/api/me` Endpoint

**File**: `astegni-backend/app.py modules/routes.py` (line 690)

```python
@router.get("/api/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user information"""
    # CRITICAL FIX: Verify active_role is actually active, update if not
    active_role = get_first_active_role(current_user, db)
    if active_role != current_user.active_role:
        current_user.active_role = active_role
        db.commit()
```

The `current_user` object comes from the `get_current_user()` dependency.

### `get_current_user()` Dependency

**File**: `astegni-backend/utils.py` (line 202)

```python
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Get current authenticated user from JWT token"""
    # Decode JWT to get user_id
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    user_id = int(payload.get("sub"))

    # ❌ PROBLEM: Query uses SQLAlchemy session cache!
    user = db.query(User).filter(User.id == user_id).first()

    # This user object may have stale data if it was queried
    # in a previous request within the same connection pool

    return user
```

### The SQLAlchemy Session Cache Problem

SQLAlchemy maintains an **identity map** (session cache) to ensure that within a single session, the same database row always returns the same Python object. This is normally beneficial, but it causes issues across multiple HTTP requests when using connection pooling.

**What Happens:**

1. **Request 1**: `POST /api/switch-role`
   - Gets database session from pool (let's call it `Session A`)
   - Queries user: `user = db.query(User).filter(User.id == 123).first()`
   - Updates: `user.active_role = 'tutor'`
   - Commits: `db.commit()`
   - Session returns to pool
   - SQLAlchemy's identity map in `Session A` now has: `User(id=123, active_role='tutor')`

2. **Request 2**: `GET /api/me` (happens 15 seconds later)
   - Gets a database session from pool (might get `Session A` or a different session)
   - **If it gets a different session (`Session B`)**:
     - `Session B` has no cached user object
     - Fresh query to database
     - Returns correct data: `User(id=123, active_role='tutor')` ✅

   - **If it gets the same session (`Session A`)**:
     - `Session A` still has cached user object in identity map
     - SQLAlchemy checks: "I already have User(id=123) in my cache"
     - Returns cached object WITHOUT querying database
     - Returns stale data: `User(id=123, active_role='student')` ❌

This explains why the bug is **intermittent** and **timing-dependent**!

## Why `/api/switch-role` Works Correctly

Looking at the switch-role endpoint more carefully:

**File**: `astegni-backend/app.py modules/routes.py` (line 3620-3622)

```python
# Force refresh from database to get latest roles (handles race condition with add-role)
# Query fresh user object from database to bypass SQLAlchemy session cache
fresh_user = db.query(User).filter(User.id == current_user.id).first()
```

The endpoint queries the user **again** even though it already has `current_user` from the dependency. This is an attempt to get fresh data, but it **doesn't work reliably** because:

1. It's using the **same session** as `get_current_user()`
2. SQLAlchemy's identity map returns the **same cached object**
3. The "fresh" query doesn't actually hit the database

Then at line 3670:

```python
# Verify the database was actually updated by querying in a NEW session
db.expire_all()  # Clear the session cache
verification_user = db.query(User).filter(User.id == fresh_user.id).first()
```

This calls `db.expire_all()` which clears the identity map and forces a fresh query. This is why the verification succeeds, but it doesn't help subsequent requests that get the old cached object.

## Why The Bug Appears After ~15 Seconds

The grace period masks the problem for 10 seconds. Then around 15 seconds, something in the frontend (likely `fetchCurrentUserData()` in `profile-system.js`) calls `/api/me`, which returns the stale cached user object.

## Solutions

### Solution 1: Expire User Object in `get_current_user()` (RECOMMENDED)

**File**: `astegni-backend/utils.py`

```python
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Get current authenticated user from JWT token"""
    # ... JWT decoding ...

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    # CRITICAL FIX: Expire the user object to force fresh data from database
    # This ensures we always get the latest active_role, especially after role switches
    db.expire(user)
    db.refresh(user)

    # ... rest of function ...
    return user
```

**Why This Works:**
- `db.expire(user)` marks the object as stale
- `db.refresh(user)` forces a fresh query from the database
- Every request gets up-to-date user data
- No session cache issues

**Performance Impact:**
- Adds one extra SELECT query per authenticated request
- Negligible performance impact (user table is indexed by ID)
- Worth it for data consistency

### Solution 2: Use `db.expire_all()` in `/api/switch-role`

**File**: `astegni-backend/app.py modules/routes.py`

```python
@router.post("/api/switch-role")
def switch_user_role(...):
    # ... existing code ...

    # Update active role
    fresh_user.active_role = new_role

    # Commit the change
    db.commit()

    # CRITICAL: Expire ALL objects in this session's identity map
    # This ensures subsequent queries (even in other requests using this session)
    # will get fresh data from the database
    db.expire_all()

    # ... rest of function ...
```

**Why This Helps:**
- Clears the identity map after role update
- Forces fresh queries for this session

**Why This Is NOT Enough:**
- Only clears the current session's cache
- Other sessions in the connection pool still have stale data
- Doesn't solve the problem completely

### Solution 3: Use Scoped Sessions with Request-Level Scope

**File**: `astegni-backend/app.py modules/models.py`

Change from regular `sessionmaker` to `scoped_session`:

```python
from sqlalchemy.orm import scoped_session, sessionmaker

SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))

def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        SessionLocal.remove()  # Remove scoped session
```

**Why This Works:**
- Each request gets its own isolated session
- No session sharing across requests
- Identity map is request-scoped

**Complexity:**
- Requires changing database session management
- More invasive change

## Recommended Implementation

**Use Solution 1** - it's the simplest, most reliable fix with minimal performance impact.

Add `db.expire(user)` and `db.refresh(user)` in `get_current_user()` to ensure every authenticated request gets fresh user data from the database.

## Testing the Fix

1. Log in with multi-role account
2. Switch from student to tutor
3. Wait 15+ seconds on the tutor profile page
4. Check browser DevTools Network tab for `/api/me` calls
5. Verify the response has `active_role: "tutor"`
6. Verify no redirects occur
7. Check backend logs - should see fresh queries for user data

## Files to Modify

- ✅ `astegni-backend/utils.py` (line 224) - Add `db.expire(user)` and `db.refresh(user)` after query
