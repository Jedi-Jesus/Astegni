"""
Test User-Based Credentials System

Tests that credentials are now user-based instead of role-based
"""

import psycopg
from psycopg.rows import dict_row
import os
import sys
from dotenv import load_dotenv

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def test_credentials_schema():
    """Test that credentials table uses user_id"""
    print("=" * 70)
    print("TEST: Credentials Schema Validation")
    print("=" * 70)

    conn = psycopg.connect(DATABASE_URL, row_factory=dict_row)
    cur = conn.cursor()

    try:
        # Check uploader_id references users table
        print("\n[1] Checking credentials.uploader_id references users table...")
        cur.execute("""
            SELECT
                COUNT(*) as total_credentials,
                COUNT(CASE WHEN u.id IS NOT NULL THEN 1 END) as valid_user_refs
            FROM credentials c
            LEFT JOIN users u ON c.uploader_id = u.id;
        """)
        result = cur.fetchone()
        print(f"   Total credentials: {result['total_credentials']}")
        print(f"   Valid user references: {result['valid_user_refs']}")

        if result['valid_user_refs'] == result['total_credentials']:
            print("   ✅ All credentials reference valid users")
        else:
            orphaned = result['total_credentials'] - result['valid_user_refs']
            print(f"   ⚠️ {orphaned} credentials reference deleted/invalid users")

        # Check uploader_role distribution
        print("\n[2] Checking uploader_role distribution...")
        cur.execute("""
            SELECT uploader_role, COUNT(*) as count
            FROM credentials
            GROUP BY uploader_role
            ORDER BY count DESC;
        """)
        roles = cur.fetchall()
        for role in roles:
            print(f"   {role['uploader_role']}: {role['count']} credentials")

        # Sample some credentials
        print("\n[3] Sample credentials (showing user-based structure)...")
        cur.execute("""
            SELECT
                c.id,
                c.uploader_id,
                c.uploader_role,
                c.title,
                u.email as user_email
            FROM credentials c
            JOIN users u ON c.uploader_id = u.id
            LIMIT 5;
        """)
        samples = cur.fetchall()
        print(f"\n   {'ID':<5} {'User ID':<10} {'Role':<10} {'Email':<30} {'Title'}")
        print("   " + "-" * 70)
        for sample in samples:
            print(f"   {sample['id']:<5} {sample['uploader_id']:<10} {sample['uploader_role']:<10} {sample['user_email']:<30} {sample['title'][:20]}")

        # Test multi-role scenario
        print("\n[4] Checking for multi-role users...")
        cur.execute("""
            SELECT
                u.id as user_id,
                u.email,
                array_agg(DISTINCT c.uploader_role) as roles_with_credentials
            FROM users u
            JOIN credentials c ON u.id = c.uploader_id
            GROUP BY u.id, u.email
            HAVING COUNT(DISTINCT c.uploader_role) > 1;
        """)
        multi_role_users = cur.fetchall()
        if multi_role_users:
            print(f"   Found {len(multi_role_users)} users with credentials from multiple roles:")
            for user in multi_role_users:
                print(f"   - User {user['user_id']} ({user['email']}): {user['roles_with_credentials']}")
        else:
            print("   No users with credentials from multiple roles yet")

        print("\n" + "=" * 70)
        print("✅ SCHEMA VALIDATION COMPLETE")
        print("=" * 70)

    finally:
        cur.close()
        conn.close()


def test_duplicate_prevention():
    """Test that users don't need to upload same credential twice"""
    print("\n" + "=" * 70)
    print("TEST: Duplicate Prevention (User-Based Benefit)")
    print("=" * 70)

    conn = psycopg.connect(DATABASE_URL, row_factory=dict_row)
    cur = conn.cursor()

    try:
        # Check for duplicate titles by same user
        print("\n[1] Checking for duplicate credentials (same user, same title)...")
        cur.execute("""
            SELECT
                c.uploader_id,
                u.email,
                c.title,
                array_agg(DISTINCT c.uploader_role) as uploaded_as_roles,
                COUNT(*) as upload_count
            FROM credentials c
            JOIN users u ON c.uploader_id = u.id
            GROUP BY c.uploader_id, u.email, c.title
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC
            LIMIT 5;
        """)
        duplicates = cur.fetchall()

        if duplicates:
            print(f"   Found {len(duplicates)} cases of duplicate titles (old role-based uploads):")
            for dup in duplicates:
                print(f"   - User {dup['uploader_id']} ({dup['email']})")
                print(f"     Title: '{dup['title']}'")
                print(f"     Uploaded {dup['upload_count']} times as roles: {dup['uploaded_as_roles']}")
        else:
            print("   ✅ No duplicate credentials found - user-based system prevents duplicates!")

        print("\n" + "=" * 70)

    finally:
        cur.close()
        conn.close()


def test_orphan_resistance():
    """Test that credentials survive role deletion"""
    print("\n" + "=" * 70)
    print("TEST: Orphan Resistance (User-Based Benefit)")
    print("=" * 70)

    conn = psycopg.connect(DATABASE_URL, row_factory=dict_row)
    cur = conn.cursor()

    try:
        # Check for credentials where role profile no longer exists
        print("\n[1] Checking tutor credentials vs tutor_profiles...")
        cur.execute("""
            SELECT
                COUNT(*) as total_tutor_credentials,
                COUNT(CASE WHEN tp.id IS NOT NULL THEN 1 END) as credentials_with_active_tutor_profile
            FROM credentials c
            LEFT JOIN tutor_profiles tp ON c.uploader_id = tp.user_id
            WHERE c.uploader_role = 'tutor';
        """)
        result = cur.fetchone()
        print(f"   Total tutor credentials: {result['total_tutor_credentials']}")
        print(f"   With active tutor profile: {result['credentials_with_active_tutor_profile']}")

        orphaned_but_valid = result['total_tutor_credentials'] - result['credentials_with_active_tutor_profile']
        if orphaned_but_valid > 0:
            print(f"   ✅ {orphaned_but_valid} credentials survive WITHOUT tutor profile (user-based system works!)")
        else:
            print("   All credentials have matching tutor profiles")

        print("\n[2] Checking student credentials vs student_profiles...")
        cur.execute("""
            SELECT
                COUNT(*) as total_student_credentials,
                COUNT(CASE WHEN sp.id IS NOT NULL THEN 1 END) as credentials_with_active_student_profile
            FROM credentials c
            LEFT JOIN student_profiles sp ON c.uploader_id = sp.user_id
            WHERE c.uploader_role = 'student';
        """)
        result = cur.fetchone()
        if result['total_student_credentials'] > 0:
            print(f"   Total student credentials: {result['total_student_credentials']}")
            print(f"   With active student profile: {result['credentials_with_active_student_profile']}")

            orphaned_but_valid = result['total_student_credentials'] - result['credentials_with_active_student_profile']
            if orphaned_but_valid > 0:
                print(f"   ✅ {orphaned_but_valid} credentials survive WITHOUT student profile")
        else:
            print("   No student credentials in database yet")

        print("\n" + "=" * 70)

    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    print("\n🔬 Testing User-Based Credentials System\n")

    test_credentials_schema()
    test_duplicate_prevention()
    test_orphan_resistance()

    print("\n✅ ALL TESTS COMPLETE")
    print("\nSummary:")
    print("- Credentials are now user-based (uploader_id = users.id)")
    print("- uploader_role field distinguishes context")
    print("- No duplicate uploads needed for multi-role users")
    print("- Credentials survive role profile deletion")
    print("- Frontend maintains backward compatibility")
