# Deploy Missing Tables to Production

**Date:** 2026-01-16
**Status:** Ready to deploy

---

## Summary

### call_logs Table: ✅ ALREADY EXISTS IN PRODUCTION
- Structure: Complete with 13 fields
- Status: Empty (0 records)
- **No action needed**

### Missing Tables in Production (5 tables):
1. **notes** - Advanced notes system
2. **note_media** - Note media attachments
3. **note_exports** - Note export tracking
4. **campaign_invoices** - Campaign billing
5. **whiteboard_sessions_legacy_backup_20260110_101940** - Legacy backup (can skip)

---

## Verification System Analysis

### Current Code Usage (Confirmed):

Your codebase **HAS MIGRATED** to the new consolidated verification system:

**Primary System (NEW - Currently Used):**
```python
user.is_verified = True              # Main verification flag (NOT NULL, default False)
user.verified_at = datetime.utcnow() # When verified
user.verification_method = 'kyc'     # How verified (kyc/manual/auto)
user.verification_status = 'approved' # Status (pending/approved/rejected)
```

**Legacy System (OLD - Kept for Backward Compatibility):**
```python
user.kyc_verified = True             # DEPRECATED but still updated
user.kyc_verified_at = datetime.utcnow()
user.kyc_verification_id = verification.id
```

### Code Evidence:

