"""
Complete Migration: Merge admin_profiles into admin_profile with data migration
"""
import psycopg
import os
from dotenv import load_dotenv
import json

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def migrate():
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("Complete Migration: admin_profiles -> admin_profile")
        print("=" * 80)

        # Step 1: Add missing columns to admin_profile
        print("\nStep 1: Adding missing columns from admin_profiles to admin_profile...")
        print("-" * 80)

        columns_to_add = [
            ("role", "VARCHAR(100)"),
            ("permissions", "JSONB"),
            ("status", "VARCHAR(50)", "DEFAULT 'active'"),
            ("suspended_until", "TIMESTAMP"),
            ("suspension_reason", "TEXT"),
            ("requires_password_change", "BOOLEAN", "DEFAULT FALSE"),
            ("last_login", "TIMESTAMP"),
            ("social_links", "JSONB"),
            ("contact_info", "JSONB"),
            ("settings", "JSONB"),
            ("position", "VARCHAR(100)"),
            ("location", "VARCHAR(255)"),
            ("profile_picture", "VARCHAR(500)"),
            ("cover_picture", "VARCHAR(500)")
        ]

        for col_def in columns_to_add:
            col_name = col_def[0]
            col_type = col_def[1]
            col_default = col_def[2] if len(col_def) > 2 else ""

            # Check if column already exists
            cur.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'admin_profile' AND column_name = %s
            """, (col_name,))

            if cur.fetchone():
                print(f"  [SKIP] Column '{col_name}' already exists, skipping...")
            else:
                try:
                    alter_query = f"ALTER TABLE admin_profile ADD COLUMN {col_name} {col_type} {col_default}"
                    cur.execute(alter_query)
                    print(f"  [OK] Added column: {col_name} {col_type}")
                except Exception as e:
                    print(f"  [ERROR] Error adding {col_name}: {e}")

        conn.commit()

        # Step 2: Migrate data from admin_profiles to admin_profile
        print("\nStep 2: Migrating data from admin_profiles to admin_profile...")
        print("-" * 80)

        cur.execute("SELECT * FROM admin_profiles")
        columns = [desc[0] for desc in cur.description]
        profiles_records = cur.fetchall()

        print(f"Found {len(profiles_records)} records in admin_profiles")

        for record in profiles_records:
            record_dict = dict(zip(columns, record))

            print(f"\n  Migrating record ID {record_dict['id']}:")
            print(f"    Name: {record_dict['name']}")
            print(f"    Email: {record_dict['email']}")

            # Parse name into Ethiopian naming convention
            name_parts = record_dict['name'].strip().split() if record_dict['name'] else []
            first_name = name_parts[0] if len(name_parts) > 0 else ''
            father_name = name_parts[1] if len(name_parts) > 1 else ''
            grandfather_name = ' '.join(name_parts[2:]) if len(name_parts) > 2 else ''

            # Check if admin_profile record exists for this admin_id
            # Assume admin_id matches the id from admin_profiles
            admin_id = record_dict['id']

            cur.execute("SELECT id FROM admin_profile WHERE admin_id = %s", (admin_id,))
            existing = cur.fetchone()

            if existing:
                # Update existing record
                print(f"    -> Updating existing admin_profile record...")

                update_query = """
                    UPDATE admin_profile SET
                        role = %s,
                        permissions = %s,
                        status = %s,
                        suspended_until = %s,
                        suspension_reason = %s,
                        requires_password_change = %s,
                        last_login = %s,
                        social_links = %s,
                        contact_info = %s,
                        settings = %s,
                        position = %s,
                        location = %s,
                        profile_picture = %s,
                        cover_picture = %s,
                        phone_number = COALESCE(phone_number, %s),
                        email = COALESCE(email, %s),
                        bio = COALESCE(bio, %s),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE admin_id = %s
                """

                cur.execute(update_query, (
                    record_dict.get('role'),
                    json.dumps(record_dict.get('permissions')) if record_dict.get('permissions') else None,
                    record_dict.get('status'),
                    record_dict.get('suspended_until'),
                    record_dict.get('suspension_reason'),
                    record_dict.get('requires_password_change'),
                    record_dict.get('last_login'),
                    json.dumps(record_dict.get('social_links')) if record_dict.get('social_links') else None,
                    json.dumps(record_dict.get('contact_info')) if record_dict.get('contact_info') else None,
                    json.dumps(record_dict.get('settings')) if record_dict.get('settings') else None,
                    record_dict.get('position'),
                    record_dict.get('location'),
                    record_dict.get('profile_picture'),
                    record_dict.get('cover_picture'),
                    record_dict.get('phone'),
                    record_dict.get('email'),
                    record_dict.get('bio'),
                    admin_id
                ))
                print(f"    [OK] Updated admin_profile for admin_id {admin_id}")

            else:
                # Insert new record
                print(f"    -> Creating new admin_profile record...")

                # Generate username from name
                username = record_dict['name'].replace(' ', '').lower()[:20] if record_dict['name'] else f"admin{admin_id}"

                insert_query = """
                    INSERT INTO admin_profile (
                        admin_id, first_name, father_name, grandfather_name, admin_username,
                        role, permissions, status, suspended_until, suspension_reason,
                        requires_password_change, last_login, social_links, contact_info, settings,
                        position, location, profile_picture, cover_picture,
                        phone_number, email, bio, password_hash
                    ) VALUES (
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s,
                        %s, %s, %s, %s
                    )
                """

                cur.execute(insert_query, (
                    admin_id,
                    first_name,
                    father_name,
                    grandfather_name,
                    username,
                    record_dict.get('role'),
                    json.dumps(record_dict.get('permissions')) if record_dict.get('permissions') else None,
                    record_dict.get('status'),
                    record_dict.get('suspended_until'),
                    record_dict.get('suspension_reason'),
                    record_dict.get('requires_password_change'),
                    record_dict.get('last_login'),
                    json.dumps(record_dict.get('social_links')) if record_dict.get('social_links') else None,
                    json.dumps(record_dict.get('contact_info')) if record_dict.get('contact_info') else None,
                    json.dumps(record_dict.get('settings')) if record_dict.get('settings') else None,
                    record_dict.get('position'),
                    record_dict.get('location'),
                    record_dict.get('profile_picture'),
                    record_dict.get('cover_picture'),
                    record_dict.get('phone'),
                    record_dict.get('email'),
                    record_dict.get('bio'),
                    record_dict.get('password_hash')
                ))
                print(f"    [OK] Created new admin_profile for admin_id {admin_id}")

        conn.commit()
        print(f"\n  [OK] Data migration completed")

        # Step 3: Drop admin_profiles table
        print("\nStep 3: Dropping admin_profiles table...")
        print("-" * 80)
        cur.execute("DROP TABLE IF EXISTS admin_profiles CASCADE")
        conn.commit()
        print(f"  [OK] Dropped admin_profiles table")

        # Step 4: Verify final state
        print("\nStep 4: Verifying final state...")
        print("-" * 80)

        cur.execute("SELECT COUNT(*) FROM admin_profile")
        final_count = cur.fetchone()[0]
        print(f"  Total records in admin_profile: {final_count}")

        cur.execute("""
            SELECT admin_id, first_name, father_name, grandfather_name, admin_username, email, phone_number, role
            FROM admin_profile
            ORDER BY id
        """)
        records = cur.fetchall()

        for rec in records:
            print(f"\n  Admin ID {rec[0]}:")
            print(f"    Name: {rec[1]} {rec[2]} {rec[3]}")
            print(f"    Username: {rec[4]}")
            print(f"    Email: {rec[5]}")
            print(f"    Phone: {rec[6]}")
            print(f"    Role: {rec[7]}")

        print("\n" + "=" * 80)
        print("[SUCCESS] Migration completed successfully!")
        print("\nWhat was done:")
        print("  1. Added missing columns from admin_profiles to admin_profile")
        print("  2. Migrated all data (parsed 'name' into first/father/grandfather)")
        print("  3. Dropped admin_profiles table")
        print("  4. admin_profile is now the single source of truth")

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
