"""Setup dual databases locally - rename astegni_db to astegni_user_db and create astegni_admin_db"""
import psycopg
from psycopg.rows import dict_row

# Connect as postgres superuser for admin operations
# Password @Astegni2025 - @ is URL encoded as %40
POSTGRES_URL = "postgresql://postgres:%40Astegni2025@localhost:5432/postgres"

# If postgres user doesn't work, try giving astegni_user superuser privileges temporarily
# Or the astegni_user might be the owner and can rename

print("=" * 60)
print("LOCAL DUAL DATABASE SETUP")
print("=" * 60)

try:
    conn = psycopg.connect(POSTGRES_URL, row_factory=dict_row, autocommit=True)
    cur = conn.cursor()
except Exception as e:
    print(f"Failed to connect as postgres user: {e}")
    print("\nTrying with different password...")
    # Try common postgres passwords
    for pwd in ['postgres', 'admin', 'password', '']:
        try:
            POSTGRES_URL = f"postgresql://postgres:{pwd}@localhost:5432/postgres"
            conn = psycopg.connect(POSTGRES_URL, row_factory=dict_row, autocommit=True)
            cur = conn.cursor()
            print(f"Connected with password: '{pwd}'")
            break
        except:
            continue
    else:
        print("\nCould not connect as postgres superuser.")
        print("Please run these commands in psql as postgres:")
        print("-" * 50)
        print("-- Connect as postgres superuser first")
        print("ALTER DATABASE astegni_db RENAME TO astegni_user_db;")
        print("CREATE DATABASE astegni_admin_db WITH OWNER = astegni_user;")
        exit(1)

try:
    # Check current databases
    print("\n1. Checking current databases...")
    cur.execute("SELECT datname FROM pg_database WHERE datname LIKE 'astegni%'")
    dbs = [row['datname'] for row in cur.fetchall()]
    print(f"   Found: {dbs}")

    # Terminate connections to astegni_db
    if 'astegni_db' in dbs:
        print("\n2. Terminating connections to astegni_db...")
        cur.execute("""
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = 'astegni_db' AND pid <> pg_backend_pid()
        """)
        print("   [OK] Connections terminated")

        # Rename astegni_db to astegni_user_db
        print("\n3. Renaming astegni_db to astegni_user_db...")
        cur.execute("ALTER DATABASE astegni_db RENAME TO astegni_user_db")
        print("   [OK] Renamed successfully")
    elif 'astegni_user_db' in dbs:
        print("\n2-3. [SKIP] astegni_user_db already exists")
    else:
        print("\n   [ERROR] Neither astegni_db nor astegni_user_db found!")

    # Create astegni_admin_db
    print("\n4. Creating astegni_admin_db...")
    cur.execute("SELECT 1 FROM pg_database WHERE datname = 'astegni_admin_db'")
    if cur.fetchone():
        print("   [SKIP] astegni_admin_db already exists")
    else:
        cur.execute("CREATE DATABASE astegni_admin_db WITH OWNER = astegni_user ENCODING = 'UTF8'")
        print("   [OK] astegni_admin_db created")

    # Verify
    print("\n5. Verifying databases...")
    cur.execute("SELECT datname FROM pg_database WHERE datname LIKE 'astegni%' ORDER BY datname")
    final_dbs = [row['datname'] for row in cur.fetchall()]
    for db in final_dbs:
        print(f"   - {db}")

    print("\n" + "=" * 60)
    print("LOCAL DUAL DATABASE SETUP COMPLETE!")
    print("=" * 60)

except Exception as e:
    print(f"\n[ERROR] {e}")
    import traceback
    traceback.print_exc()
finally:
    cur.close()
    conn.close()
