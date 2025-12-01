# Navigation Testing Guide

## How to Test Quick Actions Navigation

### 1. **Test Without Login** (Should prompt login)
   - Open `admin-pages/index.html` in browser
   - Click any Quick Action button
   - **Expected**: Login modal should appear with warning notification
   - **Console should show**:
     ```
     requireAuth called with page: manage-campaigns.html
     Is authenticated: false
     ```

### 2. **Test With Login** (Should navigate to page)

   #### Option A: Manual Login
   - Click "Login" button in header
   - Enter any email (e.g., `admin@astegni.com`)
   - Enter password with 6+ characters (e.g., `password123`)
   - Click "Login to Dashboard"
   - **Expected**: User controls appear, lock icons disappear

   #### Option B: Direct localStorage Setup (for quick testing)
   - Open browser console (F12)
   - Run:
     ```javascript
     localStorage.setItem('adminAuth', 'true');
     localStorage.setItem('adminUser', JSON.stringify({
       email: 'admin@test.com',
       name: 'Admin',
       role: 'admin'
     }));
     location.reload();
     ```

   #### After Login:
   - Click any Quick Action button
   - **Expected**: Navigate to respective admin page
   - **Console should show**:
     ```
     requireAuth called with page: manage-campaigns.html
     Is authenticated: true
     Navigating to: manage-campaigns.html
     navigateToPage called with: manage-campaigns.html
     ```

### 3. **Verify All Quick Actions Navigate Correctly**

| Button | Expected Navigation |
|--------|-------------------|
| Manage Campaigns | `manage-campaigns.html` |
| Manage Courses | `manage-courses.html` |
| Manage Schools | `manage-schools.html` |
| Manage Tutors | `manage-tutors.html` |
| Manage Customers | `manage-customers.html` |
| Manage Uploads | `manage-uploads.html` |
| System Settings | `manage-system-settings.html` |

### 4. **Troubleshooting**

If navigation doesn't work:

1. **Check Console Errors**: Open browser console (F12) and look for errors
2. **Verify Authentication**: Run in console:
   ```javascript
   console.log('Auth:', localStorage.getItem('adminAuth'));
   console.log('User:', localStorage.getItem('adminUser'));
   ```
3. **Test Function Availability**: Run in console:
   ```javascript
   console.log('requireAuth:', typeof window.requireAuth);
   console.log('navigateToPage:', typeof window.navigateToPage);
   ```
   Should show "function" for both

4. **Clear Cache**: Hard refresh (Ctrl+F5) or clear browser cache

5. **Check Script Loading**: Verify in Network tab that `js/auth.js` loads successfully

## Fixed Issues

✅ All Quick Action buttons now call `requireAuth('page-name.html')`
✅ `requireAuth()` checks authentication and navigates if logged in
✅ All functions exposed globally via `window.*` for onclick handlers
✅ Console logging added for debugging
✅ Navigation uses `window.location.href` for actual page navigation

## Test Default Login Credentials

- **Email/Username**: Any email or username
- **Password**: Any password with 6+ characters (e.g., `password123`)
- **Admin Code** (for registration): `ADMIN2025`
