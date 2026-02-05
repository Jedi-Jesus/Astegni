"""
Migration: Convert Credentials from Role-Based to User-Based

This migration updates the credentials table to use user_id instead of role-specific IDs
(tutor_id, student_id, etc.) for the uploader_id field.

REASONING:
- Credentials belong to the PERSON, not the role
- Prevents duplicate uploads when user has multiple roles
- Prevents orphaned data when roles are removed
- Maintains data integrity across role changes
- uploader_role field still exists for filtering/context

CHANGES:
1. Updates existing credentials: converts tutor_id/student_id -> user_id
2. Future uploads will use current_user.id directly
"""

import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv
import os
import sys

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def run_migration():
    """Run the migration to convert credentials to user-based"""
    print("=" * 70)
    print("MIGRATION: Convert Credentials from Role-Based to User-Based")
    print("=" * 70)

    conn = psycopg.connect(DATABASE_URL, row_factory=dict_row)
    cursor = conn.cursor()

    try:
        # Step 1: Backup current data
        print("\n[Step 1] Creating backup of current credentials...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS credentials_backup_role_based AS
            SELECT * FROM credentials;
        """)
        cursor.execute("SELECT COUNT(*) as count FROM credentials_backup_role_based;")
        backup_count = cursor.fetchone()['count']
        print(f"   ✅ Backed up {backup_count} credentials to 'credentials_backup_role_based'")

        # Step 2: Update tutor credentials (uploader_role = 'tutor')
        print("\n[Step 2] Converting tutor credentials from tutor_id to user_id...")
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM credentials
            WHERE uploader_role = 'tutor';
        """)
        tutor_count = cursor.fetchone()['count']
        print(f"   Found {tutor_count} tutor credentials to convert")

        if tutor_count > 0:
            cursor.execute("""
                UPDATE credentials c
                SET uploader_id = tp.user_id
                FROM tutor_profiles tp
                WHERE c.uploader_role = 'tutor'
                AND c.uploader_id = tp.id;
            """)
            rows_updated = cursor.rowcount
            print(f"   ✅ Converted {rows_updated} tutor credentials")

            # Check for orphaned records (tutor profile deleted but credential still exists)
            cursor.execute("""
                SELECT COUNT(*) as count
                FROM credentials c
                WHERE c.uploader_role = 'tutor'
                AND NOT EXISTS (
                    SELECT 1 FROM tutor_profiles tp WHERE tp.id = c.uploader_id
                );
            """)
            orphaned = cursor.fetchone()['count']
            if orphaned > 0:
                print(f"   ⚠️ Found {orphaned} orphaned tutor credentials (tutor profile no longer exists)")
                print(f"      These will remain with their current uploader_id until manually resolved")

        # Step 3: Update student credentials (uploader_role = 'student')
        print("\n[Step 3] Converting student credentials from student_id to user_id...")
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM credentials
            WHERE uploader_role = 'student';
        """)
        student_count = cursor.fetchone()['count']
        print(f"   Found {student_count} student credentials to convert")

        if student_count > 0:
            # Check if student_profiles table exists (old system)
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'student_profiles'
                );
            """)
            has_student_profiles = cursor.fetchone()['exists']

            if has_student_profiles:
                cursor.execute("""
                    UPDATE credentials c
                    SET uploader_id = sp.user_id
                    FROM student_profiles sp
                    WHERE c.uploader_role = 'student'
                    AND c.uploader_id = sp.id;
                """)
                rows_updated = cursor.rowcount
                print(f"   ✅ Converted {rows_updated} student credentials")

                # Check for orphaned records
                cursor.execute("""
                    SELECT COUNT(*) as count
                    FROM credentials c
                    WHERE c.uploader_role = 'student'
                    AND NOT EXISTS (
                        SELECT 1 FROM student_profiles sp WHERE sp.id = c.uploader_id
                    );
                """)
                orphaned = cursor.fetchone()['count']
                if orphaned > 0:
                    print(f"   ⚠️ Found {orphaned} orphaned student credentials")
            else:
                print("   ⚠️ student_profiles table doesn't exist, skipping student conversion")

        # Step 4: Update parent credentials (if any)
        print("\n[Step 4] Converting parent credentials from parent_id to user_id...")
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM credentials
            WHERE uploader_role = 'parent';
        """)
        parent_count = cursor.fetchone()['count']
        print(f"   Found {parent_count} parent credentials to convert")

        if parent_count > 0:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'parent_profiles'
                );
            """)
            has_parent_profiles = cursor.fetchone()['exists']

            if has_parent_profiles:
                cursor.execute("""
                    UPDATE credentials c
                    SET uploader_id = pp.user_id
                    FROM parent_profiles pp
                    WHERE c.uploader_role = 'parent'
                    AND c.uploader_id = pp.id;
                """)
                rows_updated = cursor.rowcount
                print(f"   ✅ Converted {rows_updated} parent credentials")

        # Step 5: Verify migration
        print("\n[Step 5] Verifying migration...")

        # Check that all uploader_ids now reference users table
        cursor.execute("""
            SELECT
                c.uploader_role,
                COUNT(*) as total,
                COUNT(CASE WHEN u.id IS NOT NULL THEN 1 END) as valid_user_ids,
                COUNT(CASE WHEN u.id IS NULL THEN 1 END) as invalid_user_ids
            FROM credentials c
            LEFT JOIN users u ON c.uploader_id = u.id
            GROUP BY c.uploader_role;
        """)

        verification = cursor.fetchall()
        print("\n   Verification Results:")
        print("   " + "-" * 66)
        print(f"   {'Role':<15} {'Total':<10} {'Valid User IDs':<20} {'Invalid':<10}")
        print("   " + "-" * 66)

        all_valid = True
        for row in verification:
            role = row['uploader_role']
            total = row['total']
            valid = row['valid_user_ids']
            invalid = row['invalid_user_ids']
            status = "✅" if invalid == 0 else "⚠️"
            print(f"   {status} {role:<13} {total:<10} {valid:<20} {invalid:<10}")
            if invalid > 0:
                all_valid = False

        print("   " + "-" * 66)

        # Step 6: Add helpful comment to table
        cursor.execute("""
            COMMENT ON COLUMN credentials.uploader_id IS
            'User ID from users table (not role-specific ID). uploader_role indicates context.';
        """)

        conn.commit()

        print("\n" + "=" * 70)
        if all_valid:
            print("✅ MIGRATION COMPLETED SUCCESSFULLY!")
        else:
            print("⚠️ MIGRATION COMPLETED WITH WARNINGS")
            print("Some credentials have invalid user_ids (orphaned data)")
        print("=" * 70)

        print("\nSummary:")
        print(f"- Backup table created: credentials_backup_role_based")
        print(f"- Tutor credentials updated: {tutor_count}")
        print(f"- Student credentials updated: {student_count}")
        print(f"- Parent credentials updated: {parent_count}")
        print("\nNext steps:")
        print("1. Update backend endpoints to use current_user.id instead of tutor_id/student_id")
        print("2. Update frontend credential managers")
        print("3. Test credential upload/retrieval")
        print("4. Once verified, you can drop backup table:")
        print("   DROP TABLE IF EXISTS credentials_backup_role_based;")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        print("\n🔄 Rolling back changes...")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    run_migration()
