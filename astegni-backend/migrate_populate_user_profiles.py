"""
Migration: Populate user_profiles for existing users
Description: Creates user_profiles entries for all existing users with 'user' role
Date: 2025-01-18
"""

import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

def run_migration():
    """Create user_profiles entries for existing users with 'user' role"""

    print("=" * 60)
    print("Populating user_profiles for existing users...")
    print("=" * 60)

    # SQL to insert user_profiles for users with 'user' role that don't have profiles yet
    populate_sql = text("""
    INSERT INTO user_profiles (
        user_id,
        is_active,
        is_online,
        languages,
        interested_in,
        social_links,
        created_at,
        updated_at
    )
    SELECT
        u.id,
        TRUE as is_active,
        FALSE as is_online,
        ARRAY[]::TEXT[] as languages,
        ARRAY[]::TEXT[] as interested_in,
        '{}'::JSONB as social_links,
        CURRENT_TIMESTAMP as created_at,
        CURRENT_TIMESTAMP as updated_at
    FROM users u
    WHERE
        u.roles::jsonb ? 'user'
        AND NOT EXISTS (
            SELECT 1 FROM user_profiles up WHERE up.user_id = u.id
        );
    """)

    try:
        with engine.connect() as conn:
            # Execute insert
            result = conn.execute(populate_sql)
            rows_created = result.rowcount

            print(f"[OK] Created {rows_created} user_profiles entries")

            conn.commit()

            # Verify creation
            verify_sql = text("""
                SELECT COUNT(*) as total_profiles,
                       COUNT(CASE WHEN username IS NOT NULL THEN 1 END) as with_username,
                       COUNT(CASE WHEN username IS NULL THEN 1 END) as without_username
                FROM user_profiles;
            """)

            result = conn.execute(verify_sql)
            stats = result.fetchone()

            print("\n" + "=" * 60)
            print("User Profiles Statistics:")
            print("=" * 60)
            print(f"  Total profiles: {stats.total_profiles}")
            print(f"  With username: {stats.with_username}")
            print(f"  Without username: {stats.without_username}")

            # Show sample of newly created profiles
            sample_sql = text("""
                SELECT
                    up.id,
                    up.user_id,
                    u.first_name,
                    u.father_name,
                    u.email,
                    up.username
                FROM user_profiles up
                JOIN users u ON u.id = up.user_id
                WHERE u.roles::jsonb ? 'user'
                ORDER BY up.created_at DESC
                LIMIT 5;
            """)

            result = conn.execute(sample_sql)

            print("\n" + "=" * 60)
            print("Sample of user profiles (most recent 5):")
            print("=" * 60)
            for row in result:
                username_display = row.username if row.username else "(not set)"
                print(f"  ID: {row.id} | User: {row.first_name} {row.father_name} | Email: {row.email} | Username: {username_display}")

            print("\n" + "=" * 60)
            print("[SUCCESS] Migration completed successfully!")
            print("=" * 60)

    except Exception as e:
        print(f"[ERROR] Error populating user_profiles: {e}")
        raise

if __name__ == "__main__":
    run_migration()
