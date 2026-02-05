# Role-Based Session Filters - Implementation Complete

## Overview
Replaced status-based session filters (All, Scheduled, In Progress, Completed, Cancelled) with **role-based filters** (All, As Tutor, As Student, As Parent) across all three user profiles. This allows multi-role users to filter sessions based on **which role they were acting as** in those sessions.

## Rationale

### **Why This Change?**
1. **Multi-Role Support** - Users can have multiple roles (tutor, student, parent) and participate in sessions with different roles
2. **Better Organization** - Separate sessions where you're tutoring vs. sessions where you're learning vs. sessions supervising children
3. **Clearer Context** - Immediately understand your role in each session
4. **Status Still Visible** - Status information is still shown in the session details

### **Previous Filter (Status-based)**
```
[All] [Scheduled] [In Progress] [Completed] [Cancelled]
```
- Focused on session lifecycle status
- Less relevant for daily usage
- Status should be visible in the list, not a primary filter

### **New Filter (Role-based)**
```
[All Sessions] [As Tutor] [As Student] [As Parent]
```
- Focused on the user's role in the session
- More intuitive for multi-role users
- Better aligned with user mental models
- **Same filters across ALL profiles** for consistency

## Changes Made

### **1. Tutor Profile**
**Location:** [tutor-profile.html:1191-1213](profile-pages/tutor-profile.html#L1191-L1213)

**Before:**
```html
<button onclick="filterSessions('scheduled')">Scheduled</button>
<button onclick="filterSessions('completed')">Completed</button>
```

**After:**
```html
<button onclick="filterSessionsByRole('all')">
    <i class="fas fa-users mr-2"></i>All Sessions
</button>
<button onclick="filterSessionsByRole('tutor')">
    <i class="fas fa-chalkboard-teacher mr-2"></i>As Tutor
</button>
<button onclick="filterSessionsByRole('student')">
    <i class="fas fa-user-graduate mr-2"></i>As Student
</button>
<button onclick="filterSessionsByRole('parent')">
    <i class="fas fa-user-friends mr-2"></i>As Parent
</button>
```

**Use Case:** A user who is primarily a tutor but also takes classes can see:
- Sessions where they're teaching (As Tutor)
- Sessions where they're learning (As Student)
- Sessions supervising their children (As Parent)

---

### **2. Student Profile**
**Location:** [student-profile.html:3078-3093](profile-pages/student-profile.html#L3078-L3093)

**Before:**
```html
<button onclick="filterStudentSessionStatus('scheduled')">Scheduled</button>
<button onclick="filterStudentSessionStatus('completed')">Completed</button>
```

**After:**
```html
<button onclick="filterStudentSessionsByRole('all')">
    <i class="fas fa-users mr-2"></i>All Sessions
</button>
<button onclick="filterStudentSessionsByRole('tutor')">
    <i class="fas fa-chalkboard-teacher mr-2"></i>As Tutor
</button>
<button onclick="filterStudentSessionsByRole('student')">
    <i class="fas fa-user-graduate mr-2"></i>As Student
</button>
<button onclick="filterStudentSessionsByRole('parent')">
    <i class="fas fa-user-friends mr-2"></i>As Parent
</button>
```

**Use Case:** A student who also tutors younger students can see:
- Sessions where they're teaching (As Tutor)
- Sessions where they're learning (As Student)

---

### **3. Parent Profile**
**Location:** [parent-profile.html:3128-3150](profile-pages/parent-profile.html#L3128-L3150)

**Before:**
```html
<button onclick="filterSessions('scheduled')">Scheduled</button>
<button onclick="filterSessions('completed')">Completed</button>
```

**After:**
```html
<button onclick="filterParentSessionsByRole('all')">
    <i class="fas fa-users mr-2"></i>All Sessions
</button>
<button onclick="filterParentSessionsByRole('tutor')">
    <i class="fas fa-chalkboard-teacher mr-2"></i>As Tutor
</button>
<button onclick="filterParentSessionsByRole('student')">
    <i class="fas fa-user-graduate mr-2"></i>As Student
</button>
<button onclick="filterParentSessionsByRole('parent')">
    <i class="fas fa-user-friends mr-2"></i>As Parent
</button>
```

**Use Case:** A parent who is also a tutor or student can see:
- Sessions where they're teaching (As Tutor)
- Sessions where they're learning (As Student)
- Sessions supervising their children (As Parent)

## JavaScript Updates

### **1. Tutor Sessions Manager**
**File:** [js/tutor-profile/sessions-panel-manager.js](js/tutor-profile/sessions-panel-manager.js)

```javascript
// Filter by the role the user played in each session
function filterSessionsByRole(role) {
    console.log(`Filtering sessions by role: ${role}`);
    currentRoleFilter = role;

    // Update button styles
    document.querySelectorAll('#sessions-panel button[onclick^="filterSessionsByRole"]')
        .forEach(btn => {
            btn.classList.remove('bg-blue-500', 'text-white');
            btn.classList.add('bg-gray-200');
        });

    event.target.classList.remove('bg-gray-200');
    event.target.classList.add('bg-blue-500', 'text-white');

    // Filter by user's role in the session
    if (role === 'all') {
        loadSessions();
    } else {
        const filteredSessions = allSessions.filter(session => {
            return session.user_role === role;
        });
        displayFilteredSessions(filteredSessions);
    }
}
```

### **2. Student Sessions Manager**
**File:** [js/student-profile/sessions-panel-manager.js](js/student-profile/sessions-panel-manager.js)

```javascript
function filterStudentSessionsByRole(role) {
    console.log(`Filtering student sessions by role: ${role}`);

    // Update buttons
    document.querySelectorAll('.mb-6 button[onclick^="filterStudentSessionsByRole"]')
        .forEach(btn => {
            btn.classList.remove('bg-blue-500', 'text-white');
            btn.classList.add('bg-gray-200');
        });

    event.target.classList.remove('bg-gray-200');
    event.target.classList.add('bg-blue-500', 'text-white');

    // Load with role filter
    loadStudentSessions(role === 'all' ? null : role);
}
```

### **3. Parent Sessions Manager**
**File:** [js/parent-profile/sessions-panel-manager.js](js/parent-profile/sessions-panel-manager.js)

```javascript
function filterParentSessionsByRole(role) {
    console.log(`Filtering parent sessions by role: ${role}`);

    // Update buttons
    document.querySelectorAll('.mb-6 button[onclick^="filterParentSessionsByRole"]')
        .forEach(btn => {
            btn.classList.remove('bg-blue-500', 'text-white');
            btn.classList.add('bg-gray-200');
        });

    event.target.classList.remove('bg-gray-200');
    event.target.classList.add('bg-blue-500', 'text-white');

    // Load with role filter
    loadParentSessions(role === 'all' ? null : role);
}
```

## Backend Integration

### **API Implementation**

The API returns all sessions for the current user with a `user_role` field indicating which role the user had in each session.

**Endpoint:** `GET /api/user/sessions?filter_by={role}`

**Backend Query Logic:**

```python
# GET /api/user/sessions
# Returns all sessions where the current user participated in ANY role

def get_user_sessions(current_user_id, filter_by=None):
    """
    Fetch all sessions for a user across all their roles.
    Each session includes a 'user_role' field indicating which role the user had.
    """

    sessions = []

    # 1. Sessions where user was the TUTOR
    tutor_sessions = db.query(TutorSessions).join(
        EnrolledStudents
    ).join(
        Tutors
    ).filter(
        Tutors.user_id == current_user_id
    ).all()

    for session in tutor_sessions:
        session.user_role = 'tutor'
        sessions.append(session)

    # 2. Sessions where user was the STUDENT
    student_sessions = db.query(TutorSessions).join(
        EnrolledStudents
    ).join(
        Students
    ).filter(
        Students.user_id == current_user_id
    ).all()

    for session in student_sessions:
        session.user_role = 'student'
        sessions.append(session)

    # 3. Sessions where user was the PARENT (supervising their children)
    parent_sessions = db.query(TutorSessions).join(
        EnrolledStudents
    ).join(
        Parents
    ).filter(
        Parents.user_id == current_user_id,
        EnrolledStudents.parent_id.isnot(None)
    ).all()

    for session in parent_sessions:
        session.user_role = 'parent'
        sessions.append(session)

    # Filter by role if specified
    if filter_by:
        sessions = [s for s in sessions if s.user_role == filter_by]

    return sessions
```

**Example Response:**
```json
{
  "sessions": [
    {
      "id": 123,
      "course_enrollment_id": 45,
      "session_date": "2026-02-01",
      "start_time": "10:00:00",
      "end_time": "11:00:00",
      "status": "scheduled",
      "user_role": "tutor",
      "other_participant": {
        "name": "John Doe",
        "role": "student"
      }
    },
    {
      "id": 124,
      "course_enrollment_id": 67,
      "session_date": "2026-02-02",
      "start_time": "14:00:00",
      "end_time": "15:00:00",
      "status": "completed",
      "user_role": "student",
      "other_participant": {
        "name": "Jane Smith",
        "role": "tutor"
      }
    },
    {
      "id": 125,
      "course_enrollment_id": 89,
      "session_date": "2026-02-03",
      "start_time": "16:00:00",
      "end_time": "17:00:00",
      "status": "scheduled",
      "user_role": "parent",
      "child": {
        "name": "Alice",
        "role": "student"
      },
      "tutor": {
        "name": "Bob Teacher",
        "role": "tutor"
      }
    }
  ]
}
```

### **Database Schema - No Extra Fields Needed!**

Sessions are stored in `tutor_sessions` table and linked to `enrolled_students`. The user's role is **deduced from existing relationships**:

```sql
-- Existing schema (no changes needed)
CREATE TABLE tutor_sessions (
    id SERIAL PRIMARY KEY,
    course_enrollment_id INTEGER REFERENCES enrolled_students(id),
    session_date DATE,
    start_time TIME,
    end_time TIME,
    status VARCHAR(20),
    -- ... other fields
);

CREATE TABLE enrolled_students (
    id SERIAL PRIMARY KEY,
    tutor_id INTEGER REFERENCES tutors(id),
    student_id INTEGER REFERENCES students(id),
    parent_id INTEGER REFERENCES parents(id),  -- NULL if enrolled directly
    -- ... other fields
);

CREATE TABLE tutors (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    -- ... other fields
);

CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    -- ... other fields
);

CREATE TABLE parents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    -- ... other fields
);
```

**How we deduce the user's role:**

1. **User is TUTOR** → `tutors.user_id = current_user_id`
2. **User is STUDENT** → `students.user_id = current_user_id`
3. **User is PARENT** → `parents.user_id = current_user_id AND enrolled_students.parent_id IS NOT NULL`

## Benefits

### **1. Multi-Role Support**
- Users with multiple roles can easily separate their different responsibilities
- Clear distinction between teaching, learning, and supervising

### **2. Better User Experience**
- Intuitive filtering based on role
- Faster to find specific types of sessions
- Icons make filters visually distinctive

### **3. Consistent Across All Profiles**
- Same filters available on all profile pages
- Easier to understand for users who switch between profiles
- Unified mental model

### **4. Status Still Available**
- Status is still displayed in each session row
- Users can see status without needing to filter by it
- More comprehensive view of all sessions

## Migration Notes

### **For Users**
- **Old behavior:** Filter by session status
- **New behavior:** Filter by your role in the session
- Status information still visible in session details
- No data migration needed

### **For Developers**
- Update API to return `user_role` field with each session
- Backend determines role by checking which table (tutors/students/parents) the user_id belongs to
- Frontend filtering logic updated in sessions-panel-manager.js files
- Same filter buttons across all three profiles for consistency

## Files Modified

1. **[profile-pages/tutor-profile.html](profile-pages/tutor-profile.html)** - Updated filter buttons (lines 1191-1213)
2. **[profile-pages/student-profile.html](profile-pages/student-profile.html)** - Updated filter buttons (lines 3078-3093)
3. **[profile-pages/parent-profile.html](profile-pages/parent-profile.html)** - Updated filter buttons (lines 3128-3150)
4. **[js/tutor-profile/sessions-panel-manager.js](js/tutor-profile/sessions-panel-manager.js)** - Updated filterSessionsByRole() function
5. **[js/student-profile/sessions-panel-manager.js](js/student-profile/sessions-panel-manager.js)** - Updated filterStudentSessionsByRole() function
6. **[js/parent-profile/sessions-panel-manager.js](js/parent-profile/sessions-panel-manager.js)** - Updated filterParentSessionsByRole() function

## Testing Checklist

- [ ] User with tutor role: Click "As Tutor" → Should show only sessions where they're teaching
- [ ] User with student role: Click "As Student" → Should show only sessions where they're learning
- [ ] User with parent role: Click "As Parent" → Should show only sessions supervising children
- [ ] Multi-role user: All filters should work and show appropriate sessions
- [ ] All: Click "All Sessions" → Should show unfiltered list across all roles
- [ ] Button styling updates correctly when clicked
- [ ] Status still visible in session details
- [ ] Filters are identical across all three profile pages

## Summary

Successfully replaced status-based filters with role-based filters across all three profiles, providing users with an intuitive way to organize sessions based on **which role they were acting as** in each session. This is especially useful for multi-role users who may be a tutor for some sessions, a student in others, and a parent supervising their children in others.

Status information remains accessible in the session details, while the primary filtering now focuses on the user's role in the session.

---

**Implementation Date:** January 29, 2026
**Status:** ✅ Complete
**Files Changed:** 6 (3 HTML, 3 JS)
**Impact:** Improved UX for multi-role users across all three major user roles
**Key Insight:** Filters based on user's role in the session, not who they're meeting with
