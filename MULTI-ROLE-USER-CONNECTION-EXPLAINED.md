# Multi-Role User Connections - Complete Explanation

## Your Question: Ahmed is a Tutor, Parent, AND Student - Which Role Badge Shows?

### Short Answer

**It depends on WHICH profile Ahmed used to create the connection!**

The badge shows the role of **the SPECIFIC profile that made the connection**, not just a random role from Ahmed's user account.

---

## The Critical Concept: Profile-Based vs User-Based

### ❌ OLD WAY (User-Based) - WRONG
```
User Ahmed has roles: [tutor, student, parent]
Connects with Sara
Badge shown: ??? (Which one? Random? First? Most recent?)
```

### ✅ NEW WAY (Profile-Based) - CORRECT
```
User Ahmed has THREE SEPARATE PROFILES:
├─ Tutor Profile (profile_id: 101)
├─ Student Profile (profile_id: 102)
└─ Parent Profile (profile_id: 103)

Ahmed can create THREE DIFFERENT connections with Sara:
1. As Tutor → Sara (creates connection #1)
2. As Student → Sara (creates connection #2)
3. As Parent → Sara (creates connection #3)

Each connection stores WHICH profile was used!
```

---

## Real-World Example: Ahmed's Three Profiles

### Ahmed's User Account
```
User ID: 50
Roles: ["tutor", "student", "parent"]

Profile Records:
├─ tutor_profiles table:   id = 101, user_id = 50
├─ student_profiles table: id = 102, user_id = 50
└─ parent_profiles table:  id = 103, user_id = 50
```

---

## Scenario 1: Ahmed Connects as TUTOR

### When Ahmed is on his tutor profile page and clicks "Connect with Sara"

**Database Record Created:**
```sql
connections table:
┌────────────────────────────────────────────────────────┐
│ id: 1                                                  │
│                                                        │
│ user_id_1:       50              (Ahmed's user ID)    │
│ profile_id_1:    101             (Ahmed's TUTOR ID)   │
│ profile_type_1:  "tutor"         ← Ahmed's role HERE  │
│                                                        │
│ user_id_2:       75              (Sara's user ID)     │
│ profile_id_2:    85              (Sara's tutor ID)    │
│ profile_type_2:  "tutor"         ← Sara's role        │
│                                                        │
│ status:          "connected"                          │
└────────────────────────────────────────────────────────┘
```

**What Ahmed Sees (Tutor Profile):**
```
┌─────────────────────┐
│  [Sara's Photo]     │
│                     │
│  Sara Tadesse       │
│  🏷️ Tutor           │  ← Shows Sara's role (profile_type_2)
│                     │
│  Connected 5 days   │
│  ago                │
│  [Message] [View]   │
└─────────────────────┘
```

**What Sara Sees:**
```
┌─────────────────────┐
│  [Ahmed's Photo]    │
│                     │
│  Ahmed Hassan       │
│  🏷️ Tutor           │  ← Shows Ahmed's role (profile_type_1)
│                     │
│  Connected 5 days   │
│  ago                │
│  [Message] [View]   │
└─────────────────────┘
```

**Context:** This is a professional tutor-to-tutor connection (networking)

---

## Scenario 2: Ahmed Connects as STUDENT

### When Ahmed is on his student profile page and clicks "Connect with Sara"

**Database Record Created:**
```sql
connections table:
┌────────────────────────────────────────────────────────┐
│ id: 2                                                  │
│                                                        │
│ user_id_1:       50              (Ahmed's user ID)    │
│ profile_id_1:    102             (Ahmed's STUDENT ID) │
│ profile_type_1:  "student"       ← Ahmed's role HERE  │
│                                                        │
│ user_id_2:       75              (Sara's user ID)     │
│ profile_id_2:    85              (Sara's tutor ID)    │
│ profile_type_2:  "tutor"         ← Sara's role        │
│                                                        │
│ status:          "connected"                          │
└────────────────────────────────────────────────────────┘
```

