# Session Requests Architecture - Quick Reference

## Architecture Answer: YES, it uses `tutor_id` (tutor_profiles.id)

The session requests system uses **role-specific profile IDs**, NOT `users.id`:
- ✅ `tutor_id` = `tutor_profiles.id`
- ✅ `requester_id` = `student_profiles.id` OR `parent_profiles.id`

---

## 📋 Table Structure

```sql
session_requests
├── id (PRIMARY KEY)
├── tutor_id → tutor_profiles.id (FK ✅)
├── requester_id → student_profiles.id OR parent_profiles.id (NO FK ⚠️)
├── requester_type ('student' OR 'parent')
├── package_id → tutor_packages.id (FK ✅)
├── status ('pending', 'accepted', 'rejected')
└── ... (student_name, grade, contact info, etc.)
```

---

## 🔄 Data Flow: Loading Requested Sessions

### 1️⃣ Frontend Initiates Request
**File:** [js/tutor-profile/session-request-manager.js:35-42](js/tutor-profile/session-request-manager.js#L35-L42)

```javascript
// Triggered by panel switch or page load
SessionRequestManager.loadRequests('pending');

// Makes API call
fetch('http://localhost:8000/api/session-requests/tutor?status=pending', {
    headers: { 'Authorization': `Bearer ${token}` }
});
```

### 2️⃣ Backend Extracts Tutor ID from JWT
**File:** [session_request_endpoints.py:233-241](astegni-backend/session_request_endpoints.py#L233-L241)

```python
# Decode JWT token
role_ids = current_user.get('role_ids', {})  # {tutor: 85, student: 27}
tutor_id = role_ids.get('tutor')             # 85 = tutor_profiles.id

if not tutor_id:
    raise HTTPException(status_code=400, detail="Tutor profile not found")

tutor_id = int(tutor_id)  # Convert from string
```

### 3️⃣ Query Database with Profile ID
**File:** [session_request_endpoints.py:245-288](astegni-backend/session_request_endpoints.py#L245-L288)

```python
SELECT sr.*,
    CASE
        WHEN sr.requester_type = 'student' THEN
            (SELECT name FROM student_profiles sp WHERE sp.id = sr.requester_id)
        WHEN sr.requester_type = 'parent' THEN
            (SELECT name FROM parent_profiles pp WHERE pp.id = sr.requester_id)
    END as requester_name
FROM session_requests sr
WHERE sr.tutor_id = 85  -- ✅ tutor_profiles.id (NOT users.id)
AND sr.status = 'pending'
ORDER BY sr.created_at DESC;
```

### 4️⃣ Frontend Renders Results
**File:** [js/tutor-profile/session-request-manager.js:63-84](js/tutor-profile/session-request-manager.js#L63-L84)

```javascript
// Populates #session-requests-list div
container.innerHTML = `
    <table>
        ${requests.map(request => renderRequestRow(request)).join('')}
    </table>
`;
```

---

## 🎯 Key Points

1. **JWT Token Contains Role-Specific IDs**
   ```json
   {
     "sub": "115",                    // users.id
     "role_ids": {
       "tutor": 85,                  // tutor_profiles.id ✅
       "student": 27                 // student_profiles.id ✅
     },
     "role": "tutor"
   }
   ```

2. **Backend Extracts Profile ID, NOT User ID**
   - ❌ Does NOT use `current_user['id']` (115 = users.id)
   - ✅ Uses `role_ids['tutor']` (85 = tutor_profiles.id)

3. **Query Filters by Profile ID**
   - ✅ `WHERE tutor_id = 85` (tutor_profiles.id)
   - ❌ NOT `WHERE tutor_id = 115` (users.id)

4. **Foreign Key Enforces Integrity**
   ```sql
   CONSTRAINT fk_session_requests_tutor
       FOREIGN KEY (tutor_id)
       REFERENCES tutor_profiles(id)
       ON DELETE CASCADE
   ```

---

## 📊 Example Data

### User with Multiple Roles
```
users.id = 115
├── tutor_profiles.id = 85 (user_id: 115)
├── student_profiles.id = 27 (user_id: 115)
└── parent_profiles.id = 1 (user_id: 115)
```

### Session Request Record
```sql
INSERT INTO session_requests (tutor_id, requester_id, requester_type)
VALUES (85, 27, 'student');
       ^^  ^^   ^^^^^^^^^
       |   |    └── Determines which profile table requester_id references
       |   └────── student_profiles.id = 27
       └────────── tutor_profiles.id = 85
```

---

## 🔧 Schema Migration

**File:** `astegni-backend/migrate_fix_session_requests_fk.py`

**What it does:**
1. Migrates existing data from `users.id` → `profile.id`
2. Adds correct foreign key: `tutor_id` → `tutor_profiles.id`
3. Validates all data integrity

**Run it:**
```bash
cd astegni-backend
python migrate_fix_session_requests_fk.py
```

**Results:**
- ✅ 6 tutor_id values migrated
- ✅ 5 student requester_id values migrated
- ✅ 1 parent requester_id values migrated
- ✅ Foreign key constraint added
- ✅ All data validated

---

## ✅ Summary

| Component | Uses Profile ID? | Table Reference |
|-----------|-----------------|-----------------|
| `tutor_id` | ✅ YES | `tutor_profiles.id` |
| `requester_id` (student) | ✅ YES | `student_profiles.id` |
| `requester_id` (parent) | ✅ YES | `parent_profiles.id` |
| Foreign Key | ✅ YES | `tutor_profiles(id)` |
| JWT Token | ✅ YES | Contains `role_ids` mapping |
| Backend Logic | ✅ YES | Extracts from `role_ids` |
| Database Query | ✅ YES | Filters by profile ID |

**Answer:** Yes, the architecture correctly uses `tutor_id` from `tutor_profiles.id` for reading requested sessions. The schema has been fixed and all data migrated successfully. 🎯
