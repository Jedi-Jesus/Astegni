"""
Migration: Fix session_requests foreign key references
Changes tutor_id and requester_id to reference role-specific profile tables
instead of users table
"""
import psycopg
from dotenv import load_dotenv
import os
import sys

# Fix encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def fix_session_requests_foreign_keys():
    """Fix foreign key references in session_requests table"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("🔧 Fixing session_requests foreign key references...")

        # Step 1: Check if table exists
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'session_requests'
            );
        """)

        if not cur.fetchone()[0]:
            print("❌ session_requests table does not exist. Run migrate_create_session_requests.py first.")
            return

        # Step 2: Drop existing foreign key constraints FIRST (before data migration)
        print("\n📋 Dropping existing foreign key constraints...")

        cur.execute("""
            SELECT constraint_name
            FROM information_schema.table_constraints
            WHERE table_name = 'session_requests'
            AND constraint_type = 'FOREIGN KEY';
        """)

        fk_constraints = cur.fetchall()
        for constraint in fk_constraints:
            cur.execute(f"ALTER TABLE session_requests DROP CONSTRAINT IF EXISTS {constraint[0]} CASCADE;")
            print(f"  ✅ Dropped constraint: {constraint[0]}")

        # Step 3: Check current data and migrate if needed
        print("\n🔍 Checking if data migration is needed...")

        cur.execute("""
            SELECT COUNT(*) FROM session_requests sr
            LEFT JOIN tutor_profiles tp ON sr.tutor_id = tp.id
            WHERE tp.id IS NULL;
        """)

        needs_migration = cur.fetchone()[0] > 0

        if needs_migration:
            print("  ⚠️  Data migration needed: tutor_id currently uses users.id")
            print("  🔄 Migrating tutor_id from users.id to tutor_profiles.id...")

            # Migrate tutor_id: users.id → tutor_profiles.id
            cur.execute("""
                UPDATE session_requests sr
                SET tutor_id = tp.id
                FROM tutor_profiles tp
                WHERE tp.user_id = sr.tutor_id;
            """)

            updated_rows = cur.rowcount
            print(f"  ✅ Migrated {updated_rows} tutor_id values")

            # Check for unmapped tutors
            cur.execute("""
                SELECT COUNT(*) FROM session_requests sr
                LEFT JOIN tutor_profiles tp ON sr.tutor_id = tp.id
                WHERE tp.id IS NULL;
            """)

            unmapped = cur.fetchone()[0]
            if unmapped > 0:
                print(f"  ⚠️  Warning: {unmapped} requests have tutor_id with no matching tutor_profile")
                print("  🗑️  Deleting invalid records...")
                cur.execute("""
                    DELETE FROM session_requests sr
                    WHERE NOT EXISTS (
                        SELECT 1 FROM tutor_profiles tp WHERE tp.id = sr.tutor_id
                    );
                """)
                print(f"  ✅ Deleted {cur.rowcount} invalid records")

            # Migrate requester_id for students: users.id → student_profiles.id
            print("\n  🔄 Migrating student requester_id from users.id to student_profiles.id...")
            cur.execute("""
                UPDATE session_requests sr
                SET requester_id = sp.id
                FROM student_profiles sp
                WHERE sr.requester_type = 'student'
                AND sp.user_id = sr.requester_id;
            """)
            print(f"  ✅ Migrated {cur.rowcount} student requester_id values")

            # Migrate requester_id for parents: users.id → parent_profiles.id
            print("  🔄 Migrating parent requester_id from users.id to parent_profiles.id...")
            cur.execute("""
                UPDATE session_requests sr
                SET requester_id = pp.id
                FROM parent_profiles pp
                WHERE sr.requester_type = 'parent'
                AND pp.user_id = sr.requester_id;
            """)
            print(f"  ✅ Migrated {cur.rowcount} parent requester_id values")

            # Delete any remaining unmapped requesters
            cur.execute("""
                DELETE FROM session_requests sr
                WHERE (sr.requester_type = 'student' AND NOT EXISTS (
                    SELECT 1 FROM student_profiles sp WHERE sp.id = sr.requester_id
                ))
                OR (sr.requester_type = 'parent' AND NOT EXISTS (
                    SELECT 1 FROM parent_profiles pp WHERE pp.id = sr.requester_id
                ));
            """)

            if cur.rowcount > 0:
                print(f"  🗑️  Deleted {cur.rowcount} records with invalid requester_id")

        else:
            print("  ✅ Data already uses profile IDs, no migration needed")

        # Step 4: Add correct foreign key for tutor_id → tutor_profiles.id
        print("\n➕ Adding foreign key: tutor_id → tutor_profiles.id")
        cur.execute("""
            ALTER TABLE session_requests
            ADD CONSTRAINT fk_session_requests_tutor
            FOREIGN KEY (tutor_id)
            REFERENCES tutor_profiles(id)
            ON DELETE CASCADE;
        """)
        print("  ✅ Added tutor_id foreign key")

        # Step 5: We cannot add a single FK for requester_id because it can reference
        # either student_profiles or parent_profiles based on requester_type
        # So we remove the FK constraint and rely on application-level integrity
        print("\n⚠️  Note: requester_id does NOT have a foreign key constraint")
        print("   Reason: It can reference either student_profiles.id OR parent_profiles.id")
        print("   Solution: Application-level integrity checking (already implemented)")

        # Step 6: Add check constraint to ensure requester_type is valid
        print("\n➕ Adding check constraint for requester_type...")
        cur.execute("""
            ALTER TABLE session_requests
            DROP CONSTRAINT IF EXISTS check_requester_type;
        """)
        cur.execute("""
            ALTER TABLE session_requests
            ADD CONSTRAINT check_requester_type
            CHECK (requester_type IN ('student', 'parent'));
        """)
        print("  ✅ Added check constraint for requester_type")

        # Step 7: Recreate package_id foreign key
        print("\n➕ Adding foreign key: package_id → tutor_packages.id")
        cur.execute("""
            ALTER TABLE session_requests
            ADD CONSTRAINT fk_session_requests_package
            FOREIGN KEY (package_id)
            REFERENCES tutor_packages(id)
            ON DELETE SET NULL;
        """)
        print("  ✅ Added package_id foreign key")

        conn.commit()
        print("\n✅ Successfully fixed session_requests foreign key references!")

        # Step 8: Show updated constraints
        print("\n📋 Updated constraints:")
        cur.execute("""
            SELECT
                con.conname AS constraint_name,
                con.contype AS constraint_type,
                CASE con.contype
                    WHEN 'f' THEN 'FOREIGN KEY'
                    WHEN 'p' THEN 'PRIMARY KEY'
                    WHEN 'c' THEN 'CHECK'
                    WHEN 'u' THEN 'UNIQUE'
                END AS type_name,
                pg_get_constraintdef(con.oid) AS definition
            FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            WHERE rel.relname = 'session_requests'
            ORDER BY con.contype, con.conname;
        """)

        for row in cur.fetchall():
            print(f"  - {row[0]} ({row[2]})")
            print(f"    {row[3]}")

        # Step 9: Data validation check
        print("\n🔍 Validating existing data...")

        # Check if all tutor_ids exist in tutor_profiles
        cur.execute("""
            SELECT COUNT(*) FROM session_requests sr
            WHERE NOT EXISTS (
                SELECT 1 FROM tutor_profiles tp WHERE tp.id = sr.tutor_id
            );
        """)

        invalid_tutors = cur.fetchone()[0]
        if invalid_tutors > 0:
            print(f"  ⚠️  Warning: {invalid_tutors} session requests have invalid tutor_id")
        else:
            print("  ✅ All tutor_ids are valid")

        # Check if all requester_ids exist in their respective tables
        cur.execute("""
            SELECT COUNT(*) FROM session_requests sr
            WHERE sr.requester_type = 'student'
            AND NOT EXISTS (
                SELECT 1 FROM student_profiles sp WHERE sp.id = sr.requester_id
            );
        """)

        invalid_students = cur.fetchone()[0]
        if invalid_students > 0:
            print(f"  ⚠️  Warning: {invalid_students} session requests have invalid student requester_id")
        else:
            print("  ✅ All student requester_ids are valid")

        cur.execute("""
            SELECT COUNT(*) FROM session_requests sr
            WHERE sr.requester_type = 'parent'
            AND NOT EXISTS (
                SELECT 1 FROM parent_profiles pp WHERE pp.id = sr.requester_id
            );
        """)

        invalid_parents = cur.fetchone()[0]
        if invalid_parents > 0:
            print(f"  ⚠️  Warning: {invalid_parents} session requests have invalid parent requester_id")
        else:
            print("  ✅ All parent requester_ids are valid")

        print("\n✅ Migration completed successfully!")
        print("\n📝 Summary:")
        print("   - tutor_id now references tutor_profiles.id ✅")
        print("   - requester_id has NO FK (application-level integrity) ⚠️")
        print("   - package_id references tutor_packages.id ✅")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error fixing foreign keys: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    fix_session_requests_foreign_keys()
