# Connection Role Badges - Visual Guide

## Quick Visual Reference

### How Profile-Based Badges Work

```
┌─────────────────────────────────────────────────────────────────────┐
│                     AHMED'S PERSPECTIVE                              │
│                    (Student, user_id: 50)                           │
└─────────────────────────────────────────────────────────────────────┘

When Ahmed opens the Community Modal, he sees:

╔═══════════════════════════════════════════════════════════════════╗
║  Community Modal - My Connections                                 ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  ┌─────────────────────┐  ┌─────────────────────┐              ║
║  │  [Sara's Photo]     │  │  [Daniel's Photo]   │              ║
║  │                     │  │                     │              ║
║  │  Sara Tadesse       │  │  Daniel Girma       │              ║
║  │  🏷️ Tutor           │  │  🏷️ Tutor           │              ║
║  │                     │  │                     │              ║
║  │  Connected 15 days  │  │  Connected 8 days   │              ║
║  │  ago                │  │  ago                │              ║
║  │  [Message] [View]   │  │  [Message] [View]   │              ║
║  └─────────────────────┘  └─────────────────────┘              ║
║                                                                   ║
║  ┌─────────────────────┐  ┌─────────────────────┐              ║
║  │  [Abebe's Photo]    │  │  [Tigist's Photo]   │              ║
║  │                     │  │                     │              ║
║  │  Abebe Bekele       │  │  Tigist Haile       │              ║
║  │  🏷️ Student         │  │  🏷️ Parent          │              ║
║  │                     │  │                     │              ║
║  │  Connected 22 days  │  │  Connected 10 days  │              ║
║  │  ago                │  │  ago                │              ║
║  │  [Message] [View]   │  │  [Message] [View]   │              ║
║  └─────────────────────┘  └─────────────────────┘              ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝

Each badge shows the OTHER person's profile type!
```

---

## Database Records Behind The Scenes

### Connection 1: Ahmed → Sara

```sql
┌──────────────────────────────────────────────────────────┐
│ connections table - Record #1                            │
├──────────────────────────────────────────────────────────┤
│ user_id_1:       50              (Ahmed)                │
│ profile_id_1:    12              (Ahmed's student ID)   │
│ profile_type_1:  "student"       (Ahmed's role)         │
│                                                          │
│ user_id_2:       75              (Sara)                 │
│ profile_id_2:    85              (Sara's tutor ID)      │
│ profile_type_2:  "tutor"         ← BADGE SOURCE! 🎯     │
│                                                          │
│ status:          "connected"                            │
└──────────────────────────────────────────────────────────┘

Ahmed sees: "Tutor" badge (Sara's profile_type_2)
Sara sees: "Student" badge (Ahmed's profile_type_1)
```

### Connection 2: Ahmed → Daniel

```sql
┌──────────────────────────────────────────────────────────┐
│ connections table - Record #2                            │
├──────────────────────────────────────────────────────────┤
│ user_id_1:       50              (Ahmed)                │
│ profile_id_1:    12              (Ahmed's student ID)   │
│ profile_type_1:  "student"       (Ahmed's role)         │
│                                                          │
│ user_id_2:       90              (Daniel)               │
│ profile_id_2:    95              (Daniel's tutor ID)    │
│ profile_type_2:  "tutor"         ← BADGE SOURCE! 🎯     │
│                                                          │
│ status:          "connected"                            │
└──────────────────────────────────────────────────────────┘

Ahmed sees: "Tutor" badge (Daniel's profile_type_2)
Daniel sees: "Student" badge (Ahmed's profile_type_1)
```

---

## Code Flow Visualization

### Step 1: API Request

```javascript
// Frontend requests connections
fetch('http://localhost:8000/api/connections/my', {
    headers: { 'Authorization': 'Bearer ' + token }
})
```

### Step 2: Backend Response

