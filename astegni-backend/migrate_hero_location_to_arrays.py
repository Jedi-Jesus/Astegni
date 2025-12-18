"""
Migration Script: Convert hero_title and location to JSONB arrays

This script converts the hero_title and location columns from VARCHAR to JSONB arrays
in all manage_*_profile tables in astegni_admin_db.

Run: python migrate_hero_location_to_arrays.py
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()

ADMIN_DATABASE_URL = os.getenv(
    'ADMIN_DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db'
)

# All manage profile tables
MANAGE_PROFILE_TABLES = [
    'manage_courses_profile',
    'manage_tutors_profile',
    'manage_customers_profile',
    'manage_schools_profile',
    'manage_contents_profile',
    'manage_campaigns_profile',
    'manage_credentials_profile',
    'manage_system_settings_profile',
    'manage_admins_profile',
    'manage_advertisers_profile'
]

def get_connection():
    """Get admin database connection"""
    return psycopg.connect(ADMIN_DATABASE_URL)

def migrate_columns():
    """Convert hero_title and location to JSONB arrays"""

    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        print("=" * 60)
        print("MIGRATING hero_title AND location TO JSONB ARRAYS")
        print("=" * 60)

        for table in MANAGE_PROFILE_TABLES:
            print(f"\n--- Processing {table} ---")

            # Check if table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = %s
                )
            """, (table,))

            if not cursor.fetchone()[0]:
                print(f"  [SKIP] Table {table} does not exist")
                continue

            # Check current column types
            cursor.execute("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = %s AND column_name IN ('hero_title', 'location')
                ORDER BY column_name
            """, (table,))

            columns = cursor.fetchall()
            column_dict = {col[0]: col[1] for col in columns}

            # Migrate hero_title
            if 'hero_title' in column_dict:
                if column_dict['hero_title'] == 'jsonb':
                    print(f"  [SKIP] hero_title already JSONB")
                else:
                    print(f"  [MIGRATE] hero_title from {column_dict['hero_title']} to JSONB array")

                    # Add temporary column
                    cursor.execute(f"""
                        ALTER TABLE {table}
                        ADD COLUMN IF NOT EXISTS hero_title_new JSONB DEFAULT '[]'::jsonb
                    """)

                    # Copy data - convert existing string to array with one element
                    cursor.execute(f"""
                        UPDATE {table}
                        SET hero_title_new =
                            CASE
                                WHEN hero_title IS NOT NULL AND hero_title != ''
                                THEN jsonb_build_array(hero_title)
                                ELSE '[]'::jsonb
                            END
                    """)

                    # Drop old column and rename new
                    cursor.execute(f"""
                        ALTER TABLE {table} DROP COLUMN hero_title
                    """)
                    cursor.execute(f"""
                        ALTER TABLE {table} RENAME COLUMN hero_title_new TO hero_title
                    """)

                    print(f"  [OK] hero_title migrated to JSONB array")
            else:
                # Add column if it doesn't exist
                cursor.execute(f"""
                    ALTER TABLE {table}
                    ADD COLUMN IF NOT EXISTS hero_title JSONB DEFAULT '[]'::jsonb
                """)
                print(f"  [ADD] hero_title column added as JSONB array")

            # Migrate location
            if 'location' in column_dict:
                if column_dict['location'] == 'jsonb':
                    print(f"  [SKIP] location already JSONB")
                else:
                    print(f"  [MIGRATE] location from {column_dict['location']} to JSONB array")

                    # Add temporary column
                    cursor.execute(f"""
                        ALTER TABLE {table}
                        ADD COLUMN IF NOT EXISTS location_new JSONB DEFAULT '[]'::jsonb
                    """)

                    # Copy data - convert existing string to array with one element
                    cursor.execute(f"""
                        UPDATE {table}
                        SET location_new =
                            CASE
                                WHEN location IS NOT NULL AND location != ''
                                THEN jsonb_build_array(location)
                                ELSE '[]'::jsonb
                            END
                    """)

                    # Drop old column and rename new
                    cursor.execute(f"""
                        ALTER TABLE {table} DROP COLUMN location
                    """)
                    cursor.execute(f"""
                        ALTER TABLE {table} RENAME COLUMN location_new TO location
                    """)

                    print(f"  [OK] location migrated to JSONB array")
            else:
                # Add column if it doesn't exist
                cursor.execute(f"""
                    ALTER TABLE {table}
                    ADD COLUMN IF NOT EXISTS location JSONB DEFAULT '[]'::jsonb
                """)
                print(f"  [ADD] location column added as JSONB array")

        conn.commit()
        print("\n" + "=" * 60)
        print("[OK] Migration completed successfully!")
        print("=" * 60)

    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            conn.close()

def verify_migration():
    """Verify the migration was successful"""

    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        print("\n" + "=" * 60)
        print("VERIFYING MIGRATION")
        print("=" * 60)

        for table in MANAGE_PROFILE_TABLES:
            # Check if table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = %s
                )
            """, (table,))

            if not cursor.fetchone()[0]:
                continue

            cursor.execute("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = %s AND column_name IN ('hero_title', 'location')
                ORDER BY column_name
            """, (table,))

            columns = cursor.fetchall()
            print(f"\n{table}:")
            for col in columns:
                status = "[OK]" if col[1] == 'jsonb' else "[FAIL]"
                print(f"  {status} {col[0]}: {col[1]}")

        print("\n" + "=" * 60)
        print("[OK] Verification complete!")
        print("=" * 60)

    except Exception as e:
        print(f"\n[ERROR] Verification failed: {e}")
        raise
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    print("\nStarting hero_title and location Migration to JSONB Arrays...\n")

    # Step 1: Migrate columns
    migrate_columns()

    # Step 2: Verify
    verify_migration()

    print("\nMigration completed successfully!\n")
