# Department Naming Convention - IMPORTANT

## ⚠️ Critical Issue Found and Fixed

### The Problem
The initial implementation used **title case with spaces** for department names:
- ❌ "Campaign Management"
- ❌ "System Settings"

But the database actually stores department names in **lowercase with hyphens**:
- ✅ "manage-campaigns"
- ✅ "manage-system-settings"

This mismatch caused **access denied errors** even for authorized admins.

---

## ✅ Correct Department Names

### Database Format (Actual)
All department names in the `admin_profile.departments` array use:
- **Lowercase letters**
- **Hyphens instead of spaces**
- **Format:** `manage-{module-name}`

### Current Department Names in Database

```sql
SELECT DISTINCT unnest(departments) as department
FROM admin_profile
ORDER BY department;
```

**Result:**
```
Campaign Management      ← OLD (being phased out)
Content Management       ← OLD
manage-campaigns         ← CORRECT ✓
manage-contents          ← CORRECT ✓
manage-courses           ← CORRECT ✓
manage-schools           ← CORRECT ✓
manage-system-settings   ← CORRECT ✓
Marketing                ← OTHER
System Settings          ← OLD (being phased out)
User Support             ← OTHER
```

---

## 🔧 Fixed Files

### Backend Files Updated

1. **[manage_campaigns_endpoints.py](astegni-backend/manage_campaigns_endpoints.py:25)**
   ```python
   # BEFORE (WRONG)
   ALLOWED_DEPARTMENTS = ["Campaign Management", "System Settings"]

   # AFTER (CORRECT)
   ALLOWED_DEPARTMENTS = ["manage-campaigns", "manage-system-settings"]
   ```

2. **[seed_manage_campaigns_profile.py](astegni-backend/seed_manage_campaigns_profile.py:56)**
   ```python
   # BEFORE
   departments = ['Campaign Management', 'Marketing']

   # AFTER
   departments = ['manage-campaigns']
   ```

3. **[test_campaign_access_control.py](astegni-backend/test_campaign_access_control.py:74)**
   ```python
   # BEFORE
   departments = ['Content Management', 'User Support']

   # AFTER
   departments = ['manage-contents', 'manage-users']
   ```

### Frontend Files Updated

1. **[manage-campaigns-data-loader.js](js/admin-pages/manage-campaigns-data-loader.js:13)**
   ```javascript
   // BEFORE
   let currentDepartment = 'Campaign Management';

   // AFTER
   let currentDepartment = 'manage-campaigns';
   ```

### Database Updates Applied

```sql
-- Update campaigns admin
UPDATE admin_profile
SET departments = ARRAY['manage-campaigns']
WHERE email = 'campaigns@astegni.et';

-- Update reviews
UPDATE admin_reviews
SET department = 'manage-campaigns'
WHERE department = 'Campaign Management';

-- Update system settings admin
UPDATE admin_profile
SET departments = ARRAY['manage-system-settings']
WHERE email = 'system_settings@astegni.et';
```

---

## 📋 Department Mapping Reference

