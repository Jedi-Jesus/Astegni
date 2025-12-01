# User vs Admin Authentication Separation Guide

## Overview

The Astegni platform has **two completely separate authentication systems**:

1. **Regular Users** (`users` table)
2. **Admin Users** (`admin_profile` table)

These systems are independent and do not interfere with each other, even if the same email is used in both.

---

## Database Tables

### 1. `users` Table
**Purpose:** Regular platform users (students, tutors, parents, advertisers, etc.)

**Key Fields:**
- `id` - Primary key
- `email` - Email address
- `password_hash` - Hashed password
- `roles` - JSON array of roles (student, tutor, parent, etc.)
- `active_role` - Currently active role
- `first_name`, `father_name`, `grandfather_name`
- `phone`, `username`

**Used By:**
- Index.html login/registration
- All user-facing endpoints

### 2. `admin_profile` Table
**Purpose:** Administrative users with department-based access control

**Key Fields:**
- `id` - Primary key
- `email` - Email address
- `password_hash` - Hashed password
- `departments` - Array of department names
- `position` - Admin position/title
- `first_name`, `father_name`, `grandfather_name`

**Used By:**
- Admin pages (admin-pages/*.html)
- Admin-specific endpoints (/api/admin/*)

---

## Authentication Endpoints

### Regular User Endpoints (from `users` table)

#### Login
```
POST /api/login
```
- Queries: `users` table only
- Returns: User JWT tokens
- Used in: index.html

#### Register
```
POST /api/register
```
- Creates entry in: `users` table only
- Used in: index.html

#### Forgot Password
```
POST /api/forgot-password
Body: { "email": "user@example.com" }
```
- Queries: `users` table only
- Sends OTP to user's email
- Used in: index.html

#### Reset Password
```
POST /api/reset-password
Body: {
  "email": "user@example.com",
  "otp": "123456",
  "new_password": "NewPassword123"
}
```
- Queries: `users` table only
- Updates password in: `users` table
- Auto-login with user tokens
- Used in: index.html

---

### Admin Endpoints (from `admin_profile` table)

#### Admin Login
```
POST /api/admin/login
```
- Queries: `admin_profile` table only
- Returns: Admin JWT tokens (different from user tokens)
- Used in: admin-pages/*.html

#### Admin Password Reset
*Note: Admin password reset endpoints should be implemented separately*
```
POST /api/admin/forgot-password (to be implemented)
POST /api/admin/reset-password (to be implemented)
```

---

## Scenario: Email Exists in Both Tables

### Example:
- Email: `john@example.com`
- Exists in `users` table as a student
- Also exists in `admin_profile` table as an admin

### What Happens:

#### User Login (index.html)
```javascript
// Calls: POST /api/login
// Queries: users table
// Result: Logs in as student user
```
✅ Successfully logs in as **regular user**
❌ Does NOT access admin_profile table

#### Admin Login (admin page)
```javascript
// Calls: POST /api/admin/login
// Queries: admin_profile table
// Result: Logs in as admin
```
✅ Successfully logs in as **admin**
❌ Does NOT access users table

#### Password Reset from index.html
```javascript
// Calls: POST /api/forgot-password
// Queries: users table
// Result: Sends OTP, resets password in users table
```
✅ Resets password in **users table**
❌ Does NOT affect admin_profile password

#### Password Reset from admin page
*Should use separate admin endpoints*
```javascript
// Calls: POST /api/admin/forgot-password
// Queries: admin_profile table
// Result: Resets password in admin_profile table
```
✅ Resets password in **admin_profile table**
❌ Does NOT affect users table password

---

## Code Implementation

### Backend Verification

All user-facing endpoints explicitly query only the `users` table:

#### `/api/login` ([routes.py:232](astegni-backend/app.py modules/routes.py#L232))
```python
# Query users table only, NOT admin_profile
user = db.query(User).filter(User.email == form_data.username).first()
```

#### `/api/forgot-password` ([routes.py:1814](astegni-backend/app.py modules/routes.py#L1814))
```python
# Find user by email - ONLY queries users table, NOT admin_profile
user = db.query(User).filter(User.email == email).first()
```

#### `/api/reset-password` ([routes.py:1899](astegni-backend/app.py modules/routes.py#L1899))
```python
# Find user by email - ONLY queries users table, NOT admin_profile
user = db.query(User).filter(User.email == email).first()
```

### Admin Endpoints

Admin endpoints use separate authentication:

#### `/api/admin/login` ([admin_auth_endpoints.py](astegni-backend/admin_auth_endpoints.py))
```python
# Queries admin_profile table via psycopg connection
cursor.execute("""
    SELECT id, email, password_hash, departments, position, ...
    FROM admin_profile
    WHERE email = %s
""", (email,))
```

---

## JWT Token Differences

### User Tokens
```json
{
  "sub": "123",  // user.id from users table
  "exp": "...",
  // User-specific claims
}
```

### Admin Tokens
```json
{
  "admin_id": "456",  // admin.id from admin_profile table
  "sub": "456",
  "exp": "...",
  // Admin-specific claims
}
```

Different token payloads ensure no cross-authentication is possible.

---

## Frontend Separation

### Regular User Interface (index.html)
- Login modal → `/api/login`
- Register modal → `/api/register`
- Forgot password → `/api/forgot-password`
- Reset password → `/api/reset-password`

**Storage:**
- `localStorage.token` - User access token
- `localStorage.currentUser` - User data from `users` table

### Admin Interface (admin-pages/*.html)
- Admin login → `/api/admin/login`
- Admin pages → `/api/admin/*` endpoints

**Storage:**
- `localStorage.adminToken` - Admin access token
- `localStorage.adminProfile` - Admin data from `admin_profile` table

---

## Security Implications

### Advantages of Separation:
1. **Role Isolation:** Regular users cannot access admin functions
2. **Independent Password Management:** Admin/user passwords are separate
3. **Audit Trail:** Separate tables for user/admin actions
4. **Department-based Access Control:** Only available for admins
5. **Email Enumeration Protection:** Works independently for each system

### Best Practices:
1. Never merge the two authentication systems
2. Use different JWT secret keys for admin/user tokens
3. Implement separate password reset flows
4. Admin tokens should have shorter expiration times
5. Log admin actions separately for security auditing

---

## Troubleshooting

### Issue: "I can't login as admin from index.html"
**Solution:** Admins must use the admin login page, not index.html. The `/api/login` endpoint only works with the `users` table.

### Issue: "My admin password won't reset from index.html"
**Solution:** The forgot password flow in index.html only resets passwords in the `users` table. Admins need a separate admin password reset flow.

### Issue: "Same email, different passwords"
**Solution:** This is expected behavior. The same email can have different passwords in `users` and `admin_profile` tables because they are separate systems.

### Issue: "Changed user password but admin password unchanged"
**Solution:** Correct behavior. User and admin passwords are stored in separate tables and managed independently.

---

## Future Enhancements

### Recommended Admin Features:
1. **Admin Password Reset Flow**
   - `POST /api/admin/forgot-password`
   - `POST /api/admin/reset-password`
   - Separate OTP table or purpose field

2. **Admin Invite System**
   - Already implemented in admin pages
   - Sends invitation emails
   - OTP-based account activation

3. **2FA for Admins**
   - Require 2FA for all admin accounts
   - Separate from user 2FA system

4. **Admin Session Management**
   - Shorter session timeouts
   - Force re-authentication for sensitive actions
   - IP-based restrictions

---

## Summary

| Feature | Regular Users | Admins |
|---------|--------------|--------|
| **Table** | `users` | `admin_profile` |
| **Login Endpoint** | `/api/login` | `/api/admin/login` |
| **Forgot Password** | `/api/forgot-password` | *To be implemented* |
| **Reset Password** | `/api/reset-password` | *To be implemented* |
| **Frontend** | index.html | admin-pages/*.html |
| **Token Storage** | `localStorage.token` | `localStorage.adminToken` |
| **Token Payload** | `{ sub: user.id }` | `{ admin_id: admin.id }` |
| **Access Control** | Role-based | Department-based |

**Key Takeaway:** These are two completely separate authentication systems that do not interfere with each other, ensuring proper separation of concerns and security.
