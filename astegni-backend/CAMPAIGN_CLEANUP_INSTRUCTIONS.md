# Campaign Data Cleanup Instructions

## Overview
This guide will help you remove all campaign-related data from the production database.

**Tables to be cleaned:**
- `campaign_engagement` - Campaign interaction tracking
- `campaign_impressions` - Ad impression logs
- `campaign_invoices` - Billing records
- `campaign_media` - Campaign media files
- `campaign_profile` - Main campaign data
- `brand_profile` - Brand information

---

## Quick Cleanup (Recommended)

### Step 1: Upload cleanup script to production
```bash
scp "astegni-backend\cleanup_production_campaigns.py" root@128.140.122.215:/tmp/
```
Password: `UVgkFmAsh4N4`

### Step 2: SSH into production and run cleanup
```bash
ssh root@128.140.122.215

cd /var/www/astegni/astegni-backend
source venv/bin/activate

# Run cleanup script (includes 10-second countdown to cancel)
python /tmp/cleanup_production_campaigns.py
```

The script will:
1. Show current row counts for all campaign tables
2. Wait 10 seconds (you can press Ctrl+C to cancel)
3. Delete all data from campaign tables
4. Verify the cleanup
5. Show summary

---

## Manual Cleanup (Alternative)

If you prefer to run SQL commands directly:

```bash
ssh root@128.140.122.215

export PGPASSWORD=Astegni2025

# Connect to database
psql -h localhost -U astegni_user -d astegni_user_db

# Check current counts
SELECT
    'campaign_engagement' as table_name, COUNT(*) as rows FROM campaign_engagement
UNION ALL SELECT 'campaign_impressions', COUNT(*) FROM campaign_impressions
UNION ALL SELECT 'campaign_invoices', COUNT(*) FROM campaign_invoices
UNION ALL SELECT 'campaign_media', COUNT(*) FROM campaign_media
UNION ALL SELECT 'campaign_profile', COUNT(*) FROM campaign_profile
UNION ALL SELECT 'brand_profile', COUNT(*) FROM brand_profile;

# Delete data (in dependency order)
DELETE FROM campaign_engagement;
DELETE FROM campaign_impressions;
DELETE FROM campaign_invoices;
DELETE FROM campaign_media;
DELETE FROM campaign_profile;
DELETE FROM brand_profile;

# Verify cleanup
SELECT
    'campaign_engagement' as table_name, COUNT(*) as rows FROM campaign_engagement
UNION ALL SELECT 'campaign_impressions', COUNT(*) FROM campaign_impressions
UNION ALL SELECT 'campaign_invoices', COUNT(*) FROM campaign_invoices
UNION ALL SELECT 'campaign_media', COUNT(*) FROM campaign_media
UNION ALL SELECT 'campaign_profile', COUNT(*) FROM campaign_profile
UNION ALL SELECT 'brand_profile', COUNT(*) FROM brand_profile;

# Exit
\q
```

---

## Safety Notes

⚠️ **WARNINGS:**
- This will permanently delete all campaign data
- Backup first if you need to preserve any data
- No undo - deleted data cannot be recovered
- The Python script includes a 10-second countdown to cancel

✅ **SAFE:**
- Only deletes data, does not drop tables
- Table structures remain intact
- Can add new campaigns after cleanup
- Does not affect other database data (users, profiles, etc.)

---

## Backup Before Cleanup (Optional)

If you want to preserve campaign data before deletion:

```bash
ssh root@128.140.122.215

export PGPASSWORD=Astegni2025

# Backup campaign data only
pg_dump -h localhost -U astegni_user -d astegni_user_db \
  --table=campaign_engagement \
  --table=campaign_impressions \
  --table=campaign_invoices \
  --table=campaign_media \
  --table=campaign_profile \
  --table=brand_profile \
  > /var/backups/postgres/campaign_data_backup_$(date +%Y%m%d_%H%M%S).sql

ls -lh /var/backups/postgres/campaign_data_backup_*.sql
```

---

## Verification After Cleanup

After running cleanup, verify the results:

```bash
# Check table counts (should all be 0)
psql -h localhost -U astegni_user -d astegni_user_db -c "
SELECT
    'campaign_engagement' as table_name, COUNT(*) as rows FROM campaign_engagement
UNION ALL SELECT 'campaign_impressions', COUNT(*) FROM campaign_impressions
UNION ALL SELECT 'campaign_invoices', COUNT(*) FROM campaign_invoices
UNION ALL SELECT 'campaign_media', COUNT(*) FROM campaign_media
UNION ALL SELECT 'campaign_profile', COUNT(*) FROM campaign_profile
UNION ALL SELECT 'brand_profile', COUNT(*) FROM brand_profile;
"

# Check advertiser profiles (should still exist)
psql -h localhost -U astegni_user -d astegni_user_db -c "SELECT COUNT(*) FROM advertiser_profiles;"

# Test backend (should still work)
curl https://api.astegni.com/health
```

---

## Troubleshooting

**Foreign Key Constraint Errors:**
If you get foreign key errors, the script handles deletion in the correct order. If manual cleanup fails, use the Python script.

**Connection Errors:**
Make sure you're running commands on the production server (not local machine).

**Permission Errors:**
Ensure `PGPASSWORD=Astegni2025` is exported before running psql commands.

---

## Expected Results

**Before Cleanup:**
- Various row counts in campaign tables

**After Cleanup:**
- All campaign tables: 0 rows
- Tables still exist (not dropped)
- Can create new campaigns
- Other data unaffected

---

**Created:** 2026-02-15
