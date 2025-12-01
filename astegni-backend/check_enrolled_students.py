"""
Check and fix enrolled_students table columns
"""
import psycopg2
from dotenv import load_dotenv
import os
import sys

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def check_and_fix():
    print("=" * 60)
    print("Checking enrolled_students table")
    print("=" * 60)

    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cur = conn.cursor()

        # Get current columns
        cur.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'enrolled_students'
            ORDER BY ordinal_position
        """)
        columns = cur.fetchall()

        print("\nCurrent columns:")
        existing_cols = []
        for col_name, col_type in columns:
            print(f"  - {col_name}: {col_type}")
            existing_cols.append(col_name)

        # Check for package_name
        if 'package_name' not in existing_cols:
            print("\n[ADD] Adding package_name column...")
            cur.execute("""
                ALTER TABLE enrolled_students
                ADD COLUMN package_name VARCHAR(255)
            """)
            print("[OK] package_name column added")
        else:
            print("\n[OK] package_name column exists")

        # Check for enrolled_at
        if 'enrolled_at' not in existing_cols:
            print("\n[ADD] Adding enrolled_at column...")
            cur.execute("""
                ALTER TABLE enrolled_students
                ADD COLUMN enrolled_at TIMESTAMP DEFAULT NOW()
            """)
            print("[OK] enrolled_at column added")
        else:
            print("[OK] enrolled_at column exists")

        # Show sample data
        cur.execute("""
            SELECT id, tutor_id, student_id, package_name, enrolled_at, created_at
            FROM enrolled_students
            LIMIT 5
        """)
        rows = cur.fetchall()

        print("\nSample data:")
        for row in rows:
            print(f"  {row}")

        cur.close()
        conn.close()
        print("\n[OK] Done!")

    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_and_fix()
