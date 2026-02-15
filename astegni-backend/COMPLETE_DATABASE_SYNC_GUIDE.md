# Complete Database Sync Guide
## Local → Production Database Synchronization

**Generated:** 2026-02-15
**Local Database Stats:**
- User DB: 144 tables
- Admin DB: 49 tables
- Total: 193 tables

---

## Overview

This guide will help you:
1. Compare local and production database schemas
2. Identify differences (extra tables, new fields)
3. Dump local databases
4. Backup production databases
5. Restore local data to production

---

## Step 1: Get Production Database Schema

First, we need to see what's currently in production to compare.

### Option A: Via SSH (Recommended)

```bash
# SSH into production
ssh root@128.140.122.215
# Password: UVgkFmAsh4N4

# Navigate to project
cd /var/www/astegni/astegni-backend

# Get table counts
echo "User DB tables:"
psql -U astegni_user -d astegni_user_db -t -c \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"

echo "Admin DB tables:"
psql -U astegni_user -d astegni_admin_db -t -c \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"

# Get detailed schema (creates JSON file)
source venv/bin/activate
python3 << 'EOF'
import psycopg
import json
from datetime import datetime

PROD_USER_DB = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db"
PROD_ADMIN_DB = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db"

def get_schema(conn_str):
    conn = psycopg.connect(conn_str)
    cur = conn.cursor()
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;")
    tables = [row[0] for row in cur.fetchall()]
    schema = {}
    for table in tables:
        cur.execute("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = %s ORDER BY ordinal_position;", (table,))
        schema[table] = {'columns': [{'name': r[0], 'type': r[1], 'nullable': r[2]} for r in cur.fetchall()]}
    conn.close()
    return schema, len(tables)

user_schema, user_count = get_schema(PROD_USER_DB)
admin_schema, admin_count = get_schema(PROD_ADMIN_DB)

output = {
    'timestamp': datetime.now().isoformat(),
    'user_db': user_schema,
    'admin_db': admin_schema,
    'user_db_table_count': user_count,
    'admin_db_table_count': admin_count
}

filename = f"production_schemas_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
with open(filename, 'w') as f:
    json.dump(output, f, indent=2, default=str)

print(f"Saved to: {filename}")
print(f"User DB: {user_count} tables")
print(f"Admin DB: {admin_count} tables")
EOF

# Download the generated JSON file to local machine
# Then copy the filename shown above and run this on your LOCAL machine:
# scp root@128.140.122.215:/var/www/astegni/astegni-backend/production_schemas_*.json c:\Users\zenna\Downloads\Astegni\astegni-backend\
```

---

## Step 2: Compare Schemas (LOCAL MACHINE)

Once you have the production schema JSON file:

```bash
cd c:\Users\zenna\Downloads\Astegni\astegni-backend
python analyze_schema_differences.py
```

This will show:
- ✅ Extra tables in local (need to be created in production)
- ✅ New columns in common tables (need to be added)
- ✅ Modified columns (type changes)
- ✅ Generates migration SQL files

---

## Step 3: Database Dumps (Already Complete!)

**✓ Dumps created:**
- `database_backups\local_user_db_20260215_172411.sql` (1.16 MB)
- `database_backups\local_admin_db_20260215_172411.sql` (0.17 MB)

These contain the complete local database with all 193 tables.

---

## Step 4: Transfer Dumps to Production

### Windows (using SCP)

If you don't have SCP, install it via Git Bash or WSL, then:

```bash
# Upload user database dump
scp "database_backups\local_user_db_20260215_172411.sql" root@128.140.122.215:/tmp/

# Upload admin database dump
scp "database_backups\local_admin_db_20260215_172411.sql" root@128.140.122.215:/tmp/
```

**Password:** `UVgkFmAsh4N4`

### Alternative: SFTP or WinSCP

Use WinSCP GUI:
1. Host: `128.140.122.215`
2. Username: `root`
3. Password: `UVgkFmAsh4N4`
4. Upload files to `/tmp/`

---

## Step 5: Backup Production Databases (CRITICAL!)

**⚠️ NEVER skip this step!**

SSH into production and create backups:

```bash
ssh root@128.140.122.215
# Password: UVgkFmAsh4N4

# Create backup directory if it doesn't exist
mkdir -p /var/backups/postgres

# Set date variable
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)

# Backup production databases
echo "Backing up production databases..."
pg_dump -U astegni_user -d astegni_user_db > /var/backups/postgres/prod_user_db_$BACKUP_DATE.sql
pg_dump -U astegni_user -d astegni_admin_db > /var/backups/postgres/prod_admin_db_$BACKUP_DATE.sql

# Verify backups
ls -lh /var/backups/postgres/prod_user_db_$BACKUP_DATE.sql
ls -lh /var/backups/postgres/prod_admin_db_$BACKUP_DATE.sql

echo "✓ Backups created successfully!"
```

