# Verification System Consolidation

**Date:** 2026-01-15
**Status:** Implemented
**Breaking Changes:** None (backward compatible)

---

## Overview

This document describes the consolidation of user verification logic from multiple profile-specific fields into a single canonical field in the `users` table.

### Problem Statement

Previously, verification was scattered across multiple tables:
- `users.kyc_verified` - Identity verification status
- `tutor_profiles.is_verified` - Tutor profile verification
- `parent_profiles.is_verified` - Parent profile verification
- `advertiser_profiles.is_verified` - Advertiser profile verification
- `student_profiles` - No verification field

This created:
1. **Redundancy** - Same verification status duplicated across tables
2. **Inconsistency** - Different naming conventions (`kyc_verified` vs `is_verified`)
3. **Complexity** - Multi-role users had verification in multiple places
4. **Logic Issues** - Verification is about the PERSON, not the ROLE

### Solution

Added a **canonical verification field** to the `users` table:

```sql
users.is_verified         BOOLEAN      DEFAULT FALSE   -- Canonical verification status
users.verified_at         TIMESTAMP    NULL           -- When verified
users.verification_method VARCHAR(20)  NULL           -- How verified ('kyc', 'manual', 'admin')
```

---

## Migration Details

### Database Changes

**File:** `migrate_add_is_verified_to_users.py`

**Steps:**
1. Add `users.is_verified`, `users.verified_at`, `users.verification_method` columns
2. Sync data from `users.kyc_verified` → `users.is_verified`
3. Sync data from `tutor_profiles.is_verified` → `users.is_verified`
4. Sync data from `parent_profiles.is_verified` → `users.is_verified`
5. Sync data from `advertiser_profiles.is_verified` → `users.is_verified`

**Run Migration:**
```bash
cd astegni-backend
python migrate_add_is_verified_to_users.py
```

### Backward Compatibility

✅ **NON-DESTRUCTIVE MIGRATION**
- Does NOT remove `kyc_verified` from users table
- Does NOT remove `is_verified` from profile tables
- All existing code continues to work
- New code uses `is_verified` as canonical source

---

## Code Changes

### Backend

#### 1. Models (`app.py modules/models.py`)

```python
class User(Base):
    # NEW: Canonical verification fields
    is_verified = Column(Boolean, default=False)  # Single source of truth
    verified_at = Column(DateTime, nullable=True)
    verification_method = Column(String(20), nullable=True)  # 'kyc', 'manual', 'admin'

    # DEPRECATED: Kept for backward compatibility
    kyc_verified = Column(Boolean, default=False)  # Use is_verified instead
    kyc_verified_at = Column(DateTime, nullable=True)  # Use verified_at instead
```

#### 2. KYC Endpoints (`kyc_endpoints.py`)

**When KYC passes:**
```python
# NEW: Set canonical fields
user.is_verified = True
user.verified_at = datetime.utcnow()
user.verification_method = 'kyc'

# DEPRECATED: Keep for backward compatibility
user.kyc_verified = True
user.kyc_verified_at = datetime.utcnow()
```

**Check verification:**
```python
# NEW: Uses is_verified as canonical, checks kyc_verified as fallback
def check_and_auto_verify_profiles(user: User, db: Session):
    profile_complete = (
        # ... other checks ...
        user.is_verified == True  # NEW: Check canonical field
    )
```

**API Response:**
```python
return {
    "is_verified": True,        # NEW: Canonical field
    "kyc_verified": True,        # DEPRECATED: Backward compatibility
    "verified_at": user.verified_at.isoformat(),
    "verification_method": user.verification_method  # NEW
}
```

### Frontend

#### JavaScript (`settings-panel-personal-verification.js`)

**Check verification in localStorage:**
```javascript
// NEW: Check is_verified first, fallback to kyc_verified
const isVerifiedInLocalStorage = user.is_verified === true || user.kyc_verified === true;
```

**Check API response:**
```javascript
// NEW: Check is_verified first, fallback to kyc_verified
if (data.is_verified || data.kyc_verified) {
    // Show verified status
}
```

---

## Verification Methods

The `verification_method` field tracks how the user was verified:

| Method | Description | Set By |
|--------|-------------|--------|
| `kyc` | Verified via KYC liveliness detection | KYC verification system |
| `manual` | Manually verified by admin | Admin panel (future) |
| `admin` | Admin override verification | Admin panel (future) |
| `profile_tutor` | Migrated from tutor profile | Migration script |
| `profile_parent` | Migrated from parent profile | Migration script |
| `profile_advertiser` | Migrated from advertiser profile | Migration script |

---

## API Changes

### GET `/api/kyc/check`

