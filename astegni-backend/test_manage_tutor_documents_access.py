"""
Test Manage Tutor Documents Access Control
Tests the department-based access control for manage-tutor-documents page
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def test_access_control():
    """Test department-based access control for manage-tutor-documents page"""

    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    print("\n" + "="*80)
    print("MANAGE TUTOR DOCUMENTS - ACCESS CONTROL TEST")
    print("="*80 + "\n")

    try:
        # Test 1: Find admins with manage-tutor department
        print("Test 1: Admins with 'manage-tutor' department (SHOULD HAVE ACCESS)")
        print("-" * 80)
        cursor.execute("""
            SELECT id, email, first_name, father_name, departments
            FROM admin_profile
            WHERE 'manage-tutor' = ANY(departments)
            ORDER BY id
            LIMIT 5
        """)

        manage_tutor_admins = cursor.fetchall()
        if manage_tutor_admins:
            for admin in manage_tutor_admins:
                print(f"✓ ID: {admin[0]}, Email: {admin[1]}, Name: {admin[2]} {admin[3]}")
                print(f"  Departments: {admin[4]}")

                # Check if they have manage_tutors_profile
                cursor.execute("""
                    SELECT position, tutors_verified, tutors_rejected
                    FROM manage_tutors_profile
                    WHERE admin_id = %s
                """, (admin[0],))

                profile = cursor.fetchone()
                if profile:
                    print(f"  Profile: {profile[0]} | Verified: {profile[1]} | Rejected: {profile[2]}")
                else:
                    print(f"  ⚠ Warning: No manage_tutors_profile found (will use defaults)")
                print()
        else:
            print("⚠ No admins found with 'manage-tutor' department")
            print()

        # Test 2: Find admins with manage-system-settings department
        print("\nTest 2: Admins with 'manage-system-settings' department (SHOULD HAVE ACCESS)")
        print("-" * 80)
        cursor.execute("""
            SELECT id, email, first_name, father_name, departments
            FROM admin_profile
            WHERE 'manage-system-settings' = ANY(departments)
            ORDER BY id
            LIMIT 5
        """)

        system_settings_admins = cursor.fetchall()
        if system_settings_admins:
            for admin in system_settings_admins:
                print(f"✓ ID: {admin[0]}, Email: {admin[1]}, Name: {admin[2]} {admin[3]}")
                print(f"  Departments: {admin[4]}")
                print()
        else:
            print("⚠ No admins found with 'manage-system-settings' department")
            print()

        # Test 3: Find admins WITHOUT either department
        print("\nTest 3: Admins WITHOUT required departments (SHOULD BE DENIED)")
        print("-" * 80)
        cursor.execute("""
            SELECT id, email, first_name, father_name, departments
            FROM admin_profile
            WHERE NOT ('manage-tutor' = ANY(departments))
              AND NOT ('manage-system-settings' = ANY(departments))
            ORDER BY id
            LIMIT 5
        """)

        unauthorized_admins = cursor.fetchall()
        if unauthorized_admins:
            for admin in unauthorized_admins:
                print(f"✗ ID: {admin[0]}, Email: {admin[1]}, Name: {admin[2]} {admin[3]}")
                print(f"  Departments: {admin[4]}")
                print(f"  Expected: 403 Forbidden")
                print()
        else:
            print("✓ No unauthorized admins found (all admins have required departments)")
            print()

        # Test 4: Summary
        print("\n" + "="*80)
        print("SUMMARY")
        print("="*80)
        cursor.execute("""
            SELECT
                COUNT(*) FILTER (WHERE 'manage-tutor' = ANY(departments)) as manage_tutor_count,
                COUNT(*) FILTER (WHERE 'manage-system-settings' = ANY(departments)) as system_settings_count,
                COUNT(*) FILTER (WHERE
                    NOT ('manage-tutor' = ANY(departments))
                    AND NOT ('manage-system-settings' = ANY(departments))
                ) as unauthorized_count,
                COUNT(*) as total_admins
            FROM admin_profile
        """)

        summary = cursor.fetchone()
        print(f"\nTotal Admins: {summary[3]}")
        print(f"  - With 'manage-tutor' access: {summary[0]}")
        print(f"  - With 'manage-system-settings' access: {summary[1]}")
        print(f"  - WITHOUT access (will get 403): {summary[2]}")

        # Test 5: Check for admins with manage_tutors_profile but no department
        print("\n" + "="*80)
        print("INTEGRITY CHECK")
        print("="*80)
        cursor.execute("""
            SELECT ap.id, ap.email, ap.departments
            FROM admin_profile ap
            JOIN manage_tutors_profile mtp ON ap.id = mtp.admin_id
            WHERE NOT ('manage-tutor' = ANY(ap.departments))
        """)

        inconsistent = cursor.fetchall()
        if inconsistent:
            print("\n⚠ WARNING: Found admins with manage_tutors_profile but no 'manage-tutor' department:")
            for admin in inconsistent:
                print(f"  ID: {admin[0]}, Email: {admin[1]}, Departments: {admin[2]}")
            print("\nRecommendation: Add 'manage-tutor' to their departments array")
        else:
            print("\n✓ All admins with manage_tutors_profile have 'manage-tutor' department")

        print("\n" + "="*80)
        print("TEST COMPLETE")
        print("="*80 + "\n")

    except Exception as e:
        print(f"\n❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()

    finally:
        cursor.close()
        conn.close()

def create_test_admin():
    """Create a test admin with manage-tutor department"""

    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        print("\nCreating test admin with 'manage-tutor' department...")

        # Check if test admin exists
        cursor.execute("SELECT id FROM admin_profile WHERE email = %s", ('test.tutor@astegni.et',))
        existing = cursor.fetchone()

        if existing:
            print(f"✓ Test admin already exists (ID: {existing[0]})")
            admin_id = existing[0]
        else:
            # Create test admin
            cursor.execute("""
                INSERT INTO admin_profile (
                    email, first_name, father_name, grandfather_name,
                    departments, username, bio, quote
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s
                )
                RETURNING id
            """, (
                'test.tutor@astegni.et',
                'Test',
                'Tutor',
                'Admin',
                ['manage-tutor'],
                'test_tutor_admin',
                'Test admin for tutor management',
                'Testing tutor document management access'
            ))

            admin_id = cursor.fetchone()[0]
            conn.commit()
            print(f"✓ Test admin created (ID: {admin_id})")

        # Check if manage_tutors_profile exists
        cursor.execute("SELECT id FROM manage_tutors_profile WHERE admin_id = %s", (admin_id,))
        profile_exists = cursor.fetchone()

        if not profile_exists:
            # Create manage_tutors_profile
            cursor.execute("""
                INSERT INTO manage_tutors_profile (
                    admin_id, position, rating, total_reviews,
                    tutors_verified, tutors_rejected, tutors_suspended,
                    permissions
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                admin_id,
                'Tutor Management Test Specialist',
                4.8,
                10,
                5,
                2,
                1,
                {
                    'can_verify_tutors': True,
                    'can_reject_tutors': True,
                    'can_suspend_tutors': True,
                    'can_view_analytics': True
                }
            ))
            conn.commit()
            print(f"✓ Manage tutors profile created for test admin")
        else:
            print(f"✓ Manage tutors profile already exists")

        print(f"\n✓ Test admin ready!")
        print(f"  Email: test.tutor@astegni.et")
        print(f"  Department: manage-tutor")
        print(f"  Access: SHOULD BE ALLOWED")

    except Exception as e:
        print(f"\n❌ Error creating test admin: {e}")
        conn.rollback()

    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("\n" + "="*80)
    print("MANAGE TUTOR DOCUMENTS - ACCESS CONTROL TEST SUITE")
    print("="*80)

    # Run access control tests
    test_access_control()

    # Offer to create test admin
    print("\n" + "="*80)
    response = input("\nWould you like to create a test admin with 'manage-tutor' department? (y/n): ")
    if response.lower() == 'y':
        create_test_admin()

    print("\n✓ All tests complete!\n")
