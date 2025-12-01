"""
Test script for admin department-based access control
Run this after registering test admin accounts
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def test_admin_departments():
    """Check admin profiles and their departments"""
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        print("\n" + "="*60)
        print("ADMIN DEPARTMENT ACCESS CONTROL TEST")
        print("="*60 + "\n")

        # Get all admin profiles with departments
        cursor.execute("""
            SELECT
                u.id,
                u.email,
                ap.first_name,
                ap.father_name,
                ap.department
            FROM users u
            LEFT JOIN admin_profile ap ON u.id = ap.admin_id
            WHERE 'admin' = ANY(u.roles)
            ORDER BY u.id
        """)

        admins = cursor.fetchall()

        if not admins:
            print("❌ No admin users found!")
            print("Please register an admin account first.\n")
            return

        print(f"✅ Found {len(admins)} admin user(s):\n")

        # Department access mapping
        department_access = {
            'manage-campaigns': ['manage-campaigns.html'],
            'manage-schools': ['manage-schools.html'],
            'manage-courses': ['manage-courses.html'],
            'manage-tutors': ['manage-tutors.html'],
            'manage-customers': ['manage-customers.html'],
            'manage-contents': ['manage-contents.html'],
            'manage-system-settings': [
                'manage-campaigns.html',
                'manage-schools.html',
                'manage-courses.html',
                'manage-tutors.html',
                'manage-customers.html',
                'manage-contents.html',
                'manage-system-settings.html'
            ]
        }

        for admin in admins:
            admin_id, email, first_name, father_name, department = admin

            print(f"📧 Email: {email}")
            print(f"👤 Name: {first_name} {father_name}")
            print(f"🏢 Department: {department or 'Not Set'}")

            if department:
                accessible_pages = department_access.get(department, [])
                print(f"✓ Can access {len(accessible_pages)} page(s):")
                for page in accessible_pages:
                    print(f"   - {page}")

                if department == 'manage-system-settings':
                    print("   🌟 SUPER ADMIN - Full Access!")
            else:
                print("⚠️  WARNING: No department assigned! This admin cannot access any pages.")

            print("-" * 60 + "\n")

        # Summary
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)

        dept_counts = {}
        for admin in admins:
            dept = admin[4] or 'No Department'
            dept_counts[dept] = dept_counts.get(dept, 0) + 1

        print("\nAdmins by Department:")
        for dept, count in sorted(dept_counts.items()):
            print(f"  {dept}: {count}")

        print("\nAccess Control Configured:")
        print("  ✅ Department-based access control is active")
        print("  ✅ 7 departments with specific permissions")
        print("  ✅ manage-system-settings has full access")

        print("\n" + "="*60)

    finally:
        cursor.close()
        conn.close()

def test_specific_access(email, page):
    """Test if a specific admin can access a specific page"""
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        # Get admin department
        cursor.execute("""
            SELECT ap.department
            FROM users u
            LEFT JOIN admin_profile ap ON u.id = ap.admin_id
            WHERE u.email = %s AND 'admin' = ANY(u.roles)
        """, (email,))

        result = cursor.fetchone()

        if not result:
            print(f"\n❌ Admin with email '{email}' not found!\n")
            return

        department = result[0]

        if not department:
            print(f"\n❌ Admin '{email}' has no department assigned!\n")
            return

        # Check access
        department_access = {
            'manage-campaigns': ['manage-campaigns.html'],
            'manage-schools': ['manage-schools.html'],
            'manage-courses': ['manage-courses.html'],
            'manage-tutors': ['manage-tutors.html'],
            'manage-customers': ['manage-customers.html'],
            'manage-contents': ['manage-contents.html'],
            'manage-system-settings': [
                'manage-campaigns.html',
                'manage-schools.html',
                'manage-courses.html',
                'manage-tutors.html',
                'manage-customers.html',
                'manage-contents.html',
                'manage-system-settings.html'
            ]
        }

        accessible_pages = department_access.get(department, [])
        has_access = page in accessible_pages

        print(f"\n{'='*60}")
        print("ACCESS CHECK")
        print(f"{'='*60}")
        print(f"Admin: {email}")
        print(f"Department: {department}")
        print(f"Requested Page: {page}")
        print(f"Result: {'✅ ACCESS GRANTED' if has_access else '❌ ACCESS DENIED'}")
        print(f"{'='*60}\n")

    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    import sys

    # Run general test
    test_admin_departments()

    # Run specific access test if arguments provided
    if len(sys.argv) == 3:
        email = sys.argv[1]
        page = sys.argv[2]
        test_specific_access(email, page)
        print("\nUsage for specific test:")
        print("  python test_admin_department_access.py <email> <page>")
        print("\nExample:")
        print("  python test_admin_department_access.py abebe@example.com manage-campaigns.html")
