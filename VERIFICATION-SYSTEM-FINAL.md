# Student Enhancement Tables - Verification System (FINAL CORRECTED)

## Complete Verification Schema

All three student enhancement tables now have a **dual verification system**:

### Verification Fields

1. **verification_status** (VARCHAR(20)) - **PRIMARY field for filtering**
   - Values: 'pending', 'verified', 'rejected'
   - Used for filtering and queries
   - Has CHECK constraint
   - Indexed for fast filtering

2. **is_verified** (BOOLEAN) - **Quick boolean check**
   - TRUE if verified
   - FALSE if pending or rejected
   - Synced with verification_status
   - Used for simple true/false checks

3. **verified_by_admin_id** (INTEGER) - **FK to manage_uploads table**
   - References `manage_uploads(id)` (NOT users table)
   - Tracks which admin verified
   - ON DELETE SET NULL
   - Indexed for admin queries

4. **rejection_reason** (TEXT) - **Feedback for students**
   - NULL if verified or pending
   - Contains reason if rejected
   - Helps students understand why

5. **verified_at** (TIMESTAMP) - **Audit trail**
   - NULL if not yet verified
   - Records when verification happened
   - Useful for tracking

6. **document_url** (TEXT) - **Supporting documents**
   - Backblaze B2 URL
   - Uploaded by student
   - Viewed by admin during verification

---

## Why Both verification_status AND is_verified?

### verification_status (VARCHAR) - For Detailed States
```sql
-- Filter by specific state
SELECT * FROM student_achievements WHERE verification_status = 'pending';
SELECT * FROM student_achievements WHERE verification_status = 'verified';
SELECT * FROM student_achievements WHERE verification_status = 'rejected';

-- Admin dashboard counts
SELECT verification_status, COUNT(*)
FROM student_achievements
GROUP BY verification_status;
```

### is_verified (BOOLEAN) - For Quick Checks
```sql
-- Public view (only verified)
SELECT * FROM student_achievements WHERE is_verified = TRUE;

-- Simple true/false logic in code
if (achievement.is_verified) {
    showOnPublicProfile();
}
```

### Both Fields Stay In Sync
```sql
verification_status = 'verified'  → is_verified = TRUE
verification_status = 'pending'   → is_verified = FALSE
verification_status = 'rejected'  → is_verified = FALSE
```

---

## Foreign Key to manage_uploads Table

### Why manage_uploads instead of users?

The `manage_uploads` table contains admin verification information:
- Admin ID
- Admin name
- Department
- Role
- Timestamps

This allows tracking:
- Which admin from which department verified
- Admin's role at time of verification
- Department-level statistics

```sql
-- Query with admin info
SELECT
    a.*,
    m.admin_name,
    m.department,
    m.role
FROM student_achievements a
LEFT JOIN manage_uploads m ON a.verified_by_admin_id = m.id
WHERE a.student_id = 123;
```

---

## Complete Schema

### student_achievements
```sql
CREATE TABLE student_achievements (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

    -- Achievement details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    achievement_type VARCHAR(50), -- 'academic', 'competition', 'honor', 'award', 'other'
    issuing_organization VARCHAR(255),
    date_received DATE,

    -- VERIFICATION SYSTEM
    verification_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'verified', 'rejected'
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by_admin_id INTEGER REFERENCES manage_uploads(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    verified_at TIMESTAMP,

    -- Supporting documents
    document_url TEXT,

    -- Display settings
    is_featured BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT valid_achievement_type
        CHECK (achievement_type IN ('academic', 'competition', 'honor', 'award', 'other')),
    CONSTRAINT valid_verification_status
        CHECK (verification_status IN ('pending', 'verified', 'rejected'))
);
```

### student_certifications
```sql
CREATE TABLE student_certifications (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

    -- Certification details
    certification_name VARCHAR(255) NOT NULL,
    issuing_organization VARCHAR(255) NOT NULL,
    issue_date DATE,
    expiration_date DATE,
    credential_id VARCHAR(255),
    credential_url TEXT,
    skills TEXT[],
    description TEXT,

    -- VERIFICATION SYSTEM
    verification_status VARCHAR(20) DEFAULT 'pending',
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by_admin_id INTEGER REFERENCES manage_uploads(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    verified_at TIMESTAMP,

    -- Supporting documents
    document_url TEXT,

    -- Display settings
    is_featured BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT valid_certification_verification_status
        CHECK (verification_status IN ('pending', 'verified', 'rejected'))
);
```

