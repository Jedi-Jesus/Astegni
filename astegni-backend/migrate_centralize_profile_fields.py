"""
Migration: Centralize location, profile_picture, and social_links to users table

This migration:
1. Adds location, social_links columns to users table (profile_picture already exists but is deprecated)
2. Copies data from all profile tables (user_profiles, tutor_profiles, student_profiles, parent_profiles, advertiser_profiles) to users table
3. Uses active_role to determine which profile table to prioritize when copying data

Fields being centralized:
- location (String) - from all profile tables
- profile_picture (String) - already exists in users table, will undeprecate it
- social_links (JSON) - from user_profiles, tutor_profiles, advertiser_profiles
"""

import sys
sys.path.insert(0, 'app.py modules')
from sqlalchemy import create_engine, text
from config import DATABASE_URL

def migrate():
    """Centralize profile fields to users table"""
    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:
        print("=" * 60)
        print("MIGRATION: Centralizing Profile Fields to Users Table")
        print("=" * 60)

        # Step 1: Add new columns to users table
        print("\n[STEP 1] Adding new columns to users table...")

        print("  1.1. Adding 'location' column...")
        conn.execute(text("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS location VARCHAR;
        """))
        conn.commit()
        print("      [OK] location column added")

        print("  1.2. Adding 'social_links' column...")
        conn.execute(text("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS social_links JSON DEFAULT '{}';
        """))
        conn.commit()
        print("      [OK] social_links column added")

        print("  NOTE: profile_picture already exists in users table")

        # Step 2: Copy data from profile tables to users table
        print("\n[STEP 2] Copying data from profile tables to users table...")
        print("  Strategy: Use active_role to determine source priority")

        # Priority order based on active_role
        profile_mappings = [
            ('tutor', 'tutor_profiles', 'social_links', False),  # location_is_array
            ('student', 'student_profiles', None, False),
            ('parent', 'parent_profiles', None, False),
            ('advertiser', 'advertiser_profiles', 'socials', True),  # location IS array
            ('user', 'user_profiles', 'social_links', False)
        ]

        for role, table_name, socials_column, location_is_array in profile_mappings:
            print(f"\n  2.{profile_mappings.index((role, table_name, socials_column, location_is_array)) + 1}. Processing {table_name}...")

            # Handle location conversion for advertiser (array to string - take first element)
            location_expr = "p.location[1]" if location_is_array else "p.location"

            # Build the UPDATE query based on whether the table has social_links/socials
            if socials_column:
                # Cast socials to text then to json for JSONB compatibility
                socials_expr = f"p.{socials_column}::text::json"

                query = text(f"""
                    UPDATE users u
                    SET
                        location = COALESCE(u.location, {location_expr}),
                        profile_picture = COALESCE(u.profile_picture, p.profile_picture),
                        social_links = COALESCE(u.social_links, {socials_expr}, '{{}}')::json
                    FROM {table_name} p
                    WHERE u.id = p.user_id
                      AND u.active_role = :role
                      AND (
                          u.location IS NULL OR
                          u.profile_picture IS NULL OR
                          u.social_links::text = '{{}}' OR
                          u.social_links IS NULL
                      );
                """)
            else:
                query = text(f"""
                    UPDATE users u
                    SET
                        location = COALESCE(u.location, {location_expr}),
                        profile_picture = COALESCE(u.profile_picture, p.profile_picture)
                    FROM {table_name} p
                    WHERE u.id = p.user_id
                      AND u.active_role = :role
                      AND (
                          u.location IS NULL OR
                          u.profile_picture IS NULL
                      );
                """)

            result = conn.execute(query, {"role": role})
            rows_updated = result.rowcount
            conn.commit()
            print(f"      [OK] Updated {rows_updated} users from {table_name}")

        # Step 3: Handle users with NULL active_role or roles not in mappings
        print("\n  2.6. Handling users without active_role or with other roles...")

        # Try to copy from any available profile table for users without data
        for role, table_name, socials_column, location_is_array in profile_mappings:
            # Handle location conversion for advertiser (array to string - take first element)
            location_expr = "p.location[1]" if location_is_array else "p.location"

            if socials_column:
                # Cast socials to text then to json for JSONB compatibility
                socials_expr = f"p.{socials_column}::text::json"

                query = text(f"""
                    UPDATE users u
                    SET
                        location = COALESCE(u.location, {location_expr}),
                        profile_picture = COALESCE(u.profile_picture, p.profile_picture),
                        social_links = COALESCE(u.social_links, {socials_expr}, '{{}}')::json
                    FROM {table_name} p
                    WHERE u.id = p.user_id
                      AND (
                          u.location IS NULL OR
                          u.profile_picture IS NULL OR
                          u.social_links::text = '{{}}' OR
                          u.social_links IS NULL
                      );
                """)
            else:
                query = text(f"""
                    UPDATE users u
                    SET
                        location = COALESCE(u.location, {location_expr}),
                        profile_picture = COALESCE(u.profile_picture, p.profile_picture)
                    FROM {table_name} p
                    WHERE u.id = p.user_id
                      AND (
                          u.location IS NULL OR
                          u.profile_picture IS NULL
                      );
                """)

            result = conn.execute(query)
            rows_updated = result.rowcount
            conn.commit()
            if rows_updated > 0:
                print(f"      [OK] Backfilled {rows_updated} users from {table_name}")

        # Step 4: Verify migration
        print("\n[STEP 3] Verifying migration...")

        result = conn.execute(text("""
            SELECT
                COUNT(*) as total_users,
                COUNT(location) as users_with_location,
                COUNT(profile_picture) as users_with_picture,
                COUNT(CASE WHEN social_links::text != '{}' AND social_links IS NOT NULL THEN 1 END) as users_with_socials
            FROM users;
        """))
        stats = result.fetchone()

        print(f"\n  Users Table Statistics:")
        print(f"    Total users:                 {stats[0]}")
        print(f"    Users with location:         {stats[1]} ({stats[1]*100//stats[0] if stats[0] > 0 else 0}%)")
        print(f"    Users with profile_picture:  {stats[2]} ({stats[2]*100//stats[0] if stats[0] > 0 else 0}%)")
        print(f"    Users with social_links:     {stats[3]} ({stats[3]*100//stats[0] if stats[0] > 0 else 0}%)")

        print("\n" + "=" * 60)
        print("[SUCCESS] Migration completed successfully!")
        print("=" * 60)
        print("\nNext steps:")
        print("  1. Update User model to undeprecate profile_picture and add new fields")
        print("  2. Mark fields as DEPRECATED in profile table models")
        print("  3. Update application code to use users table fields")
        print("  4. Test thoroughly before removing deprecated fields")

if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        print(f"\n[ERROR] Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise
