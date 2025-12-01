# Request Modals - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Run Database Migration
```bash
cd astegni-backend
python migrate_create_course_school_requests.py
```

You should see:
```
✓ Existing tables dropped
✓ course_requests table created successfully
✓ requested_schools table created successfully
✓ Indexes created successfully
✅ Migration completed successfully!
```

### Step 2: Start Backend Server
```bash
# In astegni-backend directory
python app.py
```

Server will start on `http://localhost:8000`

### Step 3: Test It!

**Option A: Use Test Page**
```
http://localhost:8080/test-request-modals.html
```

**Option B: Use Find Tutors Page**
1. Open `http://localhost:8080/branch/find-tutors.html`
2. Click hamburger menu (☰) to open sidebar
3. Scroll to bottom of sidebar
4. Click "Request a Course" or "Request a School"

## 📋 What You'll See

### In the Sidebar:
At the bottom, above the wave animation, you'll find:

```
Can't Find What You're Looking For?
┌─────────────────────────────────┐
│   📚 Request a Course           │  <- Blue gradient button
└─────────────────────────────────┘
┌─────────────────────────────────┐
│   🏫 Request a School           │  <- Green gradient button
└─────────────────────────────────┘
```

### Request Course Modal:
- **Course Title** (required) - e.g., "Advanced Mathematics"
- **Category** (required) - Academic, Professional, Technical, etc.
- **Level** (required) - KG, Elementary, University, etc.
- **Description** (optional) - Details about what you want to learn

### Request School Modal:
- **School Name** (required) - e.g., "Excellence Academy"
- **School Type** (required) - Academic, Polytechnic, Culinary, etc.
- **Level** (required) - Kindergarten, Elementary, High School, etc.
- **Location** (optional) - e.g., "Addis Ababa, Ethiopia"
- **School Email** (optional) - e.g., "contact@school.edu.et"
- **School Phone** (optional) - e.g., "+251 11 555 1234"

## ✅ Testing Checklist

1. **Login First**: Make sure you're logged in (go to index.html if needed)
2. **Open Course Modal**: Click blue button → Modal appears
3. **Fill Form**: Enter course details
4. **Submit**: Click "Submit Request" → Loading spinner → Success message
5. **Check Database**: Request is saved with status "pending"
6. **Repeat for School**: Same process with green button

## 🔧 Troubleshooting

**Modal doesn't open:**
```bash
# Check browser console - press F12
# Look for JavaScript errors
```

**"Please login" error:**
```
You need to login first!
1. Go to http://localhost:8080/index.html
2. Login with your credentials
3. Come back to find-tutors page
```

**Backend not responding:**
```bash
# Restart backend server
cd astegni-backend
python app.py
```

**Database error:**
```bash
# Re-run migration
python migrate_create_course_school_requests.py
```

## 📊 Check Database

### View Requests in Database:
```bash
# Connect to PostgreSQL
psql -U astegni_user -d astegni_db

# View course requests
SELECT * FROM course_requests ORDER BY created_at DESC;

# View school requests
SELECT * FROM requested_schools ORDER BY created_at DESC;
```

### Sample Query Results:
```
course_requests:
 id | user_id | course_title              | category  | level      | status
----+---------+---------------------------+-----------+------------+---------
  1 |     123 | Advanced Python           | Technical | University | pending
  2 |     123 | Business English          | Language  | Professional| pending

requested_schools:
 id | user_id | school_name          | school_type | level      | status
----+---------+----------------------+-------------+------------+---------
  1 |     123 | Tech Academy         | Technical   | College    | pending
  2 |     123 | Language Institute   | Academic    | High School| pending
```

## 🎨 Features Included

- ✅ Beautiful gradient buttons with hover effects
- ✅ Smooth animations (zoom in/out)
- ✅ Form validation (required fields)
- ✅ Loading spinner during submission
- ✅ Success/error messages
- ✅ Auto-close on success
- ✅ ESC key to close
- ✅ Click outside to close
- ✅ Dark mode support
- ✅ Fully responsive (mobile-friendly)
- ✅ Authentication required
- ✅ User-specific requests (linked to user_id)

## 🔗 API Endpoints Created

```
POST   /api/course-requests          - Create course request
GET    /api/course-requests          - Get my course requests
GET    /api/course-requests/{id}     - Get specific request

POST   /api/school-requests          - Create school request
GET    /api/school-requests          - Get my school requests
GET    /api/school-requests/{id}     - Get specific request
```

## 📁 Files Created

```
✓ astegni-backend/migrate_create_course_school_requests.py
✓ astegni-backend/course_school_request_endpoints.py
✓ css/find-tutors/request-modals.css
✓ js/find-tutors/request-modals.js
✓ test-request-modals.html
✓ REQUEST-MODALS-IMPLEMENTATION.md (full docs)
✓ REQUEST-MODALS-QUICK-START.md (this file)
```

## 🎯 Next Steps

The feature is production-ready! You can now:

1. **Test thoroughly** with different users
2. **Build admin interface** to view/manage requests
3. **Add email notifications** when requests are submitted
4. **Create approval workflow** for admins
5. **Add analytics** to track popular requests

## 💡 Tips

- **Status field**: Defaults to "pending", can be updated to "approved", "rejected", etc.
- **User tracking**: Each request is linked to the user who created it
- **Timestamps**: `created_at` and `updated_at` are automatically set
- **Validation**: Frontend validates required fields before submission
- **Security**: JWT authentication required for all endpoints

---

**That's it! You're ready to accept course and school requests from users! 🎉**
