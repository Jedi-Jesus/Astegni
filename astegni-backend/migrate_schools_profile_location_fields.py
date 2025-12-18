"""
Migration Script: Add location-related fields to manage_schools_profile table

This script adds the following columns to manage_schools_profile:
- location: JSONB array of location strings
- hero_title: JSONB array of hero title strings
- hero_subtitle: VARCHAR(255)
- languages: JSONB array of language strings
- allow_location: BOOLEAN (GPS location detection permission)
- display_location: BOOLEAN (public location visibility)

Run: python migrate_schools_profile_location_fields.py
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()

ADMIN_DATABASE_URL = os.getenv(
    'ADMIN_DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db'
)

def get_connection():
    """Get admin database connection"""
    return psycopg.connect(ADMIN_DATABASE_URL)

def column_exists(cursor, table_name, column_name):
    """Check if a column exists in a table"""
    cursor.execute("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name = %s AND column_name = %s
    """, (table_name, column_name))
    return cursor.fetchone() is not None

def run_migration():
    """Add missing columns to manage_schools_profile table"""

    print("\n" + "=" * 60)
    print("MIGRATING MANAGE_SCHOOLS_PROFILE TABLE")
    print("=" * 60)

    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Check if table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'manage_schools_profile'
            )
        """)

        if not cursor.fetchone()[0]:
            print("[ERROR] manage_schools_profile table does not exist!")
            print("Please run the profile tables migration first.")
            return False

        print("\n[1/6] Adding location column (JSONB array)...")
        if not column_exists(cursor, 'manage_schools_profile', 'location'):
            cursor.execute("""
                ALTER TABLE manage_schools_profile
                ADD COLUMN location JSONB DEFAULT '[]'::jsonb
            """)
            conn.commit()
            print("  [OK] location column added")
        else:
            print("  [SKIP] location column already exists")

        print("\n[2/6] Adding hero_title column (JSONB array)...")
        if not column_exists(cursor, 'manage_schools_profile', 'hero_title'):
            cursor.execute("""
                ALTER TABLE manage_schools_profile
                ADD COLUMN hero_title JSONB DEFAULT '[]'::jsonb
            """)
            conn.commit()
            print("  [OK] hero_title column added")
        else:
            print("  [SKIP] hero_title column already exists")

        print("\n[3/6] Adding hero_subtitle column...")
        if not column_exists(cursor, 'manage_schools_profile', 'hero_subtitle'):
            cursor.execute("""
                ALTER TABLE manage_schools_profile
                ADD COLUMN hero_subtitle VARCHAR(255)
            """)
            conn.commit()
            print("  [OK] hero_subtitle column added")
        else:
            print("  [SKIP] hero_subtitle column already exists")

        print("\n[4/6] Adding languages column (JSONB array)...")
        if not column_exists(cursor, 'manage_schools_profile', 'languages'):
            cursor.execute("""
                ALTER TABLE manage_schools_profile
                ADD COLUMN languages JSONB DEFAULT '[]'::jsonb
            """)
            conn.commit()
            print("  [OK] languages column added")
        else:
            print("  [SKIP] languages column already exists")

        print("\n[5/6] Adding allow_location column (GPS permission)...")
        if not column_exists(cursor, 'manage_schools_profile', 'allow_location'):
            cursor.execute("""
                ALTER TABLE manage_schools_profile
                ADD COLUMN allow_location BOOLEAN DEFAULT FALSE
            """)
            conn.commit()
            print("  [OK] allow_location column added")
        else:
            print("  [SKIP] allow_location column already exists")

        print("\n[6/6] Adding display_location column (public visibility)...")
        if not column_exists(cursor, 'manage_schools_profile', 'display_location'):
            cursor.execute("""
                ALTER TABLE manage_schools_profile
                ADD COLUMN display_location BOOLEAN DEFAULT TRUE
            """)
            conn.commit()
            print("  [OK] display_location column added")
        else:
            print("  [SKIP] display_location column already exists")

        # Verify final table structure
        print("\n" + "=" * 60)
        print("FINAL TABLE STRUCTURE")
        print("=" * 60)

        cursor.execute("""
            SELECT column_name, data_type, column_default, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'manage_schools_profile'
            ORDER BY ordinal_position
        """)

        columns = cursor.fetchall()
        for col in columns:
            default = f" DEFAULT {col[2]}" if col[2] else ""
            nullable = " NOT NULL" if col[3] == 'NO' else ""
            print(f"  {col[0]}: {col[1]}{default}{nullable}")

        print("\n" + "=" * 60)
        print("MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 60)

        return True

    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        if conn:
            conn.rollback()
        import traceback
        traceback.print_exc()
        return False
    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    run_migration()
