"""
Migration: Add is_online column to profile tables
Adds is_online boolean column and last_seen timestamp to:
- tutors (tutor profiles)
- students (student profiles)
- parents (parent profiles)
- advertisers (advertiser profiles)

This allows tracking online status at the profile level, not user level.
"""

import os
import sys
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

import psycopg2
from psycopg2 import sql

def get_db_connection():
    """Get database connection"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL not set in environment")

    # Parse the URL
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "")

    # Extract components
    user_pass, host_db = database_url.split("@")
    user, password = user_pass.split(":")
    host_port, database = host_db.split("/")

    if ":" in host_port:
        host, port = host_port.split(":")
    else:
        host = host_port
        port = "5432"

    # Remove query parameters from database name (e.g., ?sslmode=disable)
    if "?" in database:
        database = database.split("?")[0]

    return psycopg2.connect(
        host=host,
        port=port,
        database=database,
        user=user,
        password=password
    )

def migrate():
    """Add is_online and last_seen columns to profile tables"""
    conn = get_db_connection()
    cur = conn.cursor()

    # Profile tables to update (actual table names from models.py)
    profile_tables = ['tutor_profiles', 'student_profiles', 'parent_profiles', 'advertiser_profiles']

    try:
        for table in profile_tables:
            print(f"\n[INFO] Updating {table} table...")

            # Check if table exists
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = %s
                )
            """, (table,))

            if not cur.fetchone()[0]:
                print(f"  [WARN] Table {table} does not exist, skipping...")
                continue

            # Add is_online column if it doesn't exist
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_name = %s AND column_name = 'is_online'
                )
            """, (table,))

            if not cur.fetchone()[0]:
                cur.execute(sql.SQL("""
                    ALTER TABLE {}
                    ADD COLUMN is_online BOOLEAN DEFAULT FALSE
                """).format(sql.Identifier(table)))
                print(f"  [OK] Added is_online column to {table}")
            else:
                print(f"  [SKIP] is_online column already exists in {table}")

            # Add last_seen column if it doesn't exist
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_name = %s AND column_name = 'last_seen'
                )
            """, (table,))

            if not cur.fetchone()[0]:
                cur.execute(sql.SQL("""
                    ALTER TABLE {}
                    ADD COLUMN last_seen TIMESTAMP WITH TIME ZONE
                """).format(sql.Identifier(table)))
                print(f"  [OK] Added last_seen column to {table}")
            else:
                print(f"  [SKIP] last_seen column already exists in {table}")

            # Create index on is_online for faster queries
            index_name = f"idx_{table}_is_online"
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM pg_indexes
                    WHERE indexname = %s
                )
            """, (index_name,))

            if not cur.fetchone()[0]:
                cur.execute(sql.SQL("""
                    CREATE INDEX {} ON {} (is_online) WHERE is_online = TRUE
                """).format(sql.Identifier(index_name), sql.Identifier(table)))
                print(f"  [OK] Created index {index_name}")
            else:
                print(f"  [SKIP] Index {index_name} already exists")

        conn.commit()
        print("\n[SUCCESS] Migration completed successfully!")

        # Show current state
        print("\n[STATS] Current online status columns:")
        for table in profile_tables:
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = %s
                )
            """, (table,))

            if cur.fetchone()[0]:
                cur.execute(sql.SQL("""
                    SELECT COUNT(*) as total,
                           COUNT(*) FILTER (WHERE is_online = TRUE) as online
                    FROM {}
                """).format(sql.Identifier(table)))
                result = cur.fetchone()
                print(f"  {table}: {result[1] or 0} online / {result[0]} total")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    print("=" * 60)
    print("Migration: Add is_online to Profile Tables")
    print("=" * 60)
    migrate()
