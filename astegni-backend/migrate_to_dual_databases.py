"""
Migration Script: Setup Dual Database System
- Renames astegni_db to astegni_user_db
- Creates new astegni_admin_db

Run this script on the database server or with connection to it.
Usage: python migrate_to_dual_databases.py
"""

import os
import sys
from dotenv import load_dotenv
import psycopg

load_dotenv()

# Database configuration
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_USER = os.getenv('DB_USER', 'astegni_user')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'Astegni2025')

# Original and new database names
OLD_DB_NAME = 'astegni_db'
NEW_USER_DB_NAME = 'astegni_user_db'
NEW_ADMIN_DB_NAME = 'astegni_admin_db'


def get_postgres_connection():
    """Connect to postgres database for administrative operations"""
    return psycopg.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        dbname='postgres',
        autocommit=True
    )


def check_database_exists(conn, db_name):
    """Check if a database exists"""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s",
            (db_name,)
        )
        return cur.fetchone() is not None


def terminate_connections(conn, db_name):
    """Terminate all connections to a database"""
    print(f"Terminating connections to {db_name}...")
    with conn.cursor() as cur:
        cur.execute("""
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = %s AND pid <> pg_backend_pid()
        """, (db_name,))
        terminated = cur.rowcount
        print(f"  Terminated {terminated} connection(s)")


def rename_database(conn, old_name, new_name):
    """Rename a database"""
    print(f"Renaming database {old_name} to {new_name}...")

    # First terminate all connections
    terminate_connections(conn, old_name)

    with conn.cursor() as cur:
        cur.execute(f'ALTER DATABASE "{old_name}" RENAME TO "{new_name}"')

    print(f"  Successfully renamed {old_name} to {new_name}")


def create_database(conn, db_name, owner):
    """Create a new database"""
    print(f"Creating database {db_name}...")
    with conn.cursor() as cur:
        cur.execute(f"""
            CREATE DATABASE "{db_name}"
            WITH
            OWNER = {owner}
            ENCODING = 'UTF8'
            CONNECTION LIMIT = -1
        """)
        cur.execute(f'GRANT ALL PRIVILEGES ON DATABASE "{db_name}" TO {owner}')
    print(f"  Successfully created {db_name}")


def run_admin_schema():
    """Run the admin database schema"""
    print(f"\nSetting up admin database schema...")

    # Read the SQL file
    script_dir = os.path.dirname(os.path.abspath(__file__))
    sql_file = os.path.join(script_dir, 'create_admin_tables.sql')

    if not os.path.exists(sql_file):
        print(f"  Warning: {sql_file} not found. Skipping schema creation.")
        return False

    with open(sql_file, 'r') as f:
        sql_content = f.read()

    # Connect to admin database
    conn = psycopg.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        dbname=NEW_ADMIN_DB_NAME,
        autocommit=True
    )

    try:
        with conn.cursor() as cur:
            cur.execute(sql_content)
        print("  Admin schema created successfully")
        return True
    except Exception as e:
        print(f"  Error creating admin schema: {e}")
        return False
    finally:
        conn.close()


def main():
    print("=" * 60)
    print("Astegni Dual Database Migration")
    print("=" * 60)
    print(f"\nTarget: {DB_HOST}:{DB_PORT}")
    print(f"User: {DB_USER}")
    print(f"\nOperations:")
    print(f"  1. Rename '{OLD_DB_NAME}' → '{NEW_USER_DB_NAME}'")
    print(f"  2. Create '{NEW_ADMIN_DB_NAME}'")
    print(f"  3. Setup admin database schema")
    print()

    # Confirm before proceeding
    response = input("Proceed with migration? (yes/no): ").strip().lower()
    if response != 'yes':
        print("Migration cancelled.")
        return

    print("\n" + "-" * 60)

    try:
        conn = get_postgres_connection()
        print("Connected to PostgreSQL server")

        # Step 1: Check current state
        has_old_db = check_database_exists(conn, OLD_DB_NAME)
        has_user_db = check_database_exists(conn, NEW_USER_DB_NAME)
        has_admin_db = check_database_exists(conn, NEW_ADMIN_DB_NAME)

        print(f"\nCurrent state:")
        print(f"  {OLD_DB_NAME}: {'exists' if has_old_db else 'not found'}")
        print(f"  {NEW_USER_DB_NAME}: {'exists' if has_user_db else 'not found'}")
        print(f"  {NEW_ADMIN_DB_NAME}: {'exists' if has_admin_db else 'not found'}")
        print()

        # Step 2: Rename user database if needed
        if has_old_db and not has_user_db:
            rename_database(conn, OLD_DB_NAME, NEW_USER_DB_NAME)
        elif has_user_db:
            print(f"Database {NEW_USER_DB_NAME} already exists, skipping rename")
        elif not has_old_db and not has_user_db:
            print(f"ERROR: Neither {OLD_DB_NAME} nor {NEW_USER_DB_NAME} exists!")
            print("Please ensure the original database exists before migration.")
            return

        # Step 3: Create admin database if needed
        if not has_admin_db:
            create_database(conn, NEW_ADMIN_DB_NAME, DB_USER)
        else:
            print(f"Database {NEW_ADMIN_DB_NAME} already exists, skipping creation")

        conn.close()

        # Step 4: Run admin schema
        run_admin_schema()

        print("\n" + "=" * 60)
        print("Migration completed successfully!")
        print("=" * 60)
        print("\nNext steps:")
        print("  1. Update your .env file with the new database name:")
        print(f"     DATABASE_URL=postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{NEW_USER_DB_NAME}")
        print(f"     ADMIN_DATABASE_URL=postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{NEW_ADMIN_DB_NAME}")
        print("  2. Restart your backend server")
        print("  3. Test the application")

    except Exception as e:
        print(f"\nERROR: {e}")
        print("\nIf you're getting permission errors, you may need to:")
        print("  1. Run this script as the postgres superuser")
        print("  2. Or grant CREATE DATABASE privilege to astegni_user")
        sys.exit(1)


if __name__ == '__main__':
    main()
