"""
Check if users have location data in the database
"""
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db')

# Convert to psycopg format
if DATABASE_URL.startswith('postgresql://'):
    DATABASE_URL = DATABASE_URL.replace('postgresql://', 'postgresql+psycopg://', 1)
if DATABASE_URL.startswith('postgresql+psycopg://'):
    DATABASE_URL = DATABASE_URL.replace('postgresql+psycopg://', 'postgresql://', 1)

try:
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    print("=" * 80)
    print("CHECKING USER LOCATION DATA")
    print("=" * 80)

    # Check total users
    cursor.execute("SELECT COUNT(*) FROM users")
    total_users = cursor.fetchone()[0]
    print(f"\n[OK] Total users: {total_users}")

    # Check users with location
    cursor.execute("SELECT COUNT(*) FROM users WHERE location IS NOT NULL AND location != ''")
    users_with_location = cursor.fetchone()[0]
    print(f"[OK] Users with location set: {users_with_location}")
    print(f"[OK] Users without location: {total_users - users_with_location}")

    # Check tutor users with location
    cursor.execute("""
        SELECT COUNT(DISTINCT u.id)
        FROM users u
        INNER JOIN tutor_profiles tp ON u.id = tp.user_id
        WHERE u.location IS NOT NULL AND u.location != ''
    """)
    tutors_with_location = cursor.fetchone()[0]
    print(f"\n[OK] Tutors with location: {tutors_with_location}")

    # Show sample users with their locations
    print("\n" + "=" * 80)
    print("SAMPLE USERS AND THEIR LOCATIONS")
    print("=" * 80)

    cursor.execute("""
        SELECT
            u.id,
            u.email,
            u.first_name,
            u.location,
            u.active_role,
            CASE
                WHEN tp.id IS NOT NULL THEN 'Yes'
                ELSE 'No'
            END as is_tutor
        FROM users u
        LEFT JOIN tutor_profiles tp ON u.id = tp.user_id
        ORDER BY u.id
        LIMIT 10
    """)

    users = cursor.fetchall()

    print(f"\n{'ID':<5} {'Email':<30} {'Name':<15} {'Location':<30} {'Role':<10} {'Tutor':<7}")
    print("-" * 120)

    for user_id, email, first_name, location, active_role, is_tutor in users:
        location_display = location if location else '[EMPTY]'
        email_display = email[:28] + '..' if email and len(email) > 28 else (email or 'N/A')
        name_display = (first_name or 'N/A')[:13] + '..' if first_name and len(first_name) > 13 else (first_name or 'N/A')
        role_display = active_role or 'N/A'

        print(f"{user_id:<5} {email_display:<30} {name_display:<15} {location_display:<30} {role_display:<10} {is_tutor:<7}")

    # Check specific logged-in user (if email provided)
    print("\n" + "=" * 80)
    print("CHECK SPECIFIC USER (jediael.s.abebe@gmail.com)")
    print("=" * 80)

    cursor.execute("""
        SELECT
            u.id,
            u.email,
            u.first_name,
            u.last_name,
            u.location,
            u.active_role,
            tp.id as tutor_profile_id
        FROM users u
        LEFT JOIN tutor_profiles tp ON u.id = tp.user_id
        WHERE u.email = 'jediael.s.abebe@gmail.com'
    """)

    user_data = cursor.fetchone()

    if user_data:
        user_id, email, first_name, last_name, location, active_role, tutor_id = user_data
        print(f"\n[OK] User found!")
        print(f"  - ID: {user_id}")
        print(f"  - Email: {email}")
        print(f"  - Name: {first_name} {last_name or ''}")
        print(f"  - Location: {location if location else '[EMPTY - NOT SET]'}")
        print(f"  - Active Role: {active_role}")
        print(f"  - Is Tutor: {'Yes' if tutor_id else 'No'}")

        if not location or location == '':
            print(f"\n[ERROR] WARNING: This user has NO LOCATION SET!")
            print(f"   That's why you're seeing 'Not Set' in the market price card!")
            print(f"\n[TIP] SOLUTION: Set location for this user by:")
            print(f"   1. Logging in as this user")
            print(f"   2. Going to profile settings")
            print(f"   3. Setting your location")
            print(f"   OR run SQL: UPDATE users SET location = 'Addis Ababa, Ethiopia' WHERE id = {user_id};")
        else:
            print(f"\n[SUCCESS] Location is set correctly!")
            # Extract country
            parts = location.split(',')
            country = parts[-1].strip().upper() if parts else location.strip().upper()
            print(f"   - Full Location: {location}")
            print(f"   - Extracted Country: {country}")
    else:
        print(f"\n[ERROR] User not found!")

    cursor.close()
    conn.close()

    print("\n" + "=" * 80)
    print("ANALYSIS COMPLETE")
    print("=" * 80)

except Exception as e:
    print(f"\n[ERROR] Error: {e}")
    import traceback
    traceback.print_exc()
