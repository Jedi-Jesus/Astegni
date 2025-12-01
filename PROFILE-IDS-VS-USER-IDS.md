# Profile IDs vs User IDs - Architecture Decision

## The Problem You Identified ✅

**Original Design (Using User IDs):**
```python
parent_profiles.children_ids = [50, 51, 52]  # user_ids
parent_profiles.coparent_ids = [20, 30]      # user_ids
student_profiles.parent_id = [10, 20]        # user_ids
```

**Issue:**
To get profile data, we need TWO queries:
1. Get user_ids from array
2. Query profiles WHERE user_id IN (...)

## The Solution (Using Profile IDs) ✅

**Better Design (Using Profile IDs):**
```python
parent_profiles.children_ids = [100, 101, 102]  # student_profile.id
parent_profiles.coparent_ids = [1, 2]           # parent_profile.id
student_profiles.parent_id = [1, 2]             # parent_profile.id
```

**Benefit:**
Direct profile lookup with ONE query:
```sql
SELECT * FROM student_profiles WHERE id IN (100, 101, 102);
SELECT * FROM parent_profiles WHERE id IN (1, 2);
```

---

## Performance Comparison

### **Scenario: Get All Children of a Parent**

**Using User IDs (Current - Slower):**
```python
# Step 1: Get parent profile
parent = db.query(ParentProfile).filter(ParentProfile.user_id == current_user_id).first()

# Step 2: Get children_ids (user IDs)
children_user_ids = parent.children_ids  # [50, 51, 52]

# Step 3: Query student_profiles for each user_id
children = []
for user_id in children_user_ids:
    student = db.query(StudentProfile).filter(StudentProfile.user_id == user_id).first()
    children.append(student)

# Total: 1 + N queries (where N = number of children)
# For 3 children: 4 queries total
```

**Using Profile IDs (Proposed - Faster):**
```python
# Step 1: Get parent profile
parent = db.query(ParentProfile).filter(ParentProfile.user_id == current_user_id).first()

# Step 2: Get children_ids (profile IDs)
children_profile_ids = parent.children_ids  # [100, 101, 102]

# Step 3: Query student_profiles with IN clause
children = db.query(StudentProfile).filter(StudentProfile.id.in_(children_profile_ids)).all()

# Total: 1 + 1 queries (constant)
# For 3 children: 2 queries total (50% reduction!)
```

---

## Database Schema Changes

### **Before (User IDs):**
```sql
-- parent_profiles
children_ids INTEGER[] DEFAULT '{}'     -- Contains user.id values
coparent_ids INTEGER[] DEFAULT '{}'     -- Contains user.id values

-- student_profiles
parent_id INTEGER[] DEFAULT '{}'        -- Contains user.id values
```

### **After (Profile IDs):**
```sql
-- parent_profiles
children_ids INTEGER[] DEFAULT '{}'     -- Contains student_profile.id values
coparent_ids INTEGER[] DEFAULT '{}'     -- Contains parent_profile.id values

-- student_profiles
parent_id INTEGER[] DEFAULT '{}'        -- Contains parent_profile.id values
```

---

## Migration Strategy

**File:** `migrate_use_profile_ids.py`

**What It Does:**
1. Converts `parent_profiles.children_ids` from user_ids to student_profile.id
2. Converts `parent_profiles.coparent_ids` from user_ids to parent_profile.id
3. Converts `student_profiles.parent_id` from user_ids to parent_profile.id

**How It Works:**
```sql
-- Example: Convert children_ids
UPDATE parent_profiles pp
SET children_ids = (
    SELECT ARRAY_AGG(sp.id)
    FROM student_profiles sp
    WHERE sp.user_id = ANY(pp.children_ids)
)
WHERE children_ids IS NOT NULL;
```

---

## Code Changes Required

### **1. Update `add_child` Endpoint:**