```json
{
    "id": 1,
    "user_id_1": 50,               // Ahmed (current viewer)
    "profile_id_1": 12,
    "profile_type_1": "student",   // Ahmed's profile type

    "user_id_2": 75,               // Sara (other person)
    "profile_id_2": 85,
    "profile_type_2": "tutor",     // ← THIS becomes the badge!

    "user_2_name": "Sara Tadesse",
    "user_2_profile_picture": "sara.jpg",
    "status": "connected"
}
```

### Step 3: Frontend Processing

```javascript
function getProfileBadge(connection) {
    const currentUserId = 50;  // Ahmed

    if (connection.user_id_1 === currentUserId) {
        // Ahmed is user_id_1, so show user_2's profile type
        return connection.profile_type_2;  // "tutor"
    }
}
```

### Step 4: UI Rendering

```html
<div class="connection-card">
    <img src="sara.jpg" alt="Sara Tadesse">
    <h4>Sara Tadesse</h4>
    <p>
        <span class="role-badge">Tutor</span>  ← Displayed!
    </p>
</div>
```

---

## Multi-Role User Example

### Scenario: Abebe Has TWO Profiles

```
┌─────────────────────────────────────────────────────────────┐
│  ABEBE (user_id: 100)                                       │
│  ├─ Student Profile (profile_id: 20)                        │
│  └─ Tutor Profile (profile_id: 80)                          │
└─────────────────────────────────────────────────────────────┘
```

### Connection as Student

```sql
┌──────────────────────────────────────────────────────────┐
│ Connection #10: Student Abebe → Tutor Tigist            │
├──────────────────────────────────────────────────────────┤
│ user_id_1:       100             (Abebe)                │
│ profile_id_1:    20              (Abebe's STUDENT ID)   │
│ profile_type_1:  "student"                              │
│                                                          │
│ user_id_2:       110             (Tigist)               │
│ profile_id_2:    90              (Tigist's tutor ID)    │
│ profile_type_2:  "tutor"         ← BADGE: "Tutor" 🎯    │
└──────────────────────────────────────────────────────────┘

When Abebe (as student) views: Badge shows "Tutor"
Context: Mentor-mentee relationship
```

### Connection as Tutor

```sql
┌──────────────────────────────────────────────────────────┐
│ Connection #11: Tutor Abebe → Tutor Tigist              │
├──────────────────────────────────────────────────────────┤
│ user_id_1:       100             (Abebe)                │
│ profile_id_1:    80              (Abebe's TUTOR ID)     │
│ profile_type_1:  "tutor"                                │
│                                                          │
│ user_id_2:       110             (Tigist)               │
│ profile_id_2:    90              (Tigist's tutor ID)    │
│ profile_type_2:  "tutor"         ← BADGE: "Tutor" 🎯    │
└──────────────────────────────────────────────────────────┘

When Abebe (as tutor) views: Badge shows "Tutor"
Context: Professional network
```

**Key Insight:** Same user (Abebe) can have DIFFERENT connections with the same person (Tigist) based on which profile they're using!

---

## Filter Buttons in Community Modal

```
╔═══════════════════════════════════════════════════════════╗
║  Filters:  [All]  [👨‍🎓 Students]  [👪 Parents]  [👔 Tutors]  ║
╚═══════════════════════════════════════════════════════════╝
```

### How Filters Work

**Click "Students":**
```javascript
// Shows connections where OTHER person's profile type is "student"
connections.filter(conn => {
    const otherProfileType = (conn.user_id_1 === currentUserId)
        ? conn.profile_type_2
        : conn.profile_type_1;
    return otherProfileType === 'student';
});
```

**Click "Tutors":**
```javascript
// Shows connections where OTHER person's profile type is "tutor"
connections.filter(conn => {
    const otherProfileType = (conn.user_id_1 === currentUserId)
        ? conn.profile_type_2
        : conn.profile_type_1;
    return otherProfileType === 'tutor';
});
```

---

## Before vs After Comparison

### ❌ WRONG WAY (User-Based)

```javascript
// Don't do this!
function getProfileBadge(connection) {
    return user.roles[0];  // ❌ Shows current user's role
}

// Result: Ahmed sees "Student" for all connections (his own role)
```

