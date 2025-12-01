"""
PostgreSQL Database Backup Script

Simple script to backup the Astegni database before running migrations.
Creates a timestamped SQL dump file.

Usage:
    cd astegni-backend
    python backup_db.py
"""

import os
import subprocess
from datetime import datetime
import sys

# Database credentials
DB_USER = "astegni_user"
DB_NAME = "astegni_db"
DB_HOST = "localhost"
DB_PORT = "5432"
DB_PASSWORD = "Astegni2025"

def find_pg_dump():
    """Find pg_dump executable"""
    # Common PostgreSQL installation paths on Windows
    common_paths = [
        r"C:\Program Files\PostgreSQL\16\bin\pg_dump.exe",
        r"C:\Program Files\PostgreSQL\15\bin\pg_dump.exe",
        r"C:\Program Files\PostgreSQL\14\bin\pg_dump.exe",
        r"C:\Program Files\PostgreSQL\13\bin\pg_dump.exe",
    ]

    # Check if pg_dump is in PATH
    try:
        result = subprocess.run(
            ["where", "pg_dump"],
            capture_output=True,
            text=True,
            shell=True
        )
        if result.returncode == 0 and result.stdout.strip():
            return "pg_dump"
    except:
        pass

    # Check common paths
    for path in common_paths:
        if os.path.exists(path):
            return path

    return None

def backup_database():
    """Create database backup"""
    print("\n" + "="*80)
    print("PostgreSQL Database Backup")
    print("="*80)

    # Find pg_dump
    pg_dump_path = find_pg_dump()
    if not pg_dump_path:
        print("\n❌ ERROR: pg_dump not found!")
        print("\nPlease install PostgreSQL or add it to your PATH.")
        print("Common location: C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe")
        print("\nYou can also run manually:")
        print('  "C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump" -U astegni_user astegni_db > backup.sql')
        return False

    print(f"\n✅ Found pg_dump: {pg_dump_path}")

    # Create backup filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = os.path.join("..", f"backup_before_migration_{timestamp}.sql")
    backup_file = os.path.abspath(backup_file)

    print(f"\n📁 Backup file: {backup_file}")
    print(f"📊 Database: {DB_NAME}")
    print(f"👤 User: {DB_USER}")
    print(f"🖥️  Host: {DB_HOST}:{DB_PORT}")

    # Set password environment variable
    os.environ['PGPASSWORD'] = DB_PASSWORD

    print("\n⏳ Creating backup... (this may take a few seconds)")

    try:
        # Run pg_dump
        result = subprocess.run([
            pg_dump_path,
            "-U", DB_USER,
            "-h", DB_HOST,
            "-p", DB_PORT,
            "-F", "p",  # Plain SQL format
            "-f", backup_file,
            DB_NAME
        ], capture_output=True, text=True, check=True)

        # Check if file was created
        if not os.path.exists(backup_file):
            print(f"\n❌ ERROR: Backup file was not created!")
            return False

        # Check file size
        file_size = os.path.getsize(backup_file)
        if file_size == 0:
            print(f"\n❌ ERROR: Backup file is empty!")
            return False

        # Success!
        print(f"\n✅ Backup created successfully!")
        print(f"   File: {backup_file}")
        print(f"   Size: {file_size / 1024:.2f} KB ({file_size:,} bytes)")

        # Show first few lines
        print("\n📄 First lines of backup file:")
        print("   " + "-"*60)
        try:
            with open(backup_file, 'r', encoding='utf-8') as f:
                for i, line in enumerate(f):
                    if i >= 5:
                        break
                    print(f"   {line.rstrip()}")
            print("   " + "-"*60)
        except:
            pass

        print("\n" + "="*80)
        print("✅ BACKUP COMPLETE")
        print("="*80)
        print("\nYou can now safely run the migration:")
        print("  python migrate_cleanup_connections_table.py")
        print("\nIf anything goes wrong, restore with:")
        print(f'  psql -U {DB_USER} -h {DB_HOST} -p {DB_PORT} {DB_NAME} < "{backup_file}"')
        print("\n" + "="*80)

        return True

    except subprocess.CalledProcessError as e:
        print(f"\n❌ ERROR during backup!")
        print(f"   Return code: {e.returncode}")
        if e.stderr:
            print(f"   Error: {e.stderr}")
        print("\nCommon issues:")
        print("  - PostgreSQL service not running (check services.msc)")
        print("  - Wrong credentials (check DATABASE_URL in .env)")
        print("  - Database doesn't exist")
        return False

    except FileNotFoundError as e:
        print(f"\n❌ ERROR: {e}")
        print(f"\npg_dump path used: {pg_dump_path}")
        print("\nMake sure PostgreSQL is installed correctly.")
        return False

    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return False

    finally:
        # Clear password from environment
        if 'PGPASSWORD' in os.environ:
            del os.environ['PGPASSWORD']

if __name__ == "__main__":
    success = backup_database()
    sys.exit(0 if success else 1)