| Page/Module | Correct Department Name | Old Name (Don't Use) |
|-------------|------------------------|----------------------|
| Manage Campaigns | `manage-campaigns` | ~~Campaign Management~~ |
| Manage Courses | `manage-courses` | ~~Course Management~~ |
| Manage Schools | `manage-schools` | ~~School Management~~ |
| Manage Contents | `manage-contents` | ~~Content Management~~ |
| Manage System Settings | `manage-system-settings` | ~~System Settings~~ |
| Manage Tutors | `manage-tutors` | ~~Tutor Management~~ |
| Manage Customers | `manage-customers` | ~~Customer Management~~ |

---

## 🎯 Implementation Rules

### When Adding New Departments

**Format:** `manage-{module-name}`

**Examples:**
```python
# Correct ✓
departments = ['manage-campaigns']
departments = ['manage-system-settings']
departments = ['manage-courses', 'manage-schools']

# Wrong ✗
departments = ['Campaign Management']
departments = ['System Settings']
departments = ['Manage Campaigns']  # No "Manage" prefix
```

### When Checking Access

```python
# Backend - Always use lowercase with hyphens
ALLOWED_DEPARTMENTS = ["manage-campaigns", "manage-system-settings"]

if not any(dept in ALLOWED_DEPARTMENTS for dept in admin_departments):
    raise HTTPException(403, "Access denied")
```

```javascript
// Frontend - Same format
const currentDepartment = 'manage-campaigns';
const url = `${API_BASE_URL}/api/admin-reviews/recent?department=${encodeURIComponent(currentDepartment)}`;
```

---

## 🧪 Testing Access Control

### Test With Correct Department Names

```bash
# Test 1: Admin with manage-campaigns
curl "http://localhost:8000/api/manage-campaigns/profile/7"
# Expected: 200 OK

# Test 2: Admin with manage-system-settings
curl "http://localhost:8000/api/manage-campaigns/profile/9"
# Expected: 200 OK

# Test 3: Admin with other departments
curl "http://localhost:8000/api/manage-campaigns/profile/8"
# Expected: 403 Forbidden
```

### Test Results (After Fix)

```
✓ Test 1: Admin with manage-campaigns → 200 OK
✓ Test 2: Admin without required dept → 403 Forbidden
✓ Test 3: Stats with authorized admin → 200 OK
✓ Test 4: Stats with unauthorized admin → 403 Forbidden
✓ Test 5: Admin with manage-system-settings → 200 OK

All tests passing! ✅
```

---

## 🔍 How to Check Current Department Names

### Check All Departments in Database

```sql
SELECT DISTINCT unnest(departments) as department
FROM admin_profile
ORDER BY department;
```

### Check Specific Admin's Departments

```sql
SELECT id, email, departments
FROM admin_profile
WHERE id = 7;
```

### Check Access Control Settings

```bash
# Backend
cd astegni-backend
grep -n "ALLOWED_DEPARTMENTS" manage_campaigns_endpoints.py
```

---

## 🚨 Common Mistakes to Avoid

### ❌ Don't Use Title Case
```python
# WRONG
ALLOWED_DEPARTMENTS = ["Campaign Management"]
department = "System Settings"
```

### ❌ Don't Use Spaces
```python
# WRONG
ALLOWED_DEPARTMENTS = ["manage campaigns"]
```

### ❌ Don't Mix Formats
```python
# WRONG - Inconsistent
ALLOWED_DEPARTMENTS = ["manage-campaigns", "System Settings"]
```

### ✅ Always Use Lowercase with Hyphens
```python
# CORRECT
ALLOWED_DEPARTMENTS = ["manage-campaigns", "manage-system-settings"]
department = "manage-courses"
```

---

## 📖 Why This Naming Convention?

### Benefits
1. **URL-friendly** - No spaces or special characters
2. **Database-friendly** - No case sensitivity issues
3. **Consistent** - Same format across all departments
4. **Predictable** - Easy to generate programmatically

### Pattern
```
manage-{singular-module-name}
```

**Examples:**
- manage-**campaign** (not campaigns)
- manage-**course** (not courses)
- manage-**school** (not schools)

Wait, I see both patterns in the database. Let me check:

```sql
-- Current actual names
manage-campaigns      ← plural ✓
manage-contents       ← plural ✓
manage-courses        ← plural ✓
manage-schools        ← plural ✓
manage-system-settings ← plural/special ✓
```

**Correction:** The pattern uses **plural** form:
```
manage-{plural-module-name}
```

---

## 🔄 Migration Guide

### If You Have Old Department Names

1. **Identify affected admins:**
   ```sql
   SELECT id, email, departments
   FROM admin_profile
   WHERE 'Campaign Management' = ANY(departments)
      OR 'System Settings' = ANY(departments);
   ```

2. **Update to new format:**
   ```sql
   UPDATE admin_profile
   SET departments = ARRAY['manage-campaigns']
   WHERE 'Campaign Management' = ANY(departments);

   UPDATE admin_profile
   SET departments = ARRAY['manage-system-settings']
   WHERE 'System Settings' = ANY(departments);
   ```

3. **Update reviews:**
   ```sql
   UPDATE admin_reviews
   SET department = 'manage-campaigns'
   WHERE department = 'Campaign Management';
   ```

4. **Verify:**
   ```sql
   SELECT DISTINCT unnest(departments) FROM admin_profile;
   ```

---

## ✅ Summary

### What Changed
- ❌ "Campaign Management" → ✅ "manage-campaigns"
- ❌ "System Settings" → ✅ "manage-system-settings"

### Where Updated
- ✅ Backend endpoints
- ✅ Seed data scripts
- ✅ Test scripts
- ✅ Frontend JavaScript
- ✅ Database records
- ✅ Review records

### Result
🎉 **All access control tests now passing!**

Admins with "manage-system-settings" can now successfully access the manage-campaigns page as intended.

---

## 📝 Quick Reference Card

```
┌─────────────────────────────────────────────────┐
│       DEPARTMENT NAMING CONVENTION              │
├─────────────────────────────────────────────────┤
│ Format:  manage-{plural-name}                   │
│                                                 │
│ Examples:                                       │
│   ✓ manage-campaigns                            │
│   ✓ manage-system-settings                      │
│   ✓ manage-courses                              │
│   ✓ manage-schools                              │
│                                                 │
│ Rules:                                          │
│   • All lowercase                               │
│   • Hyphens not spaces                          │
│   • Plural form                                 │
│   • Prefix: manage-                             │
│                                                 │
│ Wrong:                                          │
│   ✗ Campaign Management (spaces)                │
│   ✗ Manage_Campaigns (underscores)              │
│   ✗ MANAGE-CAMPAIGNS (uppercase)                │
│   ✗ manageCampaigns (camelCase)                 │
└─────────────────────────────────────────────────┘
```

---

**IMPORTANT:** Always check the database first before assuming department names!

```bash
# Quick check command
psql "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db" \
  -c "SELECT DISTINCT unnest(departments) FROM admin_profile ORDER BY 1"
```