**What Ahmed Sees (Student Profile):**
```
┌─────────────────────┐
│  [Sara's Photo]     │
│                     │
│  Sara Tadesse       │
│  🏷️ Tutor           │  ← Shows Sara's role (profile_type_2)
│                     │
│  Connected 3 days   │
│  ago                │
│  [Message] [View]   │
└─────────────────────┘
```

**What Sara Sees:**
```
┌─────────────────────┐
│  [Ahmed's Photo]    │
│                     │
│  Ahmed Hassan       │
│  🏷️ Student         │  ← Shows Ahmed's role (profile_type_1)
│                     │
│  Connected 3 days   │
│  ago                │
│  [Message] [View]   │
└─────────────────────┘
```

**Context:** This is a student-to-tutor connection (mentorship)

---

## Scenario 3: Ahmed Connects as PARENT

### When Ahmed is on his parent profile page and clicks "Connect with Sara"

**Database Record Created:**
```sql
connections table:
┌────────────────────────────────────────────────────────┐
│ id: 3                                                  │
│                                                        │
│ user_id_1:       50              (Ahmed's user ID)    │
│ profile_id_1:    103             (Ahmed's PARENT ID)  │
│ profile_type_1:  "parent"        ← Ahmed's role HERE  │
│                                                        │
│ user_id_2:       75              (Sara's user ID)     │
│ profile_id_2:    85              (Sara's tutor ID)    │
│ profile_type_2:  "tutor"         ← Sara's role        │
│                                                        │
│ status:          "connected"                          │
└────────────────────────────────────────────────────────┘
```

**What Ahmed Sees (Parent Profile):**
```
┌─────────────────────┐
│  [Sara's Photo]     │
│                     │
│  Sara Tadesse       │
│  🏷️ Tutor           │  ← Shows Sara's role (profile_type_2)
│                     │
│  Connected 1 day    │
│  ago                │
│  [Message] [View]   │
└─────────────────────┘
```

**What Sara Sees:**
```
┌─────────────────────┐
│  [Ahmed's Photo]    │
│                     │
│  Ahmed Hassan       │
│  🏷️ Parent          │  ← Shows Ahmed's role (profile_type_1)
│                     │
│  Connected 1 day    │
│  ago                │
│  [Message] [View]   │
└─────────────────────┘
```

**Context:** This is a parent-to-tutor connection (hiring tutor for child)

---

## Summary: Ahmed Has 3 Separate Connections!

```
┌──────────────────────────────────────────────────────────────┐
│  Ahmed's Connections Dashboard                               │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  When viewing as TUTOR (profile_id: 101):                   │
│  ┌─────────────────────┐                                    │
│  │ Sara - Tutor        │  Connection #1 (tutor-to-tutor)    │
│  └─────────────────────┘                                    │
│                                                              │
│  When viewing as STUDENT (profile_id: 102):                 │
│  ┌─────────────────────┐                                    │
│  │ Sara - Tutor        │  Connection #2 (student-to-tutor)  │
│  └─────────────────────┘                                    │
│                                                              │
│  When viewing as PARENT (profile_id: 103):                  │
│  ┌─────────────────────┐                                    │
│  │ Sara - Tutor        │  Connection #3 (parent-to-tutor)   │
│  └─────────────────────┘                                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Key Points:**
- Same user (Ahmed)
- Same connection target (Sara)
- **THREE different connections** (different contexts!)
- Each shows the correct role badge based on WHICH profile created the connection

---

## How The Backend Determines Which Profile to Use

### Priority System (Auto-Detection)

**File:** `connection_profile_helpers.py` (Lines 18-50)

When a user creates a connection WITHOUT explicitly specifying which profile to use, the backend automatically selects in this priority order:

```python
def get_profile_from_user_id(db, user_id, preferred_profile_type=None):
    """
    Priority (if no preferred type):
        1. Tutor (most common for connections)
        2. Student
        3. Parent
        4. Advertiser
    """

    # Try in priority order
    profile_types = ['tutor', 'student', 'parent', 'advertiser']
    for profile_type in profile_types:
        profile = _get_specific_profile(db, user_id, profile_type)
        if profile:
            return profile