---

## Step 6: Restore Local Dumps to Production

**⚠️ This will REPLACE all production data with local data!**

Make sure you've backed up production first (Step 5).

```bash
# Still on production server via SSH

# Set PostgreSQL password
export PGPASSWORD=Astegni2025

# Restore user database
echo "Restoring user database..."
psql -U astegni_user -d astegni_user_db < /tmp/local_user_db_20260215_172411.sql

# Restore admin database
echo "Restoring admin database..."
psql -U astegni_user -d astegni_admin_db < /tmp/local_admin_db_20260215_172411.sql

echo "✓ Databases restored successfully!"
```

---

## Step 7: Verify Restoration

```bash
# Still on production server

echo "Verifying user database..."
psql -U astegni_user -d astegni_user_db -c "SELECT COUNT(*) as user_count FROM users;"
psql -U astegni_user -d astegni_user_db -c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"

echo "Verifying admin database..."
psql -U astegni_user -d astegni_admin_db -c "SELECT COUNT(*) as admin_count FROM admin_users;"
psql -U astegni_user -d astegni_admin_db -c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"

echo "Expected table counts:"
echo "  User DB: 144 tables"
echo "  Admin DB: 49 tables"
```

---

## Step 8: Restart Backend Service

```bash
# Still on production server

# Restart the backend
systemctl restart astegni-backend

# Check status
systemctl status astegni-backend

# Watch logs for errors
journalctl -u astegni-backend -f -n 100
```

Press `Ctrl+C` to stop watching logs.

---

## Step 9: Test Application

1. Visit: https://astegni.com
2. Try logging in
3. Test key features:
   - User profile loading
   - Chat system
   - Whiteboard
   - Content viewing
   - Admin panel

---

## Rollback (If Something Goes Wrong)

If the restore causes issues:

```bash
# SSH into production
ssh root@128.140.122.215

# Find your backup files
ls -lh /var/backups/postgres/

# Restore the production backups (replace TIMESTAMP with actual date)
export PGPASSWORD=Astegni2025
psql -U astegni_user -d astegni_user_db < /var/backups/postgres/prod_user_db_TIMESTAMP.sql
psql -U astegni_user -d astegni_admin_db < /var/backups/postgres/prod_admin_db_TIMESTAMP.sql

# Restart service
systemctl restart astegni-backend
```

---

## Summary Checklist

- [ ] Step 1: Get production schema (`ssh` → run schema script)
- [ ] Step 2: Compare schemas (`python analyze_schema_differences.py`)
- [ ] Step 3: Review differences and migration SQL
- [ ] Step 4: Transfer dumps to production (`scp` commands)
- [ ] Step 5: **BACKUP PRODUCTION** (`pg_dump` both databases)
- [ ] Step 6: Restore local to production (`psql < dump.sql`)
- [ ] Step 7: Verify table counts and data
- [ ] Step 8: Restart backend service
- [ ] Step 9: Test application thoroughly
- [ ] Step 10: Monitor logs for errors

---

## Files Generated

1. `local_schemas_20260215_172210.json` - Local database schema
2. `database_backups\local_user_db_20260215_172411.sql` - User DB dump (1.16 MB)
3. `database_backups\local_admin_db_20260215_172411.sql` - Admin DB dump (0.17 MB)
4. `schema_comparison_report_*.json` - Detailed comparison (after Step 2)
5. `migration_sync_*.sql` - Migration SQL (after Step 2)

---

## Local Database Tables (144 in User DB)

account_deletion_requests, advertisement_earnings, advertiser_profiles, advertiser_team_members, advertiser_transactions, affiliate_commissions, affiliate_referrals, affiliates, audios, blocked_chat_contacts, blogs, board_equations, board_participants, board_recordings, board_snapshots, board_templates, brand_profile, call_logs, campaign_engagement, campaign_impressions, campaign_invoices, campaign_media, campaign_profile, and 121 more...

---

## Support

If you encounter errors:
1. Check database connection strings
2. Verify PostgreSQL is running: `systemctl status postgresql`
3. Check disk space: `df -h`
4. Review logs: `journalctl -u astegni-backend -n 100`
5. Test database connection: `psql -U astegni_user -d astegni_user_db -c "SELECT 1;"`

---

**Last Updated:** 2026-02-15 17:24:11
