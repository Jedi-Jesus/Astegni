"""
Migration: Update sessions table foreign key references

CHANGES:
1. Rename: course_enrollment_id → enrolled_courses_id
2. Update foreign key: enrolled_students → enrolled_courses
3. Add foreign key: whiteboard_id → whiteboard_sessions

This migration will:
- Rename the column
- Drop old foreign key constraint
- Add new foreign key constraint to enrolled_courses
- Add foreign key constraint for whiteboard_id
- Update indexes
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise Exception("DATABASE_URL not found in environment")
    return psycopg.connect(database_url)

def migrate():
    conn = get_db_connection()

    try:
        with conn.cursor() as cur:
            print("=" * 80)
            print("MIGRATION: Update sessions table references")
            print("=" * 80)
            print()

            # Step 1: Check current state
            print("Step 1: Checking current table structure...")
            cur.execute("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'sessions'
                AND column_name IN ('course_enrollment_id', 'enrolled_courses_id', 'whiteboard_id')
                ORDER BY column_name
            """)

            current_columns = {row[0]: row[1] for row in cur.fetchall()}
            print(f"  Current columns: {list(current_columns.keys())}")

            # Step 2: Check current foreign keys
            print("\nStep 2: Checking current foreign key constraints...")
            cur.execute("""
                SELECT conname, contype
                FROM pg_constraint
                WHERE conrelid = 'sessions'::regclass
                AND contype = 'f'
            """)

            constraints = cur.fetchall()
            print(f"  Found {len(constraints)} foreign key constraints:")
            for constraint in constraints:
                print(f"    - {constraint[0]}")

            # Step 3: Drop old foreign key constraint if it exists
            print("\nStep 3: Dropping old foreign key constraint...")
            cur.execute("""
                SELECT conname
                FROM pg_constraint
                WHERE conrelid = 'sessions'::regclass
                AND conname = 'sessions_course_enrollment_id_fkey'
            """)

            if cur.fetchone():
                cur.execute("""
                    ALTER TABLE sessions
                    DROP CONSTRAINT sessions_course_enrollment_id_fkey
                """)
                print("  [OK] Dropped sessions_course_enrollment_id_fkey")
            else:
                print("  [INFO] Constraint sessions_course_enrollment_id_fkey does not exist")

            # Step 4: Rename column if it exists
            print("\nStep 4: Renaming column...")
            if 'course_enrollment_id' in current_columns:
                cur.execute("""
                    ALTER TABLE sessions
                    RENAME COLUMN course_enrollment_id TO enrolled_courses_id
                """)
                print("  [OK] Renamed course_enrollment_id -> enrolled_courses_id")
            elif 'enrolled_courses_id' in current_columns:
                print("  [INFO] Column already named enrolled_courses_id")
            else:
                print("  [WARN] Neither course_enrollment_id nor enrolled_courses_id found!")

            # Step 5: Check if enrolled_courses table exists
            print("\nStep 5: Checking if enrolled_courses table exists...")
            cur.execute("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'enrolled_courses'
            """)

            if cur.fetchone():
                print("  [OK] enrolled_courses table exists")

                # Add foreign key constraint
                print("\nStep 6: Adding foreign key constraint to enrolled_courses...")
                cur.execute("""
                    ALTER TABLE sessions
                    ADD CONSTRAINT sessions_enrolled_courses_id_fkey
                    FOREIGN KEY (enrolled_courses_id)
                    REFERENCES enrolled_courses(id)
                    ON DELETE CASCADE
                """)
                print("  [OK] Added foreign key: enrolled_courses_id -> enrolled_courses(id)")
            else:
                print("  [WARN] enrolled_courses table does not exist - skipping foreign key")

            # Step 6: Check if whiteboard_sessions table exists
            print("\nStep 7: Checking if whiteboard_sessions table exists...")
            cur.execute("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'whiteboard_sessions'
            """)

            if cur.fetchone():
                print("  [OK] whiteboard_sessions table exists")

                # Check if foreign key already exists
                cur.execute("""
                    SELECT conname
                    FROM pg_constraint
                    WHERE conrelid = 'sessions'::regclass
                    AND conname = 'sessions_whiteboard_id_fkey'
                """)

                if not cur.fetchone():
                    # Add foreign key constraint
                    print("\nStep 8: Adding foreign key constraint for whiteboard_id...")
                    cur.execute("""
                        ALTER TABLE sessions
                        ADD CONSTRAINT sessions_whiteboard_id_fkey
                        FOREIGN KEY (whiteboard_id)
                        REFERENCES whiteboard_sessions(id)
                        ON DELETE SET NULL
                    """)
                    print("  [OK] Added foreign key: whiteboard_id -> whiteboard_sessions(id)")
                else:
                    print("\nStep 8: Foreign key for whiteboard_id already exists")
            else:
                print("  [WARN] whiteboard_sessions table does not exist - skipping foreign key")

            # Step 9: Update index name
            print("\nStep 9: Updating index name...")
            cur.execute("""
                SELECT indexname
                FROM pg_indexes
                WHERE tablename = 'sessions'
                AND indexname = 'idx_sessions_enrollment'
            """)

            if cur.fetchone():
                cur.execute("""
                    ALTER INDEX idx_sessions_enrollment
                    RENAME TO idx_sessions_enrolled_courses
                """)
                print("  [OK] Renamed index: idx_sessions_enrollment -> idx_sessions_enrolled_courses")
            else:
                print("  [INFO] Index idx_sessions_enrollment does not exist")

            # Step 10: Update column comment
            print("\nStep 10: Updating column comment...")
            cur.execute("""
                COMMENT ON COLUMN sessions.enrolled_courses_id IS 'Reference to enrolled_courses table'
            """)
            print("  [OK] Updated column comment for enrolled_courses_id")

            # Step 11: Verify final state
            print("\nStep 11: Verifying final state...")

            # Check columns
            cur.execute("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'sessions'
                AND column_name IN ('enrolled_courses_id', 'whiteboard_id')
                ORDER BY column_name
            """)
            final_columns = cur.fetchall()
            print(f"  Columns verified:")
            for col in final_columns:
                print(f"    - {col[0]} ({col[1]})")

            # Check foreign keys
            cur.execute("""
                SELECT
                    conname,
                    pg_get_constraintdef(oid) as definition
                FROM pg_constraint
                WHERE conrelid = 'sessions'::regclass
                AND contype = 'f'
                ORDER BY conname
            """)
            final_fks = cur.fetchall()
            print(f"\n  Foreign key constraints ({len(final_fks)}):")
            for fk in final_fks:
                print(f"    - {fk[0]}")
                print(f"      {fk[1]}")

            # Check indexes
            cur.execute("""
                SELECT indexname
                FROM pg_indexes
                WHERE tablename = 'sessions'
                AND indexname LIKE 'idx_sessions_%'
                ORDER BY indexname
            """)
            indexes = cur.fetchall()
            print(f"\n  Indexes ({len(indexes)}):")
            for idx in indexes:
                print(f"    - {idx[0]}")

            # Commit all changes
            conn.commit()

            print("\n" + "=" * 80)
            print("[OK] MIGRATION COMPLETED SUCCESSFULLY!")
            print("=" * 80)
            print("\nChanges Applied:")
            print("  1. Renamed: course_enrollment_id -> enrolled_courses_id")
            print("  2. Updated foreign key: enrolled_students -> enrolled_courses")
            print("  3. Added foreign key: whiteboard_id -> whiteboard_sessions")
            print("  4. Renamed index: idx_sessions_enrollment -> idx_sessions_enrolled_courses")
            print("  5. Updated column comments")
            print("\nNext Steps:")
            print("  1. Update backend code to use enrolled_courses_id")
            print("  2. Update API endpoints and queries")
            print("  3. Test foreign key constraints")
            print("  4. Update documentation")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
