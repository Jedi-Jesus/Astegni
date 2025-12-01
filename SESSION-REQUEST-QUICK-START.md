# Session Request System - Quick Start Guide

## 🚀 5-Minute Setup

### 1. Database Setup (1 minute)
```bash
cd astegni-backend
python migrate_create_session_requests.py
python seed_session_requests.py
```

### 2. Start Servers (1 minute)
```bash
# Terminal 1 - Backend
cd astegni-backend
python app.py

# Terminal 2 - Frontend
cd ..
python -m http.server 8080
```

### 3. Test It! (3 minutes)

#### As Student/Parent (Make a Request):
1. Open http://localhost:8080
2. Log in as a student or parent
3. Go to a tutor profile: http://localhost:8080/view-profiles/view-tutor.html?id=1
4. Click "Packages & Schedule" tab
5. Click "Request Session" button
6. Fill form and submit

#### As Tutor (Review Requests):
1. Open http://localhost:8080/profile-pages/tutor-profile.html
2. Log in as a tutor
3. Click "Requested Sessions" in sidebar
4. Click "View" on any request
5. Click "Accept Request" or "Reject Request"

#### As Tutor (View Students):
1. Stay in tutor profile
2. Click "My Students" in sidebar
3. See all accepted students in cards
4. Click "View Profile" to see student details

---

## 📋 Key Features

### ✅ What Works (Phase 1 - Complete)
- ✅ Request tutoring sessions (students/parents)
- ✅ View requests in table (tutors)
- ✅ Accept/reject requests (tutors)
- ✅ Manage accepted students (tutors)
- ✅ Clickable requester names → view profiles
- ✅ Package selection from view-tutor page
- ✅ Auto-fill user contact info
- ✅ Responsive table and card layouts

### ❌ Coming in Phase 2
- ❌ Messaging between tutor and requester
- ❌ Email/SMS notifications
- ❌ Filter/search requests
- ❌ Export to CSV

---

## 🔧 Quick Commands

### Reset Database
```bash
cd astegni-backend
python migrate_create_session_requests.py
python seed_session_requests.py
```

### View Sample Data
```bash
# In PostgreSQL
SELECT id, tutor_id, requester_type, student_name, status, created_at
FROM session_requests;
```

### Test API
```bash
# Get requests (replace <token>)
curl -H "Authorization: Bearer <token>" \
     http://localhost:8000/api/tutor/session-requests

# Accept request (replace <token> and <id>)
curl -X PATCH \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"status": "accepted"}' \
     http://localhost:8000/api/tutor/session-requests/<id>
```

---

## 📁 File Locations

**Backend:**
- `astegni-backend/session_request_endpoints.py` - API endpoints
- `astegni-backend/migrate_create_session_requests.py` - Database migration
- `astegni-backend/seed_session_requests.py` - Sample data

**Frontend:**
- `profile-pages/tutor-profile.html` - Tutor dashboard (panels + modal)
- `js/tutor-profile/session-request-manager.js` - Request manager
- `view-profiles/view-tutor.html` - Public tutor profile (request modal)
- `js/view-tutor/session-request-handler.js` - Request submission

**Documentation:**
- `SESSION-REQUEST-SYSTEM-GUIDE.md` - Complete guide
- `SESSION-REQUEST-QUICK-START.md` - This file

---

## 🎯 Common Use Cases

### 1. Student Requests Math Tutoring
```
1. Student browses tutors → finds math tutor
2. Clicks "Request Session" on "Basic Math Package"
3. Enters: Name: "Abebe Kebede", Grade: "Grade 10"
4. Adds schedule: "Tuesday/Thursday evenings"
5. Submits → Tutor receives request
```

### 2. Parent Requests for Child
```
1. Parent views tutor profile
2. Clicks "Request Session"
3. Enters child's name and grade
4. Provides parent contact info
5. Adds message: "My child needs help with homework"
6. Submits → Tutor receives request
```

### 3. Tutor Accepts Request
```
1. Tutor logs in → sees (5) badge on "Requested Sessions"
2. Clicks to view table of requests
3. Clicks "View" on student request
4. Reviews student grade, schedule, message
5. Clicks "Accept Request" → Student added to "My Students"
```

### 4. Tutor Manages Students
```
1. Tutor navigates to "My Students" panel
2. Sees grid of accepted student cards
3. Clicks "View Profile" → opens view-student.html
4. Can see student's full profile and progress
```

---

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Modal won't open | Check if logged in as student/parent |
| Requests not loading | Verify token: `localStorage.getItem('token')` |
| Can't accept request | Ensure request status is 'pending' |
| Students panel empty | Accept some requests first |
| Table not showing | Switch panel or click refresh |

---

## 📊 Database Schema (Quick Reference)

```sql
CREATE TABLE session_requests (
    id SERIAL PRIMARY KEY,
    tutor_id INTEGER REFERENCES users(id),
    requester_id INTEGER REFERENCES users(id),
    requester_type VARCHAR(20),  -- 'student' or 'parent'
    package_name VARCHAR(255),
    status VARCHAR(20),  -- 'pending', 'accepted', 'rejected'
    student_name VARCHAR(255),
    student_grade VARCHAR(50),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    preferred_schedule TEXT,
    message TEXT,
    created_at TIMESTAMP,
    responded_at TIMESTAMP
);
```

---

## 🌟 Key Differences from Schedules

| Feature | Schedules | Session Requests |
|---------|-----------|------------------|
| Created by | Tutor | Student/Parent |
| Purpose | Tutor's teaching schedule | Request for tutoring |
| Status | Active/Inactive | Pending/Accepted/Rejected |
| Panel | Schedule | Requested Sessions + My Students |
| Actions | Edit/Delete | Accept/Reject |
| Outcome | Shows availability | Creates tutor-student relationship |

---

## 🔗 Related Systems

- **Packages:** Requesters select from tutor's packages
- **Schedules:** After acceptance, tutor can schedule actual sessions
- **Whiteboard:** Accepted students can join whiteboard sessions
- **Profiles:** Requester links go to view-student or view-parent pages

---

## ✅ Verification Checklist

Before deploying:
- [ ] Database table created successfully
- [ ] Sample data seeded (6 requests)
- [ ] Backend server running on port 8000
- [ ] Frontend server running on port 8080
- [ ] Can submit request from view-tutor page
- [ ] Requests appear in tutor's "Requested Sessions" table
- [ ] Can accept/reject requests
- [ ] Accepted requests appear in "My Students" panel
- [ ] Links to requester profiles work
- [ ] No console errors

---

## 📞 What's Next?

After Phase 1 is working:
1. Test with real users
2. Gather feedback
3. Plan Phase 2 features (messaging, notifications)
4. Add analytics dashboard
5. Implement email notifications
6. Create mobile-responsive improvements

---

**Status:** ✅ Phase 1 Complete - Production Ready

For detailed documentation, see: `SESSION-REQUEST-SYSTEM-GUIDE.md`