**Before:**
```python
# Add child's user_id to parent's children_ids
parent_profile.children_ids = parent_profile.children_ids + [new_user.id]

# Add parent's user_id to child's parent_id
student_profile.parent_id = [current_user.id]
```

**After:**
```python
# Create student profile first
student_profile = StudentProfile(user_id=new_user.id, parent_id=[parent_profile.id])
db.add(student_profile)
db.flush()  # Get student_profile.id

# Add child's profile_id to parent's children_ids
parent_profile.children_ids = parent_profile.children_ids + [student_profile.id]

# parent_id already set with parent_profile.id
```

### **2. Update `add_coparent` Endpoint:**

**Before:**
```python
# Set coparent_ids with user_ids
coparent_profile = ParentProfile(
    user_id=new_user.id,
    coparent_ids=[current_user.id]  # ❌ user_id
)
parent_profile.coparent_ids = parent_profile.coparent_ids + [new_user.id]  # ❌ user_id

# Update children's parent_id with user_id
student_profile.parent_id = student_profile.parent_id + [new_user.id]  # ❌ user_id
```

**After:**
```python
# Create coparent profile first
coparent_profile = ParentProfile(
    user_id=new_user.id,
    coparent_ids=[parent_profile.id]  # ✅ parent_profile.id
)
db.add(coparent_profile)
db.flush()  # Get coparent_profile.id

# Update current parent's coparent_ids
parent_profile.coparent_ids = parent_profile.coparent_ids + [coparent_profile.id]  # ✅ profile_id

# Update children's parent_id with profile_id
for child_id in parent_profile.children_ids:
    student_profile = db.query(StudentProfile).filter(StudentProfile.id == child_id).first()
    student_profile.parent_id = student_profile.parent_id + [coparent_profile.id]  # ✅ profile_id
```

### **3. Update `get_coparents` Endpoint:**

**Before:**
```python
# Query by user_id
for coparent_user_id in parent_profile.coparent_ids:
    parent_user = db.query(User).filter(User.id == coparent_user_id).first()
    coparent_profile = db.query(ParentProfile).filter(
        ParentProfile.user_id == coparent_user_id
    ).first()
```

**After:**
```python
# Query by profile_id (much faster!)
for coparent_profile_id in parent_profile.coparent_ids:
    coparent_profile = db.query(ParentProfile).filter(
        ParentProfile.id == coparent_profile_id
    ).first()
    parent_user = db.query(User).filter(User.id == coparent_profile.user_id).first()
```

---

## Benefits Summary

✅ **Performance:** 50% reduction in database queries
✅ **Simplicity:** Direct array lookups with `id IN (...)`
✅ **Scalability:** Better performance as families grow
✅ **Consistency:** All arrays use same ID type (profile IDs)

---

## Implementation Checklist

- [x] Create migration script (`migrate_use_profile_ids.py`)
- [ ] Run migration on database
- [ ] Update `add_child` endpoint to use `student_profile.id`
- [ ] Update `add_coparent` endpoint to use `parent_profile.id`
- [ ] Update `get_children` endpoint query
- [ ] Update `get_coparents` endpoint query
- [ ] Update models.py documentation
- [ ] Test all parent-child-coparent flows
- [ ] Update frontend JavaScript to expect profile_ids

---

## Email/SMS Integration ✅

**Architecture Answer:** YES, temporary passwords are sent via email/SMS!

**Flow:**
1. Parent adds child/co-parent
2. Backend creates user account with temp password
3. **Backend sends email/SMS automatically** with login credentials
4. Parent sees: "Account created! Login credentials sent to [email/phone]"
5. Child/co-parent receives notification and logs in
6. **Must change password** on first login

**Services to Use:**
- **Email:** SendGrid, AWS SES, Mailgun
- **SMS:** Twilio, AWS SNS, Africa's Talking (Ethiopian market)

**Security:**
- Temp password NEVER returned in API response (production)
- Only sent via email/SMS
- User forced to change password on first login
- Temp password expires after first use or 24 hours