### student_extracurricular_activities
```sql
CREATE TABLE student_extracurricular_activities (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

    -- Activity details
    activity_name VARCHAR(255) NOT NULL,
    activity_type VARCHAR(50), -- 'club', 'sport', 'volunteer', 'leadership', 'arts', 'music', 'drama', 'debate', 'other'
    organization_name VARCHAR(255),
    role_position VARCHAR(255),
    start_date DATE,
    end_date DATE,
    is_currently_active BOOLEAN DEFAULT TRUE,
    hours_per_week DECIMAL(4,1),
    description TEXT,
    achievements TEXT[],
    skills_gained TEXT[],

    -- VERIFICATION SYSTEM
    verification_status VARCHAR(20) DEFAULT 'pending',
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by_admin_id INTEGER REFERENCES manage_uploads(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    verified_at TIMESTAMP,

    -- Supporting documents
    document_url TEXT,

    -- Display settings
    is_featured BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT valid_activity_type
        CHECK (activity_type IN ('club', 'sport', 'volunteer', 'leadership', 'arts', 'music', 'drama', 'debate', 'other')),
    CONSTRAINT valid_activity_verification_status
        CHECK (verification_status IN ('pending', 'verified', 'rejected'))
);
```

---

## Verification Workflow

### 1. Student Creates Item
```sql
INSERT INTO student_achievements (student_id, title, description, ...)
VALUES (123, 'National Award', 'Description...');

-- Automatically set:
-- verification_status = 'pending' (default)
-- is_verified = FALSE (default)
```

### 2. Student Uploads Document (Optional)
```sql
UPDATE student_achievements
SET document_url = 'https://backblaze.b2.com/documents/user_123/certificate.pdf'
WHERE id = 456;
```

### 3a. Admin Approves
```sql
UPDATE student_achievements
SET verification_status = 'verified',
    is_verified = TRUE,
    verified_by_admin_id = 10,  -- manage_uploads.id
    verified_at = NOW(),
    rejection_reason = NULL
WHERE id = 456;
```

### 3b. Admin Rejects
```sql
UPDATE student_achievements
SET verification_status = 'rejected',
    is_verified = FALSE,
    verified_by_admin_id = 10,
    verified_at = NOW(),
    rejection_reason = 'Document is not clear. Please upload a higher quality scan showing all details.'
WHERE id = 456;
```

### 3c. Student Resubmits After Rejection
```sql
-- Student edits and resubmits
UPDATE student_achievements
SET verification_status = 'pending',  -- Reset to pending
    is_verified = FALSE,
    document_url = 'https://backblaze.b2.com/documents/user_123/certificate_v2.pdf',
    rejection_reason = NULL  -- Clear old rejection reason
WHERE id = 456;

-- Admin will review again
```

---

## Common Queries

### Get Pending Items (Admin Dashboard)
```sql
SELECT a.*, u.email as student_email
FROM student_achievements a
JOIN users u ON a.student_id = u.id
WHERE a.verification_status = 'pending'
ORDER BY a.created_at ASC;
```

### Get Verified Items (Public View)
```sql
SELECT * FROM student_achievements
WHERE student_id = 123
  AND is_verified = TRUE  -- Quick boolean check
ORDER BY display_order;
```

### Get Rejected Items (Student View)
```sql
SELECT * FROM student_achievements
WHERE student_id = 123
  AND verification_status = 'rejected'
ORDER BY verified_at DESC;
```

### Get Items by Admin (Admin Stats)
```sql
SELECT m.admin_name, m.department, COUNT(*) as verified_count
FROM student_achievements a
JOIN manage_uploads m ON a.verified_by_admin_id = m.id
WHERE a.verification_status = 'verified'
GROUP BY m.admin_name, m.department;
```

### Get Verification Statistics
```sql
SELECT
    verification_status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM student_achievements
GROUP BY verification_status;
```

---

