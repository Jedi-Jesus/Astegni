"""
Migration: Add sharing fields to tutor_packages table

Lets a tutor opt a package into the cost-sharing ("small tutor / high
dosage") method and cap how many students may share it (up to 4).

  - allow_sharing        BOOLEAN  default FALSE  (sharing off unless opted in)
  - max_shared_students  INTEGER  default 1      (1 = solo; up to 4 sharing)

Run: python migrate_add_package_sharing.py
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
        print("MIGRATION: Add sharing fields to tutor_packages")
        print("=" * 60)

        # Check if table exists
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'tutor_packages'
            )
        """)
        if not cur.fetchone()[0]:
            print("ERROR: Table 'tutor_packages' does not exist.")
            return

        # Check current columns
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'tutor_packages'
        """)
        existing_columns = [row[0] for row in cur.fetchall()]
        print(f"\nExisting columns: {', '.join(existing_columns)}")

        # Add allow_sharing column if not exists
        if 'allow_sharing' not in existing_columns:
            print("\nAdding allow_sharing column...")
            cur.execute("""
                ALTER TABLE tutor_packages
                ADD COLUMN allow_sharing BOOLEAN NOT NULL DEFAULT FALSE
            """)
            conn.commit()
            print("OK - Added allow_sharing column")
        else:
            print("\nSKIP - allow_sharing column already exists")

        # Add max_shared_students column if not exists
        if 'max_shared_students' not in existing_columns:
            print("\nAdding max_shared_students column...")
            cur.execute("""
                ALTER TABLE tutor_packages
                ADD COLUMN max_shared_students INTEGER NOT NULL DEFAULT 1
            """)
            conn.commit()
            print("OK - Added max_shared_students column")
        else:
            print("SKIP - max_shared_students column already exists")

        # Show updated table structure
        print("\n" + "-" * 40)
        print("Updated table structure:")
        cur.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'tutor_packages'
            ORDER BY ordinal_position
        """)
        for col in cur.fetchall():
            print(f"   - {col[0]}: {col[1]} (nullable: {col[2]})")

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
