"""
Migration: Move stats/tracking fields from admin_profile to admin_profile_stats
This properly separates identity data from tracking/stats data
"""
import psycopg
from psycopg.types.json import Jsonb
import os
from dotenv import load_dotenv
import json

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def migrate():
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("Migration: Moving stats fields to admin_profile_stats")
        print("=" * 80)

        # Fields to move from admin_profile to admin_profile_stats
        fields_to_move = [
            ('role', 'VARCHAR(100)'),
            ('permissions', 'JSONB'),
            ('status', 'VARCHAR(50)', "DEFAULT 'active'"),
            ('suspended_until', 'TIMESTAMP'),
            ('suspension_reason', 'TEXT'),
            ('requires_password_change', 'BOOLEAN', 'DEFAULT FALSE'),
            ('social_links', 'JSONB'),
            ('contact_info', 'JSONB'),
            ('settings', 'JSONB')
        ]

        # Step 1: Add fields to admin_profile_stats if they don't exist
        print("\nStep 1: Adding fields to admin_profile_stats...")
        print("-" * 80)

        for field_def in fields_to_move:
            field_name = field_def[0]
            field_type = field_def[1]
            field_default = field_def[2] if len(field_def) > 2 else ""

            # Check if field exists
            cur.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'admin_profile_stats' AND column_name = %s
            """, (field_name,))

            if cur.fetchone():
                print(f"  [SKIP] {field_name} already exists in admin_profile_stats")
            else:
                alter_query = f"ALTER TABLE admin_profile_stats ADD COLUMN {field_name} {field_type} {field_default}"
                cur.execute(alter_query)
                print(f"  [OK] Added {field_name} to admin_profile_stats")

        conn.commit()

        # Step 2: Copy data from admin_profile to admin_profile_stats
        print("\nStep 2: Copying data from admin_profile to admin_profile_stats...")
        print("-" * 80)

        # Get all admin_profile records with the fields we need to move
        cur.execute("""
            SELECT admin_id, role, permissions, status, suspended_until, suspension_reason,
                   requires_password_change, social_links, contact_info, settings, last_login
            FROM admin_profile
        """)

        profile_records = cur.fetchall()
        print(f"Found {len(profile_records)} admin_profile records to process")

        for record in profile_records:
            admin_id = record[0]
            role = record[1]
            permissions = record[2]
            status = record[3]
            suspended_until = record[4]
            suspension_reason = record[5]
            requires_password_change = record[6]
            social_links = record[7]
            contact_info = record[8]
            settings = record[9]
            last_login = record[10]

            # Check if admin_profile_stats record exists
            cur.execute("SELECT id FROM admin_profile_stats WHERE admin_id = %s", (admin_id,))
            stats_exists = cur.fetchone()

            if stats_exists:
                # Update existing stats record
                print(f"  [UPDATE] admin_id {admin_id}")

                # Wrap JSONB values explicitly with Jsonb() adapter
                permissions_json = Jsonb(permissions) if permissions is not None else None
                social_links_json = Jsonb(social_links) if social_links is not None else None
                contact_info_json = Jsonb(contact_info) if contact_info is not None else None
                settings_json = Jsonb(settings) if settings is not None else None

                cur.execute("""
                    UPDATE admin_profile_stats SET
                        role = %s,
                        permissions = %s,
                        status = %s,
                        suspended_until = %s,
                        suspension_reason = %s,
                        requires_password_change = %s,
                        social_links = %s,
                        contact_info = %s,
                        settings = %s,
                        last_login = COALESCE(last_login, %s),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE admin_id = %s
                """, (
                    role, permissions_json, status, suspended_until, suspension_reason,
                    requires_password_change, social_links_json, contact_info_json, settings_json,
                    last_login, admin_id
                ))
            else:
                # Create new stats record
                print(f"  [INSERT] admin_id {admin_id}")

                # Wrap JSONB values explicitly with Jsonb() adapter
                permissions_json = Jsonb(permissions) if permissions is not None else None
                social_links_json = Jsonb(social_links) if social_links is not None else None
                contact_info_json = Jsonb(contact_info) if contact_info is not None else None
                settings_json = Jsonb(settings) if settings is not None else None

                cur.execute("""
                    INSERT INTO admin_profile_stats (
                        admin_id, role, permissions, status, suspended_until, suspension_reason,
                        requires_password_change, social_links, contact_info, settings, last_login
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    admin_id, role, permissions_json, status, suspended_until, suspension_reason,
                    requires_password_change, social_links_json, contact_info_json, settings_json, last_login
                ))

        conn.commit()
        print(f"  [OK] Data copied successfully")

        # Step 3: Remove fields from admin_profile
        print("\nStep 3: Removing fields from admin_profile...")
        print("-" * 80)

        fields_to_drop = ['role', 'permissions', 'status', 'suspended_until',
                         'suspension_reason', 'requires_password_change',
                         'social_links', 'contact_info', 'settings']

        for field_name in fields_to_drop:
            try:
                cur.execute(f"ALTER TABLE admin_profile DROP COLUMN IF EXISTS {field_name}")
                print(f"  [OK] Dropped {field_name} from admin_profile")
            except Exception as e:
                print(f"  [ERROR] Failed to drop {field_name}: {e}")

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
        for col in profile_cols:
            print(f"  - {col}")

        print(f"\nadmin_profile_stats columns ({len(stats_cols)}):")
        for col in stats_cols:
            print(f"  - {col}")

        # Verify data
        cur.execute("""
            SELECT ap.admin_id, ap.first_name, ap.father_name, ap.grandfather_name,
                   aps.role, aps.status, aps.permissions
            FROM admin_profile ap
            LEFT JOIN admin_profile_stats aps ON ap.admin_id = aps.admin_id
        """)
        print(f"\nData verification:")
        for row in cur.fetchall():
            print(f"  Admin {row[0]}: {row[1]} {row[2]} {row[3]}")
            print(f"    Role: {row[4]}, Status: {row[5]}, Permissions: {row[6]}")

        print("\n" + "=" * 80)
        print("[SUCCESS] Migration completed!")
        print("\nWhat was done:")
        print("  1. Added stats/tracking fields to admin_profile_stats")
        print("  2. Copied data from admin_profile to admin_profile_stats")
        print("  3. Removed stats/tracking fields from admin_profile")
        print("  4. Tables are now properly separated:")
        print("     - admin_profile: Identity/profile data")
        print("     - admin_profile_stats: Stats/tracking/permissions data")

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
