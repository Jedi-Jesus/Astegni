"""
Complete Database Dump and Sync Script
This will:
1. Create backups of local databases
2. Upload to production server
3. Backup production databases
4. Restore local databases to production
"""

import subprocess
import os
from datetime import datetime
import sys

# Configuration
LOCAL_DB_USER = "astegni_user"
LOCAL_DB_PASSWORD = "Astegni2025"
LOCAL_USER_DB = "astegni_user_db"
LOCAL_ADMIN_DB = "astegni_admin_db"

PROD_SERVER = "root@128.140.122.215"
PROD_PASSWORD = "UVgkFmAsh4N4"
PROD_DB_USER = "astegni_user"
PROD_DB_PASSWORD = "Astegni2025"

BACKUP_DIR = "database_backups"
TIMESTAMP = datetime.now().strftime('%Y%m%d_%H%M%S')


def run_command(command, description, shell=True):
    """Run a command and return the result"""
    print(f"\n{description}...")
    print(f"Command: {command}")

    try:
        result = subprocess.run(
            command,
            shell=shell,
            capture_output=True,
            text=True,
            check=False
        )

        if result.returncode == 0:
            print(f"[SUCCESS] {description}")
            if result.stdout:
                print(result.stdout)
            return True
        else:
            print(f"[ERROR] {description} failed")
            if result.stderr:
                print(f"Error: {result.stderr}")
            if result.stdout:
                print(f"Output: {result.stdout}")
            return False
    except Exception as e:
        print(f"[ERROR] Exception during {description}: {e}")
        return False


def main():
    print("="*80)
    print("DATABASE DUMP AND SYNC UTILITY")
    print("="*80)
    print(f"Timestamp: {TIMESTAMP}")
    print(f"Local databases: {LOCAL_USER_DB}, {LOCAL_ADMIN_DB}")
    print(f"Production server: {PROD_SERVER}")
    print()

    # Create backup directory
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)
        print(f"Created backup directory: {BACKUP_DIR}")

    # File paths
    local_user_dump = os.path.join(BACKUP_DIR, f"local_user_db_{TIMESTAMP}.sql")
    local_admin_dump = os.path.join(BACKUP_DIR, f"local_admin_db_{TIMESTAMP}.sql")

    print("\n" + "="*80)
    print("STEP 1: DUMP LOCAL DATABASES")
    print("="*80)

    # Set PGPASSWORD environment variable
    os.environ['PGPASSWORD'] = LOCAL_DB_PASSWORD

    # Dump local user database
    user_dump_cmd = f'pg_dump -h localhost -U {LOCAL_DB_USER} -d {LOCAL_USER_DB} -f "{local_user_dump}" --no-owner --no-acl --clean --if-exists'
    if not run_command(user_dump_cmd, f"Dumping local {LOCAL_USER_DB}"):
        print("\n[ERROR] Failed to dump local user database. Aborting.")
        return

    # Dump local admin database
    admin_dump_cmd = f'pg_dump -h localhost -U {LOCAL_DB_USER} -d {LOCAL_ADMIN_DB} -f "{local_admin_dump}" --no-owner --no-acl --clean --if-exists'
    if not run_command(admin_dump_cmd, f"Dumping local {LOCAL_ADMIN_DB}"):
        print("\n[ERROR] Failed to dump local admin database. Aborting.")
        return

    # Get file sizes
    user_size = os.path.getsize(local_user_dump) / (1024 * 1024)  # MB
    admin_size = os.path.getsize(local_admin_dump) / (1024 * 1024)  # MB

    print(f"\n[SUCCESS] Local databases dumped:")
    print(f"  - {local_user_dump} ({user_size:.2f} MB)")
    print(f"  - {local_admin_dump} ({admin_size:.2f} MB)")

    print("\n" + "="*80)
    print("STEP 2: TRANSFER DUMPS TO PRODUCTION SERVER")
    print("="*80)
    print("\nNOTE: You will need to manually transfer these files to production:")
    print(f"  1. Upload {local_user_dump} to production server")
    print(f"  2. Upload {local_admin_dump} to production server")
    print(f"\nRecommended SCP commands:")
    print(f"  scp \"{local_user_dump}\" {PROD_SERVER}:/tmp/")
    print(f"  scp \"{local_admin_dump}\" {PROD_SERVER}:/tmp/")

    print("\n" + "="*80)
    print("STEP 3: INSTRUCTIONS FOR PRODUCTION RESTORE")
    print("="*80)
    print("\nRun these commands ON THE PRODUCTION SERVER:")
    print(f"""
# 1. Backup existing production databases
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U {PROD_DB_USER} -d {LOCAL_USER_DB} > /var/backups/prod_user_db_$BACKUP_DATE.sql
pg_dump -U {PROD_DB_USER} -d {LOCAL_ADMIN_DB} > /var/backups/prod_admin_db_$BACKUP_DATE.sql

# 2. Restore local databases to production
psql -U {PROD_DB_USER} -d {LOCAL_USER_DB} < /tmp/local_user_db_{TIMESTAMP}.sql
psql -U {PROD_DB_USER} -d {LOCAL_ADMIN_DB} < /tmp/local_admin_db_{TIMESTAMP}.sql

# 3. Verify restoration
psql -U {PROD_DB_USER} -d {LOCAL_USER_DB} -c "SELECT COUNT(*) FROM users;"
psql -U {PROD_DB_USER} -d {LOCAL_ADMIN_DB} -c "SELECT COUNT(*) FROM admin_users;"

# 4. Restart backend service
systemctl restart astegni-backend
systemctl status astegni-backend
""")

    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    print(f"Local dumps created:")
    print(f"  - User DB: {local_user_dump} ({user_size:.2f} MB)")
    print(f"  - Admin DB: {local_admin_dump} ({admin_size:.2f} MB)")
    print(f"\nNext steps:")
    print(f"  1. Transfer dumps to production server using SCP")
    print(f"  2. SSH into production server")
    print(f"  3. Run the restoration commands above")
    print(f"  4. Verify data integrity")
    print(f"  5. Test application")


if __name__ == "__main__":
    main()