**Response (NEW fields added):**
```json
{
    "kyc_required": false,
    "kyc_verified": true,          // DEPRECATED: backward compatibility
    "is_verified": true,            // NEW: canonical field
    "verified_at": "2026-01-15T10:30:00",
    "verification_method": "kyc",   // NEW: how verified
    "digital_id_no": "123456789",
    "document_image_url": "...",
    "message": "Identity verified"
}
```

### GET `/api/me`

**Response (NEW fields added):**
```json
{
    "id": 1,
    "first_name": "John",
    "is_verified": true,            // NEW: canonical field
    "verified_at": "2026-01-15T10:30:00",  // NEW
    "verification_method": "kyc",   // NEW
    "kyc_verified": true,           // DEPRECATED: backward compatibility
    "kyc_verified_at": "2026-01-15T10:30:00"
}
```

---

## Usage Guidelines

### For New Code

✅ **DO:**
- Use `user.is_verified` to check if user is verified
- Use `user.verified_at` to get verification timestamp
- Use `user.verification_method` to know how they were verified

❌ **DON'T:**
- Use `user.kyc_verified` (deprecated)
- Use profile-specific `is_verified` fields
- Check verification in multiple places

### Examples

**Backend:**
```python
# ✅ GOOD: Check canonical field
if user.is_verified:
    # Grant access

# ❌ BAD: Check deprecated field
if user.kyc_verified:
    # Don't do this
```

**Frontend:**
```javascript
// ✅ GOOD: Check canonical field with fallback
if (user.is_verified || user.kyc_verified) {
    // Show verified badge
}

// ❌ BAD: Check only deprecated field
if (user.kyc_verified) {
    // Don't do this
}
```

---

## Auto-Verification Flow

When a user completes KYC verification:

```
1. User completes KYC (face match + liveliness)
   ↓
2. Backend sets:
   - user.is_verified = True (NEW: canonical)
   - user.verified_at = now
   - user.verification_method = 'kyc'
   - user.kyc_verified = True (DEPRECATED: backward compatibility)
   ↓
3. check_and_auto_verify_profiles() runs
   ↓
4. If user has complete profile info:
   - tutor_profiles.is_verified = True
   - parent_profiles.is_verified = True
   - advertiser_profiles.is_verified = True
   (These are auto-synced for backward compatibility)
```

---

## Testing Checklist

After running migration:

- [ ] Run migration script successfully
- [ ] Verify all existing verified users have `is_verified = true`
- [ ] Complete new KYC verification - check `is_verified` is set
- [ ] Check API responses include new fields
- [ ] Test frontend shows verified status correctly
- [ ] Verify localStorage contains `is_verified` field
- [ ] Test multi-role users show verified across all roles
- [ ] Verify backward compatibility (old code still works)

---

## Future Deprecation Plan

**Phase 1 (Current):**
- ✅ Add `is_verified` as canonical field
- ✅ Keep `kyc_verified` for backward compatibility
- ✅ Update all new code to use `is_verified`

**Phase 2 (Future - 3-6 months):**
- Update all remaining code to use `is_verified`
- Add deprecation warnings when `kyc_verified` is accessed
- Update documentation

**Phase 3 (Future - 6-12 months):**
- Remove `kyc_verified` column (breaking change)
- Optional: Remove profile-specific `is_verified` fields
- Simplify verification logic

---

## Rollback Plan

If issues occur:

1. **Database rollback:**
   ```sql
   ALTER TABLE users DROP COLUMN is_verified;
   ALTER TABLE users DROP COLUMN verified_at;
   ALTER TABLE users DROP COLUMN verification_method;
   ```

2. **Code rollback:**
   - Revert `models.py` changes
   - Revert `kyc_endpoints.py` changes
   - Revert frontend JS changes

3. **No data loss:**
   - Original `kyc_verified` field unchanged
   - Profile `is_verified` fields unchanged
   - All data preserved

---

## Support

For questions or issues:
1. Check this documentation
2. Review migration script output
3. Check database schema: `\d users` in psql
4. Review git commit history for all changes

---

## Related Files

**Migration:**
- `migrate_add_is_verified_to_users.py` - Migration script

**Backend:**
- `app.py modules/models.py` - User model updated
- `kyc_endpoints.py` - KYC verification logic updated

**Frontend:**
- `js/tutor-profile/settings-panel-personal-verification.js` - UI logic updated

**Documentation:**
- `VERIFICATION-CONSOLIDATION.md` (this file)
- `CLAUDE.md` - Updated with new verification flow

---

**Last Updated:** 2026-01-15
**Version:** 1.0
**Status:** ✅ Implementation Complete