From [kyc_endpoints.py:811-818](kyc_endpoints.py#L811-L818):
```python
# NEW: Set is_verified as the canonical verification field
user.is_verified = True
user.verified_at = datetime.utcnow()
user.verification_method = 'kyc'

# DEPRECATED: Keep kyc_verified for backward compatibility
user.kyc_verified = True
user.kyc_verified_at = datetime.utcnow()
user.kyc_verification_id = verification.id
```

### Field Usage Statistics:

| File | is_verified | kyc_verified | verification_status |
|------|-------------|--------------|---------------------|
| app.py modules/routes.py | **41** | 10 | **41** |
| kyc_endpoints.py | **15** | 12 | 1 |
| parent_endpoints.py | **10** | 0 | **6** |
| view_tutor_endpoints.py | **16** | 0 | **5** |

**Conclusion:** Code is heavily using `is_verified` (82 occurrences) vs `kyc_verified` (22 occurrences). The migration is complete.

---

## Production Database Status

### is_verified in Production vs Local:

**Local (Development/Testing):**
- 3 users, all with `is_verified=True`
- Used for testing KYC flow
- ✅ Correct behavior

**Production (Live):**
- 6 users, all with `is_verified=False`
- Users haven't completed KYC yet
- ✅ Correct behavior (no one has verified yet)

### Important Finding:

**This is CORRECT!** Production users are genuinely unverified because:
1. KYC system is working properly
2. Production users haven't completed KYC verification yet
3. Once they complete KYC, code will automatically set `is_verified=True`

**When code is committed/deployed:** ✅ No issues expected
- Code already uses new system
- Production schema is correct
- When users complete KYC, they'll be marked as verified

---

## Deployment Steps

### Option 1: Deploy Notes System Only (Recommended)

```bash
# SSH to production
ssh root@128.140.122.215

# Navigate to backend
cd /var/www/astegni/astegni-backend
source venv/bin/activate

# Backup first!
pg_dump astegni_user_db > /var/backups/user_db_notes_migration_$(date +%Y%m%d_%H%M%S).sql

# Run notes migration
python migrate_create_notes_tables.py

# Verify tables created
python -c "
from sqlalchemy import create_engine, inspect
import os
from dotenv import load_dotenv
load_dotenv()
engine = create_engine(os.getenv('DATABASE_URL'))
inspector = inspect(engine)
tables = inspector.get_table_names()
print('notes' in tables, 'note_media' in tables, 'note_exports' in tables)
"

# Restart backend
systemctl restart astegni-backend

# Check logs
journalctl -u astegni-backend -f
```

### Option 2: Deploy via Git (Auto-deployment)

If migration scripts are in the repo:
```bash
# Local machine
git add astegni-backend/migrate_create_notes_tables.py
git commit -m "Add notes tables migration"
git push origin main

# SSH to production (after auto-pull)
ssh root@128.140.122.215
cd /var/www/astegni/astegni-backend
source venv/bin/activate
python migrate_create_notes_tables.py
systemctl restart astegni-backend
```

### Option 3: Manual SQL Migration

If you prefer SQL:
```sql
-- Connect to production database
psql -U astegni_user -d astegni_user_db

-- Create notes table
CREATE TABLE notes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    profile_id INTEGER NOT NULL,
    profile_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    folder VARCHAR(255),
    tags TEXT[],
    is_pinned BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    shared_with JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create note_media table
CREATE TABLE note_media (
    id SERIAL PRIMARY KEY,
    note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    media_type VARCHAR(50) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_name VARCHAR(255),
    file_size INTEGER,
    mime_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create note_exports table
CREATE TABLE note_exports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    export_format VARCHAR(20) NOT NULL,
    file_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_profile ON notes(profile_id, profile_type);
CREATE INDEX idx_note_media_note_id ON note_media(note_id);
CREATE INDEX idx_note_exports_user_id ON note_exports(user_id);
```

---

## Campaign Invoices Table

If you need campaign_invoices table, check if migration exists:
```bash
# Check for migration file
ls astegni-backend/migrate_*campaign*
```

If not, the table structure likely needs to be created. Check if campaign invoicing is actually being used in production.

---

## Tables to SKIP Deploying

### whiteboard_sessions_legacy_backup_20260110_101940
- This is a backup table from 2026-01-10
- Created during a previous migration
- **Do NOT deploy to production** - it's just a safety backup

---

## Verification After Deployment

```bash
# Check table counts match
ssh root@128.140.122.215 "cd /var/www/astegni/astegni-backend && source venv/bin/activate && python -c \"
from sqlalchemy import create_engine, inspect
import os
from dotenv import load_dotenv
load_dotenv()
engine = create_engine(os.getenv('DATABASE_URL'))
inspector = inspect(engine)
print(f'Total tables: {len(inspector.get_table_names())}')
print('notes:', 'notes' in inspector.get_table_names())
print('note_media:', 'note_media' in inspector.get_table_names())
print('note_exports:', 'note_exports' in inspector.get_table_names())
\""

# Test notes endpoint
curl -X GET https://api.astegni.com/api/notes \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Rollback Plan

If anything goes wrong:
```bash
# Restore from backup
psql -U astegni_user -d astegni_user_db < /var/backups/user_db_notes_migration_YYYYMMDD_HHMMSS.sql

# Restart backend
systemctl restart astegni-backend
```

---

## Summary Table

| Item | Local | Production | Action Required |
|------|-------|------------|-----------------|
| **call_logs** | ✅ Exists | ✅ Exists | ✅ None |
| **notes** | ✅ Exists | ❌ Missing | 🔧 Deploy |
| **note_media** | ✅ Exists | ❌ Missing | 🔧 Deploy |
| **note_exports** | ✅ Exists | ❌ Missing | 🔧 Deploy |
| **campaign_invoices** | ✅ Exists | ❌ Missing | ⚠️ Check if needed |
| **Legacy backup table** | ✅ Exists | ❌ Missing | ✅ Skip (backup only) |
| **is_verified system** | ✅ Working | ✅ Working | ✅ No issues |
| **Code compatibility** | ✅ Ready | ✅ Ready | ✅ Deploy safe |

---

## Next Steps

1. ✅ **call_logs**: Already in production, no action needed
2. 🔧 **Deploy notes tables**: Run `migrate_create_notes_tables.py` on production
3. ⚠️ **campaign_invoices**: Verify if needed before deploying
4. ✅ **Verification system**: Working correctly, code already migrated
5. ✅ **Git push safe**: Code can be committed/pushed without issues

**Recommendation:** Deploy notes tables first, then test notes functionality before deploying campaign_invoices.