```

**Example:**
```
Ahmed has: Tutor + Student + Parent profiles

Auto-detection chooses: TUTOR (highest priority)

To use a different profile, Ahmed must explicitly:
1. Navigate to that profile page (student-profile.html)
2. Create connection from there
   OR
3. Specify preferred_profile_type in API call
```

---

## Frontend: How Profile Context is Determined

### Method 1: From Current Page Context

```javascript
// On tutor-profile.html page
const currentProfileType = 'tutor';  // Page knows it's tutor context
const currentProfileId = tutorProfile.id;

// When creating connection
fetch('/api/connections/create', {
    method: 'POST',
    body: JSON.stringify({
        target_user_id: 75,  // Sara
        profile_id: currentProfileId,     // Ahmed's tutor profile ID
        profile_type: currentProfileType  // 'tutor'
    })
});
```

### Method 2: From Active Role (User's Current Session)

```javascript
// In auth system
const user = {
    id: 50,
    roles: ['tutor', 'student', 'parent'],
    active_role: 'student',  // Currently viewing as student
    profile_ids: {
        tutor: 101,
        student: 102,
        parent: 103
    }
};

// When creating connection
fetch('/api/connections/create', {
    method: 'POST',
    body: JSON.stringify({
        target_user_id: 75,
        profile_id: user.profile_ids[user.active_role],  // 102
        profile_type: user.active_role                    // 'student'
    })
});
```

---

## What if Ahmed Doesn't Specify Profile Type?

### Backend Auto-Selects Based on Priority

**API Call (No profile specified):**
```javascript
fetch('/api/connections/create', {
    method: 'POST',
    body: JSON.stringify({
        target_user_id: 75  // Only Sara's user ID
    })
});
```

**Backend Processing:**
```python
# connection_endpoints.py
def create_connection(...):
    # No profile info provided, auto-detect current user's profile
    current_profile_info = get_profile_from_user_id(db, user_id)
    # Returns: {'profile_id': 101, 'profile_type': 'tutor'}  (highest priority)

    # Auto-detect target user's profile
    target_profile_info = get_profile_from_user_id(db, target_user_id)
    # Returns: {'profile_id': 85, 'profile_type': 'tutor'}

    # Creates connection using auto-detected profiles
    connection = Connection(
        user_id_1=user_id,
        profile_id_1=101,
        profile_type_1='tutor',
        user_id_2=target_user_id,
        profile_id_2=85,
        profile_type_2='tutor'
    )
```

**Result:** Defaults to TUTOR profile (highest priority)

---

## How to Create Connections with Specific Profiles

### Option 1: Navigate to Specific Profile Page

```
Ahmed wants to connect as STUDENT:
1. Go to student-profile.html
2. Click "Connect with Sara"
3. Connection created with profile_type_1='student'
```

### Option 2: Explicitly Specify in API Call

```javascript
// Create connection using parent profile
fetch('/api/connections/create', {
    method: 'POST',
    body: JSON.stringify({
        target_user_id: 75,
        profile_type: 'parent',  // Explicitly request parent profile
        target_profile_type: 'tutor'
    })
});
```

### Option 3: Use Role Switcher (Future Feature)

```javascript
// User clicks "Switch to Parent Role" button
switchRole('parent');

// Now all connections created use parent profile
// until user switches role again
```

---

## Database Example: All Three Connections

```sql
SELECT * FROM connections WHERE user_id_1 = 50 AND user_id_2 = 75;

┌────┬──────────┬─────────────┬───────────────┬──────────┬─────────────┬───────────────┐
│ id │ user_id_1│ profile_id_1│ profile_type_1│ user_id_2│ profile_id_2│ profile_type_2│
├────┼──────────┼─────────────┼───────────────┼──────────┼─────────────┼───────────────┤
│ 1  │    50    │     101     │   "tutor"     │    75    │     85      │   "tutor"     │
│ 2  │    50    │     102     │   "student"   │    75    │     85      │   "tutor"     │
│ 3  │    50    │     103     │   "parent"    │    75    │     85      │   "tutor"     │
└────┴──────────┴─────────────┴───────────────┴──────────┴─────────────┴───────────────┘

