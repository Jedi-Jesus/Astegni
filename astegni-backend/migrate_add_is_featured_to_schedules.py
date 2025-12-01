"""
Migration: Add is_featured column to schedules table

This adds a boolean column to mark important/featured schedules
"""

import psycopg
import os
import sys
from dotenv import load_dotenv

# Force UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

load_dotenv()

def get_db_connection():
    """Get database connection"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise Exception("DATABASE_URL not found in environment variables")
    return psycopg.connect(database_url)

def add_is_featured_column():
    """Add is_featured column to schedules table"""
    conn = get_db_connection()

    try:
        with conn.cursor() as cur:
            print("=" * 70)
            print("Adding is_featured column to schedules table")
            print("=" * 70)

            # Check if schedules table exists
            print("\n1. Checking if schedules table exists...")
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'schedules'
                )
            """)
            table_exists = cur.fetchone()[0]

            if not table_exists:
                print("   [ERROR] schedules table does not exist!")
                return

            print("   [OK] schedules table found")

            # Check if is_featured column already exists
            print("\n2. Checking if is_featured column already exists...")
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.columns
                    WHERE table_name = 'schedules'
                    AND column_name = 'is_featured'
                )
            """)
            column_exists = cur.fetchone()[0]

            if column_exists:
                print("   [WARNING] is_featured column already exists. Skipping migration.")
                return

            print("   [OK] Column does not exist, proceeding with migration")

            # Add is_featured column
            print("\n3. Adding is_featured column...")
            cur.execute("""
                ALTER TABLE schedules
                ADD COLUMN is_featured BOOLEAN DEFAULT FALSE
            """)
            print("   [OK] Added is_featured column (default: FALSE)")

            # Create index for performance
            print("\n4. Creating index on is_featured column...")
            cur.execute("""
                CREATE INDEX idx_schedules_is_featured ON schedules(is_featured)
            """)
            print("   [OK] Created index idx_schedules_is_featured")

            # Commit changes
            conn.commit()

            print("\n" + "=" * 70)
            print("[SUCCESS] Migration completed successfully!")
            print("=" * 70)
            print("\nChanges made:")
            print("  - Added column: is_featured (BOOLEAN, default FALSE)")
            print("  - Created index: idx_schedules_is_featured")
            print("\nAll existing schedules have is_featured = FALSE by default")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    add_is_featured_column()
