"""
Migration: Make Connections Table Fully Profile-Based

WHAT THIS MIGRATION DOES:
=========================
This migration transforms the connections table from being user-centric to profile-centric.

CURRENT ISSUE:
- user_id_1 and user_id_2 reference users.id (generic user table)
- profile_id_1 and profile_id_2 were added but are optional (nullable)

NEW APPROACH:
- profile_id_1 and profile_id_2 become REQUIRED (non-nullable)
- They store IDs from specific profile tables (tutor_profiles.id, student_profiles.id, etc.)
- user_id_1 and user_id_2 are KEPT for backwards compatibility but are no longer primary

EXAMPLE:
Before: user_id_1=50, user_id_2=75 (both from users table)
After:  profile_id_1=12 (from student_profiles where user_id=50),
        profile_type_1='student',
        profile_id_2=85 (from tutor_profiles where user_id=75),
        profile_type_2='tutor'

This enables:
1. User ID 50 can connect as student AND separately as tutor
2. Connections are role-specific and isolated
3. Better tracking of professional vs. personal networks
"""

import psycopg
from datetime import datetime

def migrate_connections_to_profile_based():
    """
    Step 1: Populate profile_id and profile_type for existing connections
    Step 2: Make profile_id_1, profile_type_1, profile_id_2, profile_type_2 non-nullable
    Step 3: Add proper indexes for profile-based queries
    """

    conn = psycopg.connect('postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')
    cursor = conn.cursor()

    try:
        print("=" * 60)
        print("CONNECTIONS TABLE: USER-BASED -> PROFILE-BASED MIGRATION")
        print("=" * 60)

        # STEP 1: Check current state
        print("\n1. Checking current state...")
        cursor.execute("SELECT COUNT(*) FROM connections")
        total_connections = cursor.fetchone()[0]
        print(f"   Total connections: {total_connections}")

        cursor.execute("SELECT COUNT(*) FROM connections WHERE profile_id_1 IS NULL OR profile_id_2 IS NULL")
        null_profile_connections = cursor.fetchone()[0]
        print(f"   Connections without profile data: {null_profile_connections}")

        if null_profile_connections > 0:
            # STEP 2: Populate missing profile data
            print(f"\n2. Populating profile data for {null_profile_connections} connections...")

            # Get all connections that need profile data
            cursor.execute("""
                SELECT id, user_id_1, user_id_2
                FROM connections
                WHERE profile_id_1 IS NULL OR profile_id_2 IS NULL
            """)
            connections_to_update = cursor.fetchall()

            updated_count = 0
            skipped_count = 0

            for conn_id, user_id_1, user_id_2 in connections_to_update:
                # Find profile for user_id_1 (prioritize: tutor > student > parent > advertiser)
                profile_1_id, profile_1_type = get_user_profile(cursor, user_id_1)
                profile_2_id, profile_2_type = get_user_profile(cursor, user_id_2)

                if profile_1_id and profile_2_id:
                    # Update connection with profile data
                    cursor.execute("""
                        UPDATE connections
                        SET profile_id_1 = %s,
                            profile_type_1 = %s,
                            profile_id_2 = %s,
                            profile_type_2 = %s
                        WHERE id = %s
                    """, (profile_1_id, profile_1_type, profile_2_id, profile_2_type, conn_id))
                    updated_count += 1

                    if updated_count % 100 == 0:
                        print(f"   Updated {updated_count} connections...")
                else:
                    print(f"   WARNING: Connection ID {conn_id} skipped - users {user_id_1} or {user_id_2} have no profiles")
                    skipped_count += 1

            conn.commit()
            print(f"   [OK] Updated {updated_count} connections with profile data")
            if skipped_count > 0:
                print(f"   [WARNING] Skipped {skipped_count} connections (users without profiles)")
        else:
            print("\n2. All connections already have profile data [OK]")

        # STEP 3: Make profile fields non-nullable
        print("\n3. Making profile fields required (non-nullable)...")

        # Check if there are any remaining null values
        cursor.execute("SELECT COUNT(*) FROM connections WHERE profile_id_1 IS NULL OR profile_id_2 IS NULL")
        remaining_nulls = cursor.fetchone()[0]

        if remaining_nulls > 0:
            print(f"   ERROR: Still have {remaining_nulls} connections without profile data!")
            print("   Cannot make fields non-nullable. Please fix data first.")
            conn.rollback()
            return

        # Make columns non-nullable
        cursor.execute("""
            ALTER TABLE connections
            ALTER COLUMN profile_id_1 SET NOT NULL,
            ALTER COLUMN profile_type_1 SET NOT NULL,
            ALTER COLUMN profile_id_2 SET NOT NULL,
            ALTER COLUMN profile_type_2 SET NOT NULL
        """)
        conn.commit()
        print("   [OK] Profile fields are now required")

        # STEP 4: Add indexes for profile-based queries
        print("\n4. Adding indexes for profile-based queries...")

        # Drop old indexes if they exist
        cursor.execute("DROP INDEX IF EXISTS idx_connections_profile_1")
        cursor.execute("DROP INDEX IF EXISTS idx_connections_profile_2")
        cursor.execute("DROP INDEX IF EXISTS idx_connections_profile_both")

        # Create new composite indexes
        cursor.execute("""
            CREATE INDEX idx_connections_profile_1
            ON connections (profile_id_1, profile_type_1)
        """)

        cursor.execute("""
            CREATE INDEX idx_connections_profile_2
            ON connections (profile_id_2, profile_type_2)
        """)

        cursor.execute("""
            CREATE INDEX idx_connections_profile_both
            ON connections (profile_id_1, profile_type_1, profile_id_2, profile_type_2)
        """)

        conn.commit()
        print("   [OK] Added indexes for profile-based queries")

        # STEP 5: Verification
        print("\n5. Verifying migration...")
        cursor.execute("SELECT COUNT(*) FROM connections")
        final_count = cursor.fetchone()[0]

        cursor.execute("""
            SELECT DISTINCT profile_type_1 FROM connections
            UNION
            SELECT DISTINCT profile_type_2 FROM connections
        """)
        profile_types = [row[0] for row in cursor.fetchall()]

        print(f"   Total connections: {final_count}")
        print(f"   Profile types in use: {', '.join(profile_types)}")

        # Check schema
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'connections'
            AND column_name IN ('profile_id_1', 'profile_type_1', 'profile_id_2', 'profile_type_2')
            ORDER BY column_name
        """)

        print("\n   Profile column schema:")
        for col_name, data_type, is_nullable in cursor.fetchall():
            nullable_str = "nullable" if is_nullable == 'YES' else "NOT NULL"
            print(f"      {col_name}: {data_type} ({nullable_str})")

        print("\n" + "=" * 60)
        print("[SUCCESS] MIGRATION COMPLETE!")
        print("=" * 60)
        print("\nCONNECTIONS TABLE IS NOW PROFILE-BASED:")
        print("  - profile_id_1/2 store IDs from role-specific tables")
        print("  - profile_type_1/2 specify the profile type")
        print("  - user_id_1/2 kept for backwards compatibility")
        print("  - Indexes added for optimal query performance")
        print("\nNEXT STEPS:")
        print("  1. Update connection_endpoints.py to use profile IDs as primary")
        print("  2. Update frontend to pass profile_id + profile_type")
        print("  3. Test connection creation/retrieval with profile-based approach")

    except Exception as e:
        print(f"\n[ERROR] during migration: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


def get_user_profile(cursor, user_id):
    """
    Get the primary profile for a user
    Priority: tutor > student > parent > advertiser

    Returns: (profile_id, profile_type) or (None, None)
    """
    # Check tutor profile
    cursor.execute("SELECT id FROM tutor_profiles WHERE user_id = %s", (user_id,))
    result = cursor.fetchone()
    if result:
        return (result[0], 'tutor')

    # Check student profile
    cursor.execute("SELECT id FROM student_profiles WHERE user_id = %s", (user_id,))
    result = cursor.fetchone()
    if result:
        return (result[0], 'student')

    # Check parent profile
    cursor.execute("SELECT id FROM parent_profiles WHERE user_id = %s", (user_id,))
    result = cursor.fetchone()
    if result:
        return (result[0], 'parent')

    # Check advertiser profile
    cursor.execute("SELECT id FROM advertiser_profiles WHERE user_id = %s", (user_id,))
    result = cursor.fetchone()
    if result:
        return (result[0], 'advertiser')

    return (None, None)


if __name__ == "__main__":
    migrate_connections_to_profile_based()
