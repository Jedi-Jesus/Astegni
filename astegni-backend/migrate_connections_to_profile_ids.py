"""
Migration: Update Connections Table to Use Profile IDs Instead of User IDs

PROBLEM:
Currently, the connections table uses user_id_1 and user_id_2 which reference users.id.
This doesn't work well with role-based profiles (tutor_profiles, student_profiles, etc.)
because connections should be between profile identities, not generic users.

SOLUTION:
Add new columns to track:
- profile_id_1 and profile_id_2: The actual profile IDs being connected
- profile_type_1 and profile_type_2: The profile types ('tutor', 'student', 'parent', etc.)
- Keep user_id_1 and user_id_2 for backwards compatibility and quick user lookups

BENEFITS:
1. Clear connection context (student-to-tutor, tutor-to-tutor, etc.)
2. Better data isolation between roles
3. Ability to have different connections per role
4. More accurate relationship tracking

EXAMPLE:
User 50 is both a student and a tutor.
- As student (profile_id=12): Connects with tutor (profile_id=85)
- As tutor (profile_id=200): Connects with other tutors professionally

These are different connection contexts stored separately.
"""

import os
import sys
from sqlalchemy import create_engine, text, Column, Integer, String, inspect
from sqlalchemy.orm import Session

# Add parent directory to path to import models
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    print("❌ ERROR: DATABASE_URL not found in environment variables")
    print("Please set DATABASE_URL in your .env file")
    sys.exit(1)

# Create engine
engine = create_engine(DATABASE_URL)

def run_migration():
    """Add profile_id and profile_type columns to connections table"""

    print("=" * 80)
    print("MIGRATION: Update Connections Table to Use Profile IDs")
    print("=" * 80)

    with engine.connect() as conn:
        # Check if columns already exist
        inspector = inspect(engine)
        columns = [col['name'] for col in inspector.get_columns('connections')]

        print(f"\nCurrent columns in connections table: {columns}")

        # Add new columns if they don't exist
        columns_to_add = {
            'profile_id_1': 'INTEGER',
            'profile_type_1': 'VARCHAR(50)',
            'profile_id_2': 'INTEGER',
            'profile_type_2': 'VARCHAR(50)'
        }

        for column_name, column_type in columns_to_add.items():
            if column_name not in columns:
                print(f"\n[+] Adding column: {column_name} ({column_type})")

                try:
                    conn.execute(text(f"""
                        ALTER TABLE connections
                        ADD COLUMN {column_name} {column_type}
                    """))
                    conn.commit()
                    print(f"   [OK] Column {column_name} added successfully")
                except Exception as e:
                    print(f"   [ERROR] Error adding {column_name}: {e}")
                    conn.rollback()
            else:
                print(f"   [OK] Column {column_name} already exists")

        print("\n" + "=" * 80)
        print("STEP 2: Migrate Existing Data")
        print("=" * 80)

        # Get existing connections
        result = conn.execute(text("""
            SELECT id, user_id_1, user_id_2
            FROM connections
            WHERE profile_id_1 IS NULL OR profile_id_2 IS NULL
        """))

        existing_connections = result.fetchall()

        if not existing_connections:
            print("[OK] No existing connections to migrate")
        else:
            print(f"\nFound {len(existing_connections)} connections to migrate\n")

            migrated_count = 0

            for connection in existing_connections:
                conn_id, user_id_1, user_id_2 = connection

                # Find profile for user_id_1
                profile_1 = find_user_profile(conn, user_id_1)
                profile_2 = find_user_profile(conn, user_id_2)

                if profile_1 and profile_2:
                    try:
                        conn.execute(text("""
                            UPDATE connections
                            SET profile_id_1 = :profile_id_1,
                                profile_type_1 = :profile_type_1,
                                profile_id_2 = :profile_id_2,
                                profile_type_2 = :profile_type_2
                            WHERE id = :conn_id
                        """), {
                            'profile_id_1': profile_1['id'],
                            'profile_type_1': profile_1['type'],
                            'profile_id_2': profile_2['id'],
                            'profile_type_2': profile_2['type'],
                            'conn_id': conn_id
                        })
                        migrated_count += 1
                        print(f"   [OK] Migrated connection #{conn_id}: "
                              f"{profile_1['type']}#{profile_1['id']} <-> "
                              f"{profile_2['type']}#{profile_2['id']}")
                    except Exception as e:
                        print(f"   [ERROR] Error migrating connection #{conn_id}: {e}")
                        conn.rollback()
                else:
                    print(f"   [WARNING] Skipped connection #{conn_id}: "
                          f"Profile not found for user {user_id_1} or {user_id_2}")

            conn.commit()
            print(f"\n[OK] Successfully migrated {migrated_count} connections")

        print("\n" + "=" * 80)
        print("MIGRATION COMPLETE")
        print("=" * 80)
        print("\nSummary:")
        print("   - Added profile_id_1, profile_type_1, profile_id_2, profile_type_2 columns")
        print("   - Migrated existing connections to use profile IDs")
        print("   - user_id_1 and user_id_2 retained for backwards compatibility")
        print("\nNEXT STEPS:")
        print("   1. Restart backend server")
        print("   2. Test the connection system")
        print("   3. Check tutor profile connections panel")
        print("=" * 80)


def find_user_profile(conn, user_id):
    """
    Find the primary profile for a user.
    Priority order: tutor > student > parent > advertiser
    """

    # Check tutor profile first (most common for connections)
    result = conn.execute(text("""
        SELECT id FROM tutor_profiles WHERE user_id = :user_id
    """), {'user_id': user_id})
    row = result.fetchone()
    if row:
        return {'id': row[0], 'type': 'tutor'}

    # Check student profile
    result = conn.execute(text("""
        SELECT id FROM student_profiles WHERE user_id = :user_id
    """), {'user_id': user_id})
    row = result.fetchone()
    if row:
        return {'id': row[0], 'type': 'student'}

    # Check parent profile
    result = conn.execute(text("""
        SELECT id FROM parent_profiles WHERE user_id = :user_id
    """), {'user_id': user_id})
    row = result.fetchone()
    if row:
        return {'id': row[0], 'type': 'parent'}

    # Check advertiser profile
    result = conn.execute(text("""
        SELECT id FROM advertiser_profiles WHERE user_id = :user_id
    """), {'user_id': user_id})
    row = result.fetchone()
    if row:
        return {'id': row[0], 'type': 'advertiser'}

    return None


if __name__ == "__main__":
    try:
        run_migration()
    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
