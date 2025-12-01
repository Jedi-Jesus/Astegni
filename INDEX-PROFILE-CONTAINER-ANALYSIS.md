# Index.html Profile Container - User Roles Analysis

## Summary
✅ **WORKING AS DESIGNED**: The profile-container in index.html IS reading user roles from the users table. The role switcher only displays when users have multiple roles.

## Data Flow

### 1. Backend Login Endpoint
**File:** `astegni-backend/app.py modules/routes.py:222-285`

```python
@router.post("/api/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Query users table only
    user = db.query(User).filter(User.email == form_data.username).first()

    # Returns UserResponse with:
    return TokenResponse(
        user=UserResponse(
            id=user.id,
            first_name=user.first_name,
            father_name=user.father_name,
            roles=user.roles,              # ✅ Array of roles from users table
            active_role=user.active_role,  # ✅ Current active role
            # ... other fields
        )
    )
```

### 2. Frontend Authentication Manager
**File:** `js/root/auth.js:123-206`

The login function correctly extracts and stores roles:

```javascript
async login(email, password) {
    const data = await response.json();

    const formattedUser = {
        id: data.user.id,
        name: `${data.user.first_name} ${data.user.father_name}`,
        roles: data.user.roles,              // ✅ Stored
        active_role: data.user.active_role,  // ✅ Stored
        // ... other fields
    };

    // Save to localStorage
    localStorage.setItem('currentUser', JSON.stringify(formattedUser));
    localStorage.setItem('userRole', data.user.active_role);

    // Update global state
    window.APP_STATE.currentUser = formattedUser;
    window.APP_STATE.userRole = data.user.active_role;
}
```

### 3. Profile Container UI Update
**File:** `js/index/profile-and-authentication.js:140-249`

```javascript
function updateUIForLoggedInUser() {
    // Show profile container
    const profileContainer = document.getElementById('profile-container');
    if (profileContainer) {
        profileContainer.classList.remove('hidden');
        profileContainer.style.display = 'flex';
    }

    // Update user info
    const profileName = document.getElementById('profile-name');
    profileName.textContent = APP_STATE.currentUser.name;

    // Update role switcher if user has multiple roles
    updateRoleSwitcher();  // ✅ Called at line 244
}
```

### 4. Role Switcher Logic
**File:** `js/index/profile-and-authentication.js:6-41`

```javascript
function updateRoleSwitcher() {
    if (!APP_STATE.currentUser || !APP_STATE.currentUser.roles) return;

    const roleSwitcherSection = document.getElementById('role-switcher-section');
    const roleOptions = document.getElementById('role-options');

    // ⚠️ ONLY SHOW IF USER HAS MULTIPLE ROLES
    if (APP_STATE.currentUser.roles.length > 1) {
        roleSwitcherSection.classList.remove('hidden');

        // Populate role options
        APP_STATE.currentUser.roles.forEach(role => {
            const isActive = role === APP_STATE.currentUser.active_role;
            // Create role option button
        });
    } else {
        // Hide role switcher for single-role users
        roleSwitcherSection.classList.add('hidden');
    }
}
```

## Expected Behavior

### User with Single Role (e.g., "student")
- ✅ Profile container appears
- ✅ User name displayed
- ✅ Profile picture shown
- ✅ Active role displayed
- ❌ Role switcher section HIDDEN (by design, only 1 role)

### User with Multiple Roles (e.g., ["student", "tutor"])
- ✅ Profile container appears
- ✅ User name displayed
- ✅ Profile picture shown
- ✅ Active role displayed
- ✅ Role switcher section VISIBLE
- ✅ Can switch between roles

## Session Restoration
**File:** `js/index/init-index.js:4-35`

On page load, the session is restored from localStorage:

```javascript
document.addEventListener("DOMContentLoaded", async () => {
    const savedUser = localStorage.getItem("currentUser");
    const savedRole = localStorage.getItem("userRole");
    const savedToken = localStorage.getItem("token");

    if (savedUser && savedRole && savedToken) {
        APP_STATE.currentUser = JSON.parse(savedUser);  // ✅ Includes roles array
        APP_STATE.userRole = savedRole;
        APP_STATE.isLoggedIn = true;

        // Update UI with cached data
        updateUIForLoggedInUser();  // ✅ This calls updateRoleSwitcher()
    }
});
```

## Verification Steps

To verify roles are loading correctly:

### 1. Login and Check localStorage
```javascript
// Open browser console after login
console.log(JSON.parse(localStorage.getItem('currentUser')));
// Expected output:
// {
//   id: 123,
//   name: "John Doe",
//   roles: ["student"],           // or ["student", "tutor"]
//   active_role: "student",
//   ...
// }
```

### 2. Check APP_STATE
```javascript
// Open browser console
console.log(APP_STATE.currentUser);
// Should show same data as localStorage
```

### 3. Check Profile Container Visibility
```javascript
// Open browser console after login
const container = document.getElementById('profile-container');
console.log(container.classList.contains('hidden'));  // Should be false
console.log(window.getComputedStyle(container).display);  // Should be "flex"
```

### 4. Check Role Switcher Section
```javascript
// Open browser console after login
const roleSwitcher = document.getElementById('role-switcher-section');
console.log(roleSwitcher.classList.contains('hidden'));
// false if user has 2+ roles, true if user has 1 role
```

## Database Schema Reference

The `users` table stores roles as a JSON array:

```sql
-- Users table structure
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100),
    father_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    roles JSON DEFAULT '["student"]',  -- Array of role strings
    active_role VARCHAR(50) DEFAULT 'student',
    -- ... other fields
);
```

Example user data:
```json
{
  "id": 1,
  "first_name": "Ahmed",
  "father_name": "Yohannes",
  "email": "ahmed@example.com",
  "roles": ["student"],
  "active_role": "student"
}
```

User with multiple roles:
```json
{
  "id": 2,
  "first_name": "Sara",
  "father_name": "Desta",
  "email": "sara@example.com",
  "roles": ["student", "tutor", "parent"],
  "active_role": "tutor"
}
```

## Conclusion

The system is working correctly. The profile-container:
1. ✅ Reads from the users table via `/api/login`
2. ✅ Receives `roles` array and `active_role`
3. ✅ Stores data in localStorage and APP_STATE
4. ✅ Displays profile container with user info
5. ✅ Shows role switcher ONLY if user has 2+ roles (by design)

If you want the role switcher to always appear (even with 1 role), you would need to modify the condition in `updateRoleSwitcher()` function.