Same user (50), same target (75), THREE different connections!
```

---

## Badge Logic Recap

```javascript
function getProfileBadge(connection) {
    const currentUserId = 50;  // Ahmed

    if (connection.user_id_1 === currentUserId) {
        // Ahmed is user_id_1, show OTHER person's role
        return connection.profile_type_2;  // Sara's role
    } else {
        // Ahmed is user_id_2, show OTHER person's role
        return connection.profile_type_1;
    }
}

// For all three connections, when Ahmed views:
getProfileBadge(connection1);  // Returns "tutor" (Sara's role)
getProfileBadge(connection2);  // Returns "tutor" (Sara's role)
getProfileBadge(connection3);  // Returns "tutor" (Sara's role)

// For all three connections, when Sara views:
getProfileBadge(connection1);  // Returns "tutor" (Ahmed's role in this connection)
getProfileBadge(connection2);  // Returns "student" (Ahmed's role in this connection)
getProfileBadge(connection3);  // Returns "parent" (Ahmed's role in this connection)
```

---

## Visual Summary

```
╔═══════════════════════════════════════════════════════════════════╗
║  AHMED'S PERSPECTIVE (viewing connections)                        ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  On Tutor Profile Page:                                          ║
║  ┌─────────────────────┐                                         ║
║  │ Sara - Tutor 🏷️     │  (Professional network)                 ║
║  └─────────────────────┘                                         ║
║                                                                   ║
║  On Student Profile Page:                                        ║
║  ┌─────────────────────┐                                         ║
║  │ Sara - Tutor 🏷️     │  (My teacher)                           ║
║  └─────────────────────┘                                         ║
║                                                                   ║
║  On Parent Profile Page:                                         ║
║  ┌─────────────────────┐                                         ║
║  │ Sara - Tutor 🏷️     │  (Tutor for my child)                   ║
║  └─────────────────────┘                                         ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════════╗
║  SARA'S PERSPECTIVE (viewing connections)                         ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  ┌─────────────────────┐                                         ║
║  │ Ahmed - Tutor 🏷️    │  (Colleague)                            ║
║  └─────────────────────┘                                         ║
║                                                                   ║
║  ┌─────────────────────┐                                         ║
║  │ Ahmed - Student 🏷️  │  (My student)                           ║
║  └─────────────────────┘                                         ║
║                                                                   ║
║  ┌─────────────────────┐                                         ║
║  │ Ahmed - Parent 🏷️   │  (Parent of student)                    ║
║  └─────────────────────┘                                         ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## Final Answer to Your Question

**"Ahmed is a tutor, parent, and student. Which role will the badge read?"**

### Answer: **It depends on which profile Ahmed used to create that SPECIFIC connection!**

- If Ahmed connected as **TUTOR** → The connection stores `profile_type_1='tutor'`
- If Ahmed connected as **STUDENT** → The connection stores `profile_type_1='student'`
- If Ahmed connected as **PARENT** → The connection stores `profile_type_1='parent'`

**The OTHER person sees Ahmed's badge based on profile_type_1/2 in that connection.**

**Ahmed sees the OTHER person's badge (always).**

### Default Behavior (No Profile Specified)

If Ahmed doesn't explicitly choose a profile, the system auto-selects in this order:
1. **Tutor** (highest priority)
2. Student
3. Parent
4. Advertiser

So by default, Ahmed would connect as **Tutor** (unless he's on a specific profile page or explicitly requests a different profile).

---

## Key Takeaways

1. ✅ **Context matters:** Same user can have multiple connections with the same person
2. ✅ **Profile-based:** Each connection stores WHICH profile was used
3. ✅ **Accurate badges:** Badges always show the correct role for that specific connection context
4. ✅ **Priority system:** Auto-detection uses tutor → student → parent → advertiser priority
5. ✅ **Explicit control:** Users can specify which profile to use when creating connections

This is why the profile-based system is so powerful - it preserves context and relationship meaning! 🎯
