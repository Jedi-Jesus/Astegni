# 🔐 Authentication Fix Guide - "Not Authenticated" Error

## ❌ **Problem**
When trying to approve/reject schools, you get:
```
Failed to approve: not authenticated
```

## ✅ **Solution**
You need to **login first** to get an authentication token.

---

## 🎯 **Quick Fix - 3 Methods**

### **Method 1: Login via Browser Console (Fastest)**

1. **Open Browser Console**
   - Press `F12` or `Ctrl+Shift+J`
   - Go to Console tab

2. **Run Login Command**
   ```javascript
   // Login with admin credentials
   fetch('http://localhost:8000/api/login', {
       method: 'POST',
       headers: {'Content-Type': 'application/x-www-form-urlencoded'},
       body: 'username=admin@astegni.com&password=YOUR_PASSWORD_HERE'
   })
   .then(r => r.json())
   .then(data => {
       if (data.access_token) {
           localStorage.setItem('token', data.access_token);
           localStorage.setItem('refreshToken', data.refresh_token);
           localStorage.setItem('user', JSON.stringify(data.user));
           console.log('✅ Login successful!');
           console.log('User:', data.user);
           location.reload(); // Refresh page
       } else {
           console.error('❌ Login failed:', data);
       }
   })
   .catch(err => console.error('❌ Error:', err));
   ```

3. **Replace `YOUR_PASSWORD_HERE`** with the actual admin password

4. **Check Result**
   - Should see: `✅ Login successful!`
   - Page will refresh automatically
   - Now try approve/reject again

---

### **Method 2: Create Admin User (If Password Unknown)**

If you don't know the admin password, create a new admin user:

1. **Create Script: `create_admin.py`**
   ```python
   import os
   from sqlalchemy import create_engine
   from sqlalchemy.orm import sessionmaker
   from dotenv import load_dotenv
   import sys

   sys.path.append(os.path.join(os.path.dirname(__file__), 'app.py modules'))
   from models import User, Base
   from utils import hash_password

   load_dotenv()

   # Database connection
   db_url = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')
   if db_url.startswith('postgresql://'):
       db_url = db_url.replace('postgresql://', 'postgresql+psycopg://')

   engine = create_engine(db_url)
   SessionLocal = sessionmaker(bind=engine)
   db = SessionLocal()

   try:
       # Check if admin exists
       existing = db.query(User).filter(User.email == 'admin@astegni.com').first()

       if existing:
           # Update password
           existing.password_hash = hash_password('Admin@123')
           db.commit()
           print('✅ Admin password updated to: Admin@123')
       else:
           # Create new admin
           admin = User(
               first_name='Admin',
               father_name='System',
               grandfather_name='Astegni',
               email='admin@astegni.com',
               password_hash=hash_password('Admin@123'),
               roles=['admin', 'super_admin'],
               is_verified=True
           )
           db.add(admin)
           db.commit()
           print('✅ Admin user created!')

       print('\n📧 Email: admin@astegni.com')
       print('🔑 Password: Admin@123')

   except Exception as e:
       print(f'❌ Error: {e}')
       db.rollback()
   finally:
       db.close()
   ```

2. **Run Script**
   ```bash
   cd astegni-backend
   python create_admin.py
   ```

3. **Login with credentials:**
   - Email: `admin@astegni.com`
   - Password: `Admin@123`

---

### **Method 3: Use Postman/curl to Test**

1. **Login via curl**
   ```bash
   curl -X POST "http://localhost:8000/api/login" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "username=admin@astegni.com&password=Admin@123"
   ```

2. **Copy the `access_token` from response**

3. **Manually set in browser console:**
   ```javascript
   localStorage.setItem('token', 'YOUR_ACCESS_TOKEN_HERE');
   location.reload();
   ```

---

## 🔍 **Verify Authentication Works**

### **Check Token in Console:**
```javascript
// Check if token exists
console.log('Token:', localStorage.getItem('token'));

// Check user data
console.log('User:', JSON.parse(localStorage.getItem('user')));

// Test API call
fetch('http://localhost:8000/api/me', {
    headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
    }
})
.then(r => r.json())
.then(data => console.log('Current User:', data))
.catch(err => console.error('Not authenticated:', err));
```

---

## 🛠️ **Why This Happens**

The school approval/rejection endpoints require admin authentication:

**Backend Code:**
```python
@router.post("/api/schools/approve/{request_id}")
async def approve_school_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # ← Requires auth
):
    # Check if user is admin
    if "admin" not in current_user.roles:  # ← Must have admin role
        raise HTTPException(status_code=403, detail="Only admins can approve schools")

    # ... approval logic
```

**Frontend sends token:**
```javascript
static getHeaders() {
    const token = localStorage.getItem('token');  // ← Gets from localStorage
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''  // ← Sends in header
    };
}
```

---

## ✅ **After Login - How to Verify**

1. **Check localStorage has token:**
   ```javascript
   localStorage.getItem('token')  // Should return a long JWT string
   ```

2. **Network tab shows Authorization header:**
   - Open DevTools → Network
   - Click approve/reject
   - Check request headers
   - Should see: `Authorization: Bearer eyJhbGc...`

3. **No more "not authenticated" errors**

---

## 🚀 **Add Login UI (Optional Future Enhancement)**

For production, you'd add a login page to manage-schools.html:

```html
<!-- Add before dashboard content -->
<div id="login-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white p-8 rounded-lg max-w-md w-full">
        <h2 class="text-2xl font-bold mb-4">Admin Login</h2>
        <form id="login-form" onsubmit="handleLogin(event)">
            <input type="email" id="login-email" placeholder="Email" class="w-full p-3 border rounded mb-3">
            <input type="password" id="login-password" placeholder="Password" class="w-full p-3 border rounded mb-4">
            <button type="submit" class="w-full bg-blue-500 text-white py-3 rounded hover:bg-blue-600">
                Login
            </button>
        </form>
    </div>
</div>

<script>
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch('http://localhost:8000/api/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
        });

        const data = await response.json();

        if (data.access_token) {
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('refreshToken', data.refresh_token);
            localStorage.setItem('user', JSON.stringify(data.user));
            document.getElementById('login-modal').classList.add('hidden');
            location.reload();
        } else {
            alert('Login failed: ' + (data.detail || 'Unknown error'));
        }
    } catch (error) {
        alert('Login error: ' + error.message);
    }
}

// Check if logged in on page load
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('token');
    if (!token) {
        document.getElementById('login-modal').classList.remove('hidden');
    }
});
</script>
```

---

## 📝 **Summary**

**Problem:** No authentication token in localStorage
**Solution:** Login first to get token
**Quickest Fix:** Use browser console to login (Method 1)

**Default Admin Credentials:**
- Email: `admin@astegni.com`
- Password: (Ask system admin or use Method 2 to reset)

After login, all approve/reject/suspend operations will work! 🎉
