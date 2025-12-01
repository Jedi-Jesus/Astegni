# Profile-Based Connections - Quick Reference

## TL;DR

✅ **DONE:** Connections now use profile IDs from role-specific tables (tutor_profiles, student_profiles, etc.) instead of generic user IDs.

✅ **VERIFIED:** All 3 existing connections are using correct profile IDs.

✅ **BACKWARDS COMPATIBLE:** Old code still works, no breaking changes.

## Table Structure

```sql
connections:
  profile_id_1    INTEGER NOT NULL     -- ID from tutor_profiles/student_profiles/etc.
  profile_type_1  VARCHAR NOT NULL     -- 'tutor', 'student', 'parent', 'advertiser'
  profile_id_2    INTEGER NOT NULL     -- ID from tutor_profiles/student_profiles/etc.
  profile_type_2  VARCHAR NOT NULL     -- 'tutor', 'student', 'parent', 'advertiser'
  user_id_1       INTEGER NOT NULL     -- (legacy - for backwards compatibility)
  user_id_2       INTEGER NOT NULL     -- (legacy - for backwards compatibility)
```

## API Usage

### Create Connection (Preferred)
```javascript
POST /api/connections
{
    "target_profile_id": 85,
    "target_profile_type": "tutor",
    "connection_type": "connect"
}
```

### Create Connection (Legacy - still works)
```javascript
POST /api/connections
{
    "target_user_id": 75,  // Auto-detects profile
    "connection_type": "connect"
}
```

## Why Profile-Based?

**Before:** User 50 → User 75 (unclear context)
**After:** Student Profile #12 → Tutor Profile #85 (clear learning relationship)

**Benefit:** Same user can have separate networks as student vs tutor!

## Verification

```bash
cd astegni-backend
python verify_profile_connections.py
```

**Result:** 3/3 connections valid ✓

## Files

- `migrate_connections_profile_based.py` - Migration script
- `verify_profile_connections.py` - Verification script
- `PROFILE-BASED-CONNECTIONS-EXPLAINED.md` - Full documentation
- `PROFILE-CONNECTIONS-MIGRATION-COMPLETE.md` - Migration summary

## Status

**COMPLETE** - No further action needed. System is production-ready!
