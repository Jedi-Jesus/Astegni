"""
Migration: Update enrolled_students table

Changes:
1. Rename session_request_id to requested_sessions_id
2. Add status column (VARCHAR) - values: 'active', 'alumni', 'rejected', 'suspended'
3. Add rejected_reason (TEXT)
4. Add rejected_at (TIMESTAMP)
5. Add suspended_reason (TEXT)
6. Add suspended_at (TIMESTAMP)

Run with: python migrate_enrolled_students_updates.py
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
    """Update enrolled_students table"""

    print("=" * 60)
    print("Migration: Update enrolled_students Table")
    print("=" * 60)

    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cur = conn.cursor()

        # Check if table exists
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'enrolled_students'
            )
        """)
        if not cur.fetchone()[0]:
            print("[ERROR] enrolled_students table not found")
            return False

        # Get current columns
        cur.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'enrolled_students'
        """)
        existing_columns = [row[0] for row in cur.fetchall()]
        print(f"\n[INFO] Current columns: {existing_columns}")

        # 1. Rename session_request_id to requested_sessions_id
        print("\n" + "-" * 40)
        print("Step 1: Rename session_request_id -> requested_sessions_id")
        print("-" * 40)

        if 'session_request_id' in existing_columns:
            if 'requested_sessions_id' not in existing_columns:
                print("[RENAME] Renaming session_request_id to requested_sessions_id...")
                cur.execute("""
                    ALTER TABLE enrolled_students
                    RENAME COLUMN session_request_id TO requested_sessions_id
                """)
                print("[OK] Column renamed successfully")
            else:
                print("[SKIP] requested_sessions_id already exists, dropping session_request_id...")
                cur.execute("ALTER TABLE enrolled_students DROP COLUMN IF EXISTS session_request_id")
        elif 'requested_sessions_id' in existing_columns:
            print("[SKIP] Column already named requested_sessions_id")
        else:
            print("[WARN] Neither session_request_id nor requested_sessions_id found")

        # 2. Remove student_type if it exists (replacing with status)
        if 'student_type' in existing_columns:
            print("\n[DROP] Removing old student_type column...")
            cur.execute("ALTER TABLE enrolled_students DROP COLUMN IF EXISTS student_type")
            print("[OK] student_type column removed")

        # 3. Add status column
        print("\n" + "-" * 40)
        print("Step 2: Add status column")
        print("-" * 40)

        # Refresh columns list
        cur.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'enrolled_students'
        """)
        existing_columns = [row[0] for row in cur.fetchall()]

        if 'status' not in existing_columns:
            print("[ADD] Adding status column...")
            cur.execute("""
                ALTER TABLE enrolled_students
                ADD COLUMN status VARCHAR(20) DEFAULT 'active'
            """)
            print("[OK] status column added (default: 'active')")
            cur.execute("""
                COMMENT ON COLUMN enrolled_students.status IS
                'Enrollment status: active, alumni, rejected, suspended'
            """)
        else:
            print("[SKIP] status column already exists")

        # 4. Add rejected_reason column
        print("\n" + "-" * 40)
        print("Step 3: Add rejected_reason column")
        print("-" * 40)

        if 'rejected_reason' not in existing_columns:
            print("[ADD] Adding rejected_reason column...")
            cur.execute("""
                ALTER TABLE enrolled_students
                ADD COLUMN rejected_reason TEXT
            """)
            print("[OK] rejected_reason column added")
        else:
            print("[SKIP] rejected_reason column already exists")

        # 5. Add rejected_at column
        print("\n" + "-" * 40)
        print("Step 4: Add rejected_at column")
        print("-" * 40)

        if 'rejected_at' not in existing_columns:
            print("[ADD] Adding rejected_at column...")
            cur.execute("""
                ALTER TABLE enrolled_students
                ADD COLUMN rejected_at TIMESTAMP
            """)
            print("[OK] rejected_at column added")
        else:
            print("[SKIP] rejected_at column already exists")

        # 6. Add suspended_reason column
        print("\n" + "-" * 40)
        print("Step 5: Add suspended_reason column")
        print("-" * 40)

        if 'suspended_reason' not in existing_columns:
            print("[ADD] Adding suspended_reason column...")
            cur.execute("""
                ALTER TABLE enrolled_students
                ADD COLUMN suspended_reason TEXT
            """)
            print("[OK] suspended_reason column added")
        else:
            print("[SKIP] suspended_reason column already exists")

        # 7. Add suspended_at column
        print("\n" + "-" * 40)
        print("Step 6: Add suspended_at column")
        print("-" * 40)

        if 'suspended_at' not in existing_columns:
            print("[ADD] Adding suspended_at column...")
            cur.execute("""
                ALTER TABLE enrolled_students
                ADD COLUMN suspended_at TIMESTAMP
            """)
            print("[OK] suspended_at column added")
        else:
            print("[SKIP] suspended_at column already exists")

        # Verify changes
        print("\n" + "=" * 40)
        print("Verification:")
        print("=" * 40)

        cur.execute("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'enrolled_students'
            ORDER BY ordinal_position
        """)
        columns = cur.fetchall()

        print("\n[INFO] Updated enrolled_students columns:")
        for col_name, col_type, col_default in columns:
            default_str = f" (default: {col_default})" if col_default else ""
            print(f"   - {col_name}: {col_type}{default_str}")

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
