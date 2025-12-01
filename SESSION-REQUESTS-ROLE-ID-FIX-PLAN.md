# Session Requests Role-Specific ID Fix Plan

## Problem Statement

Currently, the session request system uses `user_id` (from `users` table) instead of **role-specific IDs** (from `student_profiles.id`, `parent_profiles.id`, etc.). This causes issues when a user has multiple roles.

### Current Implementation (WRONG ❌)

```python
# session_request_endpoints.py line 171
cur.execute("""
    INSERT INTO session_requests (
        tutor_id, requester_id, requester_type, ...
    ) VALUES (%s, %s, %s, ...)
""", (
    request.tutor_id,
    current_user['id'],  # ❌ This is user_id, NOT role-specific ID!
    requester_type,
    ...
))
```

### What Should Happen (CORRECT ✅)

```python
# Get role-specific ID from JWT token
role_ids = payload.get("role_ids", {})
active_role = payload.get("role")

# Use role-specific ID based on active role
if active_role == 'student':
    requester_id = role_ids.get('student')  # ✅ student_profiles.id
elif active_role == 'parent':
    requester_id = role_ids.get('parent')   # ✅ parent_profiles.id
else:
    raise HTTPException(400, "Only students/parents can request sessions")

cur.execute("""
    INSERT INTO session_requests (
        tutor_id, requester_id, requester_type, ...
    ) VALUES (%s, %s, %s, ...)
""", (
    request.tutor_id,
    requester_id,  # ✅ Now using role-specific ID!
    requester_type,
    ...
))
```

---

## Where Session Requests Are Used

### 1. **Creating Session Requests**
- **Page:** `find-tutors.html` (clicking "Request Session" on a tutor card)
- **Endpoint:** `POST /api/session-requests`
- **Current User:** Student or Parent
- **What needs fixing:** Use `student_id` or `parent_id` instead of `user_id`

### 2. **Viewing Incoming Requests (Tutor Side)**
- **Page:** `tutor-profile.html` → "Session Requests" panel
- **File:** `js/tutor-profile/session-request-manager.js`
- **Endpoint:** `GET /api/session-requests/tutor`
- **Current User:** Tutor
- **What it does:** Shows requests FROM students/parents TO this tutor
- **Queries:** `WHERE tutor_id = <tutor_profiles.id>` (already correct ✅)
- **Displays:** `requester_id` with `requester_type` - needs to show proper profile

### 3. **Viewing Outgoing Requests (Student/Parent Side)**
- **Page:** `student-profile.html` OR `parent-profile.html`
- **Endpoint:** `GET /api/session-requests/my-requests` (currently line 427-475 in session_request_endpoints.py)
- **Current User:** Student or Parent
- **What it does:** Shows requests FROM this student/parent TO tutors
- **Queries:** `WHERE requester_id = <student_id or parent_id>` ❌ Currently uses user_id!

---

## Database Schema (session_requests table)

```sql
CREATE TABLE session_requests (
    id SERIAL PRIMARY KEY,

    -- Tutor being requested
    tutor_id INTEGER REFERENCES tutor_profiles(id),  -- ✅ Already role-specific

    -- Requester (student or parent)
    requester_id INTEGER,  -- ❌ Currently references users.id, should reference student_profiles.id or parent_profiles.id
    requester_type VARCHAR(20),  -- 'student' or 'parent'

    -- Request details
    package_id INTEGER,
    package_name VARCHAR(255),
    message TEXT,
    student_name VARCHAR(255),
    student_grade VARCHAR(50),
    preferred_schedule TEXT,
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending',

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP
);
```

**The Fix:** `requester_id` should store:
- `student_profiles.id` when `requester_type = 'student'`
- `parent_profiles.id` when `requester_type = 'parent'`

---

## JWT Token Structure (Reference)

After login or role switch, the JWT contains:

```javascript
{
  "sub": 123,              // user_id (users.id)
  "role": "student",       // Active role
  "role_ids": {            // Role-specific profile IDs
    "student": 456,        // student_profiles.id
    "tutor": 789,          // tutor_profiles.id
    "parent": null,        // No parent profile
    "advertiser": null
  },
  "exp": 1234567890
}
```

---

## Files That Need to Be Updated

### Backend Files

#### 1. `astegni-backend/session_request_endpoints.py`

