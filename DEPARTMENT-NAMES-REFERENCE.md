# Department Names Reference - Complete List

## ✅ Correct Department Names (Database Format)

Based on actual codebase analysis, here are the **exact** department names used in the system:

### Active Departments

| Department Name | Admin Page | Description |
|----------------|-----------|-------------|
| `manage-campaigns` | manage-campaigns.html | Campaign & Advertising Management |
| `manage-courses` | manage-courses.html | Course Management |
| `manage-schools` | manage-schools.html | School Management |
| `manage-tutor-documents` | manage-tutor-documents.html | Tutor Document Verification |
| `manage-customers` | manage-customers.html | Customer Management |
| `manage-contents` | manage-contents.html | Content Management |
| `manage-system-settings` | manage-system-settings.html | System Settings (Super Admin) |

### Special Notes

**IMPORTANT:**
- ✅ It's `manage-tutor-documents` (with hyphen between "tutor" and "documents")
- ❌ NOT `manage-tutors`
- ❌ NOT `manage-tutor`

The older files may reference `manage-tutors`, but the correct name is **`manage-tutor-documents`**.

---

## 📋 Department Access Matrix

| Page/Feature | Allowed Departments |
|--------------|-------------------|
| manage-campaigns.html | `manage-campaigns`, `manage-system-settings` |
| manage-courses.html | `manage-courses`, `manage-system-settings` |
| manage-schools.html | `manage-schools`, `manage-system-settings` |
| manage-tutor-documents.html | `manage-tutor-documents`, `manage-system-settings` |
| manage-customers.html | `manage-customers`, `manage-system-settings` |
| manage-contents.html | `manage-contents`, `manage-system-settings` |
| manage-system-settings.html | `manage-system-settings` only |

**Rule:** `manage-system-settings` has access to ALL pages (super admin privilege)

---

## 🔍 Evidence from Codebase

### From admin_auth_endpoints.py
```python
DEPARTMENT_PAGES = {
    "manage-campaigns": ["manage-campaigns.html"],
    "manage-schools": ["manage-schools.html"],
    "manage-courses": ["manage-courses.html"],
    "manage-tutor-documents": ["manage-tutor-documents.html"],  # ← CORRECT
    "manage-customers": ["manage-customers.html"],
    "manage-contents": ["manage-contents.html"],
}
```

### From admin_profile_endpoints.py
```python
@router.get("/manage-tutor-documents-profile/{admin_id}")
async def get_manage_tutor_documents_profile(admin_id: int):
    """
    RESTRICTED ACCESS:
    - manage-tutor-documents department: Full tutor management profile
    - manage-system-settings department: Full access (system admin)
    """
    is_system_admin = "manage-system-settings" in departments
    is_tutors_admin = "manage-tutor-documents" in departments  # ← CORRECT
```

---

## 🗂️ Database Table Names

Each department has a corresponding profile table:

| Department | Profile Table |
|-----------|--------------|
| `manage-campaigns` | `manage_campaigns_profile` |
| `manage-courses` | `manage_courses_profile` |
| `manage-schools` | `manage_schools_profile` |
| `manage-tutor-documents` | `manage_tutors_profile` |
| `manage-customers` | `manage_customers_profile` |
| `manage-contents` | `manage_contents_profile` |
| `manage-system-settings` | `manage_system_settings_profile` |

**Note:** The table name is `manage_tutors_profile` (underscores), but the department name is `manage-tutor-documents` (hyphens).

---

## 📝 Naming Convention Rules

### Department Names (in admin_profile.departments array)
```
Format: manage-{module-name}

Rules:
- All lowercase
- Use hyphens (not underscores or spaces)
- Stored in admin_profile.departments array
- Use in access control checks

Examples:
✅ manage-campaigns
✅ manage-tutor-documents  (note: "tutor-documents", not "tutors")
✅ manage-system-settings
```

