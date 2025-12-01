# Session Requests Flow Diagram

## Visual Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SESSION REQUESTS SYSTEM                       │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐                            ┌──────────────────┐
│  STUDENT/PARENT  │                            │      TUTOR       │
│   (Requester)    │                            │   (Receiver)     │
└──────────────────┘                            └──────────────────┘
        │                                                 │
        │ 1. Browse find-tutors.html                     │
        │    Click "Request Session"                     │
        │                                                 │
        ▼                                                 │
┌──────────────────────────────────────────┐            │
│ POST /api/session-requests               │            │
│                                           │            │
│ Body:                                     │            │
│  - tutor_id: 789                          │            │
│  - package_id: 12                         │            │
│  - student_name: "Ahmed"                  │            │
│  - student_grade: "Grade 10"              │            │
│  - message: "Need help with Math"         │            │
│                                           │            │
│ JWT Token contains:                       │            │
│  {                                        │            │
│    "sub": 123,        // user_id          │            │
│    "role": "student",                     │            │
│    "role_ids": {                          │            │
│      "student": 456   // ✅ USE THIS!     │            │
│    }                                      │            │
│  }                                        │            │
└──────────────────────────────────────────┘            │
        │                                                 │
        │ 2. Backend inserts into DB                     │
        ▼                                                 │
┌─────────────────────────────────────────────────────────────────┐
│                    session_requests TABLE                        │
├─────────────────────────────────────────────────────────────────┤
│ id | tutor_id | requester_id | requester_type | status | ...    │
│ 99 |   789    |     456      |   'student'    |'pending'| ...   │
│                      ▲                                           │
│                      │                                           │
│              ✅ student_profiles.id                              │
│              (NOT users.id!)                                     │
└─────────────────────────────────────────────────────────────────┘
        │                                                 │
        │                                                 │
        │ 3. View My Requests                   3. View Incoming Requests
        │    (Outgoing)                             (Incoming)
        ▼                                                 ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐
│ student-profile.html                 │  │ tutor-profile.html                   │
│                                      │  │                                      │
│ Panel: "My Session Requests"        │  │ Panel: "Session Requests"            │
│                                      │  │                                      │
│ GET /api/session-requests/my-requests│  │ GET /api/session-requests/tutor     │
│                                      │  │                                      │
│ Shows:                               │  │ Shows:                               │
│ ┌────────────────────────────────┐  │  │ ┌────────────────────────────────┐  │
│ │ Request to: Dr. Sara (Tutor)   │  │  │ │ Request from: Ahmed (Student)  │  │
│ │ Package: Math Basic            │  │  │ │ Package: Math Basic            │  │
│ │ Status: Pending ⏳             │  │  │ │ Status: Pending                │  │
│ │ Sent: 2 hours ago              │  │  │ │ Received: 2 hours ago          │  │
│ └────────────────────────────────┘  │  │ │ [Accept] [Reject]              │  │
│                                      │  │ └────────────────────────────────┘  │
│ Query:                               │  │                                      │
│ WHERE requester_id = 456             │  │ Query:                               │
│   AND requester_type = 'student'     │  │ WHERE tutor_id = 789                 │
│       ▲                              │  │       ▲                              │
│       │                              │  │       │                              │
│   student_profiles.id                │  │   tutor_profiles.id                  │
└──────────────────────────────────────┘  └──────────────────────────────────────┘
```

---

## Data Flow Summary

### Creating a Request (Student → Tutor)

```javascript
// Frontend (find-tutors.html)
Student clicks "Request Session" on Tutor's card

    ↓

// Backend receives request
POST /api/session-requests
Token: { sub: 123, role: "student", role_ids: { student: 456 } }

    ↓

// Backend extracts role-specific ID
requester_id = role_ids['student']  // 456
requester_type = 'student'

    ↓

// Insert into database
INSERT INTO session_requests (
    tutor_id,       // 789 (tutor_profiles.id)
    requester_id,   // 456 (student_profiles.id) ✅
    requester_type  // 'student'
)
```

### Viewing Requests

#### Student/Parent View (Outgoing Requests)

```javascript
// student-profile.html
GET /api/session-requests/my-requests
Token: { sub: 123, role: "student", role_ids: { student: 456 } }

    ↓

// Backend query
SELECT * FROM session_requests
WHERE requester_id = 456           // ✅ student_profiles.id
  AND requester_type = 'student'
ORDER BY created_at DESC

    ↓

// Shows requests I sent TO tutors
```

#### Tutor View (Incoming Requests)

```javascript
// tutor-profile.html
GET /api/session-requests/tutor
Token: { sub: 124, role: "tutor", role_ids: { tutor: 789 } }

    ↓

