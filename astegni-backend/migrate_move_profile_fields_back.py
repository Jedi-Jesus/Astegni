"""
Migration: Move social_links and contact_info BACK to admin_profile
These are profile/identity data, not stats/tracking data
"""
import psycopg
from psycopg.types.json import Jsonb
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def migrate():
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("Migration: Moving profile fields back to admin_profile")
        print("=" * 80)

        # Step 1: Add social_links and contact_info to admin_profile
        print("\nStep 1: Adding social_links and contact_info to admin_profile...")
        print("-" * 80)

        fields_to_add = [
            ('social_links', 'JSONB'),
            ('contact_info', 'JSONB')
        ]

        for field_name, field_type in fields_to_add:
            cur.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'admin_profile' AND column_name = %s
            """, (field_name,))

            if cur.fetchone():
                print(f"  [SKIP] {field_name} already exists in admin_profile")
            else:
                cur.execute(f"ALTER TABLE admin_profile ADD COLUMN {field_name} {field_type}")
                print(f"  [OK] Added {field_name} to admin_profile")

        conn.commit()

        # Step 2: Copy data from admin_profile_stats to admin_profile
        print("\nStep 2: Copying data from admin_profile_stats to admin_profile...")
        print("-" * 80)

        cur.execute("""
            SELECT admin_id, social_links, contact_info
            FROM admin_profile_stats
        """)

        stats_records = cur.fetchall()
        print(f"Found {len(stats_records)} records to process")

        for record in stats_records:
            admin_id, social_links, contact_info = record

            # Wrap JSONB values
            social_links_json = Jsonb(social_links) if social_links is not None else None
            contact_info_json = Jsonb(contact_info) if contact_info is not None else None

            cur.execute("""
                UPDATE admin_profile SET
                    social_links = %s,
                    contact_info = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE admin_id = %s
            """, (social_links_json, contact_info_json, admin_id))

            print(f"  [OK] Updated admin_id {admin_id}")

        conn.commit()
        print(f"  [OK] Data copied successfully")

        # Step 3: Remove fields from admin_profile_stats
        print("\nStep 3: Removing fields from admin_profile_stats...")
        print("-" * 80)

        fields_to_drop = ['social_links', 'contact_info']

        for field_name in fields_to_drop:
            cur.execute(f"ALTER TABLE admin_profile_stats DROP COLUMN IF EXISTS {field_name}")
            print(f"  [OK] Dropped {field_name} from admin_profile_stats")

        conn.commit()

        # Step 4: Verify final state
        print("\nStep 4: Verifying final state...")
        print("-" * 80)

        # Check admin_profile columns
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'admin_profile'
            AND column_name NOT IN ('id', 'admin_id', 'created_at', 'updated_at')
            ORDER BY ordinal_position
        """)
        profile_cols = [row[0] for row in cur.fetchall()]

        # Check admin_profile_stats columns
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'admin_profile_stats'
            AND column_name NOT IN ('id', 'admin_id', 'created_at', 'updated_at')
            ORDER BY ordinal_position
        """)
        stats_cols = [row[0] for row in cur.fetchall()]

        print(f"\nadmin_profile columns ({len(profile_cols)}):")
        print("  Identity & Profile:")
        for col in ['first_name', 'father_name', 'grandfather_name', 'admin_username', 'email', 'phone_number']:
            if col in profile_cols:
                print(f"    - {col}")

        print("  Additional Info:")
        for col in ['bio', 'quote', 'department', 'position', 'location', 'social_links', 'contact_info']:
            if col in profile_cols:
                print(f"    - {col}")

        print("  Images:")
        for col in ['profile_picture_url', 'cover_picture_url', 'profile_picture', 'cover_picture']:
            if col in profile_cols:
                print(f"    - {col}")

        print("  Auth:")
        for col in ['password_hash', 'last_login']:
            if col in profile_cols:
                print(f"    - {col}")

        print(f"\nadmin_profile_stats columns ({len(stats_cols)}):")
        print("  Authorization:")
        for col in ['role', 'permissions', 'access_level']:
            if col in stats_cols:
                print(f"    - {col}")

        print("  Status:")
        for col in ['status', 'suspended_until', 'suspension_reason', 'requires_password_change']:
            if col in stats_cols:
                print(f"    - {col}")

        print("  Stats:")
        for col in stats_cols:
            if col not in ['role', 'permissions', 'access_level', 'status', 'suspended_until',
                          'suspension_reason', 'requires_password_change', 'settings', 'last_login',
                          'employee_id', 'joined_date', 'responsibilities']:
                print(f"    - {col}")

        print("  Settings & Tracking:")
        for col in ['settings', 'last_login', 'employee_id', 'joined_date', 'responsibilities']:
            if col in stats_cols:
                print(f"    - {col}")

        print("\n" + "=" * 80)
        print("[SUCCESS] Migration completed!")
        print("\nWhat was done:")
        print("  1. Moved social_links BACK to admin_profile (profile data)")
        print("  2. Moved contact_info BACK to admin_profile (identity data)")
        print("  3. Settings remains in admin_profile_stats (preferences)")
        print("\nFinal structure:")
        print("  admin_profile: Identity, profile, contact, social info")
        print("  admin_profile_stats: Permissions, status, stats, settings")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Error during migration: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()
