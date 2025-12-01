"""
Migration: Remove recurring session fields from sessions table

This migration removes the following columns from the sessions table:
- is_recurring (BOOLEAN)
- session_frequency (VARCHAR)
- recurring_pattern (JSON)

These fields are no longer needed as recurring sessions are now handled
at the schedule level rather than individual session level.

Run with: python migrate_remove_recurring_fields.py
"""

import psycopg2
from dotenv import load_dotenv
import os
import sys

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def run_migration():
    """Remove is_recurring, session_frequency, and recurring_pattern columns from sessions table"""

    print("=" * 60)
    print("Migration: Remove Recurring Fields from Sessions Table")
    print("=" * 60)

    # Parse connection string
    if DATABASE_URL.startswith("postgresql://"):
        conn_str = DATABASE_URL
    else:
        conn_str = DATABASE_URL

    try:
        conn = psycopg2.connect(conn_str)
        conn.autocommit = True
        cur = conn.cursor()

        # Check which table name is used (sessions or tutoring_sessions)
        cur.execute("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('sessions', 'tutoring_sessions')
        """)
        tables = [row[0] for row in cur.fetchall()]

        if not tables:
            print("[ERROR] No sessions table found (checked: sessions, tutoring_sessions)")
            return False

        table_name = tables[0]
        print(f"\n[INFO] Found table: {table_name}")

        # Check which columns exist
        cur.execute(f"""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = '{table_name}'
            AND column_name IN ('is_recurring', 'session_frequency', 'recurring_pattern')
        """)
        existing_columns = [row[0] for row in cur.fetchall()]

        if not existing_columns:
            print("[OK] No recurring columns found - nothing to remove")
            return True

        print(f"[INFO] Found columns to remove: {existing_columns}")

        # Drop each column
        columns_to_drop = ['is_recurring', 'session_frequency', 'recurring_pattern']

        for column in columns_to_drop:
            if column in existing_columns:
                print(f"\n[DROP] Dropping column: {column}...")
                try:
                    # First drop any indexes on the column
                    cur.execute(f"""
                        SELECT indexname FROM pg_indexes
                        WHERE tablename = '{table_name}'
                        AND indexdef LIKE '%{column}%'
                    """)
                    indexes = cur.fetchall()
                    for idx in indexes:
                        print(f"   Dropping index: {idx[0]}")
                        cur.execute(f"DROP INDEX IF EXISTS {idx[0]}")

                    # Drop the column
                    cur.execute(f"ALTER TABLE {table_name} DROP COLUMN IF EXISTS {column}")
                    print(f"   [OK] Column {column} dropped successfully")
                except Exception as e:
                    print(f"   [ERROR] Error dropping {column}: {e}")
            else:
                print(f"\n[SKIP] Column {column} doesn't exist - skipping")

        # Verify the columns are removed
        print("\n" + "=" * 40)
        print("Verification:")
        print("=" * 40)

        cur.execute(f"""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = '{table_name}'
            AND column_name IN ('is_recurring', 'session_frequency', 'recurring_pattern')
        """)
        remaining = cur.fetchall()

        if remaining:
            print(f"[WARN] Still found columns: {[r[0] for r in remaining]}")
        else:
            print("[OK] All recurring columns successfully removed!")

        # Show remaining columns
        cur.execute(f"""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = '{table_name}'
            ORDER BY ordinal_position
        """)
        columns = cur.fetchall()

        print(f"\n[INFO] Remaining columns in {table_name}:")
        for col_name, col_type in columns:
            print(f"   - {col_name}: {col_type}")

        cur.close()
        conn.close()

        print("\n" + "=" * 60)
        print("[OK] Migration completed successfully!")
        print("=" * 60)
        return True

    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    run_migration()
