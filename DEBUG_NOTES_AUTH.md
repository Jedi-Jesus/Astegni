# Debug Notes Authentication Issue

## Problem
Getting "Please log in to save notes" even though you're logged in.

## Debug Steps

### Step 1: Check if Token Exists

Open browser console (F12) on the tutor-profile page and run:

```javascript
// Check for token
const token = localStorage.getItem('token');
const accessToken = localStorage.getItem('access_token');

console.log('token:', token ? 'EXISTS' : 'MISSING');
console.log('access_token:', accessToken ? 'EXISTS' : 'MISSING');

if (token) {
  console.log('Token length:', token.length);
  console.log('Token starts with:', token.substring(0, 20) + '...');
}

// List all localStorage keys
console.log('All localStorage keys:', Object.keys(localStorage));
```

**Expected:** Should show token EXISTS

**If token is MISSING:**
- You need to log out and log in again
- Go to index.html → Log in with your credentials
- Return to tutor-profile.html

### Step 2: Decode JWT Token

```javascript
// Decode JWT to see what's inside
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

const token = localStorage.getItem('token') || localStorage.getItem('access_token');
if (token) {
  const payload = parseJwt(token);
  console.log('JWT Payload:', payload);
  console.log('User ID:', payload.sub);
  console.log('Current Role:', payload.role);
  console.log('Role IDs:', payload.role_ids);

  // Check if token is expired
  const exp = payload.exp * 1000; // Convert to milliseconds
  const now = Date.now();
  console.log('Token expires:', new Date(exp));
  console.log('Is expired?', now > exp);
}
```

**Expected:**
- Should show `role: "tutor"` (or your current role)
- Should show `role_ids` with your profile IDs
- Should NOT be expired

**If token is expired:**
- Log out and log in again

### Step 3: Test Backend Auth

```javascript
// Test if backend recognizes your token
const token = localStorage.getItem('token') || localStorage.getItem('access_token');

if (token) {
  fetch('http://localhost:8000/api/me', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(r => {
    console.log('Auth test status:', r.status);
    return r.json();
  })
  .then(data => {
    console.log('Current user:', data);
  })
  .catch(err => {
    console.error('Auth test failed:', err);
  });
}
```

**Expected:** Status 200 with your user data

**If status is 401:**
- Token is invalid or expired
- Need to log in again

### Step 4: Check Profile Context

```javascript
// Check if user has profile for current role
const token = localStorage.getItem('token') || localStorage.getItem('access_token');

if (token) {
  // Get current user
  fetch('http://localhost:8000/api/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(r => r.json())
  .then(user => {
    console.log('User ID:', user.id);
    console.log('Active Role:', user.active_role);

    // Get role-specific info
    fetch('http://localhost:8000/api/my-roles', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(r => r.json())
    .then(roles => {
      console.log('User roles:', roles);
      console.log('Has tutor profile?', roles.some(r => r.role === 'tutor'));
    });
  });
}
```

**Expected:** Should show you have a tutor profile

**If no tutor profile:**
- You need to create a tutor profile first
- Go to your profile settings

### Step 5: Test Notes API Directly

```javascript
// Try creating a test note directly
const token = localStorage.getItem('token') || localStorage.getItem('access_token');

if (token) {
  fetch('http://localhost:8000/api/notes/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'Debug Test Note',
      content: '<p>Testing...</p>',
      word_count: 1
    })
  })
  .then(async response => {
    console.log('Create note status:', response.status);
    const data = await response.json();
    console.log('Response:', data);

    if (!response.ok) {
      console.error('Create note failed!');
      if (response.status === 401) {
        console.error('  → Authentication failed');
      } else if (response.status === 500) {
        console.error('  → Server error - check backend logs');
      }
    } else {
      console.log('✅ Note created successfully!');
      console.log('  profile_id:', data.profile_id);
      console.log('  profile_type:', data.profile_type);
    }

    return data;
  })
  .catch(err => {
    console.error('Request failed:', err);
  });
}
```

**Expected:** Status 201 with new note data

**Common Errors:**

**401 Unauthorized:**
- Token is invalid or expired
- Solution: Log out and log in again

**500 Server Error with "profile_id is None":**
- User doesn't have a profile for current role
- Check backend logs for: `[get_current_user] Profile context: profile_type=..., profile_id=None`
- Solution: Ensure user has a tutor profile created

**500 Server Error with "User object has no attribute 'profile_id'":**
- Backend utils.py wasn't updated correctly
- Solution: Restart backend server

### Step 6: Check Backend Logs

While testing, watch the backend console for these log messages:

```
[get_current_user] User 1 current_role from token: tutor
[get_current_user] User 1 role_ids from token: {'tutor': '3', 'student': '5'}
[get_current_user] Converted role_ids: {'tutor': 3, 'student': 5}
[get_current_user] Profile context: profile_type=tutor, profile_id=3
```

**If profile_id is None:**
- User doesn't have a profile for that role
- Need to create the profile first

## Quick Fix

If you're seeing "Please log in" but you ARE logged in:

1. **Clear cache and reload:**
   - Press Ctrl+Shift+R (hard reload)
   - Or clear browser cache

2. **Re-login:**
   - Log out completely
   - Go to index.html
   - Log in again with: `jediael.s.abebe@gmail.com` / `@JesusJediael1234`

3. **Check you have a tutor profile:**
   - If you're on tutor-profile.html, ensure you created a tutor profile
   - Check backend logs to confirm profile_id is set

## Updated Code

The frontend code has been updated to:
- ✅ Try both `token` and `access_token` localStorage keys
- ✅ Log detailed error messages to console
- ✅ Show which localStorage keys exist

Try creating a note now and check the browser console for detailed error messages!
