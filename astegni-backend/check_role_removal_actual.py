"""
Check what actually happens when a role is "removed"
This script checks if the profile is truly deleted or just deactivated
"""
import psycopg

DATABASE_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db"

def check_role_status(user_email, role_type='student'):
    """Check the actual status of a user's role"""

    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    print("=" * 80)
    print(f"Checking Role Status for: {user_email} (Role: {role_type})")
    print("=" * 80)
    print()

    try:
        # Get user info
        cursor.execute("""
            SELECT id, email, roles, active_role
            FROM users
            WHERE email = %s
        """, (user_email,))

        user = cursor.fetchone()

        if not user:
            print(f"[ERROR] User not found: {user_email}")
            return

        user_id, email, roles, active_role = user

        print(f"User ID: {user_id}")
        print(f"Email: {email}")
        print(f"Roles Array: {roles}")
        print(f"Active Role: {active_role}")
        print()

        # Check if role is in roles array
        if role_type in roles:
            print(f"✓ '{role_type}' IS in user.roles array")
        else:
            print(f"✗ '{role_type}' is NOT in user.roles array (DELETED)")
        print()

        # Check profile table
        table_name = f"{role_type}_profiles"

        cursor.execute(f"""
            SELECT id, user_id, is_active, scheduled_deletion_at, created_at
            FROM {table_name}
            WHERE user_id = %s
        """, (user_id,))

        profile = cursor.fetchone()

        if profile:
            profile_id, user_id, is_active, scheduled_deletion_at, created_at = profile
            print(f"Profile Status in {table_name}:")
            print(f"  Profile ID: {profile_id}")
            print(f"  Is Active: {is_active}")
            print(f"  Scheduled Deletion: {scheduled_deletion_at}")
            print(f"  Created At: {created_at}")
            print()

            if scheduled_deletion_at:
                from datetime import datetime
                days_remaining = (scheduled_deletion_at - datetime.now()).days
                print(f"  ⏰ Scheduled for deletion in {days_remaining} days")
                print(f"  📅 Will be deleted on: {scheduled_deletion_at.strftime('%Y-%m-%d %H:%M:%S')}")
            else:
                print(f"  ✓ No scheduled deletion")

            print()
            print("Conclusion:")
            if is_active:
                print("  ✓ Profile is ACTIVE")
            else:
                if scheduled_deletion_at:
                    print("  ⚠️  Profile is DEACTIVATED and scheduled for deletion (90-day grace period)")
                else:
                    print("  ⚠️  Profile is DEACTIVATED but not scheduled for deletion")

        else:
            print(f"[ERROR] Profile NOT FOUND in {table_name}")
            print("  ✗ Profile was PERMANENTLY DELETED from database")
            print()
            print("This should NOT happen with the 90-day grace period system!")

    except Exception as e:
        print(f"[ERROR] {e}")
    finally:
        cursor.close()
        conn.close()

    print()
    print("=" * 80)

if __name__ == "__main__":
    # Update with your test user email
    test_email = "jediael.s.abebe@gmail.com"  # Change this
    test_role = "student"  # Change this

    print("\n⚠️  IMPORTANT: Update test_email and test_role in the script!")
    print(f"Current test user: {test_email}")
    print(f"Current test role: {test_role}\n")

    response = input("Continue with these values? (y/n): ")
    if response.lower() == 'y':
        check_role_status(test_email, test_role)
    else:
        print("\nPlease update the script with your test values and run again.")