### Table Names (in database)
```
Format: manage_{module_name}_profile

Rules:
- All lowercase
- Use underscores (not hyphens)
- Singular or plural depending on convention

Examples:
✅ manage_campaigns_profile
✅ manage_tutors_profile  (note: "tutors" plural in table name)
✅ manage_system_settings_profile
```

### HTML File Names
```
Format: manage-{module-name}.html

Rules:
- All lowercase
- Use hyphens
- Matches department name

Examples:
✅ manage-campaigns.html
✅ manage-tutor-documents.html
✅ manage-system-settings.html
```

---

## 🚨 Common Mistakes

### ❌ Wrong Department Names
```python
# WRONG - These don't exist in the system
"manage-tutors"           # Should be: manage-tutor-documents
"Campaign Management"     # Should be: manage-campaigns
"System Settings"         # Should be: manage-system-settings
"Tutor Management"        # Should be: manage-tutor-documents
```

### ✅ Correct Department Names
```python
# CORRECT
"manage-campaigns"
"manage-tutor-documents"  # ← Note the hyphen between tutor and documents
"manage-system-settings"
"manage-courses"
"manage-schools"
```

---

## 🔄 Migration from Old Names

If you have old department names in your database, update them:

```sql
-- Update old "manage-tutors" to correct "manage-tutor-documents"
UPDATE admin_profile
SET departments = array_replace(departments, 'manage-tutors', 'manage-tutor-documents')
WHERE 'manage-tutors' = ANY(departments);

-- Update old title case names
UPDATE admin_profile
SET departments = array_replace(departments, 'Campaign Management', 'manage-campaigns')
WHERE 'Campaign Management' = ANY(departments);

UPDATE admin_profile
SET departments = array_replace(departments, 'System Settings', 'manage-system-settings')
WHERE 'System Settings' = ANY(departments);

-- Verify
SELECT DISTINCT unnest(departments) as department
FROM admin_profile
ORDER BY department;
```

---

## 📊 Current Department Distribution

To see what departments are actually in use:

```sql
-- Get all unique departments
SELECT
    department,
    COUNT(*) as admin_count
FROM (
    SELECT unnest(departments) as department
    FROM admin_profile
) sub
GROUP BY department
ORDER BY admin_count DESC, department;
```

Expected output:
```
            department            | admin_count
---------------------------------+-------------
 manage-system-settings          |     5
 manage-campaigns                |     2
 manage-courses                  |     1
 manage-tutor-documents          |     0
 manage-schools                  |     1
```

---

## 🎯 Quick Reference Card

```
┌────────────────────────────────────────────────────┐
│          DEPARTMENT NAMING REFERENCE               │
├────────────────────────────────────────────────────┤
│                                                    │
│  Department Name (code):  manage-tutor-documents  │
│  Table Name (database):   manage_tutors_profile   │
│  HTML File:              manage-tutor-documents.html│
│                                                    │
│  ⚠️  NOT "manage-tutors"                           │
│  ⚠️  NOT "Tutor Management"                        │
│                                                    │
│  ────────────────────────────────────────────────  │
│                                                    │
│  COMPLETE LIST:                                    │
│  • manage-campaigns                                │
│  • manage-courses                                  │
│  • manage-schools                                  │
│  • manage-tutor-documents ← Note the hyphen!       │
│  • manage-customers                                │
│  • manage-contents                                 │
│  • manage-system-settings                          │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## ✅ Summary

**Key Takeaway:** The tutor management department is called **`manage-tutor-documents`** (with a hyphen between "tutor" and "documents"), not `manage-tutors`.

**Why the confusion?**
- The database table is named `manage_tutors_profile` (plural)
- But the department name is `manage-tutor-documents` (singular-hyphen-plural)
- Old code/comments may reference `manage-tutors`

**Always check:**
```bash
# Verify department names in your database
psql "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db" \
  -c "SELECT DISTINCT unnest(departments) FROM admin_profile ORDER BY 1"
```

**Source of truth:**
- Backend: `admin_auth_endpoints.py` → `DEPARTMENT_PAGES` constant
- Database: `admin_profile.departments` column
