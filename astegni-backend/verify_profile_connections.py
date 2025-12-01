"""
Verify Profile-Based Connections

This script verifies that all connections in the database are correctly using
profile IDs from role-specific tables (tutor_profiles, student_profiles, etc.)
instead of generic user IDs.
"""

import psycopg

def verify_connections():
    conn = psycopg.connect('postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')
    cursor = conn.cursor()

    print("=" * 100)
    print("PROFILE-BASED CONNECTIONS VERIFICATION")
    print("=" * 100)

    # Get all connections
    cursor.execute("""
        SELECT
            c.id,
            c.user_id_1,
            c.user_id_2,
            c.profile_id_1,
            c.profile_type_1,
            c.profile_id_2,
            c.profile_type_2,
            c.status
        FROM connections c
        ORDER BY c.id
    """)

    connections = cursor.fetchall()

    if not connections:
        print("\nNo connections found in database.")
        conn.close()
        return

    print(f"\nTotal connections: {len(connections)}\n")

    # Print header
    print(f"{'ID':<5} | {'user_id_1':<10} | {'user_id_2':<10} | {'profile_id_1':<13} | {'type_1':<10} | {'profile_id_2':<13} | {'type_2':<10} | {'status':<12}")
    print("-" * 120)

    # Verify each connection
    valid_count = 0
    issues = []

    for row in connections:
        conn_id, user_id_1, user_id_2, profile_id_1, profile_type_1, profile_id_2, profile_type_2, status = row

        # Print row
        print(f"{conn_id:<5} | {user_id_1:<10} | {user_id_2:<10} | {profile_id_1:<13} | {profile_type_1:<10} | {profile_id_2:<13} | {profile_type_2:<10} | {status:<12}")

        # Verify profile_id_1 exists in correct table
        valid_1 = verify_profile_exists(cursor, profile_id_1, profile_type_1)
        valid_2 = verify_profile_exists(cursor, profile_id_2, profile_type_2)

        # Verify user_id matches profile's user_id
        user_match_1 = verify_user_match(cursor, user_id_1, profile_id_1, profile_type_1)
        user_match_2 = verify_user_match(cursor, user_id_2, profile_id_2, profile_type_2)

        if valid_1 and valid_2 and user_match_1 and user_match_2:
            valid_count += 1
        else:
            issues.append({
                'conn_id': conn_id,
                'valid_1': valid_1,
                'valid_2': valid_2,
                'user_match_1': user_match_1,
                'user_match_2': user_match_2
            })

    print("\n" + "=" * 100)
    print("VERIFICATION RESULTS")
    print("=" * 100)
    print(f"\nTotal connections: {len(connections)}")
    print(f"Valid connections: {valid_count}")
    print(f"Issues found: {len(issues)}")

    if issues:
        print("\nISSUES DETECTED:")
        for issue in issues:
            print(f"\n  Connection ID {issue['conn_id']}:")
            if not issue['valid_1']:
                print("    - profile_id_1 does not exist in specified table")
            if not issue['valid_2']:
                print("    - profile_id_2 does not exist in specified table")
            if not issue['user_match_1']:
                print("    - user_id_1 does not match profile's user_id")
            if not issue['user_match_2']:
                print("    - user_id_2 does not match profile's user_id")
    else:
        print("\n[SUCCESS] All connections are correctly using profile-based IDs!")
        print("\nKEY POINTS:")
        print("  - profile_id_1/2 reference role-specific tables (tutor_profiles, student_profiles, etc.)")
        print("  - profile_type_1/2 correctly identify the profile type")
        print("  - user_id_1/2 match the user_id in the respective profile tables")

    # Show profile type distribution
    print("\n" + "=" * 100)
    print("PROFILE TYPE DISTRIBUTION")
    print("=" * 100)

    cursor.execute("""
        SELECT profile_type_1, COUNT(*) as count
        FROM connections
        GROUP BY profile_type_1
        ORDER BY count DESC
    """)
    print("\nProfile Type 1 (Connection Initiator):")
    for profile_type, count in cursor.fetchall():
        print(f"  {profile_type}: {count}")

    cursor.execute("""
        SELECT profile_type_2, COUNT(*) as count
        FROM connections
        GROUP BY profile_type_2
        ORDER BY count DESC
    """)
    print("\nProfile Type 2 (Connection Recipient):")
    for profile_type, count in cursor.fetchall():
        print(f"  {profile_type}: {count}")

    conn.close()


def verify_profile_exists(cursor, profile_id, profile_type):
    """Verify that a profile ID exists in the correct table"""
    table_map = {
        'tutor': 'tutor_profiles',
        'student': 'student_profiles',
        'parent': 'parent_profiles',
        'advertiser': 'advertiser_profiles'
    }

    table = table_map.get(profile_type)
    if not table:
        return False

    cursor.execute(f"SELECT id FROM {table} WHERE id = %s", (profile_id,))
    return cursor.fetchone() is not None


def verify_user_match(cursor, user_id, profile_id, profile_type):
    """Verify that user_id matches the user_id in the profile table"""
    table_map = {
        'tutor': 'tutor_profiles',
        'student': 'student_profiles',
        'parent': 'parent_profiles',
        'advertiser': 'advertiser_profiles'
    }

    table = table_map.get(profile_type)
    if not table:
        return False

    cursor.execute(f"SELECT user_id FROM {table} WHERE id = %s", (profile_id,))
    result = cursor.fetchone()
    if not result:
        return False

    return result[0] == user_id


if __name__ == "__main__":
    verify_connections()