### ✅ CORRECT WAY (Profile-Based)

```javascript
// Do this!
function getProfileBadge(connection) {
    if (connection.user_id_1 === currentUserId) {
        return connection.profile_type_2;  // ✅ Shows OTHER person's role
    } else {
        return connection.profile_type_1;  // ✅ Shows OTHER person's role
    }
}

// Result: Ahmed sees "Tutor" for Sara, "Student" for Abebe, etc.
```

---

## Badge Mapping

```javascript
const profileTypeMap = {
    'tutor':      'Tutor',      // From tutor_profiles table
    'student':    'Student',    // From student_profiles table
    'parent':     'Parent',     // From parent_profiles table
    'advertiser': 'Advertiser'  // From advertiser_profiles table
};
```

---

## Summary Diagram

```
DATABASE                API RESPONSE            FRONTEND LOGIC           UI DISPLAY
═══════════            ═══════════════          ══════════════          ═══════════

connections            ConnectionResponse       getProfileBadge()       Connection Card
table                  {                        ↓                       ┌─────────────┐
┌─────────┐             profile_type_2:        Determines OTHER        │ [Photo]     │
│profile_ │             "tutor"                person's type           │             │
│type_2:  │  ───────→  }                       ↓                       │ Sara T.     │
│"tutor"  │                                    Returns "Tutor"         │ 🏷️ Tutor    │
└─────────┘                                    ↓                       │             │
                                               Badge = "Tutor"         └─────────────┘
```

---

## Testing Checklist

### ✅ Verify Badge Accuracy

1. **Login as student:**
   - View tutor connection → Should show "Tutor" badge ✅
   - View parent connection → Should show "Parent" badge ✅
   - View student connection → Should show "Student" badge ✅

2. **Login as tutor:**
   - View student connection → Should show "Student" badge ✅
   - View other tutor connection → Should show "Tutor" badge ✅
   - View parent connection → Should show "Parent" badge ✅

3. **Test filters:**
   - Click "Students" filter → Only shows connections with "Student" badge ✅
   - Click "Tutors" filter → Only shows connections with "Tutor" badge ✅
   - Click "Parents" filter → Only shows connections with "Parent" badge ✅

4. **Multi-role user:**
   - User with student + tutor profiles
   - Should have separate connections for each role ✅
   - Badges should reflect the OTHER person's role in each context ✅

---

## Quick Reference Table

| Viewer Role | Connection With | Badge Shown | Source Field |
|-------------|----------------|-------------|--------------|
| Student | Tutor | "Tutor" | profile_type_2 |
| Student | Parent | "Parent" | profile_type_2 |
| Student | Student | "Student" | profile_type_2 |
| Tutor | Student | "Student" | profile_type_2 |
| Tutor | Tutor | "Tutor" | profile_type_2 |
| Parent | Tutor | "Tutor" | profile_type_2 |
| Parent | Student | "Student" | profile_type_2 |

**Rule:** Always shows the OTHER person's profile type, never the current viewer's role!

---

## Files to Check

If you want to verify the implementation yourself:

1. **Database Schema:**
   - File: `astegni-backend/app.py modules/models.py`
   - Look for: `class Connection(Base)` (line 739)

2. **API Response:**
   - File: `astegni-backend/app.py modules/models.py`
   - Look for: `class ConnectionResponse(BaseModel)` (line 1165)

3. **Badge Function:**
   - File: `js/tutor-profile/global-functions.js`
   - Look for: `function getProfileBadge(connection)` (line 1722)

4. **Card Rendering:**
   - File: `js/tutor-profile/global-functions.js`
   - Look for: `function renderConnectionCard(connection)` (line 1955)

5. **Modal HTML:**
   - File: `profile-pages/tutor-profile.html`
   - Look for: `<div id="communityModal"` (line 3345)

---

## Conclusion

✅ **The connection role badges are 100% profile-based and accurate!**

Each badge shows the OTHER person's actual profile type from the database, ensuring context-aware and meaningful connections throughout the Astegni platform.
