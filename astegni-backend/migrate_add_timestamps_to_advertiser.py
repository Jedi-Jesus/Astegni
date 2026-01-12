"""
Migration: Add created_at and updated_at columns to advertiser_profiles table
These columns are defined in the SQLAlchemy model but missing from the database.
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
    """Add created_at and updated_at columns to advertiser_profiles"""
    conn = get_db_connection()
    cur = conn.cursor()

    table = 'advertiser_profiles'

    try:
        print(f"\n[INFO] Updating {table} table...")

        # Check if table exists
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = %s
            )
        """, (table,))

        if not cur.fetchone()[0]:
            print(f"  [ERROR] Table {table} does not exist!")
            return

        # Add created_at column if it doesn't exist
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.columns
                WHERE table_name = %s AND column_name = 'created_at'
            )
        """, (table,))

        if not cur.fetchone()[0]:
            cur.execute(sql.SQL("""
                ALTER TABLE {}
                ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            """).format(sql.Identifier(table)))
            print(f"  [OK] Added created_at column to {table}")
        else:
            print(f"  [SKIP] created_at column already exists in {table}")

        # Add updated_at column if it doesn't exist
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.columns
                WHERE table_name = %s AND column_name = 'updated_at'
            )
        """, (table,))

        if not cur.fetchone()[0]:
            cur.execute(sql.SQL("""
                ALTER TABLE {}
                ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            """).format(sql.Identifier(table)))
            print(f"  [OK] Added updated_at column to {table}")
        else:
            print(f"  [SKIP] updated_at column already exists in {table}")

        conn.commit()
        print("\n[SUCCESS] Migration completed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    print("=" * 60)
    print("Migration: Add timestamps to advertiser_profiles")
    print("=" * 60)
    migrate()
