"""
Migration: Add naming_system column to users

The verify-personal-info modal already asks the user to pick a naming
convention (Ethiopian vs International), but that choice was never stored.
We need it persisted so identity-completeness for verification can require
the correct name fields:
  - ethiopian     -> first_name + father_name + grandfather_name
  - international  -> first_name + last_name

Default 'ethiopian' (the platform's primary market). Backfilled: any existing
user that has a last_name but no father_name is set to 'international'.

Run: python migrate_add_naming_system.py
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def migrate():
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("=" * 60)
        print("MIGRATION: Add naming_system to users")
        print("=" * 60)

        cur.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'users'
        """)
        existing = [r[0] for r in cur.fetchall()]

        if 'naming_system' not in existing:
            print("\nAdding naming_system column...")
            cur.execute("""
                ALTER TABLE users
                ADD COLUMN naming_system VARCHAR(20) NOT NULL DEFAULT 'ethiopian'
            """)
            conn.commit()
            print("OK - Added naming_system column (default 'ethiopian')")

            # Backfill: clearly-international users (have last_name, no father_name)
            cur.execute("""
                UPDATE users
                SET naming_system = 'international'
                WHERE last_name IS NOT NULL AND TRIM(last_name) <> ''
                  AND (father_name IS NULL OR TRIM(father_name) = '')
            """)
            conn.commit()
            print(f"OK - Backfilled {cur.rowcount} international user(s)")
        else:
            print("\nSKIP - naming_system column already exists")

        print("\n" + "-" * 40)
        print("Distribution:")
        cur.execute("SELECT naming_system, COUNT(*) FROM users GROUP BY naming_system")
        for r in cur.fetchall():
            print(f"   - {r[0]}: {r[1]}")

        print("\n" + "=" * 60)
        print("MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 60)

    except Exception as e:
        conn.rollback()
        print(f"\nMigration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    migrate()