## Database Indexes

### All Tables Have:
```sql
-- Student queries
idx_[table]_student_id

-- Type filtering
idx_achievements_type
idx_extracurricular_type

-- Verification filtering
idx_[table]_verification_status  -- NEW: For filtering by status
idx_[table]_verified              -- For boolean check
idx_[table]_admin                 -- For admin queries

-- Featured items
idx_[table]_featured

-- Special indexes
idx_certifications_expiration
idx_extracurricular_active
```

**Total: 22 indexes** across all three tables

---

## API Endpoint Examples

### Verify Item (Admin)
```python
@router.put("/api/admin/achievements/{id}/verify")
async def verify_achievement(
    id: int,
    approved: bool,
    rejection_reason: Optional[str] = None,
    admin_id: int = Depends(get_current_admin)
):
    # Get or create manage_uploads record
    manage_upload = get_or_create_manage_upload(admin_id)

    if approved:
        UPDATE student_achievements
        SET verification_status = 'verified',
            is_verified = TRUE,
            verified_by_admin_id = manage_upload.id,
            verified_at = NOW(),
            rejection_reason = NULL
        WHERE id = id
    else:
        UPDATE student_achievements
        SET verification_status = 'rejected',
            is_verified = FALSE,
            verified_by_admin_id = manage_upload.id,
            verified_at = NOW(),
            rejection_reason = rejection_reason
        WHERE id = id
```

### Get Pending Items (Admin)
```python
@router.get("/api/admin/achievements/pending")
async def get_pending_achievements():
    SELECT a.*, u.email, u.phone
    FROM student_achievements a
    JOIN users u ON a.student_id = u.id
    WHERE a.verification_status = 'pending'
    ORDER BY a.created_at
```

### Get Verified Items (Public)
```python
@router.get("/api/student/{student_id}/achievements")
async def get_student_achievements(student_id: int):
    SELECT * FROM student_achievements
    WHERE student_id = student_id
      AND is_verified = TRUE
    ORDER BY display_order
```

---

## Frontend Display Logic

```javascript
// Check verification status
if (item.verification_status === 'verified') {
    showVerifiedBadge();
} else if (item.verification_status === 'pending') {
    showPendingBadge();
} else if (item.verification_status === 'rejected') {
    showRejectedBadge();
    showRejectionReason(item.rejection_reason);
}

// Quick boolean check
if (item.is_verified) {
    displayOnPublicProfile();
}

// Show admin who verified
if (item.verified_by_admin_id) {
    fetchAdminInfo(item.verified_by_admin_id); // From manage_uploads table
}
```

---

## Current Statistics

```
Achievements:      20 total (18 verified, 2 pending, 0 rejected)
Certifications:    19 total (13 verified, 6 pending, 0 rejected)
Extracurricular:   23 total (15 verified, 8 pending, 0 rejected)
```

---

## Key Benefits

1. **Dual System**
   - `verification_status` for detailed state tracking
   - `is_verified` for quick boolean checks
   - Both stay synchronized

2. **Admin Accountability**
   - FK to `manage_uploads` table
   - Track department and role
   - Department-level statistics

3. **Student Feedback**
   - Clear rejection reasons
   - Ability to resubmit
   - Transparent process

4. **Audit Trail**
   - When verified (`verified_at`)
   - Who verified (`verified_by_admin_id`)
   - Why rejected (`rejection_reason`)

5. **Performance**
   - Multiple indexes for fast queries
   - Boolean field for simple checks
   - Efficient filtering

---

## Migration Files

1. `migrate_create_student_enhancement_tables.py` - Initial creation
2. `seed_student_enhancements.py` - Sample data
3. `migrate_update_verification_fields.py` - First update (incorrect)
4. `migrate_restore_verification_status.py` - **FINAL CORRECT VERSION**

**Run this to get correct schema:**
```bash
cd astegni-backend
python migrate_restore_verification_status.py
```

---

## Status

✓ Tables created with correct schema
✓ verification_status AND is_verified both present
✓ verified_by_admin_id references manage_uploads table
✓ All verification fields added
✓ Document URLs renamed
✓ Indexes optimized
✓ Sample data synced

**Ready for API development!**