// Backend query
SELECT sr.*,
       CASE
         WHEN sr.requester_type = 'student' THEN
           (SELECT u.first_name FROM student_profiles sp
            JOIN users u ON sp.user_id = u.id
            WHERE sp.id = sr.requester_id)
         WHEN sr.requester_type = 'parent' THEN
           (SELECT u.first_name FROM parent_profiles pp
            JOIN users u ON pp.user_id = u.id
            WHERE pp.id = sr.requester_id)
       END as requester_name
FROM session_requests sr
WHERE sr.tutor_id = 789           // ✅ tutor_profiles.id
ORDER BY created_at DESC

    ↓

// Shows requests sent TO me FROM students/parents
```

---

## Key Endpoints

| Endpoint | Who Uses It | Purpose | Filters By |
|----------|-------------|---------|------------|
| `POST /api/session-requests` | Student/Parent | Create new request | JWT extracts role-specific ID |
| `GET /api/session-requests/tutor` | Tutor | View incoming requests | `tutor_id = tutor_profiles.id` |
| `GET /api/session-requests/my-requests` | Student/Parent | View outgoing requests | `requester_id = student_profiles.id` or `parent_profiles.id` |
| `GET /api/session-requests/tutor/{id}` | Tutor | View specific request detail | Request ID + verify tutor owns it |
| `PATCH /api/session-requests/{id}` | Tutor | Accept/Reject request | Request ID + verify tutor owns it |

---

## Role-Specific ID Mapping

```
users table (id=123)
    │
    ├─ student_profiles (id=456)  ──→  requester_id in session_requests
    ├─ parent_profiles  (id=457)  ──→  requester_id in session_requests
    └─ tutor_profiles   (id=789)  ──→  tutor_id in session_requests
```

**One user (id=123) can have multiple role-specific profiles:**
- As **student** (id=456): Sends requests with `requester_id=456, requester_type='student'`
- As **parent** (id=457): Sends requests with `requester_id=457, requester_type='parent'`
- As **tutor** (id=789): Receives requests with `tutor_id=789`

---

## Example Scenario

### User with Multiple Roles

```
User: John Doe (users.id = 100)
├─ Student Profile (student_profiles.id = 200)
├─ Parent Profile (parent_profiles.id = 300)
└─ Tutor Profile (tutor_profiles.id = 400)
```

**When John is in STUDENT mode:**
```javascript
// Token contains
{ sub: 100, role: "student", role_ids: { student: 200, parent: 300, tutor: 400 } }

// Requests session from Dr. Sara (tutor_id = 500)
session_requests:
  tutor_id = 500
  requester_id = 200        // ✅ student_profiles.id
  requester_type = 'student'

// Views "My Requests" in student-profile.html
Query: WHERE requester_id = 200 AND requester_type = 'student'
Shows: Only requests he sent AS A STUDENT
```

**When John switches to PARENT mode:**
```javascript
// Token contains
{ sub: 100, role: "parent", role_ids: { student: 200, parent: 300, tutor: 400 } }

// Requests session from Dr. Sara (tutor_id = 500)
session_requests:
  tutor_id = 500
  requester_id = 300        // ✅ parent_profiles.id
  requester_type = 'parent'

// Views "My Requests" in parent-profile.html
Query: WHERE requester_id = 300 AND requester_type = 'parent'
Shows: Only requests he sent AS A PARENT
```

**When John switches to TUTOR mode:**
```javascript
// Token contains
{ sub: 100, role: "tutor", role_ids: { student: 200, parent: 300, tutor: 400 } }

// Views "Session Requests" in tutor-profile.html
Query: WHERE tutor_id = 400
Shows: All requests sent TO HIM as a tutor (from any students/parents)
```

---

## Summary

✅ **CORRECT Understanding:**

| Profile | View | Query | Shows |
|---------|------|-------|-------|
| **student-profile.html** | "My Session Requests" | `requester_id = student_profiles.id` | Outgoing requests (I sent TO tutors) |
| **parent-profile.html** | "My Session Requests" | `requester_id = parent_profiles.id` | Outgoing requests (I sent TO tutors) |
| **tutor-profile.html** | "Session Requests" | `tutor_id = tutor_profiles.id` | Incoming requests (sent TO me FROM students/parents) |

**The key difference:**
- **Student/Parent**: "What requests did **I send**?" (outgoing)
- **Tutor**: "What requests did **I receive**?" (incoming)

Both use the same `session_requests` table, just filtered differently! 🎯