**Changes needed:**

##### a) Update `get_current_user()` function (lines 35-91)
Add extraction of `role_ids` from JWT:

```python
async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        role_ids = payload.get("role_ids", {})  # ✅ ADD THIS
        active_role = payload.get("role")        # ✅ ADD THIS

        # ... rest of code ...

        return {
            "id": row[0],
            "username": row[1],
            # ... existing fields ...
            "role_ids": role_ids,      # ✅ ADD THIS
            "active_role": active_role # ✅ ADD THIS (might already exist)
        }
```

##### b) Update `create_session_request()` (lines 146-192)
Use role-specific ID:

```python
@router.post("/api/session-requests", response_model=dict)
async def create_session_request(
    request: SessionRequestCreate,
    current_user: dict = Depends(get_current_user)
):
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Get active role and role-specific IDs
        active_role = current_user.get('active_role')
        role_ids = current_user.get('role_ids', {})

        # Determine requester type and ID
        if active_role == 'student':
            requester_type = 'student'
            requester_id = role_ids.get('student')
            if not requester_id:
                raise HTTPException(400, "Student profile not found")
        elif active_role == 'parent':
            requester_type = 'parent'
            requester_id = role_ids.get('parent')
            if not requester_id:
                raise HTTPException(400, "Parent profile not found")
        else:
            raise HTTPException(403, "Only students and parents can request sessions")

        # Insert session request
        cur.execute("""
            INSERT INTO session_requests (
                tutor_id, requester_id, requester_type, package_id, package_name,
                message, student_name, student_grade, preferred_schedule,
                contact_phone, contact_email, status
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'pending'
            ) RETURNING id, created_at
        """, (
            request.tutor_id,
            requester_id,  # ✅ NOW USING ROLE-SPECIFIC ID!
            requester_type,
            request.package_id, request.package_name, request.message,
            request.student_name, request.student_grade, request.preferred_schedule,
            request.contact_phone, request.contact_email
        ))

        # ... rest of code ...
```

##### c) Update `get_tutor_session_requests()` (lines 195-263)
Fix JOIN to use role-specific tables:

```python
@router.get("/api/session-requests/tutor", response_model=List[SessionRequestResponse])
async def get_tutor_session_requests(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    # ... validation code ...

    try:
        # Build query that JOINS based on requester_type
        query = """
            SELECT
                sr.id, sr.tutor_id, sr.requester_id, sr.requester_type,
                CASE
                    WHEN sr.requester_type = 'student' THEN
                        (SELECT CONCAT(u.first_name, ' ', u.father_name)
                         FROM student_profiles sp
                         JOIN users u ON sp.user_id = u.id
                         WHERE sp.id = sr.requester_id)
                    WHEN sr.requester_type = 'parent' THEN
                        (SELECT CONCAT(u.first_name, ' ', u.father_name)
                         FROM parent_profiles pp
                         JOIN users u ON pp.user_id = u.id
                         WHERE pp.id = sr.requester_id)
                END as requester_name,
                CASE
                    WHEN sr.requester_type = 'student' THEN
                        (SELECT u.profile_picture
                         FROM student_profiles sp
                         JOIN users u ON sp.user_id = u.id
                         WHERE sp.id = sr.requester_id)
                    WHEN sr.requester_type = 'parent' THEN
                        (SELECT u.profile_picture
                         FROM parent_profiles pp
                         JOIN users u ON pp.user_id = u.id
                         WHERE pp.id = sr.requester_id)
                END as requester_profile_picture,
                sr.package_id, sr.package_name, sr.status, sr.message,
                sr.student_name, sr.student_grade, sr.preferred_schedule,
                sr.contact_phone, sr.contact_email,
                sr.created_at, sr.updated_at, sr.responded_at
            FROM session_requests sr
            WHERE sr.tutor_id = %s
        """

        # ... rest of code ...
```

##### d) Update `get_my_session_requests()` (lines 427-475)
Use role-specific ID for filtering:

```python
@router.get("/api/session-requests/my-requests", response_model=List[SessionRequestResponse])
async def get_my_session_requests(
    current_user: dict = Depends(get_current_user)
):
    """
    Get session requests created by current user (student or parent)
    """
    active_role = current_user.get('active_role')
    role_ids = current_user.get('role_ids', {})

    # Get role-specific ID
    if active_role == 'student':
        requester_id = role_ids.get('student')
        requester_type = 'student'
    elif active_role == 'parent':
        requester_id = role_ids.get('parent')
        requester_type = 'parent'
    else:
        raise HTTPException(403, "Only students and parents have session requests")

    if not requester_id:
        raise HTTPException(400, f"{active_role.capitalize()} profile not found")

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT
                sr.id, sr.tutor_id, sr.requester_id, sr.requester_type,
                CONCAT(u.first_name, ' ', u.father_name) as tutor_name,
                u.profile_picture as tutor_profile_picture,
                sr.package_id, sr.package_name, sr.status, sr.message,
                sr.student_name, sr.student_grade, sr.preferred_schedule,
                sr.contact_phone, sr.contact_email,
                sr.created_at, sr.updated_at, sr.responded_at
            FROM session_requests sr
            LEFT JOIN tutor_profiles tp ON sr.tutor_id = tp.id
            LEFT JOIN users u ON tp.user_id = u.id
            WHERE sr.requester_id = %s AND sr.requester_type = %s
            ORDER BY sr.created_at DESC
        """, (requester_id, requester_type))  # ✅ Using role-specific ID!

        # ... rest of code ...
```

---

### Frontend Files

#### 1. `js/find-tutors/global-functions.js` (or wherever session request is triggered)

Currently might be doing something like this (need to verify):

```javascript
// ❌ WRONG - sending user_id
async function requestSession(tutorId, packageId) {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:8000/api/session-requests', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            tutor_id: tutorId,
            package_id: packageId,
            // ... other fields
        })
    });
}
```

**No change needed!** The backend will extract the role-specific ID from the JWT token automatically.

#### 2. `js/student-profile/` - ADD NEW FILE: `session-requests-manager.js`

Create a new manager to display student's outgoing requests:

```javascript
const StudentSessionRequestsManager = {
    async loadMyRequests() {
        const container = document.getElementById('my-session-requests');
        if (!container) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8000/api/session-requests/my-requests', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to load requests');

            const requests = await response.json();

            // Render requests...
            container.innerHTML = this.renderRequests(requests);
        } catch (error) {
            console.error('Error loading my session requests:', error);
        }
    },

    renderRequests(requests) {
        // Create table/cards showing requests with tutor info, status, etc.
    }
};
```

#### 3. `profile-pages/student-profile.html`

Add a new panel or section to display "My Session Requests":

```html
<!-- Add to student profile panels -->
<div id="session-requests-panel" class="panel-content" style="display: none;">
    <h2>My Session Requests</h2>
    <div id="my-session-requests"></div>
</div>
```

#### 4. `js/parent-profile/` - Similar changes as student

---

## Testing Plan

### 1. **Test with User Having Single Role (Student)**
- Login as student
- Request session from find-tutors page
- Verify `session_requests.requester_id` = `student_profiles.id` (not `users.id`)
- Go to student-profile.html
- Verify "My Requests" panel shows the request

### 2. **Test with User Having Single Role (Parent)**
- Same as above but with parent role

### 3. **Test with User Having Multiple Roles (Student + Parent)**
- Login as student
- Request session → should use `student_profiles.id`
- Switch to parent role
- Request session → should use `parent_profiles.id`
- Verify two separate requests exist with different `requester_id` values
- Switch back to student → only see student requests
- Switch to parent → only see parent requests

### 4. **Test Tutor Side**
- Login as tutor
- Verify incoming requests show correct requester names/pictures
- Verify requests from students and parents display correctly

---

## Summary

**What changes:**
- ✅ `requester_id` in `session_requests` table now stores role-specific IDs
- ✅ Backend extracts `role_ids` from JWT and uses appropriate ID
- ✅ JOINs updated to fetch requester info from correct profile table
- ✅ Student/Parent profiles can view their own requests using role-specific ID

**What stays the same:**
- ✅ `tutor_id` already uses `tutor_profiles.id` (already correct!)
- ✅ Frontend doesn't need major changes (JWT already has role_ids)
- ✅ Database table structure stays same (just data changes)

**Benefits:**
- Users with multiple roles have properly separated request histories
- Data integrity maintained
- Queries are more efficient and accurate
- Future features (favorites, bookmarks) can follow same pattern
